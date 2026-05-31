import { describe, it, expect } from 'vitest';
import { RevenueOptimizer } from '@main/services/RevenueOptimizer';
import type { MorphedApp } from '@main/services/TemplateMorphEngine';

const baseMorphedApp: MorphedApp = {
  files: {
    'src/App.tsx': 'export const App = () => <div>FitTrack Pro</div>;',
    'src/styles/fitness-theme.css': ':root { --color-primary: #22c55e; }',
  },
  components: ['FitnessHeader', 'SubscriptionGate', 'Auth'],
  changeLog: ['src/App.tsx: replaced niche placeholders for "fitness"'],
};

describe('RevenueOptimizer', () => {
  const optimizer = new RevenueOptimizer();

  it('returns exactly 3 strategies', () => {
    const strategies = optimizer.suggest(baseMorphedApp);
    expect(strategies).toHaveLength(3);
  });

  it('each strategy has required fields', () => {
    const strategies = optimizer.suggest(baseMorphedApp);
    for (const s of strategies) {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.estimatedMonthlyRevenue).toMatch(/\$\d/);
      expect(['low', 'medium', 'high']).toContain(s.implementationEffort);
    }
  });

  it('subscription ranks high for a fitness app with SubscriptionGate', () => {
    const strategies = optimizer.suggest(baseMorphedApp);
    expect(strategies[0].name).toBe('Subscription (SaaS)');
  });

  it('ad-focused app surfaces advertising strategy', () => {
    const adApp: MorphedApp = {
      files: { 'src/App.tsx': 'AdBanner feed entertainment news' },
      components: ['AdBanner', 'Feed'],
      changeLog: ['injected ads monetization component'],
    };
    const strategies = optimizer.suggest(adApp);
    const names = strategies.map((s) => s.name);
    expect(names).toContain('In-App Advertising');
  });

  it('enterprise keywords surface B2B strategy', () => {
    const b2bApp: MorphedApp = {
      files: { 'src/dashboard.tsx': 'enterprise api admin report analytics' },
      components: ['AdminDashboard', 'AnalyticsReport'],
      changeLog: [],
    };
    const strategies = optimizer.suggest(b2bApp);
    const names = strategies.map((s) => s.name);
    expect(names).toContain('B2B / White-Label Licensing');
  });
});
