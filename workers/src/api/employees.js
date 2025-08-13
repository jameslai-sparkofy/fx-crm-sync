/**
 * 員工管理 API
 */

import { EmployeeSyncService } from '../sync/employee-sync-service.js';

export async function handleEmployeesAPI(request, env, path) {
  const url = new URL(request.url);
  const method = request.method;
  
  // 初始化同步服務
  const fxClient = new (await import('../utils/fx-client.js')).FxClient(env);
  const syncService = new EmployeeSyncService(env.DB, fxClient);

  // 路由處理
  switch (true) {
    // 同步所有員工
    case path === '/api/employees/sync' && method === 'POST':
      return handleSyncEmployees(request, syncService);
    
    // 同步部門
    case path === '/api/departments/sync' && method === 'POST':
      return handleSyncDepartments(syncService);
    
    // 獲取員工列表
    case path === '/api/employees' && method === 'GET':
      return handleGetEmployees(env.DB, url);
    
    // 獲取部門列表
    case path === '/api/departments' && method === 'GET':
      return handleGetDepartments(env.DB);
    
    // 獲取員工詳情
    case path.match(/^\/api\/employees\/(.+)$/) && method === 'GET':
      return handleGetEmployee(env.DB, path);
    
    // 獲取同步統計
    case path === '/api/employees/stats' && method === 'GET':
      return handleGetStats(syncService);
    
    // 通過手機號同步員工
    case path === '/api/employees/sync-by-mobile' && method === 'POST':
      return handleSyncByMobile(request, syncService);
    
    default:
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

/**
 * 同步所有員工
 */
async function handleSyncEmployees(request, syncService) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await syncService.syncEmployees(body);
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('同步員工失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 同步部門
 */
async function handleSyncDepartments(syncService) {
  try {
    const result = await syncService.syncDepartments();
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('同步部門失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 獲取員工列表
 */
async function handleGetEmployees(db, url) {
  try {
    const params = url.searchParams;
    const limit = parseInt(params.get('limit') || '100');
    const offset = parseInt(params.get('offset') || '0');
    const departmentId = params.get('department_id');
    const search = params.get('search');
    const includeStop = params.get('include_stop') === 'true';
    
    let query = `
      SELECT 
        e.*,
        l.name as leader_name_display,
        GROUP_CONCAT(d.name, ', ') as department_names_display
      FROM employees e
      LEFT JOIN employees l ON e.leader_id = l.open_user_id
      LEFT JOIN employee_departments ed ON e.open_user_id = ed.open_user_id
      LEFT JOIN departments d ON ed.department_id = d.id
      WHERE 1=1
    `;
    
    const bindings = [];
    
    // 過濾條件
    if (!includeStop) {
      query += ' AND e.is_stop = false';
    }
    
    if (departmentId) {
      query += ' AND ed.department_id = ?';
      bindings.push(departmentId);
    }
    
    if (search) {
      query += ' AND (e.name LIKE ? OR e.mobile LIKE ? OR e.email LIKE ?)';
      const searchPattern = `%${search}%`;
      bindings.push(searchPattern, searchPattern, searchPattern);
    }
    
    query += ' GROUP BY e.open_user_id';
    query += ' ORDER BY e.name';
    query += ' LIMIT ? OFFSET ?';
    bindings.push(limit, offset);
    
    const stmt = db.prepare(query);
    const result = await stmt.bind(...bindings).all();
    
    // 獲取總數
    let countQuery = `
      SELECT COUNT(DISTINCT e.open_user_id) as total
      FROM employees e
      LEFT JOIN employee_departments ed ON e.open_user_id = ed.open_user_id
      WHERE 1=1
    `;
    
    const countBindings = [];
    
    if (!includeStop) {
      countQuery += ' AND e.is_stop = false';
    }
    
    if (departmentId) {
      countQuery += ' AND ed.department_id = ?';
      countBindings.push(departmentId);
    }
    
    if (search) {
      countQuery += ' AND (e.name LIKE ? OR e.mobile LIKE ? OR e.email LIKE ?)';
      const searchPattern = `%${search}%`;
      countBindings.push(searchPattern, searchPattern, searchPattern);
    }
    
    const countStmt = db.prepare(countQuery);
    const countResult = await countStmt.bind(...countBindings).first();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        employees: result.results,
        total: countResult.total,
        limit,
        offset
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('獲取員工列表失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 獲取部門列表
 */
async function handleGetDepartments(db) {
  try {
    const result = await db.prepare(`
      SELECT 
        d.*,
        p.name as parent_name,
        COUNT(DISTINCT ed.open_user_id) as employee_count
      FROM departments d
      LEFT JOIN departments p ON d.parent_id = p.id
      LEFT JOIN employee_departments ed ON d.id = ed.department_id
      LEFT JOIN employees e ON ed.open_user_id = e.open_user_id AND e.is_stop = false
      GROUP BY d.id
      ORDER BY d.parent_id, d.order_num
    `).all();
    
    // 構建樹形結構
    const departmentMap = new Map();
    const roots = [];
    
    for (const dept of result.results) {
      dept.children = [];
      departmentMap.set(dept.id, dept);
    }
    
    for (const dept of result.results) {
      if (dept.parent_id === 0) {
        roots.push(dept);
      } else {
        const parent = departmentMap.get(dept.parent_id);
        if (parent) {
          parent.children.push(dept);
        }
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        departments: roots,
        total: result.results.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('獲取部門列表失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 獲取員工詳情
 */
async function handleGetEmployee(db, path) {
  try {
    const match = path.match(/^\/api\/employees\/(.+)$/);
    const openUserId = match[1];
    
    const employee = await db.prepare(`
      SELECT 
        e.*,
        l.name as leader_name_display
      FROM employees e
      LEFT JOIN employees l ON e.leader_id = l.open_user_id
      WHERE e.open_user_id = ?
    `).bind(openUserId).first();
    
    if (!employee) {
      return new Response(JSON.stringify({
        success: false,
        error: '員工不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 獲取部門資訊
    const departments = await db.prepare(`
      SELECT d.*, ed.is_main
      FROM employee_departments ed
      JOIN departments d ON ed.department_id = d.id
      WHERE ed.open_user_id = ?
    `).bind(openUserId).all();
    
    employee.departments = departments.results;
    
    return new Response(JSON.stringify({
      success: true,
      data: employee
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('獲取員工詳情失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 獲取同步統計
 */
async function handleGetStats(syncService) {
  try {
    const stats = await syncService.getSyncStats();
    
    return new Response(JSON.stringify({
      success: true,
      data: stats
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('獲取統計失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 通過手機號同步員工
 */
async function handleSyncByMobile(request, syncService) {
  try {
    const body = await request.json();
    const { mobile } = body;
    
    if (!mobile) {
      return new Response(JSON.stringify({
        success: false,
        error: '請提供手機號'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await syncService.syncEmployeeByMobile(mobile);
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('同步員工失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}