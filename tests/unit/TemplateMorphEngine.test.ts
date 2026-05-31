import { describe, it, expect } from 'vitest';
import { TemplateMorphEngine, AppTemplate, MorphProfile } from '@main/services/TemplateMorphEngine';

const saasTemplate: AppTemplate = {
  name: 'SaaS Base',
  files: {
    'src/App.tsx': `
import React from 'react';
export const App = () => (
  <div>
    <h1>{{APP_NAME}}</h1>
    <p>{{HERO_TEXT}}</p>
    <button>{{PRIMARY_CTA}}</button>
  </div>
);`,
    'src/components/GenericHeader.tsx': `export const GenericHeader = () => <header>{{APP_NAME}}</header>;`,
    'src/styles/main.css': `body { color: {{ACCENT_COLOR}}; }`,
  },
  components: ['GenericHeader', 'GenericFooter', 'Auth'],
  styles: { 'src/styles/main.css': `body { color: {{ACCENT_COLOR}}; }` },
};

const fitnessProfile: MorphProfile = {
  niche: 'fitness',
  audience: 'B2C',
  monetization: 'subscription',
  keepFeatures: ['Auth'],
};

describe('TemplateMorphEngine', () => {
  const engine = new TemplateMorphEngine();

  it('morph() returns a MorphedApp with non-empty files', () => {
    const result = engine.morph(saasTemplate, fitnessProfile);
    expect(Object.keys(result.files).length).toBeGreaterThan(0);
  });

  it('replaces {{APP_NAME}} placeholder with niche app name', () => {
    const result = engine.morph(saasTemplate, fitnessProfile);
    const appFile = result.files['src/App.tsx'];
    expect(appFile).not.toContain('{{APP_NAME}}');
    expect(appFile).toContain('FitTrack Pro');
  });

  it('replaces {{PRIMARY_CTA}} with niche call-to-action', () => {
    const result = engine.morph(saasTemplate, fitnessProfile);
    const appFile = result.files['src/App.tsx'];
    expect(appFile).not.toContain('{{PRIMARY_CTA}}');
    expect(appFile).toContain('Start Your Fitness Journey');
  });

  it('injects subscription monetization component into TSX files', () => {
    const result = engine.morph(saasTemplate, fitnessProfile);
    const appFile = result.files['src/App.tsx'];
    expect(appFile).toContain('SubscriptionGate');
  });

  it('preserves keepFeatures components unchanged', () => {
    const result = engine.morph(saasTemplate, fitnessProfile);
    expect(result.components).toContain('Auth');
  });

  it('generates a non-empty changeLog', () => {
    const result = engine.morph(saasTemplate, fitnessProfile);
    expect(result.changeLog.length).toBeGreaterThan(0);
  });

  it('generates niche theme CSS file', () => {
    const result = engine.morph(saasTemplate, fitnessProfile);
    const themeFile = result.files['src/styles/fitness-theme.css'];
    expect(themeFile).toBeDefined();
    expect(themeFile).toContain('--color-primary');
    expect(themeFile).toContain('#22c55e');
  });

  it('renames Generic* components to niche-prefixed names', () => {
    const result = engine.morph(saasTemplate, fitnessProfile);
    expect(result.components).toContain('FitnessHeader');
    expect(result.components).not.toContain('GenericHeader');
  });

  it('injects ads component when monetization is ads', () => {
    const adsProfile: MorphProfile = { ...fitnessProfile, monetization: 'ads' };
    const result = engine.morph(saasTemplate, adsProfile);
    const appFile = result.files['src/App.tsx'];
    expect(appFile).toContain('AdBanner');
  });

  it('does not inject monetization into keepFeatures files', () => {
    const profile: MorphProfile = { ...fitnessProfile, keepFeatures: ['Auth', 'App'] };
    const result = engine.morph(saasTemplate, profile);
    // App.tsx is in keepFeatures so no injection
    const appFile = result.files['src/App.tsx'];
    expect(appFile).not.toContain('SubscriptionGate');
  });
});
