/**
 * 詳細調試 Worker 的案場同步功能
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function debugWorkerSync() {
  try {
    console.log('=== 調試 Worker 案場同步 ===\n');
    
    // 先檢查資料庫統計
    console.log('1. 檢查同步前的資料庫統計...');
    const statsBefore = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    const siteStatsBefore = statsBefore.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
    console.log(`案場記錄數 (同步前): ${siteStatsBefore.recordCount}`);
    
    // 觸發小批量同步測試
    console.log('\n2. 觸發小批量案場同步測試 (100 條)...');
    const response = await axios.post(`${WORKER_URL}/api/sync/object_8W9cb__c/page`, {
      offset: 0,
      limit: 100
    }, {
      timeout: 120000 // 120秒超時
    });
    
    console.log('小批量同步響應:', JSON.stringify(response.data, null, 2));
    
    // 再次檢查資料庫統計
    console.log('\n3. 檢查同步後的資料庫統計...');
    const statsAfter = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    const siteStatsAfter = statsAfter.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
    console.log(`案場記錄數 (同步後): ${siteStatsAfter.recordCount}`);
    console.log(`記錄數變化: ${siteStatsAfter.recordCount - siteStatsBefore.recordCount}`);
    
    // 檢查最近的同步日誌
    console.log('\n4. 檢查最近的同步日誌...');
    const syncStatus = await axios.get(`${WORKER_URL}/api/sync/status`);
    const recentSyncs = syncStatus.data.data.recentSyncs.slice(0, 5);
    console.log('最近 5 次同步記錄:');
    recentSyncs.forEach((sync, index) => {
      console.log(`  ${index + 1}. ${sync.entity_type} - ${sync.status} - ${sync.created_at}`);
      if (sync.details) {
        try {
          const details = JSON.parse(sync.details);
          console.log(`     記錄數: ${details.records_count || 'N/A'}, 錯誤: ${details.error_count || 'N/A'}`);
          if (details.error) {
            console.log(`     錯誤信息: ${details.error.substring(0, 100)}...`);
          }
        } catch (e) {
          console.log(`     詳情: ${sync.details.substring(0, 100)}...`);
        }
      }
    });
    
  } catch (error) {
    console.error('\n❌ 調試失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugWorkerSync();