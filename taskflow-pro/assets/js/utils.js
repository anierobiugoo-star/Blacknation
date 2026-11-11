/**
 * utils.js
 * Reusable, dependency-free helper functions shared by every module.
 * No DOM rendering and no storage access lives here — pure helpers only.
 */

/** Generate a reasonably unique ID (timestamp + random base36 chunk). */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Format a Date (or ISO string) as "Mon, 7 Jul 2026". */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a Date as a short "7 Jul" label, used on task cards / calendar. */
export function formatShortDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/** Format a Date object as HH:MM in either 12h or 24h format. */
export function formatTime(date, format24h = false) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !format24h,
  });
}

/** Turn seconds into a MM:SS string, used by Pomodoro / Stopwatch / Countdown. */
export function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Copy arbitrary text to the clipboard, returns a promise<boolean>. */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older / non-secure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Copy to clipboard failed:', err);
    return false;
  }
}

/** Capitalize the first letter of a string. */
export function capitalize(str = '') {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Debounce: delay invoking fn until `wait` ms have passed since the last call. */
export function debounce(fn, wait = 300) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Deterministic jewel-palette color from a string seed (used for category tags). */
const CATEGORY_PALETTE = ['#c9a227', '#1e6f5c', '#a85c32', '#8c2f39', '#2c5f8a', '#7a4b94', '#e4c767', '#35a88a'];
export function stringToColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

/** Return a random color from the app's accent palette (for new categories/notes). */
const PALETTE = ['#c9a227', '#a85c32', '#1e6f5c', '#8c2f39', '#e4c767', '#2c5f8a', '#7a4b94'];
export function randomColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

/** Basic email format validation. */
export function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Password strength check.
 * Returns { score: 0-4, label: 'Weak'|'Fair'|'Good'|'Strong', valid: boolean }
 */
export function checkPasswordStrength(password = '') {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return {
    score,
    label: labels[score],
    valid: password.length >= 8 && score >= 2,
  };
}

/** Check two field values match (password confirmation, etc). */
export function fieldsMatch(a, b) {
  return a === b && a !== '';
}

/** Clamp a number between min and max. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Escape HTML special characters to prevent injection when rendering user text. */
export function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Return a human greeting ("Good Morning" etc.) based on the current hour. */
export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

/** Simple relative time label ("2h ago", "Just now") for created/updated timestamps. */
export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(d);
}

/** Check if a date (or ISO string) falls on today's calendar date. */
export function isToday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Check if a date is strictly before today (used for "overdue" detection). */
export function isOverdue(date, status) {
  if (status === 'completed') return false;
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d.getTime() < now.getTime();
}
