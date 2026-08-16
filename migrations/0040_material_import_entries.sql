-- Driveの一覧取得と実ファイルコピーを分離する。Workersの一回あたりの外部通信上限を
-- 越えず、途中で止まっても安全に再開できるようにする。
CREATE TABLE IF NOT EXISTS material_import_entries (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  parent_path TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  modified_at TEXT,
  source_url TEXT,
  can_download INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'imported', 'skipped', 'failed')),
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES material_import_runs(id) ON DELETE CASCADE,
  UNIQUE(run_id, drive_file_id)
);
CREATE INDEX IF NOT EXISTS idx_material_import_entries_run_status
  ON material_import_entries(run_id, status, created_at);
