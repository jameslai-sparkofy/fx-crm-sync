-- 檢查 shift_time 欄位狀態

-- 1. 總記錄數
SELECT 'Total Records' as metric, COUNT(*) as count FROM object_8W9cb__c;

-- 2. shift_time__c 非空記錄數
SELECT 'shift_time__c not null' as metric, COUNT(*) as count 
FROM object_8W9cb__c 
WHERE shift_time__c IS NOT NULL AND shift_time__c != '';

-- 3. shift_time__c__r 非空記錄數
SELECT 'shift_time__c__r not null' as metric, COUNT(*) as count 
FROM object_8W9cb__c 
WHERE shift_time__c__r IS NOT NULL AND shift_time__c__r != '';

-- 4. shift_time__c__relation_ids 非空記錄數
SELECT 'shift_time__c__relation_ids not null' as metric, COUNT(*) as count 
FROM object_8W9cb__c 
WHERE shift_time__c__relation_ids IS NOT NULL AND shift_time__c__relation_ids != '';

-- 5. 查看前5條記錄的 shift_time 值
SELECT 
  name,
  shift_time__c,
  shift_time__c__r,
  shift_time__c__relation_ids
FROM object_8W9cb__c 
WHERE name IN ('25-07-14-3556', '25-07-14-3557', '25-07-14-3558', '25-07-14-3559', '25-07-14-3560')
LIMIT 5;