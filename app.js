/* ═══════════════════════════════════════════
   CONSTRUYE EL COMPÁS — Musicala
   app.js completo y mejorado

   Incluye:
   - Pantallas intro / juego / final
   - HUD de puntos, nivel y racha
   - Botón Play real
   - Reproducción animada nota por nota
   - Cursor visual en barra de beats
   - Racha con bonus
   - Confetti al finalizar
   - Level dots
   - Feedback con título + mensaje
   - Barras de duración en cards
   - Teclado: 1-5, espacio, enter, backspace, V, P
   ═══════════════════════════════════════════ */

"use strict";

/* ─────────────────────────────────────────────
   CONFIGURACIÓN GENERAL
───────────────────────────────────────────── */

const GAME_CONFIG = {
  bpm: 84,
  confettiParticles: 150,
  errorFeedbackMs: 1600,
  successFeedbackMs: 0,
  scoreBaseMultiplier: 10,
  compactBonusBase: 10,
  streakBonusStart: 3,
  streakBonusValue: 5,
};

const NOTES = [
  {
    id: "redonda",
    glyph: "𝅝",
    name: "Redonda",
    beats: 4,
    colorClass: "note-redonda",
  },
  {
    id: "blanca",
    glyph: "𝅗𝅥",
    name: "Blanca",
    beats: 2,
    colorClass: "note-blanca",
  },
  {
    id: "negra",
    glyph: "♩",
    name: "Negra",
    beats: 1,
    colorClass: "note-negra",
  },
  {
    id: "corchea",
    glyph: "♪",
    name: "Corchea",
    beats: 0.5,
    colorClass: "note-corchea",
  },
  {
    id: "semicorchea",
    glyph: "𝅘𝅥𝅯",
    name: "Semicorchea",
    beats: 0.25,
    colorClass: "note-semicorchea",
  },
];

const LEVELS = [
  {
    id: 1,
    tsTop: 4,
    tsBottom: 4,
    totalBeats: 4,
    maxNotes: 8,
    availableNotes: ["negra"],
    title: "Negras al rescate",
    hint: "Solo negras. Necesitas exactamente 4.",
  },
  {
    id: 2,
    tsTop: 4,
    tsBottom: 4,
    totalBeats: 4,
    maxNotes: 8,
    availableNotes: ["blanca", "negra"],
    title: "Blancas y negras",
    hint: "Combina blancas y negras para llegar a 4 tiempos.",
  },
  {
    id: 3,
    tsTop: 3,
    tsBottom: 4,
    totalBeats: 3,
    maxNotes: 6,
    availableNotes: ["blanca", "negra"],
    title: "Tres tiempos",
    hint: "Compás de 3/4. Solo necesitas 3 tiempos.",
  },
  {
    id: 4,
    tsTop: 4,
    tsBottom: 4,
    totalBeats: 4,
    maxNotes: 10,
    availableNotes: ["blanca", "negra", "corchea"],
    title: "Llegaron las corcheas",
    hint: "Puedes usar corcheas. Cada una vale ½ tiempo.",
  },
  {
    id: 5,
    tsTop: 2,
    tsBottom: 4,
    totalBeats: 2,
    maxNotes: 6,
    availableNotes: ["negra", "corchea"],
    title: "Compás cortico",
    hint: "Compás de 2/4. No te emociones, son solo 2 tiempos.",
  },
  {
    id: 6,
    tsTop: 6,
    tsBottom: 8,
    totalBeats: 3,
    maxNotes: 12,
    availableNotes: ["negra", "corchea", "semicorchea"],
    title: "Subdivisión ninja",
    hint: "Compás de 6/8. Equivale a 3 tiempos de negra.",
  },
  {
    id: 7,
    tsTop: 4,
    tsBottom: 4,
    totalBeats: 4,
    maxNotes: 16,
    availableNotes: ["redonda", "blanca", "negra", "corchea", "semicorchea"],
    title: "Modo compositor",
    hint: "Todas las figuras disponibles. Construye tu compás perfecto.",
  },
];

