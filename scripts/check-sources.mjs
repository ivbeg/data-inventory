// Проверяет адреса источников атласа: есть ли домен (DNS) и что отвечает сайт (HTTP).
// Результат пишет в data/source-checks.yaml, его показывают таблицы атласа.
// С флагом --docs проверяет внешние ссылки из глав docs/ и печатает таблицу, ничего не записывая.
//
// Важно: результат зависит от сети. Многие российские государственные сайты
// не открываются из-за рубежа — тогда домен есть, а сайт «не отвечает».

import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DOCS_MODE = process.argv.includes('--docs');
const NETWORK = process.env.CHECK_NETWORK ?? 'не указана';
const TIMEOUT_MS = 15000;
const CONCURRENCY = 8;

async function checkDns(host) {
  try {
    const records = await Promise.any([dns.resolve4(host), dns.resolve6(host), dns.resolveCname(host)]);
    return records.length ? 'ok' : 'empty';
  } catch (e) {
    const codes = (e.errors ?? [e]).map((x) => x.code);
    return codes.includes('ENOTFOUND') ? 'nxdomain' : codes[0] ?? 'error';
  }
}

async function fetchOnce(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'manual',
      signal: ctrl.signal,
      headers: {'user-agent': 'Mozilla/5.0 (datainventorydocs link check)'},
    });
  } finally {
    clearTimeout(timer);
  }
}

// Проходит по перенаправлениям сам, чтобы запомнить конечный адрес.
async function checkHttp(url) {
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    let res;
    try {
      res = await fetchOnce(current);
    } catch (e) {
      const cause = e.cause?.code ?? (e.name === 'AbortError' ? 'TIMEOUT' : e.name);
      return {status: null, error: cause, final: current};
    }
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return {status: res.status, final: current};
  }
  return {status: null, error: 'TOO_MANY_REDIRECTS', final: current};
}

const TLS_ERRORS = ['CERT_HAS_EXPIRED', 'SELF_SIGNED_CERT_IN_CHAIN', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT'];

function classify(dnsResult, http, url) {
  if (dnsResult === 'nxdomain') return 'nxdomain';
  if (dnsResult === 'ESERVFAIL') return 'dns-error';
  if (http.status === null && TLS_ERRORS.includes(http.error)) return 'tls';
  if (http.status === null && dnsResult === 'ENODATA') return 'no-address';
  if (http.status === null) return 'unreachable';
  if (http.status >= 400) return 'http-error';
  const from = new URL(url).hostname.replace(/^www\./, '');
  const to = new URL(http.final).hostname.replace(/^www\./, '');
  return from === to ? 'ok' : 'moved';
}

// Тот же адрес на другом хосте; через URL, чтобы не сломать кириллические домены (в hostname они в punycode).
function withHost(url, host) {
  const u = new URL(url);
  u.hostname = host;
  return u.toString();
}

async function check(url) {
  let host = new URL(url).hostname;
  let [dnsResult, http] = await Promise.all([checkDns(host), checkHttp(url)]);
  // У домена нет адреса, но он существует: сайт может жить на www.
  if (dnsResult === 'ENODATA' && !host.startsWith('www.')) {
    const wwwUrl = withHost(url, `www.${host}`);
    const [wwwDns, wwwHttp] = await Promise.all([checkDns(`www.${host}`), checkHttp(wwwUrl)]);
    if (wwwDns === 'ok') [host, dnsResult, http, url] = [`www.${host}`, wwwDns, wwwHttp, wwwUrl];
  }
  // Поддомена www нет, но сам домен может жить: такой адрес не считаем исчезнувшим.
  if (dnsResult === 'nxdomain' && host.startsWith('www.')) {
    const bare = host.slice(4);
    const bareUrl = withHost(url, bare);
    const [bareDns, bareHttp] = await Promise.all([checkDns(bare), checkHttp(bareUrl)]);
    if (bareDns === 'ok') [host, dnsResult, http, url] = [bare, bareDns, bareHttp, bareUrl];
  }
  // Если https не ответил, а домен есть, пробуем http: многие сайты карт 2018–2019 годов были без https.
  let result = http;
  if (http.status === null && dnsResult !== 'nxdomain' && url.startsWith('https://')) {
    const plain = await checkHttp(url.replace(/^https:/, 'http:'));
    if (plain.status !== null) result = plain;
  }
  return {host, dns: dnsResult, http: result.status, error: result.error, final: result.final, result: classify(dnsResult, result, url)};
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({length: CONCURRENCY}, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

function docsUrls() {
  const urls = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_')) walk(p);
      } else if (/\.mdx?$/.test(entry.name)) {
        for (const m of fs.readFileSync(p, 'utf8').matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) urls.add(m[1]);
      }
    }
  };
  walk(path.join(ROOT, 'docs'));
  return [...urls].sort();
}

if (DOCS_MODE) {
  const urls = docsUrls();
  const results = await pool(urls, check);
  for (const [i, r] of results.entries()) {
    const extra = r.result === 'moved' ? ` -> ${r.final}` : r.error ? ` (${r.error})` : '';
    console.log(`${r.result.padEnd(11)} ${String(r.http ?? '—').padEnd(4)} ${urls[i]}${extra}`);
  }
} else {
  const all = yaml.load(fs.readFileSync(path.join(ROOT, 'data/sources.yaml'), 'utf8')).filter((s) => s.url);
  // --only=id1,id2 перепроверяет только эти источники, остальные результаты и дата проверки остаются прежними.
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const prev = only ? yaml.load(fs.readFileSync(path.join(ROOT, 'data/source-checks.yaml'), 'utf8')) : null;
  const sources = only ? all.filter((s) => only.includes(s.id)) : all;
  const results = await pool(sources.map((s) => s.url), check);
  const fresh = Object.fromEntries(
    sources.map((s, i) => {
      const r = results[i];
      const entry = {id: s.id, result: r.result, dns: r.dns, http: r.http ?? null};
      if (r.result === 'moved') entry.moved_to = r.final;
      if (r.error) entry.error = r.error;
      return [s.id, entry];
    }),
  );
  const date = prev?.checked ?? new Date().toISOString().slice(0, 7);
  const network = prev && !process.env.CHECK_NETWORK ? prev.network : NETWORK;
  const checks = all.map((s) => fresh[s.id] ?? prev.checks.find((c) => c.id === s.id)).filter(Boolean);
  const header =
    `# Сгенерировано scripts/check-sources.mjs — не править вручную.\n` +
    `# Результат зависит от сети: многие российские государственные сайты не открываются из-за рубежа.\n`;
  const body = yaml.dump({checked: date, network, checks}, {lineWidth: 120, flowLevel: 2});
  fs.writeFileSync(path.join(ROOT, 'data/source-checks.yaml'), header + body);
  const tally = checks.reduce((t, c) => ({...t, [c.result]: (t[c.result] ?? 0) + 1}), {});
  console.log(`Проверено ${checks.length} адресов:`, tally);
}
