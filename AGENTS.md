# Инвентаризация данных — книга на Docusaurus

Книга об инвентаризации данных: как выяснить, какие данные есть у организации или государства, и найти данные для задачи. Сайт — https://datainventory.begtin.tech, репозиторий — ivbeg/data-inventory.

- Принципы проекта: `.cursor/rules/book-principles.mdc`
- Шаблоны и оформление глав: `.cursor/rules/chapter-writing.mdc`
- План работ и статус задач: `PLAN.md`
- Прежняя версия книги «Карты данных» (репозиторий infoculture/datainventorydocs), её план, ревизия и сверка фактов: `archive/`

Тексты лежат в `docs/`. Части и главы упорядочены числовыми префиксами папок и файлов, URL строится без префиксов (`docs/03-process/05-registry.md` → `/process/registry/`). Подпись и описание части — в `_category_.json` её папки.

Иллюстрации — `static/img/<часть>/`; иллюстрация главной — `static/img/home/data-inventory-hero.webp` (1600×686); файлы для скачивания — `static/downloads/` и `static/templates/`.

Карты атласа хранятся как данные в `data/` (схема — `data/README.md`). Скрипт `scripts/atlas.mjs` проверяет их и строит в `docs/08-atlas/_generated/` паспорт, таблицы и список изменений для страниц атласа, а в `static/downloads/` — CSV. Сгенерированные файлы в git не хранятся; `npm start` и `npm run build` запускают скрипт сами. Таблицы атласа правят в `data/`, а не на страницах.

```bash
npm install           # первый запуск
npm start             # разработка
npx tsc --noEmit      # проверка типов
npm run build         # сборка, падает на битых ссылках и якорях
npm run atlas:check   # проверить данные атласа
npm run check-sources # проверить адреса источников атласа
npm run pdf           # PDF из готовой сборки: build/data-inventory-book.pdf (scripts/pdf/README.md)
```

Публикация — GitHub Pages из ветки `main` (`.github/workflows/deploy-pages.yml`), домен — `static/CNAME`. Как цитировать книгу — `CITATION.cff`, постоянные пути — `stable-paths.md`.