/* ─────────────────────────────────────────────
   ESTADO GLOBAL
───────────────────────────────────────────── */

const state = {
  currentLevelIndex: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  placedNotes: [],
  selectedNoteId: null,
  isPlaying: false,
  audioReady: false,
};

/* ─────────────────────────────────────────────
   DOM
───────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

const dom = {
  screens: {
    intro: $("screen-intro"),
    game: $("screen-game"),
    end: $("screen-end"),
  },

  btnStart: $("btn-start"),
  btnRestart: $("btn-restart"),

  hudScore: $("hud-score"),
  hudLevel: $("hud-level"),
  hudStreak: $("hud-streak"),

  tsTop: $("ts-top"),
  tsBottom: $("ts-bottom"),
  instructionText: $("instruction-text"),

  levelDots: $("level-dots"),

  staff: $("staff"),
  placedNotes: $("placed-notes"),
  ghostNote: $("ghost-note"),

  beatsBar: $("beats-bar"),
  beatsFill: $("beats-fill"),
  beatsOverflow: $("beats-overflow"),
  beatTicks: $("beat-ticks"),
  beatsLabel: $("beats-label"),
  playbackCursor: $("playback-cursor"),

  palette: $("palette"),

  btnUndo: $("btn-undo"),
  btnClear: $("btn-clear"),
  btnPlay: $("btn-play"),
  btnCheck: $("btn-check"),
  btnNext: $("btn-next"),

  feedback: $("feedback"),
  feedbackIcon: $("feedback-icon"),
  feedbackTitle: $("feedback-title"),
  feedbackMsg: $("feedback-msg"),

  endScore: $("end-score"),
  endStreak: $("end-streak"),

  confettiCanvas: $("confetti-canvas"),
};

validateDom();

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function validateDom() {
  const missing = [];

  Object.entries(dom).forEach(([key, value]) => {
    if (key === "screens") {
      Object.entries(value).forEach(([screenKey, screenEl]) => {
        if (!screenEl) missing.push(`screen.${screenKey}`);
      });
      return;
    }

    if (!value) missing.push(key);
  });

  if (missing.length > 0) {
    console.warn(
      "Faltan elementos en el HTML para app.js:",
      missing.join(", ")
    );
  }
}

function getCurrentLevel() {
  return LEVELS[state.currentLevelIndex];
}

function getNoteById(noteId) {
  return NOTES.find((note) => note.id === noteId);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBeats(value) {
  if (Number.isInteger(value)) return String(value);

  return Number(value)
    .toFixed(2)
    .replace(/\.?0+$/, "");
}

function almostEqual(a, b) {
  return Math.abs(a - b) < 0.001;
}

function getPlacedBeats() {
  return state.placedNotes.reduce((sum, note) => sum + note.beats, 0);
}

function getRemainingBeats() {
  return getCurrentLevel().totalBeats - getPlacedBeats();
}

function getBeatDurationMs() {
  return (60 / GAME_CONFIG.bpm) * 1000;
}

function safeSetText(element, text) {
  if (element) element.textContent = text;
}

function safeSetWidth(element, value) {
  if (element) element.style.width = value;
}

function bumpElement(element) {
  if (!element) return;

  element.classList.remove("bump");
  void element.offsetWidth;
  element.classList.add("bump");
}

function shakeElement(element) {
  if (!element) return;

  element.classList.remove("shake");
  void element.offsetWidth;
  element.classList.add("shake");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* ─────────────────────────────────────────────
   AUDIO
───────────────────────────────────────────── */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }

  return audioCtx;
}

async function unlockAudio() {
  try {
    const ctx = getAudioContext();

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    state.audioReady = true;
  } catch (error) {
    console.warn("No se pudo iniciar el audio:", error);
  }
}

