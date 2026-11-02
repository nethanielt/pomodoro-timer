// ============================================================
// AuraPomodoro — app.js
// ============================================================

// ---- STATE ----
let config = JSON.parse(localStorage.getItem('auraConfig')) || {
  durations: { focus: 25, short: 5, long: 15 },
  autoBreak: false,
  autoPomo: false,
  notifications: false,
  theme: 'nordic',
  timerStyle: 'digital' // 'digital' | 'analog'
};

let tasks = JSON.parse(localStorage.getItem('auraTasks')) || [];
let activeTaskId = localStorage.getItem('auraActiveTaskId') || null;

let stats = JSON.parse(localStorage.getItem('auraStats')) || {
  history: {},
  totalFocusMinutes: 0,
  totalCompletedSessions: 0,
  totalCompletedTasks: 0
};

let timer = {
  mode: 'focus',
  timeLeft: config.durations.focus * 60,
  totalDuration: config.durations.focus * 60,
  isRunning: false,
  timerId: null,
  startTime: null,
  elapsedBeforePause: 0
};

// ---- DOM ----
const $ = id => document.getElementById(id);
const el = {
  themeBtn: $('themeBtn'),
  themesMenu: $('themesMenu'),
  settingsBtn: $('settingsBtn'),
  closeSettingsBtn: $('closeSettingsBtn'),
  settingsModal: $('settingsModal'),
  saveSettingsBtn: $('saveSettingsBtn'),
  resetDefaultsBtn: $('resetDefaultsBtn'),

  timerStyleBtn: $('timerStyleBtn'),
  timerStyleIconDigital: $('timerStyleIconDigital'),
  timerStyleIconAnalog: $('timerStyleIconAnalog'),
  digitalTimerDisplay: $('digitalTimerDisplay'),
  analogTimerDisplay: $('analogTimerDisplay'),

  timerTime: $('timerTime'),
  timerLabel: $('timerLabel'),
  timerProgress: $('timerProgress'),
  analogProgress: $('analogProgress'),
  clockHandMinute: $('clockHandMinute'),
  clockHandSecond: $('clockHandSecond'),
  analogTimerLabel: $('analogTimerLabel'),
  analogMarkers: $('analogMarkers'),

  pulseRing: $('pulseRing'),
  pulseRingAnalog: $('pulseRingAnalog'),

  playPauseBtn: $('playPauseBtn'),
  playIcon: $('playIcon'),
  pauseIcon: $('pauseIcon'),
  resetBtn: $('resetBtn'),
  skipBtn: $('skipBtn'),
  activeTaskIndicator: $('activeTaskIndicator'),
  modeBtns: document.querySelectorAll('.mode-btn'),

  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

  taskInput: $('taskInput'),
  taskEstInput: $('taskEstInput'),
  addTaskBtn: $('addTaskBtn'),
  tasksList: $('tasksList'),
  tasksEmptyState: $('tasksEmptyState'),

  settingPomo: $('settingPomo'),
  settingShort: $('settingShort'),
  settingLong: $('settingLong'),
  settingAutoBreak: $('settingAutoBreak'),
  settingAutoPomo: $('settingAutoPomo'),
  settingNotifications: $('settingNotifications'),

  toggleRain: $('toggleRain'),
  volumeRain: $('volumeRain'),
  toggleWind: $('toggleWind'),
  volumeWind: $('volumeWind'),
  toggleDrone: $('toggleDrone'),
  volumeDrone: $('volumeDrone'),
  toggleFire: $('toggleFire'),
  volumeFire: $('volumeFire'),

  statsTotalFocus: $('statsTotalFocus'),
  statsCompletedPomos: $('statsCompletedPomos'),
  statsCompletedTasks: $('statsCompletedTasks'),
  chartContainer: $('chartContainer'),

  particleCanvas: $('particleCanvas'),
  confettiContainer: $('confettiContainer')
};

// ============================================================
// PARTICLE BACKGROUND
// ============================================================
const particleCtx = el.particleCanvas.getContext('2d');
const particles = [];
const NUM_PARTICLES = 38;

