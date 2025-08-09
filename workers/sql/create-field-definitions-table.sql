-- 創建欄位定義表，用於存儲真實的CRM欄位資訊
CREATE TABLE IF NOT EXISTS fx_field_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_api_name TEXT NOT NULL,
  field_api_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  description TEXT,
  max_length INTEGER,
  default_value TEXT,
  options TEXT, -- JSON格式存儲選項值
  source TEXT DEFAULT 'crm_api', -- 數據來源: crm_api, describe_api, data_inference
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(object_api_name, field_api_name)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_field_definitions_object ON fx_field_definitions(object_api_name);
CREATE INDEX IF NOT EXISTS idx_field_definitions_field ON fx_field_definitions(field_api_name);

-- 創建欄位同步歷史表
CREATE TABLE IF NOT EXISTS fx_field_sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_api_name TEXT NOT NULL,
  action TEXT NOT NULL, -- ADD, UPDATE, REMOVE
  field_name TEXT NOT NULL,
  field_type TEXT,
  details TEXT, -- JSON格式存儲詳細信息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_field_sync_history_object ON fx_field_sync_history(object_api_name);
CREATE INDEX IF NOT EXISTS idx_field_sync_history_action ON fx_field_sync_history(action);