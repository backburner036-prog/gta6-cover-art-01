// Coral Cover — the cover engine (pure canvas, no DOM, no network).
//
// Draws a multi-panel GTA-style poster cover for the fictional city of
// Coral Bay: three photo panels with white gutters, a colour grade, a sun
// disc (every grade except Neon Night), a slanted bold caption with a thick
// outline, a subtitle accent bar and the city badge. Everything is drawn
// with the 2D canvas API and system fonts only: no Rockstar logo, artwork
// or font is used anywhere.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape · 1920 × 1080' },
};

export const LAYOUTS = {
  poster: 'Poster',
  hero: 'Hero',
  split: 'Split',
};

export const GRADES = {
  sunset: 'Sunset',
  neon: 'Neon Night',
  dusk: 'Palm Dusk',
};

export const CITY_BADGE = '★ CORAL BAY';

/** The canvas filter a grade puts on every photo before it is drawn. */
export function gradeFilter(grade) {
  if (grade === 'neon') return 'saturate(1.35) contrast(1.12) brightness(0.94) hue-rotate(12deg)';
  if (grade === 'dusk') return 'saturate(1.2) contrast(1.05) sepia(0.12) hue-rotate(-18deg)';
  return 'saturate(1.25) contrast(1.06) sepia(0.18) hue-rotate(-8deg)';
}

/** The three panel rectangles for a layout, with white gutters between them. */
export function layoutPanels(layout, W, H) {
  const g = Math.max(6, Math.round(Math.min(W, H) * 0.008)); // gutter, white
  if (layout === 'hero') {
    const leftW = Math.round(W * 0.6) - g;
    const rightX = leftW + g;
    const rightW = W - rightX;
    const halfH = Math.round((H - g) / 2);
    return [
      { x: 0, y: 0, w: leftW, h: H },
      { x: rightX, y: 0, w: rightW, h: halfH },
      { x: rightX, y: halfH + g, w: rightW, h: H - halfH - g },
    ];
  }
  if (layout === 'split') {
    const w = Math.round((W - 2 * g) / 3);
    return [
      { x: 0, y: 0, w, h: H },
      { x: w + g, y: 0, w, h: H },
      { x: 2 * (w + g), y: 0, w: W - 2 * (w + g), h: H },
    ];
  }
  // poster: one wide panel on top, two side by side below it.
  const topH = Math.round(H * 0.58) - g;
  const bottomY = topH + g;
  const bottomH = H - bottomY;
  const halfW = Math.round((W - g) / 2);
  return [
    { x: 0, y: 0, w: W, h: topH },
    { x: 0, y: bottomY, w: halfW, h: bottomH },
    { x: halfW + g, y: bottomY, w: W - halfW - g, h: bottomH },
  ];
}

