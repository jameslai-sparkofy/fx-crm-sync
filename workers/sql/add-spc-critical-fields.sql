-- 新增案場(SPC)最重要的兩個新欄位
-- 這兩個欄位已經有實際資料

-- 1. construction_difficulty_ph__c: 工地狀況照片(施工後) - 圖片類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN construction_difficulty_ph__c TEXT;

-- 2. work_shift_completion_note__c: 工班施工完備註 - 多行文本類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN work_shift_completion_note__c TEXT;