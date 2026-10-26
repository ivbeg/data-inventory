# Инвентаризация данных — книга на Docusaurus

Книга об инвентаризации данных: как выяснить, какие данные есть у организации или государства, и найти данные для задачи. Сайт — https://datainventory.begtin.tech, репозиторий — ivbeg/data-inventory.

- Принципы проекта: `.cursor/rules/book-principles.mdc`
- Шаблоны и оформление глав: `.cursor/rules/chapter-writing.mdc`
- План работ и статус задач: `PLAN.md`
- Прежняя версия книги «Карты данных» (репозиторий infoculture/datainventorydocs), её план, ревизия и сверка фактов: `archive/`

Тексты лежат в `docs/`. Части и главы упорядочены числовыми префиксами папок и файлов, URL строится без префиксов (`docs/03-process/05-registry.md` → `/process/registry/`). Подпись и описание части — в `_category_.json` её папки.

Иллюстрации — `static/img/<часть>/`; иллюстрация главной — `static/img/home/data-inventory-hero.webp` (1600×686); файлы для скачивания — `static/templates/`.

Приложения «Нормативная база» и «Чек-листы» ведутся данными в `data/`: `legal-acts.yaml` — реестр актов, `checklists.yaml` — чек-листы (формат — `data/README.md`). Скрипт `scripts/appendices.mjs` проверяет их — поля, коды стран и тем, файлы глав и якоря заголовков — и строит таблицы для страниц в `docs/09-appendices/_generated/`, а в `static/downloads/` — `legal-acts.csv`, `checklists.csv` (для Excel) и `checklists.html` (печать, по чек-листу на лист A4). Сгенерированные файлы в git не хранятся; `npm start` и `npm run build` запускают скрипт сами. Акты и пункты чек-листов правят в `data/`, а не на страницах.

```bash
npm install           # первый запуск
npm start             # разработка
npx tsc --noEmit      # проверка типов
npm run build         # сборка, падает на битых ссылках и якорях
npm run appendices:check  # проверить реестр актов и чек-листы в data/
python3 scripts/templates/build.py  # пересобрать workbook.xlsx, документы Word и ZIP из CSV-шаблонов (нужны openpyxl и python-docx)
npm run pdf           # PDF из готовой сборки: build/data-inventory-book.pdf (scripts/pdf/README.md)
```

Публикация — GitHub Pages из ветки `main` (`.github/workflows/deploy-pages.yml`), домен — `static/CNAME`. Как цитировать книгу — `CITATION.cff`, постоянные пути — `stable-paths.md`.
