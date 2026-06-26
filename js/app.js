/* ================================================
   ADMIN OS — app.js
   xdea. by Adeola Yusuff

   Sections:
   1. State & Storage
   2. Navigation
   3. Date & Greeting
   4. Metrics
   5. Tasks
   6. Clients
   7. Notes
   8. Income
   9. Overview
   10. Utilities
   11. Init & Demo data
   ================================================ */


/* ================================================
   1. STATE & STORAGE
   ================================================ */

const STORAGE_KEY = 'adminOS_v1';

let state = {
  tasks:          [],
  clients:        [],
  income:         [],
  notes:          '',
  currentSection: 'overview',
  taskFilter:     'all'
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    }
  } catch (err) {
    console.warn('Admin OS: could not load saved data.', err);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Admin OS: could not save data.', err);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}


/* ================================================
   2. NAVIGATION
   ================================================ */

function navigate(section) {
  state.currentSection = section;

  // Switch visible section
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + section);
  if (target) target.classList.add('active');

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  // Populate section-specific content
  const renderers = {
    overview: renderOverview,
    tasks:    renderTasks,
    clients:  renderClients,
    income:   renderIncome,
    notes:    () => {
      const ta = document.getElementById('notes-textarea');
      if (ta) ta.value = state.notes;
    }
  };

  if (renderers[section]) renderers[section]();
  updateHeaderBtn();
}

/* Expose to header + button */
function handleHeaderBtn() {
  const actions = {
    overview: () => { navigate('tasks'); setTimeout(() => openForm('add-task-form'), 80); },
    tasks:    () => openForm('add-task-form'),
    clients:  () => openForm('add-client-form'),
    income:   () => openForm('add-income-form'),
    notes:    null
  };
  const fn = actions[state.currentSection];
  if (fn) fn();
}

function updateHeaderBtn() {
  const btn    = document.getElementById('header-add-btn');
  if (!btn) return;
  const labels = {
    overview: '+ Add Task',
    tasks:    '+ Add Task',
    clients:  '+ Add Client',
    income:   '+ Log Income',
    notes:    ''
  };
  const label = labels[state.currentSection] || '';
  btn.textContent = label;
  btn.style.display = label ? '' : 'none';
}

/* Generic form toggle used by buttons */
function toggleForm(id) {
  const form = document.getElementById(id);
  if (!form) return;
  const willOpen = form.style.display === 'none' || form.style.display === '';
  form.style.display = willOpen ? 'block' : 'none';
  if (willOpen) {
    // Focus the first input in the form
    const first = form.querySelector('input, textarea, select');
    if (first) setTimeout(() => first.focus(), 50);
    // Set today as default date for income
    if (id === 'add-income-form') {
      const dateEl = document.getElementById('income-date');
      if (dateEl && !dateEl.value) dateEl.value = todayISO();
    }
  }
}

function openForm(id) {
  const form = document.getElementById(id);
  if (!form) return;
  form.style.display = 'block';
  const first = form.querySelector('input, textarea, select');
  if (first) setTimeout(() => first.focus(), 50);
  if (id === 'add-income-form') {
    const dateEl = document.getElementById('income-date');
    if (dateEl && !dateEl.value) dateEl.value = todayISO();
  }
}

function closeForm(id) {
  const form = document.getElementById(id);
  if (form) form.style.display = 'none';
}


/* ================================================
   3. DATE & GREETING
   ================================================ */

function updateDateTime() {
  const now  = new Date();
  const hour = now.getHours();
  const greetWord = hour < 12 ? 'Good morning'
                  : hour < 17 ? 'Good afternoon'
                  :             'Good evening';

  const greetEl = document.getElementById('greeting');
  if (greetEl) greetEl.textContent = `${greetWord}, Adeola 👋`;

  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}


/* ================================================
   4. METRICS
   ================================================ */

