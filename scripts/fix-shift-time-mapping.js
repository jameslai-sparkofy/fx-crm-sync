#!/usr/bin/env node
/**
 * 修復 shift_time 欄位映射問題
 * CRM 有: shift_time__c (名稱), shift_time__c__v (ID)
 * D1 有: shift_time__c, shift_time__c__r, shift_time__c__relation_ids
 * 需要正確映射這些欄位
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: process.env.FX_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FX_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FX_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function getAccessToken() {
  const response = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, credentials);
  if (response.data.errorCode !== 0) {
    throw new Error(`獲取 token 失敗: ${response.data.errorMessage}`);
  }
  return {
    corpId: response.data.corpId,
    corpAccessToken: response.data.corpAccessToken
  };
}

async function getCurrentUserId(corpId, accessToken) {
  const response = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
    corpId,
    corpAccessToken: accessToken,
    mobile: "17675662629"
  });
  if (response.data.errorCode !== 0) {
    throw new Error(`獲取用戶 ID 失敗: ${response.data.errorMessage}`);
  }
  return response.data.empList[0].openUserId;
}

async function fetchSitesWithShiftTime(corpId, corpAccessToken, currentOpenUserId) {
  console.log('\n📥 從 CRM 獲取有工班資料的案場...');
  
  const allSites = [];
  let offset = 0;
  const limit = 500;
  let hasMore = true;
  
  while (hasMore && offset < 5000) { // 最多獲取5000條
    const response = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: limit,
          offset: offset,
          filters: [
            {
              field_name: 'life_status',
              operator: 'NEQ',
              field_values: ['作废']
            }
          ]
        }
      }
    });

    if (response.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${response.data.errorMessage}`);
    }

    const batch = response.data.data.dataList || [];
    allSites.push(...batch);
    
    console.log(`  獲取第 ${Math.floor(offset/limit) + 1} 批: ${batch.length} 條記錄`);
    
    hasMore = batch.length === limit;
    offset += limit;
    
    // 避免請求過快
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // 過濾出有 shift_time 的記錄
  const sitesWithShift = allSites.filter(site => 
    site.shift_time__c != null || site.shift_time__c__v != null
  );
  
  console.log(`  ✅ 總共獲取 ${allSites.length} 條記錄`);
  console.log(`  ✅ 其中 ${sitesWithShift.length} 條有工班資料`);
  
  return { allSites, sitesWithShift };
}

async function generateUpdateSQL(sites) {
  console.log('\n📝 生成更新 SQL...');
  
  const updates = [];
  let updateCount = 0;
  
  sites.forEach(site => {
    if (site.shift_time__c || site.shift_time__c__v) {
      // 正確映射欄位：
      // CRM shift_time__c (名稱) -> D1 shift_time__c
      // CRM shift_time__c__v (ID) -> D1 shift_time__c__relation_ids
      // 生成一個虛擬的 shift_time__c__r JSON 對象
      
      const shiftTimeJson = site.shift_time__c ? 
        JSON.stringify({ name: site.shift_time__c, id: site.shift_time__c__v || null }) : 
        null;
      
      const sql = `
        UPDATE object_8W9cb__c 
        SET 
          shift_time__c = '${site.shift_time__c || ''}',
          shift_time__c__r = '${shiftTimeJson}',
          shift_time__c__relation_ids = '${site.shift_time__c__v || ''}'
        WHERE _id = '${site._id}';
      `.trim();
      
      updates.push(sql);
      updateCount++;
    }
  });
  
  console.log(`  ✅ 生成 ${updateCount} 條更新語句`);
  
  return updates;
}

async function executeSQLBatch(sqlStatements) {
  console.log('\n🔧 執行 SQL 更新...');
  
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < sqlStatements.length; i += batchSize) {
    const batch = sqlStatements.slice(i, i + batchSize);
    const batchSQL = batch.join('\n');
    
    // 寫入 SQL 檔案
    const fs = require('fs');
    const path = require('path');
    const sqlFileName = `shift-time-update-batch-${Math.floor(i/batchSize) + 1}.sql`;
    const sqlFilePath = path.join(__dirname, '..', 'workers', 'sql', sqlFileName);
    
    fs.writeFileSync(sqlFilePath, batchSQL, 'utf8');
    console.log(`  批次 ${Math.floor(i/batchSize) + 1}: 寫入 ${sqlFileName}`);
    
    // 執行 SQL
    try {
      const { exec } = require('child_process');
      const command = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/${sqlFileName} --remote`;
      
      await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`  ❌ 批次 ${Math.floor(i/batchSize) + 1} 執行失敗:`, error.message);
            errorCount += batch.length;
            resolve(); // 繼續處理下一批
          } else {
            console.log(`  ✅ 批次 ${Math.floor(i/batchSize) + 1} 執行成功`);
            successCount += batch.length;
            resolve();
          }
        });
      });
      
      // 清理 SQL 檔案
      fs.unlinkSync(sqlFilePath);
      
    } catch (error) {
      console.error(`  ❌ 批次執行異常:`, error.message);
      errorCount += batch.length;
    }
    
    // 避免過快執行
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 執行結果:`);
  console.log(`  成功: ${successCount} 條`);
  console.log(`  失敗: ${errorCount} 條`);
  
  return { successCount, errorCount };
}

async function verifyUpdate() {
  console.log('\n🔍 驗證更新結果...');
  
  try {
    // 使用 wrangler 命令檢查
    const { exec } = require('child_process');
    const command = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) as total, COUNT(shift_time__c) as with_name, COUNT(shift_time__c__r) as with_r, COUNT(shift_time__c__relation_ids) as with_ids FROM object_8W9cb__c"`;
    
    await new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (!error && stdout) {
          console.log('  資料庫統計結果:');
          console.log(stdout);
        }
        resolve();
      });
    });
    
  } catch (error) {
    console.log('  ⚠️ 無法驗證更新結果');
  }
}

async function fixShiftTimeMapping() {
  console.log('='.repeat(80));
  console.log('修復 shift_time 欄位映射');
  console.log('='.repeat(80));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 獲取所有案場數據
    const { allSites, sitesWithShift } = await fetchSitesWithShiftTime(
      corpId, 
      corpAccessToken, 
      currentOpenUserId
    );

    if (sitesWithShift.length === 0) {
      console.log('⚠️ 沒有找到有工班資料的案場');
      return;
    }

    // 3. 生成更新 SQL
    const updateStatements = await generateUpdateSQL(sitesWithShift);

    if (updateStatements.length === 0) {
      console.log('⚠️ 沒有需要更新的記錄');
      return;
    }

    // 4. 執行更新
    const { successCount, errorCount } = await executeSQLBatch(updateStatements);

    // 5. 驗證結果
    await verifyUpdate();

    // 6. 總結
    console.log('\n' + '='.repeat(80));
    console.log('修復完成總結');
    console.log('='.repeat(80));
    console.log(`CRM 案場總數: ${allSites.length}`);
    console.log(`有工班資料: ${sitesWithShift.length}`);
    console.log(`更新成功: ${successCount}`);
    console.log(`更新失敗: ${errorCount}`);
    
    // 顯示範例
    if (sitesWithShift.length > 0) {
      console.log('\n範例記錄:');
      const sample = sitesWithShift[0];
      console.log(`  案場名稱: ${sample.name}`);
      console.log(`  shift_time__c: ${sample.shift_time__c}`);
      console.log(`  shift_time__c__v: ${sample.shift_time__c__v}`);
    }

  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('shift_time 映射修復任務完成');
  console.log('='.repeat(80));
}

// 執行修復
fixShiftTimeMapping();