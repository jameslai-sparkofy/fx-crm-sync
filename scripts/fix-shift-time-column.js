#!/usr/bin/env node

/**
 * 修復 shift_time__c 欄位未同步問題
 * 
 * 問題：案場(SPC) object_8W9cb__c 表中缺少 shift_time__c (工班) 欄位
 * 原因：可能在建表時遺漏了這個欄位
 * 解決：添加欄位並重新同步數據
 */

const { execSync } = require('child_process');

console.log('====================================');
console.log('修復 shift_time__c 欄位未同步問題');
console.log('====================================\n');

// 設定環境變數
process.env.NODE_VERSION = '22';

// 1. 檢查欄位是否存在
console.log('1. 檢查 shift_time__c 欄位是否存在...');
try {
  const checkCmd = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='object_8W9cb__c'" --json`;
  const result = execSync(checkCmd, { 
    encoding: 'utf8',
    cwd: '../workers'
  });
  
  const data = JSON.parse(result);
  const createSql = data[0]?.results?.[0]?.sql || '';
  
  if (createSql.includes('shift_time__c')) {
    console.log('✅ shift_time__c 欄位已存在');
    console.log('\n檢查欄位資料...');
    
    const dataCheckCmd = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as total, COUNT(shift_time__c) as with_shift FROM object_8W9cb__c" --json`;
    const dataResult = execSync(dataCheckCmd, {
      encoding: 'utf8',
      cwd: '../workers'
    });
    const stats = JSON.parse(dataResult)[0]?.results?.[0];
    console.log(`總記錄數: ${stats?.total || 0}`);
    console.log(`有工班資料的記錄: ${stats?.with_shift || 0}`);
    
  } else {
    console.log('❌ shift_time__c 欄位不存在，需要添加');
    
    // 2. 添加欄位
    console.log('\n2. 添加 shift_time__c 欄位到資料表...');
    const alterCmd = `npx wrangler d1 execute fx-crm-database --remote --command="ALTER TABLE object_8W9cb__c ADD COLUMN shift_time__c TEXT"`;
    
    try {
      execSync(alterCmd, {
        encoding: 'utf8',
        cwd: '../workers',
        stdio: 'inherit'
      });
      console.log('✅ 欄位添加成功');
    } catch (error) {
      console.error('❌ 添加欄位失敗:', error.message);
      process.exit(1);
    }
  }
  
  // 3. 觸發重新同步以填充數據
  console.log('\n3. 觸發重新同步案場數據...');
  console.log('執行增量同步（只同步有 shift_time__c 的記錄）...');
  
  const syncCmd = `curl -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/start" \
    -H "Content-Type: application/json" \
    -d '{"fullSync": false}'`;
  
  console.log('執行命令:', syncCmd);
  execSync(syncCmd, { stdio: 'inherit' });
  
  console.log('\n✅ 已觸發同步，請等待同步完成');
  
  // 4. 等待並檢查結果
  console.log('\n等待 10 秒後檢查結果...');
  setTimeout(() => {
    const finalCheckCmd = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as total, COUNT(shift_time__c) as with_shift, COUNT(DISTINCT shift_time__c) as unique_shifts FROM object_8W9cb__c" --json`;
    
    try {
      const finalResult = execSync(finalCheckCmd, {
        encoding: 'utf8',
        cwd: '../workers'
      });
      const finalStats = JSON.parse(finalResult)[0]?.results?.[0];
      
      console.log('\n====================================');
      console.log('最終統計結果:');
      console.log('====================================');
      console.log(`總記錄數: ${finalStats?.total || 0}`);
      console.log(`有工班資料的記錄: ${finalStats?.with_shift || 0}`);
      console.log(`不重複的工班數: ${finalStats?.unique_shifts || 0}`);
      
      if (finalStats?.with_shift > 0) {
        console.log('\n✅ shift_time__c 欄位修復成功！');
        
        // 顯示前幾個工班
        const sampleCmd = `npx wrangler d1 execute fx-crm-database --remote --command="SELECT DISTINCT shift_time__c FROM object_8W9cb__c WHERE shift_time__c IS NOT NULL LIMIT 5" --json`;
        const sampleResult = execSync(sampleCmd, {
          encoding: 'utf8',
          cwd: '../workers'
        });
        const samples = JSON.parse(sampleResult)[0]?.results || [];
        
        if (samples.length > 0) {
          console.log('\n工班範例:');
          samples.forEach(s => {
            console.log(`  - ${s.shift_time__c}`);
          });
        }
      } else {
        console.log('\n⚠️  欄位已添加但還沒有數據，可能需要執行完整同步');
        console.log('建議執行: npm run sync:sites-full');
      }
      
    } catch (error) {
      console.error('檢查失敗:', error.message);
    }
  }, 10000);
  
} catch (error) {
  console.error('執行失敗:', error.message);
  process.exit(1);
}