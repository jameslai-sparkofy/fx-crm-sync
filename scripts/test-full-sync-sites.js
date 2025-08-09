/**
 * 測試完整案場同步
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function testFullSiteSync() {
  try {
    console.log('=== 測試完整案場同步 ===\n');
    
    // 先檢查資料庫統計
    console.log('1. 檢查同步前的資料庫統計...');
    const statsBefore = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    const siteStatsBefore = statsBefore.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
    console.log(`案場記錄數 (同步前): ${siteStatsBefore.recordCount}`);
    
    // 觸發完整同步
    console.log('\n2. 觸發完整案場同步...');
    const startTime = Date.now();
    const response = await axios.post(`${WORKER_URL}/api/sync/object_8W9cb__c/full`, {}, {
      timeout: 300000 // 5分鐘超時
    });
    const endTime = Date.now();
    
    console.log('同步響應:', JSON.stringify(response.data, null, 2));
    console.log(`同步耗時: ${Math.round((endTime - startTime) / 1000)} 秒`);
    
    // 再次檢查資料庫統計
    console.log('\n3. 檢查同步後的資料庫統計...');
    const statsAfter = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    const siteStatsAfter = statsAfter.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
    console.log(`案場記錄數 (同步後): ${siteStatsAfter.recordCount}`);
    console.log(`記錄數變化: ${siteStatsAfter.recordCount - siteStatsBefore.recordCount}`);
    
    if (response.data.success && response.data.data?.result) {
      const result = response.data.data.result;
      console.log(`\n✅ 完整同步結果: 成功 ${result.success}, 失敗 ${result.errors}`);
      console.log(`成功率: ${Math.round((result.success / (result.success + result.errors)) * 100)}%`);
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFullSiteSync();