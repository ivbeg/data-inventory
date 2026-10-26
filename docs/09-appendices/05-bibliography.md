---
description: Книги, стандарты, методики и материалы об инвентаризации данных — с чего начать, аннотация и язык у каждой позиции; управление данными, стандарты описания, рамки качества, методики стран, оценки открытости, веб-архивы.
---

# Литература

Начните с пяти источников из первого раздела: они дают метод целиком. Остальное сгруппировано по темам. У каждой позиции — строка о том, что в ней взять, и язык: рус., англ., фр., пол., кор. Ссылки проверены 23–26 октября 2026 года.

## С чего начать

- **Каталоги данных: как устроены порталы открытых данных, геопорталы и репозитории — и как выбрать свой.** Бегтин И., 2026, рус. — [datacatalogs.begtin.tech](https://datacatalogs.begtin.tech/). Соседняя книга: каталог описывает опубликованное, инвентаризация — всё, что есть.
- **DAMA-DMBOK. Свод знаний по управлению данными.** DAMA International; пер. Г. И. Агафонова. — М.: Олимп-Бизнес. — ISBN 978-5-9693-0404-8, рус. Перевод 2-го издания свода: где инвентаризация в управлении данными, что такое метаданные, качество и роли.
- **GovEx Data Inventory.** Johns Hopkins Center for Government Excellence, англ. — [labs.centerforgov.org](https://labs.centerforgov.org/data-governance/data-inventory/). Руководство для городов: ответственные в подразделениях описывают данные, координатор сводит их в общий инвентарь.
- **Identifying Information Assets and Business Requirements.** The National Archives, 2011, редакция 2017, англ. — [nationalarchives.gov.uk](https://cdn.nationalarchives.gov.uk/documents/information-management/identify-information-assets.pdf). Как найти и описать информационные активы организации; поля реестра и шаблон в Excel.
- **Mapping data ecosystems.** Open Data Institute, англ. — [theodi.org](https://theodi.org/article/mapping-data-ecosystems/). Как нарисовать карту участников и обменов данными — опора для подхода «где найти нужное».

## Управление данными

- **The DAMA Guide to the Data Management Body of Knowledge (DAMA-DMBOK2R).** DAMA International, 2-е издание, исправленное, 2024; 2-е издание — 2017, англ. — [dama.org](https://dama.org/learning-resources/dama-data-management-body-of-knowledge-dmbok/). Оригинал свода; колесо и контекстные диаграммы областей — под лицензией CC BY-ND 4.0 на [dama.org](https://dama.org/cpages/dmbok2r-wheels).
- **Data Management Capability Assessment Model (DCAM).** EDM Council, версия 3, 2025, англ. — [edmcouncil.org](https://edmcouncil.org/announcement/announcing-dcam-v3-meet-the-new-standard-for-your-data/). Другая модель оценки зрелости управления данными, кроме уровней DMBOK.
- **How to Move Beyond a Monolithic Data Lake to a Distributed Data Mesh.** Dehghani Z., 2019, англ. — [martinfowler.com](https://martinfowler.com/articles/data-monolith-to-mesh.html). Первая статья о Data Mesh: почему центральное хранилище не справляется.
- **Data Mesh Principles and Logical Architecture.** Dehghani Z., 2020, англ. — [martinfowler.com](https://martinfowler.com/articles/data-mesh-principles.html). Четыре принципа подхода.
- **Data Mesh: Delivering Data-Driven Value at Scale.** Dehghani Z. — O'Reilly, 2022, англ. Книга о подходе целиком.
- **Open Data Contract Standard (ODCS), версия 3.2.0, и Open Data Product Standard (ODPS), версия 1.1.0.** Bitol, LF AI & Data, 2026, англ. — [bitol.io](https://bitol.io/), [github.com/bitol-io](https://github.com/bitol-io). Открытые стандарты контракта и продукта данных в YAML.

## Стандарты описания

- **Data Catalog Vocabulary (DCAT) — Version 3.** W3C, 2024, англ. — [w3.org/TR/vocab-dcat-3](https://www.w3.org/TR/vocab-dcat-3/). Словарь для описания каталогов, наборов и распространений.
- **DCAT Application Profile for data portals in Europe (DCAT-AP) 3.0.1.** SEMIC, 2025, англ. — [interoperable-europe.ec.europa.eu](https://interoperable-europe.ec.europa.eu/collection/semic-support-centre/solution/dcat-application-profile-data-portals-europe). Европейский профиль DCAT: обязательные свойства и словари значений. Дополнение для наборов высокой ценности — **DCAT-AP for High Value Datasets 3.0.0**, 2024 — [semiceu.github.io](https://semiceu.github.io/DCAT-AP/releases/3.0.0-hvd/).
- **DCAT-US Schema v3.0**, 2026, и **DCAT-US v1.1**, 2014, англ. — [resources.data.gov](https://resources.data.gov/resources/dcat-us3/). Схема инвентарей федеральных ведомств США; версия 1.1 — бывшая схема Project Open Data.
- **CSV on the Web.** W3C, 2015, англ. — [w3.org/TR/tabular-metadata](https://www.w3.org/TR/tabular-metadata/). Описание таблиц CSV и связь колонок со словарями.
- **Data Package v2 и Table Schema.** Frictionless Data, 2024, англ. — [datapackage.org](https://datapackage.org/). Схема таблицы и пакет связанных таблиц; по ним проверяют шаблон реестра книги.
- **JSON Schema 2020-12**, англ. — [json-schema.org](https://json-schema.org/draft/2020-12). Правила проверки файлов JSON и YAML.
- **Croissant 1.1.** MLCommons, 2026, англ. — [docs.mlcommons.org](https://docs.mlcommons.org/croissant/docs/croissant-spec-1.1.html). Описание наборов для машинного обучения.
- **DataCite Metadata Schema 4.7.** DataCite, 2026, англ. — [schema.datacite.org](https://schema.datacite.org/). Описание научных наборов с DOI.

## Качество данных

Рамки дают список того, что можно проверить; что проверять, решает цель ([«Качество данных»](../03-process/07-quality.md#рамки-и-стандарты-качества)).

- **The Six Primary Dimensions for Data Quality Assessment.** DAMA UK Working Group, 2013, англ. Шесть признаков — полнота, уникальность, актуальность, валидность, точность, согласованность: короткий список для быстрой проверки.
- **The Government Data Quality Framework.** Government Data Quality Hub, Великобритания, 2020, англ. — [gov.uk](https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework). Те же шесть признаков; качество — пригодность для цели; пять принципов, проверка на всём жизненном цикле, планы действий и поиск первопричины.
- **How to Select the Right Dimensions of Data Quality.** Black A., van Nederpelt P. — DAMA NL, версия 1.1, 2020, англ. — [dama-nl.org](http://www.dama-nl.org/wp-content/uploads/2020/11/How-to-Select-the-Right-Dimensions-of-Data-Quality-v1.1-d.d.-14-Nov-2020.pdf). 60 измерений качества с определениями и четыре шага выбора под требования: какие измерения важны для категории данных, помогает ли измерение цели, какие важнее, чем и как их измерять.
- **A Framework for Data Quality.** Federal Committee on Statistical Methodology, FCSM-20-04, 2020, англ. — [rosap.ntl.bts.gov](https://rosap.ntl.bts.gov/view/dot/72798). Рамка статистики США: 11 измерений в трёх областях — полезность, объективность, целостность; среди них гранулярность, то есть подробность данных.
- **ISO/IEC 25012:2008 Data quality model**, англ. 15 характеристик качества с двух точек зрения — самих данных и системы, которая их хранит и выдаёт.
- **ISO/IEC 5259-2:2024**, англ. — [iso.org](https://www.iso.org/standard/81860.html); в России — **ГОСТ Р 71484.2-2024**, действует с 1 января 2025 года, рус. Показатели качества данных для аналитики и машинного обучения: модель ISO/IEC 25012 дополнена, например, сбалансированностью и представительностью.
- **ГОСТ Р ИСО 8000-2-2019 «Качество данных. Часть 2. Словарь»**, действует с 1 мая 2020 года, рус. Термины качества данных на русском языке.
- **Критерии качества европейской статистики**, регламент (ЕС) № 223/2009, статья 12, англ. — [текст статьи](https://www.legislation.gov.uk/eur/2009/223/article/12/adopted). Релевантность, точность, своевременность, пунктуальность, доступность и понятность, сопоставимость, согласованность — для статистических рядов. Реквизиты регламента — в приложении [«Нормативная база»](./02-legal-framework.md#eu-223-2009).
- **Data Quality Vocabulary.** W3C, 2016, англ. — [w3.org/TR/vocab-dqv](https://www.w3.org/TR/vocab-dqv/). Словарь для записи проверок качества в описании набора: измерение, метрика, результат, примечание.
- **Gene name errors are widespread in the scientific literature.** Ziemann M., Eren Y., El-Osta A. — Genome Biology, 2016, англ. — [doi.org/10.1186/s13059-016-1044-7](https://doi.org/10.1186/s13059-016-1044-7); **Gene name errors: Lessons not learned.** Abeysooriya M. et al. — PLoS Computational Biology, 2021, англ. — [doi.org/10.1371/journal.pcbi.1008984](https://doi.org/10.1371/journal.pcbi.1008984). Как электронная таблица портит значения и почему реестр проверяют программой.

## Методики инвентаризации

Документы государств, которые описывают, как вести инвентарь данных. Их правовой статус и сроки — в приложении [«Нормативная база»](./02-legal-framework.md), разбор моделей стран — в главе [«Зарубежные методики»](../05-frameworks/04-international-practice.md).

**США**

- **M-13-13: Open Data Policy — Managing Information as an Asset.** Office of Management and Budget, 2013, англ. — [текст](https://www.whitehouse.gov/wp-content/uploads/legacy_drupal_files/omb/memoranda/2013/m-13-13.pdf). Меморандум, который ввёл корпоративные инвентари данных ведомств и общедоступную часть в файле `data.json`; статус — в [«Нормативной базе»](./02-legal-framework.md#us-m-13-13). Руководство к нему — **Project Open Data Implementation Guide**, [копия в Internet Archive](https://web.archive.org/web/20240519174130/https://project-open-data.cio.gov/implementation-guide/), 2024.
- **The OPEN Government Data Act: A Primer.** Congressional Research Service, англ. — [everycrsreport.com](https://www.everycrsreport.com/reports/IF12299.html). Коротко о законе, который сделал полный инвентарь данных обязанностью ведомств.
- **GAO-21-29: Open Data — Additional Action Required for Full Public Access.** GAO, 2020, англ. — [gao.gov](https://gao.gov/products/gao-21-29). Отчёт Счётной палаты США: OMB не выпустило руководство по полным инвентарям, которое требовал закон.
- **M-25-05: Phase 2 Implementation of the Foundations for Evidence-Based Policymaking Act of 2018: Open Government Data Access and Management Guidance.** Office of Management and Budget, 2025, англ. — [whitehouse.gov](https://www.whitehouse.gov/wp-content/uploads/2025/01/M-25-05-Phase-2-Implementation-of-the-Foundations-for-Evidence-Based-Policymaking-Act-of-2018-Open-Government-Data-Access-and-Management-Guidance.pdf). Руководство по полным инвентарям: все активы данных, схема DCAT-US 3.0, публикация; статус — в [«Нормативной базе»](./02-legal-framework.md#us-m-25-05).

**Великобритания**

- **The role of information asset owners in government.** Cabinet Office, 2013, обновлено 2025, англ. — [gov.uk](https://www.gov.uk/government/publications/information-asset-owner-role-guidance). Кто такой владелец информационного актива и за что он отвечает в реестре.
- **Identify and record critical data assets**, 2023–2026, и **Data asset management policy in government**, 2026. Government Digital Service, англ. — [gov.uk](https://www.gov.uk/government/publications/data-asset-management-policy-in-government). Короткий список критически важных активов данных с владельцем, метаданными и планом действий по качеству.

**Франция**

- **Pour une politique publique de la donnée.** Bothorel É., 2020, фр. — [vie-publique.fr](https://vie-publique.fr/files/rapport/pdf/277879.pdf). Доклад о политике данных государства: актуального исчерпывающего перечня данных нет.
- **Cadre interministériel d'administration de la donnée.** DINUM, 2021, фр. — [numerique.gouv.fr](https://archive.numerique.gouv.fr/uploads/Cadre-interministeriel-donnee.pdf). Межминистерская рамка управления данными. Как вести каталог в табличной базе данных — руководство **Catalogage de données — Grist**, фр. — [guides.data.gouv.fr](https://guides.data.gouv.fr/autres/catalogage-de-donnees-grist).
- **Inventaire des bases de données relatives à l'emploi.** Etalab, 2021, фр. — [data.gouv.fr](https://www.data.gouv.fr/datasets/inventaire-des-bases-de-donnees-relatives-a-lemploi). Отраслевая опись баз данных о занятости с методикой и ограничениями.

**Польша**

- Программа открытия данных на 2021–2027 годы — постановление Совета министров, а не методика; оно — в приложении [«Нормативная база»](./02-legal-framework.md#pl-program-2021).
- **Otwieranie danych. Praktyczny poradnik.** Ministerstwo Cyfryzacji, 2-е издание, 2023, пол. — [gov.pl](https://www.gov.pl/web/cyfryzacja/konkretnie-o-otwieraniu-danych). Практическое руководство по открытию данных для учреждений.
- **Kluczowe rejestry publiczne**, пол. — [gov.pl/web/ia](https://www.gov.pl/web/ia/kluczowe-rejestry-publiczne). Перечень ключевых публичных реестров государства — готовый список для начала описи.

**Южная Корея**

- **Политика публичных данных** и **Стандартизация и качество данных.** 행정안전부 (Министерство внутренних дел и безопасности), кор. — [mois.go.kr](https://www.mois.go.kr/frt/sub/a06/b02/openData/screen.do), [mois.go.kr](https://www.mois.go.kr/frt/sub/a06/b02/openData_3/screen.do). Перечни публичных данных, общий словарь терминов и ежегодная оценка качества баз учреждений.

## Оценки открытости

Индексы сравнивают страны по открытости данных. Для описи это подсказка, а не мерило полноты: индекс видит опубликованное.

- **Open Data Inventory (ODIN).** Open Data Watch, англ. — [odin.opendatawatch.com](https://odin.opendatawatch.com/). Насколько полно и открыто национальные статистические службы публикуют социальные, экономические и экологические показатели.
- **2023 OECD Open, Useful and Re-usable data (OURdata) Index.** OECD, 2023, англ. — [oecd.org](https://www.oecd.org/content/dam/oecd/en/publications/reports/2023/12/2023-oecd-open-useful-and-re-usable-data-index_cc9e8a9e/a37f51c3-en.pdf); **Digital Government Index and Open, Useful and Re-usable Data Index: 2025 Results and Key Findings**, 2026 — [oecd.org](https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/02/digital-government-index-and-open-useful-and-re-usable-data-index_dbe102ed/6347ec74-en.pdf). Индекс открытых государственных данных стран ОЭСР.
- **Open Data Maturity Report.** data.europa.eu, англ. — [2024](https://data.europa.eu/sites/default/files/2025-07/2024_odm_report.pdf), [2025](https://data.europa.eu/sites/default/files/2025-12/2025_odm_report_6.pdf). Ежегодная оценка зрелости открытых данных в странах Европы: политика, портал, качество, влияние.
- **Open Data Readiness Assessment.** World Bank, англ. — [opendatatoolkit.worldbank.org](https://opendatatoolkit.worldbank.org/en/data/opendatatoolkit/odra). Методика оценки готовности страны к открытию данных.

## Веб-архивы и сохранение данных

- **Wayback CDX Server API.** Internet Archive, англ. — [github.com/internetarchive/wayback](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server). Описание интерфейса, который отвечает, когда адрес сохранялся.
- **End of Term Web Archive**, англ. — [eotarchive.org](https://eotarchive.org/). Сайты федерального правительства США при смене администрации.
- **Data.gov Archive.** Library Innovation Lab, Harvard Law School, англ. — [lil.law.harvard.edu](https://lil.law.harvard.edu/data-gov-archive). Наборы data.gov, собранные с ноября 2024 по январь 2025 года.
- **UK Government Web Archive.** The National Archives, англ. — [webarchive.nationalarchives.gov.uk](https://webarchive.nationalarchives.gov.uk/). Сайты правительства Великобритании.
- **EU web archive.** Publications Office of the European Union, англ. — [op.europa.eu](https://op.europa.eu/en/web/euwebarchive). Сайты институтов и органов ЕС; что архив сохраняет и чего нет — [руководство](https://op.europa.eu/en/web/webguide/archiving).
- **Национальный цифровой архив.** АНО «Информационная культура», рус. — [ruarxive.org](https://ruarxive.org/). Сохраняет исчезающие сайты и данные.
- **Common Crawl Index Server**, англ. — [index.commoncrawl.org](https://index.commoncrawl.org/). Указатель копий веба для обработки программами.

## Каталоги и поиск данных

- **Google Dataset Search by the Numbers.** Benjelloun O., Chen S., Noy N. — ISWC 2020, англ. — [research.google](https://research.google/pubs/google-dataset-search-by-the-numbers/). Что лежит в индексе поисковика по наборам данных и как устроены описания наборов в вебе.
- **Реестр каталогов данных.** Dateno, англ., CC BY 4.0 — [datenoio/dataportals-registry](https://github.com/datenoio/dataportals-registry). Порталы, геопорталы, репозитории и каталоги показателей по странам, с платформой и программным интерфейсом.

## Прежняя версия книги

- **Карты данных** — прежняя версия этой книги, рус. — [infoculture/datainventorydocs](https://github.com/infoculture/datainventorydocs); её план, ревизия и сверка фактов — [archive/](https://github.com/ivbeg/data-inventory/tree/main/archive).
