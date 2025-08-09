#!/usr/bin/env node
/**
 * 檢查 D1 表的欄位結構
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkD1Columns() {
  console.log('='.repeat(80));
  console.log('檢查 D1 表的欄位結構');
  console.log('='.repeat(80));

  try {
    // 創建一個簡單的 SQL 檔案來查詢表結構
    const fs = require('fs');
    const sql = `
-- 查詢表的所有欄位
SELECT name, type FROM pragma_table_info('object_8w9cb__c') ORDER BY cid;
    `.trim();
    
    const sqlFile = '../workers/sql/check-columns.sql';
    fs.writeFileSync(sqlFile, sql);
    
    console.log('\n執行 SQL 查詢表結構...');
    const command = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/check-columns.sql --remote`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stdout) {
      console.log('\n表結構:');
      // 解析輸出
      const lines = stdout.split('\n');
      let inResults = false;
      let columns = [];
      
      lines.forEach(line => {
        if (line.includes('"results"')) {
          inResults = true;
        }
        if (inResults && line.includes('"name"')) {
          const match = line.match(/"name":\s*"([^"]+)"/);
          if (match) {
            columns.push(match[1]);
          }
        }
      });
      
      if (columns.length > 0) {
        console.log(`\n找到 ${columns.length} 個欄位:`);
        columns.forEach((col, index) => {
          if (col.includes('shift')) {
            console.log(`  ${index + 1}. ${col} ⭐`);
          } else {
            console.log(`  ${index + 1}. ${col}`);
          }
        });
        
        // 檢查是否有 shift_time__c__v
        if (columns.includes('shift_time__c__v')) {
          console.log('\n✅ 表中有 shift_time__c__v 欄位');
        } else {
          console.log('\n❌ 表中沒有 shift_time__c__v 欄位');
          console.log('   這可能是問題所在！');
        }
      } else {
        console.log('無法解析欄位列表，原始輸出:');
        console.log(stdout);
      }
    } else {
      console.log('沒有輸出');
    }
    
    if (stderr) {
      console.error('錯誤:', stderr);
    }
    
    // 清理 SQL 檔案
    fs.unlinkSync(sqlFile);
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('檢查完成');
  console.log('='.repeat(80));
}

// 執行檢查
checkD1Columns();