function updateMetrics() {
  // Tasks remaining
  const remaining = state.tasks.filter(t => !t.completed).length;
  const tasksEl   = document.getElementById('metric-tasks');
  if (tasksEl) tasksEl.textContent = remaining;

  // Sidebar badge
  const badge = document.getElementById('tasks-badge');
  if (badge) {
    badge.textContent = remaining > 0 ? remaining : '';
    badge.style.display = remaining > 0 ? 'inline' : 'none';
  }

  // Active clients
  const activeCount = state.clients.filter(c => c.status === 'active').length;
  const clientsEl   = document.getElementById('metric-clients');
  if (clientsEl) clientsEl.textContent = activeCount;

  // Income this month
  const now  = new Date();
  const mTot = state.income
    .filter(i => {
      const d = new Date(i.date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

  const incomeEl = document.getElementById('metric-income');
  if (incomeEl) incomeEl.textContent = '£' + mTot.toFixed(0);
}


/* ================================================
   5. TASKS
   ================================================ */

function addTask() {
  const textEl     = document.getElementById('task-text');
  const dueEl      = document.getElementById('task-due');
  const priorityEl = document.getElementById('task-priority');

  const text = textEl ? textEl.value.trim() : '';
  if (!text) { if (textEl) textEl.focus(); return; }

  const task = {
    id:        generateId(),
    text,
    due:       dueEl ? dueEl.value : '',
    priority:  priorityEl ? priorityEl.value : 'normal',
    completed: false,
    createdAt: new Date().toISOString()
  };

  state.tasks.unshift(task);
  saveState();
  renderTasks();
  updateMetrics();

  // Clear form fields
  if (textEl)     textEl.value     = '';
  if (dueEl)      dueEl.value      = '';
  if (priorityEl) priorityEl.value = 'normal';
  closeForm('add-task-form');
  textEl?.focus();
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveState();
  renderTasks();
  updateMetrics();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderTasks();
  updateMetrics();
}

function setTaskFilter(filter) {
  state.taskFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('task-list');
  if (!list) return;

  let tasks = [...state.tasks];
  if (state.taskFilter === 'active')    tasks = tasks.filter(t => !t.completed);
  if (state.taskFilter === 'completed') tasks = tasks.filter(t =>  t.completed);

  // Subtitle
  const subtitleEl = document.getElementById('tasks-subtitle');
  if (subtitleEl) {
    const total = state.tasks.length;
    const done  = state.tasks.filter(t => t.completed).length;
    subtitleEl.textContent = `${total} task${total !== 1 ? 's' : ''} · ${done} completed`;
  }

  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty-state">No tasks here. Use "+ Add Task" to get started.</div>';
    return;
  }

  list.innerHTML = tasks.map(task => {
    const dueText      = task.due ? formatDateShort(task.due) : '';
    const priorityHtml = task.priority === 'high'
      ? '<span class="priority-badge priority-high">High</span>'
      : '';

    return `
      <div class="task-item" role="listitem">
        <div class="task-cb ${task.completed ? 'done' : ''}"
             onclick="toggleTask('${task.id}')"
             title="${task.completed ? 'Mark incomplete' : 'Mark complete'}"
             role="checkbox"
             aria-checked="${task.completed}"
             tabindex="0"
             onkeydown="if(event.key==='Enter'||event.key===' ')toggleTask('${task.id}')">
          <svg class="check-icon" viewBox="0 0 12 12" aria-hidden="true">
            <polyline points="2,6 5,9 10,3"/>
          </svg>
        </div>

        <span class="task-text ${task.completed ? 'strikethrough' : ''}">${escapeHtml(task.text)}</span>

        <div class="task-meta">
          ${priorityHtml}
          ${dueText ? `<span class="task-due">${dueText}</span>` : ''}
          <button class="btn-remove" onclick="deleteTask('${task.id}')" aria-label="Delete task">✕</button>
        </div>
      </div>
    `;
  }).join('');
}


/* ================================================
   6. CLIENTS
   ================================================ */

function addClient() {
  const nameEl   = document.getElementById('client-name');
  const emailEl  = document.getElementById('client-email');
  const phoneEl  = document.getElementById('client-phone');
  const statusEl = document.getElementById('client-status');
  const notesEl  = document.getElementById('client-notes-input');

  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) { if (nameEl) nameEl.focus(); return; }

  const client = {
    id:        generateId(),
    name,
    email:     emailEl  ? emailEl.value.trim()  : '',
    phone:     phoneEl  ? phoneEl.value.trim()  : '',
    status:    statusEl ? statusEl.value        : 'active',
    notes:     notesEl  ? notesEl.value.trim()  : '',
    createdAt: new Date().toISOString()
  };

  state.clients.unshift(client);
  saveState();
  renderClients();
  updateMetrics();

  // Clear form
  [nameEl, emailEl, phoneEl, notesEl].forEach(el => { if (el) el.value = ''; });
  if (statusEl) statusEl.value = 'active';
  closeForm('add-client-form');
}

function deleteClient(id) {
  if (!confirm('Remove this client? This cannot be undone.')) return;
  state.clients = state.clients.filter(c => c.id !== id);
  saveState();
  renderClients();
  updateMetrics();
}

function renderClients() {
  const list = document.getElementById('client-list');
  if (!list) return;

  const subtitleEl = document.getElementById('clients-subtitle');
  if (subtitleEl) {
    const active = state.clients.filter(c => c.status === 'active').length;
    subtitleEl.textContent = `${state.clients.length} total · ${active} active`;
  }

  if (state.clients.length === 0) {
    list.innerHTML = '<div class="empty-state">No clients yet. Add your first one above.</div>';
    return;
  }

  list.innerHTML = state.clients.map(client => {
    const initials    = client.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
    const statusClass = `status-${client.status}`;
    const statusLabel = client.status.charAt(0).toUpperCase() + client.status.slice(1);

    return `
      <div class="client-card" role="listitem">
        <div class="client-card-top">
          <div class="client-info-row">
            <div class="client-avatar" aria-hidden="true">${initials}</div>
            <div>
              <div class="client-name">${escapeHtml(client.name)}</div>
              ${client.email ? `<div class="client-email">${escapeHtml(client.email)}</div>` : ''}
              ${client.phone ? `<div class="client-phone">${escapeHtml(client.phone)}</div>` : ''}
            </div>
          </div>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        ${client.notes
          ? `<div class="client-card-notes">${escapeHtml(client.notes)}</div>`
          : ''}
        <div class="client-card-footer">
          <button class="btn-remove" style="opacity:1; color: var(--text-muted);"
            onclick="deleteClient('${client.id}')">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}


/* ================================================
   7. NOTES
   ================================================ */

let notesSaveTimer = null;

function initNotes() {
  const ta = document.getElementById('notes-textarea');
  if (!ta) return;

  ta.value = state.notes;

  ta.addEventListener('input', () => {
    state.notes = ta.value;
    const badge = document.getElementById('save-badge');
    if (badge) badge.textContent = 'Saving...';

    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(() => {
      saveState();
      if (badge) badge.textContent = 'Saved ✓';
    }, 700);
  });
}


/* ================================================
   8. INCOME
   ================================================ */

function addIncome() {
  const clientEl = document.getElementById('income-client-name');
  const amountEl = document.getElementById('income-amount');
  const dateEl   = document.getElementById('income-date');
  const descEl   = document.getElementById('income-desc');

  const client = clientEl ? clientEl.value.trim() : '';
  const amount = parseFloat(amountEl ? amountEl.value : '');
  const date   = dateEl ? dateEl.value : '';

  if (!client || isNaN(amount) || amount <= 0 || !date) {
    alert('Please fill in client name, amount (£) and date.');
    return;
  }

  const entry = {
    id:          generateId(),
    client,
    amount,
    date,
    description: descEl ? descEl.value.trim() : '',
    createdAt:   new Date().toISOString()
  };

  state.income.unshift(entry);
  saveState();
  renderIncome();
  updateMetrics();

  // Clear form
  [clientEl, amountEl, descEl].forEach(el => { if (el) el.value = ''; });
  if (dateEl) dateEl.value = todayISO();
  closeForm('add-income-form');
}

function deleteIncome(id) {
  if (!confirm('Remove this income entry?')) return;
  state.income = state.income.filter(i => i.id !== id);
  saveState();
  renderIncome();
  updateMetrics();
}

function renderIncome() {
  const tbody = document.getElementById('income-table-body');
  if (!tbody) return;

  if (state.income.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No income logged yet. Use "+ Log Income" to get started.</td></tr>';
  } else {
    tbody.innerHTML = state.income.map(entry => `
      <tr>
        <td>${formatDateShort(entry.date)}</td>
        <td><strong>${escapeHtml(entry.client)}</strong></td>
        <td style="color: var(--text-muted);">${escapeHtml(entry.description) || '—'}</td>
        <td class="text-right income-amount">£${parseFloat(entry.amount).toFixed(2)}</td>
        <td class="text-right">
          <button class="btn-remove" style="opacity:1;"
            onclick="deleteIncome('${entry.id}')" aria-label="Delete entry">✕</button>
        </td>
      </tr>
    `).join('');
  }

  // Update income summary metric cards
  const now   = new Date();
  const monthly = state.income
    .filter(i => {
      const d = new Date(i.date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  const allTime = state.income.reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  const monthEl   = document.getElementById('income-this-month');
  const allEl     = document.getElementById('income-all-time');
  const entriesEl = document.getElementById('income-entries');

  if (monthEl)   monthEl.textContent   = '£' + monthly.toFixed(2);
  if (allEl)     allEl.textContent     = '£' + allTime.toFixed(2);
  if (entriesEl) entriesEl.textContent = state.income.length;
}


/* ================================================
   9. OVERVIEW
   ================================================ */

function renderOverview() {
  // Upcoming tasks preview (first 4 incomplete)
  const overviewList = document.getElementById('overview-tasks-list');
  if (overviewList) {
    const upcoming = state.tasks.filter(t => !t.completed).slice(0, 4);
    if (upcoming.length === 0) {
      overviewList.innerHTML = '<p style="color:var(--text-faint);font-size:13px;padding:8px 0;">All caught up — no tasks pending.</p>';
    } else {
      const extra   = state.tasks.filter(t => !t.completed).length - 4;
      const rows    = upcoming.map(t => `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:0.5px solid var(--border);">
          <div style="width:6px;height:6px;border-radius:50%;background:${t.priority === 'high' ? '#8b1a1a' : 'var(--sky)'};flex-shrink:0;"></div>
          <span style="flex:1;font-size:13px;">${escapeHtml(t.text)}</span>
          ${t.due ? `<span style="font-size:11px;color:var(--text-faint);">${formatDateShort(t.due)}</span>` : ''}
        </div>
      `).join('');
      const moreRow = extra > 0
        ? `<p style="font-size:12px;color:var(--text-faint);padding-top:8px;">+${extra} more task${extra !== 1 ? 's' : ''}</p>`
        : '';
      overviewList.innerHTML = rows + moreRow;
    }
  }

  // Notes preview
  const notesPreview = document.getElementById('overview-notes-preview');
  if (notesPreview) {
    if (state.notes.trim()) {
      notesPreview.textContent = state.notes.slice(0, 220) + (state.notes.length > 220 ? '...' : '');
      notesPreview.style.color = '';
    } else {
      notesPreview.textContent = 'No notes yet. Click "Open" to start writing.';
      notesPreview.style.color = 'var(--text-faint)';
    }
  }

  updateMetrics();
}


/* ================================================
   10. UTILITIES
   ================================================ */

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/* Keyboard shortcut: Enter to add task or income when input is focused */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  if (document.activeElement?.id === 'task-text')   { e.preventDefault(); addTask();   }
  if (document.activeElement?.id === 'income-amount') { e.preventDefault(); addIncome(); }
});


/* ================================================
   11. INIT & DEMO DATA
   ================================================ */

function seedDemoData() {
  const today = todayISO();

  state.tasks = [
    {
      id: generateId(), text: 'Register for Business Analytics resit',
      due: today, priority: 'high', completed: false, createdAt: new Date().toISOString()
    },
    {
      id: generateId(), text: 'Book Birkbeck careers appointment',
      due: '', priority: 'high', completed: false, createdAt: new Date().toISOString()
    },
    {
      id: generateId(), text: 'Update LinkedIn profile with all experience',
      due: '', priority: 'normal', completed: false, createdAt: new Date().toISOString()
    },
    {
      id: generateId(), text: 'Register on Bright Network and Prospects',
      due: '', priority: 'normal', completed: false, createdAt: new Date().toISOString()
    },
    {
      id: generateId(), text: 'Set September calendar reminder for grad schemes',
      due: '', priority: 'normal', completed: false, createdAt: new Date().toISOString()
    },
    {
      id: generateId(), text: 'Push Admin OS Dashboard to GitHub',
      due: '', priority: 'normal', completed: true, createdAt: new Date().toISOString()
    }
  ];

  state.clients = [
    {
      id: generateId(), name: 'Demo Client Co.', email: 'hello@example.com',
      phone: '', status: 'active',
      notes: 'Replace this with your real clients once you start using the dashboard.',
      createdAt: new Date().toISOString()
    }
  ];

  state.notes = `Welcome to Admin OS 🎉\n\nThis is your personal workspace — type anything here and it saves automatically.\n\n--- GRAD JOB NOTES ---\n\nBig 4 grad scheme opening dates:\n• KPMG — Sept/Oct 2026\n• PwC — Sept 2026\n• Deloitte — Sept 2026\n• EY — Oct 2026\n\nBirkbeck Careers: bbk.ac.uk/careers\nBright Network: brightnetwork.co.uk\n\n--- XDEA. IDEAS ---\n\nNew product ideas to explore:\n- VA planner template\n- Client onboarding kit\n- Monthly business review template`;

  state.income = [];

  saveState();
}

function init() {
  loadState();

  // First ever load — seed demo data
  if (state.tasks.length === 0 && state.clients.length === 0 && !state.notes) {
    seedDemoData();
  }

  updateDateTime();
  setInterval(updateDateTime, 60000);

  renderTasks();
  renderClients();
  renderIncome();
  initNotes();
  updateMetrics();
  renderOverview();
  updateHeaderBtn();

  console.log('%c Admin OS — xdea. 🎉 ', 'background:#0a1e38;color:#c8ddf0;font-weight:bold;font-size:14px;padding:4px 8px;border-radius:4px;');
  console.log('%c Built by Adeola Yusuff ', 'color:#0a1e38;font-size:12px;');
}

document.addEventListener('DOMContentLoaded', init);
