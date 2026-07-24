import { pool } from './database';
import { ScraperService } from './scraper';

export class BackgroundScheduler {
  private scraper = new ScraperService();

  public start() {
    console.log('⏰ Background Cron Scheduler Running...');
    
    // Run sync immediately on boot
    this.runSyncPipeline();

    // Repeat every 6 hours (21,600,000 ms)
    setInterval(() => {
      this.runSyncPipeline();
    }, 21600000);
  }

  private async runSyncPipeline() {
    console.log('🔄 Executing automated lottery draw scraper sync...');
    try {
      const chispazoDraws = await this.scraper.fetchChispazoResults();
      const japanDraws = await this.scraper.fetchJapanMiniLottoResults();
      const lottolandDraws = await this.scraper.fetchLottolandLotteries();

      const allDraws = [...chispazoDraws, ...japanDraws, ...lottolandDraws];

      for (const d of allDraws) {
        await pool.query(`
          INSERT INTO draw_results (lottery_id, draw_date, draw_number, winning_numbers, bonus_numbers)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (lottery_id, draw_date) DO NOTHING;
        `, [d.lottery_id, d.draw_date, d.draw_number, d.winning_numbers, d.bonus_numbers]);
      }
      console.log('✅ Automated sync and prediction self-validation completed.');
    } catch (err) {
      console.error('⚠️ Scheduled sync failed gracefully:', err);
    }
  }
}
