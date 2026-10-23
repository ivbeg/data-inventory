#!/usr/bin/env node
// Собирает PDF-версию книги из готовой сборки сайта.
//
//   npm run build   # сайт в build/
//   npm run pdf     # PDF в build/data-inventory-book.pdf
//
// Скрипт перенесён из книги «Каталоги данных» (github.com/ivbeg/data-catalogs-book) и упрощён:
// одна языковая версия, без интерактивных компонентов и логотипа спонсора.
//
// Как устроено:
// 1. Порядок страниц берётся из ссылок «Следующая страница» в build/ и совпадает с боковым меню.
//    Страницы категорий (generated-index) становятся титулами частей.
//    Главы верхнего уровня после частей (например, «Об авторе») идут в конце книги вне частей.
// 2. Каждая страница открывается в Chrome через встроенный локальный сервер, поэтому схемы
//    Mermaid рендерятся так же, как на сайте. Со страницы берётся только текст главы.
// 3. Главы склеиваются в одну HTML-книгу: обложка, выходные данные, оглавление, части, главы.
//    Ссылки между главами становятся внутренними ссылками PDF, на остальное — адресами сайта.
// 4. Chrome печатает книгу дважды: после первого прохода из PDF читаются номера страниц глав
//    и подставляются в оглавление.
// 5. pdf-lib дописывает закладки (части → главы → разделы) и метаданные: название, автор,
//    язык, ключевые слова. Закладки Chrome не используются: он задваивает в них заголовки.
//
// Параметры: --build-dir build  --out build/data-inventory-book.pdf  --html book.html  --concurrency 4
// Браузер: установленный Google Chrome; другой путь — CHROME_PATH, Chromium из Playwright —
// PDF_BROWSER_CHANNEL=chromium (после `npx playwright install chromium`).

import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {chromium} from 'playwright-core';
import {PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber} from 'pdf-lib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK_PAGE = '__pdf-book.html';

// Всё, что зависит от языка книги. Название, автор и аннотация — из CITATION.cff.
const LOCALES = {
  ru: {
    buildDir: 'build',
    fileName: 'data-inventory-book.pdf',
    docsDir: 'docs',
    lang: 'ru',
    browserLocale: 'ru-RU',
    dateLocale: 'ru-RU',
    edition: /Редакция\s+[^.]*?\d{4}\s+года/,
    rootTitle: 'О книге',
    fallbackTitle: 'Книга',
    contents: 'Содержание',
    part: (number) => `Часть ${number}.`,
    licenseCcBy:
      'Текст доступен по лицензии Creative Commons «Атрибуция» 4.0 Международная (CC&nbsp;BY&nbsp;4.0): ' +
      '<a href="https://creativecommons.org/licenses/by/4.0/deed.ru">creativecommons.org/licenses/by/4.0/deed.ru</a>.',
    license: (name) => `Лицензия: ${name}.`,
    onlineVersion: 'Онлайн-версия книги',
    source: 'Исходный текст',
    built: (date, revision) =>
      `PDF собран автоматически ${date}${revision ? `, версия исходного текста ${revision}` : ''}. ` +
      'Самая свежая редакция и таблицы атласа с результатами проверки адресов — на сайте книги.',
  },
};

const {values: args} = parseArgs({
  options: {
    locale: {type: 'string', default: 'ru'},
    'build-dir': {type: 'string'},
    out: {type: 'string'},
    html: {type: 'string'},
    concurrency: {type: 'string', default: '4'},
  },
});

const L = LOCALES[args.locale];
if (!L) {
  throw new Error(`Неизвестный язык: ${args.locale}. Доступны: ${Object.keys(LOCALES).join(', ')}.`);
}
const buildDirArg = args['build-dir'] ?? L.buildDir;
const buildDir = path.resolve(ROOT, buildDirArg);
const outFile = path.resolve(ROOT, args.out ?? path.join(buildDirArg, L.fileName));

// Интерактивные компоненты, которые в PDF заменяются пояснением. {url} — адрес страницы на сайте.
// В книге их пока нет; новый компонент нужно добавить сюда, иначе в PDF попадут его кнопки.
const INTERACTIVE_REPLACEMENTS = [];
const concurrency = Math.max(1, Number.parseInt(args.concurrency, 10) || 4);

function log(message) {
  process.stdout.write(`[pdf] ${message}\n`);
}

// ---------- Данные о книге ----------