function resizeCanvas() {
  el.particleCanvas.width  = window.innerWidth;
  el.particleCanvas.height = window.innerHeight;
}

function getParticleColor() {
  // Read the CSS var from :root or body
  const raw = getComputedStyle(document.body).getPropertyValue('--particle-color').trim();
  return raw || 'rgba(93,126,111,0.18)';
}

function initParticles() {
  particles.length = 0;
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 3.5 + 1.5,
      dx: (Math.random() - 0.5) * 0.28,
      dy: (Math.random() - 0.5) * 0.22,
      alpha: Math.random() * 0.45 + 0.1
    });
  }
}

function animateParticles() {
  particleCtx.clearRect(0, 0, el.particleCanvas.width, el.particleCanvas.height);
  const color = getParticleColor();

  particles.forEach(p => {
    p.x += p.dx;
    p.y += p.dy;

    // Wrap edges
    if (p.x < -10)  p.x = window.innerWidth  + 10;
    if (p.x > window.innerWidth  + 10) p.x = -10;
    if (p.y < -10)  p.y = window.innerHeight + 10;
    if (p.y > window.innerHeight + 10) p.y = -10;

    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    // Use a safe fallback colour in case CSS var parsing fails
    particleCtx.fillStyle = color;
    particleCtx.globalAlpha = p.alpha;
    particleCtx.fill();
    particleCtx.globalAlpha = 1;
  });

  requestAnimationFrame(animateParticles);
}

// ============================================================
// CONFETTI BURST
// ============================================================
const CONFETTI_COLORS = [
  '#a8d8a8','#f7c5a8','#c5b8f0','#f0c5e8',
  '#b8e0f0','#f0e6b8','#f0b8b8','#b8f0d8'
];

function burstConfetti() {
  const total = 80;
  el.confettiContainer.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';

    const size   = Math.random() * 8 + 6;
    const left   = Math.random() * 100;
    const delay  = Math.random() * 0.6;
    const dur    = 1.4 + Math.random() * 0.8;
    const color  = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const shape  = Math.random() > 0.5 ? '50%' : '2px';

    piece.style.cssText = `
      left: ${left}%;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${shape};
      animation-delay: ${delay}s;
      animation-duration: ${dur}s;
    `;
    el.confettiContainer.appendChild(piece);
  }

  // Clean up after animation
  setTimeout(() => { el.confettiContainer.innerHTML = ''; }, 3000);
}

// ============================================================
// TIMER STYLE (DIGITAL / ANALOG)
// ============================================================
function applyTimerStyle() {
  const isAnalog = config.timerStyle === 'analog';

  if (isAnalog) {
    el.digitalTimerDisplay.classList.add('analog-hidden');
    el.analogTimerDisplay.classList.remove('analog-hidden');
    el.timerStyleIconDigital.style.display = 'none';
    el.timerStyleIconAnalog.style.display  = 'block';
  } else {
    el.digitalTimerDisplay.classList.remove('analog-hidden');
    el.analogTimerDisplay.classList.add('analog-hidden');
    el.timerStyleIconDigital.style.display = 'block';
    el.timerStyleIconAnalog.style.display  = 'none';
  }
}

function toggleTimerStyle() {
  config.timerStyle = config.timerStyle === 'digital' ? 'analog' : 'digital';
  saveConfig();
  applyTimerStyle();
  // Re-render so the displayed timer stays up to date
  updateTimerDisplay();
}

// ============================================================
// ANALOG CLOCK FACE
// ============================================================
function buildAnalogMarkers() {
  el.analogMarkers.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const angle  = (i / 60) * 2 * Math.PI;
    const isMajor = i % 5 === 0;
    const inner  = isMajor ? 68 : 72;
    const outer  = 76;
    const cx     = 100;
    const cy     = 100;

    const x1 = cx + inner * Math.sin(angle);
    const y1 = cy - inner * Math.cos(angle);
    const x2 = cx + outer * Math.sin(angle);
    const y2 = cy - outer * Math.cos(angle);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.setAttribute('stroke-width', isMajor ? '2' : '1');
    el.analogMarkers.appendChild(line);
  }
}

