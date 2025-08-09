#!/usr/bin/env node
/**
 * 修復 shift_time__c__r 欄位同步問題
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';
const OBJECT_NAME = 'object_8W9cb__c';

async function executeShiftTimeSync() {
  console.log('='.repeat(80));
  console.log('修復 shift_time__c__r 欄位同步問題');
  console.log('='.repeat(80));

  try {
    console.log('\n🔄 執行案場對象重新同步以修復 shift_time__c__r 欄位...');
    
    // 執行完整同步，確保包含所有欄位
    const response = await axios.post(`${WORKER_URL}/api/sync/${OBJECT_NAME}/start`, {
      fullSync: true,
      batchSize: 500,
      clearFirst: true // 清空表格重新同步
    });
    
    if (response.data.success) {
      const result = response.data.data.result;
      console.log(`✅ 同步成功: ${result.success} 條記錄, ${result.errors} 個錯誤`);
      
      // 等待一段時間讓同步完成
      console.log('\n⏳ 等待5秒讓同步完成...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 繼續執行更多批次以確保完整同步
      console.log('\n🔄 執行第二批同步...');
      const response2 = await axios.post(`${WORKER_URL}/api/sync/${OBJECT_NAME}/start`, {
        fullSync: true,
        batchSize: 500,
        clearFirst: false
      });
      
      if (response2.data.success) {
        const result2 = response2.data.data.result;
        console.log(`✅ 第二批: ${result2.success} 條記錄, ${result2.errors} 個錯誤`);
      }
      
      // 再執行幾批以確保完整性
      for (let i = 3; i <= 8; i++) {
        console.log(`\n🔄 執行第 ${i} 批同步...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const responseBatch = await axios.post(`${WORKER_URL}/api/sync/${OBJECT_NAME}/start`, {
            fullSync: true,
            batchSize: 500,
            clearFirst: false
          });
          
          if (responseBatch.data.success) {
            const resultBatch = responseBatch.data.data.result;
            console.log(`✅ 第 ${i} 批: ${resultBatch.success} 條記錄, ${resultBatch.errors} 個錯誤`);
            
            // 如果這批沒有同步任何記錄，說明已經完成
            if (resultBatch.success === 0) {
              console.log('📄 沒有更多記錄需要同步，完成');
              break;
            }
          } else {
            console.log(`❌ 第 ${i} 批同步失敗: ${responseBatch.data.error}`);
          }
        } catch (error) {
          console.log(`❌ 第 ${i} 批同步異常: ${error.message}`);
        }
      }
      
    } else {
      console.log(`❌ 初始同步失敗: ${response.data.error}`);
    }

    console.log('\n📊 同步完成，建議驗證步驟:');
    console.log('1. 檢查資料庫記錄數:');
    console.log('   npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) FROM object_8W9cb__c"');
    console.log('2. 檢查 shift_time__c__r 欄位:');
    console.log('   npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as total, COUNT(shift_time__c__r) as non_null FROM object_8W9cb__c"');

  } catch (error) {
    console.error('❌ 同步失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('shift_time 修復任務完成');
  console.log('='.repeat(80));
}

// 執行修復
executeShiftTimeSync().catch(console.error);