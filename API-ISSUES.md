# 紛享銷客 API 常見問題與解決方案

## 目錄
1. [更新 API NullPointerException](#問題-1-更新-api-nullpointerexception)
2. [其他問題](#其他問題)

---

## ✅ 問題 1: 更新 API NullPointerException [已解決]

**發現日期**: 2025-08-14  
**解決日期**: 2025-08-14  
**錯誤信息**: `java.lang.NullPointerException`  
**影響範圍**: 所有更新操作（標準對象和自定義對象）  
**嚴重程度**: 高

### 問題描述
當使用 CRUD API 更新記錄時，CRM 返回 `java.lang.NullPointerException` 錯誤。這是因為更新請求的數據結構不符合紛享銷客 API 的要求。

### 根本原因
紛享銷客的更新 API 要求使用 `object_data` 包裝更新數據，而不是直接的 `data` 對象。根據官方文檔，必須使用 `data.object_data` 結構。

### ❌ 錯誤格式
```json
{
  "corpId": "企業ID",
  "corpAccessToken": "訪問令牌",
  "currentOpenUserId": "用戶ID",
  "data": {
    "dataObjectApiName": "object_50HJ8__c",
    "data": {  // ❌ 錯誤：使用 data 而不是 object_data
      "_id": "689ddc0eb6bc8800010f053f",
      "name": "新名稱",
      "phone_number__c": "0987654321"
    }
  }
}
```

### ✅ 正確格式（官方文檔）
```json
{
  "corpAccessToken": "訪問令牌",
  "corpId": "企業ID",
  "currentOpenUserId": "用戶ID",
  "data": {
    "object_data": {  // ✅ 正確：使用 object_data 包裝
      "_id": "689ddc0eb6bc8800010f053f",
      "dataObjectApiName": "object_50HJ8__c",
      "name": "新名稱",
      "phone_number__c": "0987654321"
    }
  }
}
```

### 影響的文件
1. `/workers/src/api/crud.js` (第 112-125 行) - 主要問題所在
2. `/workers/src/services/crm-write-service.js` (第 128-147 行) - 正確實現參考

### 修復方案

#### 修改前（crud.js）
```javascript
// 準備更新數據
const updateData = {
  dataObjectApiName: objectApiName,
  objectDataId: recordId,  // 問題所在
  data: body
};

// 調用 CRM API 更新記錄
const response = await fxClient.post(apiPath, { data: updateData });
```

#### 修改後（crud.js）
```javascript
// 準備更新數據 - 使用官方文檔格式
const updateData = {
  object_data: {  // 修正：使用 object_data 包裝
    _id: recordId,
    dataObjectApiName: objectApiName,
    ...body
  }
};

// 調用 CRM API 更新記錄
const response = await fxClient.post(apiPath, { data: updateData });
```

### 測試驗證

#### 測試命令
```bash
# 使用 CRUD API 更新記錄
curl -X PUT "https://fx-crm-sync-dev.lai-jameslai.workers.dev/api/crud/object_50HJ8__c/{recordId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-123" \
  -d '{"name": "測試更新", "phone_number__c": "0911111111"}'
```

#### 預期結果
```json
{
  "success": true,
  "data": {
    "id": "recordId",
    "record": { /* 更新後的記錄 */ }
  },
  "message": "記錄更新成功並已同步"
}
```

### 相關文檔
- [紛享銷客官方 API 文檔 - 修改自定义对象](https://open.fxiaoke.com/cgi/crm/custom/v2/data/update)
- [CRUD API 文檔](/docs/crud-api-documentation.md)
- [API 快速參考](/API-QUICK-REFERENCE.md)

### 經驗教訓
1. **仔細閱讀官方文檔，特別注意請求示例**
2. **注意 API 版本差異（v2 vs 其他版本）**
3. **自定義對象和標準對象可能有不同要求**
4. **使用直接 API 測試工具驗證格式**

---

## 🟡 問題 2: D1 觸發器欄位不存在

**發現日期**: 2025-08-14  
**錯誤信息**: `no such column: OLD.contact__c`  
**影響範圍**: 案場（object_8w9cb__c）表的變更追蹤  
**嚴重程度**: 中

### 問題描述
D1 變更追蹤觸發器引用了不存在的欄位，導致更新操作失敗。

### 解決方案
更新觸發器定義，只引用實際存在的欄位。參見 `/sql/add-worker-triggers.sql`

---

## 其他問題

### 待記錄問題清單
- [ ] Token 過期處理
- [ ] 批量操作限制
- [ ] 並發同步衝突
- [ ] 大數據量同步超時

---

## 維護記錄

| 日期 | 更新內容 | 更新者 |
|------|---------|--------|
| 2025-08-14 | 創建文檔，記錄 NullPointerException 問題 | System |
| 2025-08-14 | 添加 D1 觸發器欄位問題 | System |

---

## 快速診斷流程

遇到 API 錯誤時，請按以下步驟診斷：

1. **檢查錯誤信息**
   - NullPointerException → 檢查請求格式
   - 401 Unauthorized → 檢查認證信息
   - 404 Not Found → 檢查 API 端點

2. **對比正確實現**
   - 查看 `/workers/src/services/crm-write-service.js`
   - 參考 API-QUICK-REFERENCE.md

3. **查看日誌**
   ```bash
   wrangler tail fx-crm-sync-dev --format pretty
   ```

4. **測試修復**
   - 先在開發環境測試
   - 確認無誤後部署到生產環境