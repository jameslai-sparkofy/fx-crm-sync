# 同步問題排查指南

## 📊 2025-08-09 調查報告

### ✅ 問題已成功解決
案場（SPC）資料同步問題已完全修復。所有 4,136 條記錄已成功同步到 D1（100% 同步率）。

### 🔍 根本原因分析（已確認）

通過執行 `compare-ids.js` 腳本，我們找到了所有 558 條缺失記錄的具體 ID。這些記錄的特徵：

1. **時間分佈**：
   - 2024年3月：32 條（5.7%）
   - 2024年4月：526 條（94.3%）

2. **缺失記錄範例**（前 10 條）：
   - 24-03-12-18 (65effa8aa7f76f0001f078f8)
   - 24-03-12-19 (65effa8aa7f76f0001f078f9)
   - 24-03-12-20 (65effa8aa7f76f0001f078fa)
   - 以此類推...

3. **寫入失敗原因**：
   - 批次同步時某些記錄的數據格式或內容導致 D1 寫入失敗
   - Worker 的 `batchSyncSites` 函數使用 44 個參數的 prepared statement
   - 某些欄位（如 `field_23Z5i__c`）可能包含特殊字符或超長內容

### 調查過程

#### 1. 初始假設
- ❌ Worker 執行時間限制（30 秒）
- ❌ API 請求次數限制
- ❌ 記憶體不足

#### 2. Cloudflare Worker 限制檢查
通過查詢官方文檔，確認了 2025 年的最新限制：

| 限制項目 | 免費版 | 付費版 | 我們的使用情況 |
|---------|--------|--------|--------------|
| CPU 時間 | 10ms | 5 分鐘 | ✅ 充足 |
| Subrequests | 50 | 1,000 | ✅ 充足 |
| D1 並發連接 | 6 | 6 | ✅ 充足 |
| 外部服務操作 | 1,000 | 1,000 | ⚠️ 需要控制 |

#### 3. 配置優化歷程

##### 初始配置（失敗）
```javascript
const batchSize = 500;       // 每批 500 條
const MAX_BATCHES = 3;        // 3 批
// 問題：1,500 個操作超過 1,000 限制
```

##### 第二次嘗試（失敗）
```javascript
const batchSize = 200;       // 每批 200 條
const MAX_BATCHES = 1;        // 1 批
// 問題：進度太慢
```

##### 當前配置（部分成功）
```javascript
const batchSize = 200;       // 每批 200 條
const MAX_BATCHES = 3;        // 3 批
const MAX_EXECUTION_TIME = 120000; // 2 分鐘
// 結果：可以執行但記錄未增加
```

### 診斷結果

#### ✅ 已確認正常
1. **Worker 資源充足**：CPU 時間、子請求數都在限制內
2. **斷點續傳正常**：offset 正確遞增（600, 1200, 1800, 2400）
3. **API 調用成功**：FXiaoke API 返回數據正常
4. **批次處理邏輯**：正確分批，每批都有數據

#### ❌ 異常現象
1. **記錄數不增加**：Worker 報告成功但 D1 記錄數保持 3,578
2. **錯誤計數異常**：第一批報告 412 個錯誤，後續批次 0 錯誤
3. **生命狀態差異**：CRM 有 56 條 "invalid" 狀態記錄

### 已確認並修復的根本原因

1. **欄位缺失導致的 undefined 問題**（唯一原因）
   - CRM 在 2024年4月後新增了 4 個欄位
   - 舊記錄（558 條）沒有這些欄位
   - Worker 的 `bindSiteData` 函數處理缺失欄位時返回 `undefined` 而非 `null`
   - SQL prepared statement 無法處理 `undefined` 值，導致插入失敗

2. **修復方案**（已實施）
   ```javascript
   // 確保缺失欄位返回 null 而非 undefined
   const field_23Z5i__c = site.field_23Z5i__c ? 
     (Array.isArray(site.field_23Z5i__c) ? site.field_23Z5i__c[0] : site.field_23Z5i__c) : 
     null;
   ```

