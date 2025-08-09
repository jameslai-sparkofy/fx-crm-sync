-- 更新一條記錄的 shift_time
UPDATE object_8w9cb__c 
SET 
  shift_time__c = '築愛家有限公司',
  shift_time__c__r = '{"name":"築愛家有限公司","id":"66ff5c7270343b0001f80476"}',
  shift_time__c__relation_ids = '66ff5c7270343b0001f80476'
WHERE name = '25-07-14-3556';

-- 查詢更新的結果
SELECT 
  name,
  shift_time__c,
  shift_time__c__r,
  shift_time__c__relation_ids
FROM object_8w9cb__c 
WHERE name = '25-07-14-3556';