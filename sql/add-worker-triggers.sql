-- 為工地師父表(object_50HJ8__c)創建變更追蹤觸發器
-- 用於啟用 D1→CRM 雙向同步

-- INSERT 觸發器
CREATE TRIGGER IF NOT EXISTS track_workers_insert
AFTER INSERT ON object_50hj8__c
FOR EACH ROW
BEGIN
  INSERT INTO d1_change_log (
    table_name, object_api_name, record_id, operation, 
    new_values, changed_fields
  ) VALUES (
    'object_50hj8__c', 'object_50HJ8__c', NEW._id, 'INSERT',
    json_object(
      'name', NEW.name,
      'phone_number__c', NEW.phone_number__c,
      'abbreviation__c', NEW.abbreviation__c,
      'account__c', NEW.account__c,
      'password__c', NEW.password__c
    ),
    json_array('name', 'phone_number__c', 'abbreviation__c', 'account__c', 'password__c')
  );
END;

-- UPDATE 觸發器
CREATE TRIGGER IF NOT EXISTS track_workers_update
AFTER UPDATE ON object_50hj8__c
FOR EACH ROW
WHEN OLD.sync_time != NEW.sync_time -- 避免同步操作觸發循環
BEGIN
  INSERT INTO d1_change_log (
    table_name, object_api_name, record_id, operation,
    old_values, new_values, changed_fields
  ) VALUES (
    'object_50hj8__c', 'object_50HJ8__c', NEW._id, 'UPDATE',
    json_object(
      'name', OLD.name,
      'phone_number__c', OLD.phone_number__c,
      'abbreviation__c', OLD.abbreviation__c,
      'account__c', OLD.account__c
    ),
    json_object(
      'name', NEW.name,
      'phone_number__c', NEW.phone_number__c,
      'abbreviation__c', NEW.abbreviation__c,
      'account__c', NEW.account__c
    ),
    json_array(
      CASE WHEN OLD.name != NEW.name THEN 'name' ELSE NULL END,
      CASE WHEN OLD.phone_number__c != NEW.phone_number__c THEN 'phone_number__c' ELSE NULL END,
      CASE WHEN OLD.abbreviation__c != NEW.abbreviation__c THEN 'abbreviation__c' ELSE NULL END,
      CASE WHEN OLD.account__c != NEW.account__c THEN 'account__c' ELSE NULL END
    )
  );
END;

-- DELETE 觸發器
CREATE TRIGGER IF NOT EXISTS track_workers_delete
AFTER DELETE ON object_50hj8__c
FOR EACH ROW
BEGIN
  INSERT INTO d1_change_log (
    table_name, object_api_name, record_id, operation,
    old_values
  ) VALUES (
    'object_50hj8__c', 'object_50HJ8__c', OLD._id, 'DELETE',
    json_object(
      'name', OLD.name,
      'phone_number__c', OLD.phone_number__c
    )
  );
END;