// Минимальное чтение CITATION.cff: только поля верхнего уровня, которые нужны для обложки.
function readCitation(file) {
  if (!existsSync(file)) {
    return {};
  }
  const text = readFileSync(file, 'utf8');
  const scalar = (key) =>
    text.match(new RegExp(`^${key}:[ \\t]*"?([^"\\n]*?)"?[ \\t]*$`, 'm'))?.[1]?.trim() || undefined;
  const folded = (key) => {
    const m = text.match(new RegExp(`^${key}:[ \\t]*>-?[ \\t]*\\n((?:[ \\t]+.*(?:\\n|$))+)`, 'm'));
    return m?.[1].split('\n').map((s) => s.trim()).filter(Boolean).join(' ');
  };
  const list = (key) => {
    const m = text.match(new RegExp(`^${key}:[ \\t]*\\n((?:[ \\t]+-[ \\t].*(?:\\n|$))+)`, 'm'));
    return m ? m[1].split('\n').map((s) => s.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : [];
  };
  const given = text.match(/given-names:\s*"?([^"\n]+)"?/)?.[1]?.trim();
  const family = text.match(/family-names:\s*"?([^"\n]+)"?/)?.[1]?.trim();
  return {
    title: scalar('title'),
    abstract: folded('abstract'),
    url: scalar('url'),
    repository: scalar('repository-code'),
    license: scalar('license'),
    keywords: list('keywords'),
    author: [given, family].filter(Boolean).join(' ') || undefined,
    authorShort: family && given ? `${family} ${given[0]}.` : undefined,
    year: text.match(/^\s+year:\s*(\d{4})/m)?.[1],
  };
}

function gitRevision() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function buildDate() {
  const epoch = Number(process.env.SOURCE_DATE_EPOCH);
  return Number.isFinite(epoch) && epoch > 0 ? new Date(epoch * 1000) : new Date();
}

// ---------- Сборка сайта: адреса и порядок страниц ----------

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`));
  return m ? (m[1] ?? m[2] ?? m[3]).replace(/&amp;/g, '&') : null;
}

function readSiteInfo(indexHtml) {
  const tags = [...indexHtml.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
  const canonical = tags.find((t) => /\srel=("|')?canonical/.test(t));
  const stylesheets = tags.filter((t) => /\srel=("|')?stylesheet/.test(t)).map((t) => attr(t, 'href'));
  const siteUrl = canonical ? attr(canonical, 'href') : null;
  return {siteUrl, stylesheets};
}

function nextPageLink(html) {
  for (const m of html.matchAll(/<a\b[^>]*>/g)) {
    if (m[0].includes('pagination-nav__link--next')) {
      return attr(m[0], 'href');
    }
  }
  return null;
}

// Ссылки на категории из хлебных крошек: по ним восстанавливаются титулы частей, которые
// обход пропускает, если у страницы задан pagination_next (как у главной).
function breadcrumbLinks(html, basePath) {
  const nav = html.match(/<nav\b[^>]*theme-doc-breadcrumbs[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  return [...nav.matchAll(/<a\b[^>]*>/g)]
    .map((m) => attr(m[0], 'href'))
    .filter((href) => href && href !== basePath && href.startsWith(basePath))
    .map((href) => href.split(/[?#]/)[0]);
}

async function readBuiltPage(basePath, pagePath) {
  const file = path.join(buildDir, decodeURIComponent(pagePath.slice(basePath.length)), 'index.html');
  return fs.readFile(file, 'utf8');
}

async function readingOrder(basePath) {
  const order = [];
  const seen = new Set();
  const add = (pagePath, html) => {
    seen.add(pagePath);
    const isPart = !html.includes('theme-doc-markdown');
    // Глава верхнего уровня: в хлебных крошках нет ни одной категории.
    const topLevel = !isPart && breadcrumbLinks(html, basePath).length === 0;
    order.push({path: pagePath, isPart, topLevel});
  };
  let current = basePath;
  while (current && !seen.has(current)) {
    const html = await readBuiltPage(basePath, current);
    for (const ancestor of breadcrumbLinks(html, basePath)) {
      if (!seen.has(ancestor) && ancestor !== current) {
        add(ancestor, await readBuiltPage(basePath, ancestor));
      }
    }
    add(current, html);
    const next = nextPageLink(html);
    current = next && next.startsWith(basePath) ? next.split(/[?#]/)[0] : null;
  }
  return order;
}

async function countMermaidInSources(dir) {
  if (!existsSync(dir)) {
    return null;
  }
  let total = 0;
  for (const entry of await fs.readdir(dir, {withFileTypes: true, recursive: true})) {
    if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      const text = await fs.readFile(path.join(entry.parentPath ?? entry.path, entry.name), 'utf8');
      total += (text.match(/^(```|~~~)mermaid\b/gm) ?? []).length;
    }
  }
  return total;
}

