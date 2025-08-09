-- 為 object_8W9cb__c 表添加缺失的欄位
-- 根據 案場(SPC)對象及欄位API.csv 生成

-- 1. 添加 shift_time__c (工班) - 引用字段
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS shift_time__c TEXT;
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS shift_time__c__r TEXT;
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS shift_time__c__relation_ids TEXT;

-- 2. 添加其他缺失的圖片欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_3T38o__c TEXT; -- 平面圖
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_V3d91__c TEXT; -- 施工前照片
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_v1x3S__c TEXT; -- 驗收照片
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_03U9h__c TEXT; -- 工地狀況照片
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_3Fqof__c TEXT; -- 完工照片
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_W2i6j__c TEXT; -- 施工前缺失

-- 3. 添加文本欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_u1wpv__c TEXT; -- 工班師父
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_sF6fn__c TEXT; -- 施工前備註
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_sijGR__c TEXT; -- 維修備註1
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_V32Xl__c TEXT; -- 工班備註
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_n37jC__c TEXT; -- 驗收備註
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_g18hX__c TEXT; -- 工地備註

-- 4. 添加數字欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_27g6n__c REAL; -- 保護板坪數
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_B2gh1__c REAL; -- 舖設坪數

-- 5. 添加日期欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_23pFq__c TEXT; -- 施工日期
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_f0mz3__c TEXT; -- 保固日期

-- 6. 添加布爾值欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS bad_case_scene__c BOOLEAN DEFAULT FALSE; -- 做壞案場
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS construction_completed__c BOOLEAN DEFAULT FALSE; -- 施工完成

-- 7. 添加系統欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS lock_rule TEXT; -- 鎖定規則
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS life_status_before_invalid TEXT; -- 作廢前生命狀態
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS package TEXT; -- package
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS tenant_id TEXT; -- tenant_id
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS origin_source TEXT; -- 數據來源
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS lock_user TEXT; -- 加鎖人
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS lock_user__r TEXT; -- 加鎖人詳情
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS object_describe_api_name TEXT; -- object_describe_api_name
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS out_owner TEXT; -- 外部負責人
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS out_owner__r TEXT; -- 外部負責人詳情
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS out_tenant_id TEXT; -- 外部企業

-- 8. 添加附件欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_1zk34__c TEXT; -- 缺失影片

-- 9. 添加階段選項欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_z9H6O__c TEXT; -- 階段
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS field_z9H6O__c__r TEXT; -- 階段詳情

-- 10. 添加排序欄位
ALTER TABLE object_8W9cb__c ADD COLUMN IF NOT EXISTS order_by INTEGER; -- order_by

-- 檢查並顯示表結構
SELECT sql FROM sqlite_master WHERE name = 'object_8W9cb__c';