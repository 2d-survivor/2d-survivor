import fs from 'node:fs';
import { createRequire } from 'node:module';
const load = createRequire(import.meta.url);
const { chromium } = load(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.EDGE_REPORT || 'docs/performance-map-edges.json';
const results = [];
const compareBudgets = process.env.EDGE_COMPARE_BUDGETS === '1';
const cpuRate = Number(process.env.EDGE_CPU_RATE || 1);
const regions = process.env.EDGE_REGIONS?.split(',');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const dpr of [1, 2]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
    const page = await context.newPage(), errors = [];
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { let s = 123456789; Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; }; });
    await page.goto(process.env.PERF_URL || 'http://localhost:3010');
    await page.getByRole('button', { name: /Floresta Amazônica/ }).click();
    await page.getByRole('button', { name: /INICIAR COM/ }).click();
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      let f = canvas[Object.keys(canvas).find(k => k.startsWith('__reactFiber'))];
      while (f.return) f = f.return;
      function find(n) { if (n.memoizedProps?.getEngine) return n.memoizedProps.getEngine(); for (let c = n.child; c; c = c.sibling) { const e = find(c); if (e) return e; } }
      const e = window.edgeEngine = find(f);
      e.sound.setMuted(true); e.isPaused = false; e.update = () => {}; e.enemies = []; e.drops = [];
      const w = e.worldProps;
      const sprite = w.getTreeSprite;
      w.getTreeSprite = function(tree, scale) { const stats = window.edgeStats; if (stats?.active) { stats.requests++; if (!this.treeSprites.has(tree)) stats.misses++; } return sprite.call(this, tree, scale); };
      for (const [obj, key, label] of [[w, 'renderTrees', 'trees'], [w, 'renderFloor', 'floor'], [e, 'render', 'render']]) {
        const fn = obj[key]; obj[key] = function(...args) { const t = performance.now(); const ret = fn.apply(this, args); if (window.edgeStats?.active) window.edgeStats[label].push(performance.now() - t); return ret; };
      }
      let last;
      function frame(t) { if (window.edgeStats?.active && last) window.edgeStats.frames.push(t - last); last = t; requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
    });
    const positions = compareBudgets
      ? [['center', 0, 0, 16], ['top', 0, -6700, 16], ['bottom', 0, 6700, 16], ['left', -6700, 0, 16], ['right', 6700, 0, 16], ['top-large-cache-diagnostic', 0, -6700, 128], ['bottom-large-cache-diagnostic', 0, 6700, 128]]
      : [['center', 0, 0, null], ['top', 0, -6700, null], ['bottom', 0, 6700, null], ['left', -6700, 0, null], ['right', 6700, 0, null], ['top-right', 6700, -6700, null], ['bottom-left', -6700, 6700, null], ['center-return', 0, 0, null]];
    for (const [label, x, y, budget] of positions) {
      if (regions && !regions.includes(label)) continue;
      await page.evaluate(({ x, y, budget }) => {
        window.edgeStats = { active: false, frames: [], trees: [], floor: [], render: [], requests: 0, misses: 0 };
        const e = window.edgeEngine; e.player.x = e.camera.x = x; e.player.y = e.camera.y = y;
        if (budget !== null) {
          for (const sprite of e.worldProps.treeSprites.values()) sprite.width = sprite.height = 0;
          e.worldProps.treeSprites.clear(); e.worldProps.treeSpriteBytes = 0; e.worldProps.treeSpriteBudget = budget * 1048576;
        }
      }, { x, y, budget });
      await page.waitForTimeout(1200);
      await page.evaluate(() => { window.edgeStats.active = true; });
      await page.waitForTimeout(4000);
      const result = await page.evaluate(() => {
        const s = window.edgeStats; s.active = false;
        const stats = a => { a.sort((a, b) => a - b); return { mean: a.reduce((a, b) => a + b, 0) / a.length, p95: a[Math.floor(a.length * .95)], n: a.length }; };
        const e = window.edgeEngine, scale = window.devicePixelRatio;
        const visible = e.worldProps.trees.filter(t => e.camera.isInView(t.x, t.y, t.size + 30));
        return { frames: stats(s.frames), treeTime: stats(s.trees), floorTime: stats(s.floor), renderTime: stats(s.render),
          requests: s.requests, misses: s.misses, cacheBytes: e.worldProps.treeSpriteBytes, configuredBudgetMiB: e.worldProps.treeSpriteBudget / 1048576, visibleTrees: visible.length,
          visibleSpriteBytes: visible.reduce((sum, t) => sum + Math.ceil(Math.ceil(t.size * 1.2 + 6) * scale) * Math.ceil((Math.ceil(t.size * 1.1 + 3) + Math.ceil(t.size * .25 + 3)) * scale) * 4, 0) };
      });
      results.push({ label, dpr, x, y, cpuRate, budgetMiB: result.configuredBudgetMiB, usesGameBudget: budget === null, ...result, errors: [...errors] });
      fs.writeFileSync(output, JSON.stringify(results, null, 2) + '\n');
      console.log(`${label} DPR${dpr}: ${(1000 / result.frames.mean).toFixed(1)}fps, trees ${result.visibleTrees}, ${(result.visibleSpriteBytes / 1048576).toFixed(1)}MiB, misses ${(result.misses / result.requests * 100 || 0).toFixed(1)}%, tree render ${result.treeTime.mean.toFixed(2)}ms`);
    }
    await context.close();
  }
} finally { await browser.close(); }