3. **修復結果**
   - ✅ 所有 4,136 條記錄成功同步
   - ✅ 零錯誤，100% 成功率
   - ✅ 系統現在可以正確處理新舊記錄

## 🔧 排查步驟

### 步驟 1：檢查當前狀態
```bash
# 查看資料庫統計
curl "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/database-stats"

# 結果應該顯示：
# object_8W9cb__c: 3578 條記錄
```

### 步驟 2：運行診斷腳本
```bash
cd scripts

# 1. 檢查最終狀態
node final-check.js
# 顯示 CRM vs D1 的詳細對比

# 2. 診斷同步問題
node diagnose-sync-issue.js
# 找出缺失記錄的分佈

# 3. 檢查批次數據
node check-crm-batches.js
# 確認每個批次的記錄數
```

### 步驟 3：嘗試修復

#### 方案 A：批次同步（推薦）
```bash
# 執行批次同步腳本
./batch-sync.sh

# 或手動執行多次
for i in {1..5}; do
  curl -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/start" \
    -H "Content-Type: application/json" \
    -d '{"fullSync": true}'
  sleep 30
done
```

#### 方案 B：清除進度重新同步
```bash
# 運行強制同步腳本
node force-complete-sync.js
```

#### 方案 C：增量同步
```bash
# 只同步最近修改的記錄
curl -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/start" \
  -H "Content-Type: application/json" \
  -d '{"fullSync": false}'
```

## 📈 監控和驗證

### 監控 Worker 日誌
```bash
cd workers
npx wrangler tail --format pretty
```

### 檢查同步記錄
```bash
curl "https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/status" | python3 -m json.tool
```

### 直接查詢 D1
```bash
wrangler d1 execute fx-crm-database --remote \
  --command="SELECT COUNT(*) as count FROM object_8W9cb__c"
```

## 🚨 常見錯誤和解決方法

### 錯誤：Too many API requests
**原因**：超過 1,000 個操作限制
**解決**：減少批次大小或批次數量

### 錯誤：Worker exceeded CPU time limit
**原因**：處理時間過長
**解決**：減少 MAX_EXECUTION_TIME 或批次大小

### 錯誤：D1_ERROR
**原因**：D1 資料庫錯誤
**解決**：檢查 SQL 語句和數據格式

## 📝 最佳實踐

1. **分批執行**：每次處理 600 條（3批 × 200條）
2. **錯誤重試**：失敗後等待 30-60 秒重試
3. **定期監控**：使用 cron 定時檢查同步狀態
4. **增量同步**：日常使用增量同步，減少資源消耗
5. **日誌記錄**：保留同步日誌用於問題排查

## 🔄 後續優化建議

1. **修復數據寫入問題**（緊急）
   - 減少 prepared statement 參數數量
   - 將 JSON 欄位單獨處理
   - 對特殊字符進行轉義處理

2. **實現更智能的重試機制**
   - 記錄失敗的記錄 ID（已有 missing-ids.txt）
   - 單獨重試失敗記錄
   - 實現指數退避重試

3. **改進錯誤處理**
   - 捕獲並記錄具體的 D1 錯誤信息
   - 區分插入失敗和更新失敗
   - 添加詳細的錯誤日誌

4. **數據驗證**
   - 同步前驗證數據格式
   - 截斷超長文本欄位
   - 過濾無效記錄

## 📝 新增診斷腳本

1. **compare-ids.js** - 比較 CRM 和 D1 的記錄 ID，找出缺失記錄
2. **sync-missing-records.js** - 嘗試重新同步缺失的記錄
3. **test-direct-insert.js** - 測試單條記錄的直接插入

## 📞 聯繫支援

如果問題持續存在：
1. 檢查 Worker 錯誤日誌
2. 聯繫 Cloudflare 支援確認 D1 限制
3. 考慮升級到企業版獲得更高限制