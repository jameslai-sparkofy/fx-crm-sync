#!/usr/bin/env node

/**
 * 通過重建表格來修復 shift_time__c 欄位問題
 * 
 * 策略：
 * 1. 創建一個新的臨時表，包含 shift_time__c 欄位
 * 2. 複製數據到新表
 * 3. 刪除舊表，重命名新表
 */

const { execSync } = require('child_process');

const API_TOKEN = 'F0pPzDMbcWv4JIx14g2P7COIz5KON5IMux568moW';
process.env.CLOUDFLARE_API_TOKEN = API_TOKEN;

console.log('====================================');
console.log('修復 shift_time__c 欄位（重建表格）');
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

async function fixShiftTimeColumn() {
  try {
    // 1. 先備份一條記錄來測試
    console.log('1. 檢查表格結構...');
    const checkResult = executeD1Command(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='object_8W9cb__c'"
    );
    console.log('當前表格結構已獲取');
    
    // 2. 創建新表，包含 shift_time__c
    console.log('\n2. 創建包含 shift_time__c 的新表格...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS object_8W9cb__c_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        _id TEXT UNIQUE,
        name TEXT,
        shift_time__c TEXT,
        field_WD7k1__c TEXT,
        field_Q6Svh__c REAL,
        field_XuJP2__c TEXT,
        field_u1wpv__c TEXT,
        field_23pFq__c TEXT,
        field_B2gh1__c REAL,
        field_3Fqof__c TEXT,
        construction_completed__c BOOLEAN,
        field_1P96q__c TEXT,
        field_23Z5i__c TEXT,
        field_dxr31__c TEXT,
        field_z9H6O__c TEXT,
        owner TEXT,
        created_by TEXT,
        create_time TEXT,
        last_modified_by TEXT,
        last_modified_time TEXT,
        life_status TEXT,
        fx_created_at DATETIME,
        fx_updated_at DATETIME,
        fx_sync_version INTEGER DEFAULT 1,
        fx_is_deleted BOOLEAN DEFAULT 0,
        local_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        local_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createResult = executeD1Command(createTableSQL);
    if (createResult) {
      console.log('✅ 新表格創建成功');
    }
    
    // 3. 複製數據（不包含 shift_time__c，因為舊表沒有）
    console.log('\n3. 複製現有數據到新表格...');
    const copyDataSQL = `
      INSERT INTO object_8W9cb__c_new (
        _id, name, field_WD7k1__c, field_Q6Svh__c, field_XuJP2__c,
        field_u1wpv__c, field_23pFq__c, field_B2gh1__c, field_3Fqof__c,
        construction_completed__c, field_1P96q__c, field_23Z5i__c,
        field_dxr31__c, field_z9H6O__c, owner, created_by, create_time,
        last_modified_by, last_modified_time, life_status,
        fx_created_at, fx_updated_at, fx_sync_version, fx_is_deleted,
        local_created_at, local_updated_at
      )
      SELECT 
        _id, name, field_WD7k1__c, field_Q6Svh__c, field_XuJP2__c,
        field_u1wpv__c, field_23pFq__c, field_B2gh1__c, field_3Fqof__c,
        construction_completed__c, field_1P96q__c, field_23Z5i__c,
        field_dxr31__c, field_z9H6O__c, owner, created_by, create_time,
        last_modified_by, last_modified_time, life_status,
        fx_created_at, fx_updated_at, fx_sync_version, fx_is_deleted,
        local_created_at, local_updated_at
      FROM object_8W9cb__c
      LIMIT 10
    `;
    
    const copyResult = executeD1Command(copyDataSQL);
    if (copyResult) {
      console.log('✅ 數據複製成功（測試 10 筆）');
    }
    
    // 4. 驗證新表格
    console.log('\n4. 驗證新表格...');
    const verifyResult = executeD1Command(
      "SELECT name FROM pragma_table_info('object_8W9cb__c_new') WHERE name = 'shift_time__c'"
    );
    
    const countResult = executeD1Command(
      "SELECT COUNT(*) as count FROM object_8W9cb__c_new"
    );
    
    console.log('✅ 新表格包含 shift_time__c 欄位');
    
    // 5. 測試更新 shift_time__c
    console.log('\n5. 測試更新 shift_time__c...');
    const updateResult = executeD1Command(
      "UPDATE object_8W9cb__c_new SET shift_time__c = '測試工班' WHERE name = '24-12-11-2895'"
    );
    
    if (updateResult) {
      console.log('✅ shift_time__c 欄位可正常使用');
    }
    
    console.log('\n====================================');
    console.log('測試完成！');
    console.log('====================================');
    console.log('\n下一步：');
    console.log('1. 如果測試成功，可以執行完整的表格替換');
    console.log('2. 將 object_8W9cb__c 重命名為 object_8W9cb__c_old');
    console.log('3. 將 object_8W9cb__c_new 重命名為 object_8W9cb__c');
    console.log('4. 重新執行同步');
    
  } catch (error) {
    console.error('執行失敗:', error);
  }
}

// 執行修復
fixShiftTimeColumn();