// ---------- Локальный сервер для build/ ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function startServer(basePath, virtualPages) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (virtualPages.has(pathname)) {
        res.writeHead(200, {'content-type': MIME['.html']});
        res.end(virtualPages.get(pathname));
        return;
      }
      let file = path.join(buildDir, pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname);
      if (!file.startsWith(buildDir)) {
        res.writeHead(403).end();
        return;
      }
      const stat = await fs.stat(file).catch(() => null);
      if (stat?.isDirectory()) {
        file = path.join(file, 'index.html');
      }
      const body = await fs.readFile(file);
      res.writeHead(200, {'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'});
      res.end(body);
    } catch {
      res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'}).end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ---------- Браузер ----------

async function launchBrowser() {
  if (process.env.CHROME_PATH) {
    return chromium.launch({executablePath: process.env.CHROME_PATH});
  }
  const channel = process.env.PDF_BROWSER_CHANNEL || 'chrome';
  try {
    return await chromium.launch({channel});
  } catch (error) {
    try {
      return await chromium.launch();
    } catch {
      throw new Error(
        `Не удалось запустить браузер (${channel}): ${String(error.message).split('\n')[0]}\n` +
          'Установите Google Chrome, укажите путь к нему в CHROME_PATH ' +
          'или выполните `npx playwright install chromium` и задайте PDF_BROWSER_CHANNEL=chromium.',
      );
    }
  }
}

async function waitForMermaid(page) {
  // Схемы рендерятся после гидратации по очереди. Ждём, пока их число перестанет меняться.
  const deadline = Date.now() + 20_000;
  let last = -1;
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    const count = await page.locator('.docusaurus-mermaid-container svg').count();
    if (count !== last) {
      last = count;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 800) {
      return;
    }
    await page.waitForTimeout(100);
  }
}

// Выполняется в браузере на странице сайта: превращает статью в фрагмент книги.
function extractPage({prefix, pathMap, basePath, siteUrl, demote, replacements, editionPattern}) {
  const pageUrl = siteUrl + location.pathname.slice(basePath.length);
  const sidebarLabel =
    document.querySelector('.theme-doc-sidebar-menu a.menu__link--active[aria-current="page"]')?.textContent.trim() ??
    null;
  const markdown = document.querySelector('.theme-doc-markdown');
  if (!markdown) {
    const header = document.querySelector('main header');
    return {
      kind: 'part',
      title: header?.querySelector('h1')?.textContent.trim() ?? document.title,
      description: header?.querySelector('p')?.textContent.trim() ?? '',
      sidebarLabel,
    };
  }

  const root = markdown.cloneNode(true);
  const header = root.querySelector(':scope > header') ?? root.querySelector('h1');
  const title = header?.querySelector('h1')?.textContent.trim() ?? header?.textContent.trim() ?? document.title;
  header?.remove();
  const tagline = root.querySelector(':scope > p > em')?.textContent.trim() ?? null;
  const text = root.textContent;

  // Элементы интерфейса сайта.
  root.querySelectorAll('.hash-link, [class*="buttonGroup"], .theme-code-block button').forEach((el) => el.remove());

  for (const {selector, html} of replacements) {
    root.querySelectorAll(selector).forEach((el) => {
      const note = document.createElement('div');
      note.className = 'print-note';
      note.innerHTML = html.replaceAll('{url}', pageUrl);
      el.replaceWith(note);
    });
  }

  // Свёрнутые блоки раскрываются.
  root.querySelectorAll('details').forEach((details) => {
    details.setAttribute('open', '');
    details.setAttribute('data-collapsed', 'false');
    for (const child of details.children) {
      if (child.tagName !== 'SUMMARY') {
        child.removeAttribute('style');
      }
    }
  });

  // Картинки: абсолютные адреса и без ленивой загрузки.
  root.querySelectorAll('img').forEach((img) => {
    if (img.getAttribute('src')) {
      img.setAttribute('src', img.src);
    }
    img.removeAttribute('loading');
  });

  // Якоря уникальны в пределах книги: префикс главы. Внутренности SVG не трогаем.
  const outsideSvg = (el) => !el.closest('svg');
  root.querySelectorAll('[id]').forEach((el) => {
    if (outsideSvg(el)) {
      el.id = `${prefix}--${el.id}`;
    }
  });
  for (const name of ['aria-describedby', 'aria-labelledby']) {
    root.querySelectorAll(`[${name}]`).forEach((el) => {
      if (outsideSvg(el)) {
        el.setAttribute(name, el.getAttribute(name).split(/\s+/).map((id) => `${prefix}--${id}`).join(' '));
      }
    });
  }

  // Ссылки: на главы книги — внутренние, на прочие страницы сайта — абсолютные.
  const decode = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  root.querySelectorAll('a[href]').forEach((a) => {
    if (!outsideSvg(a)) {
      return;
    }
    let url;
    try {
      url = new URL(a.getAttribute('href'), location.href);
    } catch {
      return;
    }
    const isSite = url.origin === location.origin || url.href.startsWith(siteUrl);
    if (!isSite || !/^https?:$/.test(url.protocol)) {
      return;
    }
    let pathname = url.pathname;
    if (!pathname.endsWith('/') && !/\.[^/]+$/.test(pathname)) {
      pathname += '/';
    }
    const target = pathMap[pathname];
    if (target) {
      const fragment = url.hash ? decode(url.hash.slice(1)) : '';
      a.setAttribute('href', `#${fragment ? `${target}--${fragment}` : target}`);
    } else {
      const relative = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname.replace(/^\//, '');
      a.setAttribute('href', siteUrl + relative + url.search + url.hash);
    }
  });

  // Уровни заголовков: в частях глава — h2, её разделы — h3 и ниже. Так строятся закладки PDF.
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const level = Number(heading.tagName[1]);
    const next = demote ? Math.min(level + 1, 6) : level;
    let el = heading;
    if (next !== level) {
      el = document.createElement(`h${next}`);
      for (const at of heading.attributes) {
        el.setAttribute(at.name, at.value);
      }
      el.append(...heading.childNodes);
      heading.replaceWith(el);
    }
    el.setAttribute('data-level', String(level));
    el.classList.remove('anchor');
  });

  // Разделы второго уровня — для закладок PDF.
  const sections = [...root.querySelectorAll('[data-level="2"][id]')].map((el) => ({
    id: el.id,
    title: el.textContent.replace(/\u200b/g, '').trim(),
  }));

  return {
    kind: 'chapter',
    title,
    sidebarLabel,
    tagline,
    edition: text.match(new RegExp(editionPattern))?.[0] ?? null,
    mermaid: root.querySelectorAll('.docusaurus-mermaid-container svg').length,
    sections,
    html: root.innerHTML,
  };
}

