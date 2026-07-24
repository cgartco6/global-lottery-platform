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
exports.initializeDatabase = exports.pool = void 0;
const pg_1 = require("pg");

exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lottery_db'
});

function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield exports.pool.connect();
        try {
            yield client.query(`
      CREATE TABLE IF NOT EXISTS lotteries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        country VARCHAR(50) NOT NULL,
        main_numbers_count INT NOT NULL,
        pick_count INT NOT NULL,
        bonus_numbers_count INT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS draw_results (
        id SERIAL PRIMARY KEY,
        lottery_id INT REFERENCES lotteries(id) ON DELETE CASCADE,
        draw_date DATE NOT NULL,
        draw_number VARCHAR(50) NOT NULL,
        winning_numbers INT[] NOT NULL,
        bonus_numbers INT[] DEFAULT '{}',
        UNIQUE(lottery_id, draw_date)
      );

      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        lottery_id INT REFERENCES lotteries(id) ON DELETE CASCADE,
        prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        target_draw_date DATE NOT NULL,
        predicted_numbers INT[] NOT NULL,
        model_type VARCHAR(50) NOT NULL,
        is_validated BOOLEAN DEFAULT FALSE,
        success_rate_percent NUMERIC(5,2) DEFAULT 0.00
      );
    `);
            yield client.query(`
      INSERT INTO lotteries (id, name, country, main_numbers_count, pick_count, bonus_numbers_count)
      VALUES 
        (1, 'Chispazo', 'Mexico', 28, 5, 0),
        (2, 'Japan Mini Lotto', 'Japan', 31, 5, 1),
        (3, 'EuroMillions', 'Europe', 50, 5, 2),
        (4, 'Powerball', 'USA', 69, 5, 1)
      ON CONFLICT (id) DO NOTHING;
    `);
            console.log('✅ PostgreSQL Schema initialized and lotteries seeded successfully.');
        }
        finally {
            client.release();
        }
    });
}
exports.initializeDatabase = initializeDatabase;
