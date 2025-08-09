-- ================================
-- 添加審計和雙向同步控制欄位
-- Migration Script for Bidirectional Sync
-- ================================

-- 1. 為商機表添加審計和控制欄位
ALTER TABLE newopportunityobj ADD COLUMN history_log TEXT DEFAULT '';
ALTER TABLE newopportunityobj ADD COLUMN d1_last_modified_time INTEGER;
ALTER TABLE newopportunityobj ADD COLUMN d1_last_modified_by TEXT;
ALTER TABLE newopportunityobj ADD COLUMN edit_locked_by TEXT;
ALTER TABLE newopportunityobj ADD COLUMN edit_locked_at INTEGER;
ALTER TABLE newopportunityobj ADD COLUMN sync_conflict TEXT;
ALTER TABLE newopportunityobj ADD COLUMN field_edit_permissions TEXT DEFAULT '{}';

-- 2. 為案場表添加審計和控制欄位
ALTER TABLE object_8w9cb__c ADD COLUMN history_log TEXT DEFAULT '';
ALTER TABLE object_8w9cb__c ADD COLUMN d1_last_modified_time INTEGER;
ALTER TABLE object_8w9cb__c ADD COLUMN d1_last_modified_by TEXT;
ALTER TABLE object_8w9cb__c ADD COLUMN edit_locked_by TEXT;
ALTER TABLE object_8w9cb__c ADD COLUMN edit_locked_at INTEGER;
ALTER TABLE object_8w9cb__c ADD COLUMN sync_conflict TEXT;
ALTER TABLE object_8w9cb__c ADD COLUMN field_edit_permissions TEXT DEFAULT '{}';

-- 3. 創建審計日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  timestamp INTEGER NOT NULL,
  api_source TEXT NOT NULL, -- 'worker_api', 'owner_api', 'admin_api', 'sync_service'
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 創建欄位編輯權限記錄表
CREATE TABLE IF NOT EXISTS field_edit_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  locked_fields TEXT NOT NULL, -- JSON array of field names
  locked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  released_at INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 創建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_field_edit_sessions_record ON field_edit_sessions(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_field_edit_sessions_user ON field_edit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_field_edit_sessions_expires ON field_edit_sessions(expires_at);

-- 6. 創建同步衝突記錄表
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  d1_value TEXT,
  crm_value TEXT,
  d1_modified_time INTEGER,
  crm_modified_time INTEGER,
  resolution_strategy TEXT, -- 'use_d1', 'use_crm', 'manual_review'
  resolved_at INTEGER,
  resolved_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_record ON sync_conflicts(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_resolved ON sync_conflicts(resolved_at);

-- 7. 初始化現有記錄的 D1 修改時間（設為當前時間）
UPDATE newopportunityobj 
SET d1_last_modified_time = strftime('%s', 'now') * 1000
WHERE d1_last_modified_time IS NULL;

UPDATE object_8w9cb__c 
SET d1_last_modified_time = strftime('%s', 'now') * 1000
WHERE d1_last_modified_time IS NULL;

-- 8. 為歷史記錄添加初始條目
UPDATE newopportunityobj 
SET history_log = '[' || strftime('%s', 'now') * 1000 || '] SYSTEM: 記錄初始化，啟用雙向同步功能' || char(10)
WHERE history_log = '' OR history_log IS NULL;

UPDATE object_8w9cb__c 
SET history_log = '[' || strftime('%s', 'now') * 1000 || '] SYSTEM: 記錄初始化，啟用雙向同步功能' || char(10)
WHERE history_log = '' OR history_log IS NULL;

-- ================================
-- Migration完成
-- ================================