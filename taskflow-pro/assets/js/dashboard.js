/**
 * dashboard.js
 * All dashboard-page logic: tasks, calendar, notes, stats, charts, the
 * live clock/greeting, focus tools (Pomodoro/Stopwatch/Countdown),
 * favorites, profile and settings. Rendering is delegated to ui.js;
 * persistence is delegated to storage.js; this file is the controller.
 */

import * as storage from './storage.js?v=5';
import * as ui from './ui.js?v=5';
import * as api from './api.js?v=5';
import {
  generateId,
  formatDate,
  formatDuration,
  copyToClipboard,
  debounce,
  getGreeting,
  isToday,
  isOverdue,
  escapeHtml,
} from './utils.js?v=5';

const DEFAULT_CATEGORIES = [
  'Work', 'School', 'Coding', 'Shopping', 'Health',
  'Finance', 'Fitness', 'Meetings', 'Reading', 'Personal', 'Others',
];

const ACCENTS = {
  signal: { bright: '#e4c767', base: '#c9a227', dim: '#8f7018', glow: 'rgba(201,162,39,0.35)', gradientEnd: '#e4c767' },
  teal: { bright: '#35a88a', base: '#1e6f5c', dim: '#14503f', glow: 'rgba(30,111,92,0.35)', gradientEnd: '#35a88a' },
  amber: { bright: '#d68f5b', base: '#a85c32', dim: '#7e431f', glow: 'rgba(168,92,50,0.35)', gradientEnd: '#d68f5b' },
  coral: { bright: '#b85560', base: '#8c2f39', dim: '#5e1e26', glow: 'rgba(140,47,57,0.35)', gradientEnd: '#b85560' },
};

let currentUser = null;
let charts = {};

/* Task list interaction state */
const taskState = {
  search: '',
  filter: 'all',
  sort: 'createdDesc',
  bulkMode: false,
  selected: new Set(),
};

/* Calendar state */
const calendarState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDateKey: null,
};

/* Deleted-task buffer, enables Undo */
let lastDeletedTask = null;

/* ==========================================================================
   Entry point — called from app.js once requireAuth() has confirmed a user
   ========================================================================== */
export function initDashboard() {
  currentUser = storage.getCurrentUser();
  if (!currentUser) return;

  applySettings();
  initSidebarUser();
  initSidebarNavigation();
  initMobileSidebar();
  initThemeToggleButton();

  initTaskModal();
  initNoteModal();
  initProfileModal();

  initTaskToolbar();
  initCalendar();
  initNotes();
  initFavorites();
  initFocusTools();
  initSettingsView();
  initProfileView();
  initWeatherWidget();
  initDailyOrbit();

  renderEverything();
  renderProfileDetails();

  loadWeather();
  loadQuote();

  // Keep the whole dashboard live: clock ticks every second, and a
  // lightweight re-render sweep every minute keeps "overdue"/"today"
  // badges accurate even in a long-running tab.
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(renderEverything, 60000);

  // Reminder engine: check every 15s for tasks whose due time has just
  // arrived, so an alert never waits for the next full-minute sweep.
  checkTaskReminders();
  setInterval(checkTaskReminders, 15000);

  // The quote of the day rotates automatically once 24 hours pass, even
  // if the dashboard tab is just left open in the background.
  setInterval(checkQuoteExpiry, 5 * 60 * 1000);
}

function renderEverything() {
  renderStatCards();
  renderTodayTasks();
  renderTaskList();
  renderCalendarView();
  renderNotesGrid();
  renderFavorites();
  renderAnalytics();
  renderDailyOrbitTasks();
  updateSidebarBadge();
}

/* ==========================================================================
   Clock + greeting
   ========================================================================== */
function updateClock() {
  const now = new Date();
  const settings = storage.getSettings(currentUser.id);
  const format24h = settings.timeFormat === '24h';

  const clockEl = document.getElementById('liveClock');
  if (clockEl) {
    if (format24h) {
      clockEl.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
    } else {
      clockEl.textContent = now.toLocaleTimeString('en-US');
    }
  }

  const greetingEl = document.getElementById('greetingText');
  if (greetingEl) {
    greetingEl.textContent = `${getGreeting(now)}, ${currentUser.fullName.split(' ')[0]}`;
  }

  const dateLineEl = document.getElementById('dateLine');
  if (dateLineEl) {
    dateLineEl.textContent = formatDate(now);
  }

  updateOrbitHand(now, format24h);
}

/* ==========================================================================
   Sidebar: user card, navigation, mobile toggle
   ========================================================================== */
function initSidebarUser() {
  document.getElementById('sidebarAvatar').textContent = currentUser.avatarInitials || '??';
  document.getElementById('sidebarUserName').textContent = currentUser.fullName;
  document.getElementById('sidebarUserEmail').textContent = currentUser.email;

  document.getElementById('sidebarUser').addEventListener('click', () => {
    ui.setActiveSidebarLink('profile');
  });
}

function initSidebarNavigation() {
  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      ui.setActiveSidebarLink(link.dataset.view);
      closeMobileSidebar();
    });
  });

  // Bottom nav (mobile web-app pattern): same view-switching, its own
  // active-state highlight kept in sync by ui.setActiveSidebarLink.
  document.querySelectorAll('.bottom-nav-link[data-view]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      ui.setActiveSidebarLink(link.dataset.view);
    });
  });

  // Buttons elsewhere that jump to a view (e.g. "View all tasks")
  document.querySelectorAll('[data-goto-view]').forEach((btn) => {
    btn.addEventListener('click', () => ui.setActiveSidebarLink(btn.dataset.gotoView));
  });
}

function initMobileSidebar() {
  const moreBtn = document.getElementById('bottomNavMore');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!moreBtn) return;

  // "More" opens the full sidebar as a drawer, giving access to
  // Favorites, Focus, Analytics, Profile, Settings and Logout without
  // duplicating that list inside the bottom nav itself.
  moreBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  });
  overlay.addEventListener('click', closeMobileSidebar);
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

function updateSidebarBadge() {
  const tasks = storage.getTasks(currentUser.id).filter((t) => t.status !== 'completed' && t.status !== 'archived');
  document.getElementById('taskCountBadge').textContent = tasks.length;
}

/* ==========================================================================
   Categories
   ========================================================================== */
function getAllCategories() {
  const custom = storage.getCustomCategories(currentUser.id);
  return [...DEFAULT_CATEGORIES, ...custom];
}

function populateCategorySelect(selectEl, selectedValue) {
  const categories = getAllCategories();
  selectEl.innerHTML = categories.map((c) => `<option value="${c}">${c}</option>`).join('');
  if (selectedValue) selectEl.value = selectedValue;
}

/* ==========================================================================
   Stats + productivity score
   ========================================================================== */
function computeStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const overdue = tasks.filter((t) => t.dueDate && isOverdue(t.dueDate, t.status)).length;
  const today = tasks.filter((t) => t.dueDate && isToday(t.dueDate) && t.status !== 'completed').length;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= weekStart).length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdueRatio = total > 0 ? overdue / total : 0;
  const productivityScore = Math.max(0, Math.min(100, Math.round(completionRate * 0.75 + (1 - overdueRatio) * 25)));

  return { total, completed, pending, overdue, today, thisWeek, completionRate, productivityScore };
}

function renderStatCards() {
  const tasks = storage.getTasks(currentUser.id);
  const stats = computeStats(tasks);
  ui.renderStatCards(document.getElementById('statCardsGrid'), stats);
}

/* ==========================================================================
   Today's tasks (dashboard home panel)
   ========================================================================== */
function renderTodayTasks() {
  const tasks = storage.getTasks(currentUser.id).filter(
    (t) => t.status !== 'archived' && t.dueDate && isToday(t.dueDate)
  );
  const container = document.getElementById('todayTaskList');
  if (!tasks.length) {
    ui.renderEmptyState(container, {
      icon: 'fa-mug-hot',
      title: 'Nothing due today',
      text: 'Enjoy the calm, or add a task to get ahead of tomorrow.',
    });
    return;
  }
  ui.renderTaskList(container, tasks);
  attachTaskCardListeners(container);
}

/* ==========================================================================
   Task filtering, sorting, search
   ========================================================================== */
function getFilteredSortedTasks() {
  let tasks = storage.getTasks(currentUser.id).filter((t) => t.status !== 'archived');

  const search = taskState.search.trim().toLowerCase();
  if (search) {
    tasks = tasks.filter((t) =>
      t.title.toLowerCase().includes(search) ||
      (t.description || '').toLowerCase().includes(search) ||
      t.category.toLowerCase().includes(search) ||
      t.priority.toLowerCase().includes(search) ||
      t.status.toLowerCase().includes(search)
    );
  }

  switch (taskState.filter) {
    case 'pending':
      tasks = tasks.filter((t) => t.status === 'pending');
      break;
    case 'completed':
      tasks = tasks.filter((t) => t.status === 'completed');
      break;
    case 'favorites':
      tasks = tasks.filter((t) => t.favorite);
      break;
    case 'overdue':
      tasks = tasks.filter((t) => t.dueDate && isOverdue(t.dueDate, t.status));
      break;
    case 'today':
      tasks = tasks.filter((t) => t.dueDate && isToday(t.dueDate));
      break;
    default:
      break;
  }

  const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };
  switch (taskState.sort) {
    case 'createdAsc':
      tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'dueDate':
      tasks.sort((a, b) => new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31'));
      break;
    case 'priority':
      tasks.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
      break;
    case 'alphabetical':
      tasks.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'manual':
      tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      break;
    default: // createdDesc
      tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }

  return tasks;
}

function renderTaskList() {
  const container = document.getElementById('taskList');
  const tasks = getFilteredSortedTasks();
  ui.renderTaskList(container, tasks, {
    bulkMode: taskState.bulkMode,
    selected: false,
  });
  container.querySelectorAll('.task-select-checkbox').forEach((cb) => {
    const taskId = cb.closest('.task-card').dataset.taskId;
    cb.checked = taskState.selected.has(taskId);
  });
  attachTaskCardListeners(container, { draggable: taskState.sort === 'manual' || taskState.sort === 'createdDesc' });
  updateBulkBar();
}

function initTaskToolbar() {
  const searchInput = document.getElementById('taskSearchInput');
  searchInput.addEventListener('input', debounce(() => {
    taskState.search = searchInput.value;
    renderTaskList();
  }, 250));

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    taskState.sort = e.target.value;
    renderTaskList();
  });

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      taskState.filter = chip.dataset.filter;
      renderTaskList();
    });
  });

  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());

  const bulkToggle = document.getElementById('bulkModeToggle');
  bulkToggle.addEventListener('click', () => {
    taskState.bulkMode = !taskState.bulkMode;
    taskState.selected.clear();
    document.getElementById('taskList').classList.toggle('bulk-mode', taskState.bulkMode);
    bulkToggle.innerHTML = taskState.bulkMode
      ? '<i class="fa-solid fa-xmark"></i> Cancel'
      : '<i class="fa-solid fa-list-check"></i> Select';
    renderTaskList();
  });

  document.getElementById('bulkCompleteBtn').addEventListener('click', () => {
    taskState.selected.forEach((id) => storage.updateTask(id, { status: 'completed' }));
    ui.showToast('Tasks completed', `${taskState.selected.size} task(s) marked complete.`, 'success');
    taskState.selected.clear();
    renderEverything();
  });

  document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
    const count = taskState.selected.size;
    storage.deleteTasks([...taskState.selected]);
    ui.showToast('Tasks deleted', `${count} task(s) removed.`, 'success');
    taskState.selected.clear();
    renderEverything();
  });
}

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  bar.classList.toggle('active', taskState.bulkMode && taskState.selected.size > 0);
  document.getElementById('bulkCountLabel').textContent = `${taskState.selected.size} selected`;
}

/* ==========================================================================
   Task card event delegation (checkbox, favorite, edit, delete, duplicate,
   select-for-bulk, drag-and-drop reorder)
   ========================================================================== */
function attachTaskCardListeners(container, { draggable = true } = {}) {
  container.querySelectorAll('.task-card').forEach((card) => {
    const taskId = card.dataset.taskId;

    card.querySelector('[data-action="toggle-complete"]').addEventListener('click', () => {
      const task = storage.getTaskById(taskId);
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      storage.updateTask(taskId, { status: newStatus });
      ui.showToast(newStatus === 'completed' ? 'Task completed' : 'Task reopened', task.title, 'success');
      renderEverything();
    });

    const favBtn = card.querySelector('[data-action="favorite-task"]');
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        const task = storage.getTaskById(taskId);
        storage.updateTask(taskId, { favorite: !task.favorite });
        renderEverything();
      });
    }

    const dupBtn = card.querySelector('[data-action="duplicate-task"]');
    if (dupBtn) {
      dupBtn.addEventListener('click', () => {
        const task = storage.getTaskById(taskId);
        const now = new Date().toISOString();
        storage.saveTask({
          ...task,
          id: generateId('task'),
          title: `${task.title} (copy)`,
          status: 'pending',
          favorite: false,
          reminded: false,
          createdAt: now,
          updatedAt: now,
        });
        ui.showToast('Task duplicated', task.title, 'success');
        renderEverything();
      });
    }

    const editBtn = card.querySelector('[data-action="edit-task"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => openTaskModal(taskId));
    }

    const deleteBtn = card.querySelector('[data-action="delete-task"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteTaskWithUndo(taskId));
    }

    const selectCb = card.querySelector('[data-action="select-task"]');
    if (selectCb) {
      selectCb.addEventListener('change', () => {
        if (selectCb.checked) taskState.selected.add(taskId);
        else taskState.selected.delete(taskId);
        updateBulkBar();
      });
    }

    if (draggable) {
      card.addEventListener('dragstart', () => card.classList.add('dragging'));
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        container.querySelectorAll('.task-card').forEach((c) => c.classList.remove('drag-over'));
        persistManualOrder(container);
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = container.querySelector('.dragging');
        if (!dragging || dragging === card) return;
        const rect = card.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        container.insertBefore(dragging, before ? card : card.nextSibling);
      });
    }
  });
}

