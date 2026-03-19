#!/usr/bin/env node
/**
 * Weather Art Generator
 * 
 * Fetches London weather, picks a visual style, renders it with Playwright,
 * saves a timestamped snapshot, and updates the gallery.
 * 
 * Usage: node generate.mjs [--push]
 *   --push   Also git commit and push to GitHub Pages
 */

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { flowFields, rainStreaks, thermalGradient, fogLayers, starfield, chooseStyle } from './styles.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, 'snapshots');
const KAI_ART_DIR = join(__dirname, '..');

async function fetchWeather() {
  const res = await fetch('https://wttr.in/London?format=j1');
  const data = await res.json();
  const cc = data.data.current_condition[0];
  const today = data.data.weather[0];
  const astro = today.astronomy[0];
  const hourly = today.hourly;

  const now = new Date();
  const hour = now.getUTCHours(); // London is GMT in March
  const isNight = hour < 6 || hour >= 18;

  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'
  });
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London'
  });

  return {
    location: 'London',
    timeStr: `${timeStr} · ${dateStr}`,
    temp: parseFloat(cc.temp_C),
    feelsLike: parseFloat(cc.FeelsLikeC),
    windSpeed: parseFloat(cc.windspeedKmph),
    windDir: parseFloat(cc.winddirDegree),
    windLabel: cc.winddir16Point,
    humidity: parseFloat(cc.humidity),
    cloudCover: parseFloat(cc.cloudcover),
    pressure: parseFloat(cc.pressure),
    condition: cc.weatherDesc[0].value.trim(),
    visibility: parseFloat(cc.visibility),
    uvIndex: parseFloat(cc.uvIndex),
    precipMM: parseFloat(cc.precipMM),
    moonIllum: parseFloat(astro.moon_illumination),
    moonPhase: astro.moon_phase,
    isNight,
    hourlyTemps: hourly.map(h => parseFloat(h.tempC)),
    hourlyHumidity: hourly.map(h => parseFloat(h.humidity)),
  };
}

async function renderToImage(html, outputPath) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // Wait for animation to complete
  await page.waitForFunction(() => window.__RENDER_DONE === true, { timeout: 30000 });
  // Extra beat for final frame
  await page.waitForTimeout(500);

  await page.screenshot({ path: outputPath, type: 'png' });
  await browser.close();
  console.log(`  → saved: ${outputPath}`);
}