function playTone({
  frequency = 440,
  duration = 0.16,
  type = "sine",
  gain = 0.18,
  attack = 0.01,
  release = 0.04,
} = {}) {
  try {
    const ctx = getAudioContext();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      gain,
      ctx.currentTime + attack
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration + release
    );

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration + release + 0.02);
  } catch (error) {
    console.warn("Error reproduciendo tono:", error);
  }
}

function playNoteSound(beats) {
  const frequencies = {
    4: 196,
    2: 261.63,
    1: 329.63,
    0.5: 440,
    0.25: 523.25,
  };

  const frequency = frequencies[beats] || 329.63;
  const duration = clamp(0.09 + beats * 0.08, 0.09, 0.34);

  playTone({
    frequency,
    duration,
    type: beats <= 0.5 ? "triangle" : "sine",
    gain: 0.2,
  });
}

function playClickSound() {
  playTone({
    frequency: 700,
    duration: 0.05,
    type: "triangle",
    gain: 0.09,
  });
}

function playRemoveSound() {
  playTone({
    frequency: 390,
    duration: 0.08,
    type: "sine",
    gain: 0.11,
  });
}

function playErrorSound() {
  playTone({
    frequency: 160,
    duration: 0.2,
    type: "sawtooth",
    gain: 0.1,
  });

  setTimeout(() => {
    playTone({
      frequency: 130,
      duration: 0.18,
      type: "sawtooth",
      gain: 0.08,
    });
  }, 80);
}

function playSuccessSound() {
  const melody = [329.63, 392, 493.88, 659.25];

  melody.forEach((frequency, index) => {
    setTimeout(() => {
      playTone({
        frequency,
        duration: 0.18,
        type: "triangle",
        gain: 0.15,
      });
    }, index * 90);
  });
}

function playFinalSound() {
  const melody = [261.63, 329.63, 392, 523.25, 659.25, 783.99];

  melody.forEach((frequency, index) => {
    setTimeout(() => {
      playTone({
        frequency,
        duration: 0.22,
        type: "triangle",
        gain: 0.16,
      });
    }, index * 95);
  });
}

/* ─────────────────────────────────────────────
   PANTALLAS
───────────────────────────────────────────── */

function showScreen(screenName) {
  Object.entries(dom.screens).forEach(([key, screen]) => {
    if (!screen) return;
    screen.classList.toggle("active", key === screenName);
  });
}

function isGameScreenActive() {
  return dom.screens.game?.classList.contains("active");
}

/* ─────────────────────────────────────────────
   RENDER NIVEL
───────────────────────────────────────────── */

function renderHud() {
  const level = getCurrentLevel();

  safeSetText(dom.hudScore, state.score);
  safeSetText(dom.hudLevel, `${level.id}/${LEVELS.length}`);
  safeSetText(dom.hudStreak, state.streak);

  if (dom.hudStreak) {
    dom.hudStreak.classList.toggle("hot", state.streak >= 3);
  }
}

function renderLevelInfo() {
  const level = getCurrentLevel();

  safeSetText(dom.tsTop, level.tsTop);
  safeSetText(dom.tsBottom, level.tsBottom);

  safeSetText(
    dom.instructionText,
    `${level.title}: compás de ${level.tsTop}/${level.tsBottom}. ${level.hint}`
  );
}

function renderLevelDots() {
  if (!dom.levelDots) return;

  dom.levelDots.innerHTML = "";

  LEVELS.forEach((level, index) => {
    const dot = document.createElement("span");
    dot.className = "level-dot";
    dot.setAttribute("aria-label", `Nivel ${level.id}`);

    if (index < state.currentLevelIndex) {
      dot.classList.add("done");
    }

    if (index === state.currentLevelIndex) {
      dot.classList.add("current");
    }

    dom.levelDots.appendChild(dot);
  });
}

