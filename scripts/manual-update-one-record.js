#!/usr/bin/env node
/**
 * 手動更新一條記錄來測試
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function manualUpdateOneRecord() {
  console.log('='.repeat(80));
  console.log('手動更新一條記錄測試');
  console.log('='.repeat(80));

  try {
    // 1. 創建一個簡單的 UPDATE SQL
    console.log('\n1. 創建測試 SQL...');
    const testSQL = `
-- 更新一條特定的記錄
UPDATE object_8W9cb__c 
SET 
  shift_time__c = '測試工班',
  shift_time__c__r = '{"name":"測試工班","id":"test123"}',
  shift_time__c__relation_ids = 'test123'
WHERE name = '25-07-14-3556';

-- 查詢更新的記錄
SELECT 
  name,
  shift_time__c,
  shift_time__c__r,
  shift_time__c__relation_ids
FROM object_8W9cb__c 
WHERE name = '25-07-14-3556';
    `.trim();

    // 2. 寫入 SQL 文件
    const sqlFileName = 'test-update-shift-time.sql';
    const sqlFilePath = path.join(__dirname, '..', 'workers', 'sql', sqlFileName);
    
    fs.writeFileSync(sqlFilePath, testSQL, 'utf8');
    console.log(`  ✅ SQL 文件已創建: ${sqlFileName}`);
    console.log('\n  SQL 內容:');
    console.log(testSQL);

    // 3. 執行 SQL
    console.log('\n2. 執行 SQL 更新...');
    const command = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/${sqlFileName} --remote`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stdout) {
      console.log('  執行結果:');
      console.log(stdout);
    }
    
    if (stderr) {
      console.log('  錯誤信息:');
      console.log(stderr);
    }

    // 4. 清理 SQL 文件
    fs.unlinkSync(sqlFilePath);
    console.log('\n  ✅ SQL 文件已清理');

    // 5. 再次查詢確認
    console.log('\n3. 再次查詢確認...');
    const verifySQL = `
SELECT 
  name,
  shift_time__c,
  LENGTH(shift_time__c) as shift_c_len,
  shift_time__c__r,
  LENGTH(shift_time__c__r) as shift_r_len,
  shift_time__c__relation_ids,
  LENGTH(shift_time__c__relation_ids) as shift_ids_len
FROM object_8W9cb__c 
WHERE name = '25-07-14-3556';
    `.trim();

    const verifyFileName = 'verify-shift-time.sql';
    const verifyFilePath = path.join(__dirname, '..', 'workers', 'sql', verifyFileName);
    
    fs.writeFileSync(verifyFilePath, verifySQL, 'utf8');
    
    const verifyCommand = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/${verifyFileName} --remote`;
    const { stdout: verifyOut } = await execPromise(verifyCommand);
    
    if (verifyOut) {
      console.log('  驗證結果:');
      console.log(verifyOut);
    }
    
    fs.unlinkSync(verifyFilePath);

  } catch (error) {
    console.error('❌ 更新失敗:', error.message);
    console.error('詳細錯誤:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('測試完成');
  console.log('='.repeat(80));
}

// 執行測試
manualUpdateOneRecord();