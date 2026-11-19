// Coral Cover — wires the editor page: photo slots, crop and position,
// layout and grade picks, caption text, export sizes and the PNG export.
// A `?shot=` query stages a fixed scene for a screenshot instead (shots.js).
import { drawCover, panelsFor, SIZES, GRADES } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { src: './samples/boulevard.webp', name: 'Boulevard' },
  { src: './samples/pier.webp', name: 'Pier' },
  { src: './samples/neon.webp', name: 'Neon street' },
  { src: './samples/beach.webp', name: 'Beach' },
];

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');

const state = {
  layout: 'poster',
  grade: 'sunset',
  sizeKey: 'landscape',
  caption: 'SUNSET HEIST',
  subtitle: 'CORAL BAY • EST. 2026',
  photos: [null, null, null],
  fits: [
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
  ],
  selected: 0,
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function resizeCanvas() {
  const size = SIZES[state.sizeKey];
  canvas.width = size.w;
  canvas.height = size.h;
}

function redraw() {
  resizeCanvas();
  drawCover(canvas, state.photos, state.fits, {
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    subtitle: state.subtitle,
    sizeKey: state.sizeKey,
  });
  document.querySelectorAll('.slot').forEach((el, i) => {
    el.classList.toggle('selected', i === state.selected);
  });
}

/** Loads a sample or uploaded photo into a slot, then redraws. */
export async function setPhoto(slot, url) {
  state.photos[slot] = await loadImage(url);
  state.selected = slot;
  redraw();
}

function buildSlots() {
  const wrap = document.getElementById('slots');
  for (let slot = 0; slot < 3; slot++) {
    const card = document.createElement('div');
    card.className = 'slot';
    card.dataset.slot = String(slot);
    card.innerHTML = `
      <div class="slot-head"><strong>Panel ${slot + 1}</strong>
        <label class="upload">Upload photo
          <input type="file" accept="image/*" data-slot="${slot}">
        </label></div>
      <div class="samples"></div>
      <label>Zoom <input type="range" min="1" max="2.5" step="0.05" value="1" data-fit="zoom" data-slot="${slot}"></label>
      <label>Pan left–right <input type="range" min="-1" max="1" step="0.05" value="0" data-fit="ox" data-slot="${slot}"></label>
      <label>Pan up–down <input type="range" min="-1" max="1" step="0.05" value="0" data-fit="oy" data-slot="${slot}"></label>`;
    const samples = card.querySelector('.samples');
    for (const s of SAMPLES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sample';
      b.textContent = s.name;
      b.addEventListener('click', async () => {
        try { await setPhoto(slot, s.src); } catch { statusEl.textContent = `Could not load ${s.name}.`; }
      });
      samples.appendChild(b);
    }
    card.querySelector('input[type=file]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { await setPhoto(slot, URL.createObjectURL(file)); } catch { statusEl.textContent = 'That file could not be read as a photo.'; }
    });
    card.querySelectorAll('input[data-fit]').forEach((input) => {
      input.addEventListener('input', () => {
        state.fits[slot][input.dataset.fit] = Number(input.value);
        state.selected = slot;
        redraw();
      });
    });
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, input, label')) return;
      state.selected = slot;
      redraw();
    });
    wrap.appendChild(card);
  }
}

function buildPickers() {
  const layouts = document.getElementById('layouts');
  for (const [key, label] of [['poster', 'Poster panels'], ['hero', 'One hero photo'], ['split', 'Diagonal split']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.layout = key;
    b.classList.toggle('active', key === state.layout);
    b.addEventListener('click', () => {
      state.layout = key;
      layouts.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      redraw();
    });
    layouts.appendChild(b);
  }
  const grades = document.getElementById('grades');
  for (const key of Object.keys(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = GRADES[key].label;
    b.dataset.grade = key;
    b.classList.toggle('active', key === state.grade);
    b.addEventListener('click', () => {
      state.grade = key;
      grades.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      redraw();
    });
    grades.appendChild(b);
  }
  const sizes = document.getElementById('sizes');
  for (const key of Object.keys(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = SIZES[key].label;
    b.dataset.size = key;
    b.classList.toggle('active', key === state.sizeKey);
    b.addEventListener('click', () => {
      state.sizeKey = key;
      sizes.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      redraw();
    });
    sizes.appendChild(b);
  }
}

// Drag on the preview to pan the photo under the pointer; wheel zooms it.
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width;
  const fy = (e.clientY - r.top) / r.height;
  const panels = panelsFor(state.layout, state.sizeKey);
  const hit = panels.findIndex((p) => fx >= p.x && fx < p.x + p.w && fy >= p.y && fy < p.y + p.h);
  if (hit === -1) return;
  state.selected = panels[hit].slot;
  const fit = state.fits[state.selected];
  const startX = e.clientX;
  const startY = e.clientY;
  const startOx = fit.ox;
  const startOy = fit.oy;
  const move = (ev) => {
    fit.ox = Math.max(-1, Math.min(1, startOx + (ev.clientX - startX) / r.width * 2));
    fit.oy = Math.max(-1, Math.min(1, startOy + (ev.clientY - startY) / r.height * 2));
    syncFitSliders();
    redraw();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  redraw();
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const fit = state.fits[state.selected];
  fit.zoom = Math.max(1, Math.min(2.5, fit.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncFitSliders();
  redraw();
}, { passive: false });

function syncFitSliders() {
  document.querySelectorAll('input[data-fit]').forEach((input) => {
    if (Number(input.dataset.slot) === state.selected) {
      input.value = String(state.fits[state.selected][input.dataset.fit]);
    }
  });
}

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.sizeKey];
  canvas.toBlob((blob) => {
    if (!blob) { statusEl.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `coral-cover-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved coral-cover-${size.w}x${size.h}.png — share it anywhere.`;
  }, 'image/png');
});

document.getElementById('shuffle').addEventListener('click', async () => {
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  for (let slot = 0; slot < 3; slot++) {
    try { state.photos[slot] = await loadImage(SAMPLES[order[slot]].src); } catch { /* keep old */ }
  }
  redraw();
});

buildSlots();
buildPickers();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, { setPhoto, state, redraw, SAMPLES });
} else {
  // First visit: load the three samples so the cover is alive at once.
  (async () => {
    try {
      state.photos[0] = await loadImage(SAMPLES[0].src);
      state.photos[1] = await loadImage(SAMPLES[1].src);
      state.photos[2] = await loadImage(SAMPLES[2].src);
    } catch { /* samples are optional; the cover still draws */ }
    redraw();
    window.__shotReady = true;
  })();
}
