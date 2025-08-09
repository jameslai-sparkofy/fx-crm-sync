/**
 * 測試最小批量同步以查看詳細錯誤
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function testMinimalSync() {
  try {
    console.log('=== 測試最小批量案場同步 ===\n');
    
    // 觸發極小批量同步測試 (10 條)
    console.log('觸發極小批量案場同步測試 (10 條)...');
    const response = await axios.post(`${WORKER_URL}/api/sync/object_8W9cb__c/page`, {
      offset: 0,
      limit: 10
    }, {
      timeout: 60000 // 60秒超時
    });
    
    console.log('同步響應:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMinimalSync();