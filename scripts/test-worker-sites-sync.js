/**
 * 測試 Worker 的案場同步功能
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function testWorkerSitesSync() {
  try {
    console.log('=== 測試 Worker 案場同步 ===\n');
    
    // 測試完整同步
    console.log('1. 觸發完整案場同步...');
    const response = await axios.post(`${WORKER_URL}/api/sync/object_8W9cb__c/full`, {}, {
      timeout: 60000 // 60秒超時
    });
    
    console.log('同步響應:', response.data);
    
    if (response.data.success && response.data.data?.result) {
      const result = response.data.data.result;
      console.log(`✅ 完整同步成功: 成功 ${result.success || 0}, 失敗 ${result.errors || 0}`);
    } else {
      console.log(`❌ 同步失敗:`, response.data);
    }
    
    // 測試增量同步
    console.log('\n2. 觸發增量案場同步...');
    const incrementalResponse = await axios.post(`${WORKER_URL}/api/sync/object_8W9cb__c/start`, {
      fullSync: false
    }, {
      timeout: 60000 // 60秒超時
    });
    
    console.log('增量同步響應:', incrementalResponse.data);
    
    if (incrementalResponse.data.success && incrementalResponse.data.data?.result) {
      const result = incrementalResponse.data.data.result;
      console.log(`✅ 增量同步成功: 成功 ${result.success || 0}, 失敗 ${result.errors || 0}`);
    } else {
      console.log(`❌ 增量同步失敗:`, incrementalResponse.data);
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

async function checkSyncStatus() {
  try {
    console.log('\n=== 檢查同步狀態 ===');
    const response = await axios.get(`${WORKER_URL}/api/sync/status`);
    console.log('同步狀態:', response.data);
  } catch (error) {
    console.error('檢查狀態失敗:', error.message);
  }
}

async function checkDatabaseStats() {
  try {
    console.log('\n=== 檢查資料庫統計 ===');
    const response = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    console.log('資料庫統計:', response.data);
  } catch (error) {
    console.error('檢查資料庫統計失敗:', error.message);
  }
}

async function main() {
  await checkDatabaseStats(); // 先檢查當前狀態
  await testWorkerSitesSync();
  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
  await checkSyncStatus();
  await checkDatabaseStats(); // 再次檢查結果
}

main();