function persistManualOrder(container) {
  const cards = [...container.querySelectorAll('.task-card')];
  cards.forEach((card, index) => {
    storage.updateTask(card.dataset.taskId, { order: index });
  });
  taskState.sort = 'manual';
  document.getElementById('sortSelect').value = 'manual';
  renderEverything();
}

/* ==========================================================================
   Undo Delete
   ========================================================================== */
function deleteTaskWithUndo(taskId) {
  const task = storage.getTaskById(taskId);
  if (!task) return;
  lastDeletedTask = task;
  storage.deleteTask(taskId);
  renderEverything();

  ui.showToast('Task deleted', task.title, 'info', 5000, {
    label: 'Undo',
    onClick: () => {
      if (lastDeletedTask && lastDeletedTask.id === taskId) {
        storage.saveTask(lastDeletedTask);
        lastDeletedTask = null;
        renderEverything();
        ui.showToast('Task restored', task.title, 'success');
      }
    },
  });
}

/* ==========================================================================
   Task Reminders
   Checks every 15s for tasks whose due date/time has just arrived and
   alerts with a toast, a short two-tone chime, and (if permitted) a
   native browser notification. Each task alerts once via its
   `reminded` flag, which is cleared automatically if its due date/time
   is edited later.
   ========================================================================== */
const REMINDER_GRACE_MS = 15 * 60 * 1000; // still worth alerting within 15 min of due time

function checkTaskReminders() {
  const settings = storage.getSettings(currentUser.id);
  const dueTasks = storage.getTasks(currentUser.id).filter(
    (t) => t.status === 'pending' && t.dueDate && t.dueTime && !t.reminded
  );
  if (!dueTasks.length) return;

  const now = new Date();

  dueTasks.forEach((task) => {
    const dueAt = new Date(`${task.dueDate}T${task.dueTime}`);
    if (Number.isNaN(dueAt.getTime()) || now < dueAt) return;

    const msPastDue = now - dueAt;
    if (msPastDue <= REMINDER_GRACE_MS && settings.notificationsEnabled) {
      triggerTaskReminder(task);
    }
    // Beyond the grace window (or with alerts off) we still mark it
    // handled, so a task that was due while the tab was closed doesn't
    // suddenly fire the moment the person comes back hours later.
    storage.updateTask(task.id, { reminded: true });
  });
}

function triggerTaskReminder(task) {
  playReminderChime();

  ui.showToast('Task due now', task.title, 'info', 8000, {
    label: 'Mark complete',
    onClick: () => {
      storage.updateTask(task.id, { status: 'completed' });
      renderEverything();
      ui.showToast('Task completed', task.title, 'success');
    },
  });

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification('TaskFlow Pro', { body: `${task.title} is due now.` });
    } catch (err) {
      console.warn('Browser notification failed:', err);
    }
  }
}

/** A short, pleasant two-tone chime built with the Web Audio API — no
 *  external audio file needed, so it works fully offline. */
function playReminderChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const startTime = ctx.currentTime;

    [880, 1108.7].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const noteStart = startTime + i * 0.16;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.16, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + 0.42);
    });
  } catch (err) {
    console.warn('Reminder chime failed to play:', err);
  }
}

/** Request permission for native browser notifications (must run from
 *  a user gesture, so it's wired to a Settings button rather than
 *  called automatically on load). */
function requestNotificationPermission() {
  if (typeof Notification === 'undefined') {
    ui.showToast('Not supported', 'This browser does not support desktop notifications.', 'error');
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      ui.showToast('Notifications enabled', "You'll get a desktop alert when a task is due.", 'success');
    } else {
      ui.showToast('Notifications blocked', 'You can still see in-app reminders.', 'info');
    }
    syncNotificationButtonLabel();
  });
}

function syncNotificationButtonLabel() {
  const btn = document.getElementById('enableDesktopNotifBtn');
  if (!btn || typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Enabled';
    btn.disabled = true;
  } else {
    btn.innerHTML = '<i class="fa-solid fa-bell"></i> Enable';
    btn.disabled = false;
  }
}

/* ==========================================================================
   Task modal (create + edit)
   ========================================================================== */
function initTaskModal() {
  const modal = document.getElementById('taskModal');
  ui.initModalDismiss(modal);

  document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    if (!title) {
      ui.setFieldError(document.getElementById('taskTitle'), 'Title is required.');
      return;
    }
    ui.clearFieldError(document.getElementById('taskTitle'));

    const taskId = document.getElementById('taskId').value;
    const payload = {
      title,
      description: document.getElementById('taskDescription').value.trim(),
      category: document.getElementById('taskCategory').value,
      priority: document.getElementById('taskPriority').value,
      dueDate: document.getElementById('taskDueDate').value || null,
      dueTime: document.getElementById('taskDueTime').value || null,
    };

    if (taskId) {
      const existing = storage.getTaskById(taskId);
      // If the due date/time changed, clear the "reminded" flag so the
      // reminder system treats this as a fresh deadline to alert on.
      const dueChanged = existing.dueDate !== payload.dueDate || existing.dueTime !== payload.dueTime;
      storage.updateTask(taskId, { ...payload, ...(dueChanged ? { reminded: false } : {}) });
      ui.showToast('Task updated', title, 'success');
    } else {
      const now = new Date().toISOString();
      storage.saveTask({
        id: generateId('task'),
        userId: currentUser.id,
        ...payload,
        status: 'pending',
        favorite: false,
        reminded: false,
        order: storage.getTasks(currentUser.id).length,
        createdAt: now,
        updatedAt: now,
      });
      ui.showToast('Task created', title, 'success');
    }

    ui.closeModal(modal);
    renderEverything();
  });
}

function openTaskModal(taskId = null) {
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  form.reset();
  ui.clearAllFieldErrors(form);

  populateCategorySelect(document.getElementById('taskCategory'));

  if (taskId) {
    const task = storage.getTaskById(taskId);
    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    populateCategorySelect(document.getElementById('taskCategory'), task.category);
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.dueDate ? task.dueDate.slice(0, 10) : '';
    document.getElementById('taskDueTime').value = task.dueTime || '';
  } else {
    document.getElementById('taskModalTitle').textContent = 'New Task';
    document.getElementById('taskId').value = '';
  }

  ui.openModal(modal);
}

/* ==========================================================================
   Calendar
   ========================================================================== */
