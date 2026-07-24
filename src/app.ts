import { initializeDatabase, pool, Lottery, DrawResult, Prediction } from './database';
import { AnalyticsEngine } from './engine';
import { ScraperService } from './scraper';

async function main() {
  console.log('--- Starting Global Lottery Analytics Platform CLI ---');
  
  // 1. Initialize Tables
  await initializeDatabase();

  const scraper = new ScraperService();

  // 2. Load Configured Lotteries
  const res = await pool.query('SELECT * FROM lotteries');
  const lotteries: Lottery[] = res.rows;

  console.log(`Ingested ${lotteries.length} supported global game configurations.`);

  // 3. Process Live Data Feeds and Run Analytics Pipeline
  for (const game of lotteries) {
    console.log(`\n=============================================`);
    console.log(`PROCESSING PIPELINE FOR: ${game.name.toUpperCase()} (${game.country})`);
    console.log(`Official Drawing Machine Unit: ${game.machine_name}`);
    console.log(`Mathematical Odds: 1 in ${game.odds_to_win_jackpot.toLocaleString()}`);
    console.log(`=============================================`);

    let history: DrawResult[] = [];

    if (game.name === 'Chispazo') {
      history = await scraper.fetchChispazoResults();
    } else if (game.name === 'Japan Mini Lotto') {
      history = await scraper.fetchJapanMiniLottoResults();
    } else {
      history = await scraper.fetchLottolandLotteries();
    }

    console.log(`Loaded ${history.length} recent draw history points.`);

    // Persist real histories to active database cleanly
    for (const d of history) {
      await pool.query(`
        INSERT INTO draw_results (lottery_id, draw_date, draw_number, winning_numbers, bonus_numbers)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (lottery_id, draw_date) DO NOTHING;
      `, [d.lottery_id, d.draw_date, d.draw_number, d.winning_numbers, d.bonus_numbers]);
    }

    const engine = new AnalyticsEngine(game, history);

    // Compute distribution groups and display heatmap metrics
    const trends = engine.analyzeTrends();
    const heatmap = engine.calculateHeatmap();
    const hotNumbers = heatmap.filter(h => h.status === 'HOT').map(h => h.number);
    const coldNumbers = heatmap.filter(h => h.status === 'COLD').map(h => h.number);
    const overdueNumbers = heatmap.filter(h => h.status === 'OVERDUE').map(h => h.number);

    console.log(`Main Number Groups Profile:`, JSON.stringify(trends.mainGroups));
    console.log(`Bonus Split [Above / Below]:`, JSON.stringify(trends.bonusGroups));
    console.log(`Hot Numbers Pool (>${(game.main_pool_size * 0.1).toFixed(1)} Avg Draw Frequency):`, hotNumbers.join(', ') || 'None');
    console.log(`Cold Numbers Pool:`, coldNumbers.join(', ') || 'None');
    console.log(`Overdue Numbers Pool (Gap in Draws):`, overdueNumbers.join(', ') || 'None');

    // Run Predictive Engine Implementations
    const predA = engine.predictPureProbabilistic();
    const predB = engine.predictMixedRandom();

    console.log(`\n🔮 Predictive Engine Picks:`);
    console.log(`   Engine A (Most Likely Probable): [${predA.numbers.join(', ')}]` + (predA.bonus.length ? ` | Bonus: [${predA.bonus.join(', ')}]` : ''));
    console.log(`   Engine B (Balanced Random Mix):  [${predB.numbers.join(', ')}]` + (predB.bonus.length ? ` | Bonus: [${predB.bonus.join(', ')}]` : ''));

    // Record targets in Memory Table
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1); // target next draw

    await pool.query(`
      INSERT INTO predictions (lottery_id, predicted_type, predicted_numbers, predicted_bonus, target_draw_date)
      VALUES ($1, $2, $3, $4, $5), ($1, $6, $7, $8, $5);
    `, [
      game.id, 'pure_probabilistic', predA.numbers, predA.bonus, targetDate,
      'mixed_random', predB.numbers, predB.bonus
    ]);

    // 4. Memory Self-Validation & Verification Phase
    await runSelfValidation(game.id, history[0]);
  }

  // Gracefully terminate connection pools
  await pool.end();
  console.log('\nPipeline processing concluded cleanly.');
}

async function runSelfValidation(lotteryId: number, latestDraw: DrawResult) {
  if (!latestDraw) return;

  // Pull predictions targeting this draw date and match them
  const res = await pool.query(`
    SELECT * FROM predictions
    WHERE lottery_id = $1 AND is_validated = FALSE
  `, [lotteryId]);

  const unvalidated: Prediction[] = res.rows;
  if (unvalidated.length === 0) return;

  console.log(`\n⚖️ Run ML Validation Checks against Draw Result: [${latestDraw.winning_numbers.join(', ')}]`);

  for (const pred of unvalidated) {
    // Check main number matches
    const mainMatches = pred.predicted_numbers.filter(n => latestDraw.winning_numbers.includes(n)).length;
    
    // Check bonus matches
    const bonusMatches = pred.predicted_bonus.filter(n => latestDraw.bonus_numbers.includes(n)).length;

    // Evaluate accuracy success rates relative to the target sizes
    const totalTargetBalls = pred.predicted_numbers.length + pred.predicted_bonus.length;
    const totalMatched = mainMatches + bonusMatches;
    const successRate = totalTargetBalls > 0 ? (totalMatched / totalTargetBalls) * 100 : 0.0;

    // Update historical logs in active Memory table
    await pool.query(`
      UPDATE predictions
      SET is_validated = TRUE,
          match_count = $1,
          bonus_match_count = $2,
          success_rate_percent = $3
      WHERE id = $4;
    `, [mainMatches, bonusMatches, successRate.toFixed(2), pred.id]);

    console.log(`   └─ [Engine: ${pred.predicted_type}] Matched Balls: ${mainMatches} Main, ${bonusMatches} Bonus. Success Rate: ${successRate.toFixed(1)}%`);
  }
}

main().catch(err => {
  console.error('Fatal platform failure encountered:', err);
  pool.end();
});
