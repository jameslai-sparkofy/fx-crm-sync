# 進階功能說明

## 1. Webhook 整合

### Webhook 端點
- **URL**: `https://fx-crm-sync.lai-jameslai.workers.dev/api/webhook/notify`
- **方法**: POST
- **用途**: 接收 CRM 數據變更的即時通知

### 設定方式
在紛享銷客管理後台設定 Webhook：
1. 進入系統設定 > Webhook 管理
2. 新增 Webhook 配置
3. 填入通知 URL
4. 選擇要監聽的對象（商機、案場）
5. 選擇事件類型（新增、修改、刪除）

### 支援的事件
- `object.created` - 記錄新增
- `object.updated` - 記錄更新
- `object.deleted` - 記錄刪除

### 請求格式
```json
{
  "event": "object.updated",
  "objectApiName": "NewOpportunityObj",
  "objectId": "650c09e8dc044f0001973eab",
  "data": { ... },
  "timestamp": 1234567890
}
```

### 查看 Webhook 日誌
```bash
GET https://fx-crm-sync.lai-jameslai.workers.dev/api/webhook/logs
```

## 2. 欄位變更檢測

### 功能說明
系統可以檢測 CRM 對象的欄位變更，包括：
- 新增欄位
- 刪除欄位
- 欄位屬性修改（資料類型、必填等）

### 注意事項
- **不會自動修改 D1 表結構**
- 系統會記錄變更並提供 ALTER TABLE 建議
- 需要手動執行表結構修改

### 檢測欄位變更 API
```bash
POST /api/objects/{objectApiName}/detect-field-changes
```

### 查看變更記錄
```bash
GET /api/objects/{objectApiName}/field-change-logs
```

## 3. 圖片處理與 R2 整合

### 功能說明
系統可以將 CRM 中的圖片自動下載並儲存到 Cloudflare R2。

### 配置需求
1. 在 `wrangler.toml` 中配置 R2 bucket：
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "fx-crm-images"
```

2. 設定環境變數：
```bash
wrangler secret put R2_PUBLIC_DOMAIN
# 輸入: https://your-r2-public-domain.com
```

### 圖片欄位處理
- 自動識別圖片類型欄位
- 下載原始圖片到 R2
- 在資料庫中儲存 R2 key
- 支援多圖片欄位

### R2 儲存結構
```
crm-images/
├── {record_id}/
│   ├── {field_name}_{timestamp}.jpg
│   └── {field_name}_{timestamp}.png
```

## 4. 定時同步設定

### 當前設定
- **頻率**: 每 30 分鐘執行一次
- **類型**: 增量同步
- **時區**: UTC

### 修改同步頻率
編輯 `wrangler.toml`:
```toml
[triggers]
crons = ["*/30 * * * *"]  # 每 30 分鐘
# crons = ["0 * * * *"]   # 每小時
# crons = ["0 8,12,17 * * *"]  # 每天 8:00, 12:00, 17:00
```

## 5. 資料安全

### Webhook 安全
- 建議在 CRM 端設定 Webhook 簽名驗證
- 記錄所有 Webhook 請求日誌
- 異常請求自動告警

### 圖片安全
- R2 bucket 預設私有
- 可選配置公開訪問域名
- 支援簽名 URL 訪問

## 6. 效能優化

### 增量同步
- 只同步最近修改的記錄
- 基於 `last_modified_time` 欄位
- 減少 API 調用和數據傳輸

### 批次處理
- 每批最多 500 條記錄
- 自動分頁處理大量數據
- 避免超時和記憶體問題

### 圖片處理
- 異步處理圖片上傳
- 分批處理避免並發過高
- 失敗重試機制