function initCalendar() {
  document.getElementById('calendarPrevBtn').addEventListener('click', () => {
    calendarState.month -= 1;
    if (calendarState.month < 0) {
      calendarState.month = 11;
      calendarState.year -= 1;
    }
    renderCalendarView();
  });

  document.getElementById('calendarNextBtn').addEventListener('click', () => {
    calendarState.month += 1;
    if (calendarState.month > 11) {
      calendarState.month = 0;
      calendarState.year += 1;
    }
    renderCalendarView();
  });

  document.getElementById('calendarTodayBtn').addEventListener('click', () => {
    const now = new Date();
    calendarState.year = now.getFullYear();
    calendarState.month = now.getMonth();
    calendarState.selectedDateKey = dateKey(now);
    renderCalendarView();
  });
}

function dateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderCalendarView() {
  const monthLabel = new Date(calendarState.year, calendarState.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  document.getElementById('calendarMonthLabel').textContent = monthLabel;

  const tasks = storage.getTasks(currentUser.id).filter((t) => t.dueDate && t.status !== 'archived');
  const tasksByDay = {};
  tasks.forEach((t) => {
    const key = t.dueDate.slice(0, 10);
    if (!tasksByDay[key]) tasksByDay[key] = [];
    tasksByDay[key].push(t);
  });

  ui.renderCalendarGrid(document.getElementById('calendarGrid'), {
    year: calendarState.year,
    month: calendarState.month,
    tasksByDay,
    selectedDay: calendarState.selectedDateKey,
    todayKey: dateKey(new Date()),
  });

  document.querySelectorAll('.calendar-day[data-date]').forEach((dayEl) => {
    dayEl.addEventListener('click', () => {
      calendarState.selectedDateKey = dayEl.dataset.date;
      renderCalendarView();
    });
  });

  renderCalendarDayTasks(tasksByDay);
}

function renderCalendarDayTasks(tasksByDay) {
  const label = document.getElementById('calendarSelectedDateLabel');
  const container = document.getElementById('calendarDayTaskList');

  if (!calendarState.selectedDateKey) {
    label.textContent = 'Select a date';
    ui.renderEmptyState(container, {
      icon: 'fa-calendar-day',
      title: 'No date selected',
      text: 'Click a day on the calendar to see its tasks.',
    });
    return;
  }

  label.textContent = formatDate(calendarState.selectedDateKey);
  const tasks = tasksByDay[calendarState.selectedDateKey] || [];
  if (!tasks.length) {
    ui.renderEmptyState(container, {
      icon: 'fa-mug-hot',
      title: 'Nothing scheduled',
      text: 'No tasks are due on this day.',
    });
    return;
  }
  ui.renderTaskList(container, tasks);
  attachTaskCardListeners(container, { draggable: false });
}

/* ==========================================================================
   Daily Orbit — signature feature
   A live 24-hour radial dial on the dashboard home. A gold "now" hand
   sweeps once per day; today's timed tasks sit around the ring at their
   due time, color-coded by priority. It's the same clock-face idea as
   the Pomodoro ring, scaled up to show the whole day at a glance and
   tied directly into the reminder system below.
   ========================================================================== */
const ORBIT_CENTER = 160;
const ORBIT_RADIUS = 130;

function polarToPoint(angleDeg, radius) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: ORBIT_CENTER + radius * Math.cos(rad),
    y: ORBIT_CENTER + radius * Math.sin(rad),
  };
}

function initDailyOrbit() {
  const ticksGroup = document.getElementById('orbitTicks');
  if (!ticksGroup) return;

  const majorHours = { 0: '12AM', 6: '6AM', 12: '12PM', 18: '6PM' };
  let markup = '';

  for (let hour = 0; hour < 24; hour += 1) {
    const angle = (hour / 24) * 360;
    const isMajor = hour in majorHours;
    const inner = polarToPoint(angle, isMajor ? 116 : 122);
    const outer = polarToPoint(angle, ORBIT_RADIUS);
    markup += `<line class="orbit-tick${isMajor ? ' major' : ''}" x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}"></line>`;

    if (isMajor) {
      const labelPos = polarToPoint(angle, 98);
      markup += `<text class="orbit-tick-label" x="${labelPos.x.toFixed(1)}" y="${(labelPos.y + 4).toFixed(1)}">${majorHours[hour]}</text>`;
    }
  }

  ticksGroup.innerHTML = markup;
}

function updateOrbitHand(now, format24h) {
  const hand = document.getElementById('orbitNowHand');
  if (!hand) return;

  const fractionOfDay = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  const angle = fractionOfDay * 360;
  hand.setAttribute('transform', `rotate(${angle.toFixed(2)} ${ORBIT_CENTER} ${ORBIT_CENTER})`);

  const readout = document.getElementById('orbitTimeReadout');
  if (readout) {
    readout.textContent = format24h
      ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      : now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}

const ORBIT_PRIORITY_COLOR = {
  low: 'var(--teal)',
  medium: 'var(--amber)',
  high: 'var(--coral)',
  urgent: 'var(--coral)',
};

function renderDailyOrbitTasks() {
  const dotsGroup = document.getElementById('orbitTaskDots');
  const subLabel = document.getElementById('orbitTasksReadout');
  if (!dotsGroup) return;

  const tasks = storage.getTasks(currentUser.id).filter(
    (t) => t.status === 'pending' && t.dueDate && t.dueTime && isToday(t.dueDate)
  );

  if (subLabel) {
    subLabel.textContent = tasks.length
      ? `${tasks.length} task${tasks.length === 1 ? '' : 's'} scheduled today`
      : 'Nothing scheduled today';
  }

  if (!tasks.length) {
    dotsGroup.innerHTML = '';
    return;
  }

  dotsGroup.innerHTML = tasks.map((task) => {
    const [hh, mm] = task.dueTime.split(':').map(Number);
    const angle = ((hh * 60 + mm) / 1440) * 360;
    const pos = polarToPoint(angle, ORBIT_RADIUS);
    const isUrgent = task.priority === 'urgent';
    const color = ORBIT_PRIORITY_COLOR[task.priority] || 'var(--signal)';
    return `<circle class="orbit-task-dot${isUrgent ? ' urgent' : ''}" data-task-id="${task.id}" cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${isUrgent ? 7 : 6}" style="fill:${color}"><title>${escapeHtml(task.title)} — ${task.dueTime}</title></circle>`;
  }).join('');

  dotsGroup.querySelectorAll('.orbit-task-dot').forEach((dot) => {
    dot.addEventListener('click', () => openTaskModal(dot.dataset.taskId));
  });
}

/* ==========================================================================
   Notes
   ========================================================================== */
function initNotes() {
  document.getElementById('addNoteBtn').addEventListener('click', () => openNoteModal());
}

function renderNotesGrid() {
  const notes = storage.getNotes(currentUser.id);
  const container = document.getElementById('notesGrid');
  ui.renderNotesList(container, notes);
  attachNoteCardListeners(container);
}

function attachNoteCardListeners(container) {
  container.querySelectorAll('.note-card').forEach((card) => {
    const noteId = card.dataset.noteId;

    const pinBtn = card.querySelector('[data-action="pin-note"]');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => {
        const note = storage.getAllNotes().find((n) => n.id === noteId);
        storage.updateNote(noteId, { pinned: !note.pinned });
        renderEverything();
      });
    }

    const favBtn = card.querySelector('[data-action="favorite-note"]');
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        const note = storage.getAllNotes().find((n) => n.id === noteId);
        storage.updateNote(noteId, { favorite: !note.favorite });
        renderEverything();
      });
    }

    const editBtn = card.querySelector('[data-action="edit-note"]');
    if (editBtn) editBtn.addEventListener('click', () => openNoteModal(noteId));

    const deleteBtn = card.querySelector('[data-action="delete-note"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        storage.deleteNote(noteId);
        ui.showToast('Note deleted', '', 'success');
        renderEverything();
      });
    }
  });
}

