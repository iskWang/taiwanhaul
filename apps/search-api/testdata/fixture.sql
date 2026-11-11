INSERT INTO platforms (id, name) VALUES ('pf1', 'Example Mall');
INSERT INTO merchants (id, name, platform_id, platform_operated) VALUES
  ('m1', 'Example Mall', 'pf1', 1),
  ('m2', 'Third Party Shop', 'pf1', 0);
INSERT INTO products (id, brand, name, model, category) VALUES
  ('p1', 'Example Bakery', '鳳梨酥', '', 'food'),
  ('p2', 'Example Bakery', '鳳梨酥禮盒', '', 'food');
INSERT INTO variants (id, product_id, name) VALUES
  ('v1', 'p1', '10 入'),
  ('v2', 'p1', '20 入'),
  ('v3', 'p2', '12 入');
INSERT INTO offers (id, variant_id, merchant_id, outbound_link, amount, checked_on) VALUES
  ('o1', 'v1', 'm1', 'https://example.com/o1', 450, '2026-11-01'),
  ('o2', 'v2', 'm1', 'https://example.com/o2', NULL, NULL),
  ('o3', 'v1', 'm2', 'https://example.com/o3', 400, '2026-11-01'),
  ('o4', 'v3', 'm1', 'https://example.com/o4', 800, '2026-11-01');
INSERT INTO aliases (product_id, locale, alias) VALUES
  ('p1', 'en', 'pineapple cake'),
  ('p1', 'vi', 'bánh dứa'),
  ('p1', 'zh-TW', '鳳梨酥');
