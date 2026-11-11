/**
 * storage.js
 * The database layer. Every Local Storage read/write in the app goes
 * through here. If TaskFlow Pro is later upgraded to a real backend,
 * only this file needs to change — every other module calls these
 * same function names and shapes.
 */

const KEYS = {
  USERS: 'taskflow_users',
  CURRENT_USER: 'taskflow_currentUser',
  TASKS: 'taskflow_tasks',
  NOTES: 'taskflow_notes',
  FAVORITE_QUOTES: 'taskflow_favoriteQuotes',
  SETTINGS: 'taskflow_settings',
  NOTIFICATIONS: 'taskflow_notifications',
  CATEGORIES: 'taskflow_categories',
  DAILY_QUOTE: 'taskflow_dailyQuote',
};

/* ==========================================================================
   Low-level helpers
   ========================================================================== */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`storage.js: failed to read "${key}"`, err);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`storage.js: failed to write "${key}"`, err);
    return false;
  }
}

/* ==========================================================================
   Users
   ========================================================================== */
export function getUsers() {
  return readJSON(KEYS.USERS, []);
}

export function saveUsers(users) {
  return writeJSON(KEYS.USERS, users);
}

export function saveUser(user) {
  const users = getUsers();
  users.push(user);
  return saveUsers(users);
}

export function getUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return getUsers().find((u) => u.email.toLowerCase() === normalized) || null;
}

export function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

export function updateUser(userId, updates) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;
  users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
  saveUsers(users);

  // Keep currentUser in sync if it's the same account
  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentUser(users[index]);
  }
  return users[index];
}

/* ==========================================================================
   Current session
   ========================================================================== */
