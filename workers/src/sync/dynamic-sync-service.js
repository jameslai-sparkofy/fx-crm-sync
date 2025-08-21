/**
 * 動態同步服務 - 能夠處理不同欄位結構的對象
 */

export class DynamicSyncService {
  constructor(fxClient, db) {
    this.fxClient = fxClient;
    this.db = db;
    
    // 不需要同步的欄位清單 (根據CSV文件)
    this.skipFields = new Set([
      'lock_rule',
      'life_status_before_invalid', 
      'owner_department',
      'created_by',
      'relevant_team',
      'data_own_department',
      'field_i2Q1g__c',
      'field_npLvn__c', 
      'origin_source',
      'lock_user',
      'out_owner',
      'field_k7e6q__c',
      'record_type'
    ]);
  }

  /**
   * 動態同步任意對象
   */
  async syncDynamicObject(objectApiName, isCustom = true, options = {}) {
    const syncId = `dynamic_sync_${objectApiName}_${Date.now()}`;
    const startTime = new Date();
    
    // 新增：支持限制同步記錄數
    const syncLimit = options.limit || null;
    const testMode = options.testMode || false;
    
    // 表切換已完成，直接使用正式表名
    let tableName = objectApiName.toLowerCase();
    console.log(`[${syncId}] 使用表: ${tableName}`);
    
    if (testMode) {
      console.log(`[${syncId}] [測試模式] 限制同步 ${syncLimit} 條記錄`);
    }
    
    try {
      console.log(`[${syncId}] 開始動態同步 ${objectApiName}...`);
      
      // 記錄同步開始
      await this.logSyncStart(syncId, objectApiName, startTime);
      await this.logSyncProgress(syncId, 'STARTED', testMode ? `開始測試同步任務 (限制 ${syncLimit} 條)` : '開始同步任務');
      
      // 增量同步：獲取最後同步時間
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime(objectApiName);
      
      // 構建過濾條件
      const filters = [];
      
      // 添加生命週期過濾
      filters.push({
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      });
      
      // 添加時間過濾（增量同步）
      if (lastSyncTime && !options.fullSync) {
        console.log(`[${syncId}] [增量同步] 從 ${new Date(lastSyncTime).toISOString()} 開始同步`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [lastSyncTime]
        });
        await this.logSyncProgress(syncId, 'INCREMENTAL', `增量同步：從 ${new Date(lastSyncTime).toISOString()} 開始`);
      } else if (options.fullSync) {
        console.log(`[${syncId}] [完整同步] 同步所有記錄`);
        await this.logSyncProgress(syncId, 'FULL_SYNC', '完整同步：獲取所有記錄');
      }
      
      // 獲取數據
      await this.logSyncProgress(syncId, 'FETCHING', '正在從CRM獲取數據...');
      const rawData = await this.fetchDynamicData(objectApiName, isCustom, {
        ...options,
        maxRecords: syncLimit,
        filters: filters
      });
      console.log(`[${syncId}] 獲取到 ${rawData.length} 條記錄`);
      await this.logSyncProgress(syncId, 'FETCHED', `已獲取 ${rawData.length} 條記錄`);
      
      if (testMode && rawData.length > 0) {
        console.log(`[${syncId}] [測試模式] 成功獲取 ${rawData.length} 條記錄，開始同步`);
      }
      
      // 過濾不需要的欄位 (針對object_8W9cb__c)
      await this.logSyncProgress(syncId, 'FILTERING', '正在過濾欄位...');
      const data = objectApiName === 'object_8W9cb__c' 
        ? this.filterFields(rawData)
        : rawData;
      
      if (objectApiName === 'object_8W9cb__c' && rawData.length > 0) {
        console.log(`[${syncId}] 欄位過濾完成，跳過 ${this.skipFields.size} 個不需要的欄位`);
        await this.logSyncProgress(syncId, 'FILTERED', `欄位過濾完成，跳過 ${this.skipFields.size} 個欄位`);
      }
      
      if (data.length === 0) {
        console.log(`[${syncId}] 沒有數據需要同步`);
        await this.logSyncProgress(syncId, 'NO_DATA', '沒有數據需要同步');
        await this.logSyncComplete(syncId, objectApiName, {
          records_count: 0,
          success_count: 0,
          error_count: 0
        });
        return { success: 0, errors: 0 };
      }
      
      // 確保表存在並獲取表結構
      await this.logSyncProgress(syncId, 'TABLE_CHECK', '檢查表結構...');
      await this.ensureTableExists(tableName, data[0]);
      
      // 批量同步到D1
      await this.logSyncProgress(syncId, 'SYNCING', `開始同步 ${data.length} 條記錄到D1...`);
      const result = await this.batchSyncDynamic(tableName, data, syncId);
      
      // 記錄同步完成
      await this.logSyncComplete(syncId, objectApiName, {
        records_count: data.length,
        success_count: result.success,
        error_count: result.errors
      });
      
      console.log(`[${syncId}] 動態同步完成: 成功 ${result.success}, 失敗 ${result.errors}`);
      return result;
      
    } catch (error) {
      console.error(`[${syncId}] 動態同步失敗:`, error);
      await this.logSyncError(syncId, objectApiName, error);
      throw error;
    }
  }

  /**
   * 從CRM獲取動態對象數據
   */
  async fetchDynamicData(objectApiName, isCustom, options = {}) {
    const allData = [];
    let offset = 0;
    let hasMore = true;
    
    // 根據 maxRecords 調整 pageSize
    const defaultPageSize = 500;
    const pageSize = options.maxRecords ? 
      Math.min(options.maxRecords, defaultPageSize) : 
      defaultPageSize;
    
    // 選擇正確的API端點
    const endpoint = isCustom 
      ? '/cgi/crm/custom/v2/data/query'
      : '/cgi/crm/v2/data/query';
    
    console.log(`[動態同步] 從 ${endpoint} 獲取 ${objectApiName} 數據，批次大小: ${pageSize}, 限制: ${options.maxRecords || '無'}`);
    
    while (hasMore) {
      const response = await this.fxClient.post(endpoint, {
        data: {
          dataObjectApiName: objectApiName,
          search_query_info: {
            limit: pageSize,
            offset: offset,
            filters: options.filters || []
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取 ${objectApiName} 數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[動態同步] 第 ${Math.floor(offset / pageSize) + 1} 批，獲取 ${records.length} 條，總計 ${allData.length} 條`);
      
      if (records.length < pageSize || (options.maxRecords && allData.length >= options.maxRecords)) {
        hasMore = false;
        console.log(`[動態同步] 獲取完成，共 ${allData.length} 條記錄`);
      } else {
        offset += pageSize;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allData;
  }

  /**
   * 確保表存在，如果不存在則創建
   */
  async ensureTableExists(tableName, sampleData) {
    // 檢查表是否存在
    const tableCheck = await this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?
    `).bind(tableName).first();
    
    if (tableCheck) {
      console.log(`[動態同步] 表 ${tableName} 已存在`);
      // 檢查是否需要添加新欄位
      await this.updateTableSchema(tableName, sampleData);
    } else {
      console.log(`[動態同步] 創建表 ${tableName}`);
      await this.createDynamicTable(tableName, sampleData);
    }
  }

  /**
   * 根據樣本數據創建表
   */
  async createDynamicTable(tableName, sampleData) {
    const columns = [];
    
    // 主鍵
    columns.push('"_id" TEXT PRIMARY KEY');
    
    // 從樣本數據推斷欄位類型
    for (const [key, value] of Object.entries(sampleData)) {
      if (key === '_id') continue;
      if (key === 'searchAfterId') continue; // 跳過搜索相關欄位
      
      // 處理欄位名稱中的特殊字符
      let columnDef = `"${key}"`;
      
      // 推斷數據類型
      if (typeof value === 'number') {
        columnDef += ' REAL';
      } else if (typeof value === 'boolean') {
        columnDef += ' BOOLEAN';
      } else if (typeof value === 'object' && value !== null) {
        columnDef += ' TEXT'; // JSON 存為文本
      } else {
        columnDef += ' TEXT';
      }
      
      columns.push(columnDef);
    }
    
    // 添加同步相關欄位
    columns.push('"fx_created_at" INTEGER');
    columns.push('"fx_updated_at" INTEGER');
    columns.push('"sync_version" INTEGER DEFAULT 0');
    columns.push('"sync_time" TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    
    const createSQL = `CREATE TABLE "${tableName}" (${columns.join(', ')})`;
    console.log(`[動態同步] 創建表 SQL: ${createSQL.substring(0, 200)}...`);
    
    await this.db.prepare(createSQL).run();
    
    // 創建索引
    const indexColumns = ['life_status', 'last_modified_time', 'owner'];
    for (const col of indexColumns) {
      if (sampleData.hasOwnProperty(col)) {
        try {
          await this.db.prepare(
            `CREATE INDEX IF NOT EXISTS "idx_${tableName}_${col}" ON "${tableName}"("${col}")`
          ).run();
        } catch (error) {
          console.error(`創建索引失敗 ${col}:`, error.message);
        }
      }
    }
  }

  /**
   * 更新表結構以匹配新欄位
   */
  async updateTableSchema(tableName, sampleData) {
    try {
      // 獲取現有欄位
      const columns = await this.db.prepare(
        `PRAGMA table_info(${tableName})`
      ).all();
      
      const existingColumns = new Set(columns.results?.map(col => col.name) || []);
    
      // 添加缺失的欄位
      for (const key of Object.keys(sampleData)) {
        if (!existingColumns.has(key) && key !== 'searchAfterId') {
          console.log(`[動態同步] 添加新欄位 ${key} 到表 ${tableName}`);
          
          let columnType = 'TEXT';
          const value = sampleData[key];
          if (typeof value === 'number') {
            columnType = 'REAL';
          } else if (typeof value === 'boolean') {
            columnType = 'BOOLEAN';
          }
          
          try {
            // 處理欄位名稱中的特殊字符
            const safeColumnName = `"${key}"`;
            await this.db.prepare(
              `ALTER TABLE ${tableName} ADD COLUMN ${safeColumnName} ${columnType}`
            ).run();
          } catch (error) {
            console.error(`無法添加欄位 ${key}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`更新表結構失敗:`, error.message);
    }
  }

  /**
   * 批量同步數據到D1 - 增強完整日志版本
   */
  async batchSyncDynamic(tableName, data, syncId = null) {
    let success = 0;
    let errors = 0;
    let processedRecords = [];
    let failedRecords = [];
    const batchSize = 10; // 優化為10條一批，平衡性能和監控粒度
    const totalRecords = data.length;
    const startTime = Date.now();
    
    console.log(`[${syncId || 'BATCH'}] 開始批次同步: ${totalRecords} 條記錄到表 ${tableName}`);
    
    // 初始統計日志
    if (syncId) {
      await this.logSyncProgress(syncId, 'BATCH_INIT', 
        `初始化批次同步: ${totalRecords} 條記錄，批次大小 ${batchSize}`);
    }
    
    for (let i = 0; i < totalRecords; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalRecords / batchSize);
      const batchStartTime = Date.now();
      
      console.log(`[${syncId || 'BATCH'}] 處理第 ${batchNumber}/${totalBatches} 批次 (記錄 ${i+1}-${Math.min(i + batchSize, totalRecords)})`);
      
      // 批次開始日志
      if (syncId) {
        await this.logSyncProgress(syncId, 'BATCH_START', 
          `開始第 ${batchNumber}/${totalBatches} 批次: ${batch.length} 條記錄`);
      }
      
      try {
        let batchSuccess = 0;
        let batchErrors = 0;
        
        for (const record of batch) {
          const recordStartTime = Date.now();
          const recordIndex = i + batchSuccess + batchErrors + 1;
          
          try {
            console.log(`[${syncId || 'BATCH'}] 處理記錄 ${recordIndex}/${totalRecords}: ${record._id} (${record.name || '無名稱'})`);
            
            // 執行記錄同步
            await this.upsertRecord(tableName, record);
            
            const recordElapsed = Date.now() - recordStartTime;
            success++;
            batchSuccess++;
            
            // 記錄成功的記錄詳情
            const recordInfo = {
              _id: record._id,
              name: record.name || null,
              index: recordIndex,
              processingTime: recordElapsed,
              status: 'SUCCESS',
              timestamp: new Date().toISOString()
            };
            processedRecords.push(recordInfo);
            
            console.log(`✅ 記錄 ${recordIndex}/${totalRecords} 成功: ${record._id} (${recordElapsed}ms)`);
            
            // 每5條記錄輸出一次進度摘要
            if (recordIndex % 5 === 0) {
              const overallProgress = ((recordIndex / totalRecords) * 100).toFixed(1);
              console.log(`📊 進度: ${recordIndex}/${totalRecords} (${overallProgress}%) - 成功: ${success}, 失敗: ${errors}`);
            }
            
          } catch (error) {
            const recordElapsed = Date.now() - recordStartTime;
            errors++;
            batchErrors++;
            
            // 記錄失敗的記錄詳情
            const failedInfo = {
              _id: record._id,
              name: record.name || null,
              index: recordIndex,
              processingTime: recordElapsed,
              status: 'FAILED',
              error: error.message,
              errorType: error.constructor.name,
              timestamp: new Date().toISOString(),
              recordSample: {
                _id: record._id,
                name: record.name,
                fieldsCount: Object.keys(record).length,
                lastModified: record.last_modified_time
              }
            };
            failedRecords.push(failedInfo);
            
            console.error(`❌ 記錄 ${recordIndex}/${totalRecords} 失敗: ${record._id} (${recordElapsed}ms)`);
            console.error(`   錯誤: ${error.message}`);
            console.error(`   記錄摘要: ${JSON.stringify(failedInfo.recordSample)}`);
          }
        }
        
        const batchElapsed = Date.now() - batchStartTime;
        const batchSuccessRate = ((batchSuccess / batch.length) * 100).toFixed(1);
        
        // 批次完成日志
        console.log(`[${syncId || 'BATCH'}] 批次 ${batchNumber}/${totalBatches} 完成: 成功 ${batchSuccess}/${batch.length} (${batchSuccessRate}%), 耗時 ${batchElapsed}ms`);
        
        if (syncId) {
          await this.logSyncProgress(syncId, 'BATCH_COMPLETE', 
            `第 ${batchNumber}/${totalBatches} 批次完成: ${batchSuccess}/${batch.length} 成功 (${batchSuccessRate}%), ${batchElapsed}ms`);
        }
        
      } catch (batchError) {
        console.error(`[${syncId || 'BATCH'}] 批次 ${batchNumber} 整體失敗:`, batchError.message);
        errors += batch.length; // 整批失敗
        
        // 記錄批次級別的錯誤
        for (const record of batch) {
          failedRecords.push({
            _id: record._id,
            name: record.name || null,
            index: i + failedRecords.length + 1,
            status: 'BATCH_FAILED',
            error: `批次錯誤: ${batchError.message}`,
            timestamp: new Date().toISOString()
          });
        }
        
        if (syncId) {
          await this.logSyncProgress(syncId, 'BATCH_ERROR', 
            `第 ${batchNumber} 批次失敗: ${batchError.message}`);
        }
      }
      
      // 每批次間短暫暫停，避免過度負載
      if (i + batchSize < totalRecords) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const totalElapsed = Date.now() - startTime;
    const overallSuccessRate = ((success / totalRecords) * 100).toFixed(1);
    const avgTimePerRecord = success > 0 ? (totalElapsed / success).toFixed(1) : 'N/A';
    
    // 最終統計日志
    console.log(`\n📊 批次同步完成統計:`);
    console.log(`   總記錄數: ${totalRecords}`);
    console.log(`   成功數量: ${success} (${overallSuccessRate}%)`);
    console.log(`   失敗數量: ${errors}`);
    console.log(`   總耗時: ${totalElapsed}ms`);
    console.log(`   平均每條記錄: ${avgTimePerRecord}ms`);
    console.log(`   處理速度: ${(success / (totalElapsed / 1000)).toFixed(1)} 記錄/秒`);
    
    // 記錄最終統計到同步日志
    if (syncId) {
      const finalStats = {
        totalRecords,
        successCount: success,
        errorCount: errors,
        successRate: overallSuccessRate,
        totalTime: totalElapsed,
        avgTimePerRecord,
        recordsPerSecond: (success / (totalElapsed / 1000)).toFixed(1),
        processedRecords: processedRecords.slice(0, 10), // 只保存前10條成功記錄樣本
        failedRecords: failedRecords.slice(0, 20) // 保存前20條失敗記錄詳情
      };
      
      await this.logSyncProgress(syncId, 'BATCH_FINAL', 
        `批次同步完成: ${success}/${totalRecords} 成功 (${overallSuccessRate}%), 總耗時 ${totalElapsed}ms`);
      
      // 如果有失敗記錄，額外記錄失敗詳情
      if (errors > 0) {
        console.log(`\n❌ 失敗記錄詳情 (前20條):`);
        failedRecords.slice(0, 20).forEach((failed, index) => {
          console.log(`   ${index + 1}. ${failed._id} (${failed.name || '無名稱'}) - ${failed.error}`);
        });
        
        await this.logSyncProgress(syncId, 'FAILED_RECORDS', 
          `${errors} 條記錄同步失敗，詳情: ${JSON.stringify(failedRecords.slice(0, 5))}`);
      }
    }
    
    return { 
      success, 
      errors, 
      statistics: {
        totalRecords,
        successRate: overallSuccessRate,
        totalTime: totalElapsed,
        avgTimePerRecord,
        recordsPerSecond: (success / (totalElapsed / 1000)).toFixed(1)
      },
      processedRecords: processedRecords.slice(0, 10),
      failedRecords: failedRecords.slice(0, 20)
    };
  }

  /**
   * 插入或更新單條記錄 - 全字段版本（優化性能）
   */
  async upsertRecord(tableName, record) {
    try {
      // 檢查表結構，使用現有欄位
      const columns = await this.db.prepare(
        `PRAGMA table_info(${tableName})`
      ).all();
      
      const existingColumns = new Set(columns.results?.map(col => col.name) || []);
      
      // 處理所有字段，但簡化處理邏輯
      const safeFields = {};
      
      for (const [key, value] of Object.entries(record)) {
        if (key === 'searchAfterId' || !existingColumns.has(key)) continue;
        
        // 簡化的值處理 - 核心性能優化
        if (value === null || value === undefined) {
          safeFields[key] = null;
        } else if (typeof value === 'object') {
          // 對象和數組直接JSON化，不做複雜檢查
          safeFields[key] = JSON.stringify(value);
        } else if (typeof value === 'string' && value.length > 10000) {
          // 只對超長字符串截斷
          safeFields[key] = value.substring(0, 10000);
        } else {
          safeFields[key] = value;
        }
      }
      
      // 構建動態SQL - 只針對實際存在的字段
      const fieldNames = Object.keys(safeFields);
      const quotedColumns = fieldNames.map(col => `"${col}"`);
      const placeholders = fieldNames.map(() => '?').join(', ');
      const updateColumns = fieldNames
        .filter(col => col !== '_id')
        .map(col => `"${col}" = excluded."${col}"`)
        .join(', ');
      
      const sql = `
        INSERT INTO "${tableName}" (${quotedColumns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT("_id") DO UPDATE SET ${updateColumns}
      `;
      
      const values = fieldNames.map(col => {
        const value = safeFields[col];
        // 快速null字符處理
        return typeof value === 'string' && value.includes('\0') 
          ? value.replace(/\0/g, '') 
          : value;
      });
      
      await this.db.prepare(sql).bind(...values).run();
      
    } catch (error) {
      console.error(`記錄 ${record._id} 插入失敗:`, error.message);
      
      // 如果是欄位不存在的錯誤，嘗試添加欄位
      if (error.message.includes('no such column')) {
        console.log(`嘗試更新表 ${tableName} 的結構...`);
        await this.updateTableSchema(tableName, record);
        // 重試一次
        await this.upsertRecord(tableName, record);
      } else if (error.message.includes('no such table')) {
        console.log(`創建簡化表 ${tableName}`);
        await this.createSimplifiedTable(tableName);
        await this.upsertRecord(tableName, record);
      } else {
        throw error;
      }
    }
  }

  /**
   * 創建簡化表結構 - 只包含核心欄位
   */
  async createSimplifiedTable(tableName) {
    const sql = `
      CREATE TABLE "${tableName}" (
        "_id" TEXT PRIMARY KEY,
        "name" TEXT,
        "create_time" INTEGER,
        "last_modified_time" INTEGER,
        "life_status" TEXT,
        "is_deleted" BOOLEAN DEFAULT FALSE,
        "version" INTEGER,
        "owner" TEXT,
        "raw_data" TEXT,
        "fx_created_at" INTEGER,
        "fx_updated_at" INTEGER,
        "sync_time" INTEGER
      )
    `;
    
    console.log(`[動態同步] 創建簡化表: ${tableName}`);
    await this.db.prepare(sql).run();
    
    // 創建索引
    await this.db.prepare(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_last_modified" ON "${tableName}"("last_modified_time")`).run();
    await this.db.prepare(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_life_status" ON "${tableName}"("life_status")`).run();
  }

  /**
   * 記錄同步開始
   */
  async logSyncStart(syncId, entityType, startTime) {
    await this.db.prepare(`
      INSERT INTO sync_logs (
        sync_id, entity_type, action, status, started_at
      ) VALUES (?, ?, 'SYNC', 'IN_PROGRESS', ?)
    `).bind(syncId, entityType, startTime.toISOString()).run();
  }

  /**
   * 記錄同步完成
   */
  async logSyncComplete(syncId, entityType, stats) {
    // 使用台北時間 (UTC+8)
    const taipeiTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    
    await this.db.prepare(`
      UPDATE sync_logs
      SET status = 'COMPLETED',
          completed_at = ?,
          records_count = ?,
          error_count = ?,
          details = ?
      WHERE sync_id = ?
    `).bind(
      taipeiTime,
      stats.records_count,
      stats.error_count,
      JSON.stringify(stats),
      syncId
    ).run();
  }

  /**
   * 記錄同步錯誤
   */
  async logSyncError(syncId, entityType, error) {
    // 使用台北時間 (UTC+8)
    const taipeiTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    
    await this.db.prepare(`
      UPDATE sync_logs
      SET status = 'FAILED',
          completed_at = ?,
          details = ?
      WHERE sync_id = ?
    `).bind(
      taipeiTime,
      JSON.stringify({ error: error.message, stack: error.stack }),
      syncId
    ).run();
  }

  /**
   * 記錄同步進度
   */
  async logSyncProgress(syncId, phase, message) {
    try {
      // 使用台北時間 (UTC+8)
      const taipeiTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      
      await this.db.prepare(`
        UPDATE sync_logs
        SET details = ?,
            last_updated = ?
        WHERE sync_id = ?
      `).bind(
        JSON.stringify({ 
          phase: phase, 
          message: message, 
          timestamp: taipeiTime 
        }),
        taipeiTime,
        syncId
      ).run();
      
      console.log(`[${syncId}] [${phase}] ${message}`);
    } catch (error) {
      console.error(`記錄進度失敗:`, error.message);
    }
  }

  /**
   * 獲取最後同步時間
   */
  async getLastSyncTime(objectApiName) {
    const tableName = objectApiName.toLowerCase();
    
    try {
      const result = await this.db.prepare(`
        SELECT MAX(last_modified_time) as last_sync
        FROM ${tableName}
        WHERE is_deleted = FALSE OR is_deleted IS NULL
      `).first();
      
      if (result?.last_sync) {
        console.log(`[增量同步] ${objectApiName} 最後同步時間: ${new Date(result.last_sync).toISOString()}`);
        return result.last_sync;
      }
    } catch (error) {
      console.error(`獲取最後同步時間失敗:`, error);
    }
    
    console.log(`[增量同步] ${objectApiName} 沒有找到同步時間，執行完整同步`);
    return null;
  }

  /**
   * 過濾不需要同步的欄位
   */
  filterFields(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return data;
    }

    return data.map(record => {
      const filteredRecord = {};
      
      for (const [key, value] of Object.entries(record)) {
        // 跳過不需要的欄位
        if (this.skipFields.has(key)) {
          continue;
        }
        
        // 跳過相關的關聯欄位 (如果基礎欄位被跳過)
        const baseFieldName = key.replace(/__r$|__l$|__relation_ids$|__v$/, '');
        if (baseFieldName !== key && this.skipFields.has(baseFieldName)) {
          continue;
        }
        
        filteredRecord[key] = value;
      }
      
      return filteredRecord;
    });
  }
}