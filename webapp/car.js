(function () {
  'use strict';

  /* ---------- Element refs ---------- */
  const displayEl    = document.getElementById('display');
  const expressionEl = document.getElementById('expression');
  const keysEl       = document.getElementById('keys');

  /* ---------- Config ---------- */
  const MAX_DIGITS = 12;                       // max digits you can type
  const OP_LABEL   = { '+': '+', '-': '−', '×': '×', '÷': '÷' };

  /* ---------- State ---------- */
  const state = {
    current:      '0',   // string shown on screen
    previous:     null,  // stored left operand (number)
    operator:     null,  // '+', '-', '×', '÷'
    overwrite:    true,  // next digit replaces current
    lastOperand:  null,  // for repeated "="
    lastOperator: null
  };

  /* ---------- Helpers ---------- */

  // Kill floating-point noise (0.1 + 0.2) and keep numbers readable
  function formatNumber(num) {
    if (!Number.isFinite(num)) return 'Error';
    if (num === 0) return '0';

    const abs = Math.abs(num);
    if (abs >= 1e12 || abs < 1e-9) {
      return num.toExponential(6).replace(/\.?0+e/, 'e');
    }
    return String(parseFloat(num.toPrecision(12)));
  }

  function compute(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? NaN : a / b;
      default:  return NaN;
    }
  }

  function render() {
    const text = state.current;
    displayEl.textContent = text;

    // shrink the font as the number grows
    const len = text.length;
    displayEl.dataset.size =
      len > 13 ? 'xs' :
      len > 10 ? 'sm' :
      len > 8  ? 'md' : 'lg';
  }

  function setExpression(text) {
    expressionEl.textContent = text || '';
  }

  function setError() {
    state.current      = 'Error';
    state.previous     = null;
    state.operator     = null;
    state.overwrite    = true;
    state.lastOperand  = null;
    state.lastOperator = null;
    setExpression('');
    render();
  }

  /* ---------- Actions ---------- */

  function inputDigit(d) {
    if (state.current === 'Error') clearAll();

    if (state.overwrite || /[eE]/.test(state.current)) {
      if (state.operator === null) setExpression('');
      state.current   = d;
      state.overwrite = false;
    } else {
      const digitCount = state.current.replace(/[-.]/g, '').length;
      if (digitCount >= MAX_DIGITS) return;
      state.current = state.current === '0' ? d : state.current + d;
    }
    render();
  }

  function inputDecimal() {
    if (state.current === 'Error') clearAll();

    if (state.overwrite || /[eE]/.test(state.current)) {
      if (state.operator === null) setExpression('');
      state.current   = '0.';
      state.overwrite = false;
    } else if (!state.current.includes('.')) {
      state.current += '.';
    }
    render();
  }

  function chooseOperator(op) {
    if (state.current === 'Error') return;

    const value = parseFloat(state.current);

    // chain: 2 + 3 ×  → resolves the pending + first
    if (state.operator !== null && !state.overwrite) {
      const result = compute(state.previous, value, state.operator);
      if (!Number.isFinite(result)) { setError(); return; }
      state.previous = result;
      state.current  = formatNumber(result);
    } else {
      state.previous = value;
    }

    state.operator     = op;
    state.overwrite    = true;
    state.lastOperand  = null;
    state.lastOperator = null;

    setExpression(`${formatNumber(state.previous)} ${OP_LABEL[op]}`);
    render();
  }

  function equals() {
    if (state.current === 'Error') return;

    let a, b, op;

    if (state.operator !== null) {
      a  = state.previous;
      b  = parseFloat(state.current);
      op = state.operator;
    } else if (state.lastOperator !== null) {
      // pressing "=" again repeats the last operation
      a  = parseFloat(state.current);
      b  = state.lastOperand;
      op = state.lastOperator;
    } else {
      return;
    }

    const result = compute(a, b, op);
    if (!Number.isFinite(result)) { setError(); return; }

    state.lastOperator = op;
    state.lastOperand  = b;
    state.current      = formatNumber(result);
    state.previous     = null;
    state.operator     = null;
    state.overwrite    = true;

    setExpression(`${formatNumber(a)} ${OP_LABEL[op]} ${formatNumber(b)} =`);
    render();
  }

  function clearAll() {
    state.current      = '0';
    state.previous     = null;
    state.operator     = null;
    state.overwrite    = true;
    state.lastOperand  = null;
    state.lastOperator = null;
    setExpression('');
    render();
  }

  function backspace() {
    if (state.current === 'Error') { clearAll(); return; }
    if (state.overwrite) return;

    state.current = state.current.slice(0, -1);
    if (state.current === '' || state.current === '-') {
      state.current   = '0';
      state.overwrite = true;
    }
    render();
  }

  function percent() {
    if (state.current === 'Error') return;
    const value = parseFloat(state.current) / 100;
    state.current   = formatNumber(value);
    state.overwrite = false;
    render();
  }

  function toggleSign() {
    if (state.current === 'Error' || state.current === '0') return;
    state.current = state.current.startsWith('-')
      ? state.current.slice(1)
      : '-' + state.current;
    render();
  }

  /* ---------- Dispatch ---------- */

  function handleAction(action, dataset) {
    switch (action) {
      case 'digit':     inputDigit(dataset.digit);  break;
      case 'decimal':   inputDecimal();             break;
      case 'operator':  chooseOperator(dataset.op); break;
      case 'equals':    equals();                   break;
      case 'clear':     clearAll();                 break;
      case 'backspace': backspace();                break;
      case 'sign':      toggleSign();               break;
      case 'percent':   percent();                  break;
    }
  }

  /* ---------- Events ---------- */

  keysEl.addEventListener('click', function (e) {
    const btn = e.target.closest('button.key');
    if (!btn) return;
    handleAction(btn.dataset.action, btn.dataset);
  });

  // briefly highlight the key that was triggered by the keyboard
  function flash(selector) {
    const btn = keysEl.querySelector(selector);
    if (!btn) return;
    btn.classList.add('is-active');
    setTimeout(() => btn.classList.remove('is-active'), 110);
  }

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const k = e.key;
    let selector = null;

    if (/^[0-9]$/.test(k)) {
      inputDigit(k);
      selector = `[data-digit="${k}"]`;
    } else if (k === '.' || k === ',') {
      inputDecimal();
      selector = '[data-action="decimal"]';
    } else if (k === '+') {
      chooseOperator('+');
      selector = '[data-op="+"]';
    } else if (k === '-') {
      chooseOperator('-');
      selector = '[data-op="-"]';
    } else if (k === '*' || k === 'x' || k === 'X') {
      chooseOperator('×');
      selector = '[data-op="×"]';
    } else if (k === '/') {
      e.preventDefault();
      chooseOperator('÷');
      selector = '[data-op="÷"]';
    } else if (k === 'Enter' || k === '=') {
      e.preventDefault();
      equals();
      selector = '[data-action="equals"]';
    } else if (k === 'Backspace') {
      backspace();
      selector = '[data-action="backspace"]';
    } else if (k === 'Escape' || k === 'Delete') {
      clearAll();
      selector = '[data-action="clear"]';
    } else if (k === '%') {
      percent();
      selector = '[data-action="percent"]';
    } else {
      return; // ignore everything else
    }

    if (selector) flash(selector);
  });

  /* ---------- Init ---------- */
  render();
})();