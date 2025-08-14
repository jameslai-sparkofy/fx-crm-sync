/**
 * 紛享銷客 API 格式測試與範例
 * 
 * 此文件展示正確和錯誤的 API 請求格式
 * 用於測試和參考
 */

// ============================================
// 更新操作測試
// ============================================

/**
 * ✅ 正確的更新請求格式
 * 這是應該使用的格式
 */
const correctUpdateFormat = {
  description: "正確的更新請求格式",
  endpoint: "/cgi/crm/custom/v2/data/update",
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  request: {
    corpId: "781014",
    corpAccessToken: "your-access-token",
    currentOpenUserId: "FSUID_6D8AAEFBF14B69998CF7D51D21FD8309",
    data: {
      dataObjectApiName: "object_50HJ8__c",
      data: {
        _id: "689ddc0eb6bc8800010f053f",  // ✅ 正確：_id 在 data 內部
        name: "更新的名稱",
        phone_number__c: "0987654321",
        abbreviation__c: "TEST"
      }
    }
  },
  expectedResponse: {
    errorCode: 0,
    errorMessage: "",
    data: {
      success: true
    }
  }
};

/**
 * ❌ 錯誤的更新請求格式
 * 這會導致 NullPointerException
 */
const wrongUpdateFormat = {
  description: "錯誤的更新請求格式 - 會導致 NullPointerException",
  issue: "objectDataId 不應該在頂層，應該使用 _id 在 data 內部",
  endpoint: "/cgi/crm/custom/v2/data/update",
  method: "POST",
  request: {
    corpId: "781014",
    corpAccessToken: "your-access-token",
    currentOpenUserId: "FSUID_6D8AAEFBF14B69998CF7D51D21FD8309",
    data: {
      dataObjectApiName: "object_50HJ8__c",
      objectDataId: "689ddc0eb6bc8800010f053f",  // ❌ 錯誤：不應該在這裡
      data: {
        name: "更新的名稱",
        phone_number__c: "0987654321"
      }
    }
  },
  expectedError: "java.lang.NullPointerException"
};

// ============================================
// 創建操作測試
// ============================================

/**
 * ✅ 正確的創建請求格式
 */
const correctCreateFormat = {
  description: "正確的創建請求格式",
  endpoint: "/cgi/crm/custom/v2/data/create",
  method: "POST",
  request: {
    corpId: "781014",
    corpAccessToken: "your-access-token",
    currentOpenUserId: "FSUID_6D8AAEFBF14B69998CF7D51D21FD8309",
    data: {
      dataObjectApiName: "object_50HJ8__c",
      data: {
        // 不需要 _id，系統會自動生成
        name: "新工地師父",
        phone_number__c: "0912345678",
        abbreviation__c: "NEW",
        owner: ["FSUID_F8E5C73533927249281F06800BC975AA"]  // 必填：負責人
      }
    }
  },
  expectedResponse: {
    errorCode: 0,
    dataId: "newly-created-id"
  }
};

/**
 * ❌ 錯誤的創建請求格式 - 缺少必填字段
 */
const wrongCreateFormat = {
  description: "錯誤的創建請求格式 - 缺少必填字段 owner",
  issue: "缺少必填字段 owner（負責人）",
  endpoint: "/cgi/crm/custom/v2/data/create",
  method: "POST",
  request: {
    corpId: "781014",
    corpAccessToken: "your-access-token",
    currentOpenUserId: "FSUID_6D8AAEFBF14B69998CF7D51D21FD8309",
    data: {
      dataObjectApiName: "object_50HJ8__c",
      data: {
        name: "新工地師父",
        phone_number__c: "0912345678"
        // ❌ 缺少 owner 字段
      }
    }
  },
  expectedError: "数据[新工地師父]必填字段负责人未填写不可进行当前操作"
};

// ============================================
// 批量操作測試
// ============================================

/**
 * ✅ 正確的批量創建格式
 */
const correctBatchCreateFormat = {
  description: "正確的批量創建請求格式",
  endpoint: "/cgi/crm/custom/v2/data/batchCreate",
  method: "POST",
  request: {
    corpId: "781014",
    corpAccessToken: "your-access-token",
    currentOpenUserId: "FSUID_6D8AAEFBF14B69998CF7D51D21FD8309",
    data: {
      dataObjectApiName: "object_50HJ8__c",
      dataList: [
        {
          name: "工地師父1",
          phone_number__c: "0911111111",
          owner: ["FSUID_F8E5C73533927249281F06800BC975AA"]
        },
        {
          name: "工地師父2",
          phone_number__c: "0922222222",
          owner: ["FSUID_F8E5C73533927249281F06800BC975AA"]
        }
      ]
    }
  }
};

// ============================================
// 測試執行函數
// ============================================

/**
 * 執行單個測試
 */
async function runTest(testCase, env) {
  console.log(`\n========================================`);
  console.log(`測試: ${testCase.description}`);
  console.log(`========================================`);
  
  try {
    const response = await fetch(
      `https://open.fxiaoke.com${testCase.endpoint}`,
      {
        method: testCase.method || 'POST',
        headers: testCase.headers || { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.request)
      }
    );
    
    const result = await response.json();
    
    if (testCase.expectedError) {
      if (result.errorMessage && result.errorMessage.includes(testCase.expectedError)) {
        console.log(`✅ 預期錯誤: ${testCase.expectedError}`);
      } else {
        console.log(`❌ 未得到預期錯誤`);
        console.log(`預期: ${testCase.expectedError}`);
        console.log(`實際: ${result.errorMessage}`);
      }
    } else if (testCase.expectedResponse) {
      if (result.errorCode === testCase.expectedResponse.errorCode) {
        console.log(`✅ 測試通過`);
      } else {
        console.log(`❌ 測試失敗`);
        console.log(`預期: errorCode = ${testCase.expectedResponse.errorCode}`);
        console.log(`實際: errorCode = ${result.errorCode}`);
      }
    }
    
    console.log(`回應:`, JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(`❌ 測試執行錯誤:`, error.message);
  }
}

/**
 * 執行所有測試
 */
async function runAllTests(env) {
  console.log(`開始執行 API 格式測試...`);
  
  const tests = [
    correctUpdateFormat,
    wrongUpdateFormat,
    correctCreateFormat,
    wrongCreateFormat,
    correctBatchCreateFormat
  ];
  
  for (const test of tests) {
    await runTest(test, env);
    // 等待一秒避免 API 限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n測試完成！`);
}

// ============================================
// 導出
// ============================================

module.exports = {
  correctUpdateFormat,
  wrongUpdateFormat,
  correctCreateFormat,
  wrongCreateFormat,
  correctBatchCreateFormat,
  runTest,
  runAllTests
};

// 如果直接執行此文件
if (require.main === module) {
  console.log(`
紛享銷客 API 格式測試文件

此文件包含正確和錯誤的 API 請求格式範例。

正確格式範例:
- correctUpdateFormat: 正確的更新請求
- correctCreateFormat: 正確的創建請求
- correctBatchCreateFormat: 正確的批量創建請求

錯誤格式範例:
- wrongUpdateFormat: 會導致 NullPointerException
- wrongCreateFormat: 缺少必填字段

使用方法:
const tests = require('./api-format-tests.js');
await tests.runAllTests(env);
  `);
}