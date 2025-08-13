-- 簡化的員工表結構
DROP TABLE IF EXISTS employees_simple;

CREATE TABLE employees_simple (
  open_user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  main_department_id TEXT,
  sub_department_ids TEXT, -- JSON格式存儲副部門ID列表
  mobile TEXT,
  email TEXT,
  sync_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (main_department_id) REFERENCES departments(id)
);

-- 簡化的員工部門視圖
DROP VIEW IF EXISTS employee_departments_simple;

CREATE VIEW employee_departments_simple AS
SELECT 
  es.open_user_id,
  es.name,
  es.mobile,
  es.email,
  md.name as main_department_name,
  es.main_department_id,
  es.sub_department_ids,
  es.sync_time
FROM employees_simple es
LEFT JOIN departments md ON md.id = es.main_department_id;