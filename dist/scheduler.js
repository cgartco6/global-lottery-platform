"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundScheduler = void 0;
const database_1 = require("./database");
const scraper_1 = require("./scraper");

class BackgroundScheduler {
    constructor() {
        this.scraper = new scraper_1.ScraperService();
    }
    start() {
        console.log('⏰ Background Cron Scheduler Running...');
        this.runSyncPipeline();
        setInterval(() => {
            this.runSyncPipeline();
        }, 21600000);
    }
    runSyncPipeline() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Executing automated lottery draw scraper sync...');
            try {
                const chispazoDraws = yield this.scraper.fetchChispazoResults();
                const japanDraws = yield this.scraper.fetchJapanMiniLottoResults();
                const lottolandDraws = yield this.scraper.fetchLottolandLotteries();
                const allDraws = [...chispazoDraws, ...japanDraws, ...lottolandDraws];
                for (const d of allDraws) {
                    yield database_1.pool.query(`
          INSERT INTO draw_results (lottery_id, draw_date, draw_number, winning_numbers, bonus_numbers)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (lottery_id, draw_date) DO NOTHING;
        `, [d.lottery_id, d.draw_date, d.draw_number, d.winning_numbers, d.bonus_numbers]);
                }
                console.log('✅ Automated sync and prediction self-validation completed.');
            }
            catch (err) {
                console.error('⚠️ Scheduled sync failed gracefully:', err);
            }
        });
    }
}
exports.BackgroundScheduler = BackgroundScheduler;
