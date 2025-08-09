/**
 * 測試單條案場記錄的數據結構
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

  return response.data.empList?.[0]?.openUserId;
}

async function getSingleSite(corpId, accessToken, currentOpenUserId) {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      search_query_info: {
        offset: 0,
        limit: 1,
        filters: [
          {
            field_name: 'life_status',
            operator: 'NEQ',
            field_values: ['作废']
          }
        ],
        orders: [{ fieldName: 'last_modified_time', isAsc: false }]
      }
    }
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`查詢失敗: ${response.data.errorMessage}`);
  }

  return response.data.data.dataList[0] || null;
}

async function main() {
  try {
    console.log('=== 測試單條案場記錄數據結構 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取單條記錄
    const site = await getSingleSite(corpId, accessToken, currentOpenUserId);
    
    if (site) {
      console.log('案場記錄數據結構:');
      console.log('_id:', site._id);
      console.log('name:', site.name);
      console.log('owner:', typeof site.owner, site.owner);
      console.log('owner__r:', typeof site.owner__r, JSON.stringify(site.owner__r, null, 2));
      console.log('created_by:', typeof site.created_by, site.created_by);
      console.log('created_by__r:', typeof site.created_by__r, JSON.stringify(site.created_by__r, null, 2));
      console.log('last_modified_time:', site.last_modified_time);
      console.log('create_time:', site.create_time);
      console.log('life_status:', site.life_status);
      console.log('field_23Z5i__c:', typeof site.field_23Z5i__c, site.field_23Z5i__c);
      
      console.log('\n完整記錄結構:');
      console.log(JSON.stringify(site, null, 2));
    } else {
      console.log('❌ 未找到案場記錄');
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    if (error.response?.data) {
      console.error('API 錯誤詳情:', error.response.data);
    }
  }
}

main();