-- 優化版：重建 object_8w9cb__c 表
-- 只包含 CRM 實際使用的 50 個欄位 + 4 個 D1 系統欄位 = 54 個欄位
-- 2025-08-09

-- 步驟 1: 備份現有表
ALTER TABLE object_8w9cb__c RENAME TO object_8w9cb__c_backup;

-- 步驟 2: 創建新表（54 個欄位，遠低於 100 的限制）
CREATE TABLE object_8w9cb__c (
    -- 核心識別欄位 (2)
    _id TEXT PRIMARY KEY,
    name TEXT,
    
    -- 擁有者相關 (5)
    owner TEXT,
    owner__r TEXT,
    owner__l TEXT,  -- CRM 有，D1 之前沒有
    owner_department TEXT,
    owner_department_id TEXT,
    
    -- 創建相關 (4)
    create_time INTEGER,
    created_by TEXT,
    created_by__r TEXT,
    created_by__l TEXT,  -- CRM 有，D1 之前沒有
    
    -- 修改相關 (4)
    last_modified_time INTEGER,
    last_modified_by TEXT,
    last_modified_by__r TEXT,
    last_modified_by__l TEXT,  -- CRM 有，D1 之前沒有
    
    -- 數據部門相關 (3)
    data_own_department TEXT,
    data_own_department__r TEXT,
    data_own_department__l TEXT,  -- CRM 有，D1 之前沒有
    
    -- 狀態相關 (5)
    life_status TEXT,
    life_status__r TEXT,
    lock_status TEXT,
    lock_status__r TEXT,
    is_deleted TEXT,
    
    -- 系統欄位 (6)
    version TEXT,
    record_type TEXT,
    relevant_team TEXT,
    relevant_team__r TEXT,  -- CRM 有，D1 之前沒有
    total_num TEXT,
    searchAfterId TEXT,  -- CRM 有，D1 之前沒有
    
    -- 工班欄位 - 完全按 CRM 結構 (2)
    shift_time__c TEXT,
    shift_time__c__v TEXT,  -- CRM 有，D1 之前沒有
    
    -- field 系列 - 只包含 CRM 實際有的 (17)
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
    
    -- D1 系統欄位 (4)
    sync_version INTEGER DEFAULT 0,
    fx_created_at TEXT,
    fx_updated_at TEXT,
    sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 步驟 3: 創建索引
CREATE INDEX idx_object_8w9cb__c_modified ON object_8w9cb__c(last_modified_time);
CREATE INDEX idx_object_8w9cb__c_owner ON object_8w9cb__c(owner);
CREATE INDEX idx_object_8w9cb__c_dept ON object_8w9cb__c(owner_department_id);
CREATE INDEX idx_object_8w9cb__c_status ON object_8w9cb__c(life_status);
CREATE INDEX idx_object_8w9cb__c_shift ON object_8w9cb__c(shift_time__c);

-- 步驟 4: 從備份表複製數據（只複製共同欄位）
INSERT INTO object_8w9cb__c (
    -- 複製 43 個共同欄位
    _id, name, owner, owner__r, owner_department, owner_department_id,
    create_time, created_by, created_by__r,
    last_modified_time, last_modified_by, last_modified_by__r,
    data_own_department, data_own_department__r,
    life_status, life_status__r, lock_status, lock_status__r, is_deleted,
    version, record_type, relevant_team, total_num,
    shift_time__c,
    field_1P96q__c, field_1P96q__c__r, field_1P96q__c__relation_ids,
    field_23Z5i__c, field_23Z5i__c__r,
    field_B2gh1__c, field_Q6Svh__c, field_WD7k1__c, field_XuJP2__c,
    field_dxr31__c, field_dxr31__c__r, field_i2Q1g__c,
    field_k7e6q__c, field_k7e6q__c__r, field_k7e6q__c__relation_ids,
    field_npLvn__c, field_npLvn__c__r, field_npLvn__c__relation_ids,
    field_tXAko__c,
    -- D1 系統欄位
    sync_version, fx_created_at, fx_updated_at, sync_time
)
SELECT 
    _id, name, owner, owner__r, owner_department, owner_department_id,
    create_time, created_by, created_by__r,
    last_modified_time, last_modified_by, last_modified_by__r,
    data_own_department, data_own_department__r,
    life_status, life_status__r, lock_status, lock_status__r, is_deleted,
    version, record_type, relevant_team, total_num,
    shift_time__c,
    field_1P96q__c, field_1P96q__c__r, field_1P96q__c__relation_ids,
    field_23Z5i__c, field_23Z5i__c__r,
    field_B2gh1__c, field_Q6Svh__c, field_WD7k1__c, field_XuJP2__c,
    field_dxr31__c, field_dxr31__c__r, field_i2Q1g__c,
    field_k7e6q__c, field_k7e6q__c__r, field_k7e6q__c__relation_ids,
    field_npLvn__c, field_npLvn__c__r, field_npLvn__c__relation_ids,
    field_tXAko__c,
    sync_version, fx_created_at, fx_updated_at, sync_time
FROM object_8w9cb__c_backup;

-- 步驟 5: 將舊的 shift_time__c__relation_ids 值複製到新的 shift_time__c__v
UPDATE object_8w9cb__c 
SET shift_time__c__v = (
    SELECT shift_time__c__relation_ids 
    FROM object_8w9cb__c_backup 
    WHERE object_8w9cb__c_backup._id = object_8w9cb__c._id
)
WHERE EXISTS (
    SELECT 1 FROM object_8w9cb__c_backup 
    WHERE object_8w9cb__c_backup._id = object_8w9cb__c._id 
    AND shift_time__c__relation_ids IS NOT NULL
);

-- 步驟 6: 驗證
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN shift_time__c IS NOT NULL THEN 1 END) as with_shift_name,
    COUNT(CASE WHEN shift_time__c__v IS NOT NULL THEN 1 END) as with_shift_id
FROM object_8w9cb__c;

-- 步驟 7: 確認無誤後，可以刪除備份表
-- DROP TABLE object_8w9cb__c_backup;