function buildGalleryPage(snapshots) {
  const cards = snapshots.map(s => `
    <div class="card">
      <a href="snapshots/${s.filename}" target="_blank">
        <img src="snapshots/${s.filename}" alt="${s.style} — ${s.weather}" loading="lazy">
      </a>
      <div class="meta">
        <span class="style">${s.style}</span>
        <span class="weather">${s.weather}</span>
        <span class="time">${s.time}</span>
      </div>
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>London Weather Gallery — Kai's Art</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #08090f; color: #c0c8d8; font-family: 'Inter', sans-serif; min-height: 100vh; }
  
  header {
    text-align: center; padding: 60px 20px 30px;
    background: linear-gradient(180deg, #0a1020 0%, #08090f 100%);
  }
  header h1 { font-size: 2.2rem; font-weight: 300; letter-spacing: 0.08em; color: #4eeadd; margin-bottom: 8px; }
  header p { font-size: 0.95rem; color: #5a7a9a; font-weight: 300; max-width: 500px; margin: 0 auto; line-height: 1.6; }
  
  .gallery {
    max-width: 1400px; margin: 0 auto; padding: 30px 20px 60px;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 24px;
  }
  
  .card {
    background: #0e1118; border-radius: 12px; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.04);
    transition: transform 0.2s, border-color 0.2s;
  }
  .card:hover { transform: translateY(-2px); border-color: rgba(78,234,221,0.15); }
  .card a { display: block; }
  .card img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover; }
  .card .meta { padding: 14px 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .card .style {
    background: rgba(78,234,221,0.1); color: #4eeadd; padding: 3px 10px;
    border-radius: 20px; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .card .weather { font-size: 0.85rem; color: #8a9ab0; }
  .card .time { font-size: 0.75rem; color: #5a6a7a; margin-left: auto; }
  
  footer { text-align: center; padding: 30px; color: #3a4a5a; font-size: 0.8rem; }
  footer a { color: #4eeadd; text-decoration: none; }
  
  @media (max-width: 500px) { .gallery { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
  <h1>🌊 London Weather Gallery</h1>
  <p>Generative art that breathes with London's weather. Each piece is automatically created from live conditions — temperature, wind, rain, clouds, and time of day shape the visuals.</p>
</header>
<div class="gallery">
${cards}
</div>
<footer>
  Art by Kai · Generated every few hours from live weather data · <a href="../index.html">← Back to Kai's Ocean</a>
</footer>
</body>
</html>`;
}

function loadManifest() {
  const path = join(SNAPSHOTS_DIR, 'manifest.json');
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
  return [];
}

function saveManifest(entries) {
  writeFileSync(join(SNAPSHOTS_DIR, 'manifest.json'), JSON.stringify(entries, null, 2));
}

async function main() {
  const shouldPush = process.argv.includes('--push');

  console.log('🌤️  Fetching London weather...');
  const weather = await fetchWeather();
  console.log(`  ${weather.temp}°C, ${weather.condition}, wind ${weather.windSpeed}km/h, cloud ${weather.cloudCover}%`);
  console.log(`  Night: ${weather.isNight}, precip: ${weather.precipMM}mm, visibility: ${weather.visibility}km`);

  const style = chooseStyle(weather);
  console.log(`\n🎨 Selected style: ${style.name}`);

  const html = style.fn(weather);

  // Timestamp for filename
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `london-${ts}-${style.name}.png`;
  const outputPath = join(SNAPSHOTS_DIR, filename);

  console.log('\n🖼️  Rendering...');
  await renderToImage(html, outputPath);

  // Also save the HTML for the live version
  const liveHtmlPath = join(KAI_ART_DIR, 'london-now.html');
  // For the live version, swap the embedded data with a fetch
  const liveHtml = html
    .replace(`const W = ${JSON.stringify(weather)};`, `
    let W = ${JSON.stringify(weather)};
    // Live version refreshes every 10 min
    setInterval(async () => {
      try {
        const res = await fetch('https://wttr.in/London?format=j1');
        const data = await res.json();
        const cc = data.data.current_condition[0];
        W.temp = parseFloat(cc.temp_C);
        W.windSpeed = parseFloat(cc.windspeedKmph);
        W.humidity = parseFloat(cc.humidity);
        W.cloudCover = parseFloat(cc.cloudcover);
        W.condition = cc.weatherDesc[0].value.trim();
      } catch(e) {}
    }, 600000);`)
    .replace(
      /if \(time < \d+\) requestAnimationFrame\(\w+\);\s*else window\.__RENDER_DONE = true;/g,
      'requestAnimationFrame(frame);'  // Live version runs forever
    );
  writeFileSync(liveHtmlPath, liveHtml);
  console.log(`  → updated live: ${liveHtmlPath}`);

  // Update manifest
  const manifest = loadManifest();
  manifest.unshift({
    filename,
    style: style.name,
    weather: `${weather.temp}°C ${weather.condition}`,
    time: now.toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }),
    timestamp: now.toISOString(),
    data: {
      temp: weather.temp,
      wind: weather.windSpeed,
      humidity: weather.humidity,
      cloud: weather.cloudCover,
      precip: weather.precipMM,
      isNight: weather.isNight,
    }
  });
  // Keep last 100 snapshots
  if (manifest.length > 100) manifest.length = 100;
  saveManifest(manifest);

  // Build gallery page
  const galleryHtml = buildGalleryPage(manifest);
  writeFileSync(join(__dirname, 'index.html'), galleryHtml);
  console.log('  → updated gallery: weather-gallery/index.html');

  // Update main kai-art index to link to gallery
  updateMainIndex();

  if (shouldPush) {
    console.log('\n📤 Pushing to GitHub...');
    const { execSync } = await import('child_process');
    const opts = { cwd: KAI_ART_DIR, stdio: 'inherit' };
    execSync('git add -A', opts);
    execSync(`git commit -m "🎨 Weather art: ${style.name} — ${weather.temp}°C ${weather.condition}"`, opts);
    execSync('git push', opts);
    console.log('  → pushed!');
  }

  console.log('\n✅ Done!');
}

function updateMainIndex() {
  const indexPath = join(KAI_ART_DIR, 'index.html');
  if (!existsSync(indexPath)) return;

  let html = readFileSync(indexPath, 'utf-8');
  // Add gallery link if not present
  if (!html.includes('weather-gallery')) {
    html = html.replace(
      '</div>\n</section>',
      `</div>
</section>

<section class="gallery-link" style="text-align:center; padding: 40px 20px;">
  <a href="weather-gallery/index.html" style="display:inline-block; padding: 14px 28px; background: rgba(78,234,221,0.08); color: #4eeadd; border: 1px solid rgba(78,234,221,0.2); border-radius: 8px; text-decoration: none; font-size: 1rem; letter-spacing: 0.5px; transition: all 0.2s;">
    🌤️ Weather Gallery — Living art from London's sky
  </a>
</section>`
    );
    writeFileSync(indexPath, html);
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
