/**
 * 簡化的員工同步服務
 * 只同步：姓名、主部門、副部門、電話、email
 */

export class SimpleEmployeeSyncService {
  constructor(db, fxClient) {
    this.db = db;
    this.fxClient = fxClient;
  }

  /**
   * 同步所有在職員工（簡化版）
   */
  async syncEmployees() {
    console.log('[SimpleEmployeeSync] 開始同步員工...');
    
    try {
      // 獲取所有員工
      const result = await this.fxClient.getAllEmployees();
      const allEmployees = result.employees || [];
      
      // 過濾只保留在職員工
      const activeEmployees = allEmployees.filter(emp => !emp.isStop);
      console.log(`[SimpleEmployeeSync] 獲取到 ${allEmployees.length} 個員工，其中 ${activeEmployees.length} 個在職`);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // 逐個同步員工（避免批量問題）
      for (const emp of activeEmployees) {
        try {
          await this.syncSingleEmployee(emp);
          successCount++;
          console.log(`[SimpleEmployeeSync] 成功同步 ${emp.name || emp.nickName || 'Unknown'} (${successCount}/${activeEmployees.length})`);
        } catch (error) {
          errorCount++;
          const empName = emp.name || emp.nickName || emp.openUserId;
          console.error(`[SimpleEmployeeSync] 同步 ${empName} 失敗:`, error.message);
          errors.push({ employee: empName, error: error.message });
        }
      }

      console.log(`[SimpleEmployeeSync] 同步完成：成功 ${successCount}，失敗 ${errorCount}`);
      
      return {
        success: true,
        total: activeEmployees.length,
        successCount,
        errorCount,
        errors
      };

    } catch (error) {
      console.error('[SimpleEmployeeSync] 同步失敗:', error);
      throw error;
    }
  }

  /**
   * 同步單個員工
   */
  async syncSingleEmployee(emp) {
    // 安全獲取值
    const getName = (emp) => {
      if (emp.name && emp.name.trim()) return emp.name.trim();
      if (emp.nickName && emp.nickName.trim()) return emp.nickName.trim();
      return 'Unknown';
    };

    const getMainDepartment = (emp) => {
      if (emp.mainDepartmentIds && emp.mainDepartmentIds.length > 0) {
        return String(emp.mainDepartmentIds[0]);
      }
      if (emp.departmentIds && emp.departmentIds.length > 0) {
        return String(emp.departmentIds[0]);
      }
      return null;
    };

    const getSubDepartments = (emp) => {
      const mainDept = getMainDepartment(emp);
      if (!emp.departmentIds || emp.departmentIds.length <= 1) {
        return JSON.stringify([]);
      }
      
      // 排除主部門，剩下的都是副部門
      const subDepts = emp.departmentIds.filter(id => String(id) !== mainDept);
      return JSON.stringify(subDepts);
    };

    const name = getName(emp);
    const mainDepartmentId = getMainDepartment(emp);
    const subDepartmentIds = getSubDepartments(emp);
    const mobile = emp.mobile ? String(emp.mobile).trim() : '';
    const email = emp.email ? String(emp.email).trim() : '';

    // 插入或更新員工
    await this.db.prepare(`
      INSERT INTO employees_simple (
        open_user_id, name, main_department_id, sub_department_ids, mobile, email, sync_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(open_user_id) DO UPDATE SET
        name = excluded.name,
        main_department_id = excluded.main_department_id,
        sub_department_ids = excluded.sub_department_ids,
        mobile = excluded.mobile,
        email = excluded.email,
        sync_time = excluded.sync_time
    `).bind(
      emp.openUserId,
      name,
      mainDepartmentId,
      subDepartmentIds,
      mobile,
      email,
      Date.now()
    ).run();
  }

  /**
   * 獲取員工統計
   */
  async getStats() {
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN main_department_id IS NOT NULL THEN 1 END) as with_department,
        COUNT(CASE WHEN mobile != '' THEN 1 END) as with_mobile,
        COUNT(CASE WHEN email != '' THEN 1 END) as with_email
      FROM employees_simple
    `).first();

    return stats;
  }

  /**
   * 獲取員工列表
   */
  async getEmployees(limit = 50, offset = 0, search = null) {
    let query = `
      SELECT 
        es.open_user_id,
        es.name,
        es.mobile,
        es.email,
        es.main_department_id,
        md.name as main_department_name,
        es.sub_department_ids,
        es.sync_time
      FROM employees_simple es
      LEFT JOIN departments md ON md.id = es.main_department_id
    `;
    
    const params = [];
    
    if (search) {
      query += ` WHERE (es.name LIKE ? OR es.mobile LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY es.sync_time DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const employees = await this.db.prepare(query).bind(...params).all();

    const total = await this.db.prepare(`
      SELECT COUNT(*) as count FROM employees_simple
    `).first();

    return {
      employees: employees.results || [],
      total: total.count || 0,
      limit,
      offset
    };
  }
}