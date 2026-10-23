---
description: "Карта данных по здравоохранению — статистика, учреждения, лекарства, медицинские изделия, регистры: 20 вопросов и источники ответов с отметкой доступности."
---

import HealthPassport from './_generated/health-passport.mdx';
import HealthQuestions from './_generated/health-questions.mdx';
import HealthSources from './_generated/health-sources.mdx';
import HealthNotes from './_generated/health-notes.mdx';

# Здравоохранение

Карта отвечает на вопрос, где найти данные по теме «Здравоохранение». У каждого источника отмечено, доступны ли в нём сведения, — по легенде исходной карты. Таблицы на этой странице построены из файла данных карты; как их читать, объяснено в главе [«Как читать атлас»](./01-how-to-read.md).

## Паспорт

<HealthPassport />

## Вопросы и источники

<span className="avail avail--available">●</span> данные доступны · <span className="avail avail--restricted">●</span> доступны с ограничениями · <span className="avail avail--unavailable">●</span> не доступны · <span className="avail avail--unknown">○</span> доступность не указана

<HealthQuestions />

## Источники карты

Владельцы указаны по домену сайта и по документам не сверены. Последняя колонка — что ответил адрес источника при проверке 23 октября 2026 года; как её читать, объяснено в главе [«Как читать атлас»](./01-how-to-read.md#адреса-источников-в-октябре-2026-года).

<HealthSources />

## Визуализации

![Карта данных «Здравоохранение» в виде интеллект-карты](/img/atlas/health-mindmap.webp)

![Карта данных «Здравоохранение» для печати](/img/atlas/health-print.webp)

## Файлы для скачивания

- [Интеллект-карта, PNG](pathname:///img/atlas/health-mindmap.png)
- [Карта для печати, PDF](pathname:///downloads/health.pdf)
- [Вопросы и источники, CSV](pathname:///downloads/health.csv)
- [Данные карты, YAML](https://github.com/ivbeg/data-inventory/blob/main/data/maps/health.yaml)

## Что изменилось

<HealthNotes />

## Источники

- Исходные карты: интеллект-карта и карта для печати, автор Иван Бегтин, АНО «Информационная культура».
- Данные карты: [data/maps/health.yaml](https://github.com/ivbeg/data-inventory/blob/main/data/maps/health.yaml) и общий список источников [data/sources.yaml](https://github.com/ivbeg/data-inventory/blob/main/data/sources.yaml).
