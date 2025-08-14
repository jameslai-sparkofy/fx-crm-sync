-- 創建 D1 變更追蹤表
CREATE TABLE IF NOT EXISTS d1_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  object_api_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  changed_fields TEXT, -- JSON 格式，記錄變更的欄位
  old_values TEXT, -- JSON 格式
  new_values TEXT, -- JSON 格式
  change_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'completed', 'failed'
  sync_attempts INTEGER DEFAULT 0,
  sync_error TEXT,
  synced_at TIMESTAMP,
  created_by TEXT DEFAULT 'system'
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_change_log_status ON d1_change_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_change_log_time ON d1_change_log(change_time DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_table ON d1_change_log(table_name, record_id);

-- 為案場表創建觸發器
CREATE TRIGGER IF NOT EXISTS track_sites_insert
AFTER INSERT ON object_8w9cb__c
FOR EACH ROW
BEGIN
  INSERT INTO d1_change_log (
    table_name, object_api_name, record_id, operation, 
    new_values, changed_fields
  ) VALUES (
    'object_8w9cb__c', 'object_8W9cb__c', NEW._id, 'INSERT',
    json_object(
      'name', NEW.name,
      'field_1P96q__c', NEW.field_1P96q__c,
      'contact__c', NEW.contact__c,
      'field_TJ18I__c', NEW.field_TJ18I__c
    ),
    json_array('name', 'field_1P96q__c', 'contact__c', 'field_TJ18I__c')
  );
END;

CREATE TRIGGER IF NOT EXISTS track_sites_update
AFTER UPDATE ON object_8w9cb__c
FOR EACH ROW
WHEN OLD.sync_time != NEW.sync_time -- 避免同步操作觸發
BEGIN
  INSERT INTO d1_change_log (
    table_name, object_api_name, record_id, operation,
    old_values, new_values, changed_fields
  ) VALUES (
    'object_8w9cb__c', 'object_8W9cb__c', NEW._id, 'UPDATE',
    json_object(
      'name', OLD.name,
      'field_1P96q__c', OLD.field_1P96q__c,
      'contact__c', OLD.contact__c,
      'field_TJ18I__c', OLD.field_TJ18I__c
    ),
    json_object(
      'name', NEW.name,
      'field_1P96q__c', NEW.field_1P96q__c,
      'contact__c', NEW.contact__c,
      'field_TJ18I__c', NEW.field_TJ18I__c
    ),
    CASE 
      WHEN OLD.name != NEW.name THEN json_array('name')
      ELSE json_array()
    END
  );
END;

CREATE TRIGGER IF NOT EXISTS track_sites_delete
AFTER DELETE ON object_8w9cb__c
FOR EACH ROW
BEGIN
  INSERT INTO d1_change_log (
    table_name, object_api_name, record_id, operation,
    old_values
  ) VALUES (
    'object_8w9cb__c', 'object_8W9cb__c', OLD._id, 'DELETE',
    json_object(
      'name', OLD.name,
      'field_1P96q__c', OLD.field_1P96q__c
    )
  );
END;

-- 為商機表創建觸發器
CREATE TRIGGER IF NOT EXISTS track_opportunities_insert
AFTER INSERT ON newopportunityobj
FOR EACH ROW
BEGIN
  INSERT INTO d1_change_log (
    table_name, object_api_name, record_id, operation, 
    new_values
  ) VALUES (
    'newopportunityobj', 'NewOpportunityObj', NEW._id, 'INSERT',
    json_object(
      'opportunity_name', NEW.opportunity_name,
      'amount', NEW.amount,
      'stage', NEW.stage
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS track_opportunities_update
AFTER UPDATE ON newopportunityobj
FOR EACH ROW
WHEN OLD.sync_time != NEW.sync_time
BEGIN
  INSERT INTO d1_change_log (
    table_name, object_api_name, record_id, operation,
    old_values, new_values
  ) VALUES (
    'newopportunityobj', 'NewOpportunityObj', NEW._id, 'UPDATE',
    json_object(
      'opportunity_name', OLD.opportunity_name,
      'amount', OLD.amount,
      'stage', OLD.stage
    ),
    json_object(
      'opportunity_name', NEW.opportunity_name,
      'amount', NEW.amount,
      'stage', NEW.stage
    )
  );
END;