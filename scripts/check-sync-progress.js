/**
 * 檢查同步進度狀態
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function checkProgress() {
  try {
    console.log('=== 檢查同步進度 ===\n');
    
    // 獲取同步進度（通過 SQL 查詢）
    const response = await axios.post(`${WORKER_URL}/api/database/query`, {
      sql: "SELECT * FROM sync_progress WHERE entity_type = 'object_8W9cb__c'"
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.success && response.data.data.length > 0) {
      const progress = response.data.data[0];
      console.log('當前同步進度:');
      console.log(`  實體類型: ${progress.entity_type}`);
      console.log(`  當前偏移量: ${progress.current_offset}`);
      console.log(`  更新時間: ${progress.updated_at}`);
      console.log(`  創建時間: ${progress.created_at || 'N/A'}`);
      
      // 計算進度百分比
      const totalRecords = 4136;
      const completedRecords = progress.current_offset;
      const percentage = (completedRecords / totalRecords * 100).toFixed(1);
      
      console.log(`\n進度分析:`);
      console.log(`  已處理: ${completedRecords} / ${totalRecords} 條`);
      console.log(`  完成率: ${percentage}%`);
      console.log(`  剩餘: ${totalRecords - completedRecords} 條`);
      
      // 計算需要的批次數
      const batchSize = 500;
      const remainingBatches = Math.ceil((totalRecords - completedRecords) / batchSize);
      console.log(`  剩餘批次: ${remainingBatches} 批（每批 ${batchSize} 條）`);
      
      // 如果有進度，建議繼續
      if (completedRecords < totalRecords) {
        console.log('\n💡 建議:');
        console.log('  系統檢測到未完成的同步任務');
        console.log('  可以繼續執行同步以處理剩餘記錄');
        console.log(`  預計還需要執行 ${Math.ceil(remainingBatches / 3)} 次（每次處理 3 批）`);
      } else {
        console.log('\n✅ 同步已完成');
      }
      
      return progress;
    } else {
      console.log('沒有找到同步進度記錄');
      console.log('這可能表示:');
      console.log('  1. 從未執行過同步');
      console.log('  2. 上次同步已完成並清除了進度');
      console.log('  3. sync_progress 表不存在');
      return null;
    }
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('sync_progress 表可能不存在');
      console.log('需要先創建表或執行初始化');
    } else {
      console.error('檢查失敗:', error.message);
      if (error.response?.data) {
        console.error('錯誤詳情:', error.response.data);
      }
    }
    return null;
  }
}

async function clearProgress() {
  try {
    console.log('\n清除同步進度...');
    
    const response = await axios.post(`${WORKER_URL}/api/database/execute`, {
      sql: "DELETE FROM sync_progress WHERE entity_type = 'object_8W9cb__c'"
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.success) {
      console.log('✅ 進度已清除');
      return true;
    } else {
      console.error('清除失敗:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('清除失敗:', error.message);
    return false;
  }
}

async function main() {
  // 檢查進度
  const progress = await checkProgress();
  
  // 如果有進度，詢問是否清除
  if (progress && progress.current_offset > 0) {
    console.log('\n是否要清除進度並重新開始？');
    console.log('1. 保留進度（繼續同步）');
    console.log('2. 清除進度（重新開始）');
    
    // 由於這是腳本，默認選擇保留
    console.log('\n選擇: 1（保留進度）');
  }
}

main();