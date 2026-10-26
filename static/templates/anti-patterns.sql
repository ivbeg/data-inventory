-- Антипаттерны инвентаризации данных: запросы DuckDB к реестру по шаблонам книги
-- «Инвентаризация данных», глава «Практики и антипаттерны»:
-- https://datainventory.begtin.tech/practices/practices-and-anti-patterns/
--
-- Файлы рядом с этим запросом (колонки — как в шаблонах книги):
--   registry.csv          — текущая версия реестра
--   registry-2026-04.csv  — прошлая версия реестра
--   changes.csv           — список изменений
--   questions.csv, links.csv — вопросы и связи «вопрос — источник» (подход «где найти нужное»)
-- Запуск: duckdb < anti-patterns.sql
--
-- Каждый запрос выводит записи, которые стоит посмотреть, а не готовый список ошибок:
-- общий адрес бывает правильным в общедоступной части, а тип «сайт» — у источника карты,
-- за которым систему так и не нашли. Проверено в DuckDB 1.5 на шаблонах книги
-- с намеренно испорченными записями, октябрь 2026 года.

CREATE OR REPLACE TABLE r AS
  SELECT * FROM read_csv('registry.csv', all_varchar = true);

-- 1. Всё и сразу: колонки, заполненные меньше чем у половины записей
SELECT col AS колонка,
       round(100.0 * count(*) / (SELECT count(*) FROM r)) AS заполнено_процентов
FROM (UNPIVOT r ON COLUMNS(*) INTO NAME col VALUE val)
WHERE trim(val) <> ''
GROUP BY col
HAVING count(*) < (SELECT count(*) FROM r) / 2
ORDER BY 2;

-- 2. Пустые ячейки и значения по умолчанию: сколько пустых в 14 обязательных колонках
SELECT count(*) FILTER (WHERE coalesce(trim(COLUMNS([
  'id', 'title', 'description', 'owner_person', 'owner_contacts',
  'update_frequency', 'access_level', 'download_url', 'format', 'issued',
  'modified', 'quality_check', 'license', 'publisher'])), '') = '')
FROM r;

-- 2а. Одни и те же условия использования или периодичность у всех записей
SELECT license, count(*) FROM r GROUP BY license ORDER BY 2 DESC;
SELECT update_frequency, count(*) FROM r GROUP BY update_frequency ORDER BY 2 DESC;

-- 3. Только опросы владельцев: каким методом найдены записи
SELECT regexp_extract(known_from, '^[^:;]+') AS метод, count(*) FROM r
GROUP BY метод ORDER BY 2 DESC;

-- 4. Только открытое: если всё open, закрытого в реестре нет
SELECT access_level, count(*) FROM r GROUP BY access_level ORDER BY 2 DESC;
SELECT type, count(*) FROM r GROUP BY type ORDER BY 2 DESC;

-- 5. Копия без первоисточника: copy_of ведёт на запись, которой нет
SELECT id, related FROM r
WHERE related LIKE '%copy_of:%'
  AND regexp_extract(related, 'copy_of:([^;]+)', 1) NOT IN (SELECT id FROM r);

-- 6. Реестр со слов модели: запись составила модель, подтверждения нет
SELECT id, known_from FROM r
WHERE known_from ILIKE '%модель%' AND known_from NOT ILIKE '%подтвержд%';

-- 7. Сайт вместо системы: записи типа «сайт» и ссылки на главную страницу
SELECT id, title, type, download_url FROM r
WHERE type = 'site' OR regexp_matches(download_url, '^https?://[^/]+/?$');

-- 8. Владелец — тот, кто публикует: владелец записан тем же, что оператор
SELECT id, publisher, operator FROM r
WHERE coalesce(operator, '') <> '' AND lower(trim(publisher)) = lower(trim(operator));

-- 9. Ответственный — пресс-служба, приёмная или общий адрес
SELECT id, owner_person, owner_contacts FROM r
WHERE regexp_matches(owner_contacts, '(^|[^a-z0-9._-])(info|press|pr|mail|office|contact|reception)@')
   OR regexp_matches(lower(owner_person), 'пресс|при[её]мн|канцеляр');

-- 10. Один набор под разными именами: одинаковые названия без пробелов и знаков,
--     одинаковые адреса выгрузки, название одной записи в синонимах другой
SELECT string_agg(id, ', ') AS записи FROM r
GROUP BY lower(regexp_replace(title, '[^\p{L}\p{N}]', '', 'g')) HAVING count(*) > 1;
SELECT string_agg(id, ', ') AS записи FROM r
WHERE regexp_matches(download_url, '^https?://')
GROUP BY download_url HAVING count(*) > 1;
SELECT a.id, b.id AS синоним_у FROM r a
JOIN (SELECT id, unnest(string_split(aliases, ';')) AS alias FROM r) b
  ON lower(trim(b.alias)) = lower(a.title) AND a.id <> b.id;

-- 11. Статус доступа без основания или даты
SELECT id, access_level, access_basis, access_checked FROM r
WHERE access_level <> 'open'
  AND (coalesce(access_basis, '') = '' OR coalesce(access_checked, '') = '');

-- 12. Без проверки качества
SELECT id, quality_check FROM r
WHERE coalesce(quality_check, '') = '' OR quality_check ILIKE 'не проверено%';

-- 13. Сдали и забыли: записи, которые не проверяли больше года, и одна дата у всех
SELECT id, checked FROM r
WHERE checked < strftime(current_date - INTERVAL 1 YEAR, '%Y-%m');
SELECT checked, count(*) FROM r GROUP BY checked ORDER BY 2 DESC;

-- 14. Строку удалили: записи прошлой версии, которых нет ни среди записей,
--     ни среди синонимов, ни в списке изменений
SELECT id FROM read_csv('registry-2026-04.csv', all_varchar = true)
EXCEPT SELECT id FROM r
EXCEPT SELECT trim(unnest(string_split(aliases, ';'))) FROM r
EXCEPT SELECT record_id FROM read_csv('changes.csv', all_varchar = true);

-- 15. Пробелов нет: вопросы без доступного источника.
--     Пустой ответ — повод проверить, не спрятаны ли пробелы
SELECT q.n, q.text FROM read_csv('questions.csv', all_varchar = true) q
WHERE q.n NOT IN (
  SELECT question_n FROM read_csv('links.csv', all_varchar = true)
  WHERE status IN ('open', 'unstructured'));

-- 16. Статус пары «вопрос — источник» без основания
SELECT question_n, source_id, status FROM read_csv('links.csv', all_varchar = true)
WHERE status <> 'open' AND coalesce(status_basis, '') = '';
