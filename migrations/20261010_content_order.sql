BEGIN;

LOCK TABLE products_services, clients, jobs IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE products_services ADD COLUMN IF NOT EXISTS sort_order integer;
-- Preserve the previous newest-first listing; do not overwrite an existing order.
WITH positions AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) - 1
    + (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM products_services))::integer AS position
  FROM products_services WHERE sort_order IS NULL
)
UPDATE products_services AS record SET sort_order = positions.position
FROM positions WHERE record.id = positions.id;
CREATE INDEX IF NOT EXISTS products_services_sort_order_idx ON products_services (sort_order, created_at DESC, id DESC);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS sort_order integer;
-- Preserve the previous newest-first listing; do not overwrite an existing order.
WITH positions AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) - 1
    + (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM clients))::integer AS position
  FROM clients WHERE sort_order IS NULL
)
UPDATE clients AS record SET sort_order = positions.position
FROM positions WHERE record.id = positions.id;
CREATE INDEX IF NOT EXISTS clients_sort_order_idx ON clients (sort_order, created_at DESC, id DESC);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sort_order integer;
-- Preserve the previous newest-first listing; do not overwrite an existing order.
WITH positions AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) - 1
    + (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM jobs))::integer AS position
  FROM jobs WHERE sort_order IS NULL
)
UPDATE jobs AS record SET sort_order = positions.position
FROM positions WHERE record.id = positions.id;
CREATE INDEX IF NOT EXISTS jobs_sort_order_idx ON jobs (sort_order, created_at DESC, id DESC);

COMMIT;
