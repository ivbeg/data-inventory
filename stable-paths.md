# Стабильные пути сайта

Список для тех, кто ссылается на книгу. Это не глава для читателя. Постоянный домен — `https://datainventory.begtin.tech`, полный адрес страницы — домен плюс путь, со слэшем в конце. Путь не меняют без перенаправления со старого.

## С чего начать

| О чём речь | Путь |
|------------|------|
| О книге | `/` |
| Что такое инвентаризация данных | `/basics/what-is-data-inventory/` |
| Два подхода | `/approaches/two-approaches/` |
| Семь шагов | `/process/steps/` |
| Реестр данных: 14 атрибутов | `/process/registry/` |
| Три слоя данных | `/sources/three-layers/` |
| Стандарты описания | `/frameworks/metadata-standards/` |
| Казахстан | `/countries/kazakhstan/` |
| Россия | `/countries/russia/` |
| Двенадцать стран в сравнении | `/countries/` |
| Пробелы и план | `/process/gaps-and-plan/` |
| Практики и антипаттерны | `/practices/practices-and-anti-patterns/` |

Файлы для скачивания, не страницы: `/data-inventory-book.pdf`, `/templates/registry.csv`, `/templates/questionnaire.csv`, `/templates/sources.csv`, `/templates/questions.csv`, `/templates/links.csv`, `/templates/map.yaml`, `/templates/workbook.xlsx`, `/templates/data-inventory-templates.zip`, `/downloads/legal-acts.csv`, `/downloads/checklists.csv`.

## Перенаправления

26 октября 2026 года «Хорошие практики» и «Антипаттерны» слиты в одну главу. Старые пути перенаправляются на новый (`@docusaurus/plugin-client-redirects`, `docusaurus.config.ts`):

| Старый путь | Новый путь |
|-------------|------------|
| `/practices/good-practices/` | `/practices/practices-and-anti-patterns/` |
| `/practices/anti-patterns/` | `/practices/practices-and-anti-patterns/` |

Якоря старой главы «Хорошие практики» (`#1-начинать-с-цели-и-вопросов` и др.) в новой главе не сохранились: каждая практика стоит в сводной таблице рядом со своим антипаттерном. Якоря антипаттернов (`#опись-ради-описи` и др.) прежние.

## Прежние сайты

У книги были два прежних сайта; перенаправить с них из этого репозитория нельзя, их владельцы — организация infoculture и GitBook.

| Прежний сайт | Что там | Новый путь |
|--------------|---------|------------|
| `https://infoculture.gitbook.io/datamaps` | «Методика составления карт данных (черновик)», текст 2020 года | `/approaches/data-maps/` |
| `https://infoculture.github.io/datainventorydocs/` | «Карты данных», редакция октября 2026 года, репозиторий infoculture/datainventorydocs | `/` |

Соответствие старых страниц GitBook: `/whatis` → `/approaches/data-maps/`; `/guide` → `/process/steps/`; `/sources` → `/sources/three-layers/`; у отраслевых карт `/datamaps`, `/datamaps/finances`, `/datamaps/oil`, `/datamaps/health`, `/datamaps/education` соответствия нет: отраслевые карты из книги убраны 25 октября 2026 года, ближайшая глава — `/approaches/data-maps/`.
