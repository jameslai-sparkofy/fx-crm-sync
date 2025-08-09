#!/usr/bin/env node
/**
 * 直接驗證 shift_time 欄位是否有值
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function verifyShiftTime() {
  console.log('='.repeat(80));
  console.log('驗證 shift_time 欄位狀態');
  console.log('='.repeat(80));

  try {
    // 1. 檢查總記錄數和 shift_time 欄位的狀態
    console.log('\n1. 檢查 shift_time 欄位統計...');
    const cmd1 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as total_records FROM object_8W9cb__c"`;
    
    const { stdout: result1 } = await execPromise(cmd1);
    console.log('總記錄數:', result1);

    // 2. 檢查各 shift_time 欄位的非空記錄數
    console.log('\n2. 檢查各 shift_time 欄位的非空記錄數...');
    const cmd2 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(CASE WHEN shift_time__c IS NOT NULL AND shift_time__c != '' THEN 1 END) as shift_time__c_count, COUNT(CASE WHEN shift_time__c__r IS NOT NULL AND shift_time__c__r != '' THEN 1 END) as shift_time__c__r_count, COUNT(CASE WHEN shift_time__c__relation_ids IS NOT NULL AND shift_time__c__relation_ids != '' THEN 1 END) as shift_time__c__relation_ids_count FROM object_8W9cb__c"`;
    
    const { stdout: result2 } = await execPromise(cmd2);
    console.log('非空欄位統計:', result2);

    // 3. 隨機取一條應該有 shift_time 的記錄看看
    console.log('\n3. 檢查特定記錄的 shift_time 值...');
    const cmd3 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT _id, name, shift_time__c, shift_time__c__r, shift_time__c__relation_ids FROM object_8W9cb__c WHERE name = '25-07-14-3556' LIMIT 1"`;
    
    const { stdout: result3 } = await execPromise(cmd3);
    console.log('範例記錄 (25-07-14-3556):', result3);

    // 4. 檢查前10條記錄
    console.log('\n4. 檢查前10條記錄的 shift_time 欄位...');
    const cmd4 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT name, shift_time__c, shift_time__c__r FROM object_8W9cb__c ORDER BY last_modified_time DESC LIMIT 10"`;
    
    const { stdout: result4 } = await execPromise(cmd4);
    console.log('最近修改的10條記錄:', result4);

    // 5. 確認表結構
    console.log('\n5. 確認表結構中的 shift_time 欄位...');
    const cmd5 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='object_8W9cb__c'"`;
    
    const { stdout: result5 } = await execPromise(cmd5);
    // 只顯示包含 shift 的行
    const lines = result5.split('\\n');
    const shiftLines = lines.filter(line => line.toLowerCase().includes('shift'));
    console.log('表結構中的 shift 相關欄位:');
    shiftLines.forEach(line => console.log(line));

  } catch (error) {
    console.error('❌ 驗證失敗:', error.message);
    console.error('錯誤詳情:', error.stderr || error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('驗證完成');
  console.log('='.repeat(80));
}

// 執行驗證
verifyShiftTime();