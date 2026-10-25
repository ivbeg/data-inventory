// Проверяет карты атласа в data/ и строит из них таблицы для страниц, CSV и интеллект-карты для скачивания.
// Схема данных — data/README.md. Запуск: npm run atlas (с --check — только проверка).

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'data');
const OUT_MDX = path.join(ROOT, 'docs/08-atlas/_generated');
const OUT_CSV = path.join(ROOT, 'static/downloads');
const CHECK_ONLY = process.argv.includes('--check');

const SOURCE_TYPES = ['system', 'resource', 'dataset', 'site', 'group'];
const MAP_KINDS = ['questions', 'authority', 'product', 'availability'];
const AVAILABILITY = {
  available: 'Данные доступны',
  restricted: 'Данные доступны с ограничениями',
  unavailable: 'Данные не доступны',
};
const TYPE_LABELS = {
  system: 'система',
  resource: 'ресурс',
  dataset: 'набор данных',
  site: 'сайт',
  group: 'группа',
};

const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

function load(file) {
  return yaml.load(fs.readFileSync(file, 'utf8'));
}

// --- Загрузка и проверка ---

const sourcesList = load(path.join(DATA, 'sources.yaml'));
const sources = new Map();
for (const [i, s] of sourcesList.entries()) {
  const where = `sources.yaml #${i + 1}`;
  if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) fail(where, `плохой id «${s.id}»`);
  if (sources.has(s.id)) fail(where, `id «${s.id}» повторяется`);
  if (!s.name) fail(where, 'нет name');
  if (!SOURCE_TYPES.includes(s.type)) fail(where, `неизвестный type «${s.type}»`);
  if (s.type === 'group' && s.url) fail(where, 'у группы не бывает url');
  sources.set(s.id, s);
}

// Результат проверки адресов (scripts/check-sources.mjs), если она проводилась.
const CHECKS_FILE = path.join(DATA, 'source-checks.yaml');
const sourceChecks = fs.existsSync(CHECKS_FILE) ? load(CHECKS_FILE) : null;
const checkById = new Map((sourceChecks?.checks ?? []).map((c) => [c.id, c]));
for (const id of checkById.keys()) {
  if (!sources.has(id)) fail('source-checks.yaml', `источник «${id}» не описан в sources.yaml — перезапустите проверку`);
}

const mapFiles = fs
  .readdirSync(path.join(DATA, 'maps'))
  .filter((f) => f.endsWith('.yaml'))
  .sort();
const maps = [];
const usedSources = new Set();

for (const file of mapFiles) {
  const m = load(path.join(DATA, 'maps', file));
  const where = `maps/${file}`;
  if (m.id !== path.basename(file, '.yaml')) fail(where, `id «${m.id}» не совпадает с именем файла`);
  for (const field of ['title', 'checked', 'author']) if (!m[field]) fail(where, `нет ${field}`);
  if (!/^\d{4}-\d{2}$/.test(String(m.checked))) fail(where, `checked должен быть вида 2019-12, а не «${m.checked}»`);
  for (const k of m.kind ?? []) if (!MAP_KINDS.includes(k)) fail(where, `неизвестный kind «${k}»`);
  if (!Array.isArray(m.questions) || m.questions.length === 0) fail(where, 'нет вопросов');
  for (const [i, q] of (m.questions ?? []).entries()) {
    const qw = `${where} вопрос ${q.n}`;
    if (q.n !== i + 1) fail(qw, `номер должен быть ${i + 1}`);
    if (!q.text) fail(qw, 'нет текста');
    if (!Array.isArray(q.sources) || q.sources.length === 0) fail(qw, 'нет источников');
    const seen = new Set();
    for (const link of q.sources ?? []) {
      if (!sources.has(link.source)) fail(qw, `источник «${link.source}» не описан в sources.yaml`);
      if (seen.has(link.source)) fail(qw, `источник «${link.source}» указан дважды`);
      if (link.availability !== undefined && !(link.availability in AVAILABILITY))
        fail(qw, `неизвестная доступность «${link.availability}»`);
      seen.add(link.source);
      usedSources.add(link.source);
    }
  }
  maps.push(m);
}
maps.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

