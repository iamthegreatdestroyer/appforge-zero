/**
 * RevenueOptimizer — Sprint 3
 *
 * Rule-based engine: given a MorphedApp, returns top 3 monetization strategies
 * with estimated monthly revenue ranges and implementation effort scores.
 * No external API calls.
 */

import type { MorphedApp } from './TemplateMorphEngine';

export interface RevenueStrategy {
  name: string;
  description: string;
  estimatedMonthlyRevenue: string; // e.g. "$500–$2,000"
  implementationEffort: 'low' | 'medium' | 'high';
}

// ─── Strategy definitions ─────────────────────────────────────────────────────

interface StrategyDef extends RevenueStrategy {
  keywords: string[]; // component/file keywords that boost this strategy's score
  baseScore: number;
}

const STRATEGY_CATALOG: StrategyDef[] = [
  {
    name: 'Subscription (SaaS)',
    description:
      'Charge a recurring monthly or annual fee. Works best when the app delivers ongoing value (data, content, coaching).',
    estimatedMonthlyRevenue: '$1,000–$10,000',
    implementationEffort: 'medium',
    keywords: ['subscription', 'SubscriptionGate', 'auth', 'dashboard', 'analytics', 'fitness', 'finance'],
    baseScore: 70,
  },
  {
    name: 'Freemium Upsell',
    description:
      'Free tier drives acquisition; premium tier unlocks advanced features. Low barrier to entry, strong viral growth.',
    estimatedMonthlyRevenue: '$500–$5,000',
    implementationEffort: 'medium',
    keywords: ['FreemiumUpgrade', 'plan', 'tier', 'upgrade', 'premium', 'education'],
    baseScore: 65,
  },
  {
    name: 'One-Time Purchase',
    description:
      'Single payment for lifetime access. Low support overhead. Ideal for utility apps with high perceived value.',
    estimatedMonthlyRevenue: '$300–$3,000',
    implementationEffort: 'low',
    keywords: ['PurchasePrompt', 'buy', 'license', 'utility', 'tool', 'widget'],
    baseScore: 60,
  },
  {
    name: 'In-App Advertising',
    description:
      'Monetize with display ads (Google AdMob). Works best for high-volume, free apps with strong daily active users.',
    estimatedMonthlyRevenue: '$100–$2,000',
    implementationEffort: 'low',
    keywords: ['AdBanner', 'ads', 'feed', 'news', 'entertainment', 'food', 'travel'],
    baseScore: 45,
  },
  {
    name: 'Affiliate / Referral Revenue',
    description:
      'Earn commissions by recommending relevant products or services within context (gear, courses, financial products).',
    estimatedMonthlyRevenue: '$200–$4,000',
    implementationEffort: 'low',
    keywords: ['affiliate', 'recommend', 'fitness', 'travel', 'food', 'finance'],
    baseScore: 50,
  },
  {
    name: 'B2B / White-Label Licensing',
    description:
      'License the app to businesses who rebrand it for their own customers. High ACV, low volume.',
    estimatedMonthlyRevenue: '$2,000–$20,000',
    implementationEffort: 'high',
    keywords: ['enterprise', 'api', 'admin', 'dashboard', 'analytics', 'report'],
    baseScore: 55,
  },
];

// ─── Optimizer ────────────────────────────────────────────────────────────────

export class RevenueOptimizer {
  /**
   * Returns the top 3 monetization strategies ranked by relevance to the morphed app.
   */
  suggest(app: MorphedApp): RevenueStrategy[] {
    const contentSignal = this.buildContentSignal(app);

    const scored = STRATEGY_CATALOG.map((strategy) => {
      let score = strategy.baseScore;
      for (const keyword of strategy.keywords) {
        if (contentSignal.includes(keyword.toLowerCase())) {
          score += 12;
        }
      }
      return { strategy, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map(({ strategy }) => ({
      name: strategy.name,
      description: strategy.description,
      estimatedMonthlyRevenue: strategy.estimatedMonthlyRevenue,
      implementationEffort: strategy.implementationEffort,
    }));
  }

  private buildContentSignal(app: MorphedApp): string {
    const parts: string[] = [
      ...app.components,
      ...app.changeLog,
      ...Object.keys(app.files),
      ...Object.values(app.files).slice(0, 5), // first few file contents
    ];
    return parts.join(' ').toLowerCase();
  }
}

export default new RevenueOptimizer();
