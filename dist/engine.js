"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEngine = void 0;

class AnalyticsEngine {
    constructor(lottery, history) {
        this.lottery = lottery;
        this.history = history;
    }
    analyzeTrends() {
        const counts = {};
        for (let i = 1; i <= this.lottery.main_numbers_count; i++)
            counts[i] = 0;
        let totalSum = 0;
        let totalEven = 0;
        let totalBalls = 0;
        this.history.forEach((draw) => {
            draw.winning_numbers.forEach((num) => {
                counts[num] = (counts[num] || 0) + 1;
                totalSum += num;
                if (num % 2 === 0)
                    totalEven++;
                totalBalls++;
            });
        });
        const sorted = Object.entries(counts)
            .map(([num, count]) => ({ number: parseInt(num, 10), count }))
            .sort((a, b) => b.count - a.count);
        const evenPct = Math.round((totalEven / (totalBalls || 1)) * 100);
        return {
            hotNumbers: sorted.slice(0, 5),
            coldNumbers: sorted.slice(-5).reverse(),
            dueNumbers: sorted.slice(-3).map((item) => item.number),
            evenOddRatio: `${evenPct}% Even / ${100 - evenPct}% Odd`,
            averageSum: Math.round(totalSum / (this.history.length || 1))
        };
    }
    calculateHeatmap() {
        const counts = {};
        for (let i = 1; i <= this.lottery.main_numbers_count; i++)
            counts[i] = 0;
        this.history.forEach((draw) => {
            draw.winning_numbers.forEach((num) => {
                counts[num] = (counts[num] || 0) + 1;
            });
        });
        const maxCount = Math.max(...Object.values(counts), 1);
        const matrix = Object.entries(counts).map(([num, count]) => ({
            number: parseInt(num, 10),
            frequency: count,
            intensityPercent: Math.round((count / maxCount) * 100)
        }));
        return { matrix };
    }
    predictPureProbabilistic() {
        const trends = this.analyzeTrends();
        const candidates = trends.hotNumbers.map((h) => h.number).concat(trends.dueNumbers);
        return Array.from(new Set(candidates)).slice(0, this.lottery.pick_count).sort((a, b) => a - b);
    }
    predictMixedRandom() {
        const pool = Array.from({ length: this.lottery.main_numbers_count }, (_, i) => i + 1);
        return pool.sort(() => 0.5 - Math.random()).slice(0, this.lottery.pick_count).sort((a, b) => a - b);
    }
}
exports.AnalyticsEngine = AnalyticsEngine;
