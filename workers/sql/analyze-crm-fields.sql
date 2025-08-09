-- CRM 實際返回的 50 個欄位分析
-- 基於 2025-08-09 從 CRM API 獲取的實際數據

-- 1. 核心識別欄位 (2個)
-- _id: 記錄唯一識別碼
-- name: 案場名稱

-- 2. 擁有者相關欄位 (5個)
-- owner: 擁有者ID
-- owner__r: 擁有者詳細資訊（JSON）
-- owner__l: 擁有者列表
-- owner_department: 擁有者部門
-- owner_department_id: 擁有者部門ID

-- 3. 創建者相關欄位 (3個)  
-- created_by: 創建者ID
-- created_by__r: 創建者詳細資訊（JSON）
-- created_by__l: 創建者列表

-- 4. 修改者相關欄位 (3個)
-- last_modified_by: 最後修改者ID
-- last_modified_by__r: 最後修改者詳細資訊（JSON）
-- last_modified_by__l: 最後修改者列表

-- 5. 數據部門相關欄位 (3個)
-- data_own_department: 數據所屬部門ID
-- data_own_department__r: 數據所屬部門詳細資訊（JSON）
-- data_own_department__l: 數據所屬部門列表

-- 6. 時間相關欄位 (2個)
-- create_time: 創建時間（毫秒時間戳）
-- last_modified_time: 最後修改時間（毫秒時間戳）

-- 7. 狀態相關欄位 (5個)
-- life_status: 生命週期狀態
-- life_status__r: 生命週期狀態說明
-- lock_status: 鎖定狀態
-- lock_status__r: 鎖定狀態說明
-- is_deleted: 是否刪除

-- 8. 工班相關欄位 (2個) ★重要★
-- shift_time__c: 工班名稱（如"築愛家有限公司"）
-- shift_time__c__v: 工班ID（如"66ff5c7270343b0001f80476"）

-- 9. 自定義欄位 - field 系列 (17個主欄位 + 6個關聯欄位)
-- 主欄位：
-- field_1P96q__c, field_23Z5i__c, field_B2gh1__c, field_Q6Svh__c
-- field_WD7k1__c, field_XuJP2__c, field_dxr31__c, field_i2Q1g__c
-- field_k7e6q__c, field_npLvn__c, field_tXAko__c

-- 關聯欄位（_r 和 _relation_ids）：
-- field_1P96q__c__r, field_1P96q__c__relation_ids
-- field_23Z5i__c__r
-- field_dxr31__c__r
-- field_k7e6q__c__r, field_k7e6q__c__relation_ids
-- field_npLvn__c__r, field_npLvn__c__relation_ids

-- 10. 其他系統欄位 (4個)
-- version: 版本號
-- record_type: 記錄類型
-- relevant_team: 相關團隊（JSON）
-- relevant_team__r: 相關團隊詳細資訊
-- total_num: 總數
-- searchAfterId: 搜索標識

-- 總結：
-- CRM 返回 50 個欄位
-- 包含 2 個 shift_time 欄位（shift_time__c 和 shift_time__c__v）
-- 某些 field 欄位有三個版本（基礎、__r、__relation_ids）
-- 某些 field 欄位只有兩個版本（基礎、__r）
-- 某些 field 欄位只有基礎版本