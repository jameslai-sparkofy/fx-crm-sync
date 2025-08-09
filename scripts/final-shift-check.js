#!/usr/bin/env node
/**
 * 最終檢查 shift_time 是否已同步
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function finalShiftCheck() {
  console.log('='.repeat(80));
  console.log('最終檢查 shift_time 同步狀態');
  console.log('='.repeat(80));

  try {
    // 1. 檢查總記錄數和有 shift_time 的記錄數
    console.log('\n檢查 shift_time 記錄...');
    const cmd = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as total, SUM(CASE WHEN shift_time__c IS NOT NULL THEN 1 ELSE 0 END) as with_shift FROM object_8w9cb__c"`;
    
    const { stdout } = await execPromise(cmd);
    
    // 解析輸出
    if (stdout.includes('"results"')) {
      const match = stdout.match(/"total":\s*(\d+).*?"with_shift":\s*(\d+)/s);
      if (match) {
        const total = match[1];
        const withShift = match[2];
        console.log(`  總記錄數: ${total}`);
        console.log(`  有 shift_time 的記錄: ${withShift}`);
        console.log(`  百分比: ${(withShift/total*100).toFixed(2)}%`);
      }
    }

    // 2. 查看幾個有 shift_time 的範例
    console.log('\n查看範例記錄...');
    const cmd2 = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT name, shift_time__c, shift_time__c__r FROM object_8w9cb__c WHERE shift_time__c IS NOT NULL LIMIT 5"`;
    
    const { stdout: stdout2 } = await execPromise(cmd2);
    
    if (stdout2.includes('"results"')) {
      // 提取結果
      const resultsMatch = stdout2.match(/"results":\s*\[([\s\S]*?)\]/);
      if (resultsMatch) {
        try {
          const results = JSON.parse('[' + resultsMatch[1] + ']');
          if (results.length > 0) {
            console.log('\n  找到的記錄:');
            results.forEach((record, index) => {
              console.log(`\n  ${index + 1}. ${record.name}`);
              console.log(`     shift_time__c: ${record.shift_time__c}`);
              console.log(`     shift_time__c__r: ${record.shift_time__c__r}`);
            });
          } else {
            console.log('  沒有找到有 shift_time 的記錄');
          }
        } catch (e) {
          console.log('  無法解析結果');
        }
      }
    }

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('檢查完成');
  console.log('='.repeat(80));
}

// 執行檢查
finalShiftCheck();