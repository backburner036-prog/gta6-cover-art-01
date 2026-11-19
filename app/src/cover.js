// Coral Cover — the cover-drawing engine.
//
// Draws an original multi-panel GTA-style poster cover onto any canvas:
// the user's photos fill slanted panels, a sunset or neon grade washes over
// them, a soft sun disc decorates one corner (never on the neon grade,
// where a pale sun in a night scene would read as a sticker), and the
// caption is lettered in big outlined capitals across the foot. Nothing here
// copies Rockstar artwork, logos or fonts: every shape is drawn from code
// and every photo is the user's own or one of the bundled AI-made samples.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.35) contrast(1.06) brightness(1.02)',
    top: 'rgba(255, 170, 60, 0.10)',
    bottom: 'rgba(214, 48, 140, 0.34)',
    accent: '#ffd23f',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.45) contrast(1.12) brightness(0.96)',
    top: 'rgba(0, 229, 255, 0.14)',
    bottom: 'rgba(255, 0, 128, 0.38)',
    accent: '#00e5ff',
  },
  dusk: {
    label: 'Palm Dusk',
    filter: 'saturate(1.15) contrast(1.04) brightness(0.94)',
    top: 'rgba(120, 80, 200, 0.16)',
    bottom: 'rgba(40, 10, 70, 0.42)',
    accent: '#ff9e57',
  },
};

// Panel layouts as fractions of the cover (x, y, w, h, photo slot).
// Poster is the multi-panel look; Hero is one full-bleed photo; Split cuts
// the cover diagonally into two photos.
export function panelsFor(layout, sizeKey) {
  if (layout === 'hero') return [{ x: 0, y: 0, w: 1, h: 1, slot: 0 }];
  if (layout === 'split') {
    return [
      { x: 0, y: 0, w: 0.62, h: 1, slot: 0, slant: 0.1 },
      { x: 0.58, y: 0, w: 0.42, h: 1, slot: 1, slant: 0.1 },
    ];
  }
  if (sizeKey === 'landscape') {
    return [
      { x: 0, y: 0, w: 0.58, h: 1, slot: 0 },
      { x: 0.58, y: 0, w: 0.42, h: 0.5, slot: 1 },
      { x: 0.58, y: 0.5, w: 0.42, h: 0.5, slot: 2 },
    ];
  }
  if (sizeKey === 'portrait') {
    return [
      { x: 0, y: 0, w: 1, h: 0.52, slot: 0 },
      { x: 0, y: 0.52, w: 0.5, h: 0.24, slot: 1 },
      { x: 0.5, y: 0.52, w: 0.5, h: 0.24, slot: 2 },
      { x: 0, y: 0.76, w: 1, h: 0.24, slot: 1 },
    ];
  }
  return [
    { x: 0, y: 0, w: 1, h: 0.58, slot: 0 },
    { x: 0, y: 0.58, w: 0.5, h: 0.42, slot: 1 },
    { x: 0.5, y: 0.58, w: 0.5, h: 0.42, slot: 2 },
  ];
}

/** Draws one photo cover-fit into a panel rect, honouring zoom and pan. */
export function drawPhotoPanel(ctx, img, rect, fit) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a2350');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else {
    const zoom = fit?.zoom ?? 1;
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    const dx = x + (w - pw) / 2 + (fit?.ox ?? 0) * w * 0.25;
    const dy = y + (h - ph) / 2 + (fit?.oy ?? 0) * h * 0.25;
    ctx.drawImage(img, dx, dy, pw, ph);
  }
  ctx.restore();
}

/** A ringed sun disc, drawn from paths. */
export function drawSunDisc(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Big outlined caption lettering, slightly tilted, with a tracked subtitle. */
export function drawCaption(ctx, w, h, caption, subtitle, accent) {
  const text = (caption || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  const base = Math.min(w, h);
  ctx.save();
  ctx.translate(w * 0.055, h * 0.9);
  ctx.rotate(-0.035);
  if (text) {
    let size = base * 0.115;
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(text).width > w * 0.9 && size > 18) {
      size -= 3;
      ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", sans-serif`;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(24, 4, 40, 0.92)';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (sub) {
    const sSize = Math.max(13, base * 0.032);
    ctx.font = `700 ${sSize}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(sSize * 0.32)}px`; } catch { /* older canvas */ }
    const barW = Math.min(w * 0.42, ctx.measureText(sub).width + sSize * 1.6);
    ctx.fillStyle = accent;
    ctx.fillRect(0, sSize * 0.55, barW, Math.max(4, sSize * 0.22));
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(sub, 0, sSize * 2.35);
  }
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/**
 * Draws the whole cover onto `canvas` (sized to the export size first).
 * `photos` is an array of 3 images (or nulls); `fits` an array of 3
 * {zoom, ox, oy}; `opts` is {layout, grade, caption, subtitle}.
 */
export function drawCover(canvas, photos, fits, opts) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[opts.grade] || GRADES.sunset;
  const panels = panelsFor(opts.layout, opts.sizeKey);
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.006));

  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  for (const p of panels) {
    const rect = { x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h };
    ctx.save();
    ctx.filter = grade.filter;
    drawPhotoPanel(ctx, photos[p.slot] || null, rect, fits[p.slot]);
    ctx.restore();
  }

  // White gutters between panels, GTA-poster style.
  ctx.fillStyle = '#ffffff';
  for (const p of panels) {
    if (p.x > 0) ctx.fillRect(p.x * w - gutter / 2, p.y * h, gutter, p.h * h);
    if (p.y > 0) ctx.fillRect(p.x * w, p.y * h - gutter / 2, p.w * w, gutter);
  }

  // Grade wash + vignette over the whole cover.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vg = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,0,20,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Corner motif: a soft sun disc in the hero panel's sky, top-right.
  // Skipped on the neon grade: a pale sun over a night scene reads as a
  // sticker pasted on top. Kept soft (0.45 alpha) on sunset and dusk.
  if (opts.grade !== 'neon') {
    const hero = panels[0];
    const hx = hero.x * w + hero.w * w;
    const hy = hero.y * h;
    drawSunDisc(ctx, hx - w * 0.055, hy + h * 0.055, Math.min(w, h) * 0.028, 'rgba(255, 220, 140, 0.45)');
  }

  // Badge top-left: the fictional city, in a pill.
  const badge = '★ CORAL BAY';
  const bSize = Math.max(13, Math.min(w, h) * 0.026);
  ctx.font = `800 ${bSize}px "Helvetica Neue", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(bSize * 0.22)}px`; } catch { /* older canvas */ }
  const bPad = bSize * 0.9;
  const bW = ctx.measureText(badge).width + bPad * 2;
  const bH = bSize * 2.1;
  const bx = w * 0.03;
  const by = h * 0.03;
  ctx.fillStyle = 'rgba(16, 4, 32, 0.72)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bW, bH, bH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bx + bPad, by + bH / 2 + 1);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }

  // Bottom shade so the caption always reads, then the lettering.
  const shade = ctx.createLinearGradient(0, h * 0.68, 0, h);
  shade.addColorStop(0, 'rgba(10, 0, 20, 0)');
  shade.addColorStop(1, 'rgba(10, 0, 20, 0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  drawCaption(ctx, w, h, opts.caption, opts.subtitle, grade.accent);
}
