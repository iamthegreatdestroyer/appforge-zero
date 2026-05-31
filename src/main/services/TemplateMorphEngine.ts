/**
 * TemplateMorphEngine — Sprint 2
 *
 * Transforms an AppTemplate into a MorphedApp based on a MorphProfile.
 * Pure rule-based logic; no external API calls.
 */

// ─── Public interfaces (Sprint 2 spec) ───────────────────────────────────────

export interface AppTemplate {
  name: string;
  files: Record<string, string>; // filepath → file content
  components: string[];
  styles: Record<string, string>;
}

export interface MorphProfile {
  niche: string; // e.g. "fitness", "finance", "education"
  audience: string; // e.g. "B2C", "enterprise"
  monetization: 'subscription' | 'one-time' | 'freemium' | 'ads';
  keepFeatures: string[]; // component names to preserve unchanged
}

export interface MorphedApp {
  files: Record<string, string>; // complete output file set
  components: string[];
  changeLog: string[]; // what was changed and why
}

// ─── Niche vocabulary ────────────────────────────────────────────────────────

const NICHE_VOCABULARY: Record<string, {
  appName: string;
  primaryCTA: string;
  heroText: string;
  accentColor: string;
  icon: string;
}> = {
  fitness: {
    appName: 'FitTrack Pro',
    primaryCTA: 'Start Your Fitness Journey',
    heroText: 'Transform your body, transform your life.',
    accentColor: '#22c55e',
    icon: '💪',
  },
  finance: {
    appName: 'WealthFlow',
    primaryCTA: 'Take Control of Your Finances',
    heroText: 'Smart money management for a secure future.',
    accentColor: '#3b82f6',
    icon: '💰',
  },
  education: {
    appName: 'LearnSphere',
    primaryCTA: 'Start Learning Today',
    heroText: 'Unlock your potential with expert-led courses.',
    accentColor: '#8b5cf6',
    icon: '📚',
  },
  travel: {
    appName: 'WanderPath',
    primaryCTA: 'Explore the World',
    heroText: 'Your next adventure starts here.',
    accentColor: '#f59e0b',
    icon: '✈️',
  },
  food: {
    appName: 'TasteMate',
    primaryCTA: 'Discover Great Food',
    heroText: 'Find the best flavors near you.',
    accentColor: '#ef4444',
    icon: '🍕',
  },
};

const DEFAULT_NICHE = {
  appName: 'AppForge App',
  primaryCTA: 'Get Started',
  heroText: 'The app built for you.',
  accentColor: '#6366f1',
  icon: '🚀',
};

// ─── Monetization component injections ───────────────────────────────────────

const MONETIZATION_INJECTIONS: Record<MorphProfile['monetization'], string> = {
  subscription: `
// Subscription paywall component
const SubscriptionGate = () => (
  <div className="subscription-gate">
    <h2>Unlock Premium Features</h2>
    <p>Subscribe for full access — cancel anytime.</p>
    <button type="button" className="btn-primary">Start Free Trial</button>
  </div>
);`,
  'one-time': `
// One-time purchase component
const PurchasePrompt = () => (
  <div className="purchase-prompt">
    <h2>Own It Forever</h2>
    <p>One payment, lifetime access. No recurring fees.</p>
    <button type="button" className="btn-primary">Buy Now</button>
  </div>
);`,
  freemium: `
// Freemium upgrade component
const FreemiumUpgrade = () => (
  <div className="freemium-upgrade">
    <h2>Go Pro</h2>
    <p>Free forever. Upgrade for advanced features.</p>
    <button type="button" className="btn-secondary">Compare Plans</button>
  </div>
);`,
  ads: `
// Ad banner component (Google AdMob compatible)
const AdBanner = () => (
  <div className="ad-banner" aria-label="Advertisement">
    {/* AdMob banner slot */}
  </div>
);`,
};

// ─── Audience copy adjustments ────────────────────────────────────────────────

const AUDIENCE_COPY: Record<string, { tone: string; tagline: string }> = {
  B2C: { tone: 'friendly and motivating', tagline: 'Made for everyone.' },
  enterprise: { tone: 'professional and data-driven', tagline: 'Enterprise-grade reliability.' },
  SMB: { tone: 'practical and value-focused', tagline: 'Built for growing businesses.' },
};

// ─── Engine ──────────────────────────────────────────────────────────────────

