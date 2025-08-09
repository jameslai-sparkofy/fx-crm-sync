/**
 * 比較 CRM 和 D1 的記錄 ID，找出缺失的記錄
 */

const axios = require('axios');
require('dotenv').config();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const FX_CONFIG = {
  baseUrl: process.env.FX_API_BASE_URL || 'https://open.fxiaoke.com',
  appId: process.env.FXIAOKE_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FXIAOKE_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FXIAOKE_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function getAccessToken() {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/corpAccessToken/get/V2`, {
    appId: FX_CONFIG.appId,
    appSecret: FX_CONFIG.appSecret,
    permanentCode: FX_CONFIG.permanentCode
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`獲取 token 失敗: ${response.data.errorMessage}`);
  }

  return {
    accessToken: response.data.corpAccessToken,
    corpId: response.data.corpId
  };
}

async function getCurrentUserId(corpId, accessToken) {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/user/getByMobile`, {
    corpId: corpId,
    corpAccessToken: accessToken,
    mobile: "17675662629"
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`獲取用戶失敗: ${response.data.errorMessage}`);
  }

  return response.data.empList?.[0]?.openUserId;
}

async function getAllCRMIds(corpId, accessToken, currentOpenUserId) {
  const allIds = [];
  let offset = 0;
  const limit = 500;
  
  while (true) {
    const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          offset: offset,
          limit: limit,
          filters: [
            {
              field_name: 'life_status',
              operator: 'NEQ',
              field_values: ['作废']
            }
          ],
          orders: [{ fieldName: '_id', isAsc: true }]
        }
      }
    });

    if (response.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${response.data.errorMessage}`);
    }

    const records = response.data.data?.dataList || [];
    for (const record of records) {
      allIds.push({
        id: record._id,
        name: record.name,
        createTime: new Date(record.create_time).toISOString()
      });
    }

    process.stdout.write(`\r從 CRM 獲取記錄: ${allIds.length} 條`);

    if (records.length < limit) {
      break;
    }
    
    offset += limit;
  }
  
  console.log(''); // 換行
  return allIds;
}

async function getAllD1Ids() {
  const allIds = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const command = `cd /mnt/c/claude\\ code/紛銷資料庫/fx-crm-sync/workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT _id, name, create_time FROM object_8w9cb__c ORDER BY _id ASC LIMIT ${limit} OFFSET ${offset}" --json 2>/dev/null`;
    
    try {
      const { stdout } = await execPromise(command);
      const result = JSON.parse(stdout);
      
      if (result[0]?.results) {
        for (const record of result[0].results) {
          allIds.push({
            id: record._id,
            name: record.name,
            createTime: new Date(record.create_time).toISOString()
          });
        }
        
        process.stdout.write(`\r從 D1 獲取記錄: ${allIds.length} 條`);
        
        if (result[0].results.length < limit) {
          break;
        }
      } else {
        break;
      }
      
      offset += limit;
    } catch (error) {
      console.error('執行 wrangler 命令失敗:', error.message);
      break;
    }
  }
  
  console.log(''); // 換行
  return allIds;
}

async function main() {
  try {
    console.log('=== 比較 CRM 和 D1 記錄 ID ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取所有 CRM IDs
    console.log('📊 獲取 CRM 記錄...');
    const crmIds = await getAllCRMIds(corpId, accessToken, currentOpenUserId);
    console.log(`✅ CRM 總計: ${crmIds.length} 條記錄\n`);
    
    // 獲取所有 D1 IDs
    console.log('📊 獲取 D1 記錄...');
    const d1Ids = await getAllD1Ids();
    console.log(`✅ D1 總計: ${d1Ids.length} 條記錄\n`);
    
    // 比較差異
    console.log('🔍 分析差異...\n');
    
    // 創建 ID 集合便於查找
    const d1IdSet = new Set(d1Ids.map(r => r.id));
    const crmIdSet = new Set(crmIds.map(r => r.id));
    
    // 找出在 CRM 但不在 D1 的記錄
    const missingInD1 = crmIds.filter(r => !d1IdSet.has(r.id));
    
    // 找出在 D1 但不在 CRM 的記錄
    const extraInD1 = d1Ids.filter(r => !crmIdSet.has(r.id));
    
    console.log('📈 統計結果:');
    console.log(`  CRM 記錄數: ${crmIds.length}`);
    console.log(`  D1 記錄數: ${d1Ids.length}`);
    console.log(`  差異: ${crmIds.length - d1Ids.length}`);
    console.log(`  同步率: ${(d1Ids.length / crmIds.length * 100).toFixed(2)}%\n`);
    
    if (missingInD1.length > 0) {
      console.log(`❌ 在 CRM 但不在 D1 的記錄: ${missingInD1.length} 條`);
      
      // 顯示前 10 條缺失記錄
      console.log('\n缺失記錄樣本（前 10 條）:');
      for (let i = 0; i < Math.min(10, missingInD1.length); i++) {
        const record = missingInD1[i];
        console.log(`  ${i + 1}. ${record.name} (${record.id}) - 創建於 ${record.createTime}`);
      }
      
      // 分析缺失記錄的時間分佈
      console.log('\n📅 缺失記錄的創建時間分佈:');
      const timeRanges = {
        '2024年3月': 0,
        '2024年4月': 0,
        '2024年5月': 0,
        '2024年6月及之後': 0
      };
      
      for (const record of missingInD1) {
        const date = new Date(record.createTime);
        if (date < new Date('2024-04-01')) {
          timeRanges['2024年3月']++;
        } else if (date < new Date('2024-05-01')) {
          timeRanges['2024年4月']++;
        } else if (date < new Date('2024-06-01')) {
          timeRanges['2024年5月']++;
        } else {
          timeRanges['2024年6月及之後']++;
        }
      }
      
      for (const [range, count] of Object.entries(timeRanges)) {
        if (count > 0) {
          console.log(`  ${range}: ${count} 條 (${(count / missingInD1.length * 100).toFixed(1)}%)`);
        }
      }
      
      // 輸出缺失記錄的 ID 列表到文件
      const fs = require('fs');
      const missingIds = missingInD1.map(r => r.id);
      fs.writeFileSync('missing-ids.txt', missingIds.join('\n'));
      console.log('\n💾 已將所有缺失記錄 ID 保存到 missing-ids.txt');
    }
    
    if (extraInD1.length > 0) {
      console.log(`\n⚠️ 在 D1 但不在 CRM 的記錄: ${extraInD1.length} 條`);
      console.log('（可能是已作廢的記錄）');
    }
    
    // 建議
    console.log('\n💡 建議解決方案:');
    if (missingInD1.length > 0) {
      console.log('  1. 執行針對性同步，只同步缺失的記錄');
      console.log('  2. 檢查這些記錄是否有特殊字符或數據格式問題');
      console.log('  3. 分批手動同步缺失記錄');
      console.log('  4. 檢查 Worker 日誌查看寫入失敗原因');
    } else {
      console.log('  ✅ 所有記錄已完全同步！');
    }
    
  } catch (error) {
    console.error('\n❌ 比較失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();