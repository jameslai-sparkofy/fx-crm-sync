-- 創建同步進度表（用於斷點續傳）
CREATE TABLE IF NOT EXISTS sync_progress (
  entity_type TEXT PRIMARY KEY,
  current_offset INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_sync_progress_updated ON sync_progress(updated_at);