function renderBeatTicks() {
  const level = getCurrentLevel();

  if (!dom.beatTicks) return;

  dom.beatTicks.innerHTML = "";

  const subdivisions = Math.max(1, Math.round(level.totalBeats * 2));

  for (let i = 1; i < subdivisions; i += 1) {
    const tick = document.createElement("span");
    const isMainBeat = i % 2 === 0;

    tick.className = isMainBeat ? "beat-tick main" : "beat-tick sub";
    tick.style.left = `${(i / subdivisions) * 100}%`;

    dom.beatTicks.appendChild(tick);
  }
}

function renderPalette() {
  const level = getCurrentLevel();

  if (!dom.palette) return;

  dom.palette.innerHTML = "";

  const availableNotes = level.availableNotes
    .map(getNoteById)
    .filter(Boolean);

  const maxBeats = Math.max(...availableNotes.map((note) => note.beats));

  availableNotes.forEach((note, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `note-card ${note.colorClass}`;
    card.dataset.noteId = note.id;
    card.title = `Seleccionar ${note.name}`;
    card.setAttribute(
      "aria-label",
      `${index + 1}. ${note.name}, ${formatBeats(note.beats)} tiempo${
        note.beats === 1 ? "" : "s"
      }`
    );

    const barWidth = Math.round((note.beats / maxBeats) * 100);

    card.innerHTML = `
      <span class="card-count" id="count-${note.id}">0</span>

      <span class="card-key">${index + 1}</span>

      <span class="card-glyph" aria-hidden="true">${note.glyph}</span>

      <span class="card-name">${note.name}</span>

      <span class="card-beats">
        ${formatBeats(note.beats)} tiempo${note.beats === 1 ? "" : "s"}
      </span>

      <span class="card-duration-bar" aria-hidden="true">
        <span class="card-duration-fill" style="width: ${barWidth}%"></span>
      </span>
    `;

    card.addEventListener("click", () => {
      unlockAudio();
      selectNote(note.id);
      playClickSound();
    });

    dom.palette.appendChild(card);
  });
}

function renderPlacedNotes() {
  if (!dom.placedNotes) return;

  dom.placedNotes.innerHTML = "";

  let accumulatedBeats = 0;
  const totalBeats = getCurrentLevel().totalBeats;

  state.placedNotes.forEach((entry, index) => {
    const note = getNoteById(entry.noteId);

    if (!note) return;

    const noteElement = document.createElement("button");
    noteElement.type = "button";
    noteElement.className = `note-on-staff ${note.colorClass}`;
    noteElement.dataset.index = String(index);
    noteElement.dataset.noteId = note.id;

    const startPercent = (accumulatedBeats / totalBeats) * 100;
    const widthPercent = (entry.beats / totalBeats) * 100;

    noteElement.style.left = `${startPercent}%`;
    noteElement.style.width = `${Math.max(widthPercent, 8)}%`;
    noteElement.style.setProperty("--note-width", `${widthPercent}%`);

    noteElement.title = `${note.name}: ${formatBeats(note.beats)} tiempo${
      note.beats === 1 ? "" : "s"
    }. Clic para quitar.`;

    noteElement.innerHTML = `
      <span class="note-glyph">${note.glyph}</span>
      <span class="note-label">${note.name}</span>
    `;

    noteElement.addEventListener("click", (event) => {
      event.stopPropagation();
      removeNote(index);
    });

    dom.placedNotes.appendChild(noteElement);
    accumulatedBeats += entry.beats;
  });

  updateBeatsBar();
  updateNoteCounts();
  updateControls();
}

function updateBeatsBar() {
  const level = getCurrentLevel();
  const placedBeats = getPlacedBeats();
  const ratio = placedBeats / level.totalBeats;

  const fillRatio = clamp(ratio, 0, 1);
  const overflowRatio = clamp(ratio - 1, 0, 1);

  safeSetWidth(dom.beatsFill, `${fillRatio * 100}%`);
  safeSetWidth(dom.beatsOverflow, `${overflowRatio * 100}%`);

  safeSetText(
    dom.beatsLabel,
    `${formatBeats(placedBeats)} / ${formatBeats(level.totalBeats)} tiempos`
  );

  if (dom.beatsBar) {
    dom.beatsBar.classList.toggle("complete", almostEqual(placedBeats, level.totalBeats));
    dom.beatsBar.classList.toggle("overflow", placedBeats > level.totalBeats);
    dom.beatsBar.classList.toggle("empty", placedBeats === 0);
  }

  updatePaletteAvailability();
}