export function getCurrentUser() {
  return readJSON(KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user) {
  return writeJSON(KEYS.CURRENT_USER, user);
}

export function clearCurrentUser() {
  localStorage.removeItem(KEYS.CURRENT_USER);
}

/* ==========================================================================
   Tasks — every task carries a userId so users never see each other's data
   ========================================================================== */
export function getAllTasks() {
  return readJSON(KEYS.TASKS, []);
}

/** Tasks scoped to the currently logged-in user (or a given userId). */
export function getTasks(userId) {
  return getAllTasks().filter((t) => t.userId === userId);
}

export function getTaskById(taskId) {
  return getAllTasks().find((t) => t.id === taskId) || null;
}

export function saveTask(task) {
  const tasks = getAllTasks();
  tasks.push(task);
  writeJSON(KEYS.TASKS, tasks);
  return task;
}

export function updateTask(taskId, updates) {
  const tasks = getAllTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
  writeJSON(KEYS.TASKS, tasks);
  return tasks[index];
}

export function deleteTask(taskId) {
  const tasks = getAllTasks();
  const filtered = tasks.filter((t) => t.id !== taskId);
  writeJSON(KEYS.TASKS, filtered);
  return filtered.length !== tasks.length;
}

export function deleteTasks(taskIds) {
  const idSet = new Set(taskIds);
  const tasks = getAllTasks();
  const filtered = tasks.filter((t) => !idSet.has(t.id));
  writeJSON(KEYS.TASKS, filtered);
  return true;
}

export function replaceAllTasksForUser(userId, newTaskList) {
  const others = getAllTasks().filter((t) => t.userId !== userId);
  writeJSON(KEYS.TASKS, [...others, ...newTaskList]);
}

/* ==========================================================================
   Notes — same per-user scoping pattern as tasks
   ========================================================================== */
export function getAllNotes() {
  return readJSON(KEYS.NOTES, []);
}

export function getNotes(userId) {
  return getAllNotes().filter((n) => n.userId === userId);
}

export function saveNote(note) {
  const notes = getAllNotes();
  notes.push(note);
  writeJSON(KEYS.NOTES, notes);
  return note;
}

export function updateNote(noteId, updates) {
  const notes = getAllNotes();
  const index = notes.findIndex((n) => n.id === noteId);
  if (index === -1) return null;
  notes[index] = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
  writeJSON(KEYS.NOTES, notes);
  return notes[index];
}

export function deleteNote(noteId) {
  const notes = getAllNotes();
  const filtered = notes.filter((n) => n.id !== noteId);
  writeJSON(KEYS.NOTES, filtered);
  return true;
}

/* ==========================================================================
   Favorite quotes — belong to a single user
   ========================================================================== */
export function getAllFavoriteQuotes() {
  return readJSON(KEYS.FAVORITE_QUOTES, []);
}

export function getFavoriteQuotes(userId) {
  return getAllFavoriteQuotes().filter((q) => q.userId === userId);
}

export function saveFavoriteQuote(quote) {
  const quotes = getAllFavoriteQuotes();
  quotes.push(quote);
  writeJSON(KEYS.FAVORITE_QUOTES, quotes);
  return quote;
}

export function deleteFavoriteQuote(quoteId) {
  const quotes = getAllFavoriteQuotes();
  const filtered = quotes.filter((q) => q.id !== quoteId);
  writeJSON(KEYS.FAVORITE_QUOTES, filtered);
  return true;
}

export function isQuoteFavorited(userId, quoteText) {
  return getFavoriteQuotes(userId).some((q) => q.text === quoteText);
}

/* ==========================================================================
   Settings — stored per user, keyed by userId inside a single object
   ========================================================================== */
const DEFAULT_SETTINGS = {
  theme: 'dark',
  accentColor: 'signal',
  timeFormat: '12h',
  weatherUnit: 'metric',
  notificationsEnabled: true,
};

export function getSettings(userId) {
  const all = readJSON(KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...(all[userId] || {}) };
}

export function saveSettings(userId, settings) {
  const all = readJSON(KEYS.SETTINGS, {});
  all[userId] = { ...DEFAULT_SETTINGS, ...(all[userId] || {}), ...settings };
  writeJSON(KEYS.SETTINGS, all);
  return all[userId];
}

/* ==========================================================================
   Notifications log (in-app history, separate from transient toasts)
   ========================================================================== */
export function getNotifications(userId) {
  return readJSON(KEYS.NOTIFICATIONS, []).filter((n) => n.userId === userId);
}

export function addNotification(notification) {
  const all = readJSON(KEYS.NOTIFICATIONS, []);
  all.unshift(notification);
  writeJSON(KEYS.NOTIFICATIONS, all.slice(0, 100)); // cap history
  return notification;
}

/* ==========================================================================
   Custom categories — per-user list of category names added beyond the
   built-in defaults (defaults themselves live in dashboard.js).
   ========================================================================== */
export function getCustomCategories(userId) {
  const all = readJSON(KEYS.CATEGORIES, {});
  return all[userId] || [];
}

export function addCustomCategory(userId, categoryName) {
  const all = readJSON(KEYS.CATEGORIES, {});
  const existing = all[userId] || [];
  if (!existing.includes(categoryName)) {
    all[userId] = [...existing, categoryName];
    writeJSON(KEYS.CATEGORIES, all);
  }
  return all[userId];
}

/* ==========================================================================
   Daily quote — one quote per user, cached with a fetch timestamp so the
   dashboard can show the same "quote of the day" for 24 hours and only
   fetch a new one automatically once that window has passed. A manual
   refresh overwrites this and restarts the 24-hour window from then.
   ========================================================================== */
export function getDailyQuote(userId) {
  const all = readJSON(KEYS.DAILY_QUOTE, {});
  return all[userId] || null;
}

export function saveDailyQuote(userId, quote) {
  const all = readJSON(KEYS.DAILY_QUOTE, {});
  all[userId] = quote;
  writeJSON(KEYS.DAILY_QUOTE, all);
  return quote;
}

export const STORAGE_KEYS = KEYS;
