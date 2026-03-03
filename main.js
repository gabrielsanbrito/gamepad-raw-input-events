'use strict';

// ── Config ───────────────────────────────────────────────────
const MAX_ENTRIES_DEFAULT = 50;
let maxEntries = MAX_ENTRIES_DEFAULT;

// Button labels for standard mapping
const STD_BUTTONS = [
  'A','B','X','Y',
  'LB','RB','LT','RT',
  'Back','Start',
  'LS','RS',
  'Up','Down','Left','Right',
  'Home',
];

// ── State ────────────────────────────────────────────────────
const gamepadCards = {};   // index → card DOM node

// ── DOM references ───────────────────────────────────────────
const connectionDot  = document.getElementById('connection-dot');
const statusText     = document.getElementById('status-text');
const gamepadsContainer = document.getElementById('gamepads-container');
const noGamepadMsg   = document.getElementById('no-gamepad-msg');
const eventLog       = document.getElementById('event-log');
const placeholder    = document.getElementById('placeholder');
const clearBtn       = document.getElementById('clear-btn');
const maxEntriesInput = document.getElementById('max-entries');
const maxEntriesVal  = document.getElementById('max-entries-val');

// ── Helpers ──────────────────────────────────────────────────
function formatTime(ts) {
  return (ts / 1000).toFixed(3) + 's';
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function getActiveGamepad(index) {
  const gamepads = navigator.getGamepads();
  return gamepads[index] || null;
}

function triggerDualRumble(index) {
  const gamepad = getActiveGamepad(index);
  if (!gamepad || !gamepad.vibrationActuator) return;
  gamepad.vibrationActuator.playEffect('dual-rumble', {
    startDelay: 0,
    duration: 500,
    weakMagnitude: 0.5,
    strongMagnitude: 1.0,
  });
}

function triggerTriggerRumble(index) {
  const gamepad = getActiveGamepad(index);
  if (!gamepad || !gamepad.vibrationActuator) return;
  gamepad.vibrationActuator.playEffect('trigger-rumble', {
    startDelay: 0,
    duration: 500,
    leftTrigger: 0.5,
    rightTrigger: 1.0,
  });
}

// ── Event log ────────────────────────────────────────────────
function logEvent({ ts, gamepadIndex, axesChanged, buttonsValueChanged, buttonsPressed, buttonsReleased }) {
  if (placeholder && placeholder.parentNode === eventLog) {
    placeholder.remove();
  }

  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const tsCell = document.createElement('span');
  tsCell.className = 'log-ts';
  tsCell.textContent = formatTime(ts);

  const body = document.createElement('span');
  body.className = 'log-body';

  let html = `<strong style="color:#e2e2e8">GP${gamepadIndex}</strong> `;

  if (axesChanged.length) {
    html += `<span class="tag tag-axes">axes</span>${axesChanged.join(',')} `;
  }
  if (buttonsValueChanged.length) {
    html += `<span class="tag tag-btval">value</span>${buttonsValueChanged.join(',')} `;
  }
  if (buttonsPressed.length) {
    html += `<span class="tag tag-pressed">pressed</span>${buttonsPressed.join(',')} `;
  }
  if (buttonsReleased.length) {
    html += `<span class="tag tag-released">released</span>${buttonsReleased.join(',')} `;
  }
  body.innerHTML = html;

  entry.appendChild(tsCell);
  entry.appendChild(body);

  // Prepend newest entry
  eventLog.insertBefore(entry, eventLog.firstChild);

  // Trim old entries
  while (eventLog.children.length > maxEntries) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

// ── Gamepad card ─────────────────────────────────────────────
function getOrCreateCard(gamepad) {
  if (gamepadCards[gamepad.index]) return gamepadCards[gamepad.index];

  noGamepadMsg.style.display = 'none';

  const card = document.createElement('div');
  card.className = 'gamepad-card';
  card.id = `gp-card-${gamepad.index}`;

  const title = document.createElement('h3');
  title.textContent = `${gamepad.id} (index ${gamepad.index})`;
  card.appendChild(title);

  // Axes section
  const axesHeading = document.createElement('div');
  axesHeading.style.cssText = 'font-size:.8rem;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em';
  axesHeading.textContent = 'Axes';
  card.appendChild(axesHeading);

  const axesGrid = document.createElement('div');
  axesGrid.className = 'axes-grid';
  axesGrid.id = `gp-axes-${gamepad.index}`;
  for (let i = 0; i < gamepad.axes.length; i++) {
    const item = document.createElement('div');
    item.className = 'axis-item';
    item.innerHTML = `
      <div class="axis-label">Axis ${i}</div>
      <div class="axis-track" id="gp${gamepad.index}-axis${i}-track">
        <div class="axis-thumb" id="gp${gamepad.index}-axis${i}-thumb" style="left:50%"></div>
      </div>
      <div class="axis-value" id="gp${gamepad.index}-axis${i}-val">0.000</div>`;
    axesGrid.appendChild(item);
  }
  card.appendChild(axesGrid);

  // Buttons section
  const btnsHeading = document.createElement('div');
  btnsHeading.style.cssText = 'font-size:.8rem;color:#555;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.05em';
  btnsHeading.textContent = 'Buttons';
  card.appendChild(btnsHeading);

  const btnsGrid = document.createElement('div');
  btnsGrid.className = 'buttons-grid';
  btnsGrid.id = `gp-buttons-${gamepad.index}`;
  for (let i = 0; i < gamepad.buttons.length; i++) {
    const label = STD_BUTTONS[i] !== undefined ? STD_BUTTONS[i] : String(i);
    const item = document.createElement('div');
    item.className = 'btn-indicator';
    item.innerHTML = `
      <div class="btn-circle" id="gp${gamepad.index}-btn${i}-circle">
        <div class="btn-fill" id="gp${gamepad.index}-btn${i}-fill" style="height:0%"></div>
      </div>
      <span>${label}</span>`;
    btnsGrid.appendChild(item);
  }
  card.appendChild(btnsGrid);

  // Rumble section (only if vibrationActuator is supported)
  const vibration = gamepad.vibrationActuator;
  if (vibration && vibration.effects && vibration.effects.length > 0) {
    const rumbleHeading = document.createElement('div');
    rumbleHeading.style.cssText = 'font-size:.8rem;color:#555;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.05em';
    rumbleHeading.textContent = 'Rumble';
    card.appendChild(rumbleHeading);

    const rumbleContainer = document.createElement('div');
    rumbleContainer.className = 'rumble-controls';

    // Dual Rumble button
    if (vibration.effects.includes('dual-rumble')) {
      const dualBtn = document.createElement('button');
      dualBtn.className = 'rumble-btn';
      dualBtn.textContent = 'Dual Rumble';
      dualBtn.addEventListener('click', () => {
        triggerDualRumble(gamepad.index);
      });
      rumbleContainer.appendChild(dualBtn);
    }

    // Trigger Rumble button
    if (vibration.effects.includes('trigger-rumble')) {
      const triggerBtn = document.createElement('button');
      triggerBtn.className = 'rumble-btn';
      triggerBtn.textContent = 'Trigger Rumble';
      triggerBtn.addEventListener('click', () => {
        triggerTriggerRumble(gamepad.index);
      });
      rumbleContainer.appendChild(triggerBtn);
    }

    card.appendChild(rumbleContainer);
  }

  gamepadsContainer.appendChild(card);
  gamepadCards[gamepad.index] = card;
  return card;
}

function updateCard(gamepad) {
  getOrCreateCard(gamepad);

  for (let i = 0; i < gamepad.axes.length; i++) {
    const v = gamepad.axes[i];
    const pct = clamp((v + 1) / 2 * 100, 0, 100);
    const thumb = document.getElementById(`gp${gamepad.index}-axis${i}-thumb`);
    const val   = document.getElementById(`gp${gamepad.index}-axis${i}-val`);
    if (thumb) thumb.style.left = pct + '%';
    if (val)   val.textContent  = v.toFixed(3);
  }

  for (let i = 0; i < gamepad.buttons.length; i++) {
    const btn    = gamepad.buttons[i];
    const circle = document.getElementById(`gp${gamepad.index}-btn${i}-circle`);
    const fill   = document.getElementById(`gp${gamepad.index}-btn${i}-fill`);
    if (!circle || !fill) continue;
    const pct = clamp(btn.value * 100, 0, 100);
    fill.style.height = pct + '%';
    if (btn.pressed) {
      circle.classList.add('pressed');
    } else {
      circle.classList.remove('pressed');
    }
  }
}

function removeCard(index) {
  const card = gamepadCards[index];
  if (card) {
    card.remove();
    delete gamepadCards[index];
  }
  if (Object.keys(gamepadCards).length === 0) {
    noGamepadMsg.style.display = '';
  }
}

// ── Connection status ─────────────────────────────────────────
function updateStatus() {
  const gamepads = navigator.getGamepads().filter(Boolean);
  if (gamepads.length === 0) {
    connectionDot.className = 'dot';
    statusText.textContent  = 'No gamepad connected';
  } else {
    connectionDot.className = 'dot connected';
    statusText.textContent  =
      gamepads.length === 1
        ? `1 gamepad connected`
        : `${gamepads.length} gamepads connected`;
  }
}

// ── Raw API event handler ─────────────────────────────────────
function onRawInput(event) {
  const snapshot = event.gamepad;

  updateCard(snapshot);

  logEvent({
    ts:                  snapshot.timestamp,
    gamepadIndex:        snapshot.index,
    axesChanged:         Array.from(event.axesChanged         || []),
    buttonsValueChanged: Array.from(event.buttonsValueChanged || []),
    buttonsPressed:      Array.from(event.buttonsPressed      || []),
    buttonsReleased:     Array.from(event.buttonsReleased     || []),
  });
}

// ── Gamepad connected / disconnected ─────────────────────────
window.addEventListener('gamepadconnected', (e) => {
  const gamepad = e.gamepad;
  updateStatus();
  getOrCreateCard(gamepad);
});

window.addEventListener('gamepaddisconnected', (e) => {
  const index = e.gamepad.index;
  removeCard(index);
  updateStatus();
});

// ── Raw input listener ─────────────────────────────────────────
window.addEventListener('gamepadrawinputchanged', onRawInput);

// ── Controls ──────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  eventLog.innerHTML = '';
  const p = document.createElement('p');
  p.id = 'placeholder';
  p.style.cssText = 'color:#444;text-align:center;padding-top:80px';
  p.textContent = 'Waiting for gamepad input…';
  eventLog.appendChild(p);
});

maxEntriesInput.addEventListener('input', () => {
  maxEntries = parseInt(maxEntriesInput.value, 10);
  maxEntriesVal.textContent = maxEntries;
});

// Show initial status
updateStatus();
