// Fixed scenes for screenshots: ?shot=cover shows one exported cover full
// screen, ?shot=editor shows the editor with photos loaded, and the other
// shots show the remaining export sizes. Each scene sets
// window.__shotReady once its photos have loaded and the cover is drawn.
export async function runShot(shot, params, app) {
  const { setPhoto, state, redraw, SAMPLES } = app;
  const caption = params.get('caption') || 'SUNSET HEIST';
  const grade = params.get('grade') || 'sunset';
  const layout = params.get('layout') || 'poster';
  const sizeKey = params.get('size') || 'landscape';
  const pick = params.get('photos') || '0,1,2';

  state.caption = caption;
  state.subtitle = params.get('subtitle') || 'CORAL BAY • EST. 2026';
  state.grade = grade;
  state.layout = layout;
  state.sizeKey = sizeKey;
  document.getElementById('caption').value = caption;
  document.getElementById('subtitle').value = state.subtitle;

  const indices = pick.split(',').map((n) => Number(n));
  for (let slot = 0; slot < 3; slot++) {
    try { await setPhoto(slot, SAMPLES[indices[slot] % SAMPLES.length].src); } catch { /* keep going */ }
  }
  // Zoom the hero slightly so the cover reads as a designed poster.
  state.fits[0].zoom = 1.15;
  state.fits[2].zoom = 1.1;
  // Sync the pickers' active state with the scene (they were built from
  // the defaults before this scene overrode them).
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('active', b.dataset.grade === grade));
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('active', b.dataset.size === sizeKey));
  redraw();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
  } else {
    document.body.classList.add('shot-editor');
  }
  // The canvas resizes with the body class; draw once more at final size.
  redraw();
  window.__shotReady = true;
}
