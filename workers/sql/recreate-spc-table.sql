-- 重建案場(SPC)表，只包含最新的欄位定義
-- 基於 案場對象及欄位API0816.csv

-- 1. 備份現有資料到臨時表
CREATE TABLE IF NOT EXISTS object_8w9cb__c_backup AS 
SELECT * FROM object_8w9cb__c;

-- 2. 刪除舊表
DROP TABLE IF EXISTS object_8w9cb__c;

-- 3. 創建新表（只包含 CSV 中定義的欄位）
CREATE TABLE object_8w9cb__c (
    -- 主鍵
    _id TEXT PRIMARY KEY,
    
    -- 基本資訊
    name TEXT,                           -- 編號（自增编号）
    tenant_id TEXT,                      -- tenant_id（必填）
    object_describe_api_name TEXT,       -- object_describe_api_name（必填）
    
    -- 系統欄位
    create_time INTEGER,                 -- 创建时间
    created_by TEXT,                     -- 创建人
    last_modified_time INTEGER,          -- 最后修改时间
    last_modified_by TEXT,               -- 最后修改人
    owner TEXT,                          -- 负责人（必填）
    owner_department TEXT,               -- 负责人主属部门
    data_own_department TEXT,            -- 归属部门
    
    -- 狀態欄位
    life_status TEXT,                    -- 生命状态
    life_status_before_invalid TEXT,     -- 作废前生命状态
    lock_status TEXT,                    -- 锁定状态
    lock_rule TEXT,                      -- 锁定规则
    lock_user TEXT,                      -- 加锁人
    is_deleted INTEGER DEFAULT 0,        -- is_deleted
    
    -- 業務欄位
    field_1P96q__c TEXT,                 -- 商機（查找关联）
    field_dxr31__c TEXT,                 -- 案場類型
    field_z9H6O__c TEXT,                 -- 階段
    field_23Z5i__c TEXT,                 -- 標籤（多选）
    bad_case_scene__c INTEGER DEFAULT 0, -- 做壞案場
    construction_completed__c INTEGER DEFAULT 0, -- 施工完成
    
    -- 工班相關
    shift_time__c TEXT,                  -- 工班（引用字段）
    field_u1wpv__c TEXT,                 -- 工班師父
    work_shift_completion_note__c TEXT,  -- 工班施工完備註（新欄位）
    
    -- 建築資訊
    field_WD7k1__c TEXT,                 -- 棟別
    field_Q6Svh__c REAL,                 -- 樓層
    field_XuJP2__c TEXT,                 -- 戶別
    
    -- 坪數相關
    field_tXAko__c REAL,                 -- 工地坪數
    field_B2gh1__c REAL,                 -- 舖設坪數
    field_27g6n__c REAL,                 -- 保護板坪數
    field_i2Q1g__c REAL,                 -- 少請坪數（计算字段）
    
    -- 日期相關
    field_23pFq__c INTEGER,              -- 施工日期
    field_f0mz3__c INTEGER,              -- 保固日期
    
    -- 照片欄位（圖片類型）
    field_3T38o__c TEXT,                 -- 平面圖
    field_V3d91__c TEXT,                 -- 施工前照片
    field_03U9h__c TEXT,                 -- 工地狀況照片(施工前)
    construction_difficulty_ph__c TEXT,  -- 工地狀況照片(施工後)（新欄位）
    field_3Fqof__c TEXT,                 -- 完工照片
    field_v1x3S__c TEXT,                 -- 驗收照片
    field_W2i6j__c TEXT,                 -- 施工前缺失
    field_1zk34__c TEXT,                 -- 缺失影片（附件）
    
    -- 備註欄位
    field_sF6fn__c TEXT,                 -- 施工前備註
    field_g18hX__c TEXT,                 -- 工地備註（多行文本）
    field_sijGR__c TEXT,                 -- 維修備註1
    field_n37jC__c TEXT,                 -- 驗收備註
    modification_record__c TEXT,         -- 修改記錄（big_text）
    
    -- 關聯欄位
    field_npLvn__c TEXT,                 -- 請款單（查找关联）
    field_k7e6q__c TEXT,                 -- 工單（查找关联）
    
    -- 其他
    relevant_team TEXT,                  -- 相关团队
    record_type TEXT,                    -- 业务类型
    version TEXT,                        -- version
    package TEXT,                        -- package
    origin_source TEXT,                  -- 数据来源
    out_owner TEXT,                      -- 外部负责人
    out_tenant_id TEXT,                  -- 外部企业
    order_by INTEGER,                    -- order_by
    
    -- 同步相關（非 CSV 定義，但系統需要）
    sync_version INTEGER DEFAULT 0,
    sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 創建索引
CREATE INDEX idx_spc_name ON object_8w9cb__c(name);
CREATE INDEX idx_spc_life_status ON object_8w9cb__c(life_status);
CREATE INDEX idx_spc_field_1P96q__c ON object_8w9cb__c(field_1P96q__c);
CREATE INDEX idx_spc_last_modified ON object_8w9cb__c(last_modified_time);
CREATE INDEX idx_spc_created ON object_8w9cb__c(create_time);

-- 5. 從備份表恢復資料（只複製存在的欄位）
INSERT INTO object_8w9cb__c (
    _id, name, tenant_id, object_describe_api_name,
    create_time, created_by, last_modified_time, last_modified_by,
    owner, owner_department, data_own_department,
    life_status, lock_status, is_deleted,
    field_1P96q__c, field_dxr31__c, field_23Z5i__c,
    bad_case_scene__c, construction_completed__c,
    field_WD7k1__c, field_Q6Svh__c, field_XuJP2__c,
    field_tXAko__c, field_i2Q1g__c,
    relevant_team, record_type, version,
    sync_version, sync_time
)
SELECT 
    _id, name, 
    COALESCE(tenant_id, '781014') as tenant_id,
    COALESCE(object_describe_api_name, 'object_8W9cb__c') as object_describe_api_name,
    create_time, created_by, last_modified_time, last_modified_by,
    owner, owner_department, data_own_department,
    life_status, lock_status, is_deleted,
    field_1P96q__c, field_dxr31__c, field_23Z5i__c,
    bad_case_scene__c, construction_completed__c,
    field_WD7k1__c, field_Q6Svh__c, field_XuJP2__c,
    field_tXAko__c, field_i2Q1g__c,
    relevant_team, record_type, version,
    sync_version, sync_time
FROM object_8w9cb__c_backup;

-- 6. 刪除備份表（執行成功後手動執行）
-- DROP TABLE object_8w9cb__c_backup;