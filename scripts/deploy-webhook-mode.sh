#!/bin/bash

echo "========================================="
echo "部署 Webhook 即時同步模式"
echo "========================================="
echo ""

# 切換到 workers 目錄
cd ../workers

# 1. 創建同步日誌表
echo "📊 創建同步日誌表..."
wrangler d1 execute fx-crm-database --remote --file=../sql/create-sync-logs-table.sql

# 2. 部署到開發環境
echo ""
echo "🚀 部署到開發環境..."
npx wrangler deploy --env development

# 3. 顯示 Webhook 配置資訊
echo ""
echo "========================================="
echo "✅ 部署完成！"
echo "========================================="
echo ""
echo "📌 Webhook 配置資訊："
echo "   URL: https://fx-crm-sync-dev.lai-jameslai.workers.dev/api/webhook/notify"
echo ""
echo "📌 支援的對象："
echo "   - NewOpportunityObj (商機)"
echo "   - object_8W9cb__c (案場SPC)"
echo "   - object_k1XqG__c (SPC維修單)"
echo "   - object_50HJ8__c (工地師父)"
echo "   - SupplierObj (供應商)"
echo "   - site_cabinet__c (案場浴櫃)"
echo "   - progress_management_announ__c (進度管理公告)"
echo ""
echo "📌 支援的事件："
echo "   - object.created (新增)"
echo "   - object.updated (更新)"
echo "   - object.deleted (刪除)"
echo ""
echo "📌 查看同步日誌："
echo "   - 最近日誌: https://fx-crm-sync-dev.lai-jameslai.workers.dev/api/sync-logs/recent"
echo "   - 統計資訊: https://fx-crm-sync-dev.lai-jameslai.workers.dev/api/sync-logs/stats"
echo ""
echo "⚠️  注意事項："
echo "   1. 請在紛享銷客後台配置 Webhook URL"
echo "   2. 定時同步已改為每天凌晨執行一次（作為備份）"
echo "   3. 主要依賴 Webhook 進行即時同步"
echo ""