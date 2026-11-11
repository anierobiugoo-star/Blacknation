/**
 * auth.js
 * Everything related to accounts: registration, login/logout, form
 * validation, and route protection. Talks to storage.js for persistence
 * and ui.js for toasts/field errors — never touches localStorage directly.
 */

import {
  getUserByEmail,
  saveUser,
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
} from './storage.js?v=5';
import {
  showToast,
  setFieldError,
  clearFieldError,
  clearAllFieldErrors,
  setButtonLoading,
  initPasswordToggle,
} from './ui.js?v=5';
import {
  generateId,
  isValidEmail,
  checkPasswordStrength,
  fieldsMatch,
  capitalize,
} from './utils.js?v=5';

/* ==========================================================================
   Route protection
   Call at the top of every protected/auth-only page.
   ========================================================================== */

/** Redirect to login if nobody is signed in. Call on dashboard.html. */
export function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
  }
  return user;
}

/** Redirect signed-in users away from login/register pages. */
export function redirectIfAuthenticated() {
  const user = getCurrentUser();
  if (user) {
    window.location.href = 'dashboard.html';
  }
}

/* ==========================================================================
   Logout — shared by app.js (dashboard sidebar) and any page
   ========================================================================== */
export function logout() {
  clearCurrentUser();
  showToast('Signed out', 'Come back soon.', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 600);
}

/* ==========================================================================
   Registration
   ========================================================================== */

function validateRegisterForm(fields) {
  let isValid = true;

  clearFieldError(fields.fullName);
  clearFieldError(fields.username);
  clearFieldError(fields.email);
  clearFieldError(fields.password);
  clearFieldError(fields.confirmPassword);

  if (!fields.fullName.value.trim()) {
    setFieldError(fields.fullName, 'Full name is required.');
    isValid = false;
  }

  const username = fields.username.value.trim();
  if (!username) {
    setFieldError(fields.username, 'Username is required.');
    isValid = false;
  } else if (username.length < 3) {
    setFieldError(fields.username, 'Username needs at least 3 characters.');
    isValid = false;
  }

  const email = fields.email.value.trim();
  if (!email) {
    setFieldError(fields.email, 'Email is required.');
    isValid = false;
  } else if (!isValidEmail(email)) {
    setFieldError(fields.email, 'Enter a valid email address.');
    isValid = false;
  } else if (getUserByEmail(email)) {
    setFieldError(fields.email, 'An account with this email already exists.');
    isValid = false;
  }

  const password = fields.password.value;
  const strength = checkPasswordStrength(password);
  if (!password) {
    setFieldError(fields.password, 'Password is required.');
    isValid = false;
  } else if (!strength.valid) {
    setFieldError(fields.password, 'Use 8+ characters with a number or symbol.');
    isValid = false;
  }

  if (!fieldsMatch(password, fields.confirmPassword.value)) {
    setFieldError(fields.confirmPassword, 'Passwords do not match.');
    isValid = false;
  }

  return isValid;
}

export function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const fields = {
    fullName: form.querySelector('#fullName'),
    username: form.querySelector('#username'),
    email: form.querySelector('#email'),
    password: form.querySelector('#password'),
    confirmPassword: form.querySelector('#confirmPassword'),
  };

  const strengthBar = form.querySelector('#passwordStrengthBar');
  const strengthLabel = form.querySelector('#passwordStrengthLabel');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Live password strength meter
  fields.password.addEventListener('input', () => {
    const { score, label } = checkPasswordStrength(fields.password.value);
    const percent = (score / 4) * 100;
    strengthBar.style.width = `${percent}%`;
    strengthBar.className = `password-strength-fill strength-${label.toLowerCase()}`;
    strengthLabel.textContent = fields.password.value ? label : '';
  });

  // Toggle password visibility for both fields
  initPasswordToggle(form.querySelector('#togglePassword'), fields.password);
  initPasswordToggle(form.querySelector('#toggleConfirmPassword'), fields.confirmPassword);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);

    if (!validateRegisterForm(fields)) {
      showToast('Check the form', 'Some fields need your attention.', 'error');
      return;
    }

    setButtonLoading(submitBtn, true, 'Creating account…');

    // Simulate async work so the loading state is visible & realistic
    setTimeout(() => {
      const now = new Date().toISOString();
      const newUser = {
        id: generateId('user'),
        fullName: fields.fullName.value.trim(),
        username: fields.username.value.trim(),
        email: fields.email.value.trim().toLowerCase(),
        password: fields.password.value, // demo-only local storage auth
        avatarInitials: fields.fullName.value.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
        createdAt: now,
        updatedAt: now,
      };

      saveUser(newUser);
      setButtonLoading(submitBtn, false);

      // Prefill the login form's email as a courtesy, then send the
      // person to log in with their new credentials rather than
      // signing them in automatically.
      sessionStorage.setItem('taskflow_prefillEmail', newUser.email);
      showToast('Account created', 'Please log in to continue.', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 900);
    }, 500);
  });
}

/* ==========================================================================
   Login
   ========================================================================== */

function validateLoginForm(fields) {
  let isValid = true;
  clearFieldError(fields.email);
  clearFieldError(fields.password);

  if (!fields.email.value.trim()) {
    setFieldError(fields.email, 'Email is required.');
    isValid = false;
  }
  if (!fields.password.value) {
    setFieldError(fields.password, 'Password is required.');
    isValid = false;
  }
  return isValid;
}

export function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const fields = {
    email: form.querySelector('#email'),
    password: form.querySelector('#password'),
  };
  const rememberMe = form.querySelector('#rememberMe');
  const submitBtn = form.querySelector('button[type="submit"]');

  initPasswordToggle(form.querySelector('#togglePassword'), fields.password);

  // Pre-fill remembered email, if any
  const rememberedEmail = localStorage.getItem('taskflow_rememberedEmail');
  if (rememberedEmail) {
    fields.email.value = rememberedEmail;
    if (rememberMe) rememberMe.checked = true;
  }

  // If the person just registered, prefill their new email as a courtesy
  // and greet them so the redirect from register.html feels intentional.
  const justRegisteredEmail = sessionStorage.getItem('taskflow_prefillEmail');
  if (justRegisteredEmail) {
    fields.email.value = justRegisteredEmail;
    sessionStorage.removeItem('taskflow_prefillEmail');
    fields.password.focus();
    const banner = document.getElementById('authBanner');
    if (banner) banner.style.display = 'flex';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);

    if (!validateLoginForm(fields)) {
      showToast('Check the form', 'Email and password are required.', 'error');
      return;
    }

    setButtonLoading(submitBtn, true, 'Signing in…');

    setTimeout(() => {
      const email = fields.email.value.trim().toLowerCase();
      const user = getUserByEmail(email);

      if (!user || user.password !== fields.password.value) {
        setButtonLoading(submitBtn, false);
        setFieldError(fields.password, 'Incorrect email or password.');
        showToast('Login failed', 'Check your email and password.', 'error');
        return;
      }

      if (rememberMe && rememberMe.checked) {
        localStorage.setItem('taskflow_rememberedEmail', email);
      } else {
        localStorage.removeItem('taskflow_rememberedEmail');
      }

      setCurrentUser(user);
      setButtonLoading(submitBtn, false);
      showToast('Welcome back', `Good to see you, ${capitalize(user.fullName.split(' ')[0])}.`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    }, 500);
  });
}
