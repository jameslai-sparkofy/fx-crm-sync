#!/usr/bin/env node
/**
 * 持續同步 object_8W9cb__c 直到完成所有4000+條記錄
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';
const OBJECT_NAME = 'object_8W9cb__c';
const TARGET_RECORDS = 4000; // 預期記錄數
const MAX_BATCHES = 15; // 最多執行15批次

async function executeSyncBatch(batchNum, clearFirst = false) {
  console.log(`\n🔄 執行第 ${batchNum} 批同步...`);
  
  try {
    const response = await axios.post(`${WORKER_URL}/api/sync/${OBJECT_NAME}/start`, {
      fullSync: true,
      batchSize: 500,
      clearFirst: clearFirst
    });
    
    if (response.data.success) {
      const result = response.data.data.result;
      const synced = result.success || 0;
      const errors = result.errors || 0;
      
      console.log(`  ✅ 第 ${batchNum} 批: 成功=${synced}, 錯誤=${errors}`);
      
      return {
        success: true,
        synced: synced,
        errors: errors,
        hasMore: synced === 500 // 如果同步了500條（批次大小），可能還有更多
      };
    } else {
      console.log(`  ❌ 第 ${batchNum} 批同步失敗: ${response.data.error}`);
      return { success: false, synced: 0, errors: 0, hasMore: false };
    }
    
  } catch (error) {
    console.log(`  ❌ 第 ${batchNum} 批同步異常: ${error.message}`);
    
    if (error.response && error.response.status === 408) {
      console.log('  ⏱️  請求超時，但可能部分數據已同步');
      return { success: false, synced: 0, errors: 0, hasMore: true };
    }
    
    return { success: false, synced: 0, errors: 0, hasMore: false };
  }
}

async function continuousSync() {
  console.log('='.repeat(80));
  console.log('案場對象 (object_8W9cb__c) 持續同步');
  console.log('='.repeat(80));

  const startTime = Date.now();
  let totalSynced = 0;
  let totalErrors = 0;
  let batchNum = 0;
  let hasMore = true;
  
  console.log(`目標: 同步 ${TARGET_RECORDS}+ 條記錄`);
  console.log(`策略: 每批500條，最多執行 ${MAX_BATCHES} 批`);

  while (hasMore && batchNum < MAX_BATCHES) {
    batchNum++;
    
    // 第一批時清空表格，確保完整同步
    const clearFirst = (batchNum === 1);
    
    const result = await executeSyncBatch(batchNum, clearFirst);
    
    totalSynced += result.synced;
    totalErrors += result.errors;
    hasMore = result.hasMore && result.success;
    
    console.log(`  📊 累計: ${totalSynced} 條成功, ${totalErrors} 條錯誤`);
    
    // 如果這批同步的記錄少於500，說明沒有更多數據了
    if (result.synced < 500) {
      console.log(`  🏁 第 ${batchNum} 批返回 ${result.synced} 條記錄 < 500，同步完成`);
      hasMore = false;
    }
    
    // 進度估算
    if (totalSynced > 0) {
      const progress = Math.min(100, Math.round((totalSynced / TARGET_RECORDS) * 100));
      console.log(`  🎯 進度估算: ${progress}% (${totalSynced}/${TARGET_RECORDS})`);
    }
    
    // 批次間等待，避免API限流
    if (hasMore) {
      console.log('  ⏳ 等待3秒後繼續...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  // 最終報告
  console.log('\n' + '='.repeat(80));
  console.log('持續同步完成報告');
  console.log('='.repeat(80));
  console.log(`執行批次: ${batchNum}/${MAX_BATCHES}`);
  console.log(`同步記錄: ${totalSynced} 條`);
  console.log(`錯誤記錄: ${totalErrors} 條`);
  console.log(`執行時間: ${duration} 秒`);
  if (totalSynced > 0) {
    console.log(`平均速度: ${Math.round(totalSynced / duration)} 條/秒`);
  }
  
  // 狀態判斷
  if (totalSynced >= TARGET_RECORDS) {
    console.log('🎉 同步成功完成！已達到預期記錄數');
  } else if (totalSynced >= TARGET_RECORDS * 0.9) {
    console.log('✅ 同步基本完成！已同步90%以上記錄');
  } else if (totalSynced > 0) {
    console.log('⚠️  同步部分完成，建議重新執行以獲取更多記錄');
  } else {
    console.log('❌ 同步失敗，沒有記錄被同步');
  }
  
  // 驗證建議
  console.log('\n📋 驗證建議:');
  console.log('1. 使用以下命令檢查實際記錄數:');
  console.log('   npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) FROM object_8W9cb__c"');
  console.log('2. 檢查Web介面: https://fx-crm-sync.lai-jameslai.workers.dev/');
  console.log('3. 如果記錄數不足4000+，請重新運行此腳本');

  console.log('\n' + '='.repeat(80));
}

// 執行持續同步
continuousSync().catch(console.error);