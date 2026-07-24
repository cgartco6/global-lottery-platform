import express, { Request, Response } from 'express';
import path from 'path';
import { initializeDatabase, pool } from './database';
import { AnalyticsEngine } from './engine';
import { BackgroundScheduler } from './scheduler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Fast keep-alive endpoint for UptimeRobot / Cron pings
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).send('PONG');
});

// Fetch all registered lotteries
app.get('/api/lotteries', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM lotteries ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lotteries' });
  }
});

// Analytics engine endpoint
app.get('/api/lottery/:id/analytics', async (req: Request, res: Response) => {
  try {
    const lotteryId = parseInt(req.params.id, 10);
    const lotRes = await pool.query('SELECT * FROM lotteries WHERE id = $1', [lotteryId]);

    if (lotRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lottery not found' });
    }

    const lottery = lotRes.rows[0];
    const historyRes = await pool.query(
      'SELECT * FROM draw_results WHERE lottery_id = $1 ORDER BY draw_date DESC LIMIT 100',
      [lotteryId]
    );
    const history = historyRes.rows;

    const engine = new AnalyticsEngine(lottery, history);

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
  } catch (err) {
    res.status(500).json({ error: 'Analytics calculation failed' });
  }
});

// Validation memory logs endpoint
app.get('/api/lottery/:id/memory', async (req: Request, res: Response) => {
  try {
    const lotteryId = parseInt(req.params.id, 10);
    const memoryRes = await pool.query(
      `SELECT p.*, d.winning_numbers as actual_winning, d.bonus_numbers as actual_bonus
       FROM predictions p
       LEFT JOIN draw_results d ON p.lottery_id = d.lottery_id AND p.target_draw_date = d.draw_date
       WHERE p.lottery_id = $1
       ORDER BY p.prediction_date DESC LIMIT 50`,
      [lotteryId]
    );

    const validated = memoryRes.rows.filter((r) => r.is_validated);
    const avgAccuracy =
      validated.length > 0
        ? validated.reduce((acc, curr) => acc + parseFloat(curr.success_rate_percent), 0) / validated.length
        : 0;

    res.json({
      history: memoryRes.rows,
      overallAccuracyPercent: avgAccuracy.toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memory logs' });
  }
});

// Start Database, Scheduler, Server, and Keep-Alive Self-Ping Loop
initializeDatabase().then(() => {
  const scheduler = new BackgroundScheduler();
  scheduler.start();

  app.listen(PORT, () => {
    console.log(`🚀 Global Lottery Platform live at http://localhost:${PORT}`);

    // Self-ping every 10 minutes to prevent Render free-tier sleep
    const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/ping`);
        console.log(`📡 Keep-alive self-ping status: ${response.status} OK`);
      } catch (err: any) {
        console.error('⚠️ Keep-alive self-ping failed:', err.message);
      }
    }, 10 * 60 * 1000);
  });
});
