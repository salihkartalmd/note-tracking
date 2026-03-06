// ===== Course Data =====
const COURSES = {
  anatomi: { name: 'Anatomi', icon: '🦴', count: 46, color: '#ff6b8a' },
  fizyoloji: { name: 'Fizyoloji', icon: '⚡', count: 33, color: '#4ecdc4' },
  histoloji: { name: 'Histoloji ve Embriyoloji', icon: '🔬', count: 11, color: '#a78bfa' },
  biyofizik: { name: 'Biyofizik', icon: '🧬', count: 11, color: '#fbbf24' }
};

const TOTAL_NOTES = Object.values(COURSES).reduce((s, c) => s + c.count, 0);

// ===== State =====
let state = loadState();
let reviewState = loadReviewState();
let currentPage = null;

function loadState() {
  try {
    const saved = localStorage.getItem('mss-study-tracker');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return createEmptyState();
}

function createEmptyState() {
  const s = {};
  for (const key of Object.keys(COURSES)) {
    s[key] = new Array(COURSES[key].count).fill(false);
  }
  return s;
}

function saveState() {
  try {
    localStorage.setItem('mss-study-tracker', JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

function loadReviewState() {
  try {
    const saved = localStorage.getItem('mss-review-tracker');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return createEmptyReviewState();
}

function createEmptyReviewState() {
  const s = {};
  for (const key of Object.keys(COURSES)) {
    s[key] = new Array(COURSES[key].count).fill(0);
  }
  return s;
}

function saveReviewState() {
  try {
    localStorage.setItem('mss-review-tracker', JSON.stringify(reviewState));
  } catch (e) { /* ignore */ }
}

// ===== SVG Gradient for Circular Progress =====
function addSVGGradient() {
  const svg = document.getElementById('mainCircularProgress');
  if (!svg) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', 'progressGradient');
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '100%');
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#a78bfa');
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#4ecdc4');
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.insertBefore(defs, svg.firstChild);
}

// ===== Render Notes Grids =====
function renderNotesGrids() {
  for (const [key, course] of Object.entries(COURSES)) {
    const grid = document.getElementById(`${key}-grid`);
    if (!grid) continue;
    grid.innerHTML = '';
    for (let i = 0; i < course.count; i++) {
      const card = document.createElement('div');
      const reviews = reviewState[key][i];
      card.className = `note-card ${key}-note${state[key][i] ? ' checked' : ''}`;
      card.dataset.course = key;
      card.dataset.index = i;
      card.innerHTML = `
        <span class="note-number">${i + 1}</span>
        <span class="note-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <span class="review-badge${reviews > 0 ? ' visible' : ''}">${reviews > 0 ? reviews : ''}</span>
      `;

      // Tap handler
      card.addEventListener('click', () => toggleNote(key, i, card));

      // Long press to uncheck a completed note
      let pressTimer;
      let longPressed = false;
      card.addEventListener('touchstart', () => {
        longPressed = false;
        pressTimer = setTimeout(() => {
          longPressed = true;
          if (state[key][i]) {
            state[key][i] = false;
            saveState();
            card.classList.remove('checked');
            if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
            updateAllProgress();
          }
        }, 500);
      }, { passive: true });
      card.addEventListener('touchend', (e) => {
        clearTimeout(pressTimer);
        if (longPressed) e.preventDefault();
      });
      card.addEventListener('touchmove', () => clearTimeout(pressTimer));

      grid.appendChild(card);
    }
  }
}

// ===== Toggle Note =====
function toggleNote(course, index, card) {
  if (state[course][index]) {
    // Already checked: increment review count
    reviewState[course][index]++;
    saveReviewState();

    const count = reviewState[course][index];
    const badge = card.querySelector('.review-badge');
    badge.textContent = count;
    badge.classList.add('visible');

    card.classList.add('just-checked');
    createRipple(card, COURSES[course].color);
    setTimeout(() => card.classList.remove('just-checked'), 350);

    if (navigator.vibrate) navigator.vibrate(10);
    updateAllProgress();
    return;
  }

  // Not checked: mark as completed
  state[course][index] = true;
  saveState();

  card.classList.add('checked', 'just-checked');
  createRipple(card, COURSES[course].color);
  setTimeout(() => card.classList.remove('just-checked'), 350);

  if (navigator.vibrate) navigator.vibrate(10);
  updateAllProgress();
}

// ===== Ripple Effect =====
function createRipple(element, color) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.background = color;
  ripple.style.width = ripple.style.height = '60px';
  ripple.style.left = '50%';
  ripple.style.top = '50%';
  ripple.style.marginLeft = '-30px';
  ripple.style.marginTop = '-30px';
  ripple.style.opacity = '0.3';
  element.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

// ===== Update Progress =====
function updateAllProgress() {
  let totalCompleted = 0;

  for (const [key, course] of Object.entries(COURSES)) {
    const completed = state[key].filter(Boolean).length;
    totalCompleted += completed;
    const percent = Math.round((completed / course.count) * 100);

    // Course page progress
    const progressText = document.getElementById(`${key}-progress-text`);
    const progressFill = document.getElementById(`${key}-progress-fill`);
    if (progressText) progressText.textContent = `${completed} / ${course.count}`;
    if (progressFill) progressFill.style.width = `${percent}%`;

    // Stats card
    const statProgress = document.getElementById(`stat-${key}-progress`);
    const statBar = document.getElementById(`stat-${key}-bar`);
    if (statProgress) statProgress.textContent = `${completed}/${course.count}`;
    if (statBar) statBar.style.width = `${percent}%`;
  }

  // Overall progress
  const totalPercent = Math.round((totalCompleted / TOTAL_NOTES) * 100);

  // Header
  const headerFill = document.getElementById('headerProgressFill');
  const headerText = document.getElementById('headerProgressText');
  if (headerFill) headerFill.style.width = `${totalPercent}%`;
  if (headerText) headerText.textContent = `${totalPercent}%`;

  // Stats page
  const totalPercentEl = document.getElementById('totalPercentage');
  const totalCompletedEl = document.getElementById('totalCompleted');
  const completedNotesEl = document.getElementById('completedNotes');
  const remainingNotesEl = document.getElementById('remainingNotes');
  const progressCircle = document.getElementById('mainProgressCircle');

  if (totalPercentEl) totalPercentEl.textContent = `${totalPercent}%`;
  if (totalCompletedEl) totalCompletedEl.textContent = `${totalCompleted} / ${TOTAL_NOTES} not tamamlandı`;
  if (completedNotesEl) completedNotesEl.textContent = totalCompleted;
  if (remainingNotesEl) remainingNotesEl.textContent = TOTAL_NOTES - totalCompleted;

  if (progressCircle) {
    const circumference = 2 * Math.PI * 54; // r=54
    const offset = circumference - (totalPercent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  // Total reviews
  let totalReviewCount = 0;
  for (const key of Object.keys(COURSES)) {
    totalReviewCount += reviewState[key].reduce((a, b) => a + b, 0);
  }
  const totalReviewsEl = document.getElementById('totalReviews');
  if (totalReviewsEl) totalReviewsEl.textContent = totalReviewCount;
}

// ===== Render Stats Grid =====
function renderStatsGrid() {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const [key, course] of Object.entries(COURSES)) {
    const completed = state[key].filter(Boolean).length;
    const card = document.createElement('div');
    card.className = `stat-card glass-panel ${key}-card`;
    card.innerHTML = `
      <div class="stat-card-icon">${course.icon}</div>
      <div class="stat-card-name">${course.name}</div>
      <div class="stat-card-progress" id="stat-${key}-progress">${completed}/${course.count}</div>
      <div class="stat-card-bar">
        <div class="stat-card-bar-fill" id="stat-${key}-bar" style="width: ${Math.round((completed / course.count) * 100)}%"></div>
      </div>
    `;
    // Navigate to course on click
    card.addEventListener('click', () => navigateTo(key));
    grid.appendChild(card);
  }
}

// ===== Navigation =====
function navigateTo(target) {
  if (currentPage === target) return;
  currentPage = target;

  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${target}`);
  if (targetPage) targetPage.classList.add('active');

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === target);
  });

  // Update header
  updateHeader(target);
}

function updateHeader(target) {
  const headerIcon = document.getElementById('headerIcon');
  const headerTitle = document.getElementById('headerTitle');
  const headerSubtitle = document.getElementById('headerSubtitle');

  if (target === 'stats') {
    headerIcon.textContent = '🧠';
    headerTitle.textContent = 'Merkezi Sinir Sistemi';
    headerSubtitle.textContent = 'Komite Ders Takip';
  } else {
    const course = COURSES[target];
    headerIcon.textContent = course.icon;
    headerTitle.textContent = course.name;
    headerSubtitle.textContent = `${state[target].filter(Boolean).length} / ${course.count} tamamlandı`;
  }
}

// ===== Reset =====
function setupReset() {
  const resetBtn = document.getElementById('resetBtn');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    showConfirmDialog(
      'İlerlemeyi Sıfırla',
      'Tüm ders notlarındaki ilerlemeniz sıfırlanacak. Bu işlem geri alınamaz.',
      () => {
        state = createEmptyState();
        saveState();
        reviewState = createEmptyReviewState();
        saveReviewState();
        renderNotesGrids();
        renderStatsGrid();
        updateAllProgress();
        updateHeader(currentPage);
      }
    );
  });
}

// ===== Confirm Dialog =====
function showConfirmDialog(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="confirm-cancel">İptal</button>
        <button class="confirm-yes">Sıfırla</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  overlay.querySelector('.confirm-cancel').addEventListener('click', () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  });

  overlay.querySelector('.confirm-yes').addEventListener('click', () => {
    onConfirm();
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
  });
}

// ===== Neuron Network Canvas =====
function initNeuronBackground() {
  const container = document.getElementById('neuronCanvas');
  if (!container) return;

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;

  function resize() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 15000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(167, 139, 250, ${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw & update particles
    for (const p of particles) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(167, 139, 250, 0.4)';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    }

    animId = requestAnimationFrame(draw);
  }

  resize();
  createParticles();
  draw();

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });
}

// ===== Navigation Event Listeners =====
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.target);
    });
  });
}

// ===== Service Worker Registration =====
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('SW registered:', reg.scope);
    }).catch((err) => {
      console.warn('SW registration failed:', err);
    });
  }
}

// ===== Init =====
function init() {
  addSVGGradient();
  renderNotesGrids();
  renderStatsGrid();
  updateAllProgress();
  setupNavigation();
  setupReset();
  initNeuronBackground();
  registerSW();

  // Show stats page by default
  navigateTo('stats');
}

document.addEventListener('DOMContentLoaded', init);
