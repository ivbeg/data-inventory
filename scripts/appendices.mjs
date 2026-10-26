// Проверяет реестр нормативных актов и чек-листы в data/ и строит из них приложения книги:
// таблицы для «Нормативной базы» и «Чек-листов» в docs/09-appendices/_generated/,
// а для скачивания — static/downloads/legal-acts.csv, checklists.csv (Excel) и checklists.html (печать).
// Формат данных — data/README.md. Запуск: npm run appendices (с --check — только проверка).

import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import yaml from 'js-yaml';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DOCS = path.join(ROOT, 'docs');
const DATA = path.join(ROOT, 'data');
const OUT_MDX = path.join(ROOT, 'docs/09-appendices/_generated');
const OUT_FILES = path.join(ROOT, 'static/downloads');
const SITE = 'https://datainventory.begtin.tech';
const LEGAL_PAGE = '09-appendices/02-legal-framework.md';
const CHECKLISTS_PAGE = '09-appendices/04-checklists.md';
const CHECK_ONLY = process.argv.includes('--check');

const COUNTRY_ORDER = ['kz', 'ru', 'eu', 'us', 'uk', 'fr', 'pl', 'kr'];
const COUNTRY_SHORT = {kz: 'Казахстан', ru: 'Россия', eu: 'ЕС', us: 'США', uk: 'Великобритания', fr: 'Франция', pl: 'Польша', kr: 'Южная Корея'};
const TOPICS = {
  access: 'Доступ к информации и запросы',
  personal_data: 'Персональные данные',
  open_data: 'Открытые данные и повторное использование',
  sharing: 'Обмен данными и защищённые данные',
  systems: 'Информационные системы и их учёт',
  data_governance: 'Управление данными и роли',
  mandates: 'Полномочия и структура органов',
  statistics: 'Статистика и формы сбора',
  quality: 'Качество данных',
  standards: 'Стандарты описания и метаданные',
  archives: 'Документы, архивы, вывод систем',
  procurement: 'Закупки и расходы на ИТ',
  business: 'Данные компаний',
  ai: 'Искусственный интеллект',
};
const STATUS = {
  in_force: 'действует',
  repealed: 'утратил силу',
  pending: 'не вступил в силу',
  unverified: 'не проверено',
};
const ACT_FIELDS = new Set([
  'id', 'country', 'title', 'title_original', 'short', 'number', 'date', 'edition', 'in_force', 'status',
  'status_checked', 'about', 'provisions', 'response_time', 'topics', 'chapters', 'url', 'links', 'note',
]);
const ACT_REQUIRED = ['id', 'country', 'title', 'short', 'number', 'status', 'status_checked', 'about', 'topics', 'chapters'];
const COUNTRY_FIELDS = new Set(['name', 'chapter', 'where', 'how_checked']);
const CHECKLIST_FIELDS = new Set(['id', 'title', 'steps', 'when', 'intro', 'items', 'sections']);
const ITEM_FIELDS = new Set(['text', 'chapter', 'label']);
const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const errors = [];
const warnings = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);

// Даты оставляем строками: CORE_SCHEMA не превращает 2026-10-25 в объект Date.
function load(file) {
  return yaml.load(fs.readFileSync(file, 'utf8'), {schema: yaml.CORE_SCHEMA, filename: file});
}

// --- Главы книги: адреса страниц и якоря заголовков, как их строит Docusaurus ---

let GithubSlugger;
try {
  GithubSlugger = require('github-slugger');
} catch {
  console.error('Нет пакета github-slugger (его ставит Docusaurus): выполните npm install.');
  process.exit(1);
}

