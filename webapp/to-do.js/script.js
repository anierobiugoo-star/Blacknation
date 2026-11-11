/* =========================================================
   Simple To-Do List App
   Pattern for every change:
   user action → update tasks array → save → renderTasks()
   ========================================================= */

/* ---------- Step 1: Select the HTML elements ---------- */
const form  = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list  = document.getElementById("todo-list");

/* Counter: use the one in HTML, or create it after the form if missing */
let counter = document.getElementById("task-counter");
if (!counter && form) {
  counter = document.createElement("p");
  counter.id = "task-counter";
  counter.setAttribute("aria-live", "polite");
  form.insertAdjacentElement("afterend", counter);
}

/* ---------- Step 2: The tasks array ---------- */
const STORAGE_KEY = "tasks";
let tasks = loadTasks();

/* ---------- Step 8: load & save ---------- */
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Saved tasks were corrupted, starting fresh.", error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function makeId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/* ---------- Step 4: Render the list ---------- */
function renderTasks() {
  list.innerHTML = "";

  tasks.forEach(function (task) {
    const li = document.createElement("li");
    li.dataset.id = task.id;
    if (task.completed) li.classList.add("completed");

    const span = document.createElement("span");
    span.textContent = task.text;

    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "done-btn";
    doneBtn.dataset.action = "toggle";
    doneBtn.dataset.id = task.id;
    doneBtn.textContent = task.completed ? "Undo" : "Done";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = "Delete";

    li.append(span, doneBtn, deleteBtn);
    list.appendChild(li);
  });

  updateCounter();
}

/* ---------- Step 7: Remaining-task counter ---------- */
function updateCounter() {
  if (!counter) return;

  const remaining = tasks.filter(function (task) {
    return !task.completed;
  }).length;

  counter.textContent =
    remaining === 1 ? "1 task left" : remaining + " tasks left";
}

/* ---------- Step 3: Add a task on form submit ---------- */
form.addEventListener("submit", function (event) {
  event.preventDefault();

  const text = input.value.trim();
  if (text === "") return;

  tasks.push({
    id: makeId(),
    text: text,
    completed: false,
  });

  input.value = "";
  input.focus();

  saveTasks();
  renderTasks();
});

/* ---------- Steps 5 & 6: Complete and delete ---------- */
list.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === "toggle") {
    tasks = tasks.map(function (task) {
      if (task.id === id) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });
  } else if (button.dataset.action === "delete") {
    tasks = tasks.filter(function (task) {
      return task.id !== id;
    });
  }

  saveTasks();
  renderTasks();
});

/* ---------- Put the pieces together ---------- */
renderTasks();