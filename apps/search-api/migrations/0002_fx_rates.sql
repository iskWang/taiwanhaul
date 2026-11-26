CREATE TABLE fx_rates (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fx_date TEXT NOT NULL,
  rates_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
