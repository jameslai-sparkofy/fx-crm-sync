/**
 * 測試 FX API 時間格式
 */

const axios = require('axios');
require('dotenv').config();

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
  
  // 正確的路徑是 empList[0].openUserId
  const userId = response.data.empList?.[0]?.openUserId;
  
  if (!userId) {
    throw new Error('無法獲取用戶 ID');
  }
  
  console.log('獲取到的 userId:', userId);
  return userId;
}

async function testTimeFormats() {
  console.log('測試 FX API 時間格式...\n');

  // 獲取認證
  const { accessToken, corpId } = await getAccessToken();
  const currentOpenUserId = await getCurrentUserId(corpId, accessToken);

  // 準備不同的時間格式
  const now = new Date();
  const timeFormats = [
    {
      name: 'ISO 字符串',
      value: now.toISOString(),
      example: '2025-08-08T23:01:11.234Z'
    },
    {
      name: '時間戳（毫秒）',
      value: now.getTime(),
      example: 1754686871234
    },
    {
      name: '時間戳字符串',
      value: now.getTime().toString(),
      example: '1754686871234'
    },
    {
      name: '本地時間字符串',
      value: now.toLocaleString('zh-CN'),
      example: '2025/8/9 07:01:11'
    },
    {
      name: 'YYYY-MM-DD HH:mm:ss',
      value: now.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''),
      example: '2025-08-08 23:01:11'
    }
  ];

  // 測試每種格式
  for (const format of timeFormats) {
    console.log(`\n測試格式: ${format.name}`);
    console.log(`值: ${format.value}`);
    console.log(`範例: ${format.example}`);
    
    try {
      const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/v2/data/query`, {
        corpId,
        corpAccessToken: accessToken,
        currentOpenUserId,
        data: {
          dataObjectApiName: 'NewOpportunityObj',
          search_query_info: {
            offset: 0,
            limit: 1,
            filters: [
              {
                field_name: 'last_modified_time',
                operator: 'GTE',
                field_values: [format.value]
              }
            ]
          }
        }
      });

      if (response.data.errorCode === 0) {
        console.log(`✅ 成功！返回 ${response.data.data.total} 條記錄`);
        return format; // 返回成功的格式
      } else {
        console.log(`❌ 失敗: ${response.data.errorMessage}`);
      }
    } catch (error) {
      console.log(`❌ 錯誤: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  return null;
}

async function main() {
  try {
    const successFormat = await testTimeFormats();
    
    if (successFormat) {
      console.log('\n====================================');
      console.log(`✅ 正確的時間格式是: ${successFormat.name}`);
      console.log(`範例值: ${successFormat.example}`);
      console.log('====================================');
    } else {
      console.log('\n❌ 所有格式都失敗了！');
    }
  } catch (error) {
    console.error('測試失敗:', error);
  }
}

main();