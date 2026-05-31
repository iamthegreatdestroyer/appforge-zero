# AppForge Zero — Autonomous Completion Brief

## Project Identity
- **Repo:** `iamthegreatdestroyer/appforge-zero`
- **Local path:** `C:\Users\sgbil\appforge-zero`
- **Language:** TypeScript (Electron)
- **Castle Layer:** Layer 7 — Crown Services (Dev Tools)
- **Current completion:** ~50%
- **Mission:** AI-driven template morphing engine — transform one app template into infinite revenue streams through intelligent morphing, enabling rapid monetizable app generation

## Sprint Plan

### Sprint 1 — Build Baseline (Day 1)
```
@APEX run: npm install && npm run build
Fix TypeScript errors. Run: npm test
If Electron app: npm run start to verify it opens.
Read src/ to understand: TemplateMorphEngine, RevenueOptimizer, AppGenerator.
Write BUILD_STATUS.md.
```

### Sprint 2 — Template Morphing Core (Days 1–2)
```
@APEX implement or complete TemplateMorphEngine in src/:
  morph(template: AppTemplate, targetProfile: MorphProfile): MorphedApp
    - Analyze template structure (components, layouts, styles)
    - Apply morphing rules from profile (niche, audience, monetization)
    - Generate new component variants maintaining core functionality
    - Output: complete set of morphed files

Test: morph(saasTemplate, { niche: "fitness", monetization: "subscription" }) → 
  verify output files are valid TypeScript/React.
```

### Sprint 3 — Electron UI + Revenue Optimizer (Day 2–3)
```
@APEX wire the Electron UI:
  - Template library browser (show available base templates)
  - Morph configuration form (niche, audience, features to keep/change)
  - Preview panel (before/after template comparison)
  - Export button (generates complete app in ./output/<app-name>/)

Wire RevenueOptimizer: given morphed app, suggest top 3 monetization strategies
with estimated revenue ranges.
```

### Sprint 4 — Tests + Tag (Day 3)
```
npm run build && npm test
git tag v0.2.0 && git push origin v0.2.0
```

## Done Criteria
- [ ] `npm build` + `npm test` pass
- [ ] Template morphing produces valid output app files
- [ ] Electron app opens and shows template library
- [ ] Revenue optimizer suggests monetization strategies
- [ ] `v0.2.0` tag pushed

## Completion Signal
```bash
git tag v0.2.0 && git push origin v0.2.0
```
