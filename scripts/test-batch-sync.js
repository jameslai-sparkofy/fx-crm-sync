/**
 * 測試案場分批同步 - 驗證能否同步完整 4136 條記錄
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function triggerSiteSync(fullSync = true) {
  console.log('觸發案場同步...');
  try {
    const response = await axios.post(
      `${WORKER_URL}/api/sync/object_8W9cb__c/start`,
      { fullSync: fullSync },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 35000 // 35秒超時（Worker 最多執行 30 秒）
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Worker 執行超時（預期行為，可能正在處理大量數據）');
      return { timeout: true };
    }
    throw error;
  }
}

async function checkDatabaseStats() {
  const response = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
  return response.data.data;
}

async function checkSyncStatus() {
  const response = await axios.get(`${WORKER_URL}/api/sync/status`);
  return response.data.data;
}

async function waitAndCheck(seconds) {
  console.log(`等待 ${seconds} 秒...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function main() {
  console.log('=== 測試案場分批同步功能 ===\n');
  
  try {
    // 1. 檢查初始狀態
    console.log('1️⃣ 檢查當前資料庫狀態...');
    const initialStats = await checkDatabaseStats();
    const siteTable = initialStats.tables.find(t => t.apiName === 'object_8W9cb__c');
    console.log(`   案場當前記錄數: ${siteTable.recordCount}`);
    console.log(`   最後同步時間: ${siteTable.lastSync}\n`);
    
    // 2. 觸發完整同步
    console.log('2️⃣ 觸發案場完整同步...');
    const syncResult = await triggerSiteSync(true);
    
    if (syncResult.timeout) {
      console.log('   Worker 執行時間較長，這是正常的\n');
    } else if (syncResult.success) {
      console.log(`   同步完成: ${JSON.stringify(syncResult)}\n`);
    }
    
    // 3. 等待並檢查結果
    await waitAndCheck(5);
    
    // 4. 檢查同步記錄
    console.log('3️⃣ 檢查最新同步記錄...');
    const syncStatus = await checkSyncStatus();
    const latestSiteSync = syncStatus.recentSyncs.find(s => s.entity_type === 'object_8W9cb__c');
    
    if (latestSiteSync) {
      console.log(`   同步ID: ${latestSiteSync.sync_id}`);
      console.log(`   狀態: ${latestSiteSync.status}`);
      console.log(`   處理記錄數: ${latestSiteSync.records_count}`);
      
      // 解析詳細信息
      if (latestSiteSync.details) {
        const details = JSON.parse(latestSiteSync.details);
        console.log(`   成功: ${details.success_count || details.records_count}`);
        console.log(`   失敗: ${details.error_count || 0}\n`);
      }
    }
    
    // 5. 檢查最終狀態
    console.log('4️⃣ 檢查最終資料庫狀態...');
    const finalStats = await checkDatabaseStats();
    const finalSiteTable = finalStats.tables.find(t => t.apiName === 'object_8W9cb__c');
    console.log(`   案場最終記錄數: ${finalSiteTable.recordCount}`);
    
    // 6. 分析結果
    console.log('\n=== 分析結果 ===');
    const recordsAdded = finalSiteTable.recordCount - siteTable.recordCount;
    console.log(`✅ 新增記錄數: ${recordsAdded}`);
    console.log(`📊 當前總數: ${finalSiteTable.recordCount} / 4136 (CRM總數)`);
    
    const completionRate = (finalSiteTable.recordCount / 4136 * 100).toFixed(1);
    console.log(`📈 同步完成率: ${completionRate}%`);
    
    if (finalSiteTable.recordCount < 4136) {
      console.log(`\n⚠️ 尚未完全同步，差異: ${4136 - finalSiteTable.recordCount} 條`);
      console.log('💡 建議：');
      console.log('   1. 再次執行同步以繼續處理剩餘記錄');
      console.log('   2. 檢查 Worker 日誌確認是否有錯誤');
      console.log('   3. 可能需要多次執行才能完成全部同步');
    } else {
      console.log('\n✅ 同步完成！所有 4136 條案場記錄已同步到 D1');
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

// 執行測試
main().catch(console.error);