function updatePaletteAvailability() {
  if (!dom.palette) return;

  const remaining = getRemainingBeats();

  dom.palette.querySelectorAll(".note-card").forEach((card) => {
    const note = getNoteById(card.dataset.noteId);

    if (!note) return;

    const wouldOverflow = note.beats > remaining + 0.001;
    const blockedByMaxNotes = state.placedNotes.length >= getCurrentLevel().maxNotes;

    card.classList.toggle("exhausted", wouldOverflow || blockedByMaxNotes);
    card.disabled = state.isPlaying;
  });
}

function updateNoteCounts() {
  const level = getCurrentLevel();

  level.availableNotes.forEach((noteId) => {
    const countElement = $(`count-${noteId}`);

    if (!countElement) return;

    const count = state.placedNotes.filter((entry) => entry.noteId === noteId).length;

    countElement.textContent = String(count);
    countElement.classList.toggle("visible", count > 0);
  });
}

function updateControls() {
  const placedBeats = getPlacedBeats();
  const hasNotes = state.placedNotes.length > 0;
  const isComplete = almostEqual(placedBeats, getCurrentLevel().totalBeats);

  if (dom.btnUndo) {
    dom.btnUndo.disabled = !hasNotes || state.isPlaying;
  }

  if (dom.btnClear) {
    dom.btnClear.disabled = !hasNotes || state.isPlaying;
  }

  if (dom.btnPlay) {
    dom.btnPlay.disabled = !hasNotes || state.isPlaying;
    dom.btnPlay.classList.toggle("playing", state.isPlaying);
  }

  if (dom.btnCheck) {
    dom.btnCheck.disabled = !isComplete || state.isPlaying;
  }
}

/* ─────────────────────────────────────────────
   SELECCIÓN Y GHOST NOTE
───────────────────────────────────────────── */

function selectNote(noteId) {
  if (state.isPlaying) return;

  const note = getNoteById(noteId);

  if (!note) return;

  state.selectedNoteId = state.selectedNoteId === noteId ? null : noteId;

  if (dom.palette) {
    dom.palette.querySelectorAll(".note-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.noteId === state.selectedNoteId);
    });
  }

  if (!dom.ghostNote) return;

  if (state.selectedNoteId) {
    const selectedNote = getNoteById(state.selectedNoteId);
    dom.ghostNote.textContent = selectedNote?.glyph || "";
  } else {
    dom.ghostNote.textContent = "";
    dom.ghostNote.classList.remove("visible");
  }
}

function updateGhostNotePosition(event) {
  if (!dom.staff || !dom.ghostNote || !state.selectedNoteId || state.isPlaying) {
    dom.ghostNote?.classList.remove("visible");
    return;
  }

  const rect = dom.staff.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  dom.ghostNote.style.left = `${x}px`;
  dom.ghostNote.style.top = `${y}px`;
  dom.ghostNote.classList.add("visible");
}

function hideGhostNote() {
  if (!dom.ghostNote) return;
  dom.ghostNote.classList.remove("visible");
}

/* ─────────────────────────────────────────────
   ACCIONES DE NOTAS
───────────────────────────────────────────── */

