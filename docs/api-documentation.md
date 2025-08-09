# API 文檔總覽

## 概述

FX-CRM-Sync 提供完整的 REST API，支援數據同步、CRUD 操作、對象管理等功能。所有 API 都部署在 Cloudflare Workers 上，提供高效能和全球分佈式訪問。

## 基礎信息

- **基礎 URL**: `https://fx-crm-sync.{your-subdomain}.workers.dev`
- **認證方式**: Bearer Token
- **內容類型**: `application/json`

## API 分類

### 1. CRUD API（雙向同步）

完整的創建、讀取、更新、刪除功能，支援與 CRM 雙向同步。

- **創建記錄**: `POST /api/crud/{objectApiName}`
- **更新記錄**: `PUT /api/crud/{objectApiName}/{recordId}`
- **刪除記錄**: `DELETE /api/crud/{objectApiName}/{recordId}`
- **獲取單條記錄**: `GET /api/crud/{objectApiName}/{recordId}`
- **查詢記錄列表**: `GET /api/crud/{objectApiName}`
- **批量創建**: `POST /api/crud/{objectApiName}/batch`

[詳細文檔 →](./crud-api-documentation.md)

### 2. 同步 API

控制和監控數據同步過程。

- **手動觸發同步**: `POST /api/sync/trigger`
- **查看同步狀態**: `GET /api/sync/status`
- **查看同步日誌**: `GET /api/sync/logs`
- **查看同步統計**: `GET /api/sync/stats`

### 3. 對象管理 API

管理 CRM 對象和欄位定義。

- **獲取對象列表**: `GET /api/objects`
- **獲取對象欄位**: `GET /api/objects/{objectApiName}/fields`
- **啟用/禁用對象同步**: `POST /api/objects/{objectApiName}/toggle`
- **檢測欄位變更**: `POST /api/objects/{objectApiName}/detect-field-changes`
- **查看欄位變更日誌**: `GET /api/objects/{objectApiName}/field-change-logs`

### 4. Schema API

管理資料庫結構。

- **獲取表結構**: `GET /api/schema/{tableName}`
- **查看結構更新日誌**: `GET /api/schema/update-logs`
- **執行結構更新**: `POST /api/schema/update` (需管理員權限)

### 5. Webhook API

接收 CRM 變更通知。

- **接收 Webhook 通知**: `POST /api/webhook/notify`
- **查看 Webhook 日誌**: `GET /api/webhook/logs`
- **配置 Webhook**: `POST /api/webhook/config`

### 6. 管理 API

系統管理和監控。

- **健康檢查**: `GET /api/health`
- **系統狀態**: `GET /api/debug/status`
- **清除緩存**: `POST /api/debug/clear-cache`

## 認證

所有 API 請求（除健康檢查外）都需要包含 Bearer Token：

```bash
Authorization: Bearer {your-token}
```

### 獲取 Token

1. 使用管理介面生成 Token
2. 或通過環境變數配置預設 Token

## 請求格式

### 標準請求頭

```http
Content-Type: application/json
Authorization: Bearer {token}
Accept: application/json
```

### 請求體範例

```json
{
  "name": "新商機",
  "amount": 100000,
  "close_date": 1735228800000,
  "account_id": "5fc7a87982f5430001a7cf84"
}
```

## 回應格式

### 成功回應

```json
{
  "success": true,
  "data": {
    // 實際數據
  },
  "message": "操作成功"
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": "錯誤描述",
  "code": "ERROR_CODE",
  "details": {
    // 額外錯誤信息
  }
}
```

## 錯誤碼

| 錯誤碼 | HTTP 狀態碼 | 說明 |
|--------|------------|------|
| `BAD_REQUEST` | 400 | 請求參數錯誤 |
| `UNAUTHORIZED` | 401 | 未授權或 Token 無效 |
| `FORBIDDEN` | 403 | 無權限訪問 |
| `NOT_FOUND` | 404 | 資源不存在 |
| `CONFLICT` | 409 | 資源衝突 |
| `TOO_MANY_REQUESTS` | 429 | 請求過於頻繁 |
| `INTERNAL_ERROR` | 500 | 服務器內部錯誤 |
| `SERVICE_UNAVAILABLE` | 503 | 服務暫時不可用 |

## 速率限制

- **每分鐘請求數**: 60 次
- **並發請求數**: 10 個
- **批量操作限制**: 每批最多 100 條記錄

超過限制會返回 429 錯誤。

## 分頁

