#!/usr/bin/env node
/**
 * 驗證欄位同步結果
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function verifyFields() {
  console.log('='.repeat(60));
  console.log('驗證 object_8W9cb__c 表欄位');
  console.log('='.repeat(60));

  try {
    // 獲取表結構
    const { stdout } = await execPromise(
      'npx wrangler d1 execute fx-crm-database --remote --command="SELECT sql FROM sqlite_master WHERE name = \'object_8W9cb__c\'"'
    );
    
    console.log('\n表結構 SQL:');
    console.log(stdout);
    
    // 檢查關鍵欄位
    const keyFields = [
      'shift_time__c',      // 工班
      'field_3T38o__c',     // 平面圖
      'field_u1wpv__c',     // 工班師父
      'field_sF6fn__c',     // 施工前備註
      'field_27g6n__c',     // 保護板坪數
      'field_23pFq__c',     // 施工日期
      'field_V3d91__c',     // 施工前照片
      'field_B2gh1__c',     // 舖設坪數
      'field_f0mz3__c',     // 保固日期
      'bad_case_scene__c',  // 做壞案場
      'construction_completed__c', // 施工完成
      'field_z9H6O__c'      // 階段
    ];
    
    console.log('\n關鍵欄位檢查:');
    console.log('-'.repeat(40));
    
    const sql = stdout.toLowerCase();
    let missingFields = [];
    
    keyFields.forEach(field => {
      if (sql.includes(field.toLowerCase())) {
        console.log(`✅ ${field} - 存在`);
      } else {
        console.log(`❌ ${field} - 缺失`);
        missingFields.push(field);
      }
    });
    
    if (missingFields.length === 0) {
      console.log('\n✅ 所有關鍵欄位都已成功添加！');
    } else {
      console.log(`\n⚠️ 有 ${missingFields.length} 個欄位缺失:`);
      missingFields.forEach(f => console.log(`  - ${f}`));
    }
    
    // 獲取記錄數
    const { stdout: countOutput } = await execPromise(
      'npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as count FROM object_8W9cb__c"'
    );
    
    console.log('\n表記錄統計:');
    console.log(countOutput);
    
  } catch (error) {
    console.error('❌ 驗證失敗:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
}

// 執行驗證
verifyFields();