/**
 * 員工同步服務
 * 從紛享銷客同步員工和部門資料到 D1 資料庫
 */

export class EmployeeSyncService {
  constructor(db, fxClient) {
    this.db = db;
    this.fxClient = fxClient;
  }

  /**
   * 同步所有部門
   */
  async syncDepartments() {
    console.log('[EmployeeSync] 開始同步部門...');
    
    try {
      // 獲取部門列表
      const departments = await this.fxClient.getDepartmentList();
      
      if (!departments || departments.length === 0) {
        console.log('[EmployeeSync] 沒有部門資料');
        return { success: true, count: 0 };
      }

      // 批量插入或更新部門
      const statements = [];
      for (const dept of departments) {
        const stmt = this.db.prepare(`
          INSERT INTO departments (
            id, name, parent_id, order_num, is_stop, 
            update_time, sync_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            parent_id = excluded.parent_id,
            order_num = excluded.order_num,
            is_stop = excluded.is_stop,
            update_time = excluded.update_time,
            sync_time = excluded.sync_time
        `).bind(
          dept.id,
          dept.name,
          dept.parentId || 0,
          dept.order || 0,
          dept.isStop || false,
          Date.now(),
          Date.now()
        );
        statements.push(stmt);
      }

      // 批量執行
      if (statements.length > 0) {
        await this.db.batch(statements);
      }

      // 更新部門層級和路徑
      await this.updateDepartmentHierarchy();

      console.log(`[EmployeeSync] 成功同步 ${departments.length} 個部門`);
      return { success: true, count: departments.length };

    } catch (error) {
      console.error('[EmployeeSync] 部門同步失敗:', error);
      throw error;
    }
  }

  /**
   * 更新部門層級資訊
   */
  async updateDepartmentHierarchy() {
    // 遞迴更新部門路徑和層級
    const updatePath = async (deptId, parentPath = '', level = 1) => {
      const path = parentPath ? `${parentPath},${deptId}` : `${deptId}`;
      
      await this.db.prepare(`
        UPDATE departments 
        SET path = ?, level = ? 
        WHERE id = ?
      `).bind(path, level, deptId).run();

      // 更新子部門
      const children = await this.db.prepare(`
        SELECT id FROM departments WHERE parent_id = ?
      `).bind(deptId).all();

      for (const child of children.results) {
        await updatePath(child.id, path, level + 1);
      }
    };

    // 從根部門開始更新
    const rootDepts = await this.db.prepare(`
      SELECT id FROM departments WHERE parent_id = 0
    `).all();

    for (const dept of rootDepts.results) {
      await updatePath(dept.id);
    }
  }

