INSERT INTO products (id, brand, name, model, category) VALUES ('p3', 'Example Bakery', 'Pineapple Cake Box', '', 'food');
INSERT INTO products (id, brand, name, model, category) VALUES ('p4', 'Example Bakery', 'Other Product', '', 'pineapple cake');
INSERT INTO variants (id, product_id, name) VALUES ('v5', 'p4', 'Standard');
INSERT INTO offers (id, variant_id, merchant_id, outbound_link, amount, checked_on) VALUES ('o6', 'v5', 'm1', 'https://example.com/o6', 800, '2026-11-01');
INSERT INTO variants (id, product_id, name) VALUES ('v4', 'p3', 'Box');
INSERT INTO offers (id, variant_id, merchant_id, outbound_link, amount, checked_on) VALUES ('o5', 'v4', 'm1', 'https://example.com/o5', 900, '2026-11-01');
INSERT INTO aliases (product_id, locale, alias) VALUES
  ('p3', 'en', 'pineapple cake'),
  ('p3', 'vi', 'bánh dứa');