// Текст заголовка без разметки — так его видит mdast-util-to-string.
function headingText(raw) {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|[^\p{L}\p{N}])[*_]([^*_]+)[*_](?=$|[^\p{L}\p{N}])/gu, '$1$2')
    .replace(/\\([\\`*_{}[\]()#+\-.!|])/g, '$1')
    .trim();
}

function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return {};
  try {
    return yaml.load(m[1], {schema: yaml.CORE_SCHEMA}) ?? {};
  } catch {
    return {};
  }
}

// Адрес страницы: числовые префиксы папок и файлов убираются, slug из front matter важнее.
function docUrl(rel, fm) {
  const parts = rel.replace(/\.mdx?$/, '').split('/').map((p) => p.replace(/^\d+[-_.]/, ''));
  if (parts[parts.length - 1] === 'index') parts.pop();
  if (typeof fm.slug === 'string') {
    if (fm.slug.startsWith('/')) return fm.slug.endsWith('/') ? fm.slug : `${fm.slug}/`;
    parts[parts.length - 1] = fm.slug;
  }
  return `/${parts.join('/')}${parts.length ? '/' : ''}`;
}

function parseDoc(text) {
  const slugger = new GithubSlugger();
  const anchors = new Map();
  let title = null;
  let fence = null;
  for (const line of text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n')) {
    const f = /^\s*(```+|~~~+)/.exec(line);
    if (f) {
      if (!fence) fence = f[1];
      else if (line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (fence) continue;
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (!h) continue;
    const text = headingText(h[2]);
    if (h[1].length === 1) {
      title ??= text;
      continue;
    }
    anchors.set(slugger.slug(text), text);
  }
  return {title, anchors};
}

function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
    if (e.name.startsWith('_') || e.name.startsWith('.')) return [];
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.mdx?$/.test(e.name) ? [p] : [];
  });
}