async function capturePages(context, origin, order, options) {
  const results = new Array(order.length);
  let cursor = 0;
  let done = 0;
  async function worker() {
    const page = await context.newPage();
    while (cursor < order.length) {
      const index = cursor++;
      const item = order[index];
      await page.goto(origin + item.path, {waitUntil: 'load', timeout: 60_000});
      await page.waitForSelector('html[data-has-hydrated="true"]', {state: 'attached', timeout: 30_000});
      await page.waitForLoadState('networkidle', {timeout: 30_000}).catch(() => {});
      if (!item.isPart) {
        await waitForMermaid(page);
      }
      results[index] = await page.evaluate(extractPage, {...options, prefix: item.id, demote: item.demote});
      done += 1;
      if (done % 10 === 0 || done === order.length) {
        log(`страниц обработано: ${done} из ${order.length}`);
      }
    }
    await page.close();
  }
  await Promise.all(Array.from({length: Math.min(concurrency, order.length)}, worker));
  return results;
}

// ---------- Вёрстка книги ----------

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const cssString = (s) => `"${String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ')}"`;

function splitPartTitle(title) {
  const m = title.match(/^([IVXLC]+)\.\s+(.+)$/);
  return m ? {number: m[1], name: m[2]} : {number: null, name: title};
}

function coverPattern() {
  // Сетка «карточек наборов»: детерминированный узор, одинаковый в каждой сборке.
  let seed = 7;
  const cells = [];
  for (let i = 0; i < 48; i += 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const value = seed / 233280;
    const level = value > 0.82 ? 'hi' : value > 0.5 ? 'mid' : value > 0.22 ? 'lo' : 'off';
    cells.push(`<span class="cover-cell cover-cell--${level}"></span>`);
  }
  return `<div class="cover-grid" aria-hidden="true">${cells.join('')}</div>`;
}

function groupPages(pages) {
  const front = [];
  const parts = [];
  // Главы верхнего уровня после первой части: идут после всех частей, как «Об авторе».
  const back = [];
  for (const page of pages) {
    if (page.kind === 'part') {
      parts.push({...page, chapters: []});
    } else if (parts.length === 0) {
      front.push(page);
    } else if (page.topLevel) {
      back.push(page);
    } else {
      parts.at(-1).chapters.push(page);
    }
  }
  return {front, parts, back};
}

