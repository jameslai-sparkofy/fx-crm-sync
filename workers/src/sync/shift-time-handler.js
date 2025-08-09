/**
 * 專門處理 shift_time__c 欄位的同步
 * 
 * 由於 D1 無法正確添加 shift_time__c 欄位，
 * 我們需要單獨處理這個欄位的同步
 */

class ShiftTimeHandler {
  constructor(db, fxClient) {
    this.db = db;
    this.fxClient = fxClient;
  }

  /**
   * 創建專門的 shift_time 映射表
   */
  async createShiftTimeTable() {
    try {
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS site_shift_mapping (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          site_id TEXT UNIQUE NOT NULL,
          site_name TEXT,
          shift_time_id TEXT,
          shift_time_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      console.log('[ShiftTime] 工班映射表已創建/確認');
      return true;
    } catch (error) {
      console.error('[ShiftTime] 創建映射表失敗:', error);
      return false;
    }
  }

  /**
   * 同步工班資料
   */
  async syncShiftTimeData() {
    console.log('[ShiftTime] 開始同步工班資料...');
    
    // 確保映射表存在
    await this.createShiftTimeTable();
    
    try {
      // 從 CRM 獲取有 shift_time__c 的案場資料
      const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            limit: 500,
            offset: 0,
            filters: [
              {
                field_name: 'shift_time__c',
                operator: 'NOT_NULL'
              }
            ]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取工班資料失敗: ${response.errorMessage}`);
      }
      
      const sites = response.data?.dataList || [];
      console.log(`[ShiftTime] 找到 ${sites.length} 個有工班資料的案場`);
      
      // 批量更新映射表
      let successCount = 0;
      let errorCount = 0;
      
      for (const site of sites) {
        try {
          await this.db.prepare(`
            INSERT INTO site_shift_mapping (site_id, site_name, shift_time_id, shift_time_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(site_id) DO UPDATE SET
              shift_time_id = excluded.shift_time_id,
              shift_time_name = excluded.shift_time_name,
              updated_at = CURRENT_TIMESTAMP
          `).bind(
            site._id,
            site.name,
            site.shift_time__c__v || null,  // 工班 ID
            site.shift_time__c || null      // 工班名稱
          ).run();
          
          successCount++;
        } catch (error) {
          console.error(`[ShiftTime] 更新 ${site.name} 失敗:`, error.message);
          errorCount++;
        }
      }
      
      console.log(`[ShiftTime] 同步完成: 成功 ${successCount}, 失敗 ${errorCount}`);
      
      // 返回統計資料
      return {
        success: true,
        total: sites.length,
        successCount,
        errorCount,
        uniqueShifts: await this.getUniqueShifts()
      };
      
    } catch (error) {
      console.error('[ShiftTime] 同步失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 獲取不重複的工班列表
   */
  async getUniqueShifts() {
    try {
      const result = await this.db.prepare(`
        SELECT DISTINCT shift_time_name, COUNT(*) as site_count
        FROM site_shift_mapping
        WHERE shift_time_name IS NOT NULL
        GROUP BY shift_time_name
        ORDER BY site_count DESC
      `).all();
      
      return result.results || [];
    } catch (error) {
      console.error('[ShiftTime] 獲取工班列表失敗:', error);
      return [];
    }
  }

  /**
   * 查詢特定案場的工班
   */
  async getShiftTimeBySiteId(siteId) {
    try {
      const result = await this.db.prepare(`
        SELECT shift_time_name
        FROM site_shift_mapping
        WHERE site_id = ?
      `).bind(siteId).first();
      
      return result?.shift_time_name || null;
    } catch (error) {
      console.error(`[ShiftTime] 查詢案場 ${siteId} 工班失敗:`, error);
      return null;
    }
  }

  /**
   * 查詢特定案場的工班（按名稱）
   */
  async getShiftTimeBySiteName(siteName) {
    try {
      const result = await this.db.prepare(`
        SELECT shift_time_name
        FROM site_shift_mapping
        WHERE site_name = ?
      `).bind(siteName).first();
      
      return result?.shift_time_name || null;
    } catch (error) {
      console.error(`[ShiftTime] 查詢案場 ${siteName} 工班失敗:`, error);
      return null;
    }
  }

  /**
   * 生成工班統計報告
   */
  async generateShiftTimeReport() {
    const report = {
      timestamp: new Date().toISOString(),
      statistics: {}
    };
    
    try {
      // 總統計
      const totalStats = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_sites,
          COUNT(DISTINCT shift_time_name) as unique_shifts,
          COUNT(CASE WHEN shift_time_name IS NOT NULL THEN 1 END) as sites_with_shift
        FROM site_shift_mapping
      `).first();
      
      report.statistics = totalStats;
      
      // 各工班詳情
      const shifts = await this.getUniqueShifts();
      report.shifts = shifts;
      
      console.log('[ShiftTime] 報告生成完成:', JSON.stringify(report, null, 2));
      return report;
      
    } catch (error) {
      console.error('[ShiftTime] 生成報告失敗:', error);
      report.error = error.message;
      return report;
    }
  }
}

module.exports = ShiftTimeHandler;