function updateAnalogHands() {
  // Map remaining time fraction to hand angle
  // Minute hand: full rotation = full duration
  const progress = timer.timeLeft / timer.totalDuration; // 1 → 0 as time counts down
  // Minute hand starts at top (12 o'clock) and sweeps clockwise as time passes
  const minuteAngle = (1 - progress) * 360; // degrees, clockwise from 12

  setHandAngle(el.clockHandMinute, minuteAngle, 100, 100, 36, 100);

  // Second hand: sweeps one full revolution per minute remaining
  const secondsRemainingInCurrentMinute = timer.timeLeft % 60;
  const secondAngle = ((60 - secondsRemainingInCurrentMinute) / 60) * 360;
  setHandAngle(el.clockHandSecond, secondAngle, 100, 112, 30, 100);

  // Mirror progress ring on analog display
  const circumference = 552.92;
  const elapsed = timer.totalDuration - timer.timeLeft;
  const offset  = circumference * (elapsed / timer.totalDuration);
  el.analogProgress.style.strokeDashoffset = offset;
}

function setHandAngle(lineEl, angleDeg, x1, y1, x2, y2) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx  = 100;
  const cy  = 100;

  const rx1 = cx + (x1 - cx) * cos - (y1 - cy) * sin;
  const ry1 = cy + (x1 - cx) * sin + (y1 - cy) * cos;
  const rx2 = cx + (x2 - cx) * cos - (y2 - cy) * sin;
  const ry2 = cy + (x2 - cx) * sin + (y2 - cy) * cos;

  lineEl.setAttribute('x1', rx1.toFixed(2));
  lineEl.setAttribute('y1', ry1.toFixed(2));
  lineEl.setAttribute('x2', rx2.toFixed(2));
  lineEl.setAttribute('y2', ry2.toFixed(2));
}

// ============================================================
// TIMER DISPLAY
// ============================================================
function updateTimerDisplay() {
  const mins = Math.floor(timer.timeLeft / 60);
  const secs = timer.timeLeft % 60;
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

  el.timerTime.textContent = timeStr;

  const modeText = timer.mode === 'focus' ? 'Focus' : 'Break';
  document.title = `${timeStr} — AuraPomodoro (${modeText})`;

  // Digital progress ring
  const circumference = 552.92;
  const elapsed  = timer.totalDuration - timer.timeLeft;
  const offset   = circumference * (elapsed / timer.totalDuration);
  el.timerProgress.style.strokeDashoffset = offset;

  // Analog clock
  if (config.timerStyle === 'analog') {
    updateAnalogHands();
  }
}

// ============================================================
// TIMER CORE
// ============================================================
function startTimer() {
  if (timer.isRunning) return;
  audio.resumeContext();

  timer.isRunning = true;
  timer.startTime = Date.now();

  el.playIcon.style.display  = 'none';
  el.pauseIcon.style.display = 'block';
  el.pulseRing.classList.add('active');
  el.pulseRingAnalog.classList.add('active');

  // Breathing on break
  el.digitalTimerDisplay.classList.toggle('breathing', timer.mode !== 'focus');
  el.analogTimerDisplay.classList.toggle('breathing', timer.mode !== 'focus');

  timer.timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
    const total   = timer.elapsedBeforePause + elapsed;
    timer.timeLeft = Math.max(0, timer.totalDuration - total);

    updateTimerDisplay();

    if (timer.timeLeft <= 0) {
      clearInterval(timer.timerId);
      timer.timerId  = null;
      timer.isRunning = false;
      timer.elapsedBeforePause = 0;
      sessionComplete();
    }
  }, 1000);
}

function pauseTimer() {
  if (!timer.isRunning) return;
  clearInterval(timer.timerId);
  timer.timerId  = null;
  timer.isRunning = false;

  const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
  timer.elapsedBeforePause += elapsed;

  el.playIcon.style.display  = 'block';
  el.pauseIcon.style.display = 'none';
  el.pulseRing.classList.remove('active');
  el.pulseRingAnalog.classList.remove('active');
  el.digitalTimerDisplay.classList.remove('breathing');
  el.analogTimerDisplay.classList.remove('breathing');
}

