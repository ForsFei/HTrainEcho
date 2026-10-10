CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS records(
  scope TEXT NOT NULL,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(scope,kind,id)
);
CREATE TABLE IF NOT EXISTS meta(
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY(scope,key)
);
INSERT OR IGNORE INTO migrations VALUES(1,datetime('now'));
