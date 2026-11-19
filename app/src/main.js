// Coral Cover — the editor (wires the cover engine to the page).
//
// Loads the sample photos (local files, never uploaded), keeps the editor
// state, draws the live preview, and exports the cover as a PNG in one
// click. Supports ?shot=cover for a clean full-viewport cover render (used
// by the screenshot script) and ?shot=editor for the editor view; both take
// &layout= &grade= &size= &caption= &subtitle= parameters.

import { GRADES, LAYOUTS, SIZES, drawCover, layoutPanels, renderCover } from './cover.js';

export const SAMPLES = [
  { id: 'boulevard', name: 'Boulevard Sunset', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier Dusk', src: 'samples/pier.jpg' },
  { id: 'neon', name: 'Neon Street', src: 'samples/neon.jpg' },
  { id: 'beach', name: 'Beach Golden Hour', src: 'samples/beach.jpg' },
];

const state = {
  layout: 'poster',
  grade: 'sunset',
  size: 'landscape',
  caption: 'SUNSET HEIST',
  subtitle: 'CORAL BAY · EST. 2026',
  panels: [
    { sample: 'boulevard', zoom: 1, panX: 0, panY: 0, img: null, customName: '' },
    { sample: 'pier', zoom: 1, panX: 0, panY: 0, img: null, customName: '' },
    { sample: 'neon', zoom: 1.15, panX: 0, panY: 0, img: null, customName: '' },
  ],
};

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const exportBtn = document.getElementById('exportBtn');
const exportStatus = document.getElementById('exportStatus');
const captionInput = document.getElementById('captionInput');
const subtitleInput = document.getElementById('subtitleInput');
const slotsEl = document.getElementById('slots');

let ready = false;
let pendingImages = 0;

function markReady() {
  if (ready) return;
  ready = true;
  window.__coralReady = true;
  document.body.classList.add('is-ready');
}

function loadSample(panel, sampleId) {
  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];
  panel.sample = sample.id;
  panel.customName = '';
  pendingImages++;
  const img = new Image();
  img.onload = () => {
    panel.img = img;
    pendingImages--;
    render();
    if (pendingImages === 0) markReady();
  };
  img.onerror = () => {
    panel.img = null;
    pendingImages--;
    render();
    if (pendingImages === 0) markReady();
  };
  img.src = sample.src;
}

function loadCustomFile(panel, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingImages++;
    const img = new Image();
    img.onload = () => {
      panel.img = img;
      panel.customName = file.name;
      pendingImages--;
      render();
      if (pendingImages === 0) markReady();
    };
    img.onerror = () => {
      pendingImages--;
      render();
      if (pendingImages === 0) markReady();
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

/** Sizes the preview canvas to its display box at the export aspect ratio.
    In ?shot=cover mode the canvas fills the whole viewport instead. */
function fitCanvas() {
  const size = SIZES[state.size];
  const box = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cssW;
  let cssH;
  if (document.body.classList.contains('shot-cover')) {
    const scale = Math.min(box.width / size.w, box.height / size.h);
    cssW = Math.max(280, Math.floor(size.w * scale));
    cssH = Math.max(280, Math.floor(size.h * scale));
  } else {
    const maxW = Math.min(box.width, 1100);
    cssW = Math.max(280, maxW);
    cssH = cssW * (size.h / size.w);
  }
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}

function render() {
  fitCanvas();
  drawCover(ctx, state, canvas.width, canvas.height);
}

function syncPickers() {
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.size === state.size));
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
}

function buildSlots() {
  slotsEl.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'slot';
    card.innerHTML = `
      <div class="slot-head"><span>Panel ${i + 1}</span><span class="slot-photo"></span></div>
      <label class="slot-row"><span>Photo</span><select class="slot-sample"></select></label>
      <label class="slot-row"><span>Upload</span><input type="file" accept="image/*" class="slot-file"></label>
      <label class="slot-row"><span>Zoom</span><input type="range" min="1" max="3" step="0.01" value="${panel.zoom}" class="slot-zoom"></label>
      <label class="slot-row"><span>Pan X</span><input type="range" min="-1" max="1" step="0.01" value="${panel.panX}" class="slot-panx"></label>
      <label class="slot-row"><span>Pan Y</span><input type="range" min="-1" max="1" step="0.01" value="${panel.panY}" class="slot-pany"></label>`;
    const nameEl = card.querySelector('.slot-photo');
    const select = card.querySelector('.slot-sample');
    SAMPLES.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      select.appendChild(opt);
    });
    select.value = panel.sample;
    const showName = () => {
      nameEl.textContent = panel.customName || SAMPLES.find((s) => s.id === panel.sample)?.name || '';
    };
    showName();
    select.addEventListener('change', () => {
      loadSample(panel, select.value);
      showName();
    });
    card.querySelector('.slot-file').addEventListener('change', (e) => {
      loadCustomFile(panel, e.target.files?.[0]);
      showName();
    });
    card.querySelector('.slot-zoom').addEventListener('input', (e) => {
      panel.zoom = Number(e.target.value);
      render();
    });
    card.querySelector('.slot-panx').addEventListener('input', (e) => {
      panel.panX = Number(e.target.value);
      render();
    });
    card.querySelector('.slot-pany').addEventListener('input', (e) => {
      panel.panY = Number(e.target.value);
      render();
    });
    slotsEl.appendChild(card);
  });
}