支援分頁的 API 使用統一的分頁參數：

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `page` | integer | 1 | 頁碼 |
| `pageSize` | integer | 20 | 每頁記錄數 |
| `sortBy` | string | varies | 排序欄位 |
| `sortOrder` | string | DESC | 排序方向 (ASC/DESC) |

分頁回應格式：

```json
{
  "success": true,
  "data": {
    "records": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## 過濾和搜索

### 簡單搜索

```
GET /api/crud/{objectApiName}?search=關鍵字
```

### 欄位過濾

```
GET /api/crud/{objectApiName}?field1=value1&field2=value2
```

### 日期範圍

```
GET /api/crud/{objectApiName}?startDate=1735228800000&endDate=1735315200000
```

## 批量操作

### 批量創建

```json
{
  "records": [
    { "name": "記錄1", ... },
    { "name": "記錄2", ... }
  ]
}
```

### 批量更新

```json
{
  "updates": [
    { "id": "id1", "data": { "status": "closed" } },
    { "id": "id2", "data": { "status": "closed" } }
  ]
}
```

## Webhook 整合

### 配置 Webhook

在 CRM 系統中配置 Webhook URL：

```
https://fx-crm-sync.{your-subdomain}.workers.dev/api/webhook/notify
```

### Webhook 簽名驗證

建議配置簽名密鑰以驗證請求來源。

## SDK 和工具

### JavaScript SDK

```javascript
import { FxCrmSyncClient } from '@fx-crm-sync/client';

const client = new FxCrmSyncClient({
  baseUrl: 'https://fx-crm-sync.example.workers.dev',
  token: 'your-bearer-token'
});

// 創建記錄
const record = await client.crud.create('NewOpportunityObj', {
  name: '新商機',
  amount: 100000
});
```

### CLI 工具

```bash
# 安裝 CLI
npm install -g @fx-crm-sync/cli

# 配置
fx-crm-sync config set token YOUR_TOKEN
fx-crm-sync config set url https://fx-crm-sync.example.workers.dev

# 使用
fx-crm-sync sync trigger
fx-crm-sync crud create NewOpportunityObj --data '{"name":"測試"}'
```

## 最佳實踐

1. **錯誤處理**
   - 總是檢查 `success` 欄位
   - 實現重試機制處理暫時性錯誤
   - 記錄錯誤日誌便於調試

2. **效能優化**
   - 使用批量操作減少 API 調用
   - 實現本地緩存減少重複請求
   - 使用分頁處理大量數據

3. **安全性**
   - 定期更換 API Token
   - 使用 HTTPS 傳輸
   - 不要在客戶端暴露 Token

4. **數據一致性**
   - 使用事務處理關聯操作
   - 實現冪等性避免重複操作
   - 定期同步確保數據一致

## 支援的對象

### 標準對象

- `NewOpportunityObj` - 商機
- `AccountObj` - 客戶
- `ContactObj` - 聯絡人
- `LeadsObj` - 線索
- `ProductObj` - 產品
- `ContractObj` - 合同

### 自定義對象

- `object_8W9cb__c` - 案場（SPC）
- 其他自定義對象（以 `__c` 結尾）

## 進階功能

- [Webhook 整合](./advanced-features.md#webhook-整合)
- [欄位變更檢測](./advanced-features.md#欄位變更檢測)
- [R2 圖片處理](./advanced-features.md#圖片處理與-r2-整合)
- [定時同步](./advanced-features.md#定時同步設定)

## 故障排除

### 常見問題

1. **401 Unauthorized**
   - 檢查 Token 是否正確
   - 確認 Token 是否過期

2. **429 Too Many Requests**
   - 實現請求節流
   - 使用批量操作

3. **500 Internal Error**
   - 檢查請求參數格式
   - 查看詳細錯誤信息

### 調試工具

- 使用管理介面的 API 測試工具
- 查看 Worker 日誌：`wrangler tail`
- 使用 Postman 或 Insomnia 測試

## 更新日誌

### v1.2.0 (2025-01-03)
- ✨ 新增 CRUD API，支援雙向同步
- ✨ 支援批量創建操作
- 🔧 優化 API 錯誤處理

### v1.1.0 (2024-12-28)
- ✨ 新增 Webhook 支援
- ✨ 新增欄位變更檢測
- ✨ 整合 R2 圖片儲存

### v1.0.0 (2024-12-20)
- 🎉 初始版本發布
- ✨ 基礎同步功能
- ✨ 對象管理 API