function initNoteModal() {
  const modal = document.getElementById('noteModal');
  ui.initModalDismiss(modal);

  document.querySelectorAll('#noteColorRow .color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('#noteColorRow .color-swatch').forEach((s) => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
  });

  document.getElementById('noteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('noteTitle').value.trim();
    if (!title) {
      ui.setFieldError(document.getElementById('noteTitle'), 'Title is required.');
      return;
    }
    ui.clearFieldError(document.getElementById('noteTitle'));

    const noteId = document.getElementById('noteId').value;
    const selectedSwatch = document.querySelector('#noteColorRow .color-swatch.selected');
    const payload = {
      title,
      content: document.getElementById('noteContent').value.trim(),
      color: selectedSwatch ? selectedSwatch.dataset.color : '#c9a227',
    };

    if (noteId) {
      storage.updateNote(noteId, payload);
      ui.showToast('Note updated', title, 'success');
    } else {
      const now = new Date().toISOString();
      storage.saveNote({
        id: generateId('note'),
        userId: currentUser.id,
        ...payload,
        pinned: false,
        favorite: false,
        createdAt: now,
        updatedAt: now,
      });
      ui.showToast('Note saved', title, 'success');
    }

    ui.closeModal(modal);
    renderEverything();
  });
}

function openNoteModal(noteId = null) {
  const modal = document.getElementById('noteModal');
  const form = document.getElementById('noteForm');
  form.reset();
  ui.clearAllFieldErrors(form);
  document.querySelectorAll('#noteColorRow .color-swatch').forEach((s, i) => s.classList.toggle('selected', i === 0));

  if (noteId) {
    const note = storage.getAllNotes().find((n) => n.id === noteId);
    document.getElementById('noteModalTitle').textContent = 'Edit Note';
    document.getElementById('noteId').value = note.id;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    document.querySelectorAll('#noteColorRow .color-swatch').forEach((s) => {
      s.classList.toggle('selected', s.dataset.color === note.color);
    });
  } else {
    document.getElementById('noteModalTitle').textContent = 'New Note';
    document.getElementById('noteId').value = '';
  }

  ui.openModal(modal);
}

/* ==========================================================================
   Favorites
   ========================================================================== */
function initFavorites() {
  document.querySelectorAll('[data-fav-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-fav-tab]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('favTasksList').style.display = tab.dataset.favTab === 'tasks' ? 'block' : 'none';
      document.getElementById('favQuotesList').style.display = tab.dataset.favTab === 'quotes' ? 'block' : 'none';
      document.getElementById('favNotesList').style.display = tab.dataset.favTab === 'notes' ? 'grid' : 'none';
    });
  });
}

