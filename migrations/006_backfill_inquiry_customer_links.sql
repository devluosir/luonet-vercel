-- Migration 006：询报价历史记录客户关联回填
-- 仅处理仍未关联客户的 active inquiry Document。
-- 匹配策略：
-- 1) customerNo 或 inquirer 前半段 精确匹配 Customer.code / Customer.short_name
-- 2) inquirer 后半段 精确匹配 Contact.short_name
-- 3) 只回填唯一匹配；存在歧义的记录保留空值，交给界面“待关联客户”筛选人工处理

DROP TABLE IF EXISTS task63_contact_matches;
DROP TABLE IF EXISTS task63_customer_matches;

CREATE TABLE task63_contact_matches (
  document_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  contact_id TEXT NOT NULL
);

INSERT INTO task63_contact_matches (document_id, customer_id, contact_id)
WITH normalized AS (
  SELECT
    id,
    LOWER(TRIM(COALESCE(NULLIF(json_extract(data, '$.customerNo'), ''), customer_name, ''))) AS customer_key,
    LOWER(TRIM(COALESCE(json_extract(data, '$.inquirer'), ''))) AS inquirer_text
  FROM Document
  WHERE type = 'inquiry'
    AND status = 'active'
    AND (customer_id IS NULL OR customer_id = '')
),
keys AS (
  SELECT
    id,
    customer_key,
    CASE
      WHEN instr(inquirer_text, '-') > 0 THEN LOWER(TRIM(substr(inquirer_text, 1, instr(inquirer_text, '-') - 1)))
      ELSE ''
    END AS inquirer_customer_key,
    CASE
      WHEN instr(inquirer_text, '-') > 0 THEN LOWER(TRIM(substr(inquirer_text, instr(inquirer_text, '-') + 1)))
      ELSE LOWER(TRIM(inquirer_text))
    END AS contact_key
  FROM normalized
)
SELECT
  k.id,
  MIN(c.id) AS customer_id,
  MIN(ct.id) AS contact_id
FROM keys k
JOIN Customer c
  ON c.type = 'customer'
 AND c.status = 'active'
 AND (
      (k.customer_key != '' AND LOWER(TRIM(COALESCE(c.code, ''))) = k.customer_key)
   OR (k.customer_key != '' AND LOWER(TRIM(COALESCE(c.short_name, ''))) = k.customer_key)
   OR (k.inquirer_customer_key != '' AND LOWER(TRIM(COALESCE(c.code, ''))) = k.inquirer_customer_key)
   OR (k.inquirer_customer_key != '' AND LOWER(TRIM(COALESCE(c.short_name, ''))) = k.inquirer_customer_key)
 )
JOIN Contact ct
  ON ct.customer_id = c.id
 AND ct.status = 'active'
 AND k.contact_key != ''
 AND LOWER(TRIM(COALESCE(ct.short_name, ''))) = k.contact_key
GROUP BY k.id
HAVING COUNT(DISTINCT c.id || '|' || ct.id) = 1;

UPDATE Document
SET
  customer_id = (SELECT customer_id FROM task63_contact_matches WHERE document_id = Document.id),
  contact_id = (SELECT contact_id FROM task63_contact_matches WHERE document_id = Document.id),
  data = CASE
    WHEN data IS NULL OR TRIM(data) = '' THEN json_object(
      'customerId', (SELECT customer_id FROM task63_contact_matches WHERE document_id = Document.id),
      'contactId', (SELECT contact_id FROM task63_contact_matches WHERE document_id = Document.id)
    )
    WHEN json_valid(data) THEN json_set(
      data,
      '$.customerId', (SELECT customer_id FROM task63_contact_matches WHERE document_id = Document.id),
      '$.contactId', (SELECT contact_id FROM task63_contact_matches WHERE document_id = Document.id)
    )
    ELSE data
  END
WHERE id IN (SELECT document_id FROM task63_contact_matches);

CREATE TABLE task63_customer_matches (
  document_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL
);

INSERT INTO task63_customer_matches (document_id, customer_id)
WITH normalized AS (
  SELECT
    id,
    LOWER(TRIM(COALESCE(NULLIF(json_extract(data, '$.customerNo'), ''), customer_name, ''))) AS customer_key,
    LOWER(TRIM(COALESCE(json_extract(data, '$.inquirer'), ''))) AS inquirer_text
  FROM Document
  WHERE type = 'inquiry'
    AND status = 'active'
    AND (customer_id IS NULL OR customer_id = '')
),
keys AS (
  SELECT
    id,
    customer_key,
    CASE
      WHEN instr(inquirer_text, '-') > 0 THEN LOWER(TRIM(substr(inquirer_text, 1, instr(inquirer_text, '-') - 1)))
      ELSE ''
    END AS inquirer_customer_key
  FROM normalized
)
SELECT
  k.id,
  MIN(c.id) AS customer_id
FROM keys k
JOIN Customer c
  ON c.type = 'customer'
 AND c.status = 'active'
 AND (
      (k.customer_key != '' AND LOWER(TRIM(COALESCE(c.code, ''))) = k.customer_key)
   OR (k.customer_key != '' AND LOWER(TRIM(COALESCE(c.short_name, ''))) = k.customer_key)
   OR (k.inquirer_customer_key != '' AND LOWER(TRIM(COALESCE(c.code, ''))) = k.inquirer_customer_key)
   OR (k.inquirer_customer_key != '' AND LOWER(TRIM(COALESCE(c.short_name, ''))) = k.inquirer_customer_key)
 )
GROUP BY k.id
HAVING COUNT(DISTINCT c.id) = 1;

UPDATE Document
SET
  customer_id = (SELECT customer_id FROM task63_customer_matches WHERE document_id = Document.id),
  data = CASE
    WHEN data IS NULL OR TRIM(data) = '' THEN json_object(
      'customerId', (SELECT customer_id FROM task63_customer_matches WHERE document_id = Document.id)
    )
    WHEN json_valid(data) THEN json_set(
      data,
      '$.customerId', (SELECT customer_id FROM task63_customer_matches WHERE document_id = Document.id)
    )
    ELSE data
  END
WHERE id IN (SELECT document_id FROM task63_customer_matches);

DROP TABLE task63_contact_matches;
DROP TABLE task63_customer_matches;
