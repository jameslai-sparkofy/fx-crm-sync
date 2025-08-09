-- 重建 object_8w9cb__c 表
-- 完全基於 CRM API 返回的實際欄位結構
-- 2025-08-09

-- 步驟 1: 重命名舊表作為備份
ALTER TABLE object_8w9cb__c RENAME TO object_8w9cb__c_backup_20250809;

-- 步驟 2: 創建新表（基於 CRM 實際返回的 50 個欄位 + 4 個系統欄位）
CREATE TABLE object_8w9cb__c (
    -- 核心識別欄位
    _id TEXT PRIMARY KEY,
    name TEXT,
    
    -- 擁有者相關
    owner TEXT,
    owner__r TEXT,
    owner__l TEXT,
    owner_department TEXT,
    owner_department_id TEXT,
    
    -- 創建者相關
    created_by TEXT,
    created_by__r TEXT,
    created_by__l TEXT,
    create_time INTEGER,
    
    -- 修改者相關
    last_modified_by TEXT,
    last_modified_by__r TEXT,
    last_modified_by__l TEXT,
    last_modified_time INTEGER,
    
    -- 數據部門相關
    data_own_department TEXT,
    data_own_department__r TEXT,
    data_own_department__l TEXT,
    
    -- 狀態相關
    life_status TEXT,
    life_status__r TEXT,
    lock_status TEXT,
    lock_status__r TEXT,
    is_deleted TEXT,
    
    -- 系統欄位
    version TEXT,
    record_type TEXT,
    relevant_team TEXT,
    relevant_team__r TEXT,
    total_num TEXT,
    searchAfterId TEXT,
    
    -- 工班欄位（完全按照 CRM 結構）
    shift_time__c TEXT,
    shift_time__c__v TEXT,
    
    -- field 系列欄位
    field_1P96q__c TEXT,
    field_1P96q__c__r TEXT,
    field_1P96q__c__relation_ids TEXT,
    
    field_23Z5i__c TEXT,
    field_23Z5i__c__r TEXT,
    
    field_B2gh1__c TEXT,
    field_Q6Svh__c TEXT,
    field_WD7k1__c TEXT,
    field_XuJP2__c TEXT,
    
    field_dxr31__c TEXT,
    field_dxr31__c__r TEXT,
    
    field_i2Q1g__c TEXT,
    
    field_k7e6q__c TEXT,
    field_k7e6q__c__r TEXT,
    field_k7e6q__c__relation_ids TEXT,
    
    field_npLvn__c TEXT,
    field_npLvn__c__r TEXT,
    field_npLvn__c__relation_ids TEXT,
    
    field_tXAko__c TEXT,
    
    -- D1 系統欄位（用於同步管理）
    sync_version INTEGER DEFAULT 0,
    fx_created_at TEXT,
    fx_updated_at TEXT,
    sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 步驟 3: 創建索引以提高查詢性能
CREATE INDEX idx_object_8w9cb__c_last_modified ON object_8w9cb__c(last_modified_time);
CREATE INDEX idx_object_8w9cb__c_owner ON object_8w9cb__c(owner);
CREATE INDEX idx_object_8w9cb__c_department ON object_8w9cb__c(owner_department_id);
CREATE INDEX idx_object_8w9cb__c_life_status ON object_8w9cb__c(life_status);
CREATE INDEX idx_object_8w9cb__c_shift_time ON object_8w9cb__c(shift_time__c);

-- 步驟 4: 從備份表恢復數據（只複製存在的欄位）
INSERT INTO object_8w9cb__c (
    _id, name, owner, owner__r, owner__l, owner_department, owner_department_id,
    created_by, created_by__r, created_by__l, create_time,
    last_modified_by, last_modified_by__r, last_modified_by__l, last_modified_time,
    data_own_department, data_own_department__r, data_own_department__l,
    life_status, life_status__r, lock_status, lock_status__r, is_deleted,
    version, record_type, relevant_team, relevant_team__r, total_num, searchAfterId,
    shift_time__c,
    -- shift_time__c__v 需要從 shift_time__c__relation_ids 複製（如果有的話）
    field_1P96q__c, field_1P96q__c__r, field_1P96q__c__relation_ids,
    field_23Z5i__c, field_23Z5i__c__r,
    field_B2gh1__c, field_Q6Svh__c, field_WD7k1__c, field_XuJP2__c,
    field_dxr31__c, field_dxr31__c__r,
    field_i2Q1g__c,
    field_k7e6q__c, field_k7e6q__c__r, field_k7e6q__c__relation_ids,
    field_npLvn__c, field_npLvn__c__r, field_npLvn__c__relation_ids,
    field_tXAko__c,
    sync_version, fx_created_at, fx_updated_at, sync_time
)
SELECT 
    _id, name, owner, owner__r, owner__l, owner_department, owner_department_id,
    created_by, created_by__r, created_by__l, create_time,
    last_modified_by, last_modified_by__r, last_modified_by__l, last_modified_time,
    data_own_department, data_own_department__r, data_own_department__l,
    life_status, life_status__r, lock_status, lock_status__r, is_deleted,
    version, record_type, relevant_team, relevant_team__r, total_num, searchAfterId,
    shift_time__c,
    field_1P96q__c, field_1P96q__c__r, field_1P96q__c__relation_ids,
    field_23Z5i__c, field_23Z5i__c__r,
    field_B2gh1__c, field_Q6Svh__c, field_WD7k1__c, field_XuJP2__c,
    field_dxr31__c, field_dxr31__c__r,
    field_i2Q1g__c,
    field_k7e6q__c, field_k7e6q__c__r, field_k7e6q__c__relation_ids,
    field_npLvn__c, field_npLvn__c__r, field_npLvn__c__relation_ids,
    field_tXAko__c,
    sync_version, fx_created_at, fx_updated_at, sync_time
FROM object_8w9cb__c_backup_20250809;

-- 步驟 5: 更新 shift_time__c__v 欄位（從舊的 relation_ids 複製）
UPDATE object_8w9cb__c 
SET shift_time__c__v = (
    SELECT shift_time__c__relation_ids 
    FROM object_8w9cb__c_backup_20250809 
    WHERE object_8w9cb__c_backup_20250809._id = object_8w9cb__c._id
)
WHERE EXISTS (
    SELECT 1 FROM object_8w9cb__c_backup_20250809 
    WHERE object_8w9cb__c_backup_20250809._id = object_8w9cb__c._id 
    AND shift_time__c__relation_ids IS NOT NULL
);

-- 步驟 6: 驗證數據
SELECT COUNT(*) as total_records FROM object_8w9cb__c;
SELECT COUNT(*) as records_with_shift_time FROM object_8w9cb__c WHERE shift_time__c IS NOT NULL;

-- 注意：執行完成後，如果確認數據正確，可以刪除備份表：
-- DROP TABLE object_8w9cb__c_backup_20250809;