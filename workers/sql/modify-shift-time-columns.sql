-- 方案二：完全以 CRM 為準
-- CRM 只有 shift_time__c 和 shift_time__c__v 兩個欄位

-- 1. 先添加 shift_time__c__v 欄位（如果不存在）
ALTER TABLE object_8w9cb__c ADD COLUMN IF NOT EXISTS shift_time__c__v TEXT;

-- 2. SQLite 不支援 DROP COLUMN，但 Cloudflare D1 可能支援
-- 嘗試刪除不需要的欄位
ALTER TABLE object_8w9cb__c DROP COLUMN shift_time__c__r;
ALTER TABLE object_8w9cb__c DROP COLUMN shift_time__c__relation_ids;