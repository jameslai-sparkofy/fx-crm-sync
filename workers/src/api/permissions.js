import { Router } from 'itty-router';

export const permissionRoutes = Router({ base: '/api/permissions' });

/**
 * 獲取所有欄位權限設定
 * GET /api/permissions
 */
permissionRoutes.get('/', async (request) => {
  const { env } = request;
  const url = new URL(request.url);
  const objectApiName = url.searchParams.get('object');
  
  try {
    let query = `
      SELECT 
        id, object_api_name, object_display_name,
        field_api_name, field_display_name, field_type,
        can_edit_by_worker, can_edit_by_owner, can_edit_by_admin,
        edit_description, business_rules,
        created_at, updated_at
      FROM field_permissions
    `;
    
    const params = [];
    
    if (objectApiName) {
      query += ' WHERE object_api_name = ?';
      params.push(objectApiName);
    }
    
    query += ' ORDER BY object_api_name, field_api_name';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    // 按對象分組
    const permissions = result.results.reduce((acc, perm) => {
      if (!acc[perm.object_api_name]) {
        acc[perm.object_api_name] = {
          objectApiName: perm.object_api_name,
          objectDisplayName: perm.object_display_name,
          fields: []
        };
      }
      
      acc[perm.object_api_name].fields.push({
        id: perm.id,
        fieldApiName: perm.field_api_name,
        fieldDisplayName: perm.field_display_name,
        fieldType: perm.field_type,
        canEditByWorker: !!perm.can_edit_by_worker,
        canEditByOwner: !!perm.can_edit_by_owner,
        canEditByAdmin: !!perm.can_edit_by_admin,
        editDescription: perm.edit_description,
        businessRules: perm.business_rules,
        createdAt: perm.created_at,
        updatedAt: perm.updated_at
      });
      
      return acc;
    }, {});
    
    return new Response(JSON.stringify({
      success: true,
      data: Object.values(permissions)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('獲取權限設定失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 創建或更新欄位權限
 * POST /api/permissions
 */
permissionRoutes.post('/', async (request) => {
  const { env } = request;
  
  try {
    const data = await request.json();
    const {
      objectApiName,
      objectDisplayName,
      fieldApiName,
      fieldDisplayName,
      fieldType,
      canEditByWorker = false,
      canEditByOwner = false,
      canEditByAdmin = true,
      editDescription = '',
      businessRules = ''
    } = data;
    
    if (!objectApiName || !fieldApiName) {
      return new Response(JSON.stringify({
        success: false,
        error: '對象API名稱和欄位API名稱為必填'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO field_permissions (
        object_api_name, object_display_name, field_api_name, field_display_name, field_type,
        can_edit_by_worker, can_edit_by_owner, can_edit_by_admin,
        edit_description, business_rules, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(object_api_name, field_api_name) DO UPDATE SET
        object_display_name = excluded.object_display_name,
        field_display_name = excluded.field_display_name,
        field_type = excluded.field_type,
        can_edit_by_worker = excluded.can_edit_by_worker,
        can_edit_by_owner = excluded.can_edit_by_owner,
        can_edit_by_admin = excluded.can_edit_by_admin,
        edit_description = excluded.edit_description,
        business_rules = excluded.business_rules,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      objectApiName,
      objectDisplayName,
      fieldApiName,
      fieldDisplayName,
      fieldType,
      canEditByWorker,
      canEditByOwner,
      canEditByAdmin,
      editDescription,
      businessRules
    ).run();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        message: '權限設定已保存',
        id: result.meta.last_row_id || 'updated'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('保存權限設定失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 更新特定權限
 * PUT /api/permissions/:id
 */
permissionRoutes.put('/:id', async (request) => {
  const { env } = request;
  const { id } = request.params;
  
  try {
    const data = await request.json();
    const {
      canEditByWorker = false,
      canEditByOwner = false,
      canEditByAdmin = true,
      editDescription = '',
      businessRules = ''
    } = data;
    
    const result = await env.DB.prepare(`
      UPDATE field_permissions 
      SET 
        can_edit_by_worker = ?,
        can_edit_by_owner = ?,
        can_edit_by_admin = ?,
        edit_description = ?,
        business_rules = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      canEditByWorker,
      canEditByOwner,
      canEditByAdmin,
      editDescription,
      businessRules,
      id
    ).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '權限記錄不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: { message: '權限設定已更新' }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('更新權限設定失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 批量更新對象的所有欄位權限
 * PUT /api/permissions/batch/:objectApiName
 */
permissionRoutes.put('/batch/:objectApiName', async (request) => {
  const { env } = request;
  const { objectApiName } = request.params;
  
  try {
    const data = await request.json();
    const { permissions } = data; // Array of { fieldApiName, canEditByWorker, canEditByOwner, ... }
    
    if (!Array.isArray(permissions)) {
      return new Response(JSON.stringify({
        success: false,
        error: '權限設定必須是數組格式'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 開始事務
    const results = [];
    for (const perm of permissions) {
      const result = await env.DB.prepare(`
        UPDATE field_permissions 
        SET 
          can_edit_by_worker = ?,
          can_edit_by_owner = ?,
          can_edit_by_admin = ?,
          edit_description = ?,
          business_rules = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE object_api_name = ? AND field_api_name = ?
      `).bind(
        perm.canEditByWorker || false,
        perm.canEditByOwner || false,
        perm.canEditByAdmin !== false, // 預設為 true
        perm.editDescription || '',
        perm.businessRules || '',
        objectApiName,
        perm.fieldApiName
      ).run();
      
      results.push({
        fieldApiName: perm.fieldApiName,
        updated: result.changes > 0
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        message: `批量更新完成，更新了 ${results.filter(r => r.updated).length} 個欄位權限`,
        results
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('批量更新權限失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 獲取用戶對特定欄位的權限
 * GET /api/permissions/check
 * ?object=object_8W9cb__c&field=field_XuJP2__c&role=worker
 */
permissionRoutes.get('/check', async (request) => {
  const { env } = request;
  const url = new URL(request.url);
  const objectApiName = url.searchParams.get('object');
  const fieldApiName = url.searchParams.get('field');
  const role = url.searchParams.get('role'); // worker, owner, admin
  
  if (!objectApiName || !fieldApiName || !role) {
    return new Response(JSON.stringify({
      success: false,
      error: '缺少必要參數: object, field, role'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const result = await env.DB.prepare(`
      SELECT can_edit_by_worker, can_edit_by_owner, can_edit_by_admin
      FROM field_permissions
      WHERE object_api_name = ? AND field_api_name = ?
    `).bind(objectApiName, fieldApiName).first();
    
    if (!result) {
      return new Response(JSON.stringify({
        success: false,
        error: '欄位權限設定不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let canEdit = false;
    switch (role.toLowerCase()) {
      case 'worker':
        canEdit = !!result.can_edit_by_worker;
        break;
      case 'owner':
        canEdit = !!result.can_edit_by_owner;
        break;
      case 'admin':
        canEdit = !!result.can_edit_by_admin;
        break;
      default:
        return new Response(JSON.stringify({
          success: false,
          error: '無效的角色類型，支援: worker, owner, admin'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        objectApiName,
        fieldApiName,
        role,
        canEdit,
        permissions: {
          canEditByWorker: !!result.can_edit_by_worker,
          canEditByOwner: !!result.can_edit_by_owner,
          canEditByAdmin: !!result.can_edit_by_admin
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('檢查權限失敗:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});