// Дерево закладок: «Содержание», главы до первой части, части с главами, главы после частей,
// у глав — разделы.
function outlineTree(pages) {
  const {front, parts, back} = groupPages(pages);
  const chapter = (page) => ({
    title: page.title,
    id: page.id,
    children: (page.sections ?? []).map((s) => ({title: s.title, id: s.id, children: []})),
  });
  return [
    {title: L.contents, id: 'toc', children: []},
    ...front.map(chapter),
    ...parts.map((part) => ({title: part.title, id: part.id, open: true, children: part.chapters.map(chapter)})),
    ...back.map(chapter),
  ];
}

function assembleBook({meta, pages, pageNumbers, stylesheets, printCss}) {
  const {front, parts, back} = groupPages(pages);

  const pageNo = (id) => (pageNumbers.has(id) ? String(pageNumbers.get(id)) : '');
  const tocEntry = (page, cls) =>
    `<a class="${cls}" href="#${page.id}"><span class="toc-label">${escapeHtml(page.tocTitle)}</span>` +
    `<span class="toc-leader"></span><span class="toc-page">${pageNo(page.id)}</span></a>`;

  const toc = [
    `<nav class="toc" aria-label="${escapeHtml(L.contents)}">`,
    `<h1 class="toc-title" id="toc">${escapeHtml(L.contents)}</h1>`,
    '<ol class="toc-list">',
    ...front.map((page) => `<li>${tocEntry(page, 'toc-chapter toc-front')}</li>`),
    ...parts.map(
      (part) =>
        `<li class="toc-part-item">${tocEntry(part, 'toc-part')}<ol>` +
        part.chapters.map((page) => `<li>${tocEntry(page, 'toc-chapter')}</li>`).join('') +
        '</ol></li>',
    ),
    ...back.map((page) => `<li class="toc-back-item">${tocEntry(page, 'toc-chapter toc-front')}</li>`),
    '</ol>',
    '</nav>',
  ].join('\n');

  const chapterSection = (page, level) =>
    `<section class="chapter" style="page: ${page.id}">` +
    `<h${level} class="chapter-title" id="${page.id}" data-level="1">${escapeHtml(page.title)}</h${level}>` +
    `<div class="markdown">${page.html}</div></section>`;

  const partSection = (part) => {
    const {number, name} = splitPartTitle(part.title);
    const numberHtml = number ? `<span class="part-number">${L.part(number)}</span> ` : '';
    return (
      '<section class="part"><div class="part-inner">' +
      `<h1 class="part-title" id="${part.id}">${numberHtml}<span class="part-name">${escapeHtml(name)}</span></h1>` +
      (part.description ? `<p class="part-description">${escapeHtml(part.description)}</p>` : '') +
      '<ol class="part-contents">' +
      part.chapters.map((page) => `<li><a href="#${page.id}">${escapeHtml(page.tocTitle)}</a></li>`).join('') +
      '</ol></div></section>'
    );
  };

  // Колонтитулы: у каждой главы своя именованная страница с названием части и главы.
  const runningHeads = [
    ...front.map((page) => ({page, left: meta.title})),
    ...parts.flatMap((part) => part.chapters.map((page) => ({page, left: part.title}))),
    ...back.map((page) => ({page, left: meta.title})),
  ]
    .map(
      ({page, left}) =>
        `@page ${page.id} { @top-left { content: ${cssString(left)}; } ` +
        `@top-right { content: ${cssString(page.runningTitle)}; } }`,
    )
    .join('\n');

  const licenseHtml =
    meta.license === 'CC-BY-4.0'
      ? L.licenseCcBy
      : meta.license
        ? L.license(escapeHtml(meta.license))
        : '';

  const cover = [
    '<section class="cover">',
    coverPattern(),
    '<div class="cover-inner">',
    meta.author ? `<p class="cover-author">${escapeHtml(meta.author)}</p>` : '',
    '<div class="cover-main">',
    `<p class="cover-title">${escapeHtml(meta.title)}</p>`,
    meta.subtitle ? `<p class="cover-subtitle">${escapeHtml(meta.subtitle)}</p>` : '',
    '</div>',
    `<p class="cover-edition">${escapeHtml(meta.edition ?? '')}</p>`,
    '</div>',
    '</section>',
  ].join('\n');

  const colophon = [
    '<section class="colophon"><div class="colophon-inner">',
    `<p class="colophon-title"><strong>${escapeHtml(meta.title)}</strong>${
      meta.subtitle ? `. ${escapeHtml(meta.subtitle.replace(/\.$/, ''))}` : ''
    }</p>`,
    meta.author ? `<p>© ${escapeHtml(meta.year)} ${escapeHtml(meta.author)}. ${escapeHtml(meta.edition ?? '')}.</p>` : '',
    licenseHtml ? `<p>${licenseHtml}</p>` : '',
    meta.siteUrl ? `<p>${L.onlineVersion}: <a href="${escapeHtml(meta.siteUrl)}">${escapeHtml(meta.siteUrl)}</a></p>` : '',
    meta.repository
      ? `<p>${L.source}: <a href="${escapeHtml(meta.repository)}">${escapeHtml(meta.repository)}</a></p>`
      : '',
    `<p class="colophon-build">${L.built(escapeHtml(meta.builtAt), meta.revision && escapeHtml(meta.revision))}</p>`,
    '</div></section>',
  ].join('\n');

  // Скрытые ссылки на разделы: Chrome создаёт именованные назначения только для якорей,
  // на которые есть ссылки, а по ним строятся закладки.
  const destinationIds = ['toc', ...pages.flatMap((page) => (page.sections ?? []).map((s) => s.id))];
  const destinations =
    '<div class="pdf-destinations" hidden>' +
    destinationIds.map((id) => `<a href="#${escapeHtml(id)}"></a>`).join('') +
    '</div>';

  const body = [
    cover,
    colophon,
    toc,
    ...front.map((page) => chapterSection(page, 1)),
    ...parts.flatMap((part) => [partSection(part), ...part.chapters.map((page) => chapterSection(page, 2))]),
    ...back.map((page) => chapterSection(page, 1)),
    destinations,
  ].join('\n');

  return `<!doctype html>
<html lang="${L.lang}" dir="ltr" data-theme="light">
<head>
<meta charset="utf-8">
<title>${escapeHtml(meta.title)}${meta.subtitle ? ` — ${escapeHtml(meta.subtitle.replace(/\.$/, ''))}` : ''}</title>
<meta name="author" content="${escapeHtml(meta.author ?? '')}">
${stylesheets.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`).join('\n')}
<style>${printCss}</style>
<style>${runningHeads}</style>
</head>
<body class="pdf-book">
${body}
</body>
</html>`;
}

// ---------- PDF ----------

const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

// Именованные назначения PDF: якорь → {страница, массив назначения}.
function readNamedDestinations(doc) {
  const pageIndex = new Map(doc.getPages().map((page, i) => [page.ref.toString(), i + 1]));
  const result = new Map();
  const ctx = doc.context;
  const resolve = (value) => {
    let dest = ctx.lookup(value);
    if (dest instanceof PDFDict) {
      dest = ctx.lookup(dest.get(PDFName.of('D')));
    }
    if (!(dest instanceof PDFArray)) {
      return null;
    }
    const page = pageIndex.get(dest.get(0)?.toString());
    return page ? {page, dest} : null;
  };
  const add = (key, value) => {
    const entry = resolve(value);
    if (entry) {
      result.set(safeDecode(key.decodeText()), entry);
    }
  };
  const walk = (nodeRef, depth = 0) => {
    const node = ctx.lookup(nodeRef);
    if (!(node instanceof PDFDict) || depth > 32) {
      return;
    }
    const names = node.lookup(PDFName.of('Names'));
    if (names instanceof PDFArray) {
      for (let i = 0; i + 1 < names.size(); i += 2) {
        add(names.lookup(i), names.get(i + 1));
      }
    }
    const kids = node.lookup(PDFName.of('Kids'));
    if (kids instanceof PDFArray) {
      for (let i = 0; i < kids.size(); i += 1) {
        walk(kids.get(i), depth + 1);
      }
    }
  };
  const namesDict = doc.catalog.lookup(PDFName.of('Names'));
  if (namesDict instanceof PDFDict && namesDict.has(PDFName.of('Dests'))) {
    walk(namesDict.get(PDFName.of('Dests')));
  }
  const legacy = doc.catalog.lookup(PDFName.of('Dests'));
  if (legacy instanceof PDFDict) {
    for (const [key, value] of legacy.entries()) {
      add(key, value);
    }
  }
  return result;
}

function writeOutline(doc, tree, dests) {
  const ctx = doc.context;
  const usable = (items) =>
    items.filter((item) => dests.has(item.id)).map((item) => ({...item, children: usable(item.children ?? [])}));
  const items = usable(tree);
  if (items.length === 0) {
    return 0;
  }
  let total = 0;
  const build = (list, parentRef) => {
    const refs = list.map(() => ctx.nextRef());
    let visible = 0;
    list.forEach((item, i) => {
      total += 1;
      visible += 1;
      const dict = ctx.obj({});
      dict.set(PDFName.of('Title'), PDFHexString.fromText(item.title));
      dict.set(PDFName.of('Parent'), parentRef);
      if (i > 0) {
        dict.set(PDFName.of('Prev'), refs[i - 1]);
      }
      if (i < list.length - 1) {
        dict.set(PDFName.of('Next'), refs[i + 1]);
      }
      dict.set(PDFName.of('Dest'), dests.get(item.id).dest);
      if (item.children.length > 0) {
        const sub = build(item.children, refs[i]);
        dict.set(PDFName.of('First'), sub.first);
        dict.set(PDFName.of('Last'), sub.last);
        // Положительное число — пункт раскрыт, отрицательное — свёрнут.
        dict.set(PDFName.of('Count'), PDFNumber.of(item.open ? sub.visible : -sub.visible));
        if (item.open) {
          visible += sub.visible;
        }
      }
      ctx.assign(refs[i], dict);
    });
    return {first: refs[0], last: refs.at(-1), visible};
  };
  const rootRef = ctx.nextRef();
  const top = build(items, rootRef);
  ctx.assign(rootRef, ctx.obj({Type: 'Outlines', First: top.first, Last: top.last, Count: top.visible}));
  doc.catalog.set(PDFName.of('Outlines'), rootRef);
  return total;
}

async function renderPdf(page, url) {
  await page.goto(url, {waitUntil: 'load', timeout: 120_000});
  await page.evaluate(() => document.fonts.ready);
  return page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
    outline: false,
    tagged: true,
  });
}

async function checkBookPage(page) {
  return page.evaluate(() => {
    const missing = new Set();
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      if (id && !document.getElementById(id)) {
        missing.add(id);
      }
    });
    const localLinks = [...document.querySelectorAll('a[href*="127.0.0.1"], a[href*="localhost"]')].length;
    return {missing: [...missing], localLinks};
  });
}

// ---------- Основной сценарий ----------

async function main() {
  const started = Date.now();
  const indexFile = path.join(buildDir, 'index.html');
  if (!existsSync(indexFile)) {
    throw new Error(`Нет сборки сайта: ${path.relative(ROOT, indexFile)}. Сначала выполните npm run build.`);
  }
  const citation = {...readCitation(path.join(ROOT, 'CITATION.cff')), ...L.citation};
  const site = readSiteInfo(await fs.readFile(indexFile, 'utf8'));
  const siteUrl = site.siteUrl ?? citation.url;
  if (!siteUrl) {
    throw new Error('Не найден адрес сайта: нет <link rel="canonical"> в build/index.html и url в CITATION.cff.');
  }
  const basePath = new URL(siteUrl).pathname.replace(/\/?$/, '/');

  const order = await readingOrder(basePath);
  let insidePart = false;
  order.forEach((item, i) => {
    item.id = `c${String(i).padStart(3, '0')}`;
    insidePart ||= item.isPart;
    item.demote = insidePart && !item.isPart && !item.topLevel;
  });
  const pathMap = Object.fromEntries(order.map((item) => [item.path, item.id]));
  log(`страниц в книге: ${order.length} (частей: ${order.filter((i) => i.isPart).length})`);

  const virtualPages = new Map();
  const server = await startServer(basePath, virtualPages);
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await launchBrowser();
  } catch (error) {
    server.close();
    throw error;
  }
  log(`браузер: ${browser.browserType().name()} ${browser.version()}`);

  try {
    const context = await browser.newContext({
      colorScheme: 'light',
      locale: L.browserLocale,
      viewport: {width: 1280, height: 900},
    });
    const captured = await capturePages(context, origin, order, {
      pathMap,
      basePath,
      siteUrl,
      replacements: INTERACTIVE_REPLACEMENTS,
      editionPattern: L.edition.source,
    });

    const pages = captured.map((data, i) => {
      const item = order[i];
      const isRoot = item.path === basePath;
      const title = isRoot ? data.sidebarLabel || L.rootTitle : data.title;
      return {
        ...data,
        id: item.id,
        topLevel: item.topLevel,
        title,
        tocTitle: title,
        runningTitle: isRoot ? title : data.sidebarLabel || title,
      };
    });

    const expectedMermaid = await countMermaidInSources(path.join(ROOT, L.docsDir));
    const renderedMermaid = pages.reduce((sum, p) => sum + (p.mermaid ?? 0), 0);
    log(`схем Mermaid: ${renderedMermaid}${expectedMermaid === null ? '' : ` из ${expectedMermaid} в исходниках`}`);
    if (expectedMermaid !== null && renderedMermaid < expectedMermaid) {
      throw new Error('Отрисованы не все схемы Mermaid. Попробуйте --concurrency 1 или проверьте схемы на сайте.');
    }

    const root = captured[0] ?? {};
    const meta = {
      title: citation.title ?? L.fallbackTitle,
      subtitle: root.tagline?.replace(/\.$/, '') ?? citation.abstract?.split('. ')[0],
      author: citation.author,
      year: citation.year ?? String(buildDate().getFullYear()),
      edition: root.edition,
      license: citation.license,
      siteUrl,
      repository: citation.repository,
      revision: gitRevision(),
      builtAt: new Intl.DateTimeFormat(L.dateLocale, {day: 'numeric', month: 'long', year: 'numeric'}).format(buildDate()),
    };
    const printCss = await fs.readFile(path.join(ROOT, 'scripts/pdf/print.css'), 'utf8');
    const bookUrl = `${origin}${basePath}${BOOK_PAGE}`;
    const bookPage = await context.newPage();
    const targets = pages.map((p) => p.id);

    let pageNumbers = new Map();
    let pdfBytes;
    let html;
    for (let pass = 1; pass <= 3; pass += 1) {
      html = assembleBook({meta, pages, pageNumbers, stylesheets: site.stylesheets, printCss});
      virtualPages.set(`${basePath}${BOOK_PAGE}`, html);
      pdfBytes = await renderPdf(bookPage, bookUrl);
      if (pass === 1) {
        const {missing, localLinks} = await checkBookPage(bookPage);
        if (missing.length > 0) {
          log(`внимание: ссылок на несуществующие якоря: ${missing.length} (${missing.slice(0, 5).join(', ')})`);
        }
        if (localLinks > 0) {
          log(`внимание: ссылок на локальный сервер: ${localLinks}`);
        }
      }
      const doc = await PDFDocument.load(pdfBytes, {updateMetadata: false});
      const dests = readNamedDestinations(doc);
      const found = new Map(targets.filter((id) => dests.has(id)).map((id) => [id, dests.get(id).page]));
      log(`проход ${pass}: страниц ${doc.getPageCount()}, номера найдены для ${found.size} из ${targets.length} глав`);
      if (found.size === 0) {
        log('внимание: в PDF нет именованных назначений, оглавление останется без номеров страниц');
        break;
      }
      const stable = found.size === pageNumbers.size && [...found].every(([id, n]) => pageNumbers.get(id) === n);
      if (stable) {
        break;
      }
      pageNumbers = found;
    }

    if (args.html) {
      await fs.writeFile(path.resolve(ROOT, args.html), html);
    }

    const doc = await PDFDocument.load(pdfBytes, {updateMetadata: false});
    const bookmarks = writeOutline(doc, outlineTree(pages), readNamedDestinations(doc));
    const sectionCount = pages.reduce((sum, p) => sum + (p.sections?.length ?? 0), 0);
    log(`закладок: ${bookmarks} (глав и частей ${pages.length}, разделов ${sectionCount}, содержание 1)`);
    const date = buildDate();
    doc.setTitle(meta.subtitle ? `${meta.title}: ${meta.subtitle}` : meta.title, {showInWindowTitleBar: true});
    if (meta.author) {
      doc.setAuthor(meta.author);
    }
    if (citation.abstract) {
      doc.setSubject(citation.abstract);
    }
    if (citation.keywords?.length) {
      doc.setKeywords(citation.keywords);
    }
    doc.setLanguage(L.browserLocale);
    doc.setCreator('Docusaurus, Google Chrome, scripts/pdf/build-pdf.mjs');
    doc.setProducer('pdf-lib');
    doc.setCreationDate(date);
    doc.setModificationDate(date);
    // Открывать PDF с панелью закладок.
    doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
    const bytes = await doc.save();

    await fs.mkdir(path.dirname(outFile), {recursive: true});
    await fs.writeFile(outFile, bytes);
    const seconds = ((Date.now() - started) / 1000).toFixed(0);
    log(
      `готово: ${path.relative(ROOT, outFile)} — ${doc.getPageCount()} стр., ` +
        `${(bytes.length / 1024 / 1024).toFixed(1)} МБ, ${seconds} с`,
    );
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`[pdf] ошибка: ${error.stack ?? error}\n`);
  process.exitCode = 1;
});
