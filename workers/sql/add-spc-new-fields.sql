-- 新增案場(SPC)的新欄位
-- 根據 2025-08-16 的檢查結果，以下欄位在 CRM 中有值但 D1 資料庫還沒有

-- 1. construction_difficulty_ph__c: 工地狀況照片(施工後) - 圖片類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN construction_difficulty_ph__c TEXT;

-- 2. work_shift_completion_note__c: 工班施工完備註 - 多行文本類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN work_shift_completion_note__c TEXT;

-- 3. field_3Fqof__c: 完工照片 - 圖片類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN field_3Fqof__c TEXT;

-- 4. field_V3d91__c: 施工前照片 - 圖片類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN field_V3d91__c TEXT;

-- 其他可能的欄位（目前還沒有值，但定義存在）
-- field_03U9h__c: 工地狀況照片(施工前) - 圖片類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN field_03U9h__c TEXT;

-- field_sijGR__c: 維修備註1 - 單行文本類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN field_sijGR__c TEXT;

-- field_n37jC__c: 驗收備註 - 單行文本類型
ALTER TABLE object_8w9cb__c 
ADD COLUMN field_n37jC__c TEXT;