function renderFavorites() {
  const favTasks = storage.getTasks(currentUser.id).filter((t) => t.favorite);
  const favTasksContainer = document.getElementById('favTasksList');
  if (!favTasks.length) {
    ui.renderEmptyState(favTasksContainer, { icon: 'fa-star', title: 'No favorite tasks', text: 'Star a task to pin it here.' });
  } else {
    ui.renderTaskList(favTasksContainer, favTasks);
    attachTaskCardListeners(favTasksContainer, { draggable: false });
  }

  const favQuotes = storage.getFavoriteQuotes(currentUser.id);
  const favQuotesContainer = document.getElementById('favQuotesList');
  if (!favQuotes.length) {
    ui.renderEmptyState(favQuotesContainer, { icon: 'fa-quote-left', title: 'No favorite quotes', text: 'Save a quote from the dashboard widget.' });
  } else {
    favQuotesContainer.innerHTML = favQuotes.map((q) => `
      <div class="task-card">
        <div class="task-body">
          <div class="task-title" style="font-family:var(--font-display); font-weight:500;">"${q.text}"</div>
          <div class="task-description">— ${q.author}</div>
        </div>
        <div class="task-actions">
          <button data-quote-id="${q.id}" class="delete-btn" data-tooltip="Remove"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
    favQuotesContainer.querySelectorAll('[data-quote-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        storage.deleteFavoriteQuote(btn.dataset.quoteId);
        renderEverything();
      });
    });
  }

  const pinnedNotes = storage.getNotes(currentUser.id).filter((n) => n.pinned);
  const favNotesContainer = document.getElementById('favNotesList');
  if (!pinnedNotes.length) {
    ui.renderEmptyState(favNotesContainer, { icon: 'fa-thumbtack', title: 'No pinned notes', text: 'Pin a note to keep it handy here.' });
  } else {
    ui.renderNotesList(favNotesContainer, pinnedNotes);
    attachNoteCardListeners(favNotesContainer);
  }
}

/* ==========================================================================
   Weather widget
   ========================================================================== */
async function loadWeather(coords = null, cityLabelOverride = null) {
  const container = document.getElementById('weatherContent');
  ui.renderWeatherLoading(container);

  const settings = storage.getSettings(currentUser.id);

  try {
    let latitude;
    let longitude;
    let cityLabel;

    if (coords) {
      ({ latitude, longitude } = coords);
      cityLabel = cityLabelOverride || 'Current location';
    } else {
      // Default demo city so the widget always has something to show
      // before the person searches or grants location access.
      const place = await api.geocodeCity('Lagos');
      latitude = place.latitude;
      longitude = place.longitude;
      cityLabel = `${place.name}, ${place.country}`;
    }

    const weather = await api.fetchWeatherByCoords(latitude, longitude, settings.weatherUnit);
    ui.renderWeatherSuccess(container, cityLabel, weather);
  } catch (err) {
    ui.renderWeatherError(container, err.message || 'Could not load weather right now.');
  }
}

function initWeatherWidget() {
  document.getElementById('citySearchBtn').addEventListener('click', searchCityWeather);
  document.getElementById('citySearchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchCityWeather();
  });

  document.getElementById('weatherRefreshBtn').addEventListener('click', () => loadWeather());

  document.getElementById('weatherLocationBtn').addEventListener('click', async () => {
    const container = document.getElementById('weatherContent');
    ui.renderWeatherLoading(container);
    try {
      const coords = await api.getCurrentPosition();
      await loadWeather(coords, 'Current location');
    } catch (err) {
      ui.renderWeatherError(container, err.message);
    }
  });
}

async function searchCityWeather() {
  const input = document.getElementById('citySearchInput');
  const query = input.value.trim();
  if (!query) return;

  const container = document.getElementById('weatherContent');
  ui.renderWeatherLoading(container);

  try {
    const place = await api.geocodeCity(query);
    await loadWeather({ latitude: place.latitude, longitude: place.longitude }, `${place.name}, ${place.country}`);
  } catch (err) {
    ui.renderWeatherError(container, err.message);
  }
}

/* ==========================================================================
   Quote widget
   Shows one "quote of the day" that stays put for 24 hours, then rotates
   automatically. A manual refresh fetches a new one immediately and
   restarts that 24-hour window from that moment.
   ========================================================================== */
const QUOTE_ROTATION_MS = 24 * 60 * 60 * 1000;
let currentQuote = null;

async function loadQuote(forceNew = false) {
  const container = document.getElementById('quoteContent');
  const cached = storage.getDailyQuote(currentUser.id);
  const isExpired = !cached || (Date.now() - new Date(cached.fetchedAt).getTime()) >= QUOTE_ROTATION_MS;

  if (!forceNew && cached && !isExpired) {
    currentQuote = cached;
    renderCurrentQuote(container);
    return;
  }

  ui.renderQuoteLoading(container);
  const fresh = await api.fetchRandomQuote();
  currentQuote = { ...fresh, fetchedAt: new Date().toISOString() };
  storage.saveDailyQuote(currentUser.id, currentQuote);
  renderCurrentQuote(container);
}

function renderCurrentQuote(container) {
  const isFav = storage.isQuoteFavorited(currentUser.id, currentQuote.text);
  ui.renderQuote(container, currentQuote, isFav);
  attachQuoteListeners(container);
}

/** Called periodically so a long-open tab still rotates the quote once
 *  the 24-hour window elapses, without needing a page refresh. */
function checkQuoteExpiry() {
  const cached = storage.getDailyQuote(currentUser.id);
  if (!cached || (Date.now() - new Date(cached.fetchedAt).getTime()) >= QUOTE_ROTATION_MS) {
    loadQuote();
  }
}

function attachQuoteListeners(container) {
  const favBtn = container.querySelector('[data-action="favorite-quote"]');
  favBtn.addEventListener('click', () => {
    if (storage.isQuoteFavorited(currentUser.id, currentQuote.text)) {
      const existing = storage.getFavoriteQuotes(currentUser.id).find((q) => q.text === currentQuote.text);
      if (existing) storage.deleteFavoriteQuote(existing.id);
      ui.showToast('Removed from favorites', '', 'info');
    } else {
      storage.saveFavoriteQuote({
        id: generateId('quote'),
        userId: currentUser.id,
        text: currentQuote.text,
        author: currentQuote.author,
        createdAt: new Date().toISOString(),
      });
      ui.showToast('Quote saved', 'Added to your favorites.', 'success');
    }
    renderEverything();
    renderCurrentQuote(container);
  });

  container.querySelector('[data-action="copy-quote"]').addEventListener('click', async () => {
    const success = await copyToClipboard(`"${currentQuote.text}" — ${currentQuote.author}`);
    ui.showToast(success ? 'Copied to clipboard' : 'Copy failed', '', success ? 'success' : 'error');
  });

  // "New" button: the person can always generate their own on demand,
  // which becomes the new quote of the day and restarts the 24h timer.
  container.querySelector('[data-action="refresh-quote"]').addEventListener('click', () => loadQuote(true));
}

/* ==========================================================================
   Focus Tools: Pomodoro, Stopwatch, Countdown
   ========================================================================== */
function initFocusTools() {
  document.querySelectorAll('[data-focus-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-focus-tab]').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('[data-focus-panel]').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`[data-focus-panel="${tab.dataset.focusTab}"]`).classList.add('active');
    });
  });

  initPomodoro();
  initStopwatch();
  initCountdownTimer();
}

function setRingProgress(ringEl, progress /* 0..1 */) {
  const radius = Number(ringEl.getAttribute('r'));
  const circumference = 2 * Math.PI * radius;
  ringEl.style.strokeDasharray = `${circumference}`;
  ringEl.style.strokeDashoffset = `${circumference * (1 - progress)}`;
}

/* ---- Pomodoro ---- */
const pomodoro = {
  focusSeconds: 25 * 60,
  breakSeconds: 5 * 60,
  remaining: 25 * 60,
  mode: 'focus',
  running: false,
  intervalId: null,
};

function initPomodoro() {
  const ring = document.getElementById('pomodoroRing');
  setRingProgress(ring, 0);
  renderPomodoro();

  document.getElementById('pomodoroToggle').addEventListener('click', () => {
    pomodoro.running ? pausePomodoro() : startPomodoro();
  });
  document.getElementById('pomodoroReset').addEventListener('click', resetPomodoro);
  document.getElementById('pomodoroSkip').addEventListener('click', skipPomodoro);
}

function renderPomodoro() {
  document.getElementById('pomodoroTime').textContent = formatDuration(pomodoro.remaining);
  document.getElementById('pomodoroModeLabel').textContent = pomodoro.mode === 'focus' ? 'Focus session' : 'Break time';
  const total = pomodoro.mode === 'focus' ? pomodoro.focusSeconds : pomodoro.breakSeconds;
  setRingProgress(document.getElementById('pomodoroRing'), 1 - pomodoro.remaining / total);
  const toggleBtn = document.getElementById('pomodoroToggle');
  toggleBtn.innerHTML = pomodoro.running ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
}

function startPomodoro() {
  pomodoro.running = true;
  renderPomodoro();
  pomodoro.intervalId = setInterval(() => {
    pomodoro.remaining -= 1;
    if (pomodoro.remaining <= 0) {
      pomodoro.mode = pomodoro.mode === 'focus' ? 'break' : 'focus';
      pomodoro.remaining = pomodoro.mode === 'focus' ? pomodoro.focusSeconds : pomodoro.breakSeconds;
      ui.showToast(
        pomodoro.mode === 'focus' ? 'Break over' : 'Focus session complete',
        pomodoro.mode === 'focus' ? 'Back to focused work.' : 'Take a five-minute break.',
        'info'
      );
    }
    renderPomodoro();
  }, 1000);
}

function pausePomodoro() {
  pomodoro.running = false;
  clearInterval(pomodoro.intervalId);
  renderPomodoro();
}

function resetPomodoro() {
  pausePomodoro();
  pomodoro.mode = 'focus';
  pomodoro.remaining = pomodoro.focusSeconds;
  renderPomodoro();
}

function skipPomodoro() {
  pomodoro.mode = pomodoro.mode === 'focus' ? 'break' : 'focus';
  pomodoro.remaining = pomodoro.mode === 'focus' ? pomodoro.focusSeconds : pomodoro.breakSeconds;
  renderPomodoro();
}

/* ---- Stopwatch ---- */
const stopwatch = { elapsed: 0, running: false, intervalId: null, laps: [] };

function initStopwatch() {
  renderStopwatch();
  document.getElementById('stopwatchToggle').addEventListener('click', () => {
    stopwatch.running ? pauseStopwatch() : startStopwatch();
  });
  document.getElementById('stopwatchReset').addEventListener('click', resetStopwatch);
  document.getElementById('stopwatchLap').addEventListener('click', addLap);
}

function renderStopwatch() {
  document.getElementById('stopwatchTime').textContent = formatDuration(stopwatch.elapsed);
  const toggleBtn = document.getElementById('stopwatchToggle');
  toggleBtn.innerHTML = stopwatch.running ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
}

function startStopwatch() {
  stopwatch.running = true;
  renderStopwatch();
  stopwatch.intervalId = setInterval(() => {
    stopwatch.elapsed += 1;
    renderStopwatch();
  }, 1000);
}

function pauseStopwatch() {
  stopwatch.running = false;
  clearInterval(stopwatch.intervalId);
  renderStopwatch();
}

function resetStopwatch() {
  pauseStopwatch();
  stopwatch.elapsed = 0;
  stopwatch.laps = [];
  renderStopwatch();
  document.getElementById('lapList').innerHTML = '';
}

function addLap() {
  if (!stopwatch.running) return;
  stopwatch.laps.push(stopwatch.elapsed);
  const lapList = document.getElementById('lapList');
  lapList.innerHTML = stopwatch.laps
    .map((lap, i) => `<div class="lap-item"><span>Lap ${i + 1}</span><span>${formatDuration(lap)}</span></div>`)
    .reverse()
    .join('');
}

/* ---- Countdown ---- */
const countdown = { total: 600, remaining: 600, running: false, intervalId: null };

function initCountdownTimer() {
  const ring = document.getElementById('countdownRing');
  setRingProgress(ring, 0);
  renderCountdown();

  document.getElementById('countdownMinutes').addEventListener('change', syncCountdownFromInputs);
  document.getElementById('countdownSeconds').addEventListener('change', syncCountdownFromInputs);

  document.getElementById('countdownToggle').addEventListener('click', () => {
    countdown.running ? pauseCountdown() : startCountdown();
  });
  document.getElementById('countdownReset').addEventListener('click', resetCountdown);
}

function syncCountdownFromInputs() {
  const minutes = Math.max(0, Number(document.getElementById('countdownMinutes').value) || 0);
  const seconds = Math.max(0, Math.min(59, Number(document.getElementById('countdownSeconds').value) || 0));
  countdown.total = minutes * 60 + seconds;
  countdown.remaining = countdown.total;
  renderCountdown();
}

function renderCountdown() {
  document.getElementById('countdownTime').textContent = formatDuration(countdown.remaining);
  const progress = countdown.total > 0 ? 1 - countdown.remaining / countdown.total : 0;
  setRingProgress(document.getElementById('countdownRing'), progress);
  const toggleBtn = document.getElementById('countdownToggle');
  toggleBtn.innerHTML = countdown.running ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
}

function startCountdown() {
  if (countdown.remaining <= 0) return;
  countdown.running = true;
  renderCountdown();
  countdown.intervalId = setInterval(() => {
    countdown.remaining -= 1;
    renderCountdown();
    if (countdown.remaining <= 0) {
      pauseCountdown();
      ui.showToast('Countdown finished', '', 'success');
    }
  }, 1000);
}

function pauseCountdown() {
  countdown.running = false;
  clearInterval(countdown.intervalId);
  renderCountdown();
}

function resetCountdown() {
  pauseCountdown();
  syncCountdownFromInputs();
}

/* ==========================================================================
   Analytics — Chart.js
   ========================================================================== */
function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

function getChartColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue('--text-muted').trim(),
    grid: styles.getPropertyValue('--border').trim(),
    signal: styles.getPropertyValue('--signal').trim(),
    teal: styles.getPropertyValue('--teal').trim(),
    amber: styles.getPropertyValue('--amber').trim(),
    coral: styles.getPropertyValue('--coral').trim(),
  };
}

function renderAnalytics() {
  if (typeof Chart === 'undefined') return;
  const tasks = storage.getTasks(currentUser.id).filter((t) => t.status !== 'archived');
  const colors = getChartColors();
  const stats = computeStats(tasks);

  // Productivity score ring
  const scoreRing = document.getElementById('scoreRing');
  const circumference = 2 * Math.PI * 50;
  scoreRing.style.strokeDasharray = `${circumference}`;
  scoreRing.style.strokeDashoffset = `${circumference * (1 - stats.productivityScore / 100)}`;
  document.getElementById('scoreValue').textContent = stats.productivityScore;

  // Last 7 days labels
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dayLabels = days.map((d) => d.toLocaleDateString('en-US', { weekday: 'short' }));
  const dayKeys = days.map((d) => dateKey(d));

  const completedPerDay = dayKeys.map((key) =>
    tasks.filter((t) => t.status === 'completed' && t.updatedAt && t.updatedAt.slice(0, 10) === key).length
  );
  const createdPerDay = dayKeys.map((key) =>
    tasks.filter((t) => t.createdAt && t.createdAt.slice(0, 10) === key).length
  );

  destroyChart('weekly');
  charts.weekly = new Chart(document.getElementById('weeklyCompletionChart'), {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets: [{ label: 'Completed', data: completedPerDay, backgroundColor: colors.signal, borderRadius: 6 }],
    },
    options: chartBaseOptions(colors),
  });

  destroyChart('activity');
  charts.activity = new Chart(document.getElementById('weeklyActivityChart'), {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [{
        label: 'Tasks created',
        data: createdPerDay,
        borderColor: colors.teal,
        backgroundColor: 'transparent',
        tension: 0.35,
        pointBackgroundColor: colors.teal,
      }],
    },
    options: chartBaseOptions(colors),
  });

  // Category breakdown
  const categories = [...new Set(tasks.map((t) => t.category))];
  const categoryCounts = categories.map((c) => tasks.filter((t) => t.category === c).length);
  destroyChart('category');
  charts.category = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: categories.length ? categories : ['No tasks yet'],
      datasets: [{
        data: categories.length ? categoryCounts : [1],
        backgroundColor: [colors.signal, colors.teal, colors.amber, colors.coral, '#2c5f8a', '#7a4b94', '#e4c767', '#8c8370'],
        borderWidth: 0,
      }],
    },
    options: { ...chartBaseOptions(colors), plugins: { legend: { position: 'right', labels: { color: colors.text, boxWidth: 10 } } } },
  });

  // Completion pie
  destroyChart('completion');
  charts.completion = new Chart(document.getElementById('completionPieChart'), {
    type: 'pie',
    data: {
      labels: ['Completed', 'Pending', 'Overdue'],
      datasets: [{
        data: [stats.completed, Math.max(stats.pending - stats.overdue, 0), stats.overdue],
        backgroundColor: [colors.teal, colors.signal, colors.coral],
        borderWidth: 0,
      }],
    },
    options: { ...chartBaseOptions(colors), plugins: { legend: { position: 'right', labels: { color: colors.text, boxWidth: 10 } } } },
  });

  // Monthly productivity — completion rate for each of the last 4 weeks
  const weekLabels = [];
  const weekRates = [];
  for (let w = 3; w >= 0; w -= 1) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= weekStart && new Date(t.dueDate) <= weekEnd);
    const weekCompleted = weekTasks.filter((t) => t.status === 'completed').length;
    weekLabels.push(`${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    weekRates.push(weekTasks.length ? Math.round((weekCompleted / weekTasks.length) * 100) : 0);
  }

  destroyChart('monthly');
  charts.monthly = new Chart(document.getElementById('monthlyProductivityChart'), {
    type: 'bar',
    data: {
      labels: weekLabels,
      datasets: [{ label: 'Completion rate %', data: weekRates, backgroundColor: colors.amber, borderRadius: 6 }],
    },
    options: chartBaseOptions(colors),
  });
}

function chartBaseOptions(colors) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
      y: { ticks: { color: colors.text }, grid: { color: colors.grid }, beginAtZero: true },
    },
  };
}

