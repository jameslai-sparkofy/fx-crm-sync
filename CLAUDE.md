# 紛享銷客 CRM 同步系統開發指南

## 同步對象清單

### 標準對象
1. **NewOpportunityObj** - 商機
2. **SupplierObj** - 供應商

### 自定義對象 (以 __c 結尾)
1. **object_8W9cb__c** - 案場（SPC）- 約 4,136 條記錄
2. **object_k1XqG__c** - SPC維修單  
3. **object_50HJ8__c** - 工地師父 - 目前 CRM 已清空（0條）
4. **site_cabinet__c** - 案場(浴櫃)
5. **progress_management_announ__c** - 進度管理公告

## 技術棧要求
1. **前端**: Vue.js 
2. **後端**: Java Spring Boot

## 重要參考資料
**必須參考 `C:\claude code\API` 目錄下的正確用法文檔**，特別是：
- `/API/CRM_FXIAOKE/自定義/案場/正確做法.md` - 包含完整的 API 調用範例
- `/API/test-fxiaoke-api.js` - 實際可運行的測試代碼
- `/API/fxiaoke-credentials.md` - 最新的 API 憑證

## 紛享銷客 API 正確調用模式

### 1. 認證流程（重要！）
```javascript
// Step 1: 獲取 Access Token
const tokenResponse = await fetch(`${baseUrl}/cgi/corpAccessToken/get/V2`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appId: 'FSAID_1320691',
    appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
    permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
  })
});

// Step 2: 獲取用戶 ID（必須！）
const userResponse = await fetch(`${baseUrl}/cgi/user/getByMobile`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    corpId: corpId,
    corpAccessToken: accessToken,
    mobile: "17675662629"  // 固定手機號
  })
});
```

### 2. 數據查詢必須包含三個認證參數
```javascript
// 所有數據查詢 API 都必須包含：
{
  corpId: corpId,                    // 公司 ID
  corpAccessToken: accessToken,      // 訪問令牌
  currentOpenUserId: currentOpenUserId, // 當前用戶 ID
  data: {
    // 查詢參數
  }
}
```

### 3. API 端點區別
- **商機（標準對象）**: `/cgi/crm/v2/data/query`
- **案場（自定義對象）**: `/cgi/crm/custom/v2/data/query`

### 4. 批次處理注意事項
- 每批最大 500 條記錄
- 使用 `offset` 和 `limit` 進行分頁
- 案場總數約 3,942 條（需要 8 批）

## 常見錯誤和解決方案

### 錯誤：currentOpenUserId 不能为空
**原因**：API 調用時未包含用戶 ID
**解決**：確保所有數據查詢都包含三個認證參數

### 錯誤：the parameter appAccessToken is missing or illegal
**原因**：使用了錯誤的 API 版本或參數名稱
**解決**：使用 `/V2` 端點，參數名是 `corpAccessToken`

## 開發注意事項
1. 總是先測試直接 API 調用（使用 `test-simple-api.js`）
2. Token 有效期為 2 小時，需要緩存和自動刷新
3. 批次大小設為 500 可以減少 API 調用次數
4. 使用增量同步減少數據傳輸量

## Cloudflare Workers 限制（2025 年更新）

### CPU 和執行時間
- **CPU 時間**：最多 5 分鐘（大幅提升！）
- **執行時間**：無硬性限制，只要客戶端保持連接

### Subrequests（子請求）限制
- **免費版**：每個請求 50 個子請求
- **付費版**：每個請求 1,000 個子請求
- **重要**：Cloudflare 不計費子請求

### D1 資料庫限制
- **並發連接**：每個 Worker 調用最多 6 個
- **綁定數量**：可綁定最多 5,000 個 D1 資料庫
- **操作計算**：按讀取行數和寫入行數計算

### 外部服務操作
- **單次調用限制**：最多 1,000 個操作（包括 D1 讀寫）

## 自適應分批同步規則（優化版）

### 核心設計原則
1. **操作數限制**：確保總操作數不超過 1,000 個
2. **時間保護**：執行超過 2 分鐘自動停止
3. **斷點續傳**：支援保存進度，下次從中斷處繼續

### 當前同步參數配置
```javascript
const batchSize = 200;        // 每批處理 200 條記錄
const MAX_BATCHES = 3;        // 每次執行最多 3 批
const MAX_EXECUTION_TIME = 120000; // 2 分鐘執行時間
// 總計：3 批 × 200 條 = 600 條記錄/600 個操作（在 1000 限制內）
```

### 同步邏輯流程
1. **初始化**：記錄開始時間，設置批次參數
2. **循環處理**：
   - 檢查執行時間是否接近限制
   - 從 CRM 獲取一批數據（offset, limit）
   - 判斷是否還有更多數據：`hasMore = batch.length === batchSize`
   - 同步數據到 D1 資料庫
   - 更新統計數據（成功/失敗數量）
   - offset 增加，繼續下一批
3. **停止條件**：
   - 返回數據少於 batchSize（自然結束）
   - 執行時間超過 25 秒（時間保護）
   - 返回 0 條記錄（無數據）

### 過濾條件
所有對象都過濾作廢狀態：
```javascript
filters: [
  {
    field_name: 'life_status',
    operator: 'NEQ',
    field_values: ['作废']
  }
]
```

### 時間戳格式
所有對象統一使用毫秒時間戳進行增量同步：
```javascript
const timestampValue = typeof lastSyncTime === 'number' ? 
  lastSyncTime : new Date(lastSyncTime).getTime();
```

## 測試指令
```bash
# 本地測試 API
cd scripts
node test-simple-api.js

# 查看 Worker 日誌
cd workers
npx wrangler tail --format pretty

# 查看 D1 數據
wrangler d1 execute fx-crm-database --remote --command="SELECT COUNT(*) FROM object_8W9cb__c"

# 手動觸發特定對象同步
curl -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/start" \
  -H "Content-Type: application/json" \
  -d '{"fullSync": true}'

# 檢查同步狀態
curl "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/database-stats"

# 批次同步腳本
cd scripts
./batch-sync.sh
```

## 同步問題排查（2025-08-09 調查結果）

### ✅ 問題已解決（2025-08-09）
- **CRM 總記錄數**：4,136 條（不含作廢）
- **D1 記錄數**：4,136 條
- **同步率**：100% 🎉

### 問題根本原因（已修復）
1. **欄位變更問題**
   - CRM 在 2024年4月後新增了 4 個欄位（field_23Z5i__c 等）
   - 舊記錄（2024年3-4月）沒有這些欄位
   - Worker 代碼處理缺失欄位時返回 `undefined` 而非 `null`

2. **代碼 BUG 修復**
   ```javascript
   // 修復前：undefined 導致 SQL 插入失敗
   const field_23Z5i__c = Array.isArray(site.field_23Z5i__c) ? 
     site.field_23Z5i__c[0] : site.field_23Z5i__c;
   
   // 修復後：正確返回 null
   const field_23Z5i__c = site.field_23Z5i__c ? 
     (Array.isArray(site.field_23Z5i__c) ? site.field_23Z5i__c[0] : site.field_23Z5i__c) : 
     null;
   ```

### 診斷腳本
```bash
# 檢查最終狀態
node scripts/final-check.js

# 診斷同步問題
node scripts/diagnose-sync-issue.js

# 檢查 CRM 批次數據
node scripts/check-crm-batches.js

# 強制完整同步
node scripts/force-complete-sync.js
```

### 建議解決方案
1. 檢查 Worker 錯誤日誌找出具體寫入失敗原因
2. 分析這 558 條記錄的共同特徵
3. 考慮使用增量同步模式
4. 手動同步失敗的批次