function placeNote() {
  if (!state.selectedNoteId || state.isPlaying) return;

  const level = getCurrentLevel();
  const note = getNoteById(state.selectedNoteId);

  if (!note) return;

  const projectedBeats = getPlacedBeats() + note.beats;

  if (state.placedNotes.length >= level.maxNotes) {
    showMicroFeedback("Máximo de notas alcanzado. El pentagrama tampoco es un trasteo.");
    rejectAction();
    return;
  }

  if (projectedBeats > level.totalBeats + 0.001) {
    showMicroFeedback("Esa figura se pasa del compás.");
    rejectAction();
    return;
  }

  state.placedNotes.push({
    noteId: note.id,
    beats: note.beats,
  });

  playNoteSound(note.beats);
  renderPlacedNotes();

  const lastNote = dom.placedNotes?.querySelector(
    `.note-on-staff[data-index="${state.placedNotes.length - 1}"]`
  );

  if (lastNote) {
    lastNote.classList.add("added");

    setTimeout(() => {
      lastNote.classList.remove("added");
    }, 260);
  }
}

function removeNote(index) {
  if (state.isPlaying || state.placedNotes.length === 0) return;

  if (typeof index === "number") {
    state.placedNotes.splice(index, 1);
  } else {
    state.placedNotes.pop();
  }

  playRemoveSound();
  renderPlacedNotes();
}

function clearNotes() {
  if (state.isPlaying || state.placedNotes.length === 0) return;

  state.placedNotes = [];
  playRemoveSound();
  renderPlacedNotes();
}

function rejectAction() {
  shakeElement(dom.staff);
  shakeElement(dom.beatsBar);
  playErrorSound();
}

function showMicroFeedback(message) {
  if (!dom.beatsLabel) return;

  const previousText = `${formatBeats(getPlacedBeats())} / ${formatBeats(
    getCurrentLevel().totalBeats
  )} tiempos`;

  dom.beatsLabel.textContent = message;
  dom.beatsLabel.classList.add("warning");

  setTimeout(() => {
    dom.beatsLabel.classList.remove("warning");
    dom.beatsLabel.textContent = previousText;
  }, 1100);
}

/* ─────────────────────────────────────────────
   REPRODUCCIÓN ANIMADA
───────────────────────────────────────────── */

async function playMeasure() {
  if (state.isPlaying || state.placedNotes.length === 0) return;

  await unlockAudio();

  state.isPlaying = true;
  updateControls();

  dom.staff?.classList.add("is-playing");
  dom.btnPlay?.classList.add("playing");

  if (dom.playbackCursor) {
    dom.playbackCursor.style.left = "0%";
    dom.playbackCursor.classList.add("visible");
  }

  const level = getCurrentLevel();
  const beatDuration = getBeatDurationMs();
  const noteElements = Array.from(
    dom.placedNotes?.querySelectorAll(".note-on-staff") || []
  );

  let elapsedBeats = 0;

  for (let index = 0; index < state.placedNotes.length; index += 1) {
    const entry = state.placedNotes[index];
    const noteElement = noteElements[index];

    const startPercent = (elapsedBeats / level.totalBeats) * 100;

    if (dom.playbackCursor) {
      dom.playbackCursor.style.left = `${startPercent}%`;
    }

    noteElement?.classList.add("playing");

    playNoteSound(entry.beats);

    await sleep(entry.beats * beatDuration);

    noteElement?.classList.remove("playing");

    elapsedBeats += entry.beats;
  }

  if (dom.playbackCursor) {
    dom.playbackCursor.style.left = `${Math.min(
      (elapsedBeats / level.totalBeats) * 100,
      100
    )}%`;

    await sleep(140);

    dom.playbackCursor.classList.remove("visible");
  }

  dom.staff?.classList.remove("is-playing");
  dom.btnPlay?.classList.remove("playing");

  state.isPlaying = false;
  updateControls();
}

/* ─────────────────────────────────────────────
   VERIFICACIÓN, PUNTAJE Y RACHA
───────────────────────────────────────────── */

