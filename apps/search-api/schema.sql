PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  variant TEXT NOT NULL DEFAULT '',
  price_twd INTEGER,
  checked_on TEXT
);
CREATE TABLE IF NOT EXISTS product_aliases (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  alias TEXT NOT NULL,
  PRIMARY KEY (product_id, locale, alias)
);
CREATE INDEX IF NOT EXISTS idx_products_name_zh ON products(name_zh);
CREATE INDEX IF NOT EXISTS idx_products_name_en ON products(name_en);
CREATE INDEX IF NOT EXISTS idx_alias_locale_alias ON product_aliases(locale, alias);

INSERT OR IGNORE INTO products (id, name_zh, name_en, brand, variant, price_twd, checked_on) VALUES
  (1, '鳳梨酥', 'Pineapple Cake', 'SunnyHills', '10-piece box', 600, '2026-10-29'),
  (2, '台灣茶', 'Taiwan Tea', '林華泰茶行', '高山烏龍茶 150g', 450, '2026-10-29'),
  (3, '泡麵', 'Instant Noodles', '維力', '炸醬麵 5-pack', 100, '2026-10-29'),
  (4, '芒果乾', 'Dried Mango', '玉井之門', '愛文芒果乾 100g', 180, '2026-10-29'),
  (5, '牛軋糖', 'Nougat', '糖村', '原味 150g', 320, '2026-10-29');

INSERT OR IGNORE INTO product_aliases (product_id, locale, alias) VALUES
  (1, 'en', 'pineapple cake'), (1, 'zh-TW', '鳳梨酥'),
  (2, 'en', 'taiwan tea'), (2, 'zh-TW', '台灣茶'),
  (3, 'en', 'instant noodles'), (3, 'zh-TW', '泡麵'),
  (4, 'en', 'dried mango'), (4, 'zh-TW', '芒果乾'),
  (5, 'en', 'nougat'), (5, 'zh-TW', '牛軋糖');
