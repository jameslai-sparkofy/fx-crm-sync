-- 重建工地師父表，只保留 CRM 中實際存在的欄位
-- 基於 2025-08-10 的 CRM 欄位結構

-- 1. 創建新表（只包含 CRM 實際欄位）
CREATE TABLE IF NOT EXISTS object_50hj8__c_new (
    -- 主鍵
    "_id" TEXT PRIMARY KEY,
    
    -- 基本資訊
    "name" TEXT,
    "abbreviation__c" TEXT,
    "account__c" TEXT,
    "phone_number__c" TEXT,
    "password__c" TEXT,
    
    -- 負責人相關
    "owner" TEXT,
    "owner__l" TEXT,
    "owner__r" TEXT,
    "owner_department" TEXT,
    "owner_department_id" TEXT,
    
    -- 時間戳記
    "create_time" REAL,
    "created_by" TEXT,
    "created_by__l" TEXT,
    "created_by__r" TEXT,
    "last_modified_time" REAL,
    "last_modified_by" TEXT,
    "last_modified_by__l" TEXT,
    "last_modified_by__r" TEXT,
    
    -- 狀態欄位
    "life_status" TEXT,
    "life_status__r" TEXT,
    "lock_status" TEXT,
    "lock_status__r" TEXT,
    "is_deleted" BOOLEAN,
    
    -- 資料歸屬
    "data_own_department" TEXT,
    "data_own_department__l" TEXT,
    "data_own_department__r" TEXT,
    
    -- 相關團隊
    "relevant_team" TEXT,
    "relevant_team__r" TEXT,
    
    -- 其他欄位
    "field_Imtt7__c" TEXT,
    "record_type" TEXT,
    "version" TEXT,
    "total_num" REAL,
    
    -- 同步相關欄位（系統自動維護）
    "fx_created_at" INTEGER,
    "fx_updated_at" INTEGER,
    "sync_version" INTEGER DEFAULT 0,
    "sync_time" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 從舊表複製資料到新表
INSERT INTO object_50hj8__c_new (
    _id, name, abbreviation__c, account__c, phone_number__c, password__c,
    owner, owner__l, owner__r, owner_department, owner_department_id,
    create_time, created_by, created_by__l, created_by__r,
    last_modified_time, last_modified_by, last_modified_by__l, last_modified_by__r,
    life_status, life_status__r, lock_status, lock_status__r, is_deleted,
    data_own_department, data_own_department__l, data_own_department__r,
    relevant_team, relevant_team__r, field_Imtt7__c,
    record_type, version, total_num,
    fx_created_at, fx_updated_at, sync_version, sync_time
)
SELECT 
    _id, name, abbreviation__c, account__c, phone_number__c, password__c,
    owner, owner__l, owner__r, owner_department, owner_department_id,
    create_time, created_by, created_by__l, created_by__r,
    last_modified_time, last_modified_by, last_modified_by__l, last_modified_by__r,
    life_status, life_status__r, lock_status, lock_status__r, is_deleted,
    data_own_department, data_own_department__l, data_own_department__r,
    relevant_team, relevant_team__r, field_Imtt7__c,
    record_type, version, total_num,
    fx_created_at, fx_updated_at, sync_version, sync_time
FROM object_50hj8__c;

-- 3. 刪除舊表
DROP TABLE object_50hj8__c;

-- 4. 重命名新表為原始名稱
ALTER TABLE object_50hj8__c_new RENAME TO object_50hj8__c;

-- 5. 創建索引（如果需要）
CREATE INDEX IF NOT EXISTS idx_50hj8_life_status ON object_50hj8__c(life_status);
CREATE INDEX IF NOT EXISTS idx_50hj8_last_modified ON object_50hj8__c(last_modified_time);