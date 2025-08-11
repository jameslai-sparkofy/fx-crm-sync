# 紛享銷客 Webhook 配置說明文檔

## 一、Webhook 基本資訊

### 接收端點
- **URL**: `https://fx-crm-sync.lai-jameslai.workers.dev/api/webhook/notify`
- **請求方法**: `POST`
- **Content-Type**: `application/json`
- **字符編碼**: `UTF-8`

## 二、監聽對象配置

### 需要配置 Webhook 的對象

| 對象名稱 | API Name | 說明 |
|---------|----------|------|
| 案場(SPC) | `object_8W9cb__c` | 自定義對象 - 案場管理 |

### 需要監聽的事件類型

| 事件類型 | 事件代碼 | 觸發時機 |
|---------|---------|---------|
| 新增 | `object.created` | 創建新的案場記錄時 |
| 更新 | `object.updated` | 修改案場記錄時 |
| 刪除 | `object.deleted` | 刪除案場記錄時（標記為 invalid） |

## 三、請求格式規範

### 請求頭要求
```http
POST /api/webhook/notify HTTP/1.1
Host: fx-crm-sync.lai-jameslai.workers.dev
Content-Type: application/json
```

### 請求體格式
```json
{
  "event": "object.created",
  "objectApiName": "object_8W9cb__c",
  "objectId": "RECORD_ID_HERE",
  "data": {
    // 可選：包含變更的欄位資料
  },
  "timestamp": 1234567890
}
```

### 欄位說明

| 欄位名 | 類型 | 必填 | 說明 |
|-------|------|------|------|
| event | string | 是 | 事件類型：`object.created`, `object.updated`, `object.deleted` |
| objectApiName | string | 是 | 對象 API 名稱：`object_8W9cb__c` |
| objectId | string | 是 | 記錄的唯一標識符（_id） |
| data | object | 否 | 包含變更的欄位資料（可選） |
| timestamp | number | 否 | Unix 時間戳（毫秒） |

## 四、請求範例

### 1. 新增案場記錄
```json
{
  "event": "object.created",
  "objectApiName": "object_8W9cb__c",
  "objectId": "66b5d123456789",
  "timestamp": 1754866800000
}
```

### 2. 更新案場記錄
```json
{
  "event": "object.updated",
  "objectApiName": "object_8W9cb__c",
  "objectId": "66b5d123456789",
  "data": {
    "name": "新案場名稱",
    "field_1P96q__c": "關聯商機ID"
  },
  "timestamp": 1754866900000
}
```

### 3. 刪除案場記錄
```json
{
  "event": "object.deleted",
  "objectApiName": "object_8W9cb__c",
  "objectId": "66b5d123456789",
  "timestamp": 1754867000000
}
```

## 五、回應格式

### 成功回應 (HTTP 200)
```json
{
  "success": true,
  "message": "Webhook 處理成功"
}
```

### 錯誤回應 (HTTP 400/500)
```json
{
  "success": false,
  "error": "錯誤訊息描述"
}
```

## 六、測試與驗證

### 1. 檢查 Webhook 配置
訪問以下 URL 查看當前支援的配置：
```
GET https://fx-crm-sync.lai-jameslai.workers.dev/api/webhook/config
```

### 2. 查看接收日誌
訪問以下 URL 查看最近 50 條 Webhook 日誌：
```
GET https://fx-crm-sync.lai-jameslai.workers.dev/api/webhook/logs
```

### 3. 測試步驟
1. 配置 Webhook URL 到紛享銷客系統
2. 在紛享銷客中新增或修改一筆案場記錄
3. 訪問日誌 URL 確認是否收到通知
4. 檢查數據庫確認記錄是否同步

## 七、系統處理邏輯

| 事件 | 處理方式 |
|------|---------|
| `object.created` | 立即從 CRM 獲取完整記錄並儲存到 D1 數據庫 |
| `object.updated` | 立即從 CRM 獲取最新記錄並更新 D1 數據庫 |
| `object.deleted` | 在 D1 數據庫中標記該記錄為已刪除（is_deleted = 1） |

## 八、注意事項

1. **認證方式**：Webhook 端點目前不需要認證，但建議在生產環境中添加簽名驗證

2. **超時設定**：請確保 Webhook 請求超時時間設置為至少 30 秒

3. **重試機制**：
   - 如果收到 5xx 錯誤，建議進行重試
   - 建議使用指數退避策略，最多重試 3 次

4. **併發限制**：系統可以處理併發請求，但建議控制在每秒 10 個請求以內

5. **數據一致性**：
   - Webhook 是即時同步的補充機制
   - 系統仍會每小時執行完整同步以確保數據一致性

## 九、技術支援

如有任何問題或需要協助，請聯繫：

- 系統管理員：James Lai
- Webhook 狀態監控：https://fx-crm-sync.lai-jameslai.workers.dev/api/webhook/logs
- 數據庫統計：https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/database-stats

---

**文檔版本**: 1.0  
**更新日期**: 2025-08-11  
**適用系統**: 紛享銷客 CRM - 案場同步系統