const docs = new Map();
for (const file of walk(DOCS)) {
  const rel = path.relative(DOCS, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  const fm = frontMatter(text);
  const {title, anchors} = parseDoc(text);
  docs.set(rel, {rel, url: docUrl(rel, fm), title: fm.title ?? title ?? rel, anchors, text});
}

const slugOf = (text) => new GithubSlugger().slug(headingText(text));

// Сколько глав содержат раздел с таким якорем: у «Как записать» или «Пример» в подписи нужна и глава.
const anchorUse = new Map();
for (const doc of docs.values()) for (const a of doc.anchors.keys()) anchorUse.set(a, (anchorUse.get(a) ?? 0) + 1);

// Данные приложений читаем сразу: их заголовки и якоря актов появятся на страницах только после сборки,
// а ссылки на них есть и в данных, и в главах.
const legal = load(path.join(DATA, 'legal-acts.yaml'));
const checklistData = load(path.join(DATA, 'checklists.yaml'));
const legalDoc = docs.get(LEGAL_PAGE);
const checklistsDoc = docs.get(CHECKLISTS_PAGE);
const pageHeadings = new Map([
  [LEGAL_PAGE, new Set(legalDoc?.anchors.keys() ?? [])],
  [CHECKLISTS_PAGE, new Set(checklistsDoc?.anchors.keys() ?? [])],
]);
for (const a of legal?.acts ?? []) if (a?.id) legalDoc?.anchors.set(a.id, a.title ?? a.id);
for (const c of checklistData?.checklists ?? []) {
  if (c?.title) checklistsDoc?.anchors.set(slugOf(c.title), c.title);
  for (const s of c?.sections ?? []) if (s?.title) checklistsDoc?.anchors.set(slugOf(s.title), s.title);
}

// Ссылка из данных на главу: «путь/к/главе.md#якорь». Файл обязателен, якорь — предупреждение:
// пропавший якорь из ссылки убираем, чтобы сборка не упала на битом якоре.
function resolveChapter(ref, where) {
  if (typeof ref !== 'string' || !ref.trim()) {
    fail(where, 'пустая ссылка на главу');
    return null;
  }
  const [file, anchor] = ref.split('#');
  const doc = docs.get(file);
  if (!doc) {
    fail(where, `нет главы ${file} (путь от docs/, например 03-process/06-access.md)`);
    return null;
  }
  if (anchor && !doc.anchors.has(anchor)) {
    warn(where, `в главе ${file} нет заголовка с якорем #${anchor} — ссылка поставлена на начало главы`);
    return {doc, anchor: null, label: doc.title, url: doc.url};
  }
  return {
    doc,
    anchor: anchor ?? null,
    label: anchor ? doc.anchors.get(anchor) : doc.title,
    url: anchor ? `${doc.url}#${anchor}` : doc.url,
  };
}

function checkDate(value, where, field) {
  if (value === undefined || value === null) return;
  if (!DATE_RE.test(String(value))) fail(where, `${field} должен быть вида 2026-10-25, 2026-10 или 2026, а не «${value}»`);
}

function unknownFields(obj, allowed, where) {
  for (const k of Object.keys(obj ?? {})) if (!allowed.has(k)) fail(where, `неизвестное поле «${k}»`);
}

// --- Реестр актов ---

checkDate(legal.checked, 'legal-acts.yaml', 'checked');
const countries = legal.countries ?? {};
for (const code of COUNTRY_ORDER) if (!countries[code]) fail('legal-acts.yaml', `нет страны «${code}» в countries`);
for (const [code, c] of Object.entries(countries)) {
  const where = `legal-acts.yaml, страна ${code}`;
  if (!COUNTRY_ORDER.includes(code)) fail(where, `неизвестный код страны; известные — ${COUNTRY_ORDER.join(', ')}`);
  unknownFields(c, COUNTRY_FIELDS, where);
  for (const field of ['name', 'chapter', 'where']) if (!c[field]) fail(where, `нет ${field}`);
  if (c.chapter) c.resolved = resolveChapter(c.chapter, where);
}

const acts = [];
const actIds = new Set();
for (const [i, a] of (legal.acts ?? []).entries()) {
  const where = `legal-acts.yaml, акт ${a?.id ?? `#${i + 1}`}`;
  unknownFields(a, ACT_FIELDS, where);
  for (const field of ACT_REQUIRED) if (a[field] === undefined || a[field] === null || a[field] === '') fail(where, `нет ${field}`);
  if (a.id && !/^[a-z0-9-]+$/.test(a.id)) fail(where, 'id — латиница в нижнем регистре, цифры и дефисы');
  if (actIds.has(a.id)) fail(where, 'id повторяется');
  actIds.add(a.id);
  if (a.country && !COUNTRY_ORDER.includes(a.country)) fail(where, `неизвестная страна «${a.country}»; известные — ${COUNTRY_ORDER.join(', ')}`);
  if (a.status && !(a.status in STATUS)) fail(where, `неизвестный status «${a.status}»; известные — ${Object.keys(STATUS).join(', ')}`);
  checkDate(a.date, where, 'date');
  checkDate(a.in_force, where, 'in_force');
  checkDate(a.status_checked, where, 'status_checked');
  if (a.status === 'pending' && !a.in_force) fail(where, 'у акта, который не вступил в силу, нужна дата in_force');
  if (!Array.isArray(a.topics) || a.topics.length === 0) fail(where, 'topics — непустой список');
  for (const t of a.topics ?? []) if (!(t in TOPICS)) fail(where, `неизвестная тема «${t}»; известные — ${Object.keys(TOPICS).join(', ')}`);
  if (!Array.isArray(a.chapters) || a.chapters.length === 0) fail(where, 'chapters — непустой список: где в книге работает акт');
  a.resolved = (a.chapters ?? []).map((ref) => resolveChapter(ref, where)).filter(Boolean);
  if (a.provisions !== undefined && !Array.isArray(a.provisions)) fail(where, 'provisions — список строк');
  for (const l of a.links ?? []) if (!l.title || !l.url) fail(where, 'у ссылки в links нужны title и url');
  if (a.url && !/^https?:\/\//.test(a.url)) fail(where, `url должен начинаться с http:// или https://`);
  const words = String(a.about ?? '').split(/\s+/).filter(Boolean).length;
  if (words > 25) warn(where, `about длиннее 25 слов (${words}) — короче, подробности — в provisions`);
  acts.push(a);
}

// --- Чек-листы ---

const checklists = [];
const checklistIds = new Set();
const checklistSlugs = new Set();
let itemCount = 0;
for (const [i, c] of (checklistData.checklists ?? []).entries()) {
  const where = `checklists.yaml, чек-лист ${c?.id ?? `#${i + 1}`}`;
  unknownFields(c, CHECKLIST_FIELDS, where);
  for (const field of ['id', 'title', 'steps', 'when']) if (!c[field]) fail(where, `нет ${field}`);
  if (c.id && !/^[a-z0-9-]+$/.test(c.id)) fail(where, 'id — латиница в нижнем регистре, цифры и дефисы');
  if (checklistIds.has(c.id)) fail(where, 'id повторяется');
  checklistIds.add(c.id);
  if (c.title) {
    c.slug = slugOf(c.title);
    if (checklistSlugs.has(c.slug)) fail(where, `заголовок «${c.title}» повторяется`);
    checklistSlugs.add(c.slug);
  }
  for (const s of c.steps ?? []) if (!Number.isInteger(s) || s < 1 || s > 7) fail(where, `шаг «${s}» — число от 1 до 7`);
  if (!!c.items === !!c.sections) fail(where, 'нужно одно из двух: items или sections');
  const sections = c.sections ?? [{title: null, items: c.items}];
  for (const [j, s] of sections.entries()) {
    const sw = s.title ? `${where}, раздел «${s.title}»` : where;
    if (c.sections && !s.title) fail(sw, `у раздела #${j + 1} нет title`);
    if (!Array.isArray(s.items) || s.items.length === 0) fail(sw, 'нет пунктов');
    for (const [k, item] of (s.items ?? []).entries()) {
      const iw = `${sw}, пункт ${k + 1}`;
      unknownFields(item, ITEM_FIELDS, iw);
      if (!item.text) fail(iw, 'нет text');
      if (!item.chapter) fail(iw, 'нет chapter — у каждого пункта нужна ссылка на главу');
      const refs = Array.isArray(item.chapter) ? item.chapter : item.chapter ? [item.chapter] : [];
      item.resolved = refs.map((ref) => resolveChapter(ref, iw)).filter(Boolean);
      itemCount += 1;
    }
  }
  c.sectionsList = sections;
  checklists.push(c);
}

// --- Якоря страниц приложений, на которые ссылаются главы ---

if (!legalDoc) fail('docs', `нет страницы ${LEGAL_PAGE}`);
if (!checklistsDoc) fail('docs', `нет страницы ${CHECKLISTS_PAGE}`);
for (const code of COUNTRY_ORDER) {
  if (countries[code] && legalDoc && !pageHeadings.get(LEGAL_PAGE).has(slugOf(countries[code].name)))
    fail(LEGAL_PAGE, `нет заголовка «## ${countries[code].name}» — на него ссылаются главы и матрица`);
}
for (const c of checklists) {
  if (c.slug && pageHeadings.get(CHECKLISTS_PAGE).has(c.slug))
    fail(CHECKLISTS_PAGE, `заголовок «${c.title}» есть и на странице, и в данных — оставьте его только в data/checklists.yaml`);
}
const linkRe = /\]\(([^)\s]*?(02-legal-framework|04-checklists)\.mdx?)#([^)\s]+)\)/g;
for (const doc of docs.values()) {
  for (const m of doc.text.matchAll(linkRe)) {
    const page = m[2] === '02-legal-framework' ? LEGAL_PAGE : CHECKLISTS_PAGE;
    const anchor = decodeURIComponent(m[3]);
    if (!docs.get(page)?.anchors.has(anchor)) fail(`docs/${doc.rel}`, `ссылка на ${page}#${anchor}, а такого заголовка на странице не будет`);
  }
}

for (const w of warnings) console.warn(`Предупреждение: ${w}`);
if (errors.length) {
  console.error(`Ошибки в данных приложений (${errors.length}):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

const byCountry = Object.fromEntries(COUNTRY_ORDER.map((code) => [code, acts.filter((a) => a.country === code)]));
console.log(
  `Приложения: актов — ${acts.length} (${COUNTRY_ORDER.map((c) => `${c} ${byCountry[c].length}`).join(', ')}), ` +
    `чек-листов — ${checklists.length}, пунктов — ${itemCount}, предупреждений — ${warnings.length}.`,
);
if (CHECK_ONLY) process.exit(0);

// --- Разметка ---

// Текст для MDX: экранируем то, что MDX примет за JSX или выражение, и «*» вне кода.
function md(text) {
  return String(text ?? '')
    .split(/(`[^`]*`)/)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(/&(?![#a-zA-Z0-9]+;)/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\{/g, '&#123;')
            .replace(/\}/g, '&#125;')
            .replace(/\*/g, '\\*'),
    )
    .join('')
    .replace(/\s*\n\s*/g, ' ');
}
const cell = (text) => text.replace(/\|/g, '\\|');
const link = (label, url) => `[${label}](${url})`;
function chapterLabel(r) {
  if (!r.anchor) return `«${r.label}»`;
  return (anchorUse.get(r.anchor) ?? 0) > 1 ? `«${r.doc.title}», раздел «${r.label}»` : `«${r.label}»`;
}
const chapterLink = (r) => link(md(chapterLabel(r)), r.url);
// Для печати и CSV — всегда глава и раздел.
const fullLabel = (r, label) => (label ? label : r.anchor ? `${r.doc.title}: ${r.label}` : r.doc.title);

function fmtDate(value) {
  const s = String(value ?? '');
  const [y, m, d] = s.split('-');
  if (d) return `${d}.${m}.${y}`;
  if (m) return `${MONTHS[Number(m) - 1]} ${y}`;
  return y;
}
const isFullDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));
const today = new Date().toISOString().slice(0, 10);