/** Drag-to-pan and wheel-to-zoom on the preview, per panel. */
function wireCanvasGestures() {
  let drag = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };
  const panelAt = (x, y) => {
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    return panels.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const i = panelAt(p.x, p.y);
    if (i < 0) return;
    drag = { i, x: p.x, y: p.y, panX: state.panels[i].panX, panY: state.panels[i].panY };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCanvas(e);
    const rect = layoutPanels(state.layout, canvas.width, canvas.height)[drag.i];
    const panel = state.panels[drag.i];
    panel.panX = Math.max(-1, Math.min(1, drag.panX + 2 * (p.x - drag.x) / rect.w));
    panel.panY = Math.max(-1, Math.min(1, drag.panY + 2 * (p.y - drag.y) / rect.h));
    render();
  });
  const endDrag = () => {
    drag = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = toCanvas(e);
    const i = panelAt(p.x, p.y);
    if (i < 0) return;
    const panel = state.panels[i];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    render();
  }, { passive: false });
}

async function exportPng() {
  exportBtn.disabled = true;
  exportStatus.textContent = 'Exporting…';
  try {
    const size = SIZES[state.size];
    const out = renderCover(state, state.size);
    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('canvas.toBlob returned nothing');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coral-cover-${state.size}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    exportStatus.textContent = `Exported PNG ${size.w} × ${size.h} · ${(blob.size / 1024).toFixed(0)} KiB`;
    window.__coralLastExport = { w: size.w, h: size.h, bytes: blob.size, ok: true };
  } catch (err) {
    exportStatus.textContent = `Export failed: ${err.message}`;
    window.__coralLastExport = { ok: false, error: String(err) };
  } finally {
    exportBtn.disabled = false;
  }
}

function applyShotParams() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (params.get('layout') && LAYOUTS[params.get('layout')]) state.layout = params.get('layout');
  if (params.get('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (params.get('size') && SIZES[params.get('size')]) state.size = params.get('size');
  if (params.get('caption') !== null) state.caption = params.get('caption');
  if (params.get('subtitle') !== null) state.subtitle = params.get('subtitle');
  // Per-panel photos and horizontal framing, for composed shots: &p1=beach
  // &pan2=-0.9 (panX in half-panel units; the draw clamps it to the photo).
  for (let i = 0; i < 3; i++) {
    const sampleId = params.get(`p${i + 1}`);
    if (sampleId && SAMPLES.some((s) => s.id === sampleId)) state.panels[i].sample = sampleId;
    const pan = Number.parseFloat(params.get(`pan${i + 1}`) ?? '');
    if (Number.isFinite(pan)) state.panels[i].panX = Math.max(-3, Math.min(3, pan));
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  return shot;
}

function init() {
  const shot = applyShotParams();
  buildSlots();
  syncPickers();

  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.addEventListener('click', () => { state.layout = b.dataset.layout; syncPickers(); render(); }));
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.addEventListener('click', () => { state.grade = b.dataset.grade; syncPickers(); render(); }));
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.addEventListener('click', () => { state.size = b.dataset.size; syncPickers(); render(); }));
  captionInput.addEventListener('input', () => { state.caption = captionInput.value; render(); });
  subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; render(); });
  exportBtn.addEventListener('click', exportPng);
  wireCanvasGestures();
  window.addEventListener('resize', render);

  // The three sample photos load automatically when the app opens.
  state.panels.forEach((panel) => loadSample(panel, panel.sample));
  render();
  // If every image is already cached, onload may have fired before we count.
  if (pendingImages === 0) markReady();
  window.__coral = { state, renderCover, SIZES, exportPng, shot };
}

init();
