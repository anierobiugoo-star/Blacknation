/**
 * ui.js
 * All DOM rendering lives here — never mixed with business logic.
 * Phase 1 covers the primitives shared by every page (toasts, modals,
 * password toggles). Dashboard-specific rendering (tasks, calendar,
 * weather, quotes, charts) is appended here in a later phase.
 */

/* ==========================================================================
   Toast notifications
   ========================================================================== */
let toastStack = null;

function ensureToastStack() {
  if (toastStack && document.body.contains(toastStack)) return toastStack;
  toastStack = document.createElement('div');
  toastStack.className = 'toast-stack';
  toastStack.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastStack);
  return toastStack;
}

const TOAST_ICONS = {
  success: '<i class="fa-solid fa-check"></i>',
  error: '<i class="fa-solid fa-xmark"></i>',
  info: '<i class="fa-solid fa-info"></i>',
};

/**
 * Show a toast notification.
 * @param {string} title
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration ms before auto-dismiss
 */
export function showToast(title, message = '', type = 'info', duration = 3500, action = null) {
  const stack = ensureToastStack();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <div class="toast-content">
      <strong>${title}</strong>
      ${message ? `<span>${message}</span>` : ''}
      ${action ? `<button type="button" class="toast-action-btn" style="margin-top:8px; color:var(--signal-bright); font-weight:600; font-size:0.82rem;">${action.label}</button>` : ''}
    </div>
  `;

  stack.appendChild(toast);

  const remove = () => {
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  const timer = setTimeout(remove, duration);

  if (action) {
    const actionBtn = toast.querySelector('.toast-action-btn');
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(timer);
      action.onClick();
      remove();
    });
  }

  toast.addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });

  return toast;
}

export const toastSuccess = (title, message) => showToast(title, message, 'success');
export const toastError = (title, message) => showToast(title, message, 'error');
export const toastInfo = (title, message) => showToast(title, message, 'info');

/* ==========================================================================
   Password visibility toggle (used on login + register forms)
   ========================================================================== */
export function initPasswordToggle(toggleButton, inputEl) {
  if (!toggleButton || !inputEl) return;
  toggleButton.addEventListener('click', () => {
    const isPassword = inputEl.type === 'password';
    inputEl.type = isPassword ? 'text' : 'password';
    toggleButton.innerHTML = isPassword
      ? '<i class="fa-solid fa-eye-slash"></i>'
      : '<i class="fa-solid fa-eye"></i>';
  });
}

/* ==========================================================================
   Inline field error helpers (auth forms + task forms)
   ========================================================================== */
export function setFieldError(inputEl, message) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  group.classList.add('has-error');
  let errorEl = group.querySelector('.field-error');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    group.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

export function clearFieldError(inputEl) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  group.classList.remove('has-error');
  const errorEl = group.querySelector('.field-error');
  if (errorEl) errorEl.remove();
}

export function clearAllFieldErrors(formEl) {
  formEl.querySelectorAll('.has-error').forEach((group) => group.classList.remove('has-error'));
  formEl.querySelectorAll('.field-error').forEach((el) => el.remove());
}

/* ==========================================================================
   Button loading state (used while a submit/API request is in flight)
   ========================================================================== */
export function setButtonLoading(button, isLoading, loadingText = 'Please wait…') {
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText}`;
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.originalText || button.innerHTML;
    button.disabled = false;
  }
}

/* ==========================================================================
   Generic modal open/close (dashboard task/note modals reuse this)
   ========================================================================== */
export function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('open');
  document.body.classList.add('modal-open');
  const firstInput = modalEl.querySelector('input, textarea, select');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

export function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('open');
  document.body.classList.remove('modal-open');
}

/** Wire up every [data-modal-close] button and backdrop click inside a modal. */
export function initModalDismiss(modalEl) {
  if (!modalEl) return;
  modalEl.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(modalEl));
  });
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal(modalEl);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl.classList.contains('open')) closeModal(modalEl);
  });
}

/* ==========================================================================
   Dashboard rendering
   Pure rendering functions: build markup and set it on a container.
   State, events and business logic stay in dashboard.js.
   ========================================================================== */

import { escapeHtml, formatShortDate, stringToColor } from './utils.js?v=5';

/* ---- Empty states ---- */
export function renderEmptyState(container, { icon = 'fa-inbox', title, text }) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon"><i class="fa-solid ${icon}"></i></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

/* ---- Sidebar active state ---- */
const BOTTOM_NAV_VIEWS = new Set(['home', 'tasks', 'calendar', 'notes']);

