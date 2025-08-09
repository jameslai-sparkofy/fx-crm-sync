#!/usr/bin/env node
/**
 * 批量添加所有缺失的欄位到 object_8W9cb__c 表
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 所有需要添加的欄位
const fieldsToAdd = [
  // 引用欄位
  { name: 'shift_time__c__r', type: 'TEXT' },
  { name: 'shift_time__c__relation_ids', type: 'TEXT' },
  
  // 圖片欄位
  { name: 'field_3T38o__c', type: 'TEXT' }, // 平面圖
  { name: 'field_V3d91__c', type: 'TEXT' }, // 施工前照片
  { name: 'field_v1x3S__c', type: 'TEXT' }, // 驗收照片
  { name: 'field_03U9h__c', type: 'TEXT' }, // 工地狀況照片
  { name: 'field_3Fqof__c', type: 'TEXT' }, // 完工照片
  { name: 'field_W2i6j__c', type: 'TEXT' }, // 施工前缺失
  
  // 文本欄位
  { name: 'field_u1wpv__c', type: 'TEXT' }, // 工班師父
  { name: 'field_sF6fn__c', type: 'TEXT' }, // 施工前備註
  { name: 'field_sijGR__c', type: 'TEXT' }, // 維修備註1
  { name: 'field_V32Xl__c', type: 'TEXT' }, // 工班備註
  { name: 'field_n37jC__c', type: 'TEXT' }, // 驗收備註
  { name: 'field_g18hX__c', type: 'TEXT' }, // 工地備註
  
  // 數字欄位
  { name: 'field_27g6n__c', type: 'REAL' }, // 保護板坪數
  { name: 'field_B2gh1__c', type: 'REAL' }, // 舖設坪數
  
  // 日期欄位
  { name: 'field_23pFq__c', type: 'TEXT' }, // 施工日期
  { name: 'field_f0mz3__c', type: 'TEXT' }, // 保固日期
  
  // 布爾值欄位
  { name: 'bad_case_scene__c', type: 'BOOLEAN DEFAULT FALSE' }, // 做壞案場
  { name: 'construction_completed__c', type: 'BOOLEAN DEFAULT FALSE' }, // 施工完成
  
  // 系統欄位
  { name: 'lock_rule', type: 'TEXT' },
  { name: 'life_status_before_invalid', type: 'TEXT' },
  { name: 'package', type: 'TEXT' },
  { name: 'tenant_id', type: 'TEXT' },
  { name: 'origin_source', type: 'TEXT' },
  { name: 'lock_user', type: 'TEXT' },
  { name: 'lock_user__r', type: 'TEXT' },
  { name: 'object_describe_api_name', type: 'TEXT' },
  { name: 'out_owner', type: 'TEXT' },
  { name: 'out_owner__r', type: 'TEXT' },
  { name: 'out_tenant_id', type: 'TEXT' },
  
  // 附件欄位
  { name: 'field_1zk34__c', type: 'TEXT' }, // 缺失影片
  
  // 階段選項欄位
  { name: 'field_z9H6O__c', type: 'TEXT' }, // 階段
  { name: 'field_z9H6O__c__r', type: 'TEXT' },
  
  // 排序欄位
  { name: 'order_by', type: 'INTEGER' }
];

async function addFields() {
  console.log('='.repeat(60));
  console.log('批量添加缺失欄位到 object_8W9cb__c 表');
  console.log('='.repeat(60));
  console.log(`總共需要添加 ${fieldsToAdd.length} 個欄位\n`);

  let successCount = 0;
  let errorCount = 0;
  let errors = [];

  for (const field of fieldsToAdd) {
    try {
      const sql = `ALTER TABLE object_8W9cb__c ADD COLUMN ${field.name} ${field.type}`;
      console.log(`執行: ${sql}`);
      
      const { stdout, stderr } = await execPromise(
        `npx wrangler d1 execute fx-crm-database --remote --command="${sql}"`
      );
      
      if (stderr && !stderr.includes('wrangler')) {
        console.log(`  ⚠️ ${field.name}: ${stderr}`);
        errorCount++;
        errors.push({ field: field.name, error: stderr });
      } else {
        console.log(`  ✅ ${field.name} 添加成功`);
        successCount++;
      }
    } catch (error) {
      // 如果欄位已存在，SQLite 會報錯，但這是正常的
      if (error.message.includes('duplicate column name') || 
          error.message.includes('already exists')) {
        console.log(`  ℹ️ ${field.name} 已存在`);
        successCount++;
      } else {
        console.log(`  ❌ ${field.name}: ${error.message}`);
        errorCount++;
        errors.push({ field: field.name, error: error.message });
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('執行結果摘要:');
  console.log(`✅ 成功: ${successCount} 個欄位`);
  console.log(`❌ 失敗: ${errorCount} 個欄位`);
  
  if (errors.length > 0) {
    console.log('\n失敗詳情:');
    errors.forEach(e => {
      console.log(`  - ${e.field}: ${e.error}`);
    });
  }
  
  console.log('='.repeat(60));
}

// 執行
addFields().catch(console.error);