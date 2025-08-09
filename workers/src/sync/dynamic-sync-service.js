/**
 * 動態同步服務 - 能夠處理不同欄位結構的對象
 */

export class DynamicSyncService {
  constructor(fxClient, db) {
    this.fxClient = fxClient;
    this.db = db;
  }

  /**
   * 動態同步任意對象
   */
  async syncDynamicObject(objectApiName, isCustom = true, options = {}) {
    const syncId = `dynamic_sync_${objectApiName}_${Date.now()}`;
    const startTime = new Date();
    const tableName = objectApiName.toLowerCase();
    
    try {
      console.log(`[${syncId}] 開始動態同步 ${objectApiName}...`);
      
      // 記錄同步開始
      await this.logSyncStart(syncId, objectApiName, startTime);
      
      // 獲取數據
      const data = await this.fetchDynamicData(objectApiName, isCustom, options);
      console.log(`[${syncId}] 獲取到 ${data.length} 條記錄`);
      
      if (data.length === 0) {
        console.log(`[${syncId}] 沒有數據需要同步`);
        await this.logSyncComplete(syncId, objectApiName, {
          records_count: 0,
          success_count: 0,
          error_count: 0
        });
        return { success: 0, errors: 0 };
      }
      
      // 確保表存在並獲取表結構
      await this.ensureTableExists(tableName, data[0]);
      
      // 批量同步到D1
      const result = await this.batchSyncDynamic(tableName, data);
      
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
    const pageSize = 500;
    
    // 選擇正確的API端點
    const endpoint = isCustom 
      ? '/cgi/crm/custom/v2/data/query'
      : '/cgi/crm/v2/data/query';
    
    console.log(`[動態同步] 從 ${endpoint} 獲取 ${objectApiName} 數據...`);
    
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
   * 批量同步數據到D1
   */
  async batchSyncDynamic(tableName, data) {
    let success = 0;
    let errors = 0;
    const batchSize = 100;
    
    console.log(`[動態同步] 開始同步 ${data.length} 條數據到表 ${tableName}`);
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        console.log(`[動態同步] 處理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 條`);
        
        for (const record of batch) {
          try {
            await this.upsertRecord(tableName, record);
            success++;
          } catch (error) {
            console.error(`記錄 ${record._id} 保存失敗:`, error.message);
            console.error(`記錄內容:`, JSON.stringify(record).substring(0, 200));
            errors++;
          }
        }
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    return { success, errors };
  }

  /**
   * 插入或更新單條記錄
   */
  async upsertRecord(tableName, record) {
    try {
      // 處理特殊欄位
      const processedRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (key === 'searchAfterId') continue;
        
        // 處理不同類型的值
        if (value === null || value === undefined) {
          processedRecord[key] = null;
        } else if (typeof value === 'object' && value !== null) {
          // 對象和數組都轉為 JSON 字符串
          processedRecord[key] = JSON.stringify(value);
        } else if (typeof value === 'string') {
          // 處理特殊的字符串值
          if (value.length > 10000) {
            // 截斷過長的字符串
            processedRecord[key] = value.substring(0, 10000);
          } else {
            processedRecord[key] = value;
          }
        } else {
          processedRecord[key] = value;
        }
      }
      
      // 添加同步欄位
      processedRecord.fx_created_at = record.create_time || Date.now();
      processedRecord.fx_updated_at = record.last_modified_time || Date.now();
      
      // 構建動態 SQL，使用引號保護欄位名
      const columns = Object.keys(processedRecord);
      const quotedColumns = columns.map(col => `"${col}"`);
      const placeholders = columns.map(() => '?').join(', ');
      const updateColumns = columns
        .filter(col => col !== '_id')
        .map(col => `"${col}" = excluded."${col}"`)
        .join(', ');
      
      const sql = `
        INSERT INTO "${tableName}" (${quotedColumns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT("_id") DO UPDATE SET
          ${updateColumns},
          "sync_version" = "sync_version" + 1,
          "sync_time" = CURRENT_TIMESTAMP
      `;
      
      const values = columns.map(col => {
        const value = processedRecord[col];
        // 確保值不會導致 SQL 錯誤
        if (typeof value === 'string' && value.includes('\0')) {
          return value.replace(/\0/g, ''); // 移除 NULL 字符
        }
        return value;
      });
      
      await this.db.prepare(sql).bind(...values).run();
    } catch (error) {
      console.error(`記錄 ${record._id} 插入失敗:`, error.message);
      console.error(`SQL 錯誤詳情:`, error.stack);
      
      // 如果是欄位不存在的錯誤，嘗試添加欄位
      if (error.message.includes('no such column') || error.message.includes('table') && error.message.includes('has no column')) {
        console.log(`嘗試更新表 ${tableName} 的結構...`);
        await this.updateTableSchema(tableName, record);
        // 重試一次
        await this.upsertRecord(tableName, record);
      } else {
        throw error;
      }
    }
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
}