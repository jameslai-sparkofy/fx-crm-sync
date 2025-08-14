// 檢查案場 CRM 實際記錄數
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
    appId: 'FSAID_1320691',
    appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
    permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function checkSPCCount() {
    try {
        console.log('🔍 檢查案場(SPC) CRM 實際記錄數...\n');
        
        // 1. 獲取 Access Token
        console.log('獲取訪問令牌...');
        const tokenResponse = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, credentials);
        
        if (tokenResponse.data.errorCode !== 0) {
            throw new Error(`獲取 Token 失敗: ${tokenResponse.data.errorMessage}`);
        }
        
        const { corpAccessToken, corpId } = tokenResponse.data;
        console.log('✅ Token 獲取成功\n');
        
        // 2. 獲取用戶 ID
        console.log('獲取用戶 ID...');
        const userResponse = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
            corpId,
            corpAccessToken,
            mobile: "17675662629"
        });
        
        const currentOpenUserId = userResponse.data.currentOpenUserId || userResponse.data.employee?.openUserId;
        console.log('✅ 用戶 ID 獲取成功\n');
        
        // 3. 查詢案場總數（不過濾作廢）
        console.log('查詢所有案場記錄（包含作廢）...');
        const allResponse = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
            corpId,
            corpAccessToken,
            currentOpenUserId,
            data: {
                dataObjectApiName: 'object_8W9cb__c',
                offset: 0,
                limit: 1,
                filters: []  // 不過濾
            }
        });
        
        console.log('API 響應：', JSON.stringify(allResponse.data, null, 2));
        const totalAll = allResponse.data.data?.total || allResponse.data.dataList?.total || 0;
        console.log(`📊 所有記錄總數：${totalAll}\n`);
        
        // 4. 查詢非作廢記錄
        console.log('查詢非作廢案場記錄...');
        const activeResponse = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
            corpId,
            corpAccessToken,
            currentOpenUserId,
            data: {
                dataObjectApiName: 'object_8W9cb__c',
                offset: 0,
                limit: 1,
                filters: [
                    {
                        field_name: 'life_status',
                        operator: 'NEQ',
                        field_values: ['作废']
                    }
                ]
            }
        });
        
        const totalActive = activeResponse.data.data.total;
        console.log(`📊 非作廢記錄總數：${totalActive}\n`);
        
        // 5. 計算差異
        const voided = totalAll - totalActive;
        console.log('=====================================');
        console.log('📈 統計結果：');
        console.log(`  總記錄數：${totalAll}`);
        console.log(`  非作廢：${totalActive}`);
        console.log(`  作廢：${voided}`);
        console.log('=====================================\n');
        
        // 6. 與資料庫比較
        console.log('與資料庫比較：');
        console.log(`  CRM 非作廢：${totalActive}`);
        console.log(`  D1 資料庫：4079`);
        console.log(`  差異：${totalActive - 4079}`);
        
        if (totalActive > 4079) {
            console.log('\n⚠️ 資料庫記錄少於 CRM，需要繼續同步！');
        } else if (totalActive < 4079) {
            console.log('\n⚠️ 資料庫記錄多於 CRM，可能有重複或錯誤數據！');
        } else {
            console.log('\n✅ 資料庫與 CRM 記錄數一致！');
        }
        
    } catch (error) {
        console.error('❌ 錯誤：', error.message);
        if (error.response) {
            console.error('API 響應：', error.response.data);
        }
    }
}

checkSPCCount();