/* ==========================================================================
   Profile
   ========================================================================== */
function initProfileView() {
  document.getElementById('editProfileBtn').addEventListener('click', () => {
    document.getElementById('editFullName').value = currentUser.fullName;
    document.getElementById('editUsername').value = currentUser.username;
    document.getElementById('editEmail').value = currentUser.email;
    ui.openModal(document.getElementById('profileModal'));
  });
}

function initProfileModal() {
  const modal = document.getElementById('profileModal');
  ui.initModalDismiss(modal);

  document.getElementById('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fullName = document.getElementById('editFullName').value.trim();
    const username = document.getElementById('editUsername').value.trim();
    const email = document.getElementById('editEmail').value.trim();

    if (!fullName || !username || !email) {
      ui.showToast('Missing info', 'Please fill out every field.', 'error');
      return;
    }

    const initials = fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    currentUser = storage.updateUser(currentUser.id, { fullName, username, email, avatarInitials: initials });

    ui.showToast('Profile updated', '', 'success');
    ui.closeModal(modal);
    initSidebarUser();
    renderProfileDetails();
    updateClock();
  });
}

function renderProfileDetails() {
  const tasks = storage.getTasks(currentUser.id);
  document.getElementById('profileAvatar').textContent = currentUser.avatarInitials;
  document.getElementById('profileFullName').textContent = currentUser.fullName;
  document.getElementById('profileUsername').textContent = `@${currentUser.username}`;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileMemberSince').textContent = `Member since ${formatDate(currentUser.createdAt)}`;

  document.getElementById('profileCompletedCount').textContent = tasks.filter((t) => t.status === 'completed').length;
  document.getElementById('profilePendingCount').textContent = tasks.filter((t) => t.status === 'pending').length;
  document.getElementById('profileFavQuotesCount').textContent = storage.getFavoriteQuotes(currentUser.id).length;
  document.getElementById('profileFavTasksCount').textContent = tasks.filter((t) => t.favorite).length;
}

