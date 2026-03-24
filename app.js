/* ═══════════════════════════════════════════
   CONSTRUYE EL COMPÁS — lógica del juego
   ═══════════════════════════════════════════ */

'use strict';

/* ── Definición de figuras musicales ─────────
   beats: duración en tiempos (quarter = 1)
   glyph: símbolo unicode
   name:  nombre en español
─────────────────────────────────────────── */
const NOTES = [
  { id: 'redonda',   glyph: '𝅝',  name: 'Redonda',  beats: 4   },
  { id: 'blanca',    glyph: '𝅗𝅥',  name: 'Blanca',   beats: 2   },
  { id: 'negra',     glyph: '♩',   name: 'Negra',    beats: 1   },
  { id: 'corchea',   glyph: '♪',   name: 'Corchea',  beats: 0.5 },
  { id: 'semicorchea', glyph: '𝅘𝅥𝅯', name: 'Semicorchea', beats: 0.25 },
];

/* ── Niveles del juego ───────────────────────
   tsTop/tsBottom: numerador/denominador del compás
   totalBeats:     tiempos a llenar
   maxNotes:       máx. notas que caben visualmente
   availableNotes: IDs de figuras permitidas
   hint:           pista para el jugador
─────────────────────────────────────────── */
const LEVELS = [
  {
    id: 1,
    tsTop: 4, tsBottom: 4,
    totalBeats: 4,
    maxNotes: 8,
    availableNotes: ['negra'],
    hint: 'Solo negras. Necesitas exactamente 4.',
  },
  {
    id: 2,
    tsTop: 4, tsBottom: 4,
    totalBeats: 4,
    maxNotes: 8,
    availableNotes: ['blanca', 'negra'],
    hint: 'Combina blancas y negras para llegar a 4 tiempos.',
  },
  {
    id: 3,
    tsTop: 3, tsBottom: 4,
    totalBeats: 3,
    maxNotes: 6,
    availableNotes: ['blanca', 'negra'],
    hint: 'Compás de 3/4. Solo 3 tiempos.',
  },
  {
    id: 4,
    tsTop: 4, tsBottom: 4,
    totalBeats: 4,
    maxNotes: 10,
    availableNotes: ['blanca', 'negra', 'corchea'],
    hint: 'Puedes usar corcheas (½ tiempo cada una).',
  },
  {
    id: 5,
    tsTop: 2, tsBottom: 4,
    totalBeats: 2,
    maxNotes: 6,
    availableNotes: ['negra', 'corchea'],
    hint: 'Compás de 2/4. Solo 2 tiempos.',
  },
  {
    id: 6,
    tsTop: 6, tsBottom: 8,
    totalBeats: 3,  // 6 corcheas = 3 negras = totalBeats en unidad negra
    maxNotes: 8,
    availableNotes: ['negra', 'corchea', 'semicorchea'],
    hint: 'Compás de 6/8. Equivale a 3 tiempos de negra.',
  },
  {
    id: 7,
    tsTop: 4, tsBottom: 4,
    totalBeats: 4,
    maxNotes: 12,
    availableNotes: ['redonda', 'blanca', 'negra', 'corchea', 'semicorchea'],
    hint: 'Todas las figuras disponibles. ¡Crea tu ritmo!',
  },
];

/* ── Estado global ───────────────────────── */
const state = {
  currentLevelIndex: 0,
  score: 0,
  placedNotes: [],       // array de objetos { noteId, beats }
  selectedNoteId: null,  // figura activa en la paleta
};

/* ── Referencias al DOM ──────────────────── */
const $ = id => document.getElementById(id);

const screens = {
  intro: $('screen-intro'),
  game:  $('screen-game'),
  end:   $('screen-end'),
};

const dom = {
  hudLevel:    $('hud-level'),
  hudScore:    $('hud-score'),
  tsTop:       $('ts-top'),
  tsBottom:    $('ts-bottom'),
  instruction: $('instruction-text'),
  staff:       $('staff'),
  placedNotes: $('placed-notes'),
  ghostNote:   $('ghost-note'),
  beatsFill:   $('beats-fill'),
  beatsOverflow: $('beats-overflow'),
  beatsLabel:  $('beats-label'),
  palette:     $('palette'),
  btnUndo:     $('btn-undo'),
  btnClear:    $('btn-clear'),
  btnCheck:    $('btn-check'),
  feedback:    $('feedback'),
  feedbackIcon: $('feedback-icon'),
  feedbackMsg: $('feedback-msg'),
  btnNext:     $('btn-next'),
  endScoreText: $('end-score-text'),
};

/* ── Audio (Web Audio API) ───────────────── */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration = 0.12, type = 'sine', gain = 0.3) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* silencioso si no hay soporte */ }
}

function playNoteSound(beats) {
  // Mapeo: más tiempos → tono más grave
  const freqs = { 4: 220, 2: 277, 1: 330, 0.5: 440, 0.25: 523 };
  const freq = freqs[beats] || 330;
  playTone(freq, 0.18);
}

