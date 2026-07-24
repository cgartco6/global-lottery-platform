import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Lottery {
  id: number;
  name: string;
  country: string;
  main_pool_size: number;
  main_balls_drawn: number;
  bonus_pool_size: number;
  bonus_balls_drawn: number;
  odds_to_win_jackpot: number;
  machine_name: string;
}

export interface DrawResult {
  id?: number;
  lottery_id: number;
  draw_date: Date;
  draw_number: string;
  winning_numbers: number[];
  bonus_numbers: number[];
}

export interface Prediction {
  id?: number;
  lottery_id: number;
  prediction_date?: Date;
  predicted_type: 'pure_probabilistic' | 'mixed_random';
  predicted_numbers: number[];
  predicted_bonus: number[];
  target_draw_date: Date;
  is_validated: boolean;
  match_count: number;
  bonus_match_count: number;
  success_rate_percent: number;
}

export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Create Config Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lotteries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        country VARCHAR(50) NOT NULL,
        main_pool_size INT NOT NULL,
        main_balls_drawn INT NOT NULL,
        bonus_pool_size INT DEFAULT 0,
        bonus_balls_drawn INT DEFAULT 0,
        odds_to_win_jackpot INT NOT NULL,
        machine_name VARCHAR(100) DEFAULT 'Unknown'
      );
    `);

    // 2. Create Real Draws Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS draw_results (
        id SERIAL PRIMARY KEY,
        lottery_id INT REFERENCES lotteries(id) ON DELETE CASCADE,
        draw_date DATE NOT NULL,
        draw_number VARCHAR(50),
        winning_numbers INT[] NOT NULL,
        bonus_numbers INT[],
        UNIQUE(lottery_id, draw_date)
      );
    `);

    // 3. Create Prediction Log & Memory Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        lottery_id INT REFERENCES lotteries(id) ON DELETE CASCADE,
        prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        predicted_type VARCHAR(50) NOT NULL,
        predicted_numbers INT[] NOT NULL,
        predicted_bonus INT[],
        target_draw_date DATE NOT NULL,
        is_validated BOOLEAN DEFAULT FALSE,
        match_count INT DEFAULT 0,
        bonus_match_count INT DEFAULT 0,
        success_rate_percent NUMERIC(5,2) DEFAULT 0.00
      );
    `);

    // Seed default Lottoland & added lotteries
    await seedLotteries(client);

    console.log('Database schemas validated successfully.');
  } catch (err) {
    console.error('Error establishing database structures:', err);
  } finally {
    client.release();
  }
}

async function seedLotteries(client: any): Promise<void> {
  const defaultLotteries = [
    {
      name: 'Chispazo',
      country: 'Mexico',
      main_pool_size: 28,
      main_balls_drawn: 5,
      bonus_pool_size: 0,
      bonus_balls_drawn: 0,
      odds_to_win_jackpot: 98280,
      machine_name: 'Smartplay Halogen II'
    },
    {
      name: 'Japan Mini Lotto',
      country: 'Japan',
      main_pool_size: 31,
      main_balls_drawn: 5,
      bonus_pool_size: 31, // Bonus selected from remaining numbers
      bonus_balls_drawn: 1,
      odds_to_win_jackpot: 169911,
      machine_name: 'Yume-Loto-Kun'
    },
    {
      name: 'US Powerball',
      country: 'USA',
      main_pool_size: 69,
      main_balls_drawn: 5,
      bonus_pool_size: 26,
      bonus_balls_drawn: 1,
      odds_to_win_jackpot: 292201338,
      machine_name: 'Smartplay Halogen S'
    },
    {
      name: 'EuroMillions',
      country: 'Europe',
      main_pool_size: 50,
      main_balls_drawn: 5,
      bonus_pool_size: 12,
      bonus_balls_drawn: 2,
      odds_to_win_jackpot: 139838160,
      machine_name: 'Stresa'
    }
  ];

  for (const item of defaultLotteries) {
    await client.query(`
      INSERT INTO lotteries (name, country, main_pool_size, main_balls_drawn, bonus_pool_size, bonus_balls_drawn, odds_to_win_jackpot, machine_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (name) DO UPDATE SET
        machine_name = EXCLUDED.machine_name,
        odds_to_win_jackpot = EXCLUDED.odds_to_win_jackpot;
    `, [item.name, item.country, item.main_pool_size, item.main_balls_drawn, item.bonus_pool_size, item.bonus_balls_drawn, item.odds_to_win_jackpot, item.machine_name]);
  }
}
