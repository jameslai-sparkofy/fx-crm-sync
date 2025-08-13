-- 員工表 (employees)
CREATE TABLE IF NOT EXISTS employees (
  -- 主鍵
  open_user_id TEXT PRIMARY KEY,
  
  -- 基本資訊
  enterprise_id INTEGER,
  account TEXT,
  full_name TEXT,
  name TEXT NOT NULL,
  nick_name TEXT,
  status TEXT,
  mobile TEXT,
  email TEXT,
  gender TEXT CHECK(gender IN ('M', 'F', '')),
  
  -- 職位資訊
  leader_id TEXT,
  leader_name TEXT,
  position TEXT,
  post TEXT,
  role TEXT,
  employee_number TEXT,
  
  -- 部門資訊
  main_department_ids TEXT,  -- JSON array
  department_ids TEXT,        -- JSON array
  department_names TEXT,      -- 部門名稱，逗號分隔
  
  -- 聯絡資訊
  telephone TEXT,
  qq TEXT,
  weixin TEXT,
  msn TEXT,
  extension_number TEXT,
  
  -- 個人資訊
  profile_image TEXT,
  description TEXT,
  birth_date TEXT,
  hire_date TEXT,
  start_work_date TEXT,
  
  -- 狀態資訊
  is_active BOOLEAN DEFAULT true,
  is_stop BOOLEAN DEFAULT false,
  working_state TEXT,
  stop_time INTEGER,
  
  -- 隱私設定
  mobile_status TEXT,  -- PUBLIC, PRIVATE 等
  mobile_setting TEXT, -- JSON object
  
  -- 系統資訊
  name_spell TEXT,
  name_order TEXT,
  create_time INTEGER,
  update_time INTEGER,
  
  -- 同步資訊
  sync_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  last_modified INTEGER
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_employees_mobile ON employees(mobile);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_leader ON employees(leader_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(main_department_ids);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active, is_stop);
CREATE INDEX IF NOT EXISTS idx_employees_update ON employees(update_time);

-- 部門表 (departments)
CREATE TABLE IF NOT EXISTS departments (
  -- 主鍵
  id INTEGER PRIMARY KEY,
  
  -- 部門資訊
  name TEXT NOT NULL,
  parent_id INTEGER DEFAULT 0,
  order_num INTEGER DEFAULT 0,
  is_stop BOOLEAN DEFAULT false,
  
  -- 部門層級
  level INTEGER DEFAULT 1,
  path TEXT,  -- 部門路徑，如 "999999,1000,1001"
  
  -- 統計資訊
  employee_count INTEGER DEFAULT 0,
  
  -- 系統資訊
  create_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  update_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  sync_time INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 創建部門索引
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_order ON departments(order_num);
CREATE INDEX IF NOT EXISTS idx_departments_stop ON departments(is_stop);

-- 員工部門關聯表 (employee_departments)
CREATE TABLE IF NOT EXISTS employee_departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  open_user_id TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  is_main BOOLEAN DEFAULT false,  -- 是否為主部門
  
  -- 外鍵約束
  FOREIGN KEY (open_user_id) REFERENCES employees(open_user_id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  
  -- 唯一約束
  UNIQUE(open_user_id, department_id)
);

-- 創建關聯表索引
CREATE INDEX IF NOT EXISTS idx_emp_dept_user ON employee_departments(open_user_id);
CREATE INDEX IF NOT EXISTS idx_emp_dept_dept ON employee_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_emp_dept_main ON employee_departments(is_main);

-- 員工同步日誌表
CREATE TABLE IF NOT EXISTS employee_sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,  -- 'full' or 'incremental'
  status TEXT NOT NULL,      -- 'success', 'failed', 'in_progress'
  total_count INTEGER,
  synced_count INTEGER,
  failed_count INTEGER,
  error_message TEXT,
  started_at INTEGER,
  completed_at INTEGER
);

-- 創建同步日誌索引
CREATE INDEX IF NOT EXISTS idx_emp_sync_logs_status ON employee_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_emp_sync_logs_time ON employee_sync_logs(started_at DESC);

-- 創建視圖：員工詳細資訊（包含部門名稱）
CREATE VIEW IF NOT EXISTS v_employee_details AS
SELECT 
  e.*,
  GROUP_CONCAT(d.name, ', ') as department_names_display,
  l.name as leader_name_display
FROM employees e
LEFT JOIN employee_departments ed ON e.open_user_id = ed.open_user_id
LEFT JOIN departments d ON ed.department_id = d.id
LEFT JOIN employees l ON e.leader_id = l.open_user_id
GROUP BY e.open_user_id;

-- 創建視圖：部門統計
CREATE VIEW IF NOT EXISTS v_department_stats AS
SELECT 
  d.*,
  COUNT(DISTINCT ed.open_user_id) as actual_employee_count,
  p.name as parent_name
FROM departments d
LEFT JOIN employee_departments ed ON d.id = ed.department_id
LEFT JOIN departments p ON d.parent_id = p.id
GROUP BY d.id;

-- 初始化系統部門（根據 API 返回的資料）
INSERT OR IGNORE INTO departments (id, name, parent_id, order_num, is_stop) VALUES
  (999999, '元心建材', 0, 0, false),
  (999998, '待分配', 999999, 8, false),
  (1000, '工務部門', 999999, 1, false),
  (1001, '業務一部', 999999, 2, false),
  (1002, '會計部門', 999999, 3, false),
  (1003, '管理部', 999999, 4, false),
  (1004, '經銷部門', 999999, 5, false),
  (1005, 'IT部門', 999999, 6, false),
  (1006, '業務二部', 999999, 7, false);