/**
 * 簡化的員工管理API
 */

import { SimpleEmployeeSyncService } from '../sync/simple-employee-sync.js';
import { FxClient } from '../utils/fx-client.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 初始化服務
      const fxClient = new FxClient(env);
      const syncService = new SimpleEmployeeSyncService(env.DB, fxClient);

      if (path === '/api/simple-employees/sync' && request.method === 'POST') {
        // 同步員工
        const result = await syncService.syncEmployees();
        return Response.json({ success: true, data: result });
      }

      if (path === '/api/simple-employees' && request.method === 'GET') {
        // 獲取員工列表
        const params = url.searchParams;
        const limit = parseInt(params.get('limit')) || 50;
        const offset = parseInt(params.get('offset')) || 0;
        const search = params.get('search');

        const result = await syncService.getEmployees(limit, offset, search);
        return Response.json({ success: true, data: result });
      }

      if (path === '/api/simple-employees/stats' && request.method === 'GET') {
        // 獲取統計
        const stats = await syncService.getStats();
        return Response.json({ success: true, data: stats });
      }

      return Response.json({ error: 'Not found' }, { status: 404 });

    } catch (error) {
      console.error('Simple Employee API error:', error);
      return Response.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
  }
};