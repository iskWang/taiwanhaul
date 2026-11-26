CREATE TABLE IF NOT EXISTS fx_rates (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fx_date TEXT NOT NULL,
  rates_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL, -- upstream time_last_update_unix
  fetched_at INTEGER NOT NULL
);
