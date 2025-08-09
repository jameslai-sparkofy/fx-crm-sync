const axios = require('axios');

async function syncShiftTimeData() {
  const baseUrl = 'https://open.fxiaoke.com';
  
  try {
    // Get token
    console.log('獲取 Access Token...');
    const tokenResp = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, {
      appId: 'FSAID_1320691',
      appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
      permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
    });
    
    const accessToken = tokenResp.data.corpAccessToken;
    const corpId = tokenResp.data.corpId;
    
    // Get user ID
    const userResp = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
      corpId,
      corpAccessToken: accessToken,
      mobile: '17675662629'
    });
    
    const userId = userResp.data.empList[0].openUserId;
    
    // 分批查詢所有記錄
    let offset = 0;
    const limit = 500;
    let hasMore = true;
    const allRecordsWithShiftTime = [];
    
    console.log('開始分批查詢所有記錄...');
    
    while (hasMore) {
      const queryResp = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
        corpId,
        corpAccessToken: accessToken,
        currentOpenUserId: userId,
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            limit: limit,
            offset: offset,
            filters: []
          }
        }
      });
      
      const dataList = queryResp.data.data?.dataList || [];
      const recordsWithShiftTime = dataList.filter(r => r.shift_time__c);
      allRecordsWithShiftTime.push(...recordsWithShiftTime);
      
      console.log(`批次 ${Math.floor(offset/limit) + 1}: 獲取 ${dataList.length} 條，其中 ${recordsWithShiftTime.length} 條有 shift_time`);
      
      if (dataList.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
    
    console.log(`\n總結:`);
    console.log(`總共找到 ${allRecordsWithShiftTime.length} 條有 shift_time 的記錄`);
    
    // 統計不同的 shift_time 值
    const shiftTimeStats = {};
    allRecordsWithShiftTime.forEach(record => {
      const key = `${record.shift_time__c}|${record.shift_time__c__v}`;
      if (!shiftTimeStats[key]) {
        shiftTimeStats[key] = {
          name: record.shift_time__c,
          id: record.shift_time__c__v,
          count: 0,
          records: []
        };
      }
      shiftTimeStats[key].count++;
      shiftTimeStats[key].records.push(record._id);
    });
    
    console.log(`\n不同的 shift_time 值:`);
    Object.values(shiftTimeStats).forEach(stat => {
      console.log(`- ${stat.name} (${stat.id}): ${stat.count} 條`);
    });
    
    // 生成 SQL 更新語句
    console.log(`\n生成 SQL 更新語句...`);
    const fs = require('fs');
    let sql = '-- 更新所有 shift_time 記錄\n';
    
    Object.values(shiftTimeStats).forEach(stat => {
      const ids = stat.records.map(id => `'${id}'`).join(', ');
      sql += `\n-- ${stat.name} (${stat.count} 條)\n`;
      sql += `UPDATE object_8w9cb__c SET shift_time__c = '${stat.name}', shift_time__c__v = '${stat.id}' WHERE _id IN (${ids});\n`;
    });
    
    fs.writeFileSync('update-shift-time.sql', sql);
    console.log('SQL 語句已保存到 update-shift-time.sql');
    
    // 顯示前幾條記錄作為範例
    console.log('\n前 5 條記錄範例:');
    allRecordsWithShiftTime.slice(0, 5).forEach((record, i) => {
      console.log(`${i+1}. ${record._id} - ${record.name} - ${record.shift_time__c}`);
    });
    
  } catch (error) {
    console.error('錯誤:', error.response?.data || error.message);
  }
}

syncShiftTimeData();