function checkMeasure() {
  if (state.isPlaying) return;

  const level = getCurrentLevel();
  const placedBeats = getPlacedBeats();
  const isCorrect = almostEqual(placedBeats, level.totalBeats);

  if (!isCorrect) {
    state.streak = 0;
    renderHud();
    rejectAction();

    showFeedback({
      success: false,
      title: "Todavía no cuadra",
      message: `El compás suma ${formatBeats(placedBeats)} tiempos y debe sumar ${formatBeats(
        level.totalBeats
      )}. Casi, pero las matemáticas decidieron aparecer.`,
      autoHide: true,
    });

    return;
  }

  const gained = calculateScoreForLevel(level);

  state.score += gained;
  state.streak += 1;
  state.maxStreak = Math.max(state.maxStreak, state.streak);

  renderHud();
  bumpElement(dom.hudScore);
  bumpElement(dom.hudStreak);

  playSuccessSound();

  const streakBonus = getStreakBonus();

  const streakText =
    state.streak >= GAME_CONFIG.streakBonusStart
      ? ` Racha x${state.streak}: +${streakBonus} bonus 🔥`
      : "";

  showFeedback({
    success: true,
    title: "¡Compás perfecto!",
    message: `Ganaste +${gained} puntos.${streakText}`,
    autoHide: false,
  });
}

function calculateScoreForLevel(level) {
  const base = level.id * GAME_CONFIG.scoreBaseMultiplier;
  const compactBonus = Math.max(
    0,
    GAME_CONFIG.compactBonusBase - state.placedNotes.length
  );
  const streakBonus = getStreakBonus();

  return base + compactBonus + streakBonus;
}

function getStreakBonus() {
  if (state.streak + 1 < GAME_CONFIG.streakBonusStart) return 0;

  return Math.max(
    0,
    (state.streak + 1 - (GAME_CONFIG.streakBonusStart - 1)) *
      GAME_CONFIG.streakBonusValue
  );
}

/* ─────────────────────────────────────────────
   FEEDBACK
───────────────────────────────────────────── */

let feedbackTimeout = null;

function showFeedback({ success, title, message, autoHide }) {
  if (!dom.feedback) return;

  clearTimeout(feedbackTimeout);

  dom.feedback.classList.remove("hidden", "success", "error");
  dom.feedback.classList.add(success ? "success" : "error");

  safeSetText(dom.feedbackIcon, success ? "✓" : "✕");
  safeSetText(dom.feedbackTitle, title);
  safeSetText(dom.feedbackMsg, message);

  if (dom.btnNext) {
    dom.btnNext.style.display = success ? "" : "none";
  }

  if (autoHide) {
    feedbackTimeout = setTimeout(() => {
      hideFeedback();
    }, GAME_CONFIG.errorFeedbackMs);
  }
}

function hideFeedback() {
  dom.feedback?.classList.add("hidden");
}

/* ─────────────────────────────────────────────
   NIVELES Y FIN DEL JUEGO
───────────────────────────────────────────── */

function loadLevel() {
  const level = getCurrentLevel();

  state.placedNotes = [];
  state.selectedNoteId = null;
  state.isPlaying = false;

  renderHud();
  renderLevelInfo();
  renderLevelDots();
  renderBeatTicks();
  renderPalette();
  renderPlacedNotes();

  hideFeedback();
  hideGhostNote();

  if (dom.playbackCursor) {
    dom.playbackCursor.classList.remove("visible");
    dom.playbackCursor.style.left = "0%";
  }

  document.documentElement.style.setProperty("--level-total-beats", level.totalBeats);
}

function nextLevel() {
  if (state.currentLevelIndex >= LEVELS.length - 1) {
    finishGame();
    return;
  }

  state.currentLevelIndex += 1;
  loadLevel();
}

function finishGame() {
  safeSetText(dom.endScore, state.score);
  safeSetText(dom.endStreak, state.maxStreak);

  showScreen("end");

  playFinalSound();

  setTimeout(() => {
    launchConfetti();
  }, 260);
}

