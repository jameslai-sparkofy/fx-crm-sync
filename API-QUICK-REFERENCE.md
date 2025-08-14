# 紛享銷客 API 快速參考

## 🔧 更新操作 (Update)

### ✅ 正確格式
```javascript
// 自定義對象 (以 __c 結尾)
POST /cgi/crm/custom/v2/data/update
{ 
  data: { 
    dataObjectApiName: "object_50HJ8__c", 
    data: { 
      _id: "recordId",  // ✅ ID 在 data 內部
      name: "新名稱",
      phone: "新電話"
    } 
  } 
}

// 標準對象
POST /cgi/crm/v2/data/update
{ 
  data: { 
    dataObjectApiName: "NewOpportunityObj", 
    data: { 
      _id: "recordId",  // ✅ ID 在 data 內部
      opportunity_name: "新商機"
    } 
  } 
}
```

### ❌ 錯誤格式
```javascript
// 會導致 NullPointerException
{ 
  data: { 
    dataObjectApiName: "object_50HJ8__c", 
    objectDataId: "recordId",  // ❌ 錯誤位置
    data: { 
      name: "新名稱" 
    } 
  } 
}
```

---

## ➕ 創建操作 (Create)

### ✅ 正確格式
```javascript
// 自定義對象
POST /cgi/crm/custom/v2/data/create
{ 
  data: { 
    dataObjectApiName: "object_50HJ8__c", 
    data: { 
      name: "新記錄",
      owner: ["FSUID_xxx"],  // 必填：負責人
      // 其他字段...
    } 
  } 
}

// 標準對象
POST /cgi/crm/v2/data/create
{ 
  data: { 
    dataObjectApiName: "NewOpportunityObj", 
    data: { 
      opportunity_name: "新商機",
      amount: 100000,
      owner: ["FSUID_xxx"]
    } 
  } 
}
```

---

## 🔍 查詢操作 (Query)

### ✅ 正確格式
```javascript
// 自定義對象
POST /cgi/crm/custom/v2/data/query
{
  corpId: "企業ID",
  corpAccessToken: "token",
  currentOpenUserId: "用戶ID",
  data: {
    dataObjectApiName: "object_50HJ8__c",
    offset: 0,
    limit: 100,
    filters: [
      {
        field_name: "life_status",
        operator: "NEQ",
        field_values: ["invalid"]
      }
    ]
  }
}

// 標準對象
POST /cgi/crm/v2/data/query
{
  corpId: "企業ID",
  corpAccessToken: "token",
  currentOpenUserId: "用戶ID",
  data: {
    dataObjectApiName: "NewOpportunityObj",
    offset: 0,
    limit: 100
  }
}
```

---

## 📝 獲取單條記錄 (Get)

### ✅ 正確格式
```javascript
// 自定義對象
POST /cgi/crm/custom/v2/data/get
{
  corpId: "企業ID",
  corpAccessToken: "token",
  currentOpenUserId: "用戶ID",
  data: {
    dataObjectApiName: "object_50HJ8__c",
    objectDataId: "recordId"
  }
}

// 標準對象
POST /cgi/crm/v2/data/get
{
  corpId: "企業ID",
  corpAccessToken: "token",
  currentOpenUserId: "用戶ID",
  data: {
    dataObjectApiName: "NewOpportunityObj",
    objectDataId: "recordId"
  }
}
```

---

## ❌ 刪除操作 (Delete)

### ✅ 正確格式
```javascript
// 自定義對象（通常是標記為作廢）
POST /cgi/crm/custom/v2/data/update
{
  data: {
    dataObjectApiName: "object_50HJ8__c",
    data: {
      _id: "recordId",
      life_status: "invalid"  // 標記為作廢
    }
  }
}

// 真正刪除（如果支援）
POST /cgi/crm/custom/v2/data/delete
{
  data: {
    dataObjectApiName: "object_50HJ8__c",
    objectDataId: "recordId"
  }
}
```

---

## 📦 批量操作 (Batch)

### 批量創建
```javascript
POST /cgi/crm/custom/v2/data/batchCreate
{
  data: {
    dataObjectApiName: "object_50HJ8__c",
    dataList: [
      {
        name: "記錄1",
        owner: ["FSUID_xxx"]
      },
      {
        name: "記錄2",
        owner: ["FSUID_xxx"]
      }
    ]
  }
}
```

### 批量更新
```javascript
POST /cgi/crm/custom/v2/data/batchUpdate
{
  data: {
    dataObjectApiName: "object_50HJ8__c",
    dataList: [
      {
        _id: "id1",
        name: "更新名稱1"
      },
      {
        _id: "id2",
        name: "更新名稱2"
      }
    ]
  }
}
```

---

## 🔑 認證參數

所有 API 請求都需要包含：

```javascript
{
  corpId: "781014",                    // 企業 ID
  corpAccessToken: "xxx",              // 訪問令牌（2小時有效）
  currentOpenUserId: "FSUID_xxx",      // 當前用戶 ID
  data: {
    // 具體操作數據
  }
}
```

---

## 🚨 常見錯誤碼

| 錯誤碼 | 錯誤信息 | 原因 | 解決方案 |
|-------|---------|------|---------|
| 0 | 成功 | - | - |
| 100001 | NullPointerException | 請求格式錯誤 | 檢查 _id 位置 |
| 100002 | 必填字段未填寫 | 缺少 owner 等必填字段 | 添加必填字段 |
| 100003 | 參數錯誤 | JSON 格式錯誤 | 檢查 JSON 結構 |
| 100004 | 記錄不存在 | ID 錯誤 | 確認記錄 ID |
| 401 | 未授權 | Token 過期或無效 | 刷新 Token |

---

## 📚 參考文檔

- [API 問題記錄](./API-ISSUES.md)
- [CLAUDE 系統指南](./CLAUDE.md#紛享銷客-api-正確格式規範重要)
- [API 測試範例](./tests/api-format-tests.js)
- [CRM 寫入服務](./workers/src/services/crm-write-service.js)

---

## 🎯 快速診斷

遇到錯誤時的檢查步驟：

1. **NullPointerException** → 檢查 `_id` 是否在 `data` 內部
2. **必填字段未填寫** → 檢查是否包含 `owner` 字段
3. **401 未授權** → 檢查 Token 是否過期
4. **記錄不存在** → 確認記錄 ID 是否正確
5. **參數錯誤** → 檢查 JSON 格式和必填參數

---

**最後更新**: 2025-08-14  
**版本**: v1.0.0