function resetTimer() {
  pauseTimer();
  timer.elapsedBeforePause = 0;
  timer.timeLeft = timer.totalDuration;
  updateTimerDisplay();
}

function skipMode() {
  pauseTimer();
  timer.elapsedBeforePause = 0;

  if (timer.mode === 'focus') {
    const completed = stats.totalCompletedSessions;
    setTimerMode(completed > 0 && completed % 4 === 0 ? 'long' : 'short');
  } else {
    setTimerMode('focus');
  }

  if (timer.mode !== 'focus' && config.autoBreak) startTimer();
  if (timer.mode === 'focus'  && config.autoPomo)  startTimer();
}

function setTimerMode(mode) {
  timer.mode = mode;

  el.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  const labelMap = { focus: 'Focusing', short: 'Short Break', long: 'Long Break' };
  el.timerLabel.textContent      = labelMap[mode];
  el.analogTimerLabel.textContent = labelMap[mode];

  const durationMap = { focus: config.durations.focus, short: config.durations.short, long: config.durations.long };
  timer.totalDuration = durationMap[mode] * 60;
  timer.timeLeft       = timer.totalDuration;
  timer.elapsedBeforePause = 0;

  updateTimerDisplay();
}

function sessionComplete() {
  audio.playChime();
  if (config.notifications) sendNotification();

  const today = getTodayDateString();

  if (timer.mode === 'focus') {
    stats.totalCompletedSessions += 1;
    stats.totalFocusMinutes      += config.durations.focus;
    stats.history[today]          = (stats.history[today] || 0) + 1;

    if (activeTaskId) {
      const task = tasks.find(t => t.id === activeTaskId);
      if (task) { task.actual += 1; saveTasks(); renderTasks(); }
    }

    saveStats();
    renderStats();
    burstConfetti();

    setTimerMode(stats.totalCompletedSessions % 4 === 0 ? 'long' : 'short');
    if (config.autoBreak) setTimeout(startTimer, 1000);
  } else {
    setTimerMode('focus');
    if (config.autoPomo) setTimeout(startTimer, 1000);
  }
}

function sendNotification() {
  if (Notification.permission === 'granted') {
    const focus = timer.mode === 'focus';
    new Notification(focus ? 'Focus Finished! 🍅' : 'Break Over! ⏰', {
      body: focus ? 'Time for a well-earned break.' : 'Ready to start another focus session?'
    });
  }
}

// ============================================================
// TASKS
// ============================================================
function renderTasks() {
  el.tasksList.innerHTML = '';

  if (tasks.length === 0) {
    el.tasksEmptyState.style.display = 'flex';
    return;
  }
  el.tasksEmptyState.style.display = 'none';

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}${task.id === activeTaskId ? ' active-focus' : ''}`;
    li.dataset.id = task.id;

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark complete">
      <div class="task-details">
        <span class="task-title">${escapeHTML(task.title)}</span>
        <span class="task-pomodoros">🍅 ${task.actual} / ${task.est} pomodoros</span>
      </div>
      <div class="task-actions">
        <button class="task-action-btn focus-btn" title="Set as focus task" aria-label="Focus on task">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
        </button>
        <button class="task-action-btn delete-btn" title="Delete task" aria-label="Delete task">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    `;

    li.querySelector('.task-checkbox').addEventListener('change', e => {
      e.stopPropagation();
      li.classList.add('completing');
      setTimeout(() => toggleTaskComplete(task.id), 100);
    });

    li.querySelector('.focus-btn').addEventListener('click', e => {
      e.stopPropagation();
      setActiveTask(task.id);
    });

    li.querySelector('.delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      li.style.transition = 'all 0.3s ease';
      li.style.opacity    = '0';
      li.style.transform  = 'translateX(20px) scale(0.95)';
      setTimeout(() => deleteTask(task.id), 280);
    });

    li.addEventListener('click', () => { if (!task.completed) setActiveTask(task.id); });
    el.tasksList.appendChild(li);
  });
}