export class TemplateMorphEngine {
  morph(template: AppTemplate, profile: MorphProfile): MorphedApp {
    const vocab = NICHE_VOCABULARY[profile.niche.toLowerCase()] ?? DEFAULT_NICHE;
    const audienceCopy = AUDIENCE_COPY[profile.audience] ?? AUDIENCE_COPY['B2C'];
    const changeLog: string[] = [];

    // ── 1. Morph file contents ────────────────────────────────────────────────
    const morphedFiles: Record<string, string> = {};

    for (const [filepath, content] of Object.entries(template.files)) {
      let morphed = content;

      // Replace niche-agnostic placeholders
      morphed = morphed
        .replace(/\{\{APP_NAME\}\}/g, vocab.appName)
        .replace(/\{\{PRIMARY_CTA\}\}/g, vocab.primaryCTA)
        .replace(/\{\{HERO_TEXT\}\}/g, vocab.heroText)
        .replace(/\{\{ACCENT_COLOR\}\}/g, vocab.accentColor)
        .replace(/\{\{ICON\}\}/g, vocab.icon)
        .replace(/\{\{AUDIENCE_TONE\}\}/g, audienceCopy.tone)
        .replace(/\{\{TAGLINE\}\}/g, audienceCopy.tagline)
        .replace(/\{\{NICHE\}\}/g, profile.niche);

      if (morphed !== content) {
        changeLog.push(`${filepath}: replaced niche placeholders for "${profile.niche}"`);
      }

      // Inject monetization component into entry files
      if (
        (filepath.endsWith('.tsx') || filepath.endsWith('.jsx')) &&
        !profile.keepFeatures.some((f) => filepath.includes(f))
      ) {
        const injection = MONETIZATION_INJECTIONS[profile.monetization];
        morphed = morphed + '\n' + injection;
        changeLog.push(
          `${filepath}: injected ${profile.monetization} monetization component`
        );
      }

      morphedFiles[filepath] = morphed;
    }

    // ── 2. Morph styles ───────────────────────────────────────────────────────
    const morphedStylePath = `src/styles/${profile.niche}-theme.css`;
    morphedFiles[morphedStylePath] = this.generateThemeCSS(vocab, profile);
    changeLog.push(`${morphedStylePath}: generated niche theme CSS`);

    // ── 3. Morph components ───────────────────────────────────────────────────
    const morphedComponents: string[] = [];

    for (const component of template.components) {
      if (profile.keepFeatures.includes(component)) {
        morphedComponents.push(component);
        changeLog.push(`${component}: preserved unchanged (in keepFeatures)`);
      } else {
        const renamed = this.renameComponent(component, profile.niche);
        morphedComponents.push(renamed);
        if (renamed !== component) {
          changeLog.push(`${component} → ${renamed}: renamed for niche aesthetics`);
        }
      }
    }

    // Add monetization component
    const monetizationComponentName = this.monetizationComponentName(profile.monetization);
    if (!morphedComponents.includes(monetizationComponentName)) {
      morphedComponents.push(monetizationComponentName);
      changeLog.push(`Added ${monetizationComponentName} for ${profile.monetization} strategy`);
    }

    return {
      files: morphedFiles,
      components: morphedComponents,
      changeLog,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private generateThemeCSS(
    vocab: typeof DEFAULT_NICHE,
    profile: MorphProfile
  ): string {
    return `:root {
  --color-primary: ${vocab.accentColor};
  --color-primary-hover: ${this.darkenHex(vocab.accentColor)};
  --app-name: "${vocab.appName}";
  --niche: "${profile.niche}";
  --audience: "${profile.audience}";
}

.btn-primary {
  background-color: var(--color-primary);
  color: #ffffff;
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}
`;
  }

  private darkenHex(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (n >> 16) - 30);
    const g = Math.max(0, ((n >> 8) & 0xff) - 30);
    const b = Math.max(0, (n & 0xff) - 30);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private renameComponent(component: string, niche: string): string {
    const nichePrefix = niche.charAt(0).toUpperCase() + niche.slice(1);
    const genericPrefixes = ['Generic', 'Template', 'Base', 'Default'];
    for (const prefix of genericPrefixes) {
      if (component.startsWith(prefix)) {
        return component.replace(prefix, nichePrefix);
      }
    }
    return component;
  }

  private monetizationComponentName(monetization: MorphProfile['monetization']): string {
    const map: Record<MorphProfile['monetization'], string> = {
      subscription: 'SubscriptionGate',
      'one-time': 'PurchasePrompt',
      freemium: 'FreemiumUpgrade',
      ads: 'AdBanner',
    };
    return map[monetization];
  }
}

export default new TemplateMorphEngine();