for (const id of sources.keys()) {
  if (!usedSources.has(id)) fail('sources.yaml', `источник «${id}» не используется ни на одной карте`);
}

if (errors.length) {
  console.error(`Ошибки в данных атласа (${errors.length}):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

const pairs = maps.reduce((n, m) => n + m.questions.reduce((k, q) => k + q.sources.length, 0), 0);
console.log(`Атлас: карт — ${maps.length}, источников — ${sources.size}, пар «вопрос — источник» — ${pairs}.`);
if (CHECK_ONLY) process.exit(0);

// --- Генерация ---

// Ячейка таблицы Markdown: без переводов строк и вертикальных черт.
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function sourceLink(s) {
  return s.url ? `[${s.name}](${s.url})` : s.name;
}

// Цветной кружок доступности; подпись — для всплывающей подсказки и экранных дикторов.
function marker(availability) {
  const label = availability ? AVAILABILITY[availability] : 'Доступность не указана';
  const sign = availability ? '●' : '○';
  return `<span className="avail avail--${availability ?? 'unknown'}" role="img" aria-label="${label}" title="${label}">${sign}</span>`;
}

const KIND_LABELS = {
  questions: 'от вопросов',
  authority: 'по полномочиям',
  product: 'от продукта',
  availability: 'с разметкой доступности',
};
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const REPO_DATA = 'https://github.com/ivbeg/data-inventory/blob/main/data/maps';

function monthYear(checked) {
  const [y, mo] = String(checked).split('-').map(Number);
  return `${MONTHS[mo - 1]} ${y} года`;
}

const CHECK_LABELS = {
  ok: 'открывается',
  moved: 'перенаправляет',
  'http-error': 'ошибка',
  unreachable: 'не ответил',
  tls: 'ошибка сертификата',
  'no-address': 'у домена нет адреса',
  'dns-error': 'ошибка DNS',
  nxdomain: 'домена нет',
};

// Что стало с адресом источника при последней проверке.
function checkLabel(s) {
  if (!s.url) return '—';
  const c = checkById.get(s.id);
  let label = '—';
  if (c) {
    label = CHECK_LABELS[c.result] ?? c.result;
    if (c.result === 'moved') label += ` на ${new URL(c.moved_to).hostname}`;
    if (c.result === 'http-error') label += ` ${c.http}`;
  }
  return s.url_note ? `${label}; ${s.url_note}` : label;
}

function passport(m) {
  const unique = new Set(m.questions.flatMap((q) => q.sources.map((l) => l.source))).size;
  const rows = [
    ['Тема', m.title],
    ['Вид карты', (m.kind ?? []).map((k) => KIND_LABELS[k]).join(', ')],
    ['Проверена', monthYear(m.checked)],
    ['Вопросов', m.questions.length],
    ['Источников', unique],
    ['Откуда сведения', m.info_sources ?? '—'],
    ['Автор', m.author],
    ['Лицензия', m.license ? `${m.license} — по значку на карте для печати` : '—'],
    ['Данные', `[data/maps/${m.id}.yaml](${REPO_DATA}/${m.id}.yaml)`],
  ];
  return ['| | |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${cell(v)} |`)].join('\n');
}

function notes(m) {
  const items = (m.notes ?? []).map((n) => `- ${n}`);
  return [
    `- **${monthYear(m.checked)}** — карта составлена.`,
    `- **октябрь 2026 года** — карта перенесена в данные. Доступность — по легенде исходной карты, заново не проверялась.`,
    ...items.map((n) => `  ${n}`),
  ].join('\n');
}

function questionsTable(m) {
  const rows = m.questions.map((q) => {
    const list = q.sources
      .map((link) => `${marker(link.availability)} ${sourceLink(sources.get(link.source))}`)
      .join('<br />');
    return `| ${q.n} | ${cell(q.text)} | ${list} |`;
  });
  return ['| № | Вопрос | Источники |', '|--:|--------|-----------|', ...rows].join('\n');
}

