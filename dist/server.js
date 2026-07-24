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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
const engine_1 = require("./engine");
const scheduler_1 = require("./scheduler");

const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;

app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));

// Fast keep-alive endpoint for UptimeRobot / Cron pings
app.get('/ping', (req, res) => {
    res.status(200).send('PONG');
});

// Fetch all registered lotteries
app.get('/api/lotteries', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.pool.query('SELECT * FROM lotteries ORDER BY id ASC');
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch lotteries' });
    }
}));

// Analytics engine endpoint
app.get('/api/lottery/:id/analytics', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lotteryId = parseInt(req.params.id, 10);
        const lotRes = yield database_1.pool.query('SELECT * FROM lotteries WHERE id = $1', [lotteryId]);
        if (lotRes.rows.length === 0)
            return res.status(404).json({ error: 'Lottery not found' });
        const lottery = lotRes.rows[0];
        const historyRes = yield database_1.pool.query('SELECT * FROM draw_results WHERE lottery_id = $1 ORDER BY draw_date DESC LIMIT 100', [lotteryId]);
        const history = historyRes.rows;
        const engine = new engine_1.AnalyticsEngine(lottery, history);
        res.json({
            lottery,
            trends: engine.analyzeTrends(),
            heatmap: engine.calculateHeatmap(),
            predictions: {
                mostLikely: engine.predictPureProbabilistic(),
                balancedMix: engine.predictMixedRandom()
            },
            recentDraws: history.slice(0, 10)
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Analytics calculation failed' });
    }
}));

// Validation memory logs endpoint
app.get('/api/lottery/:id/memory', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lotteryId = parseInt(req.params.id, 10);
        const memoryRes = yield database_1.pool.query(`
      SELECT p.*, d.winning_numbers as actual_winning, d.bonus_numbers as actual_bonus
      FROM predictions p
      LEFT JOIN draw_results d ON p.lottery_id = d.lottery_id AND p.target_draw_date = d.draw_date
      WHERE p.lottery_id = $1
      ORDER BY p.prediction_date DESC LIMIT 50
    `, [lotteryId]);
        const validated = memoryRes.rows.filter(r => r.is_validated);
        const avgAccuracy = validated.length > 0
            ? validated.reduce((acc, curr) => acc + parseFloat(curr.success_rate_percent), 0) / validated.length
            : 0;
        res.json({
            history: memoryRes.rows,
            overallAccuracyPercent: avgAccuracy.toFixed(2)
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch memory logs' });
    }
}));

// Start Database, Scheduler, Server, and Keep-Alive Self-Ping Loop
(0, database_1.initializeDatabase)().then(() => {
    const scheduler = new scheduler_1.BackgroundScheduler();
    scheduler.start();
    app.listen(PORT, () => {
        console.log(`🚀 Global Lottery Platform live at http://localhost:${PORT}`);

        // Self-ping every 10 minutes to prevent Render free-tier sleep
        const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${BACKEND_URL}/ping`);
                console.log(`📡 Keep-alive self-ping status: ${response.status} OK`);
            }
            catch (err) {
                console.error('⚠️ Keep-alive self-ping failed:', err.message);
            }
        }), 10 * 60 * 1000);
    });
});