function playSuccess() {
  const notes = [330, 392, 494, 659];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.22, 'triangle', 0.25), i * 100));
}

function playError() {
  playTone(180, 0.3, 'sawtooth', 0.2);
}

function playRemove() {
  playTone(440, 0.08, 'sine', 0.15);
}

/* ── Funciones de UI ─────────────────────── */

/** Cambia la pantalla visible */
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
}

/** Devuelve el nivel actual */
function getCurrentLevel() {
  return LEVELS[state.currentLevelIndex];
}

/** Calcula el total de tiempos colocados */
function getPlacedBeats() {
  return state.placedNotes.reduce((sum, n) => sum + n.beats, 0);
}

/** Actualiza la barra de progreso de tiempos */
function updateBeatsBar() {
  const level = getCurrentLevel();
  const placed = getPlacedBeats();
  const ratio = placed / level.totalBeats;
  const over  = Math.max(0, ratio - 1);
  const fill  = Math.min(1, ratio);

  dom.beatsFill.style.width = (fill * 100) + '%';
  dom.beatsOverflow.style.width = (Math.min(over, 1) * 100) + '%';

  // Formatear fracción si es decimal
  const fmt = n => (Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, ''));
  dom.beatsLabel.textContent = `${fmt(placed)} / ${level.totalBeats} tiempos`;

  // Habilitar botón Verificar solo si los tiempos son exactos
  dom.btnCheck.disabled = Math.abs(placed - level.totalBeats) > 0.001;
}

/** Anima el valor del HUD */
function bumpHud(el) {
  el.classList.remove('bump');
  void el.offsetWidth; // reflow
  el.classList.add('bump');
}

/** Renderiza las notas colocadas en el pentagrama */
function renderPlacedNotes() {
  dom.placedNotes.innerHTML = '';
  state.placedNotes.forEach((entry, index) => {
    const noteDef = NOTES.find(n => n.id === entry.noteId);
    if (!noteDef) return;

    const el = document.createElement('div');
    el.className = 'note-on-staff';
    el.dataset.index = index;
    el.innerHTML = `
      <span class="note-glyph" title="Click para quitar">${noteDef.glyph}</span>
      <span class="note-name-small">${noteDef.name.substring(0,3)}</span>
    `;
    el.addEventListener('click', () => removeNote(index));
    dom.placedNotes.appendChild(el);
  });

  updateBeatsBar();
}

/** Renderiza la paleta de figuras disponibles */
function renderPalette() {
  const level = getCurrentLevel();
  dom.palette.innerHTML = '';

  level.availableNotes.forEach(noteId => {
    const noteDef = NOTES.find(n => n.id === noteId);
    if (!noteDef) return;

    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.noteId = noteId;

    const fmt = b => (Number.isInteger(b) ? b : b.toFixed(2).replace(/\.?0+$/, ''));

    card.innerHTML = `
      <span class="card-count" id="count-${noteId}">0</span>
      <span class="card-glyph">${noteDef.glyph}</span>
      <span class="card-name">${noteDef.name}</span>
      <span class="card-beats">${fmt(noteDef.beats)} tiempo${noteDef.beats !== 1 ? 's' : ''}</span>
    `;

    card.addEventListener('click', () => selectNote(noteId));
    dom.palette.appendChild(card);
  });
}

/** Selecciona una figura en la paleta */
function selectNote(noteId) {
  state.selectedNoteId = (state.selectedNoteId === noteId) ? null : noteId;

  // Actualizar estilos de selección
  dom.palette.querySelectorAll('.note-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.noteId === state.selectedNoteId);
  });

  // Mostrar/ocultar ghost note
  if (state.selectedNoteId) {
    const noteDef = NOTES.find(n => n.id === state.selectedNoteId);
    dom.ghostNote.textContent = noteDef.glyph;
  }
}

/** Coloca la nota seleccionada en el compás */
function placeNote() {
  if (!state.selectedNoteId) return;

  const level = getCurrentLevel();
  const noteDef = NOTES.find(n => n.id === state.selectedNoteId);
  if (!noteDef) return;

  // Verificar si cabe (no sobrepasar más de 1 tiempo de más como tolerancia visual)
  const projected = getPlacedBeats() + noteDef.beats;
  if (projected > level.totalBeats + 0.001) {
    shakeStaff();
    return;
  }

  // Verificar espacio visual
  if (state.placedNotes.length >= level.maxNotes) {
    shakeStaff();
    return;
  }

  state.placedNotes.push({ noteId: state.selectedNoteId, beats: noteDef.beats });
  playNoteSound(noteDef.beats);
  renderPlacedNotes();
  updateNoteCounts();
}

/** Quita la última nota colocada */
function removeNote(index) {
  if (index === undefined) {
    // Deshacer: quitar la última
    state.placedNotes.pop();
  } else {
    state.placedNotes.splice(index, 1);
  }
  playRemove();
  renderPlacedNotes();
  updateNoteCounts();
}

