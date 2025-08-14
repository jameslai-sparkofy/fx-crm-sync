-- 刪除舊版員工相關資料表
-- 執行時間：2025-08-13

-- 1. 刪除舊版員工表
DROP TABLE IF EXISTS employees;

-- 2. 刪除員工部門關聯表
DROP TABLE IF EXISTS employee_departments;

-- 3. 刪除員工詳情視圖
DROP VIEW IF EXISTS employee_details;

-- 4. 刪除任何相關索引
DROP INDEX IF EXISTS idx_employees_open_user_id;
DROP INDEX IF EXISTS idx_employee_departments_employee_id;
DROP INDEX IF EXISTS idx_employee_departments_department_id;

-- 註解：
-- 新版簡化員工系統使用 employees_simple 表
-- 該表只包含必要欄位：姓名、主部門、副部門、電話、email
-- 舊版表格已不再使用，可安全刪除