function numberAndDate(a) {
  let s = md(a.number);
  if (a.date) s += isFullDate(a.date) ? ` от ${fmtDate(a.date)}` : `, ${fmtDate(a.date)}`;
  if (a.edition) s += `; ${md(a.edition)}`;
  return s;
}

function statusText(a) {
  let s = STATUS[a.status];
  if (a.status === 'in_force' && a.in_force) s = String(a.in_force) > today ? `вступит в силу ${fmtDate(a.in_force)}` : `действует с ${fmtDate(a.in_force)}`;
  if (a.status === 'pending') s = `вступит в силу ${fmtDate(a.in_force)}`;
  return `${s}<br />проверено: ${fmtDate(a.status_checked)}`;
}

// Где в книге: одна ссылка на главу, даже если акт работает в нескольких её разделах.
function chaptersCell(a) {
  const seen = new Set();
  return a.resolved
    .filter((r) => !seen.has(r.doc.rel) && seen.add(r.doc.rel))
    .map((r) => link(`«${md(r.doc.title)}»`, r.url))
    .join(', ');
}

const anchorTag = (id) => `<Link id="${id}" style={{scrollMarginTop: '5rem'}} />`;
const BANNER = '{/* Сгенерировано scripts/appendices.mjs из data/. Не править вручную. */}\n\n';
const IMPORT_LINK = "import Link from '@docusaurus/Link';\n\n";

