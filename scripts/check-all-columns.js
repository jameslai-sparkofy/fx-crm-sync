#!/usr/bin/env node

/**
 * 檢查 D1 資料庫中 object_8W9cb__c 表的所有欄位
 * 特別關注 shift_time__c 是否存在
 */

const { execSync } = require('child_process');

console.log('檢查 object_8W9cb__c 表的所有欄位...\n');

try {
  // 切換到正確的目錄
  process.chdir('../workers');
  
  // 執行查詢獲取所有欄位
  const result = execSync(
    `npx wrangler d1 execute fx-crm-database --remote --command="SELECT name FROM pragma_table_info('object_8W9cb__c')" --json`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
  );
  
  try {
    const data = JSON.parse(result);
    const columns = data[0]?.results || [];
    
    console.log(`總共有 ${columns.length} 個欄位:\n`);
    
    // 列出所有欄位，並標記 shift_time__c
    let foundShiftTime = false;
    columns.forEach((col, index) => {
      const isShiftTime = col.name === 'shift_time__c';
      if (isShiftTime) {
        foundShiftTime = true;
        console.log(`✅ [${index + 1}] ${col.name} <-- 工班欄位`);
      } else {
        console.log(`   [${index + 1}] ${col.name}`);
      }
    });
    
    console.log('\n====================================');
    if (foundShiftTime) {
      console.log('✅ shift_time__c 欄位已存在！');
      
      // 檢查有多少記錄有工班資料
      const dataResult = execSync(
        `npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as total, COUNT(shift_time__c) as with_shift FROM object_8W9cb__c" --json`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      
      const stats = JSON.parse(dataResult)[0]?.results?.[0];
      console.log(`\n統計資料:`);
      console.log(`- 總記錄數: ${stats?.total || 0}`);
      console.log(`- 有工班資料的記錄: ${stats?.with_shift || 0}`);
      
      // 取得幾個範例
      const sampleResult = execSync(
        `npx wrangler d1 execute fx-crm-database --remote --command="SELECT _id, name, shift_time__c FROM object_8W9cb__c WHERE shift_time__c IS NOT NULL LIMIT 5" --json`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      
      const samples = JSON.parse(sampleResult)[0]?.results || [];
      if (samples.length > 0) {
        console.log(`\n工班資料範例:`);
        samples.forEach(s => {
          console.log(`  - ${s.name}: ${s.shift_time__c}`);
        });
      }
      
    } else {
      console.log('❌ shift_time__c 欄位不存在！');
      console.log('\n可能的原因：');
      console.log('1. 欄位在第 12 個位置（根據 field-mappings-all.js）');
      console.log('2. 但 D1 表中沒有這個欄位');
      console.log('3. 可能在初始建表時遺漏了');
      
      console.log('\n解決方案：');
      console.log('1. 執行 ALTER TABLE 添加欄位');
      console.log('2. 重新同步資料');
    }
    
    // 檢查欄位映射檔案中的定義
    console.log('\n====================================');
    console.log('檢查欄位映射檔案中的定義...');
    
    const fs = require('fs');
    const mappingFile = '../workers/src/data/field-mappings-all.js';
    
    if (fs.existsSync(mappingFile)) {
      const content = fs.readFileSync(mappingFile, 'utf8');
      const lines = content.split('\n');
      const shiftTimeLine = lines.find(line => line.includes('shift_time__c'));
      
      if (shiftTimeLine) {
        const lineNumber = lines.indexOf(shiftTimeLine) + 1;
        console.log(`✅ 在 field-mappings-all.js 第 ${lineNumber} 行找到 shift_time__c 定義：`);
        console.log(`   ${shiftTimeLine.trim()}`);
      }
    }
    
  } catch (parseError) {
    console.error('無法解析 JSON 結果:', parseError.message);
    console.log('原始輸出:', result);
  }
  
} catch (error) {
  console.error('執行失敗:', error.message);
  
  // 如果是因為缺少 Node 22，提供提示
  if (error.message.includes('Node.js')) {
    console.log('\n請先執行: source ~/.nvm/nvm.sh && nvm use 22');
  }
}