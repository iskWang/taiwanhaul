-- Product Index (terms: CONTEXT.md). Applied by the admin Worker's POST /migrate.
CREATE TABLE platforms (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE merchants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  -- MVP uses only Platform-operated Merchants; the field stays for later.
  platform_operated INTEGER NOT NULL DEFAULT 1 CHECK (platform_operated IN (0, 1))
);

CREATE TABLE products (
  id       TEXT PRIMARY KEY,
  brand    TEXT NOT NULL,
  name     TEXT NOT NULL,
  model    TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT ''
);

-- Different sizes, flavors, or pack counts are separate Variants; never merged.
CREATE TABLE variants (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  name       TEXT NOT NULL
);

CREATE TABLE offers (
  id            TEXT PRIMARY KEY,
  variant_id    TEXT NOT NULL REFERENCES variants(id),
  merchant_id   TEXT NOT NULL REFERENCES merchants(id),
  outbound_link TEXT NOT NULL,
  amount        INTEGER CHECK (amount IS NULL OR amount >= 0), -- TWD
  checked_on    TEXT CHECK (checked_on IS NULL OR checked_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]') -- Asia/Taipei date
);

-- Per-product multilingual aliases and Chinese Search Terms.
CREATE TABLE aliases (
  product_id TEXT NOT NULL REFERENCES products(id),
  locale     TEXT NOT NULL,
  alias      TEXT NOT NULL,
  PRIMARY KEY (product_id, locale, alias)
);

CREATE INDEX variants_product ON variants(product_id);
CREATE INDEX offers_variant ON offers(variant_id);
CREATE INDEX aliases_alias ON aliases(alias);