function countryTable(code) {
  const rows = byCountry[code].map((a) => {
    const title = a.url ? link(`**${md(a.title)}**`, a.url) : `**${md(a.title)}**`;
    const original = a.title_original && a.title_original !== a.title ? `<br />${md(a.title_original)}` : '';
    return `| ${anchorTag(a.id)}${cell(title + original)} | ${cell(numberAndDate(a))} | ${cell(statusText(a))} | ${cell(md(a.about))} | ${cell(chaptersCell(a))} |`;
  });
  const table = ['| Акт | Номер и дата | Статус | О чём для описи | Где в книге |', '|-----|--------------|--------|-----------------|-------------|', ...rows].join('\n');

  const details = byCountry[code]
    .filter((a) => a.provisions?.length || a.note || a.links?.length)
    .map((a) => {
      const lines = [`- **${md(a.title)}** (${md(a.short)})`];
      for (const p of a.provisions ?? []) lines.push(`  - ${md(p)}`);
      if (a.links?.length) lines.push(`  - Ещё: ${a.links.map((l) => link(md(l.title), l.url)).join(', ')}`);
      if (a.note) lines.push(`  - *${md(a.note)}*`);
      return lines.join('\n');
    });
  const c = countries[code];
  const intro = c.how_checked ? `*${md(c.how_checked)}*\n\n` : '';
  const more = details.length
    ? `\n\n<details>\n<summary>Статьи и примечания</summary>\n\n${details.join('\n')}\n\n</details>`
    : '';
  return IMPORT_LINK + BANNER + intro + table + more + '\n';
}

