#!/usr/bin/env node

/**
 * 檢查 D1 表格的欄位數量
 */

const { execSync } = require('child_process');

const API_TOKEN = 'F0pPzDMbcWv4JIx14g2P7COIz5KON5IMux568moW';
process.env.CLOUDFLARE_API_TOKEN = API_TOKEN;

console.log('====================================');
console.log('檢查 D1 表格欄位數量');
console.log('====================================\n');

// 切換到 workers 目錄
process.chdir('../workers');

function executeD1Command(command) {
  try {
    const result = execSync(
      `npx wrangler d1 execute fx-crm-database --remote --command="${command}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    return result;
  } catch (error) {
    console.error('執行失敗:', error.message);
    return null;
  }
}

async function checkTableColumns() {
  try {
    // 1. 獲取表格結構
    console.log('1. 獲取 object_8W9cb__c 表格結構...');
    const tableInfo = executeD1Command(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='object_8W9cb__c'"
    );
    
    if (tableInfo) {
      // 解析 CREATE TABLE 語句
      const createStatement = tableInfo.toString();
      console.log('表格定義：');
      console.log(createStatement.substring(0, 500) + '...\n');
      
      // 計算欄位數量（簡單計算逗號）
      const columnCount = (createStatement.match(/,/g) || []).length + 1;
      console.log(`估計欄位數量: ${columnCount}\n`);
      
      // 檢查是否包含 shift_time__c
      if (createStatement.includes('shift_time__c')) {
        console.log('✅ 表格定義包含 shift_time__c 欄位');
      } else {
        console.log('❌ 表格定義不包含 shift_time__c 欄位');
      }
    }
    
    // 2. 使用 PRAGMA 獲取準確的欄位列表
    console.log('\n2. 使用 PRAGMA 獲取欄位列表...');
    const pragmaInfo = executeD1Command(
      "SELECT name FROM pragma_table_info('object_8W9cb__c')"
    );
    
    if (pragmaInfo) {
      const columns = pragmaInfo.split('\n').filter(line => line.trim());
      console.log(`準確欄位數量: ${columns.length}\n`);
      
      // 檢查是否有 shift_time__c
      if (pragmaInfo.includes('shift_time__c')) {
        console.log('✅ PRAGMA 顯示有 shift_time__c 欄位');
      } else {
        console.log('❌ PRAGMA 顯示沒有 shift_time__c 欄位');
        
        // 列出所有包含 shift 或 time 的欄位
        console.log('\n相關欄位搜尋：');
        const relatedColumns = columns.filter(col => 
          col.toLowerCase().includes('shift') || 
          col.toLowerCase().includes('time')
        );
        
        if (relatedColumns.length > 0) {
          console.log('找到相關欄位:');
          relatedColumns.forEach(col => console.log(`  - ${col}`));
        } else {
          console.log('沒有找到包含 shift 或 time 的欄位');
        }
      }
    }
    
    // 3. 檢查其他表格
    console.log('\n3. 檢查其他表格...');
    const tables = executeD1Command(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    if (tables) {
      console.log('資料庫中的所有表格:');
      const tableList = tables.split('\n').filter(line => line.trim());
      tableList.forEach(table => {
        if (table.includes('shift') || table.includes('mapping')) {
          console.log(`  ✅ ${table} (可能包含工班資料)`);
        } else {
          console.log(`  - ${table}`);
        }
      });
    }
    
    // 4. 檢查 site_shift_mapping 表
    console.log('\n4. 檢查 site_shift_mapping 表...');
    const mappingTable = executeD1Command(
      "SELECT COUNT(*) as count FROM site_shift_mapping"
    );
    
    if (mappingTable && !mappingTable.includes('no such table')) {
      console.log('✅ site_shift_mapping 表存在');
      console.log(mappingTable);
      
      // 查詢特定記錄
      const specificRecord = executeD1Command(
        "SELECT * FROM site_shift_mapping WHERE site_name LIKE '%2895%'"
      );
      
      if (specificRecord) {
        console.log('\n查詢 2895 的工班資料:');
        console.log(specificRecord);
      }
    } else {
      console.log('❌ site_shift_mapping 表不存在');
    }
    
    // 5. D1 限制說明
    console.log('\n====================================');
    console.log('D1 資料庫限制（根據官方文檔）');
    console.log('====================================');
    console.log('- 最大欄位數: 100 個');
    console.log('- 最大查詢時間: 30 秒');
    console.log('- 最大 SQL 語句長度: 100 KB');
    console.log('- 最大資料庫大小: 10 GB (付費) / 500 MB (免費)');
    console.log('\n如果表格已接近 100 個欄位限制，');
    console.log('ALTER TABLE ADD COLUMN 可能會失敗！');
    
  } catch (error) {
    console.error('執行失敗:', error);
  }
}

// 執行檢查
checkTableColumns();