// Offline measurement only; the game uses precomputed gains, not runtime analysis.
// K weighting / gated 400ms blocks: ITU-R BS.1770-5 (48 kHz, stereo playback).
import fs from 'node:fs';
import { createRequire } from 'node:module';
const load = createRequire(import.meta.url);
const { chromium } = load(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = fs.readFileSync('src/components/game/StartScreen.tsx', 'utf8');
const table = source.match(/const CHARACTER_SELECTION_MUSIC:.*?= \{([\s\S]*?)\};/)[1];
const tracks = [...table.matchAll(/(\w+): '([^']+)'/g)].map(m => ({ id: m[1], url: m[2] }));
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--mute-audio'] });
const results = [];
try {
  const page = await browser.newPage();
  await page.goto(process.env.PERF_URL || 'http://localhost:3010');
  for (const track of tracks) {
    const result = await page.evaluate(async ({ url }) => {
      const response = await fetch(url); if (!response.ok) throw Error(`Audio HTTP ${response.status}`);
      const decoder = new OfflineAudioContext(2, 1, 48000);
      const decoded = await decoder.decodeAudioData(await response.arrayBuffer());
      if (decoded.numberOfChannels > 2) throw Error('Only mono/stereo supported');
      let peak = 0;
      for (let c = 0; c < decoded.numberOfChannels; c++) {
        for (const sample of decoded.getChannelData(c)) peak = Math.max(peak, Math.abs(sample));
      }
      const offline = new OfflineAudioContext(2, decoded.length, 48000);
      const audio = offline.createBufferSource(); audio.buffer = decoded;
      const shelf = offline.createIIRFilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]);
      const highpass = offline.createIIRFilter([1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
      audio.connect(shelf).connect(highpass).connect(offline.destination); audio.start();
      const filtered = await offline.startRendering();
      // Sum 100ms energies; four adjacent hops form one 400ms gating block.
      const hop = 4800, energies = new Float64Array(Math.floor(filtered.length / hop));
      for (let c = 0; c < filtered.numberOfChannels; c++) {
        const samples = filtered.getChannelData(c);
        for (let h = 0; h < energies.length; h++) {
          let sum = 0;
          for (let i = h * hop; i < (h + 1) * hop; i++) sum += samples[i] * samples[i];
          energies[h] += sum / hop;
        }
      }
      const blocks = [];
      const loudness = energy => -0.691 + 10 * Math.log10(energy);
      for (let i = 0; i + 3 < energies.length; i++) {
        const energy = (energies[i] + energies[i + 1] + energies[i + 2] + energies[i + 3]) / 4;
        if (loudness(energy) > -70) blocks.push(energy);
      }
      const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
      const relativeGate = loudness(mean(blocks)) - 10;
      const gated = blocks.filter(e => loudness(e) > relativeGate);
      const lufs = loudness(mean(gated));
      if (!Number.isFinite(lufs) || !peak) throw Error('Unmeasurable audio');
      return { duration: decoded.duration, sourceChannels: decoded.numberOfChannels, lufs, peak, samplePeakDbFS: 20 * Math.log10(peak) };
    }, track);
    results.push({ ...track, ...result }); console.log(JSON.stringify(results.at(-1)));
  }
  const ceiling = 10 ** (-1 / 20);
  const targetLufs = Math.min(-18, ...results.map(t => t.lufs), ...results.map(t => t.lufs + 20 * Math.log10(ceiling / t.peak)));
  for (const t of results) {
    t.gain = +Math.pow(10, (targetLufs - t.lufs) / 20).toFixed(6);
    t.outputLufs = t.lufs + 20 * Math.log10(t.gain);
    t.outputSamplePeakDbFS = t.samplePeakDbFS + 20 * Math.log10(t.gain);
  }
  const report = { targetLufs, method: 'BS.1770 K-weighting, 400ms/75% overlap gating, 48kHz stereo playback; sample peak (not true peak)', tracks: results };
  fs.writeFileSync(process.env.MENU_AUDIO_REPORT || 'docs/menu-audio-levels.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
