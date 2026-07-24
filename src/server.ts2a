import express, { Request, Response } from 'express';
import path from 'path';
import { pool, initializeDatabase, Lottery, DrawResult } from './database';
import { AnalyticsEngine } from './engine';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 1. Get all lotteries and machine info
app.get('/api/lotteries', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM lotteries ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lotteries' });
  }
});

// 2. Get Analytics, Heatmaps & Predictions for a specific lottery
app.get('/api/lottery/:id/analytics', async (req: Request, res: Response) => {
  try {
    const lotteryId = parseInt(req.params.id, 10);
    
    // Fetch lottery config
    const lotRes = await pool.query('SELECT * FROM lotteries WHERE id = $1', [lotteryId]);
    if (lotRes.rows.length === 0) return res.status(404).json({ error: 'Lottery not found' });
    const lottery: Lottery = lotRes.rows[0];

    // Fetch draw history
    const historyRes = await pool.query(
      'SELECT * FROM draw_results WHERE lottery_id = $1 ORDER BY draw_date DESC LIMIT 100',
      [lotteryId]
    );
    const history: DrawResult[] = historyRes.rows;

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

// 3. Get Prediction Memory & Self-Validation Performance History
app.get('/api/lottery/:id/memory', async (req: Request, res: Response) => {
  try {
    const lotteryId = parseInt(req.params.id, 10);
    const memoryRes = await pool.query(`
      SELECT p.*, d.winning_numbers as actual_winning, d.bonus_numbers as actual_bonus
      FROM predictions p
      LEFT JOIN draw_results d ON p.lottery_id = d.lottery_id AND p.target_draw_date = d.draw_date
      WHERE p.lottery_id = $1
      ORDER BY p.prediction_date DESC LIMIT 50
    `, [lotteryId]);

    // Calculate aggregate accuracy stats
    const validated = memoryRes.rows.filter(r => r.is_validated);
    const avgAccuracy = validated.length > 0
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

// Start Server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Global Lottery Platform live at http://localhost:${PORT}`);
  });
});
