-- 添加 shift_time__c 相關欄位到 object_8W9cb__c 表
-- CRM 實際有 shift_time__c（名稱）和 shift_time__c__v（ID）

-- 添加 shift_time__c 欄位（如果不存在）
ALTER TABLE object_8W9cb__c ADD COLUMN shift_time__c TEXT;

-- 添加 shift_time__c__v 欄位（如果不存在）
ALTER TABLE object_8W9cb__c ADD COLUMN shift_time__c__v TEXT;