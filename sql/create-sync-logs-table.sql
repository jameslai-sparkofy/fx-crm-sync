-- 創建詳細的同步日誌表
CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trigger_source TEXT, -- 'webhook' | 'scheduled' | 'manual' | 'api'
  trigger_details TEXT, -- 詳細的觸發資訊 (例如: webhook URL, API endpoint, user action)
  object_api_name TEXT,
  object_label TEXT,
  object_id TEXT,
  operation TEXT, -- 'create' | 'update' | 'delete' | 'batch'
  fields_changed TEXT, -- JSON 格式，記錄變更的欄位
  old_values TEXT, -- JSON 格式，記錄舊值
  new_values TEXT, -- JSON 格式，記錄新值
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER, -- 同步耗時（毫秒）
  ip_address TEXT, -- 觸發來源 IP
  user_agent TEXT, -- User Agent
  status TEXT DEFAULT 'pending', -- 'pending' | 'success' | 'failed' | 'partial'
  metadata TEXT -- JSON 格式，額外的元數據
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_sync_logs_time ON sync_logs(sync_time DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_object ON sync_logs(object_api_name);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_trigger ON sync_logs(trigger_source);