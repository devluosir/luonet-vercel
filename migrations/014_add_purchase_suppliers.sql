-- TASK-163：采购侧独立供应商主档（不复用销售侧 Customer / Contact）
CREATE TABLE IF NOT EXISTS PurchaseSupplier (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  short_name TEXT,
  address TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_by TEXT,
  updated_by TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_supplier_name ON PurchaseSupplier(name);
CREATE INDEX IF NOT EXISTS idx_purchase_supplier_short_name ON PurchaseSupplier(short_name);
CREATE INDEX IF NOT EXISTS idx_purchase_supplier_status ON PurchaseSupplier(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_supplier_code_unique
  ON PurchaseSupplier(code COLLATE NOCASE)
  WHERE code IS NOT NULL AND code != '';

CREATE TABLE IF NOT EXISTS PurchaseSupplierContact (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  email TEXT,
  phone TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES PurchaseSupplier(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchase_supplier_contact_supplier
  ON PurchaseSupplierContact(supplier_id);
