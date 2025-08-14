#!/bin/bash

echo "========================================="
echo "部署雙向同步功能"
echo "========================================="
echo ""

# 切換到 workers 目錄
cd ../workers

# 1. 創建 D1 變更追蹤表和觸發器
echo "📊 創建 D1 變更追蹤表和觸發器..."
wrangler d1 execute fx-crm-database --remote --file=../sql/create-d1-change-tracking.sql

# 2. 創建同步日誌表（如果還沒有）
echo "📊 創建同步日誌表..."
wrangler d1 execute fx-crm-database --remote --file=../sql/create-sync-logs-table.sql

# 3. 部署 Worker
echo ""
echo "🚀 部署到開發環境..."
npx wrangler deploy --env development

echo ""
echo "========================================="
echo "✅ 雙向同步部署完成！"
echo "========================================="
echo ""
echo "📌 雙向同步架構："
echo ""
echo "   CRM → D1 (Webhook 即時同步)"
echo "   ├─ Webhook URL: /api/webhook/notify"
echo "   ├─ 支援事件: created, updated, deleted"
echo "   └─ 自動寫入 D1 資料庫"
echo ""
echo "   D1 → CRM (觸發器 + 定期處理)"
echo "   ├─ D1 觸發器監聽 INSERT/UPDATE/DELETE"
echo "   ├─ 變更記錄到 d1_change_log 表"
echo "   ├─ 定期處理: /api/d1-sync/process"
echo "   └─ 自動寫回 CRM"
echo ""
echo "📌 API 端點："
echo "   - 處理 D1 變更: POST /api/d1-sync/process"
echo "   - 查看 D1 變更: GET /api/d1-sync/changes"
echo "   - 手動同步: POST /api/d1-sync/manual"
echo "   - 配置管理: GET/PUT /api/d1-sync/config"
echo "   - 重試失敗: POST /api/d1-sync/retry"
echo ""
echo "📌 防止循環同步機制："
echo "   1. 檢查 30 秒內的重複同步"
echo "   2. 比較數據內容是否相同"
echo "   3. 使用 sync_time 欄位區分來源"
echo ""
echo "📌 測試腳本："
echo "   node scripts/test-bidirectional-sync.js"
echo ""
echo "⚠️  注意事項："
echo "   1. 確保 CRM 已配置 Webhook URL"
echo "   2. D1 觸發器會自動記錄變更"
echo "   3. 定期任務會處理待同步的變更"
echo "   4. 監控 sync_logs 和 d1_change_log 表"
echo ""