function startGame() {
  unlockAudio();

  state.currentLevelIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.maxStreak = 0;
  state.placedNotes = [];
  state.selectedNoteId = null;
  state.isPlaying = false;

  loadLevel();
  showScreen("game");
}

function restartGame() {
  startGame();
}

/* ─────────────────────────────────────────────
   CONFETTI
───────────────────────────────────────────── */

function launchConfetti() {
  const canvas = dom.confettiCanvas;

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = [
    "#7c3aed",
    "#a855f7",
    "#ec4899",
    "#38bdf8",
    "#facc15",
    "#22c55e",
    "#ffffff",
  ];

  const particles = Array.from(
    { length: GAME_CONFIG.confettiParticles },
    () => ({
      x: Math.random() * window.innerWidth,
      y: -30 - Math.random() * 160,
      radius: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      velocityX: (Math.random() - 0.5) * 5,
      velocityY: Math.random() * 4 + 2.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.18,
      alpha: 1,
      gravity: 0.045 + Math.random() * 0.035,
    })
  );

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let alive = false;

    particles.forEach((particle) => {
      if (particle.alpha <= 0) return;

      alive = true;

      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.velocityY += particle.gravity;
      particle.rotation += particle.rotationSpeed;

      if (particle.y > window.innerHeight * 0.62) {
        particle.alpha -= 0.018;
      }

      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(
        -particle.radius,
        -particle.radius / 2,
        particle.radius * 2,
        particle.radius
      );
      ctx.restore();
    });

    if (alive) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  requestAnimationFrame(frame);
}

/* ─────────────────────────────────────────────
   EVENTOS
───────────────────────────────────────────── */

function bindEvents() {
  dom.btnStart?.addEventListener("click", startGame);
  dom.btnRestart?.addEventListener("click", restartGame);

  dom.btnUndo?.addEventListener("click", () => removeNote());
  dom.btnClear?.addEventListener("click", clearNotes);
  dom.btnPlay?.addEventListener("click", playMeasure);
  dom.btnCheck?.addEventListener("click", checkMeasure);
  dom.btnNext?.addEventListener("click", nextLevel);

  dom.staff?.addEventListener("click", () => {
    unlockAudio();
    placeNote();
  });

  dom.staff?.addEventListener("mousemove", updateGhostNotePosition);
  dom.staff?.addEventListener("mouseleave", hideGhostNote);

  dom.staff?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      unlockAudio();
      placeNote();
    }
  });

  document.addEventListener("keydown", handleKeyboard);

  window.addEventListener("resize", () => {
    if (dom.confettiCanvas) {
      dom.confettiCanvas.width = window.innerWidth;
      dom.confettiCanvas.height = window.innerHeight;
    }
  });
}

function handleKeyboard(event) {
  if (!isGameScreenActive()) return;

  const activeTag = document.activeElement?.tagName?.toLowerCase();

  if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
    return;
  }

  if (event.key >= "1" && event.key <= "5") {
    const index = Number(event.key) - 1;
    const noteId = getCurrentLevel().availableNotes[index];

    if (noteId) {
      event.preventDefault();
      selectNote(noteId);
      playClickSound();
    }

    return;
  }

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    unlockAudio();
    placeNote();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    removeNote();
    return;
  }

  if (event.key.toLowerCase() === "v") {
    if (!dom.btnCheck?.disabled) {
      event.preventDefault();
      checkMeasure();
    }

    return;
  }

  if (event.key.toLowerCase() === "p") {
    if (!dom.btnPlay?.disabled) {
      event.preventDefault();
      playMeasure();
    }

    return;
  }

  if (event.key.toLowerCase() === "escape") {
    state.selectedNoteId = null;
    selectNote(null);
    hideFeedback();
  }
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */

function init() {
  showScreen("intro");
  bindEvents();

  if (dom.playbackCursor) {
    dom.playbackCursor.classList.remove("visible");
    dom.playbackCursor.style.left = "0%";
  }

  hideFeedback();
}

init();