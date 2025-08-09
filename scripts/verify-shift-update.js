#!/usr/bin/env node
/**
 * 驗證 shift_time 更新是否成功
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function verifyShiftUpdate() {
  console.log('='.repeat(80));
  console.log('驗證 shift_time 更新結果');
  console.log('='.repeat(80));

  try {
    // 使用不同的方式查詢
    console.log('\n嘗試多種方式查詢...\n');

    // 方法 1: 使用單條命令
    console.log('方法 1: 單條 SELECT 命令');
    try {
      const cmd1 = `cd ../workers && echo "SELECT COUNT(*) FROM object_8w9cb__c WHERE shift_time__c IS NOT NULL" | npx wrangler d1 execute fx-crm-database --remote`;
      const { stdout: result1 } = await execPromise(cmd1);
      console.log('結果:', result1 || '無輸出');
    } catch (e) {
      console.log('失敗:', e.message);
    }

    // 方法 2: 使用檔案查詢
    console.log('\n方法 2: 使用 SQL 檔案');
    const fs = require('fs');
    const sqlContent = `SELECT COUNT(*) as total, SUM(CASE WHEN shift_time__c IS NOT NULL THEN 1 ELSE 0 END) as with_shift FROM object_8w9cb__c;`;
    fs.writeFileSync('../workers/sql/check-shift.sql', sqlContent);
    
    try {
      const cmd2 = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/check-shift.sql --remote`;
      const { stdout: result2 } = await execPromise(cmd2);
      console.log('結果:', result2 || '無輸出');
    } catch (e) {
      console.log('失敗:', e.message);
    }

    // 方法 3: 查詢特定記錄
    console.log('\n方法 3: 查詢特定記錄');
    const sqlSpecific = `SELECT name, shift_time__c FROM object_8w9cb__c WHERE name IN ('25-07-14-3556', '25-07-14-3555', '25-07-14-3553');`;
    fs.writeFileSync('../workers/sql/check-specific.sql', sqlSpecific);
    
    try {
      const cmd3 = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/check-specific.sql --remote`;
      const { stdout: result3 } = await execPromise(cmd3);
      console.log('結果:', result3 || '無輸出');
    } catch (e) {
      console.log('失敗:', e.message);
    }

    // 清理檔案
    try {
      fs.unlinkSync('../workers/sql/check-shift.sql');
      fs.unlinkSync('../workers/sql/check-specific.sql');
    } catch (e) {}

  } catch (error) {
    console.error('❌ 驗證失敗:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('驗證完成');
  console.log('='.repeat(80));
}

// 執行驗證
verifyShiftUpdate();