function sourcesTable(m) {
  const byId = new Map();
  for (const q of m.questions) {
    for (const link of q.sources) {
      if (!byId.has(link.source)) byId.set(link.source, []);
      byId.get(link.source).push(q.n);
    }
  }
  const rows = [...byId.entries()]
    .map(([id, ns]) => ({s: sources.get(id), ns}))
    .sort((a, b) => b.ns.length - a.ns.length || a.s.name.localeCompare(b.s.name, 'ru'))
    .map(({s, ns}) => `| ${sourceLink(s)} | ${TYPE_LABELS[s.type]} | ${cell(s.owner ?? '—')} | ${ns.join(', ')} | ${cell(checkLabel(s))} |`);
  const checked = sourceChecks ? `Адрес (${monthYear(sourceChecks.checked).replace(/ года$/, '')})` : 'Адрес';
  return [`| Источник | Тип | Владелец | Вопросы | ${checked} |`, '|----------|-----|----------|---------|------|', ...rows].join('\n');
}

function counts(m) {
  const c = {available: 0, restricted: 0, unavailable: 0, unknown: 0};
  for (const q of m.questions) for (const link of q.sources) c[link.availability ?? 'unknown'] += 1;
  return c;
}

function summary() {
  const mapRows = maps.map((m) => {
    const c = counts(m);
    const unique = new Set(m.questions.flatMap((q) => q.sources.map((l) => l.source))).size;
    return `| [${m.title}](/atlas/${m.id}/) | ${monthYear(m.checked)} | ${m.questions.length} | ${unique} | ${c.available} | ${c.restricted} | ${c.unavailable} | ${c.unknown} |`;
  });
  const mapTable = [
    '| Карта | Проверена | Вопросов | Источников | Доступны | С ограничениями | Не доступны | Не указано |',
    '|-------|-----------|---------:|-----------:|---------:|----------------:|------------:|-----------:|',
    ...mapRows,
  ].join('\n');

  const onMaps = new Map();
  for (const m of maps) {
    for (const q of m.questions) {
      for (const link of q.sources) {
        if (!onMaps.has(link.source)) onMaps.set(link.source, new Set());
        onMaps.get(link.source).add(m.title);
      }
    }
  }
  const repeatedRows = [...onMaps.entries()]
    .filter(([, titles]) => titles.size >= 3)
    .map(([id, titles]) => ({s: sources.get(id), titles: [...titles]}))
    .sort((a, b) => b.titles.length - a.titles.length || a.s.name.localeCompare(b.s.name, 'ru'))
    .map(({s, titles}) => `| ${sourceLink(s)} | ${cell(s.owner ?? '—')} | ${titles.length} | ${titles.join(', ')} |`);
  const repeatedTable = [
    '| Источник | Владелец | Карт | На каких картах |',
    '|----------|----------|-----:|-----------------|',
    ...repeatedRows,
  ].join('\n');

  let checksTable = '';
  if (sourceChecks) {
    const tally = new Map();
    for (const s of sources.values()) {
      if (!s.url) continue;
      const c = checkById.get(s.id);
      const key = c ? c.result : 'unchecked';
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    const order = ['ok', 'moved', 'http-error', 'tls', 'unreachable', 'no-address', 'dns-error', 'nxdomain', 'unchecked'];
    const rows = order
      .filter((k) => tally.has(k))
      .map((k) => `| ${k === 'unchecked' ? 'не проверялся' : CHECK_LABELS[k]} | ${tally.get(k)} |`);
    checksTable = ['| Результат | Источников |', '|-----------|-----------:|', ...rows].join('\n');
  }
  return {mapTable, repeatedTable, checksTable};
}

function csv(m) {
  const header = ['map', 'question_n', 'question', 'source_id', 'source_name', 'source_type', 'url', 'owner', 'availability_2019', 'url_check'];
  const quote = (v) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const q of m.questions) {
    for (const link of q.sources) {
      const s = sources.get(link.source);
      lines.push(
        [m.id, q.n, q.text, s.id, s.name, s.type, s.url, s.owner, link.availability, checkById.get(s.id)?.result].map(quote).join(','),
      );
    }
  }
  return lines.join('\n') + '\n';
}

// --- Интеллект-карты: тема → вопрос → источник с доступностью ---