function addTask() {
  const title = el.taskInput.value.trim();
  const est   = parseInt(el.taskEstInput.value) || 1;
  if (!title) {
    el.taskInput.focus();
    el.taskInput.classList.add('shake');
    setTimeout(() => el.taskInput.classList.remove('shake'), 400);
    return;
  }

  const newTask = { id: uid(), title, est, actual: 0, completed: false };
  tasks.push(newTask);
  saveTasks();
  if (!activeTaskId) setActiveTask(newTask.id);
  el.taskInput.value     = '';
  el.taskEstInput.value  = '1';
  renderTasks();
}

function toggleTaskComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  if (task.completed) {
    stats.totalCompletedTasks += 1;
    if (activeTaskId === id) setActiveTask(null);
  } else {
    stats.totalCompletedTasks = Math.max(0, stats.totalCompletedTasks - 1);
  }
  saveTasks(); saveStats(); renderTasks(); renderStats();
}

function setActiveTask(id) {
  if (!id) {
    activeTaskId = null;
    localStorage.removeItem('auraActiveTaskId');
    el.activeTaskIndicator.innerHTML = 'Focusing on: <strong>No active task</strong>';
  } else {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
      activeTaskId = id;
      localStorage.setItem('auraActiveTaskId', id);
      el.activeTaskIndicator.innerHTML = `Focusing on: <strong>${escapeHTML(task.title)}</strong>`;
    }
  }
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  if (activeTaskId === id) setActiveTask(null);
  saveTasks(); renderTasks();
}

function saveTasks() { localStorage.setItem('auraTasks', JSON.stringify(tasks)); }

// ============================================================
// STATS
// ============================================================
function saveStats() { localStorage.setItem('auraStats', JSON.stringify(stats)); }

function renderStats() {
  el.statsTotalFocus.textContent      = stats.totalFocusMinutes;
  el.statsCompletedPomos.textContent  = stats.totalCompletedSessions;
  el.statsCompletedTasks.textContent  = stats.totalCompletedTasks;

  const week   = getThisWeekDates();
  const counts = week.map(d => stats.history[d] || 0);
  const maxVal = Math.max(...counts, 4);

  const bars = el.chartContainer.querySelectorAll('.chart-bar');
  bars.forEach((bar, i) => {
    const v   = counts[i];
    const pct = Math.max(2, (v / maxVal) * 100);
    bar.style.height        = `${pct}%`;
    bar.dataset.value       = `${v} session${v !== 1 ? 's' : ''}`;
  });
}

// ============================================================
// SETTINGS
// ============================================================
function openSettings() {
  el.settingPomo.value          = config.durations.focus;
  el.settingShort.value         = config.durations.short;
  el.settingLong.value          = config.durations.long;
  el.settingAutoBreak.checked   = config.autoBreak;
  el.settingAutoPomo.checked    = config.autoPomo;
  el.settingNotifications.checked = config.notifications;
  el.settingsModal.classList.add('active');
}

function closeSettings() { el.settingsModal.classList.remove('active'); }

function saveSettings() {
  config.durations.focus  = parseInt(el.settingPomo.value)  || 25;
  config.durations.short  = parseInt(el.settingShort.value) || 5;
  config.durations.long   = parseInt(el.settingLong.value)  || 15;
  config.autoBreak        = el.settingAutoBreak.checked;
  config.autoPomo         = el.settingAutoPomo.checked;
  config.notifications    = el.settingNotifications.checked;

  if (config.notifications) requestNotificationPermission();

  saveConfig();
  setTimerMode(timer.mode);
  closeSettings();
}

