-- 創建欄位權限對應表
CREATE TABLE IF NOT EXISTS field_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 對象資訊
  object_api_name TEXT NOT NULL,       -- 對象API名稱 (如 object_8W9cb__c)
  object_display_name TEXT,            -- 對象顯示名稱 (如 案場(SPC))
  
  -- 欄位資訊  
  field_api_name TEXT NOT NULL,        -- 欄位API名稱 (如 field_XuJP2__c)
  field_display_name TEXT,             -- 欄位顯示名稱 (如 戶別)
  field_type TEXT,                     -- 欄位類型 (如 TEXT, INTEGER, BOOLEAN)
  
  -- 權限設定
  can_edit_by_worker BOOLEAN DEFAULT FALSE,   -- 工班是否可編輯
  can_edit_by_owner BOOLEAN DEFAULT FALSE,    -- 業主是否可編輯
  can_edit_by_admin BOOLEAN DEFAULT TRUE,     -- 管理員是否可編輯 (預設都可以)
  
  -- 權限描述
  edit_description TEXT,               -- 編輯權限說明
  business_rules TEXT,                 -- 業務規則說明
  
  -- 系統資訊
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 唯一約束：同一對象的同一欄位只能有一條記錄
  UNIQUE(object_api_name, field_api_name)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_field_permissions_object ON field_permissions(object_api_name);
CREATE INDEX IF NOT EXISTS idx_field_permissions_field ON field_permissions(field_api_name);
CREATE INDEX IF NOT EXISTS idx_field_permissions_worker ON field_permissions(can_edit_by_worker);
CREATE INDEX IF NOT EXISTS idx_field_permissions_owner ON field_permissions(can_edit_by_owner);

-- 插入案場(SPC)的預設權限設定
INSERT OR IGNORE INTO field_permissions (
  object_api_name, object_display_name, field_api_name, field_display_name, field_type,
  can_edit_by_worker, can_edit_by_owner, can_edit_by_admin, edit_description
) VALUES 
-- 基本資訊 - 通常只有管理員可編輯
('object_8W9cb__c', '案場(SPC)', 'name', '案場名稱', 'TEXT', FALSE, FALSE, TRUE, '基本資訊，只有管理員可修改'),
('object_8W9cb__c', '案場(SPC)', 'field_XuJP2__c', '戶別', 'TEXT', FALSE, FALSE, TRUE, '基本資訊，只有管理員可修改'),
('object_8W9cb__c', '案場(SPC)', 'field_Q6Svh__c', '樓層', 'INTEGER', FALSE, FALSE, TRUE, '基本資訊，只有管理員可修改'),
('object_8W9cb__c', '案場(SPC)', 'field_tXAko__c', '工地坪數', 'REAL', FALSE, FALSE, TRUE, '基本資訊，只有管理員可修改'),

-- 施工相關 - 工班可編輯
('object_8W9cb__c', '案場(SPC)', 'field_sF6fn__c', '施工前備註', 'TEXT', TRUE, FALSE, TRUE, '工班可填寫施工前的備註'),
('object_8W9cb__c', '案場(SPC)', 'field_W2i6j__c', '施工前缺失', 'TEXT', TRUE, FALSE, TRUE, '工班可上傳施工前發現的缺失照片'),
('object_8W9cb__c', '案場(SPC)', 'field_g18hX__c', '工地備註', 'TEXT', TRUE, FALSE, TRUE, '工班可填寫工地相關備註'),
('object_8W9cb__c', '案場(SPC)', 'construction_completed__c', '施工完成', 'BOOLEAN', TRUE, FALSE, TRUE, '工班可標記施工是否完成'),
('object_8W9cb__c', '案場(SPC)', 'field_3Fqof__c', '完工照片', 'TEXT', TRUE, FALSE, TRUE, '工班可上傳完工照片'),

-- 驗收相關 - 業主可編輯
('object_8W9cb__c', '案場(SPC)', 'field_n37jC__c', '驗收備註', 'TEXT', FALSE, TRUE, TRUE, '業主可填寫驗收相關備註'),

-- 階段狀態 - 工班和業主都可更新
('object_8W9cb__c', '案場(SPC)', 'field_z9H6O__c', '階段', 'TEXT', TRUE, TRUE, TRUE, '工班和業主都可更新施工階段'),

-- 系統記錄 - 只有管理員
('object_8W9cb__c', '案場(SPC)', 'modification_record__c', '修改記錄', 'TEXT', FALSE, FALSE, TRUE, '系統自動維護的修改日誌，只有管理員可查看');

-- 插入案場(浴櫃)的預設權限設定
INSERT OR IGNORE INTO field_permissions (
  object_api_name, object_display_name, field_api_name, field_display_name, field_type,
  can_edit_by_worker, can_edit_by_owner, can_edit_by_admin, edit_description
) VALUES 
-- 基本資訊
('site_cabinet__c', '案場(浴櫃)', 'name', '案場名稱', 'TEXT', FALSE, FALSE, TRUE, '基本資訊，只有管理員可修改'),
('site_cabinet__c', '案場(浴櫃)', 'field_XuJP2__c', '戶別', 'TEXT', FALSE, FALSE, TRUE, '基本資訊，只有管理員可修改'),
('site_cabinet__c', '案場(浴櫃)', 'field_Q6Svh__c', '樓層', 'INTEGER', FALSE, FALSE, TRUE, '基本資訊，只有管理員可修改'),

-- 施工相關 - 工班可編輯
('site_cabinet__c', '案場(浴櫃)', 'construction_completed__c', '施工完成', 'BOOLEAN', TRUE, FALSE, TRUE, '工班可標記施工是否完成'),
('site_cabinet__c', '案場(浴櫃)', 'field_3Fqof__c', '完工照片', 'TEXT', TRUE, FALSE, TRUE, '工班可上傳完工照片'),

-- 系統記錄
('site_cabinet__c', '案場(浴櫃)', 'modification_record__c', '修改記錄', 'TEXT', FALSE, FALSE, TRUE, '系統自動維護的修改日誌，只有管理員可查看');