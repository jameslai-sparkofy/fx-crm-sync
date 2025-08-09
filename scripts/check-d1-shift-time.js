#!/usr/bin/env node
/**
 * 檢查 D1 資料庫中的 shift_time 狀態
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkD1ShiftTime() {
  console.log('='.repeat(80));
  console.log('檢查 D1 資料庫中的 shift_time 狀態');
  console.log('='.repeat(80));

  try {
    // 1. 總記錄數
    console.log('\n1. 檢查總記錄數...');
    const cmd1 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as count FROM object_8w9cb__c"`;
    const { stdout: result1, stderr: err1 } = await execPromise(cmd1);
    if (err1) console.error('錯誤:', err1);
    console.log(result1);

    // 2. 有 shift_time__c 的記錄數
    console.log('\n2. 檢查有 shift_time__c 的記錄數...');
    const cmd2 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as count FROM object_8w9cb__c WHERE shift_time__c IS NOT NULL"`;
    const { stdout: result2, stderr: err2 } = await execPromise(cmd2);
    if (err2) console.error('錯誤:', err2);
    console.log(result2);

    // 3. 查看前 5 條記錄
    console.log('\n3. 查看前 5 條有 shift_time 的記錄...');
    const cmd3 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT name, shift_time__c, shift_time__c__r, shift_time__c__relation_ids FROM object_8w9cb__c WHERE shift_time__c IS NOT NULL LIMIT 5"`;
    const { stdout: result3, stderr: err3 } = await execPromise(cmd3);
    if (err3) console.error('錯誤:', err3);
    console.log(result3);

    // 4. 查看特定記錄
    console.log('\n4. 查看特定記錄 (25-07-14-3556)...');
    const cmd4 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT _id, name, shift_time__c, shift_time__c__r, shift_time__c__relation_ids FROM object_8w9cb__c WHERE name = '25-07-14-3556'"`;
    const { stdout: result4, stderr: err4 } = await execPromise(cmd4);
    if (err4) console.error('錯誤:', err4);
    console.log(result4);

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('檢查完成');
  console.log('='.repeat(80));
}

// 執行檢查
checkD1ShiftTime();