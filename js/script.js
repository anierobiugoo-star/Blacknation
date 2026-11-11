 (function() {
            'use strict';

            // DOM refs
            const expressionEl = document.getElementById('expression');
            const resultEl = document.getElementById('result');
            const buttons = document.querySelectorAll('.btn');

            // State
            const state = {
                // Current number being typed (string)
                currentValue: '0',
                // Previous number for binary ops (number)
                previousValue: null,
                // Current binary operation: '+', '-', '×', '÷', '%'
                operation: null,
                // Expression string shown in the top display
                expression: '',
                // Whether to reset display on next digit input
                shouldResetDisplay: false,
                // Whether a result was just shown (for chaining)
                isResultShown: false,
            };

           
            // Helpers
            function formatNumber(num) {
                if (num === undefined || num === null || isNaN(num)) return 'Error';
                if (!isFinite(num)) return 'Infinity';
                const str = String(num);
                // Limit display length to avoid overflow
                if (str.length > 16) {
                    return num.toExponential(6);
                }
                return str;
            }

            function isUnaryOperator(op) {
                return ['sin', 'cos', 'tan', 'log'].includes(op);
            }

            function isBinaryOperator(op) {
                return ['+', '-', '×', '÷', '%'].includes(op);
            }

            // Parse the current value as a number
            function getCurrentNumber() {
                return parseFloat(state.currentValue) || 0;
            }

            // Core calculation
            function calculate(a, op, b) {
                let result;
                switch (op) {
                    case '+':
                        result = a + b;
                        break;
                    case '-':
                        result = a - b;
                        break;
                    case '×':
                        result = a * b;
                        break;
                    case '÷':
                        if (b === 0) return NaN;
                        result = a / b;
                        break;
                    case '%':
                        result = a % b;
                        break;
                    default:
                        return b;
                }
                return result;
            }

            // Apply a unary operator to a number
            function applyUnary(op, num) {
                let result;
                switch (op) {
                    case 'sin':
                        result = Math.sin(num * Math.PI / 180);
                        break;
                    case 'cos':
                        result = Math.cos(num * Math.PI / 180);
                        break;
                    case 'tan':
                        result = Math.tan(num * Math.PI / 180);
                        break;
                    case 'log':
                        if (num <= 0) return NaN;
                        result = Math.log10(num);
                        break;
                    default:
                        return num;
                }
                return result;
            }

        
            // Update display
            function updateDisplay() {
                // Result area
                const displayVal = state.currentValue || '0';
                resultEl.textContent = displayVal;

                // Expression area
                expressionEl.textContent = state.expression || '';
            }

            // Action handlers
            // Handle digit input (0-9)
            function handleDigit(digit) {
                if (state.shouldResetDisplay) {
                    state.currentValue = digit;
                    state.shouldResetDisplay = false;
                } else {
                    if (state.currentValue === '0' && digit !== '.') {
                        state.currentValue = digit;
                    } else {
                        // Limit input length to prevent overflow
                        if (state.currentValue.replace('-', '').replace('.', '').length >= 15) return;
                        state.currentValue += digit;
                    }
                }
                state.isResultShown = false;
                // Update expression: if we have an operation, keep the expression prefix
                // otherwise just show the current value
                if (state.operation && state.previousValue !== null) {
                    // Keep the expression as is, just update the number part
                    const parts = state.expression.split(' ');
                    if (parts.length >= 3) {
                        // Replace the last part with the current value
                        parts[parts.length - 1] = state.currentValue;
                        state.expression = parts.join(' ');
                    } else {
                        // Fallback: rebuild
                        state.expression = `${state.previousValue} ${state.operation} ${state.currentValue}`;
                    }
                } else {
                    state.expression = state.currentValue;
                }
                updateDisplay();
            }

            // Handle decimal point
            function handleDecimal() {
                if (state.shouldResetDisplay) {
                    state.currentValue = '0.';
                    state.shouldResetDisplay = false;
                } else if (!state.currentValue.includes('.')) {
                    state.currentValue += '.';
                }
                state.isResultShown = false;
                // Update expression similarly to digit
                if (state.operation && state.previousValue !== null) {
                    const parts = state.expression.split(' ');
                    if (parts.length >= 3) {
                        parts[parts.length - 1] = state.currentValue;
                        state.expression = parts.join(' ');
                    } else {
                        state.expression = `${state.previousValue} ${state.operation} ${state.currentValue}`;
                    }
                } else {
                    state.expression = state.currentValue;
                }
                updateDisplay();
            }

            // Handle binary operator (+, -, ×, ÷, %)
            function handleBinaryOperator(op) {
                const currentNum = getCurrentNumber();

                // If there's already a pending operation, compute it first
                if (state.operation && state.previousValue !== null && !state.shouldResetDisplay) {
                    const result = calculate(state.previousValue, state.operation, currentNum);
                    if (isNaN(result) || !isFinite(result)) {
                        state.currentValue = 'Error';
                        state.expression = '';
                        state.previousValue = null;
                        state.operation = null;
                        state.shouldResetDisplay = true;
                        updateDisplay();
                        return;
                    }
                    state.currentValue = formatNumber(result);
                    state.previousValue = result;
                } else {
                    state.previousValue = currentNum;
                }

                state.operation = op;
                state.expression = `${formatNumber(state.previousValue)} ${op} `;
                state.shouldResetDisplay = true;
                state.isResultShown = false;
                updateDisplay();
            }

            // Handle unary operator (sin, cos, tan, log)
            function handleUnaryOperator(op) {
                const currentNum = getCurrentNumber();
                const result = applyUnary(op, currentNum);

                if (isNaN(result) || !isFinite(result)) {
                    state.currentValue = 'Error';
                    state.expression = `${op}(${formatNumber(currentNum)}) = Error`;
                    state.previousValue = null;
                    state.operation = null;
                    state.shouldResetDisplay = true;
                    state.isResultShown = true;
                    updateDisplay();
                    return;
                }

                const formattedResult = formatNumber(result);
                state.currentValue = formattedResult;
                state.expression = `${op}(${formatNumber(currentNum)}) = ${formattedResult}`;
                state.previousValue = result;
                state.operation = null;
                state.shouldResetDisplay = true;
                state.isResultShown = true;
                updateDisplay();
            }

            // Handle equals
            function handleEquals() {
                const currentNum = getCurrentNumber();

                // If no operation, just show the current value
                if (!state.operation || state.previousValue === null) {
                    state.expression = `${state.currentValue} = ${state.currentValue}`;
                    state.isResultShown = true;
                    state.shouldResetDisplay = true;
                    updateDisplay();
                    return;
                }

                // If the last action was a result, we might want to chain
                // But we'll just compute with the current values
                const result = calculate(state.previousValue, state.operation, currentNum);

                if (isNaN(result) || !isFinite(result)) {
                    state.currentValue = 'Error';
                    state.expression =
                        `${formatNumber(state.previousValue)} ${state.operation} ${formatNumber(currentNum)} = Error`;
                    state.previousValue = null;
                    state.operation = null;
                    state.shouldResetDisplay = true;
                    state.isResultShown = true;
                    updateDisplay();
                    return;
                }

                const formattedResult = formatNumber(result);
                state.expression =
                    `${formatNumber(state.previousValue)} ${state.operation} ${formatNumber(currentNum)} = ${formattedResult}`;
                state.currentValue = formattedResult;
                state.previousValue = result;
                state.operation = null;
                state.shouldResetDisplay = true;
                state.isResultShown = true;
                updateDisplay();
            }

            // Handle clear (AC)
            function handleClear() {
                state.currentValue = '0';
                state.previousValue = null;
                state.operation = null;
                state.expression = '';
                state.shouldResetDisplay = false;
                state.isResultShown = false;
                updateDisplay();
            }

            // Main dispatch
            function handleAction(action, value) {
                switch (action) {
                    case 'digit':
                        handleDigit(value);
                        break;
                    case 'decimal':
                        handleDecimal();
                        break;
                    case 'operator':
                        if (isUnaryOperator(value)) {
                            handleUnaryOperator(value);
                        } else if (isBinaryOperator(value)) {
                            handleBinaryOperator(value);
                        }
                        break;
                    case 'equals':
                        handleEquals();
                        break;
                    case 'clear':
                        handleClear();
                        break;
                    default:
                        break;
                }
            }

            // Event listeners
            buttons.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    const action = this.dataset.action;
                    const value = this.dataset.value;

                    // Haptic feedback (optional)
                    if (navigator.vibrate) navigator.vibrate(10);

                    handleAction(action, value);
                });

                // Prevent context menu on long press (mobile)
                btn.addEventListener('contextmenu', e => e.preventDefault());
            });

            // Keyboard support
            document.addEventListener('keydown', function(e) {
                const key = e.key;

                // Prevent default for calculator keys
                const controlKeys = ['Enter', 'Backspace', 'Escape', 'Delete', 'Tab'];
                if (controlKeys.includes(key) || /^[0-9.]$/.test(key) || ['+', '-', '*', '/', '%'].includes(key)) {
                    e.preventDefault();
                }

                // Digits
                if (/^[0-9]$/.test(key)) {
                    handleAction('digit', key);
                    return;
                }

                // Decimal
                if (key === '.') {
                    handleAction('decimal');
                    return;
                }

                // Equals / Enter
                if (key === '=' || key === 'Enter') {
                    handleAction('equals');
                    return;
                }

                // Clear: Escape or Delete
                if (key === 'Escape' || key === 'Delete') {
                    handleAction('clear');
                    return;
                }

                // Operators
                switch (key) {
                    case '+':
                        handleAction('operator', '+');
                        break;
                    case '-':
                        handleAction('operator', '-');
                        break;
                    case '*':
                        handleAction('operator', '×');
                        break;
                    case '/':
                        handleAction('operator', '÷');
                        break;
                    case '%':
                        handleAction('operator', '%');
                        break;
                    default:
                        break;
                }

                // Backspace: remove last character (simple implementation)
                if (key === 'Backspace') {
                    if (state.shouldResetDisplay || state.isResultShown) {
                        handleAction('clear');
                        return;
                    }
                    if (state.currentValue.length > 1) {
                        state.currentValue = state.currentValue.slice(0, -1);
                        // Update expression
                        if (state.operation && state.previousValue !== null) {
                            const parts = state.expression.split(' ');
                            if (parts.length >= 3) {
                                parts[parts.length - 1] = state.currentValue;
                                state.expression = parts.join(' ');
                            } else {
                                state.expression = `${state.previousValue} ${state.operation} ${state.currentValue}`;
                            }
                        } else {
                            state.expression = state.currentValue;
                        }
                        updateDisplay();
                    } else {
                        handleAction('clear');
                    }
                }
            });

            // Initialize display
            updateDisplay();

            // Expose state for debugging (optional)
            // window.__calcState = state;
        })();