const AVAILABILITY_SHORT = {
  available: 'доступны',
  restricted: 'с ограничениями',
  unavailable: 'не доступны',
};
// Цвета — те же, что у кружков доступности на страницах атласа (src/css/custom.css).
const AVAILABILITY_COLORS = {
  available: '#2e7d32',
  restricted: '#b38600',
  unavailable: '#c62828',
};

const mindmapRoot = (m) => `${m.title} · ${monthYear(m.checked).replace(/ года$/, '')}`;
const mindmapSource = (s, link) => `${s.name} (${AVAILABILITY_SHORT[link.availability] ?? 'доступность не указана'})`;

// Markdown из одних заголовков: так его понимают и markmap, и импорт Xmind.
function outline(m) {
  const lines = [`# ${mindmapRoot(m)}`];
  for (const q of m.questions) {
    lines.push('', `## ${q.n}. ${q.text}`, '');
    for (const link of q.sources) lines.push(`### ${mindmapSource(sources.get(link.source), link)}`);
  }
  return lines.join('\n') + '\n';
}

// Файл FreeMind (.mm): родной формат Freeplane, его импортирует и Xmind.
function freemind(m) {
  const attr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = [
    '<map version="1.0.1">',
    `<!-- Сгенерировано scripts/atlas.mjs из data/maps/${m.id}.yaml. Не править вручную. -->`,
    `<node TEXT="${attr(mindmapRoot(m))}">`,
  ];
  for (const [i, q] of m.questions.entries()) {
    // Вопросы — поровну справа и слева от темы, как на исходных картах.
    const side = i < Math.ceil(m.questions.length / 2) ? 'right' : 'left';
    lines.push(`<node TEXT="${attr(`${q.n}. ${q.text}`)}" POSITION="${side}">`);
    for (const link of q.sources) {
      const s = sources.get(link.source);
      const url = s.url ? ` LINK="${attr(s.url)}"` : '';
      const color = AVAILABILITY_COLORS[link.availability] ?? '#757575';
      lines.push(`<node TEXT="${attr(mindmapSource(s, link))}"${url} COLOR="${color}"/>`);
    }
    lines.push('</node>');
  }
  lines.push('</node>', '</map>');
  return lines.join('\n') + '\n';
}

const BANNER = '{/* Сгенерировано scripts/atlas.mjs из data/. Не править вручную. */}\n\n';

fs.rmSync(OUT_MDX, {recursive: true, force: true});
fs.mkdirSync(OUT_MDX, {recursive: true});
fs.mkdirSync(OUT_CSV, {recursive: true});

for (const m of maps) {
  fs.writeFileSync(path.join(OUT_MDX, `${m.id}-questions.mdx`), BANNER + questionsTable(m) + '\n');
  fs.writeFileSync(path.join(OUT_MDX, `${m.id}-sources.mdx`), BANNER + sourcesTable(m) + '\n');
  fs.writeFileSync(path.join(OUT_MDX, `${m.id}-passport.mdx`), BANNER + passport(m) + '\n');
  fs.writeFileSync(path.join(OUT_MDX, `${m.id}-notes.mdx`), BANNER + notes(m) + '\n');
  fs.writeFileSync(path.join(OUT_CSV, `${m.id}.csv`), csv(m));
  fs.writeFileSync(path.join(OUT_CSV, `${m.id}.md`), outline(m));
  fs.writeFileSync(path.join(OUT_CSV, `${m.id}.mm`), freemind(m));
}
const {mapTable, repeatedTable, checksTable} = summary();
fs.writeFileSync(path.join(OUT_MDX, 'summary-maps.mdx'), BANNER + mapTable + '\n');
fs.writeFileSync(path.join(OUT_MDX, 'summary-repeated.mdx'), BANNER + repeatedTable + '\n');
fs.writeFileSync(path.join(OUT_MDX, 'summary-checks.mdx'), BANNER + (checksTable || 'Адреса источников не проверялись.') + '\n');

console.log(`Сгенерировано: ${path.relative(ROOT, OUT_MDX)}/, CSV и интеллект-карты в ${path.relative(ROOT, OUT_CSV)}/.`);