export function setActiveSidebarLink(viewName) {
  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.dataset.view === viewName);
  });

  // Bottom nav: highlight the matching quick-access item, or "More"
  // itself when the active view lives inside the sidebar drawer.
  document.querySelectorAll('.bottom-nav-link[data-view]').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });
  const moreBtn = document.getElementById('bottomNavMore');
  if (moreBtn) {
    moreBtn.classList.toggle('active', !BOTTOM_NAV_VIEWS.has(viewName));
  }
}

/* ---- Task card ---- */
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export function renderTaskCard(task, { bulkMode = false, selected = false } = {}) {
  const isCompleted = task.status === 'completed';
  const overdue = !isCompleted && task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString());
  const catColor = stringToColor(task.category);

  return `
    <div class="task-card ${isCompleted ? 'completed' : ''} ${overdue ? 'overdue' : ''}" data-task-id="${task.id}" draggable="true">
      <span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
      <input type="checkbox" class="task-select-checkbox" ${selected ? 'checked' : ''} data-action="select-task">
      <div class="task-checkbox" data-action="toggle-complete">${isCompleted ? '<i class="fa-solid fa-check"></i>' : ''}</div>
      <div class="task-body">
        <div class="task-top-row">
          <span class="task-title">${escapeHtml(task.title)}</span>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta-row">
          <span class="task-tag"><span class="dot" style="background:${catColor}"></span>${escapeHtml(task.category)}</span>
          <span class="priority-badge priority-${task.priority}">${PRIORITY_LABELS[task.priority] || task.priority}</span>
          ${task.dueDate ? `<span class="task-due ${overdue ? 'is-overdue' : ''}"><i class="fa-regular fa-calendar"></i> ${formatShortDate(task.dueDate)}${task.dueTime ? ' · ' + task.dueTime : ''}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button data-action="favorite-task" class="${task.favorite ? 'favorited' : ''}" data-tooltip="Favorite"><i class="fa-solid fa-star"></i></button>
        <button data-action="duplicate-task" data-tooltip="Duplicate"><i class="fa-solid fa-copy"></i></button>
        <button data-action="edit-task" data-tooltip="Edit"><i class="fa-solid fa-pen"></i></button>
        <button data-action="delete-task" class="delete-btn" data-tooltip="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `;
}

export function renderTaskList(container, tasks, options = {}) {
  if (!tasks.length) {
    renderEmptyState(container, {
      icon: 'fa-clipboard-check',
      title: 'No tasks here',
      text: 'Create a task to see it appear in this list.',
    });
    return;
  }
  container.innerHTML = tasks.map((t) => renderTaskCard(t, options)).join('');
}

/* ---- Stat cards ---- */
export function renderStatCards(container, stats) {
  const cards = [
    { label: 'Total Tasks', value: stats.total, icon: 'fa-list', color: 'var(--signal-bright)', bg: 'rgba(201,162,39,0.16)' },
    { label: 'Completed', value: stats.completed, icon: 'fa-circle-check', color: 'var(--teal)', bg: 'rgba(30,111,92,0.16)' },
    { label: 'Pending', value: stats.pending, icon: 'fa-hourglass-half', color: 'var(--amber)', bg: 'rgba(168,92,50,0.16)' },
    { label: 'Overdue', value: stats.overdue, icon: 'fa-triangle-exclamation', color: 'var(--coral)', bg: 'rgba(140,47,57,0.18)' },
    { label: "Today's Tasks", value: stats.today, icon: 'fa-calendar-day', color: 'var(--signal-bright)', bg: 'rgba(201,162,39,0.16)' },
    { label: "This Week", value: stats.thisWeek, icon: 'fa-calendar-week', color: '#2c5f8a', bg: 'rgba(44,95,138,0.16)' },
    { label: 'Completion', value: `${stats.completionRate}%`, icon: 'fa-chart-pie', color: 'var(--teal)', bg: 'rgba(30,111,92,0.16)' },
    { label: 'Productivity Score', value: stats.productivityScore, icon: 'fa-bolt', color: 'var(--amber)', bg: 'rgba(168,92,50,0.16)' },
  ];

  container.innerHTML = cards.map((c) => `
    <div class="stat-card" style="--accent-color:${c.color}">
      <div class="stat-card-top">
        <div class="stat-card-icon" style="background:${c.bg}; color:${c.color}"><i class="fa-solid ${c.icon}"></i></div>
      </div>
      <div class="stat-card-value">${c.value}</div>
      <div class="stat-card-label">${c.label}</div>
    </div>
  `).join('');
}

/* ---- Weather widget ---- */
export function renderWeatherLoading(container) {
  container.innerHTML = `
    <div class="weather-loading">
      <div class="skeleton skeleton-block" style="width:100%"></div>
      <span>Fetching current weather…</span>
    </div>
  `;
}

