// ========== script.js ==========

const API_URL = "https://jsonplaceholder.typicode.com/users";

const profilesEl = document.getElementById("profiles");
const statusEl   = document.getElementById("status");

/* Turn "Leanne Graham" into "LG" */
function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(word => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* Deterministic colour per user, based on their name */
function getHue(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  }
  return hash;
}

/* Build one card element for a user object */
function createCard(user) {
  const card = document.createElement("article");
  card.className = "card";

  // Avatar with initials
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = getInitials(user.name);
  const hue = getHue(user.name);
  avatar.style.background =
    `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 45) % 360} 72% 45%))`;

  // Full name
  const name = document.createElement("h2");
  name.className = "name";
  name.textContent = user.name;

  // Username
  const username = document.createElement("p");
  username.className = "username";
  username.textContent = "@" + user.username;

  // Email (clickable)
  const email = document.createElement("a");
  email.className = "email";
  email.href = "mailto:" + user.email;
  email.textContent = user.email;

  card.append(avatar, name, username, email);
  return card;
}

/* Fetch users and render the list */
async function loadProfiles() {
  statusEl.hidden = false;
  statusEl.classList.remove("error");
  statusEl.textContent = "Loading profiles…";
  profilesEl.innerHTML = "";

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Request failed (HTTP ${response.status})`);

    const users = await response.json();

    if (!Array.isArray(users) || users.length === 0) {
      statusEl.textContent = "No profiles found.";
      return;
    }

    const fragment = document.createDocumentFragment();
    users.forEach(user => fragment.appendChild(createCard(user)));
    profilesEl.appendChild(fragment);

    statusEl.hidden = true; // hide message on success
  } catch (error) {
    statusEl.hidden = false;
    statusEl.classList.add("error");
    statusEl.textContent = "Could not load profiles: " + error.message;
  }
}

/* Run on page load */
loadProfiles();