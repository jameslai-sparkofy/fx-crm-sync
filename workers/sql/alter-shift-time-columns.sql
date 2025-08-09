-- 添加 shift_time__c__v 欄位（與 CRM 一致）
ALTER TABLE object_8w9cb__c ADD COLUMN shift_time__c__v TEXT;

-- 註：SQLite 不支援 DROP COLUMN，所以 shift_time__c__r 和 shift_time__c__relation_ids 暫時保留
-- 但我們不會再使用它們