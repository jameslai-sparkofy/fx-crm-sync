#!/bin/bash

# 批次同步腳本
# 分批執行同步，避免超時

echo "開始批次同步 object_8W9cb__c..."
echo "================================="

API_URL="https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/object_8W9cb__c/start"
BATCH_SIZE=200
TOTAL_RECORDS=4136
BATCHES=$((($TOTAL_RECORDS + $BATCH_SIZE - 1) / $BATCH_SIZE))

echo "總記錄數: $TOTAL_RECORDS"
echo "批次大小: $BATCH_SIZE"
echo "總批次數: $BATCHES"
echo ""

SUCCESS_COUNT=0
ERROR_COUNT=0

for ((i=0; i<$BATCHES; i++)); do
    OFFSET=$((i * $BATCH_SIZE))
    echo "批次 $((i+1))/$BATCHES - Offset: $OFFSET"
    
    # 執行同步
    RESPONSE=$(curl -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"fullSync\": true, \"batchSize\": $BATCH_SIZE, \"offset\": $OFFSET}" \
        --max-time 30 \
        -s 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # 嘗試解析 JSON
        SUCCESS=$(echo "$RESPONSE" | grep -o '"success":[0-9]*' | cut -d':' -f2)
        ERRORS=$(echo "$RESPONSE" | grep -o '"errors":[0-9]*' | cut -d':' -f2)
        
        if [ -n "$SUCCESS" ]; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + SUCCESS))
            ERROR_COUNT=$((ERROR_COUNT + ERRORS))
            echo "  成功: $SUCCESS, 錯誤: $ERRORS"
        else
            echo "  響應: $RESPONSE"
        fi
    else
        echo "  請求失敗或超時"
    fi
    
    # 短暫休息避免過載
    sleep 2
done

echo ""
echo "================================="
echo "同步完成"
echo "總成功: $SUCCESS_COUNT"
echo "總錯誤: $ERROR_COUNT"