/** Limpia el compás */
function clearNotes() {
  state.placedNotes = [];
  renderPlacedNotes();
  updateNoteCounts();
}

/** Actualiza los badges de conteo en la paleta */
function updateNoteCounts() {
  const level = getCurrentLevel();
  level.availableNotes.forEach(noteId => {
    const count = state.placedNotes.filter(n => n.noteId === noteId).length;
    const badge = document.getElementById(`count-${noteId}`);
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  });
}

/** Anima el pentagrama con shake (error) */
function shakeStaff() {
  dom.staff.classList.remove('shake');
  void dom.staff.offsetWidth;
  dom.staff.classList.add('shake');
  playError();
}

/** Inicia el nivel actual */
function loadLevel() {
  const level = getCurrentLevel();

  // HUD
  dom.hudLevel.textContent = level.id;
  bumpHud(dom.hudLevel);

  // Compás
  dom.tsTop.textContent    = level.tsTop;
  dom.tsBottom.textContent = level.tsBottom;

  // Instrucción
  dom.instruction.textContent =
    `Compás de ${level.tsTop}/${level.tsBottom} — ${level.hint}`;

  // Reset notas
  state.placedNotes = [];
  state.selectedNoteId = null;

  renderPalette();
  renderPlacedNotes();

  // Ocultar feedback
  dom.feedback.classList.add('hidden');
}

/** Verifica si el compás está correcto */
function checkMeasure() {
  const level  = getCurrentLevel();
  const placed = getPlacedBeats();
  const correct = Math.abs(placed - level.totalBeats) < 0.001;

  if (correct) {
    // Puntaje: base por nivel + bonus por pocos pasos
    const bonus = Math.max(0, 10 - state.placedNotes.length);
    const gained = level.id * 10 + bonus;
    state.score += gained;
    dom.hudScore.textContent = state.score;
    bumpHud(dom.hudScore);

    playSuccess();
    showFeedback(true, `+${gained} puntos. ¡Compás perfecto!`);
  } else {
    playError();
    shakeStaff();
  }
}

/** Muestra el panel de feedback */
function showFeedback(success, msg) {
  dom.feedbackIcon.textContent = success ? '✓' : '✗';
  dom.feedbackIcon.style.color = success
    ? 'var(--accent-ok)' : 'var(--accent-err)';
  dom.feedbackMsg.textContent = msg;
  dom.feedback.classList.remove('hidden');
}

/** Avanza al siguiente nivel o termina el juego */
function nextLevel() {
  dom.feedback.classList.add('hidden');
  state.currentLevelIndex++;

  if (state.currentLevelIndex >= LEVELS.length) {
    // Fin del juego
    dom.endScoreText.textContent = `Puntuación final: ${state.score}`;
    showScreen('end');
  } else {
    loadLevel();
  }
}

/** Reinicia el juego completo */
function restartGame() {
  state.currentLevelIndex = 0;
  state.score = 0;
  state.placedNotes = [];
  state.selectedNoteId = null;
  dom.hudScore.textContent = '0';
  loadLevel();
  showScreen('game');
}

/* ── Ghost note: preview en hover del staff ── */
dom.staff.addEventListener('mousemove', (e) => {
  if (!state.selectedNoteId) {
    dom.ghostNote.classList.remove('visible');
    return;
  }
  const rect = dom.staff.getBoundingClientRect();
  const x = e.clientX - rect.left;
  dom.ghostNote.style.left = (x - 16) + 'px';
  dom.ghostNote.classList.add('visible');
});

dom.staff.addEventListener('mouseleave', () => {
  dom.ghostNote.classList.remove('visible');
});

dom.staff.addEventListener('click', () => {
  placeNote();
});

/* ── Eventos ─────────────────────────────── */
$('btn-start').addEventListener('click', () => {
  loadLevel();
  showScreen('game');
});

dom.btnCheck.addEventListener('click', checkMeasure);
dom.btnUndo.addEventListener('click', () => removeNote(undefined));
dom.btnClear.addEventListener('click', clearNotes);
dom.btnNext.addEventListener('click', nextLevel);
$('btn-restart').addEventListener('click', restartGame);

/* ── Teclado ─────────────────────────────── */
document.addEventListener('keydown', (e) => {
  const screens = document.querySelectorAll('.screen.active');
  if (!screens.length) return;

  // Teclas 1-5: seleccionan figuras en la paleta
  if (e.key >= '1' && e.key <= '5') {
    const level = getCurrentLevel();
    const idx   = parseInt(e.key) - 1;
    const noteId = level.availableNotes[idx];
    if (noteId) selectNote(noteId);
  }

  // Espacio o Enter: colocar nota
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    placeNote();
  }

  // Backspace: deshacer
  if (e.key === 'Backspace') {
    e.preventDefault();
    removeNote(undefined);
  }

  // V: verificar
  if (e.key === 'v' || e.key === 'V') {
    if (!dom.btnCheck.disabled) checkMeasure();
  }
});

/* ── Init ────────────────────────────────── */
showScreen('intro');