/** Where the sun disc sits for a layout (null: Neon Night hides it). */
export function sunDiscSpot(layout, grade, W, H) {
  if (grade === 'neon') return null;
  const r = Math.round(Math.min(W, H) * 0.075);
  if (layout === 'hero') return { x: Math.round(W * 0.3), y: Math.round(H * 0.2), r };
  if (layout === 'split') return { x: Math.round(W * 0.5), y: Math.round(H * 0.16), r };
  return { x: Math.round(W * 0.78), y: Math.round(H * 0.16), r };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Draws one photo cover-fit inside a panel rect. zoom 1 fills the panel;
 * panX/panY shift it in units of half a panel width/height, clamped so the
 * photo never leaves a gap at the panel's edge.
 */
export function drawPhotoCover(ctx, img, rect, zoom, panX, panY) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = rect.x + (rect.w - dw) / 2 + panX * rect.w * 0.5;
  let dy = rect.y + (rect.h - dh) / 2 + panY * rect.h * 0.5;
  if (dw > rect.w) dx = clamp(dx, rect.x + rect.w - dw, rect.x);
  else dx = rect.x + (rect.w - dw) / 2;
  if (dh > rect.h) dy = clamp(dy, rect.y + rect.h - dh, rect.y);
  else dy = rect.y + (rect.h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** A grade's colour wash over one panel, drawn after its photo. */
function gradeWash(ctx, grade, rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (grade === 'neon') {
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255, 45, 149, 0.16)');
    wash.addColorStop(0.55, 'rgba(20, 10, 60, 0.10)');
    wash.addColorStop(1, 'rgba(0, 229, 255, 0.16)');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (grade === 'dusk') {
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(122, 62, 180, 0.14)');
    wash.addColorStop(1, 'rgba(255, 94, 98, 0.20)');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255, 170, 60, 0.10)');
    wash.addColorStop(1, 'rgba(255, 60, 120, 0.18)');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

/** The sun disc: a cream core with a warm glow. Never drawn for Neon Night. */
function drawSunDisc(ctx, spot, grade) {
  const glow = ctx.createRadialGradient(spot.x, spot.y, spot.r * 0.2, spot.x, spot.y, spot.r * 2.1);
  glow.addColorStop(0, grade === 'dusk' ? 'rgba(255, 176, 102, 0.55)' : 'rgba(255, 214, 140, 0.5)');
  glow.addColorStop(1, 'rgba(255, 180, 110, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, spot.r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = grade === 'dusk' ? '#ffd9a0' : '#fff3d6';
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
  ctx.fill();
}

/** A soft vignette over the whole cover. */
function drawVignette(ctx, W, H, grade) {
  const strength = grade === 'neon' ? 0.42 : 0.3;
  const v = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  v.addColorStop(0, 'rgba(8, 4, 20, 0)');
  v.addColorStop(1, `rgba(8, 4, 20, ${strength})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function drawBadge(ctx, W, H) {
  const fs = Math.max(20, Math.round(W * 0.021));
  ctx.save();
  ctx.font = `900 ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(fs * 0.14)}px`; } catch { /* older canvas: no letterSpacing */ }
  const textW = ctx.measureText(CITY_BADGE).width;
  const padX = Math.round(fs * 0.7);
  const padY = Math.round(fs * 0.42);
  const bx = Math.round(W * 0.035);
  const by = Math.round(H * 0.035);
  const bw = Math.round(textW + padX * 2);
  const bh = Math.round(fs + padY * 2);
  const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
  grad.addColorStop(0, '#ff5a5f');
  grad.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = grad;
  roundRectPath(ctx, bx, by, bw, bh, Math.round(bh / 2));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(CITY_BADGE, bx + padX, by + bh / 2 + 1);
  ctx.restore();
}

function drawCaption(ctx, state, W, H) {
  const caption = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!caption && !subtitle) return;

  // Bottom scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, H * 0.62, 0, H);
  scrim.addColorStop(0, 'rgba(10, 6, 18, 0)');
  scrim.addColorStop(1, 'rgba(10, 6, 18, 0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, Math.round(H * 0.62), W, Math.round(H * 0.38));

  const left = Math.round(W * 0.045);
  const baseY = H - Math.round(H * 0.075);
  ctx.save();
  ctx.translate(left, baseY);
  ctx.rotate(-2 * Math.PI / 180); // slanted lettering, -2 degrees
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // The caption's size first: the subtitle bar sits above its cap height,
  // never behind the lettering.
  const capFs = caption ? Math.max(44, Math.round(W * 0.082)) : 0;

  if (subtitle) {
    const subFs = Math.max(16, Math.round(W * 0.017));
    ctx.font = `800 ${subFs}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subFs * 0.22)}px`; } catch { /* no letterSpacing */ }
    const subW = ctx.measureText(subtitle).width;
    const barH = Math.round(subFs * 1.9);
    const barPad = Math.round(subFs * 0.6);
    const barTop = -Math.round(capFs + barH + subFs * 0.6);
    ctx.fillStyle = '#ff5a5f';
    roundRectPath(ctx, 0, barTop, Math.round(subW + barPad * 2), barH, Math.round(barH / 2));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, barPad, barTop + barH / 2 + Math.round(subFs * 0.36));
  }

  if (caption) {
    ctx.font = `italic 900 ${capFs}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    try { ctx.letterSpacing = '0px'; } catch { /* no letterSpacing */ }
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = '#14101f';
    ctx.lineWidth = Math.max(6, Math.round(capFs * 0.14));
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.round(capFs * 0.07);
    ctx.shadowOffsetY = Math.round(capFs * 0.03);
    ctx.strokeText(caption, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(caption, 0, 0);
  }
  ctx.restore();
}

/**
 * Draws the whole cover onto ctx at W x H.
 * state: { panels: [{img, zoom, panX, panY}] x3, caption, subtitle, layout, grade }
 * A panel whose image has not loaded yet gets a warm placeholder gradient.
 */
export function drawCover(ctx, state, W, H) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; // white gutters between panels
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout, W, H);
  panels.forEach((rect, i) => {
    const panel = state.panels[i] ?? {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.img && (panel.img.naturalWidth || panel.img.width)) {
      ctx.filter = gradeFilter(state.grade);
      drawPhotoCover(ctx, panel.img, rect, panel.zoom ?? 1, panel.panX ?? 0, panel.panY ?? 0);
      ctx.filter = 'none';
    } else {
      const ph = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      ph.addColorStop(0, '#ff8a5c');
      ph.addColorStop(1, '#c94b7c');
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradeWash(ctx, state.grade, rect);
    ctx.restore();
  });

  const spot = sunDiscSpot(state.layout, state.grade, W, H);
  if (spot) drawSunDisc(ctx, spot, state.grade);
  drawVignette(ctx, W, H, state.grade);
  drawBadge(ctx, W, H);
  drawCaption(ctx, state, W, H);
  ctx.restore();
}

/** Renders a fresh canvas of the cover at the export size. */
export function renderCover(state, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES.landscape;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext('2d'), state, size.w, size.h);
  return canvas;
}