function resetSettingsDefaults() {
  el.settingPomo.value = 25; el.settingShort.value = 5; el.settingLong.value = 15;
  el.settingAutoBreak.checked = false;
  el.settingAutoPomo.checked  = false;
  el.settingNotifications.checked = false;
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function saveConfig() { localStorage.setItem('auraConfig', JSON.stringify(config)); }

// ============================================================
// WEB AUDIO SYNTHESIZER
// ============================================================
const audio = {
  ctx: null,

  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  },

  resumeContext() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  },

  noiseBuffer() {
    if (!this.ctx) return null;
    const buf = this.ctx.createBuffer(1, 2 * this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  },

  // --- RAIN ---
  rain: { src: null, filt: null, gain: null, playing: false, vol: 0.5 },

  startRain() {
    this.resumeContext();
    if (!this.ctx || this.rain.playing) return;
    this.rain.src  = this.ctx.createBufferSource();
    this.rain.src.buffer = this.noiseBuffer();
    this.rain.src.loop = true;
    this.rain.filt = this.ctx.createBiquadFilter();
    this.rain.filt.type = 'lowpass';
    this.rain.filt.frequency.value = 700;
    this.rain.gain = this.ctx.createGain();
    this.rain.gain.gain.value = this.rain.vol * 0.15;
    this.rain.src.connect(this.rain.filt);
    this.rain.filt.connect(this.rain.gain);
    this.rain.gain.connect(this.ctx.destination);
    this.rain.src.start();
    this.rain.playing = true;
    el.toggleRain.classList.add('active');
    $('soundRowRain').classList.add('playing');
  },

  stopRain() {
    if (this.rain.src) {
      try { this.rain.src.stop(); } catch(e) {}
      this.rain.src.disconnect(); this.rain.filt.disconnect(); this.rain.gain.disconnect();
      this.rain.src = null; this.rain.filt = null; this.rain.gain = null;
    }
    this.rain.playing = false;
    el.toggleRain.classList.remove('active');
    $('soundRowRain').classList.remove('playing');
  },

  setRainVol(v) {
    this.rain.vol = v;
    if (this.rain.gain) this.rain.gain.gain.value = v * 0.15;
  },

  // --- WIND ---
  wind: { src: null, filt: null, lfo: null, lfoGain: null, gain: null, playing: false, vol: 0.5 },

  startWind() {
    this.resumeContext();
    if (!this.ctx || this.wind.playing) return;
    this.wind.src = this.ctx.createBufferSource();
    this.wind.src.buffer = this.noiseBuffer();
    this.wind.src.loop = true;
    this.wind.filt = this.ctx.createBiquadFilter();
    this.wind.filt.type = 'bandpass'; this.wind.filt.Q.value = 2; this.wind.filt.frequency.value = 350;
    this.wind.lfo = this.ctx.createOscillator();
    this.wind.lfo.frequency.value = 0.08;
    this.wind.lfoGain = this.ctx.createGain();
    this.wind.lfoGain.gain.value = 250;
    this.wind.gain = this.ctx.createGain();
    this.wind.gain.gain.value = this.wind.vol * 0.25;
    this.wind.lfo.connect(this.wind.lfoGain);
    this.wind.lfoGain.connect(this.wind.filt.frequency);
    this.wind.src.connect(this.wind.filt);
    this.wind.filt.connect(this.wind.gain);
    this.wind.gain.connect(this.ctx.destination);
    this.wind.lfo.start(); this.wind.src.start();
    this.wind.playing = true;
    el.toggleWind.classList.add('active');
    $('soundRowWind').classList.add('playing');
  },

  stopWind() {
    if (this.wind.src) {
      try { this.wind.src.stop(); this.wind.lfo.stop(); } catch(e) {}
      this.wind.src.disconnect(); this.wind.filt.disconnect();
      this.wind.lfo.disconnect(); this.wind.lfoGain.disconnect(); this.wind.gain.disconnect();
      this.wind.src = null; this.wind.filt = null; this.wind.lfo = null;
      this.wind.lfoGain = null; this.wind.gain = null;
    }
    this.wind.playing = false;
    el.toggleWind.classList.remove('active');
    $('soundRowWind').classList.remove('playing');
  },

  setWindVol(v) {
    this.wind.vol = v;
    if (this.wind.gain) this.wind.gain.gain.value = v * 0.25;
  },

  // --- DRONE ---
  drone: { oscs: [], gain: null, filt: null, playing: false, vol: 0.5 },

  startDrone() {
    this.resumeContext();
    if (!this.ctx || this.drone.playing) return;
    this.drone.gain = this.ctx.createGain();
    this.drone.gain.gain.value = this.drone.vol * 0.2;
    this.drone.filt = this.ctx.createBiquadFilter();
    this.drone.filt.type = 'lowpass'; this.drone.filt.frequency.value = 320;
    this.drone.filt.connect(this.drone.gain);
    this.drone.gain.connect(this.ctx.destination);

    [55, 110, 165, 220].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f + (Math.random() - 0.5) * 1.5;
      const g = this.ctx.createGain(); g.gain.value = 0.25;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.02;
      const lg = this.ctx.createGain(); lg.gain.value = 0.15;
      lfo.connect(lg); lg.connect(g.gain);
      osc.connect(g); g.connect(this.drone.filt);
      lfo.start(); osc.start();
      this.drone.oscs.push({ osc, g, lfo, lg });
    });

    this.drone.playing = true;
    el.toggleDrone.classList.add('active');
    $('soundRowDrone').classList.add('playing');
  },

  stopDrone() {
    this.drone.oscs.forEach(o => {
      try { o.osc.stop(); o.lfo.stop(); } catch(e) {}
      o.osc.disconnect(); o.g.disconnect(); o.lfo.disconnect(); o.lg.disconnect();
    });
    if (this.drone.filt) { this.drone.filt.disconnect(); this.drone.filt = null; }
    if (this.drone.gain) { this.drone.gain.disconnect(); this.drone.gain = null; }
    this.drone.oscs = []; this.drone.playing = false;
    el.toggleDrone.classList.remove('active');
    $('soundRowDrone').classList.remove('playing');
  },

  setDroneVol(v) {
    this.drone.vol = v;
    if (this.drone.gain) this.drone.gain.gain.value = v * 0.2;
  },

  // --- FIREPLACE (crackling brown noise) ---
  fire: { src: null, filt: null, dist: null, gain: null, playing: false, vol: 0.5 },

  startFire() {
    this.resumeContext();
    if (!this.ctx || this.fire.playing) return;

    // Generate brownian noise (pink-ish with low-pass)
    const buf  = this.ctx.createBuffer(1, 2 * this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last   = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = last = (last + 0.02 * white) / 1.02;
    }

    this.fire.src = this.ctx.createBufferSource();
    this.fire.src.buffer = buf;
    this.fire.src.loop = true;

    // Low-pass for warmth
    this.fire.filt = this.ctx.createBiquadFilter();
    this.fire.filt.type = 'lowpass'; this.fire.filt.frequency.value = 900; this.fire.filt.Q.value = 0.8;

    // WaveShaper for crackle distortion
    this.fire.dist = this.ctx.createWaveShaper();
    this.fire.dist.curve = makeCrackle(200);

    this.fire.gain = this.ctx.createGain();
    this.fire.gain.gain.value = this.fire.vol * 0.6;

    this.fire.src.connect(this.fire.filt);
    this.fire.filt.connect(this.fire.dist);
    this.fire.dist.connect(this.fire.gain);
    this.fire.gain.connect(this.ctx.destination);
    this.fire.src.start();
    this.fire.playing = true;
    el.toggleFire.classList.add('active');
    $('soundRowFire').classList.add('playing');
  },

  stopFire() {
    if (this.fire.src) {
      try { this.fire.src.stop(); } catch(e) {}
      this.fire.src.disconnect(); this.fire.filt.disconnect();
      this.fire.dist.disconnect(); this.fire.gain.disconnect();
      this.fire.src = null; this.fire.filt = null; this.fire.dist = null; this.fire.gain = null;
    }
    this.fire.playing = false;
    el.toggleFire.classList.remove('active');
    $('soundRowFire').classList.remove('playing');
  },

  setFireVol(v) {
    this.fire.vol = v;
    if (this.fire.gain) this.fire.gain.gain.value = v * 0.6;
  },

  // --- CHIME ---
  playChime() {
    this.resumeContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.35, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
    master.connect(this.ctx.destination);

    [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22 / (i + 1), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + (3 / (i + 1)));
      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 5);
    });
  }
};