  /**
   * 同步所有員工
   */
  async syncEmployees(options = {}) {
    const { fullSync = false } = options;
    console.log(`[EmployeeSync] 開始${fullSync ? '全量' : '增量'}同步員工...`);

    try {
      // 先同步部門
      await this.syncDepartments();

      let totalSynced = 0;
      
      // 使用新的批次查詢方法獲取所有員工
      console.log('[EmployeeSync] 獲取所有員工資料...');
      const result = await this.fxClient.getAllEmployees({
        limit: 100,
        maxBatches: 50  // 最多查詢 50 批，即最多 5000 個員工
      });

      const allEmployees = result.employees || [];
      console.log(`[EmployeeSync] 獲取到 ${allEmployees.length} 個員工`);

      // 過濾只保留在職員工
      const activeEmployees = allEmployees.filter(emp => !emp.isStop);
      console.log(`[EmployeeSync] 過濾後在職員工: ${activeEmployees.length}/${allEmployees.length}`);

      // 批量同步員工資料
      if (activeEmployees.length > 0) {
        const batchSize = 20;  // 減少批次大小避免超時
        
        for (let i = 0; i < activeEmployees.length; i += batchSize) {
          const batch = activeEmployees.slice(i, i + batchSize);
          await this.syncEmployeeBatch(batch);
          totalSynced += batch.length;
          console.log(`[EmployeeSync] 已同步 ${totalSynced}/${activeEmployees.length} 個在職員工`);
        }
      }

      // 記錄同步日誌
      await this.db.prepare(`
        INSERT INTO employee_sync_logs (
          sync_type, status, total_count, synced_count, 
          started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        fullSync ? 'full' : 'incremental',
        'success',
        activeEmployees.length,
        totalSynced,
        Date.now(),
        Date.now()
      ).run();

      console.log(`[EmployeeSync] 成功同步 ${totalSynced} 個員工`);
      return { 
        success: true, 
        employeeCount: totalSynced,
        departmentCount: result.departments?.length || 0 
      };

    } catch (error) {
      console.error('[EmployeeSync] 員工同步失敗:', error);
      
      // 記錄失敗日誌
      await this.db.prepare(`
        INSERT INTO employee_sync_logs (
          sync_type, status, error_message, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        fullSync ? 'full' : 'incremental',
        'failed',
        error.message,
        Date.now(),
        Date.now()
      ).run();

      throw error;
    }
  }

  /**
   * 批量同步員工資料
   */
  async syncEmployeeBatch(employees) {
    const statements = [];

    for (const emp of employees) {
      // 安全獲取欄位值，避免 undefined
      const getValue = (value, defaultValue = null) => {
        return value !== undefined && value !== null ? value : defaultValue;
      };

      const getStringValue = (value, defaultValue = '') => {
        if (value === undefined || value === null || value === '') {
          return defaultValue;
        }
        return String(value);
      };

      const getBooleanValue = (value, defaultValue = false) => {
        return value !== undefined && value !== null ? Boolean(value) : defaultValue;
      };

      const getArrayValue = (value, defaultValue = []) => {
        if (Array.isArray(value)) return value;
        return defaultValue;
      };

      // 插入或更新員工基本資訊
      const empStmt = this.db.prepare(`
        INSERT INTO employees (
          open_user_id, enterprise_id, account, full_name, name, nick_name,
          status, mobile, email, gender, leader_id, position, post, role,
          employee_number, main_department_ids, department_ids,
          telephone, qq, weixin, profile_image, description,
          birth_date, hire_date, start_work_date,
          is_active, is_stop, working_state, stop_time,
          mobile_status, create_time, update_time, sync_time
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(open_user_id) DO UPDATE SET
          name = excluded.name,
          mobile = excluded.mobile,
          email = excluded.email,
          position = excluded.position,
          leader_id = excluded.leader_id,
          department_ids = excluded.department_ids,
          is_stop = excluded.is_stop,
          update_time = excluded.update_time,
          sync_time = excluded.sync_time
      `).bind(
        getStringValue(emp.openUserId),
        getValue(emp.enterpriseId),
        getStringValue(emp.account),
        getStringValue(emp.fullName || emp.name),
        getStringValue(emp.name || emp.nickName, 'Unknown'),
        getStringValue(emp.nickName || emp.name, 'Unknown'),
        getStringValue(emp.status, 'NORMAL'),
        getStringValue(emp.mobile),
        getStringValue(emp.email),
        getStringValue(emp.gender),
        getValue(emp.leaderId),
        getStringValue(emp.position || emp.post),
        getStringValue(emp.post),
        getStringValue(emp.role, 'DEFAULT'),
        getStringValue(emp.employeeNumber || emp.empNum),
        JSON.stringify(getArrayValue(emp.mainDepartmentIds)),
        JSON.stringify(getArrayValue(emp.departmentIds)),
        getStringValue(emp.telephone),
        getStringValue(emp.qq),
        getStringValue(emp.weixin),
        getStringValue(emp.profileImage || emp.profileImageUrl),
        getStringValue(emp.description),
        getStringValue(emp.birthDate),
        getStringValue(emp.hireDate),
        getStringValue(emp.startWorkDate),
        getBooleanValue(emp.isActive, true),
        getBooleanValue(emp.isStop, false),
        getStringValue(emp.workingState),
        getValue(emp.stopTime, 0),
        getStringValue(emp.mobileStatus, 'PUBLIC'),
        getValue(emp.createTime, Date.now()),
        getValue(emp.updateTime, Date.now()),
        Date.now()
      );
      statements.push(empStmt);

      // 處理員工部門關聯
      if (emp.departmentIds && emp.departmentIds.length > 0) {
        // 先刪除舊的關聯
        const deleteStmt = this.db.prepare(`
          DELETE FROM employee_departments WHERE open_user_id = ?
        `).bind(emp.openUserId);
        statements.push(deleteStmt);

        // 插入新的關聯
        for (const deptId of emp.departmentIds) {
          const isMain = emp.mainDepartmentIds && emp.mainDepartmentIds.includes(deptId);
          const deptStmt = this.db.prepare(`
            INSERT INTO employee_departments (open_user_id, department_id, is_main)
            VALUES (?, ?, ?)
          `).bind(emp.openUserId, deptId, isMain);
          statements.push(deptStmt);
        }
      }
    }

    // 批量執行
    if (statements.length > 0) {
      await this.db.batch(statements);
    }
  }

  /**
   * 通過手機號同步單個員工
   */
  async syncEmployeeByMobile(mobile) {
    console.log(`[EmployeeSync] 同步手機號 ${mobile} 的員工...`);
    
    try {
      const employee = await this.fxClient.getUserByMobile(mobile);
      
      if (!employee) {
        console.log('[EmployeeSync] 未找到員工');
        return { success: false, message: '未找到員工' };
      }

      await this.syncEmployeeBatch([employee]);
      
      console.log('[EmployeeSync] 員工同步成功');
      return { success: true, employee };

    } catch (error) {
      console.error('[EmployeeSync] 員工同步失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取同步統計
   */
  async getSyncStats() {
    const stats = await this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM employees WHERE is_stop = false) as active_employees,
        (SELECT COUNT(*) FROM employees) as total_employees,
        (SELECT COUNT(*) FROM departments WHERE is_stop = false) as active_departments,
        (SELECT COUNT(*) FROM departments) as total_departments,
        (SELECT MAX(sync_time) FROM employees) as last_employee_sync,
        (SELECT MAX(sync_time) FROM departments) as last_department_sync
    `).first();

    const lastSync = await this.db.prepare(`
      SELECT * FROM employee_sync_logs 
      ORDER BY started_at DESC 
      LIMIT 1
    `).first();

    return {
      employees: {
        active: stats.active_employees || 0,
        total: stats.total_employees || 0,
        lastSync: stats.last_employee_sync
      },
      departments: {
        active: stats.active_departments || 0,
        total: stats.total_departments || 0,
        lastSync: stats.last_department_sync
      },
      lastSyncLog: lastSync
    };
  }
}