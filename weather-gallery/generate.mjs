#!/usr/bin/env node
/**
 * Weather-driven generative art generator
 * Fetches London weather → crafts an art prompt → generates image via OpenAI
 * Outputs to ./output/ with an index.html gallery
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const GALLERY_PATH = join(__dirname, 'index.html');
const MANIFEST_PATH = join(OUTPUT_DIR, 'manifest.json');

// Ensure output dir exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// --- Weather fetching ---
async function fetchWeather() {
  const res = await fetch('https://wttr.in/London?format=j1');
  if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
  const data = await res.json();
  
  // Defensive: handle various response shapes
  const current = data.current_condition?.[0] || data.currentCondition?.[0];
  if (!current) {
    throw new Error(`Unexpected weather response shape. Keys: ${Object.keys(data).join(', ')}`);
  }
  
  return {
    temp_C: current.temp_C || current.tempC || '15',
    weatherDesc: current.weatherDesc?.[0]?.value || current.weatherDescription || 'Partly cloudy',
    humidity: current.humidity || '70',
    windspeedKmph: current.windspeedKmph || '10',
    cloudcover: current.cloudcover || '50',
    uvIndex: current.uvIndex || '3',
    visibility: current.visibility || '10',
    precipMM: current.precipMM || '0.0',
  };
}

// --- Prompt crafting ---
function craftPrompt(weather) {
  const hour = new Date().getUTCHours();
  
  // Time of day mood
  let timeMood;
  if (hour >= 5 && hour < 9) timeMood = 'dawn, soft golden light breaking through';
  else if (hour >= 9 && hour < 12) timeMood = 'bright morning, crisp and alert';
  else if (hour >= 12 && hour < 15) timeMood = 'midday, high contrast and vivid';
  else if (hour >= 15 && hour < 18) timeMood = 'warm afternoon, long shadows';
  else if (hour >= 18 && hour < 21) timeMood = 'golden hour, warm amber and violet';
  else timeMood = 'night, deep indigo and electric highlights';

  // Weather mood
  const temp = parseInt(weather.temp_C);
  let tempMood = temp < 5 ? 'icy, crystalline, sharp edges' :
                 temp < 12 ? 'cool, muted tones, gentle' :
                 temp < 20 ? 'comfortable, balanced palette' :
                 temp < 28 ? 'warm, saturated, lush' :
                 'scorching, intense, heat-haze distortion';

  const humidity = parseInt(weather.humidity);
  let humidityMood = humidity > 80 ? 'misty, diffused, watercolor bleeds' :
                     humidity > 50 ? 'soft edges, gentle atmosphere' :
                     'dry, sharp, high-definition edges';

  const wind = parseInt(weather.windspeedKmph);
  let movement = wind > 40 ? 'violent motion, swirling chaos' :
                 wind > 20 ? 'flowing movement, dynamic curves' :
                 wind > 10 ? 'gentle movement, swaying forms' :
                 'stillness, meditation, calm geometry';

  // Art style rotation based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const styles = [
    'abstract expressionism with bold brushstrokes',
    'Japanese ink wash painting (sumi-e)',
    'art nouveau with organic flowing lines',
    'geometric constructivism',
    'impressionist landscape',
    'cyberpunk digital art with neon accents',
    'watercolor botanical illustration',
    'brutalist architecture rendered in charcoal',
    'surrealist dreamscape à la Dalí',
    'minimalist Scandinavian design',
    'stained glass window design',
    'retro-futurism 1960s space age',
    'ukiyo-e woodblock print style',
    'art deco poster design',
  ];
  const style = styles[dayOfYear % styles.length];

  const prompt = `Create an abstract artwork inspired by London's current atmosphere: ${weather.weatherDesc.toLowerCase()}, ${weather.temp_C}°C. Style: ${style}. Mood: ${timeMood}. Temperature feel: ${tempMood}. Atmosphere: ${humidityMood}. Movement: ${movement}. Wind: ${weather.windspeedKmph} km/h, cloud cover ${weather.cloudcover}%. No text or words in the image. Square format, museum-quality composition.`;

  return prompt;
}

// --- Image generation via OpenAI ---
async function generateImage(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  // gpt-image-1 returns b64_json by default
  const b64 = data.data?.[0]?.b64_json;
  const url = data.data?.[0]?.url;
  
  return { b64, url };
}

// --- Gallery builder ---
function buildGallery() {
  // Load manifest
  let manifest = [];
  if (existsSync(MANIFEST_PATH)) {
    try { manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')); } catch {}
  }

  const entries = manifest.sort((a, b) => new Date(b.date) - new Date(a.date));

  const cards = entries.map(e => `
    <div class="card">
      <img src="output/${e.filename}" alt="${e.weather}" loading="lazy" />
      <div class="meta">
        <span class="date">${e.date}</span>
        <span class="weather">${e.weather} · ${e.temp}°C</span>
        <span class="style">${e.style || ''}</span>
      </div>
    </div>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>London Weather Art Gallery</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; color: #e0e0e0; font-family: 'Inter', system-ui, sans-serif; }
  header { text-align: center; padding: 3rem 1rem 2rem; }
  header h1 { font-size: 2rem; font-weight: 300; letter-spacing: 0.1em; color: #fff; }
  header p { color: #888; margin-top: 0.5rem; font-size: 0.9rem; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; padding: 0 2rem 4rem; max-width: 1400px; margin: 0 auto; }
  .card { background: #141414; border-radius: 12px; overflow: hidden; transition: transform 0.2s; }
  .card:hover { transform: scale(1.02); }
  .card img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
  .meta { padding: 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
  .date { font-size: 0.8rem; color: #666; }
  .weather { font-size: 0.9rem; }
  .style { font-size: 0.8rem; color: #555; font-style: italic; }
  .empty { text-align: center; padding: 4rem; color: #444; }
</style>
</head>
<body>
<header>
  <h1>🌊 London Weather Art</h1>
  <p>AI-generated art driven by real-time London weather · ${entries.length} pieces</p>
</header>
<div class="gallery">
  ${cards || '<div class="empty">No art generated yet. Check back soon.</div>'}
</div>
</body>
</html>`;

  writeFileSync(GALLERY_PATH, html);
}

// --- Main ---
async function main() {
  const push = process.argv.includes('--push');
  
  console.log('Fetching London weather...');
  const weather = await fetchWeather();
  console.log(`Weather: ${weather.weatherDesc}, ${weather.temp_C}°C, humidity ${weather.humidity}%, wind ${weather.windspeedKmph} km/h`);

  console.log('Crafting prompt...');
  const prompt = craftPrompt(weather);
  console.log(`Prompt: ${prompt.slice(0, 120)}...`);

  console.log('Generating image...');
  const { b64, url } = await generateImage(prompt);
  
  // Save image
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `weather-art-${timestamp}.png`;
  const filepath = join(OUTPUT_DIR, filename);

  if (b64) {
    writeFileSync(filepath, Buffer.from(b64, 'base64'));
  } else if (url) {
    const imgRes = await fetch(url);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    writeFileSync(filepath, buf);
  } else {
    throw new Error('No image data in API response');
  }
  console.log(`Saved: ${filepath}`);

  // Update manifest
  let manifest = [];
  if (existsSync(MANIFEST_PATH)) {
    try { manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')); } catch {}
  }
  
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const styles = [
    'abstract expressionism', 'Japanese sumi-e', 'art nouveau', 'geometric constructivism',
    'impressionist', 'cyberpunk digital', 'watercolor botanical', 'brutalist charcoal',
    'surrealist dreamscape', 'minimalist Scandinavian', 'stained glass', 'retro-futurism',
    'ukiyo-e woodblock', 'art deco poster',
  ];

  manifest.push({
    filename,
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    weather: weather.weatherDesc,
    temp: weather.temp_C,
    humidity: weather.humidity,
    wind: weather.windspeedKmph,
    style: styles[dayOfYear % styles.length],
    prompt,
  });

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  // Rebuild gallery
  buildGallery();
  console.log('Gallery updated.');

  console.log('Done! ✨');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