function makeCrackle(n) {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = (Math.PI + 80) * x / (Math.PI + 80 * Math.abs(x));
  }
  return curve;
}

// ============================================================
// UTILITIES
// ============================================================
function uid() { return '_' + Math.random().toString(36).slice(2, 11); }

function escapeHTML(s) {
  return s.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]));
}

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getThisWeekDates() {
  const today = new Date();
  const dow   = today.getDay();
  const diff  = dow === 0 ? -6 : 1 - dow;
  const mon   = new Date(today); mon.setDate(today.getDate() + diff);
  return Array.from({length: 7}, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function initEventListeners() {
  // Theme menu
  el.themeBtn.addEventListener('click', e => {
    e.stopPropagation();
    el.themesMenu.classList.toggle('active');
  });

  document.addEventListener('click', () => el.themesMenu.classList.remove('active'));

  el.themesMenu.querySelectorAll('.theme-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.body.className = `theme-${opt.dataset.theme}`;
      config.theme = opt.dataset.theme;
      saveConfig();
    });
  });

  // Timer style toggle
  el.timerStyleBtn.addEventListener('click', toggleTimerStyle);

  // Settings
  el.settingsBtn.addEventListener('click', openSettings);
  el.closeSettingsBtn.addEventListener('click', closeSettings);
  el.saveSettingsBtn.addEventListener('click', saveSettings);
  el.resetDefaultsBtn.addEventListener('click', resetSettingsDefaults);
  el.settingsModal.addEventListener('click', e => { if (e.target === el.settingsModal) closeSettings(); });

  // Timer controls
  el.playPauseBtn.addEventListener('click', () => timer.isRunning ? pauseTimer() : startTimer());
  el.resetBtn.addEventListener('click', resetTimer);
  el.skipBtn.addEventListener('click', skipMode);

  el.modeBtns.forEach(b => b.addEventListener('click', () => {
    pauseTimer();
    timer.elapsedBeforePause = 0;
    setTimerMode(b.dataset.mode);
  }));

  // Tabs
  el.tabBtns.forEach(btn => btn.addEventListener('click', () => {
    el.tabBtns.forEach(b => b.classList.remove('active'));
    el.tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  }));

  // Tasks
  el.addTaskBtn.addEventListener('click', addTask);
  el.taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });

  // Sounds
  el.toggleRain.addEventListener('click', () => audio.rain.playing ? audio.stopRain() : audio.startRain());
  el.volumeRain.addEventListener('input', e => audio.setRainVol(parseFloat(e.target.value)));

  el.toggleWind.addEventListener('click', () => audio.wind.playing ? audio.stopWind() : audio.startWind());
  el.volumeWind.addEventListener('input', e => audio.setWindVol(parseFloat(e.target.value)));

  el.toggleDrone.addEventListener('click', () => audio.drone.playing ? audio.stopDrone() : audio.startDrone());
  el.volumeDrone.addEventListener('input', e => audio.setDroneVol(parseFloat(e.target.value)));

  el.toggleFire.addEventListener('click', () => audio.fire.playing ? audio.stopFire() : audio.startFire());
  el.volumeFire.addEventListener('input', e => audio.setFireVol(parseFloat(e.target.value)));

  // Resize canvas
  window.addEventListener('resize', () => { resizeCanvas(); });
}

// ============================================================
// INIT
// ============================================================
function initApp() {
  document.body.className = `theme-${config.theme}`;

  // Particles
  resizeCanvas();
  initParticles();
  animateParticles();

  // Analog clock
  buildAnalogMarkers();
  applyTimerStyle();

  setTimerMode('focus');
  renderTasks();
  if (activeTaskId) setActiveTask(activeTaskId);
  renderStats();
  initEventListeners();
}

document.addEventListener('DOMContentLoaded', initApp);