// В матрице акт стоит в первых двух темах своего списка (темы перечислены по важности),
// утратившие силу акты в неё не входят: так в ячейке остаются главные акты темы.
const inMatrix = (a, t) => a.status !== 'repealed' && a.topics.slice(0, 2).includes(t);

function matrix() {
  const halves = [COUNTRY_ORDER.slice(0, 4), COUNTRY_ORDER.slice(4)];
  return halves
    .map((codes) => {
      const header = `| Тема | ${codes.map((c) => link(COUNTRY_SHORT[c], `#${slugOf(countries[c].name)}`)).join(' | ')} |`;
      const sep = `|------|${codes.map(() => '---').join('|')}|`;
      const rows = Object.entries(TOPICS)
        .filter(([t]) => codes.some((c) => byCountry[c].some((a) => inMatrix(a, t))))
        .map(([t, label]) => {
          const cells = codes.map((c) => {
            const list = byCountry[c].filter((a) => inMatrix(a, t));
            return list.length ? list.map((a) => link(md(a.short), `#${a.id}`)).join(', ') : '—';
          });
          return `| **${label}** | ${cells.map(cell).join(' | ')} |`;
        });
      return [header, sep, ...rows].join('\n');
    })
    .join('\n\n');
}

function responseTimes() {
  const rows = [];
  for (const code of COUNTRY_ORDER) {
    for (const a of byCountry[code].filter((x) => x.response_time)) {
      rows.push(`| **${countries[code].name}** | ${cell(link(md(a.title), `#${a.id}`))} | ${cell(md(a.response_time))} |`);
    }
  }
  return ['| Где | Акт | Срок ответа |', '|-----|-----|-------------|', ...rows].join('\n');
}

function whereToCheck() {
  const rows = COUNTRY_ORDER.map((code) => `| ${link(`**${countries[code].name}**`, `#${slugOf(countries[code].name)}`)} | ${cell(md(countries[code].where))} |`);
  return ['| Страна | Где проверять акт |', '|--------|-------------------|', ...rows].join('\n');
}

function stepsLabel(steps) {
  const s = [...new Set(steps)].sort((a, b) => a - b);
  if (s.length === 7) return 'все';
  const contiguous = s.every((v, i) => i === 0 || v === s[i - 1] + 1);
  if (s.length > 1 && contiguous) return `${s[0]}–${s[s.length - 1]}`;
  return s.join(', ');
}

function stepsText(steps) {
  const label = stepsLabel(steps);
  if (label === 'все') return 'Все шаги';
  return new Set(steps).size > 1 ? `Шаги ${label}` : `Шаг ${label}`;
}

function navigator() {
  const rows = checklists.map((c) => `| ${stepsLabel(c.steps)} | ${link(md(c.title), `#${c.slug}`)} | ${cell(md(c.when))} |`);
  return ['| Шаг | Чек-лист | Когда открыть |', '|:---:|----------|---------------|', ...rows].join('\n');
}

function itemLine(item) {
  const text = md(item.text).replace(/\.$/, '');
  const links = item.resolved.map((r) => (item.label ? link(`«${md(item.label)}»`, r.url) : chapterLink(r))).join(', ');
  return `- [ ] ${text} (${links}).`;
}

function checklistsMdx(list) {
  const out = [];
  for (const c of list) {
    out.push(`## ${c.title}`, '');
    out.push(`*${stepsText(c.steps)}. Когда открыть: ${md(c.when).replace(/^./, (x) => x.toLowerCase())}.*`, '');
    if (c.intro) out.push(md(c.intro), '');
    for (const s of c.sectionsList) {
      if (s.title) out.push(`### ${s.title}`, '');
      out.push(...s.items.map(itemLine), '');
    }
  }
  return BANNER + out.join('\n').trimEnd() + '\n';
}

// --- Файлы для скачивания ---

// Текст без разметки — для CSV и страницы печати.
const plain = (text) => String(text ?? '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/`([^`]*)`/g, '$1').replace(/\s*\n\s*/g, ' ');
const esc = (text) => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// CSV для Excel в русской локали: BOM, разделитель «;», строки через CRLF.
function csv(header, rows) {
  const q = (v) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [header, ...rows].map((r) => r.map(q).join(';')).join('\r\n') + '\r\n';
}

function checklistsCsv() {
  const rows = [];
  for (const c of checklists) {
    for (const s of c.sectionsList) {
      const name = s.title ? `${c.title} — ${s.title}` : c.title;
      for (const item of s.items) {
        const chapters = item.resolved.map((r) => `${fullLabel(r, item.label)} — ${SITE}${r.url}`).join('; ');
        rows.push([name, plain(item.text), chapters, '', '', '']);
      }
    }
  }
  return csv(['чек-лист', 'пункт', 'глава', 'статус', 'кто', 'дата'], rows);
}

function legalCsv() {
  const rows = acts.map((a) => [
    a.id,
    countries[a.country].name,
    a.title,
    a.title_original ?? '',
    a.number,
    a.date ?? '',
    a.edition ?? '',
    a.in_force ?? '',
    STATUS[a.status],
    a.status_checked,
    plain(a.about),
    a.response_time ?? '',
    a.topics.map((t) => TOPICS[t]).join('; '),
    a.resolved.map((r) => `${SITE}${r.url}`).join(' '),
    a.url ?? '',
  ]);
  return csv(
    ['id', 'страна', 'акт', 'название в оригинале', 'номер', 'дата', 'редакция', 'вступил в силу', 'статус', 'статус проверен', 'о чём для описи', 'срок ответа', 'темы', 'где в книге', 'официальный текст'],
    rows,
  );
}

// Страница для печати: по чек-листу на лист A4, колонки для отметок.
function checklistsHtml() {
  const code = (t) => esc(plain(t)).replace(/`([^`]*)`/g, '<code>$1</code>');
  const sheets = checklists.map((c) => {
    const parts = c.sectionsList.map((s) => {
      const rows = s.items
        .map((item) => {
          const chapter = item.resolved.map((r) => esc(fullLabel(r, item.label))).join('; ');
          return `<tr><td class="box">☐</td><td>${code(item.text)}</td><td class="ch">${chapter}</td><td class="who"></td><td class="date"></td></tr>`;
        })
        .join('\n');
      const h = s.title ? `<h3>${esc(s.title)}</h3>\n` : '';
      return `${h}<table><thead><tr><th></th><th>Пункт</th><th>Глава</th><th>Кто</th><th>Дата</th></tr></thead>\n<tbody>\n${rows}\n</tbody></table>`;
    });
    const steps = stepsText(c.steps);
    return `<section class="sheet">\n<h2>${esc(c.title)}</h2>\n<p class="meta">${steps}. Когда открыть: ${esc(plain(c.when)).replace(/^./, (x) => x.toLowerCase())}.</p>\n${parts.join('\n')}\n<p class="src">Инвентаризация данных · ${SITE}/appendices/checklists/#${esc(c.slug)}</p>\n</section>`;
  });
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Чек-листы — Инвентаризация данных</title>
<!-- Сгенерировано scripts/appendices.mjs из data/checklists.yaml. Не править вручную. -->
<style>
@page { size: A4; margin: 14mm 12mm; }
body { font: 10.5pt/1.35 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111; background: #fff; margin: 0 auto; max-width: 190mm; padding: 8mm 4mm; }
h1 { font-size: 16pt; margin: 0 0 4mm; }
h2 { font-size: 14pt; margin: 0 0 2mm; }
h3 { font-size: 11.5pt; margin: 4mm 0 1.5mm; }
.meta { margin: 0 0 3mm; color: #444; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 0.3mm solid #999; padding: 1.2mm 1.5mm; vertical-align: top; text-align: left; }
th { background: #eee; font-weight: 600; }
td.box { width: 5mm; text-align: center; font-size: 12pt; }
td.ch { width: 40mm; color: #444; font-size: 9pt; }
td.who { width: 22mm; } td.date { width: 18mm; }
code { font-size: 9.5pt; }
.src { margin-top: 3mm; font-size: 8.5pt; color: #666; }
.sheet { break-after: page; page-break-after: always; margin-bottom: 10mm; }
.sheet:last-child { break-after: auto; page-break-after: auto; }
tr { break-inside: avoid; }
@media screen { .sheet { border-bottom: 1px dashed #bbb; padding-bottom: 8mm; } }
</style>
</head>
<body>
<h1>Чек-листы книги «Инвентаризация данных»</h1>
<p class="meta">По чек-листу на лист A4. Отметьте пункт, впишите, кто проверил и когда. Пояснение к каждому пункту — в главе, указанной рядом.</p>
${sheets.join('\n')}
</body>
</html>
`;
}

fs.rmSync(OUT_MDX, {recursive: true, force: true});
fs.mkdirSync(OUT_MDX, {recursive: true});
fs.mkdirSync(OUT_FILES, {recursive: true});

const write = (name, content) => fs.writeFileSync(path.join(OUT_MDX, name), content);
write('legal-matrix.mdx', BANNER + matrix() + '\n');
write('legal-response-times.mdx', BANNER + responseTimes() + '\n');
write('legal-where.mdx', BANNER + whereToCheck() + '\n');
for (const code of COUNTRY_ORDER) write(`legal-${code}.mdx`, countryTable(code));
write('checklists-navigator.mdx', BANNER + navigator() + '\n');
// Первый чек-лист («Минимум») стоит на странице до навигатора, остальные — после него.
write('checklists-first.mdx', checklistsMdx(checklists.slice(0, 1)));
write('checklists-rest.mdx', checklistsMdx(checklists.slice(1)));
fs.writeFileSync(path.join(OUT_FILES, 'legal-acts.csv'), legalCsv());
fs.writeFileSync(path.join(OUT_FILES, 'checklists.csv'), checklistsCsv());
fs.writeFileSync(path.join(OUT_FILES, 'checklists.html'), checklistsHtml());

console.log(`Сгенерировано: ${path.relative(ROOT, OUT_MDX)}/, а в ${path.relative(ROOT, OUT_FILES)}/ — legal-acts.csv, checklists.csv и checklists.html.`);