export function renderWeatherError(container, message) {
  container.innerHTML = `
    <div class="weather-error">
      <i class="fa-solid fa-cloud-bolt"></i>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

export function renderWeatherSuccess(container, cityLabel, weather) {
  const unitLabel = weather.unit === 'imperial' ? '°F' : '°C';
  const windUnitLabel = weather.unit === 'imperial' ? 'mph' : 'km/h';
  const sunrise = weather.sunrise ? new Date(weather.sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
  const sunset = weather.sunset ? new Date(weather.sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

  container.innerHTML = `
    <div class="weather-main">
      <div class="weather-icon"><i class="fa-solid ${weather.icon}"></i></div>
      <div>
        <div class="weather-temp">${weather.temperature}${unitLabel}</div>
        <div class="weather-city">${escapeHtml(cityLabel)}</div>
        <div class="weather-desc">${escapeHtml(weather.description)}</div>
      </div>
    </div>
    <div class="weather-details">
      <div class="weather-detail-item"><div class="value">${weather.humidity}%</div><div class="label">Humidity</div></div>
      <div class="weather-detail-item"><div class="value">${weather.windSpeed} ${windUnitLabel}</div><div class="label">Wind</div></div>
      <div class="weather-detail-item"><div class="value">${weather.feelsLike}${unitLabel}</div><div class="label">Feels like</div></div>
      <div class="weather-detail-item"><div class="value">${sunrise}</div><div class="label">Sunrise</div></div>
      <div class="weather-detail-item"><div class="value">${sunset}</div><div class="label">Sunset</div></div>
    </div>
  `;
}

/* ---- Quote widget ---- */
export function renderQuoteLoading(container) {
  container.innerHTML = `
    <div class="skeleton skeleton-line" style="width:100%"></div>
    <div class="skeleton skeleton-line" style="width:80%"></div>
    <div class="skeleton skeleton-line" style="width:40%; margin-top:20px;"></div>
  `;
}

export function renderQuote(container, quote, isFavorited) {
  container.innerHTML = `
    <p class="quote-text">"${escapeHtml(quote.text)}"</p>
    <p class="quote-author">${escapeHtml(quote.author)}</p>
    <div class="quote-actions">
      <button data-action="favorite-quote" class="${isFavorited ? 'is-favorited' : ''}"><i class="fa-solid fa-heart"></i> ${isFavorited ? 'Saved' : 'Favorite'}</button>
      <button data-action="copy-quote"><i class="fa-solid fa-copy"></i> Copy</button>
      <button data-action="refresh-quote"><i class="fa-solid fa-rotate"></i> New</button>
    </div>
  `;
}

/* ---- Calendar ---- */
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function renderCalendarGrid(container, { year, month, tasksByDay, selectedDay, todayKey }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = WEEKDAY_LABELS.map((d) => `<div class="calendar-weekday">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i += 1) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateKey === todayKey;
    const isSelected = dateKey === selectedDay;
    const dayTasks = tasksByDay[dateKey] || [];
    const dotCount = Math.min(dayTasks.length, 3);

    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateKey}">
        <span>${day}</span>
        ${dotCount ? `<div class="calendar-day-dots">${'<span></span>'.repeat(dotCount)}</div>` : ''}
      </div>
    `;
  }

  container.innerHTML = html;
}

/* ---- Notes ---- */
export function renderNoteCard(note) {
  return `
    <div class="note-card" data-note-id="${note.id}" style="background:${note.color}22; border-color:${note.color}55">
      ${note.pinned ? '<span class="note-pin-indicator"><i class="fa-solid fa-thumbtack"></i></span>' : ''}
      <div class="note-card-head">
        <span class="note-title">${escapeHtml(note.title)}</span>
      </div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-actions">
        <button data-action="pin-note" class="${note.pinned ? 'pinned' : ''}" data-tooltip="Pin"><i class="fa-solid fa-thumbtack"></i></button>
        <button data-action="favorite-note" class="${note.favorite ? 'favorited' : ''}" data-tooltip="Favorite"><i class="fa-solid fa-star"></i></button>
        <button data-action="edit-note" data-tooltip="Edit"><i class="fa-solid fa-pen"></i></button>
        <button data-action="delete-note" data-tooltip="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `;
}

export function renderNotesList(container, notes) {
  if (!notes.length) {
    renderEmptyState(container, {
      icon: 'fa-note-sticky',
      title: 'No notes yet',
      text: 'Jot down something quick — it will show up here.',
    });
    return;
  }
  // Pinned notes float to the top
  const sorted = [...notes].sort((a, b) => (b.pinned === a.pinned ? 0 : b.pinned ? 1 : -1));
  container.innerHTML = sorted.map(renderNoteCard).join('');
}