/* ==========================================================================
   Settings
   ========================================================================== */
function applySettings() {
  const settings = storage.getSettings(currentUser.id);
  document.body.classList.toggle('theme-light', settings.theme === 'light');
  applyAccentColor(settings.accentColor);
}

function applyAccentColor(accentName) {
  const accent = ACCENTS[accentName] || ACCENTS.signal;
  const root = document.documentElement;
  root.style.setProperty('--signal', accent.base);
  root.style.setProperty('--signal-bright', accent.bright);
  root.style.setProperty('--signal-dim', accent.dim);
  root.style.setProperty('--signal-glow', accent.glow);
  root.style.setProperty('--gradient-signal', `linear-gradient(135deg, ${accent.base} 0%, ${accent.gradientEnd} 100%)`);
}

function initThemeToggleButton() {
  const btn = document.getElementById('darkModeToggle');
  btn.addEventListener('click', () => {
    const settings = storage.getSettings(currentUser.id);
    const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
    storage.saveSettings(currentUser.id, { theme: nextTheme });
    document.body.classList.toggle('theme-light', nextTheme === 'light');
    syncSettingsToggles();
  });
}

function syncSettingsToggles() {
  const settings = storage.getSettings(currentUser.id);
  document.getElementById('themeToggle').classList.toggle('on', settings.theme === 'dark');
  document.getElementById('notificationsToggle').classList.toggle('on', settings.notificationsEnabled);
  document.getElementById('timeFormatSelect').value = settings.timeFormat;
  document.getElementById('weatherUnitSelect').value = settings.weatherUnit;
  document.querySelectorAll('.accent-swatch').forEach((s) => {
    s.classList.toggle('selected', s.dataset.accent === settings.accentColor);
  });
}

function renderSettingsCategories() {
  const container = document.getElementById('settingsCategoryList');
  const categories = getAllCategories();
  container.innerHTML = categories.map((c) => `<span class="filter-chip">${c}</span>`).join('');
}

function initSettingsView() {
  syncSettingsToggles();
  renderSettingsCategories();
  syncNotificationButtonLabel();

  const notifBtn = document.getElementById('enableDesktopNotifBtn');
  if (notifBtn) notifBtn.addEventListener('click', requestNotificationPermission);

  document.getElementById('themeToggle').addEventListener('click', () => {
    document.getElementById('darkModeToggle').click();
  });

  document.getElementById('notificationsToggle').addEventListener('click', () => {
    const settings = storage.getSettings(currentUser.id);
    storage.saveSettings(currentUser.id, { notificationsEnabled: !settings.notificationsEnabled });
    syncSettingsToggles();
  });

  document.getElementById('timeFormatSelect').addEventListener('change', (e) => {
    storage.saveSettings(currentUser.id, { timeFormat: e.target.value });
    updateClock();
  });

  document.getElementById('weatherUnitSelect').addEventListener('change', (e) => {
    storage.saveSettings(currentUser.id, { weatherUnit: e.target.value });
    loadWeather();
  });

  document.querySelectorAll('.accent-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      storage.saveSettings(currentUser.id, { accentColor: swatch.dataset.accent });
      applyAccentColor(swatch.dataset.accent);
      syncSettingsToggles();
      renderAnalytics();
    });
  });

  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const input = document.getElementById('newCategoryInput');
    const value = input.value.trim();
    if (!value) return;
    storage.addCustomCategory(currentUser.id, value);
    input.value = '';
    renderSettingsCategories();
    ui.showToast('Category added', value, 'success');
  });
}
