#!/usr/bin/env node
/**
 * object_8W9cb__c 案場對象完整同步
 * 同步所有4000+條記錄
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';
const OBJECT_NAME = 'object_8W9cb__c';

async function checkCurrentStatus() {
  console.log('\n📊 檢查當前同步狀態...');
  
  try {
    const response = await axios.get(`${WORKER_URL}/api/debug/database-stats`);
    
    if (response.data.success) {
      const stats = response.data.data.tables;
      const object8W9cb = stats.find(t => t.table_name === OBJECT_NAME);
      
      if (object8W9cb) {
        console.log(`  當前 D1 記錄數: ${object8W9cb.count}`);
        return object8W9cb.count;
      } else {
        console.log('  未找到案場表');
        return 0;
      }
    } else {
      console.log('  無法獲取數據庫狀態');
      return 0;
    }
  } catch (error) {
    console.log('  狀態檢查失敗:', error.message);
    return 0;
  }
}

async function executeFullSync() {
  console.log('\n🔄 開始完整同步...');
  
  let totalSynced = 0;
  let batchCount = 0;
  let hasMore = true;
  
  while (hasMore) {
    batchCount++;
    console.log(`\n第 ${batchCount} 批同步...`);
    
    try {
      const response = await axios.post(`${WORKER_URL}/api/sync/${OBJECT_NAME}/start`, {
        fullSync: true,
        batchSize: 500, // 增大批次大小以提高效率
        clearFirst: batchCount === 1 // 第一批時清空表格
      });
      
      if (response.data.success) {
        const result = response.data.data.result;
        const synced = result.success || 0;
        const errors = result.errors || 0;
        const total = result.total || 0;
        
        totalSynced += synced;
        
        console.log(`  ✅ 第 ${batchCount} 批: 成功=${synced}, 錯誤=${errors}, 批次總數=${total}`);
        console.log(`  📈 累計同步: ${totalSynced} 條記錄`);
        
        // 判斷是否還有更多數據
        hasMore = synced === 500; // 如果返回的記錄數等於批次大小，可能還有更多
        
        if (errors > 0) {
          console.log(`  ⚠️  第 ${batchCount} 批有 ${errors} 個錯誤`);
        }
        
      } else {
        console.log(`  ❌ 第 ${batchCount} 批同步失敗: ${response.data.error}`);
        hasMore = false;
      }
      
      // 避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.log(`  ❌ 第 ${batchCount} 批同步異常: ${error.message}`);
      
      if (error.response && error.response.status === 408) {
        console.log('  ⏱️  請求超時，繼續下一批...');
      } else {
        hasMore = false;
      }
    }
    
    // 安全防護：最多同步20批（500*20=10000條）
    if (batchCount >= 20) {
      console.log('  ⚠️  已達到最大批次數限制，停止同步');
      break;
    }
  }
  
  return { totalSynced, batchCount };
}

async function fullSyncObject8W9cb() {
  console.log('='.repeat(80));
  console.log('案場對象 (object_8W9cb__c) 完整同步');
  console.log('='.repeat(80));

  try {
    // 1. 檢查當前狀態
    const currentCount = await checkCurrentStatus();
    
    // 2. 執行完整同步
    console.log('\n🚀 開始完整同步作業...');
    const startTime = Date.now();
    
    const { totalSynced, batchCount } = await executeFullSync();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    // 3. 檢查最終狀態
    console.log('\n📊 檢查最終同步狀態...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待數據庫更新
    const finalCount = await checkCurrentStatus();
    
    // 4. 輸出同步報告
    console.log('\n' + '='.repeat(80));
    console.log('同步完成報告');
    console.log('='.repeat(80));
    console.log(`開始記錄數: ${currentCount}`);
    console.log(`執行批次數: ${batchCount}`);
    console.log(`同步記錄數: ${totalSynced}`);
    console.log(`最終記錄數: ${finalCount}`);
    console.log(`執行時間: ${duration} 秒`);
    console.log(`平均速度: ${Math.round(totalSynced / duration)} 條/秒`);
    
    if (finalCount >= 4000) {
      console.log('✅ 同步成功！已達到預期的4000+條記錄');
    } else {
      console.log(`⚠️  同步未完成，目前 ${finalCount} 條記錄，預期4000+條`);
      console.log('建議：');
      console.log('1. 檢查 CRM API 是否正常');
      console.log('2. 檢查網絡連接');
      console.log('3. 重新運行此腳本');
    }

  } catch (error) {
    console.error('❌ 完整同步失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('案場對象完整同步任務結束');
  console.log('='.repeat(80));
}

// 執行完整同步
fullSyncObject8W9cb().catch(console.error);