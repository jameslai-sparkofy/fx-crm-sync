# 更新 API NullPointerException 問題調試記錄

## 問題描述
更新 API 持續返回 `java.lang.NullPointerException`，即使在修復了 `_id` 位置問題後。

## 已嘗試的修復

### 1. 修復 _id 位置 ✅
- 從 `objectDataId` 改為 `data._id`
- 參考 `crm-write-service.js` 的實現

### 2. 請求結構對比

#### crud.js (修復後) - 仍然失敗 ❌
```javascript
const updateData = {
  dataObjectApiName: objectApiName,
  data: {
    _id: recordId,
    ...body
  }
};
```

#### crm-write-service.js - 工作正常 ✅
```javascript
const response = await this.fxClient.post(apiPath, {
  data: {
    dataObjectApiName: objectApiName,
    data: {
      _id: objectId,
      ...this.formatDataForCrm(data)
    }
  }
});
```

## 可能的原因

### 1. 數據格式化問題
`crm-write-service.js` 使用 `formatDataForCrm()` 處理數據，可能有特殊處理：
- 日期轉換為時間戳
- 對象轉換為 JSON 字符串
- 跳過內部字段

### 2. 自定義對象的特殊要求
根據錯誤信息和行為，自定義對象可能需要：
- 特定的字段格式
- 額外的元數據
- 不同的認證方式

### 3. API 版本差異
可能存在不同版本的 API：
- `/cgi/crm/custom/v2/data/update` - 新版本
- 可能有 v1 或 v3 版本有不同要求

## 建議的調試步驟

### 1. 添加更詳細的日誌
在 `fx-client.js` 中記錄完整的請求和響應：
```javascript
console.log('[FxClient] 完整請求:', {
  url,
  method,
  headers,
  body: JSON.stringify(requestBody, null, 2)
});

console.log('[FxClient] 完整響應:', {
  status: response.status,
  body: data
});
```

### 2. 測試不同的請求格式

#### 格式 A：不包含認證參數
```javascript
{
  data: {
    dataObjectApiName: "object_50HJ8__c",
    _id: "recordId",
    name: "新名稱"
  }
}
```

#### 格式 B：_id 在頂層
```javascript
{
  dataObjectApiName: "object_50HJ8__c",
  _id: "recordId",
  data: {
    name: "新名稱"
  }
}
```

#### 格式 C：使用 objectDataId
```javascript
{
  dataObjectApiName: "object_50HJ8__c",
  objectDataId: "recordId",
  data: {
    name: "新名稱"
  }
}
```

### 3. 直接調用 CRM API
繞過 Worker，直接使用 curl 或 Postman 測試：

```bash
curl -X POST "https://open.fxiaoke.com/cgi/crm/custom/v2/data/update" \
  -H "Content-Type: application/json" \
  -d '{
    "corpId": "781014",
    "corpAccessToken": "獲取的token",
    "currentOpenUserId": "FSUID_6D8AAEFBF14B69998CF7D51D21FD8309",
    "data": {
      "dataObjectApiName": "object_50HJ8__c",
      "data": {
        "_id": "689dfa99060d650001d50fda",
        "name": "測試更新"
      }
    }
  }'
```

### 4. 檢查 CRM 端的記錄狀態
- 記錄是否被鎖定
- 是否有權限問題
- 是否有必填字段檢查

## 臨時解決方案

在問題解決前，可以考慮：

1. **使用刪除+創建代替更新**
   - 標記舊記錄為作廢
   - 創建新記錄

2. **只更新 D1，延遲 CRM 同步**
   - 先更新 D1
   - 記錄待同步清單
   - 批量處理

3. **聯繫紛享銷客技術支援**
   - 提供錯誤信息
   - 請求正確的 API 格式文檔

## 更新記錄

| 日期 | 嘗試 | 結果 |
|------|------|------|
| 2025-08-14 | 修復 _id 位置 | 仍然 NullPointerException |
| 2025-08-14 | 對比 crm-write-service | 結構相同但結果不同 |
| 2025-08-14 | 創建新記錄測試 | 創建成功，更新失敗 |

## 下一步行動

1. ⚠️ **優先**：在 fx-client.js 添加完整請求/響應日誌
2. ⚠️ **優先**：測試 formatDataForCrm 的影響
3. 📝 聯繫紛享銷客確認自定義對象更新的正確格式
4. 🔍 檢查是否有其他成功更新的案例代碼