#!/usr/bin/env node
/**
 * 最終檢查 shift_time 欄位狀態
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkShiftTimeFinal() {
  console.log('='.repeat(80));
  console.log('最終檢查 shift_time 欄位狀態');
  console.log('='.repeat(80));

  try {
    // 1. 檢查總記錄數
    console.log('\n1. 檢查總記錄數...');
    const cmd1 = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as total FROM object_8W9cb__c"`;
    const { stdout: result1 } = await execPromise(cmd1);
    console.log('執行結果:', result1);

    // 2. 檢查 shift_time__c 欄位
    console.log('\n2. 檢查 shift_time__c 非空記錄數...');
    const cmd2 = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as count FROM object_8W9cb__c WHERE shift_time__c IS NOT NULL AND shift_time__c != ''"`;
    const { stdout: result2 } = await execPromise(cmd2);
    console.log('執行結果:', result2);

    // 3. 檢查 shift_time__c__r 欄位
    console.log('\n3. 檢查 shift_time__c__r 非空記錄數...');
    const cmd3 = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as count FROM object_8W9cb__c WHERE shift_time__c__r IS NOT NULL AND shift_time__c__r != ''"`;
    const { stdout: result3 } = await execPromise(cmd3);
    console.log('執行結果:', result3);

    // 4. 檢查 shift_time__c__relation_ids 欄位
    console.log('\n4. 檢查 shift_time__c__relation_ids 非空記錄數...');
    const cmd4 = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as count FROM object_8W9cb__c WHERE shift_time__c__relation_ids IS NOT NULL AND shift_time__c__relation_ids != ''"`;
    const { stdout: result4 } = await execPromise(cmd4);
    console.log('執行結果:', result4);

    // 5. 查看一些實際的 shift_time 值
    console.log('\n5. 查看前5條有 shift_time__c 的記錄...');
    const cmd5 = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT name, shift_time__c, shift_time__c__r, shift_time__c__relation_ids FROM object_8W9cb__c WHERE shift_time__c IS NOT NULL AND shift_time__c != '' LIMIT 5"`;
    const { stdout: result5 } = await execPromise(cmd5);
    console.log('執行結果:', result5);

    // 6. 檢查欄位是否存在
    console.log('\n6. 檢查欄位是否存在於表結構中...');
    const cmd6 = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT name FROM pragma_table_info('object_8W9cb__c') WHERE name LIKE '%shift%'"`;
    const { stdout: result6 } = await execPromise(cmd6);
    console.log('執行結果:', result6);

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
    if (error.stderr) {
      console.error('錯誤詳情:', error.stderr);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('檢查完成');
  console.log('='.repeat(80));
}

// 執行檢查
checkShiftTimeFinal();