import { DrawResult, Lottery } from './database';

export interface GroupStats {
  mainGroups: { [groupNumber: number]: number };
  bonusGroups: { above: number; below: number };
}

export interface NumberHeatmap {
  number: number;
  drawCount: number;
  lastDrawnDaysAgo: number;
  status: 'HOT' | 'COLD' | 'OVERDUE' | 'NEUTRAL';
}

export class AnalyticsEngine {
  private config: Lottery;
  private history: DrawResult[];

  constructor(config: Lottery, history: DrawResult[]) {
    this.config = config;
    this.history = history;
  }

  // Segment main pool into 3 or 4 uniform groups
  public getMainGroups(num: number): number {
    const totalNumbers = this.config.main_pool_size;
    const groupCount = totalNumbers <= 35 ? 3 : 4;
    const size = Math.ceil(totalNumbers / groupCount);
    const calculatedGroup = Math.ceil(num / size);
    return Math.min(calculatedGroup, groupCount);
  }

  // Segment bonus balls into simple above & below (high & low) sets
  public getBonusSplit(num: number): 'BELOW' | 'ABOVE' {
    const totalBonus = this.config.bonus_pool_size;
    const boundary = Math.ceil(totalBonus / 2);
    return num <= boundary ? 'BELOW' : 'ABOVE';
  }

  // Generate complete distribution, groups, and trends analytics
  public analyzeTrends(): GroupStats {
    const stats: GroupStats = {
      mainGroups: { 1: 0, 2: 0, 3: 0, 4: 0 },
      bonusGroups: { above: 0, below: 0 }
    };

    for (const draw of this.history) {
      for (const num of draw.winning_numbers) {
        const grp = this.getMainGroups(num);
        stats.mainGroups[grp] = (stats.mainGroups[grp] || 0) + 1;
      }
      for (const bNum of draw.bonus_numbers) {
        const spl = this.getBonusSplit(bNum);
        if (spl === 'ABOVE') stats.bonusGroups.above++;
        else stats.bonusGroups.below++;
      }
    }
    return stats;
  }

  // Construct precise Hot/Cold/Overdue heatmaps
  public calculateHeatmap(): NumberHeatmap[] {
    const totalDraws = this.history.length;
    const frequencies: { [key: number]: number } = {};
    const lastSeenIndex: { [key: number]: number } = {};

    for (let i = 1; i <= this.config.main_pool_size; i++) {
      frequencies[i] = 0;
      lastSeenIndex[i] = totalDraws; // Initialize with max distance
    }

    this.history.sort((a, b) => b.draw_date.getTime() - a.draw_date.getTime());

    for (let i = 0; i < this.history.length; i++) {
      const draw = this.history[i];
      for (const num of draw.winning_numbers) {
        frequencies[num]++;
        if (lastSeenIndex[num] === totalDraws) {
          lastSeenIndex[num] = i; // Distance from latest draw
        }
      }
    }

    const output: NumberHeatmap[] = [];
    const drawCounts = Object.values(frequencies);
    const avgDraws = drawCounts.reduce((a, b) => a + b, 0) / (this.config.main_pool_size || 1);

    for (let i = 1; i <= this.config.main_pool_size; i++) {
      const freq = frequencies[i];
      const gap = lastSeenIndex[i];
      let status: 'HOT' | 'COLD' | 'OVERDUE' | 'NEUTRAL' = 'NEUTRAL';

      if (freq > avgDraws * 1.15) {
        status = 'HOT';
      } else if (freq < avgDraws * 0.85) {
        status = 'COLD';
      } else if (gap > totalDraws * 0.4 && freq > 0) {
        status = 'OVERDUE';
      }

      output.push({
        number: i,
        drawCount: freq,
        lastDrawnDaysAgo: gap,
        status
      });
    }

    return output;
  }

  // Engine A: Maximum Probability (Most Likely Numbers)
  public predictPureProbabilistic(): { numbers: number[]; bonus: number[] } {
    const heatmaps = this.calculateHeatmap();
    // Sort descending by highest draw frequency (primary) and hotness
    const sorted = [...heatmaps].sort((a, b) => b.drawCount - a.drawCount);
    
    const numbers = sorted.slice(0, this.config.main_balls_drawn).map(h => h.number).sort((a, b) => a - b);
    const bonus: number[] = [];

    if (this.config.bonus_balls_drawn > 0) {
      // Basic split balance matching historic bias
      const stats = this.analyzeTrends();
      const preferredSplit = stats.bonusGroups.above >= stats.bonusGroups.below ? 'ABOVE' : 'BELOW';
      const halfSize = Math.ceil(this.config.bonus_pool_size / 2);
      
      for (let i = 0; i < this.config.bonus_balls_drawn; i++) {
        const candidate = preferredSplit === 'ABOVE' 
          ? halfSize + 1 + Math.floor(Math.random() * (this.config.bonus_pool_size - halfSize))
          : 1 + Math.floor(Math.random() * halfSize);
        bonus.push(candidate);
      }
    }

    return { numbers, bonus };
  }

  // Engine B: Balanced Hybrid Mix (60% Most Probable, 40% Underdog/Overdue/Random)
  public predictMixedRandom(): { numbers: number[]; bonus: number[] } {
    const heatmaps = this.calculateHeatmap();
    const sorted = [...heatmaps].sort((a, b) => b.drawCount - a.drawCount);

    const likelyCount = Math.ceil(this.config.main_balls_drawn * 0.6);
    const remainingCount = this.config.main_balls_drawn - likelyCount;

    const likelyPicks = sorted.slice(0, likelyCount).map(h => h.number);
    const poolRemaining = sorted.slice(likelyCount).map(h => h.number);

    // Shuffle array cleanly
    for (let i = poolRemaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolRemaining[i], poolRemaining[j]] = [poolRemaining[j], poolRemaining[i]];
    }

    const numbers = [...likelyPicks, ...poolRemaining.slice(0, remainingCount)].sort((a, b) => a - b);
    const bonus: number[] = [];

    for (let i = 0; i < this.config.bonus_balls_drawn; i++) {
      bonus.push(Math.floor(Math.random() * this.config.bonus_pool_size) + 1);
    }

    return { numbers, bonus: bonus.sort((a, b) => a - b) };
  }
}
