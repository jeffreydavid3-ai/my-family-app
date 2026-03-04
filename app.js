// ── SUPABASE SETUP ──
const SUPABASE_URL = "https://cebjungpkpmfovadwkis.supabase.co";
const SUPABASE_KEY = "sb_publishable_M3cUwzEORiuAsuymFWIliQ_kqDH7nQZ";

const supabaseClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

console.log("Supabase client:", supabaseClient ? "✅ ready" : "❌ not loaded");

function logSupabaseError(label, error) {
  if (!error) return;
  console.error(
    `[Supabase] ${label}:`,
    error.message || error,
    error.details || "",
    error.hint || ""
  );
}

// ── SUPABASE: LOAD + SAVE GOALS ──
// ── MOUNTAIN TIME HELPERS ──
function getTodayMountainDate() {
  // Returns today's date as YYYY-MM-DD in America/Denver timezone
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function isDoneToday(goal) {
  // A goal counts as completed only if its completionDate matches today (Mountain Time)
  if (!goal.done) return false;
  if (!goal.completionDate) return false;
  return goal.completionDate === getTodayMountainDate();
}

async function loadGoalsFromSupabase() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("goals")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseError("Load goals", error);
    return;
  }

  // Filter out goals that existed before a wipe reset
  const resetAt = localStorage.getItem('goals_reset_at');
  const rows = (data || []).filter(row => {
    if (!resetAt) return true;
    return new Date(row.created_at) > new Date(resetAt);
  });

  const today = getTodayMountainDate();

  goals = rows.map(row => {
    const completionDate = row.completion_date || null;
    // Daily reset: only mark done if completed today (Mountain Time)
    const doneToday = row.completed && completionDate === today;
    return {
      id:             row.id,
      name:           row.title,
      member:         row.member,
      done:           doneToday,
      cat:            row.cat  || 'fitness',
      freq:           row.freq || 'daily',
      streak:         row.streak || 0,
      completionDate: completionDate,
    };
  });
}

async function insertGoalToSupabase(goal) {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from("goals")
    .insert([{
      title:           goal.name,
      member:          goal.member,
      completed:       goal.done,
      cat:             goal.cat,
      freq:            goal.freq,
      streak:          goal.streak,
      completion_date: goal.done ? getTodayMountainDate() : null,
    }])
    .select()
    .single();

  if (error) {
  console.error(
    "Insert goal error:",
    error.message,
    error.details,
    error.hint
  );
  return null;
}

  return data;
}

async function updateGoalInSupabase(goal) {
  if (!supabaseClient) return;

  const { error } = await supabaseClient
    .from("goals")
    .update({
      completed:       goal.done,
      streak:          goal.streak,
      completion_date: goal.done ? (goal.completionDate || getTodayMountainDate()) : null,
    })
    .eq("id", goal.id);

  if (error) {
    logSupabaseError("Update goal", error);
  }
}

// ── MEMBER DATA ──
const members = {
  Dad:     { pin:'1234', emoji:'👨', color:'#4A90D9', role:'Father' },
  Mom:     { pin:'1234', emoji:'👩', color:'#E05C3A', role:'Mother' },
  Zach:    { pin:'1234', emoji:'🧑', color:'#52B788', role:'Son' },
  Berrett: { pin:'1234', emoji:'🧒', color:'#E9A825', role:'Son' },
  Jaxon:   { pin:'1234', emoji:'👦', color:'#9B59B6', role:'Son' },
};
function getMember(name) {
  const key = (name || "").trim();         // removes extra spaces
  return members[key] || {                 // fallback if name not found
    pin: "",
    emoji: "🙂",
    color: "#4A90D9",
    role: ""
  };
}

let loggedInUser = null;
let pinBuffer = '';
let pinTarget = null;

// ── PROFILE & TROPHY ROAD ──
const trophyLevels = [
  { level:1, name:'Master I',          days:7,  icon:'🎯', color:'#C0392B', bg:'linear-gradient(135deg,#7B241C,#C0392B)' },
  { level:2, name:'Master II',         days:14, icon:'🔨', color:'#7F8C8D', bg:'linear-gradient(135deg,#4A5255,#7F8C8D)' },
  { level:3, name:'Master III',        days:21, icon:'🧪', color:'#2980B9', bg:'linear-gradient(135deg,#1A5276,#2980B9)' },
  { level:4, name:'Champion',          days:28, icon:'⚔️', color:'#2471A3', bg:'linear-gradient(135deg,#1A5276,#3498DB)' },
  { level:5, name:'Grand Champion',    days:35, icon:'👑', color:'#E74C3C', bg:'linear-gradient(135deg,#922B21,#E74C3C)' },
  { level:6, name:'Royal Champion',    days:42, icon:'💎', color:'#1ABC9C', bg:'linear-gradient(135deg,#0E6655,#1ABC9C)' },
  { level:7, name:'Ultimate Champion', days:49, icon:'💠', color:'#8E44AD', bg:'linear-gradient(135deg,#5B2C6F,#8E44AD)' },
  { level:8, name:'Legend',            days:56, icon:'⚡', color:'#FFD700', bg:'linear-gradient(135deg,#5C4A00,#B8860B,#FFD700)' },
];

// Clash Royale style SVG badge icons per level
function getLevelBadgeSVG(level, size=52) {
  const h = Math.round(size * 70/60);
  const badges = {
    1: `<svg viewBox="0 0 60 70" width="${size}" height="${h}"><polygon points="30,2 58,18 58,52 30,68 2,52 2,18" fill="#8B0000" stroke="#C0392B" stroke-width="2"/><polygon points="30,8 52,22 52,48 30,62 8,48 8,22" fill="#A93226" stroke="#E74C3C" stroke-width="1.5"/><text x="30" y="42" text-anchor="middle" font-size="22" fill="white">🎯</text></svg>`,
    2: `<svg viewBox="0 0 60 70" width="${size}" height="${h}"><polygon points="30,2 58,18 58,52 30,68 2,52 2,18" fill="#4A5568" stroke="#718096" stroke-width="2"/><polygon points="30,8 52,22 52,48 30,62 8,48 8,22" fill="#606E7C" stroke="#8A9CB0" stroke-width="1.5"/><text x="30" y="42" text-anchor="middle" font-size="22" fill="white">🔨</text></svg>`,
    3: `<svg viewBox="0 0 60 70" width="${size}" height="${h}"><polygon points="30,2 58,18 58,52 30,68 2,52 2,18" fill="#1A4A7A" stroke="#2980B9" stroke-width="2"/><polygon points="30,8 52,22 52,48 30,62 8,48 8,22" fill="#1F5F9A" stroke="#5DADE2" stroke-width="1.5"/><text x="30" y="42" text-anchor="middle" font-size="22" fill="white">🧪</text></svg>`,
    4: `<svg viewBox="0 0 60 70" width="${size}" height="${h}"><polygon points="30,2 58,18 58,52 30,68 2,52 2,18" fill="#1A4A8A" stroke="#3498DB" stroke-width="2"/><polygon points="30,8 52,22 52,48 30,62 8,48 8,22" fill="#1F5FAA" stroke="#5DADE2" stroke-width="1.5"/><text x="30" y="42" text-anchor="middle" font-size="22" fill="white">⚔️</text></svg>`,
    5: `<svg viewBox="0 0 60 70" width="${size}" height="${h}"><polygon points="30,2 58,18 58,52 30,68 2,52 2,18" fill="#7B241C" stroke="#E74C3C" stroke-width="2"/><polygon points="30,8 52,22 52,48 30,62 8,48 8,22" fill="#9B2D23" stroke="#F1948A" stroke-width="1.5"/><text x="30" y="42" text-anchor="middle" font-size="20" fill="#FFD700">👑</text></svg>`,
    6: `<svg viewBox="0 0 60 70" width="${size}" height="${h}"><polygon points="30,2 58,18 58,52 30,68 2,52 2,18" fill="#0E6655" stroke="#1ABC9C" stroke-width="2"/><polygon points="30,8 52,22 52,48 30,62 8,48 8,22" fill="#148F77" stroke="#76D7C4" stroke-width="1.5"/><text x="30" y="42" text-anchor="middle" font-size="22" fill="white">💎</text></svg>`,
    7: `<svg viewBox="0 0 60 70" width="${size}" height="${h}"><polygon points="30,2 58,18 58,52 30,68 2,52 2,18" fill="#4A1577" stroke="#9B59B6" stroke-width="2.5"/><polygon points="30,8 52,22 52,48 30,62 8,48 8,22" fill="#6C3483" stroke="#C39BD3" stroke-width="1.5"/><ellipse cx="30" cy="35" rx="12" ry="14" fill="#D7BDE2" opacity="0.6"/><ellipse cx="30" cy="33" rx="7" ry="9" fill="#E8DAEF"/><text x="30" y="42" text-anchor="middle" font-size="20" fill="#8E44AD">💠</text></svg>`,
    8: `<svg viewBox="0 0 80 90" width="${Math.round(size*1.2)}" height="${Math.round(h*1.2)}">
      <defs>
        <filter id="lglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bglow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="goldShield" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#FFF176"/>
          <stop offset="45%" stop-color="#FFD700"/>
          <stop offset="100%" stop-color="#7C5000"/>
        </radialGradient>
        <radialGradient id="innerShield" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#FFFDE7"/>
          <stop offset="60%" stop-color="#FFE082"/>
          <stop offset="100%" stop-color="#B8860B"/>
        </radialGradient>
      </defs>
      <!-- Outer glow ring -->
      <ellipse cx="40" cy="45" rx="34" ry="38" fill="none" stroke="#7DF9FF" stroke-width="1.5" opacity="0.25" filter="url(#bglow)"/>
      <!-- Shield body -->
      <polygon points="40,3 74,20 74,55 40,78 6,55 6,20" fill="url(#goldShield)" stroke="#FFD700" stroke-width="2.5" filter="url(#lglow)"/>
      <polygon points="40,10 66,25 66,52 40,70 14,52 14,25" fill="url(#innerShield)" stroke="#FFF176" stroke-width="1.5"/>
      <!-- Blue electricity arcs around shield -->
      <!-- Top left arc -->
      <path d="M10,18 Q2,8 8,2 Q14,-2 16,6" fill="none" stroke="#7DF9FF" stroke-width="1.8" stroke-linecap="round" opacity="0.9" filter="url(#bglow)"/>
      <path d="M10,18 Q3,12 9,5" fill="none" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.7"/>
      <!-- Top right arc -->
      <path d="M70,18 Q78,8 72,2 Q66,-2 64,6" fill="none" stroke="#7DF9FF" stroke-width="1.8" stroke-linecap="round" opacity="0.9" filter="url(#bglow)"/>
      <path d="M70,18 Q77,12 71,5" fill="none" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.7"/>
      <!-- Bottom left arc -->
      <path d="M14,56 Q4,65 10,74 Q18,80 22,72" fill="none" stroke="#00BFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.85" filter="url(#bglow)"/>
      <path d="M14,56 Q6,64 12,72" fill="none" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.6"/>
      <!-- Bottom right arc -->
      <path d="M66,56 Q76,65 70,74 Q62,80 58,72" fill="none" stroke="#00BFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.85" filter="url(#bglow)"/>
      <path d="M66,56 Q74,64 68,72" fill="none" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.6"/>
      <!-- Small sparks -->
      <line x1="3" y1="35" x2="9" y2="32" stroke="#7DF9FF" stroke-width="1.5" stroke-linecap="round" opacity="0.8" filter="url(#bglow)"/>
      <line x1="5" y1="38" x2="10" y2="40" stroke="#7DF9FF" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
      <line x1="77" y1="35" x2="71" y2="32" stroke="#7DF9FF" stroke-width="1.5" stroke-linecap="round" opacity="0.8" filter="url(#bglow)"/>
      <line x1="75" y1="38" x2="70" y2="40" stroke="#7DF9FF" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
      <!-- Gold lightning bolt -->
      <polygon points="43,18 36,38 41,38 37,60 50,34 44,34 50,18" fill="#FFD700" stroke="#FFF176" stroke-width="1" filter="url(#lglow)"/>
      <polygon points="43,18 36,38 41,38 37,60 50,34 44,34 50,18" fill="#FFFDE7" opacity="0.35"/>
    </svg>`,
  };
  const svg = badges[level] || badges[7];
  return level === 8 ? `<span class="legend-badge">${svg}</span>` : svg;
}


// ── LOGIN ──
function initLogin() {
  const grid = document.getElementById('member-grid');
  grid.innerHTML = Object.entries(members).map(([name, m]) => `
    <div class="member-login-card" onclick="showPinEntry('${name}')">
      <div class="member-avatar-big" style="background:${m.color}22;border-color:${m.color}44;">
        <span>${m.emoji}</span>
      </div>
      <div class="member-login-name">${name}</div>
      <div class="member-login-role">${m.role}</div>
    </div>
  `).join('');

  const pad = document.getElementById('pin-pad');
  pad.innerHTML = [1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
    <button class="pin-key ${k==='⌫'?'del':''}" onclick="pinPress('${k}')">${k}</button>
  `).join('');
}

function showPinEntry(name) {
  pinTarget = name;
  pinBuffer = '';
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
  document.getElementById('pin-member-name').textContent = `${getMember(name).emoji} ${name}`;
  document.getElementById('login-step-1').style.display = 'none';
  document.getElementById('login-step-2').style.display = 'block';
}

function showLoginStep1() {
  document.getElementById('login-step-1').style.display = 'block';
  document.getElementById('login-step-2').style.display = 'none';
  pinBuffer = '';
  updatePinDots();
}

function pinPress(key) {
  if (key === '⌫' || key === '') {
    pinBuffer = pinBuffer.slice(0,-1);
    updatePinDots();
    return;
  }
  if (pinBuffer.length >= 4) return;

  pinBuffer += key;
  updatePinDots();

  if (pinBuffer.length === 4) {
    setTimeout(() => {
      if (pinBuffer === getMember(pinTarget).pin) {
        loginAs(pinTarget);
      } else {
        document.getElementById('pin-error').textContent = 'Incorrect PIN. Try again.';
        pinBuffer = '';
        updatePinDots();
      }
    }, 150);
  }
}

function updatePinDots() {
  document.querySelectorAll('.pin-dot').forEach((d,i) => {
    d.classList.toggle('filled', i < pinBuffer.length);
  });
}

function loginAs(name) {
  loggedInUser = name;
  planViewMember = name;

  const m = getMember(name);
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').style.display = 'flex';
  document.getElementById('user-name-chip').textContent = name;
  document.getElementById('user-dot').style.background = m.color;

  selectedMember = name;
  initApp();
}

function logout() {
  loggedInUser = null;
  pinBuffer = '';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display = 'none';
  showLoginStep1();
}

// ── APP DATA ──
let goals = []; // populated from Supabase on login

// ── XP SYSTEM ──
// Each completed daily goal = 10 XP. Max 30 XP/day per person (3 goals).
// Streak bonuses apply when ALL 3 daily goals are completed:
//   1–2 days: +0%  |  3–6 days: +5%  |  7–13 days: +10%  |  14+ days: +20%
// Personal XP is permanent (never resets). Streaks reset on missed days.
// Family XP = sum of all members' personal XP → drives arena progression.

const XP_PER_GOAL = 10;

const streakBonusTiers = [
  { minDays: 14, multiplier: 1.20, label: '+20%', color: '#FFD700' },
  { minDays:  7, multiplier: 1.10, label: '+10%', color: '#22C55E' },
  { minDays:  3, multiplier: 1.05, label:  '+5%', color: '#4AAED9' },
  { minDays:  1, multiplier: 1.00, label:   '—',  color: '#7A90B8' },
];

function getStreakBonus(streak) {
  return streakBonusTiers.find(t => streak >= t.minDays) || streakBonusTiers[streakBonusTiers.length - 1];
}

// Family Rise Arenas — named tiers based on cumulative family XP
const familyArenas = [
  { arena: 1, name: 'The Spark',        minXP:     0, maxXP:  1999, icon: '🕯️',  color: '#7A90B8', bg: 'linear-gradient(135deg,#1A2338,#253660)' },
  { arena: 2, name: 'Iron Resolve',     minXP:  2000, maxXP:  3999, icon: '⚙️',  color: '#9CA3AF', bg: 'linear-gradient(135deg,#2A3040,#3D4A5C)' },
  { arena: 3, name: 'Bronze Battalion', minXP:  4000, maxXP:  5999, icon: '🛡️',  color: '#A0622A', bg: 'linear-gradient(135deg,#3D2010,#6B3A1F)' },
  { arena: 4, name: 'Silver Storm',     minXP:  6000, maxXP:  7999, icon: '⚡',  color: '#C0C8D8', bg: 'linear-gradient(135deg,#2A3550,#4A5A78)' },
  { arena: 5, name: 'Gold Dynasty',     minXP:  8000, maxXP:  9999, icon: '👑',  color: '#E9A825', bg: 'linear-gradient(135deg,#3D2800,#7A5200)' },
  { arena: 6, name: 'Emerald Empire',   minXP: 10000, maxXP: 11999, icon: '💚',  color: '#10B981', bg: 'linear-gradient(135deg,#062820,#0E4D3A)' },
  { arena: 7, name: 'Diamond Dominion', minXP: 12000, maxXP: 14999, icon: '💎',  color: '#7DF9FF', bg: 'linear-gradient(135deg,#0A1520,#0D2A40)' },
  { arena: 8, name: 'The Johnson Legacy', minXP: 15000, maxXP: Infinity, icon: '🏆', color: '#FFD700', bg: 'linear-gradient(135deg,#2A1A00,#5C3D00,#8B6000)' },
];

function getFamilyArena(totalXP) {
  return familyArenas.find(a => totalXP >= a.minXP && totalXP <= a.maxXP) || familyArenas[0];
}

function getFamilyTotalXP() {
  return Object.values(personalData).reduce((sum, d) => sum + (d.xp || 0), 0);
}

const leaderboardData = [
  { name:'Dad',     xp: 0, streak: 0 },
  { name:'Zach',    xp: 0, streak: 0 },
  { name:'Mom',     xp: 0, streak: 0 },
  { name:'Berrett', xp: 0, streak: 0 },
  { name:'Jaxon',   xp: 0, streak: 0 },
];

const badges = [];

const personalData = {
  Dad:     { xp:0, streak:0, bestStreak:0, goalsTotal:0, goalsDone:0, daysActive:0, successRate:0, badges:[] },
  Mom:     { xp:0, streak:0, bestStreak:0, goalsTotal:0, goalsDone:0, daysActive:0, successRate:0, badges:[] },
  Zach:    { xp:0, streak:0, bestStreak:0, goalsTotal:0, goalsDone:0, daysActive:0, successRate:0, badges:[] },
  Berrett: { xp:0, streak:0, bestStreak:0, goalsTotal:0, goalsDone:0, daysActive:0, successRate:0, badges:[] },
  Jaxon:   { xp:0, streak:0, bestStreak:0, goalsTotal:0, goalsDone:0, daysActive:0, successRate:0, badges:[] },
};

const personalCats = {
  Dad:     { fitness:0, finance:0, spiritual:0 },
  Mom:     { fitness:0, finance:0, spiritual:0 },
  Zach:    { fitness:0, finance:0, spiritual:0 },
  Berrett: { fitness:0, finance:0, spiritual:0 },
  Jaxon:   { fitness:0, finance:0, spiritual:0 },
};

let currentCatFilter = 'all'; // category filter removed from UI
let selectedCat = 'fitness', selectedFreq = 'daily';

let selectedMembers = new Set(['All']);   // used on Add Goal screen
let selectedMember = 'Dad';              // used on Personal Dashboard tabs

let planViewMember = null;               // used on My Plan view

// ── INIT ──
async function initApp() {
  await loadGoalsFromSupabase();
  planViewMember = loggedInUser;
  renderLeaderboard();
  renderPlanMemberTabs();
  renderTracker();
  renderAddForm();
  renderCalendar();
  renderHistory();
  renderReminders();
  renderNotifications();
  renderPersonalDashboard();
  renderProfile();
  renderSettings();
}

function renderPlanMemberTabs() {
  const memberNames = Object.keys(members);
  document.getElementById('plan-member-tabs').innerHTML = memberNames.map(m => {
    const mm = getMember(m);
    return `
      <button class="member-tab ${m===planViewMember?'active':''}" onclick="selectPlanMember('${m}')"
        style="${m===planViewMember?`background:${mm.color};border-color:transparent;`:''}">
        ${mm.emoji} ${m}
      </button>
    `;
  }).join('');
}

function selectPlanMember(m) {
  planViewMember = m;
  renderPlanMemberTabs();
  renderFamilyGoalList();
}

let familyGoalsPanelOpen = false;

function toggleFamilyGoalsPanel() {
  familyGoalsPanelOpen = !familyGoalsPanelOpen;
  const panel = document.getElementById('family-goals-panel');
  const arrow = document.getElementById('family-goals-arrow');
  if (panel) panel.style.display = familyGoalsPanelOpen ? 'block' : 'none';
  if (arrow) arrow.style.transform = familyGoalsPanelOpen ? 'rotate(180deg)' : '';
  if (familyGoalsPanelOpen) {
    renderPlanMemberTabs();
    renderFamilyGoalList();
  }
}

function renderFamilyGoalList() {
  const el = document.getElementById('family-goal-list');
  if (!el) return;
  const member = planViewMember || loggedInUser;
  const filtered = goals.filter(g => g.member === member || g.member === 'All');
  const ci = {fitness:'💪', finance:'💰', spiritual:'🙏'};
  el.innerHTML = filtered.length
    ? filtered.map(g => `
        <div class="goal-card" style="opacity:0.85;">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13px;${g.done?'text-decoration:line-through;opacity:0.4;':''}">${g.name}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px;">${g.freq}</div>
          </div>
          <div class="check-btn ${g.done?'done':''}" style="opacity:0.5;cursor:default;">${g.done?'✓':''}</div>
        </div>
      `).join('')
    : `<div style="color:var(--muted);font-size:12px;padding:12px 0;text-align:center;">${member} has no goals yet.</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  // Live clock
  function updateClock() {
    const now=new Date(), h=now.getHours()%12||12, m=String(now.getMinutes()).padStart(2,'0');
    const el=document.getElementById('status-time'); if(el) el.textContent=`${h}:${m}`;
  }
  updateClock(); setInterval(updateClock,10000);
});

// ── NAV ──
const pageNames = {
  dashboard:   'Dashboard',
  leaderboard: 'Leaderboard',
  goals:       'My Goals',
  riseroad:    'Rise Road',
  settings:    'Settings',
};

function showPage(id) {
  document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const goalsBtn = document.getElementById('nav-goals-btn');
  if (goalsBtn) goalsBtn.classList.remove('active');

  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  document.getElementById('page-title').textContent = pageNames[id] || id;

  // Highlight correct nav button
  const ni = document.querySelectorAll('.nav-item');
  const idx = { dashboard:0, leaderboard:1, riseroad:2, settings:3 };
  if (id === 'goals') {
    if (goalsBtn) goalsBtn.classList.add('active');
  } else if (idx[id] !== undefined) {
    ni[idx[id]].classList.add('active');
  }

  // Page-specific render hooks
  if (id === 'riseroad') renderProfile();
  if (id === 'settings') renderSettings();
  if (id === 'goals') {
    toggleAddGoalForm(false); // always start on list view
    renderAddForm();
    // reset family panel
    familyGoalsPanelOpen = false;
    const fp = document.getElementById('family-goals-panel');
    const fa = document.getElementById('family-goals-arrow');
    if (fp) fp.style.display = 'none';
    if (fa) fa.style.transform = '';
    // render own goals
    renderTracker();
  }

  document.querySelector('.main').scrollTop = 0;
}

// Toggle between goal list and inline add form
function toggleAddGoalForm(showForm) {
  const list = document.getElementById('goals-list-section');
  const form = document.getElementById('add-goal-form-section');
  if (!list || !form) return;
  list.style.display = showForm ? 'none' : 'block';
  form.style.display = showForm ? 'block' : 'none';
  if (showForm) renderAddForm();
}

// ── LEADERBOARD ──
function getMemberLevel(name) {
  const d = personalData[name];
  if (!d) return 1;
  return Math.min(Math.floor(d.streak / 7) + 1, 8);
}

function renderLeaderboard(){
  const sorted = [...leaderboardData].sort((a,b) => b.xp - a.xp);

  const bgColors = [
    'linear-gradient(135deg,#7A5500,#C8900A)',   // #1 gold
    'linear-gradient(135deg,#4A5360,#7A8C9E)',   // #2 silver
    'linear-gradient(135deg,#5C3015,#8B5020)',   // #3 bronze
    'linear-gradient(135deg,#1F2E4A,#253660)',   // #4
    'linear-gradient(135deg,#1F2E4A,#253660)',   // #5
  ];

  const allHtml = sorted.map((m, i) => {
    const lvl   = getMemberLevel(m.name);
    const bonus = getStreakBonus(m.streak);
    const isFirst = i === 0;
    return `
      <div style="
        background:${bgColors[i] || bgColors[4]};
        border-radius:${isFirst ? '16px' : '12px'};
        padding:${isFirst ? '15px 14px' : '10px 13px'};
        color:white; display:flex; align-items:center; gap:10px;
        margin-bottom:${isFirst ? '10px' : '7px'};
        ${isFirst ? 'box-shadow:0 0 20px rgba(200,144,10,0.4),0 4px 16px rgba(0,0,0,0.4);' : ''}
        transition:transform 0.15s;
      " onmouseover="this.style.transform='translateX(3px)'" onmouseout="this.style.transform=''">
        <div style="
          width:${isFirst ? '30px' : '26px'};
          height:${isFirst ? '30px' : '26px'};
          border-radius:50%;
          background:rgba(255,255,255,0.15);
          border:1.5px solid rgba(255,255,255,0.25);
          display:flex;align-items:center;justify-content:center;
          font-family:'Lexend',sans-serif;
          font-size:${isFirst ? '15px' : '12px'};
          font-weight:800; flex-shrink:0;
        ">${i + 1}</div>
        <div style="flex-shrink:0;">${getLevelBadgeSVG(lvl, isFirst ? 42 : 34)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;font-size:${isFirst ? '15px' : '13px'};margin-bottom:2px;">${m.name}</div>
          <div style="font-size:9px;opacity:0.65;margin-bottom:3px;">${trophyLevels[lvl-1].name}</div>
          <div style="background:rgba(0,0,0,0.2);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;display:inline-block;">🔥 ${m.streak} day streak</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;">
          <div style="font-family:'Lexend',sans-serif;font-size:${isFirst ? '20px' : '16px'};font-weight:800;line-height:1;">${m.xp.toLocaleString()}</div>
          <div style="font-size:9px;opacity:0.6;font-weight:600;letter-spacing:0.4px;">XP</div>
          ${bonus.multiplier > 1 ? `<div style="background:rgba(0,0,0,0.25);border-radius:8px;padding:1px 6px;font-size:9px;font-weight:700;color:${bonus.color};">⚡ ${bonus.label}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('leaderboard').innerHTML = `<div style="padding-top:8px;">${allHtml}</div>`;
}



// ── BADGES (row style) ──
function renderBadges(){
  document.getElementById('badges-display').innerHTML=badges.map(b=>`
    <div class="badge-row">
      <div class="badge-icon-wrap" style="background:${b.bg};">${b.icon}</div>
      <div class="badge-row-info">
        <div class="badge-row-name">${b.label} ${b.isNew?'<span class="badge-new-tag">NEW</span>':''}</div>
        <div class="badge-row-who">Earned by ${b.who}</div>
      </div>
    </div>
  `).join('');
}

// ── TRACKER ──
function filterCat(el,cat){
  document.querySelectorAll('.cat-tab').forEach(c=>c.classList.remove('active'));
  el.classList.add('active'); currentCatFilter=cat; renderTracker();
}

function renderTracker(){
  const filtered = goals.filter(g =>
    g.member === planViewMember || g.member === 'All'
  );
  const done = filtered.filter(g => isDoneToday(g)).length;
  const isViewingOwn = planViewMember === loggedInUser;
  const summaryEl = document.getElementById('tracker-summary');
  if (summaryEl) summaryEl.textContent = `${done}/${filtered.length} completed today${!isViewingOwn ? ' · Viewing ' + planViewMember + "'s plan" : ''}`;
  const ci = {fitness:'💪', finance:'💰', spiritual:'🙏'};
  document.getElementById('goal-list').innerHTML = filtered.map(g => {
    const canToggle = isViewingOwn;
    const canEdit   = isViewingOwn && g.member !== 'All';
    const doneToday = isDoneToday(g);
    return `
      <div class="goal-card ${doneToday ? 'completed' : ''}" style="position:relative;">
        <div style="flex:1;cursor:${canToggle?'pointer':'default'};" onclick="${canToggle ? `toggleGoal('${g.id}')` : ''}">
          <div style="font-weight:600;font-size:13px;${doneToday?'text-decoration:line-through;opacity:0.4;':''}">${g.name}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">${g.freq}</div>
        </div>
        ${canEdit ? `
          <button onclick="event.stopPropagation(); openEditForm('${g.id}')" style="background:rgba(74,174,217,0.15);border:1.5px solid rgba(74,174,217,0.4);border-radius:10px;padding:7px 13px;color:var(--blue);font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;font-family:'Lexend',sans-serif;min-width:44px;min-height:36px;">✏️</button>
        ` : ''}
        <div class="check-btn ${doneToday ? 'done' : ''}" onclick="${canToggle ? `toggleGoal('${g.id}')` : ''}" ${!canToggle ? 'style="opacity:0.3;cursor:default;"' : ''}>${doneToday ? '✓' : ''}</div>
      </div>
    `;
  }).join('') || '<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px;">No goals yet — tap ＋ Add New Goal below!</div>';
}


function showLockedMsg(){ showModal('🔒','Not Your Goal',"You can only check off your own goals."); }

function memberColor(m){
  return getMember(m).color;
}

async function toggleGoal(id){
  const g = goals.find(g => String(g.id) === String(id));
  if (!g) return;

  const wasAlreadyDone = isDoneToday(g);
  g.done = !wasAlreadyDone; // toggle based on today's status

  if (g.done) {
    // Completing a goal
    g.completionDate = getTodayMountainDate();
    g.streak++;

    // Award +10 XP to the user permanently
    if (!personalData[g.member]) personalData[g.member] = { xp:0, streak:0, bestStreak:0, goalsTotal:0, goalsDone:0, daysActive:0, successRate:0, badges:[] };
    personalData[g.member].xp = (personalData[g.member].xp || 0) + 10;

    // Also update leaderboard entry
    const lb = leaderboardData.find(x => x.name === g.member);
    if (lb) lb.xp += 10;

    checkCelebration(g);
  } else {
    // Un-completing a goal — remove completionDate and reverse XP
    g.completionDate = null;
    g.streak = Math.max(0, g.streak - 1);

    if (personalData[g.member]) {
      personalData[g.member].xp = Math.max(0, (personalData[g.member].xp || 0) - 10);
    }
    const lb = leaderboardData.find(x => x.name === g.member);
    if (lb) lb.xp = Math.max(0, lb.xp - 10);
  }

  await updateGoalInSupabase(g);

  renderTracker();
  renderPersonalDashboard();
  renderLeaderboard();
}

function checkCelebration(g){
  if(g.streak===7){ showModal('7-Day Streak!', '7-Day Streak!', '"'+ g.name +'" — keep that fire going!'); launchConfetti(); }
  else if(goals.filter(function(x){ return x.member === loggedInUser || x.member === 'All'; }).every(function(x){ return isDoneToday(x); })){ showModal('Perfect Day!', 'Perfect Day!', 'All your goals are done today!'); launchConfetti(); }
  else if(Math.random() < 0.15){ showModal('Goal Complete!', 'Goal Complete!', 'Nice work on "' + g.name + '"!'); }
}

// ── ADD GOAL ──
function renderAddForm(){
  const notice=document.getElementById('add-lock-notice');
  if (notice) {
    notice.style.display='block';
    notice.innerHTML='<span>🔒</span> Adding as <strong>' + loggedInUser + '</strong>. Goals are assigned to you only.';
  }
  // No "All" option — goals only assigned to the logged-in user
  selectedMembers = new Set([loggedInUser]);
}

function selectCat(cat){selectedCat=cat;['fitness','finance','spiritual'].forEach(c=>document.getElementById('cat-'+c).classList.remove('selected'));document.getElementById('cat-'+cat).classList.add('selected');}
function selectFreq(freq){selectedFreq=freq;['daily','weekly'].forEach(f=>document.getElementById('freq-'+f).classList.remove('selected'));document.getElementById('freq-'+freq).classList.add('selected');}
function toggleMember(el){
  const m=el.dataset.member;
  document.querySelectorAll('#member-assign .member-chip').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  selectedMembers=new Set([m]);
}
function useTemplate(name,cat){document.getElementById('goal-name-input').value=name;selectCat(cat);}
async function saveGoal(){
  const name = document.getElementById('goal-name-input').value.trim();
  if(!name){ alert('Please enter a goal name!'); return; }

  const newGoal = {
    id: null,
    name,
    cat: selectedCat,
    freq: selectedFreq,
    member: loggedInUser,
    done: false,
    streak: 0
  };

  // Insert into Supabase first
  const row = await insertGoalToSupabase(newGoal);
  if (!row) {
    alert("Could not save goal to Supabase. Check console.");
    return;
  }

  // Use the real Supabase id
  newGoal.id = row.id;

  goals.push(newGoal);

  document.getElementById('goal-name-input').value = '';
  toggleAddGoalForm(false);
  renderTracker();
  showModal('🎯','Goal Added!',`"${name}" added to the tracker!`);
}

// ── EDIT / DELETE GOAL ──
let editingCat  = 'fitness';
let editingFreq = 'daily';

function openEditForm(id) {
  const g = goals.find(g => String(g.id) === String(id));
  if (!g) return;

  // Hide list, show edit form
  document.getElementById('goals-list-section').style.display = 'none';
  document.getElementById('add-goal-form-section').style.display  = 'none';
  document.getElementById('edit-goal-form-section').style.display = 'block';

  // Populate fields
  document.getElementById('edit-goal-id').value   = g.id;
  document.getElementById('edit-goal-name').value = g.name;

  editingCat  = g.cat  || 'fitness';
  editingFreq = g.freq || 'daily';

  // Highlight category
  ['fitness','finance','spiritual'].forEach(c => {
    document.getElementById('edit-cat-'+c).classList.toggle('selected', c === editingCat);
  });
  // Highlight frequency
  ['daily','weekly'].forEach(f => {
    document.getElementById('edit-freq-'+f).classList.toggle('selected', f === editingFreq);
  });

  document.querySelector('.main').scrollTop = 0;
}

function closeEditForm() {
  document.getElementById('edit-goal-form-section').style.display = 'none';
  document.getElementById('goals-list-section').style.display     = 'block';
}

function editSelectCat(cat) {
  editingCat = cat;
  ['fitness','finance','spiritual'].forEach(c =>
    document.getElementById('edit-cat-'+c).classList.toggle('selected', c === cat)
  );
}

function editSelectFreq(freq) {
  editingFreq = freq;
  ['daily','weekly'].forEach(f =>
    document.getElementById('edit-freq-'+f).classList.toggle('selected', f === freq)
  );
}

async function saveEditGoal() {
  const id   = document.getElementById('edit-goal-id').value;
  const name = document.getElementById('edit-goal-name').value.trim();
  if (!name) { alert('Goal name cannot be empty.'); return; }

  const g = goals.find(g => String(g.id) === String(id));
  if (!g) return;

  g.name = name;
  g.cat  = editingCat;
  g.freq = editingFreq;

  // Update in Supabase
  if (supabaseClient) {
    const { error } = await supabaseClient
      .from('goals')
      .update({ title: g.name, cat: g.cat, freq: g.freq })
      .eq('id', g.id);
    if (error) logSupabaseError('Edit goal', error);
  }

  closeEditForm();
  renderTracker();
  showModal('✏️', 'Goal Updated!', `"${g.name}" has been saved.`);
}

async function deleteGoal() {
  const id = document.getElementById('edit-goal-id').value;
  const g  = goals.find(g => String(g.id) === String(id));
  if (!g) return;

  const confirmed = confirm(`Delete "${g.name}"? This cannot be undone.`);
  if (!confirmed) return;

  // Remove from Supabase
  if (supabaseClient) {
    const { error } = await supabaseClient
      .from('goals')
      .delete()
      .eq('id', g.id);
    if (error) { logSupabaseError('Delete goal', error); return; }
  }

  // Remove from local array
  goals = goals.filter(g => String(g.id) !== String(id));

  closeEditForm();
  renderTracker();
  showModal('🗑️', 'Goal Deleted', `"${g.name}" has been removed.`);
}

// ── CALENDAR ──
function renderCalendar(){
  const today=new Date(), year=today.getFullYear(), month=today.getMonth();
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent=`${monthNames[month]} ${year}`;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const dayData={};
  for(let d=1;d<=daysInMonth;d++){
    const date=new Date(year,month,d);
    const isToday=date.toDateString()===today.toDateString();
    if(date>today){dayData[d]='future';continue;}
    if(isToday){dayData[d]='partial';continue;}
    const r=Math.random();
    dayData[d]=r>0.6?'full':r>0.25?'partial':'missed';
  }
  const full=Object.values(dayData).filter(v=>v==='full').length;
  const partial=Object.values(dayData).filter(v=>v==='partial').length;
  document.getElementById('cal-summary-pills').innerHTML=`
    <div style="background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:600;color:#22C55E;">✅ ${full} perfect</div>
    <div style="background:rgba(233,168,37,0.1);border:1px solid rgba(233,168,37,0.2);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:600;color:var(--gold);">🔥 ${full+Math.floor(partial/2)} streak</div>
  `;
  let html='';
  for(let i=0;i<firstDay;i++) html+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const status=dayData[d];
    const isToday=new Date(year,month,d).toDateString()===today.toDateString();
    let bg,tc,check='';
    if(status==='full'){bg='#22C55E';tc='white';check='<div style="font-size:9px;margin-top:1px;">✓</div>';}
    else if(status==='partial'){bg='rgba(34,197,94,0.22)';tc='#4ADE80';}
    else if(status==='missed'){bg='rgba(224,92,58,0.18)';tc='rgba(224,92,58,0.65)';}
    else{bg='var(--bg3)';tc='var(--muted)';}
    html+=`<div title="${monthNames[month]} ${d}" style="aspect-ratio:1;border-radius:6px;background:${bg};${isToday?'outline:2px solid var(--gold);outline-offset:1px;':''}display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:${status==='future'?'default':'pointer'};opacity:${status==='future'?'0.25':'1'};transition:transform 0.15s;" ${status!=='future'?`onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''"`:''}>
      <div style="font-size:10px;font-weight:${isToday?700:500};color:${tc};line-height:1;">${d}</div>${check}
    </div>`;
  }
  document.getElementById('calendar-grid').innerHTML=html;
}

// ── HISTORY ──
function renderHistory(){
  // History will be built from real goal completion data (Supabase)
  // For now show an empty state — activity will appear as goals are completed
  document.getElementById('history-log').innerHTML =
    '<div style="color:var(--muted);font-size:12px;padding:12px 0;">No recent activity yet — start checking off goals!</div>';
}

function renderProfile() {
  if (!loggedInUser) return;

  const m = getMember(loggedInUser);
  const d = personalData[loggedInUser] || { streak: 0 };
  const streak = d.streak || 0;

  const currentLevel = Math.min(Math.floor(streak / 7) + 1, 8);
  const levelInfo = trophyLevels[currentLevel - 1];

  document.getElementById('profile-name').textContent = `${m.emoji} ${loggedInUser}`;
  document.getElementById('profile-trophy-icon').innerHTML = getLevelBadgeSVG(currentLevel);
  document.getElementById('profile-level-name').textContent = `Level ${currentLevel} · ${levelInfo.name}`;
  document.getElementById('profile-streak-line').textContent = '🔥 ' + streak + ' day streak';

  renderTrophyRoad(streak, currentLevel);
}

function renderSettings() {
  if (!loggedInUser) return;
  const m = getMember(loggedInUser);
  const avatarEl = document.getElementById('settings-avatar');
  const nameEl   = document.getElementById('settings-name');
  const roleEl   = document.getElementById('settings-role');
  if (avatarEl) { avatarEl.textContent = m.emoji; avatarEl.style.background = m.color + '33'; avatarEl.style.borderColor = m.color + '66'; }
  if (nameEl)   nameEl.textContent = loggedInUser;
  if (roleEl)   roleEl.textContent = m.role;
}

// ── WIPE ALL GOALS (run once to clear demo data from Supabase) ──
async function wipeAllGoals() {
  const confirmed = confirm('⚠️ This will permanently delete ALL goals for everyone. Are you sure?');
  if (!confirmed) return;

  const btn = document.getElementById('wipe-goals-btn');
  if (btn) { btn.textContent = 'Deleting…'; btn.disabled = true; }

  // Store a reset timestamp — goals loaded before this time will be filtered out
  // This acts as a fallback if Supabase RLS blocks the delete
  const resetTime = new Date().toISOString();
  localStorage.setItem('goals_reset_at', resetTime);

  let deleteOk = false;

  if (supabaseClient) {
    // Fetch all IDs first
    const { data: allGoals, error: fetchError } = await supabaseClient
      .from('goals')
      .select('id, created_at');

    if (!fetchError && allGoals && allGoals.length > 0) {
      // Delete each goal individually to bypass any RLS batch restrictions
      let failCount = 0;
      for (const g of allGoals) {
        const { error } = await supabaseClient
          .from('goals')
          .delete()
          .eq('id', g.id);
        if (error) failCount++;
      }
      deleteOk = failCount === 0;
      console.log(`Wipe: attempted ${allGoals.length} deletes, ${failCount} failed`);
    } else {
      deleteOk = true; // nothing to delete
    }
  }

  // Clear local array regardless
  goals = [];
  renderTracker();
  renderPersonalDashboard();

  if (btn) {
    btn.textContent = '✓ Done!';
    btn.disabled = false;
  }

  const msg = deleteOk
    ? 'Everyone starts fresh. Add your real goals now!'
    : 'Some goals may reappear — ask your admin to clear the Supabase table directly.';
  showModal('✅', 'All Goals Cleared', msg);
  launchConfetti();
}

function renderTrophyRoad(streak, currentLevel) {
  // Build the Clash Royale-style stacked steps path
  const html = trophyLevels.slice().reverse().map((lvl, revIdx) => {
    const lvlNum = trophyLevels.length - revIdx;
    const realLvl = trophyLevels[lvlNum - 1];
    const levelStartDay = (lvlNum - 1) * 7;
    const isCurrentLevel = lvlNum === currentLevel;
    const isCompleted = streak >= lvlNum * 7;
    const isLocked = streak < levelStartDay;

    // Determine which streak bonus applies at this level's streak threshold
    const lvlStreakMin = levelStartDay + 1; // first day of this level = streak value
    const bonus = getStreakBonus(lvlStreakMin);

    const stepsHtml = Array.from({length:7}, (_,i) => {
      const stepDay = levelStartDay + i + 1;
      const isDone = streak >= stepDay;
      const isCurrent = stepDay === streak + 1;
      return `
        <div style="
          display:flex; align-items:center; justify-content:center;
          background:${isDone ? realLvl.color : isLocked ? '#0A1020' : '#0F1C30'};
          border-left:3px solid ${realLvl.color}88;
          border-right:3px solid ${realLvl.color}88;
          padding:8px 0;
          position:relative;
          transition:all 0.3s;
          ${isCurrent ? `box-shadow:inset 0 0 12px ${realLvl.color}66;` : ''}
        ">
          <div style="position:absolute;left:14px;opacity:${isLocked?0.2:0.7};font-size:13px;">👑</div>
          <div style="font-size:13px;font-weight:700;color:${isDone?'rgba(255,255,255,0.9)':isLocked?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.5)'};">${stepDay <= 49 ? stepDay : ''}</div>
          <div style="position:absolute;right:14px;opacity:${isLocked?0.2:0.7};font-size:13px;">👑</div>
          ${isCurrent ? `<div style="position:absolute;right:-2px;font-size:10px;background:var(--gold);color:#000;border-radius:8px;padding:1px 5px;font-weight:700;">YOU</div>` : ''}
        </div>
      `;
    }).reverse().join('');

    const opacity = isLocked ? 0.35 : 1;

    return `
      <div style="opacity:${opacity};margin-bottom:0;">
        <div style="
          background:${isCompleted ? realLvl.bg : isCurrentLevel ? realLvl.bg : 'linear-gradient(135deg,#111827,#1F2E4A)'};
          padding:14px 20px;
          display:flex; align-items:center; justify-content:space-between;
          border-top:2px solid ${realLvl.color}55;
          ${isCurrentLevel ? `box-shadow:0 0 20px ${realLvl.color}44;` : ''}
        ">
          <!-- Left: level number + XP bonus pill -->
          <div style="display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:52px;">
            <div style="font-size:10px;font-weight:700;color:${realLvl.color};letter-spacing:0.5px;opacity:0.8;">LEVEL ${lvlNum}</div>
            <div style="background:${bonus.color}22;border:1px solid ${bonus.color}55;border-radius:8px;padding:2px 7px;font-size:10px;font-weight:700;color:${bonus.color};white-space:nowrap;">
              ⚡ ${bonus.label} XP
            </div>
          </div>
          <!-- Center: badge + name -->
          <div style="text-align:center;">
            <div>${getLevelBadgeSVG(lvlNum)}</div>
            <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.8);margin-top:2px;letter-spacing:0.3px;">${realLvl.name}</div>
          </div>
          <!-- Right: progress/status -->
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-align:right;min-width:52px;">
            ${isCompleted ? '<span style="color:#22C55E;font-weight:700;">✓ Done</span>' : isCurrentLevel ? `<span style="color:var(--gold);font-weight:700;">${streak - levelStartDay}/7</span>` : isLocked ? '🔒' : ''}
          </div>
        </div>
        <div>${stepsHtml}</div>
        <div style="height:3px;background:linear-gradient(90deg,transparent,${realLvl.color}88,transparent);"></div>
      </div>
    `;
  }).join('');

  document.getElementById('trophy-road-content').innerHTML = `
    <div style="background:var(--bg);border-radius:0 0 12px 12px;overflow:hidden;">
      ${html}
    </div>
  `;

  // Render Family Arena section below the trophy road
  renderFamilyArena();
}

function renderFamilyArena() {
  const el = document.getElementById('family-arena-section');
  if (!el) return;

  const totalXP = getFamilyTotalXP();
  const current = getFamilyArena(totalXP);
  const nextArena = familyArenas.find(a => a.arena === current.arena + 1);
  const xpIntoArena = totalXP - current.minXP;
  const arenaRange = nextArena ? (current.maxXP - current.minXP + 1) : 1;
  const progressPct = nextArena ? Math.min((xpIntoArena / arenaRange) * 100, 100) : 100;
  const xpToNext = nextArena ? (nextArena.minXP - totalXP) : 0;

  const arenaTilesHtml = familyArenas.map(a => {
    const isActive = a.arena === current.arena;
    const isPast   = a.arena < current.arena;
    return `
      <div style="
        display:flex; align-items:center; gap:10px; padding:10px 14px;
        background:${isActive ? a.bg : isPast ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)'};
        border-radius:12px; margin-bottom:6px;
        border:1px solid ${isActive ? a.color + '66' : 'transparent'};
        ${isActive ? `box-shadow:0 0 16px ${a.color}33;` : ''}
        opacity:${isPast ? 0.7 : 1};
        transition: all 0.2s;
      ">
        <div style="font-size:${isActive ? '26px' : '18px'};flex-shrink:0;filter:${isActive ? `drop-shadow(0 0 6px ${a.color})` : 'none'};">${a.icon}</div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:10px;font-weight:700;color:${a.color};letter-spacing:0.4px;">ARENA ${a.arena}</span>
            ${isActive ? `<span style="background:${a.color};color:#000;border-radius:6px;padding:1px 6px;font-size:9px;font-weight:800;">CURRENT</span>` : ''}
            ${isPast ? `<span style="color:#22C55E;font-size:10px;">✓</span>` : ''}
          </div>
          <div style="font-family:'Lexend',sans-serif;font-size:13px;font-weight:700;color:${isActive ? 'white' : 'rgba(255,255,255,0.5)'};">${a.name}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">${a.minXP.toLocaleString()}${a.maxXP === Infinity ? '+ XP' : ' – ' + a.maxXP.toLocaleString() + ' XP'}</div>
        </div>
        ${isActive && nextArena ? `
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:4px;">${xpToNext.toLocaleString()} XP to go</div>
            <div style="width:60px;height:5px;background:rgba(255,255,255,0.1);border-radius:100px;overflow:hidden;">
              <div style="width:${progressPct}%;height:100%;background:${a.color};border-radius:100px;transition:width 1s ease;"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="card" style="margin-top:18px;margin-bottom:18px;">
      <div class="section-title" style="margin-bottom:4px;">🏟️ Family Rise Arena</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px;">Family XP accumulates across all members and never resets.</div>

      <!-- Current arena hero -->
      <div style="background:${current.bg};border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid ${current.color}44;box-shadow:0 0 24px ${current.color}22;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="font-size:36px;filter:drop-shadow(0 0 10px ${current.color});">${current.icon}</div>
          <div>
            <div style="font-size:10px;font-weight:700;color:${current.color};letter-spacing:0.5px;">CURRENT ARENA</div>
            <div style="font-family:'Lexend',sans-serif;font-size:20px;font-weight:800;color:white;">${current.name}</div>
          </div>
          <div style="margin-left:auto;text-align:right;">
            <div style="font-family:'Lexend',sans-serif;font-size:26px;font-weight:800;color:${current.color};line-height:1;">${totalXP.toLocaleString()}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;">FAMILY XP</div>
          </div>
        </div>
        ${nextArena ? `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:5px;">
              <span>Progress to ${nextArena.name}</span>
              <span>${xpToNext.toLocaleString()} XP needed</span>
            </div>
            <div style="background:rgba(0,0,0,0.3);border-radius:100px;height:8px;overflow:hidden;">
              <div style="width:${progressPct}%;height:100%;background:linear-gradient(90deg,${current.color}88,${current.color});border-radius:100px;transition:width 1.2s ease;box-shadow:0 0 8px ${current.color};"></div>
            </div>
          </div>
        ` : `<div style="text-align:center;font-size:12px;font-weight:700;color:${current.color};">🏆 Maximum Arena Reached!</div>`}
      </div>

      <!-- All arena tiers -->
      <div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:0.5px;margin-bottom:8px;">ALL ARENAS</div>
      ${arenaTilesHtml}
    </div>
  `;
}

function toggleSection(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(id + '-arrow');
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ── REMINDERS ──
const reminderSettings=[
  {label:'Morning Check-in',icon:'🌅',time:'07:00',on:true},
  {label:'Midday Nudge',icon:'☀️',time:'12:00',on:false},
  {label:'Evening Review',icon:'🌙',time:'20:00',on:true},
  {label:'End-of-Day',icon:'🌃',time:'21:30',on:true},
];
function renderReminders(){
  document.getElementById('reminder-rows').innerHTML=reminderSettings.map((r,i)=>`
    <div class="notif-row">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">${r.icon}</span>
        <div><div style="font-weight:600;font-size:13px;margin-bottom:3px;">${r.label}</div><input type="time" class="time-input" value="${r.time}"/></div>
      </div>
      <button class="toggle ${r.on?'on':''}" onclick="this.classList.toggle('on')"></button>
    </div>
  `).join('');
}
function renderNotifications(){
  const notifs=[
    {icon:'🌅',title:'Morning Check-in',body:'Time to log your morning goals!',time:'7:00 AM today'},
    {icon:'🔥',title:'Streak Alert!',body:"Dad is on an 8-day streak!",time:'Yesterday, 8PM'},
    {icon:'🎉',title:'Perfect Day!',body:'All goals completed yesterday!',time:'Yesterday, 9:30PM'},
    {icon:'💡',title:'Nudge',body:"Jaxon hasn't logged Gratitude Journal yet.",time:'Yesterday, 6PM'},
  ];
  document.getElementById('notif-list').innerHTML=notifs.map(n=>`
    <div class="notif-card"><div class="notif-icon">${n.icon}</div><div><div class="notif-title">${n.title}</div><div class="notif-body">${n.body}</div><div class="notif-time">${n.time}</div></div></div>
  `).join('');
}

// ── PERSONAL DASHBOARD ──
function renderPersonalDashboard(){
  const activeMember = loggedInUser || selectedMember;
  const d = personalData[activeMember] || { xp:0, streak:0, bestStreak:0, goalsTotal:0, goalsDone:0, daysActive:0 };
  const m = getMember(activeMember);
  const color = m.color;
  const emoji = m.emoji;
  const rank = leaderboardData.findIndex(x => x.name === activeMember) + 1;
  const rl = ['#1','#2','#3','#4','#5'][rank - 1] || '#?';
  const streak = d.streak || 0;
  const currentLevel = Math.min(Math.floor(streak / 7) + 1, 8);
  const levelInfo = trophyLevels[currentLevel - 1];

  // Hero card
  document.getElementById('personal-hero').innerHTML = `
    <div style="background:linear-gradient(135deg,${color}BB,${color}55);border-radius:16px;padding:16px 18px;color:white;display:flex;align-items:center;gap:14px;border:1px solid ${color}30;">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${emoji}</div>
      <div style="flex:1;">
        <div style="font-family:'Lexend',sans-serif;font-size:18px;font-weight:700;margin-bottom:3px;">${activeMember}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <div style="font-family:'Lexend',sans-serif;font-size:22px;font-weight:800;color:#FFD700;line-height:1;text-shadow:0 0 12px rgba(255,200,0,0.4);">${d.xp.toLocaleString()}</div>
          <div style="font-size:10px;font-weight:700;color:rgba(255,220,100,0.8);letter-spacing:0.5px;">XP</div>
        </div>
        <div style="opacity:0.7;font-size:10px;">Rank ${rl} · Best streak: ${d.bestStreak}d</div>
      </div>
      <div style="text-align:center;background:rgba(20,12,0,0.4);border:2px solid rgba(255,120,0,0.8);border-radius:16px;padding:12px 16px;flex-shrink:0;box-shadow:0 0 18px rgba(255,100,0,0.5),0 0 40px rgba(255,80,0,0.2),inset 0 0 16px rgba(255,100,0,0.07);">
        <div style="font-size:28px;line-height:1;margin-bottom:4px;filter:drop-shadow(0 0 10px rgba(255,140,0,0.9));">🔥</div>
        <div style="font-family:'Lexend',sans-serif;font-size:32px;font-weight:800;color:#FFD700;line-height:1;margin-bottom:3px;text-shadow:0 0 16px rgba(255,200,0,0.5);">${streak}</div>
        <div style="font-size:9px;font-weight:500;letter-spacing:0.8px;color:rgba(255,180,80,0.75);">day streak</div>
      </div>
    </div>
  `;

  // Compute today's real completion stats from live goals
  const myGoalsForStats = goals.filter(g => g.member === activeMember || g.member === 'All');
  const goalsDoneToday  = myGoalsForStats.filter(g => isDoneToday(g)).length;
  const goalsTotalToday = myGoalsForStats.length;

  // Stats row: Today | Active Days | Badge Level (tappable → Rise Road)
  const todaySub = goalsTotalToday === 0 ? 'No goals yet' : goalsDoneToday === goalsTotalToday ? '🎉 Perfect!' : (goalsTotalToday - goalsDoneToday) + ' left';
  document.getElementById('personal-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-label">Today</div>
      <div class="stat-value">${goalsDoneToday}/${goalsTotalToday}</div>
      <div class="stat-sub">${todaySub}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📅</div>
      <div class="stat-label">Active Days</div>
      <div class="stat-value">${d.daysActive}</div>
      <div class="stat-sub">this month</div>
    </div>
    <div class="stat-card" style="cursor:pointer;" onclick="showPage('riseroad')">
      <div style="display:flex;justify-content:center;margin-bottom:2px;">${getLevelBadgeSVG(currentLevel, 28)}</div>
      <div class="stat-label">Badge Level</div>
      <div class="stat-value" style="font-size:15px;">${currentLevel}</div>
      <div class="stat-sub" style="font-size:9px;line-height:1.2;">${levelInfo.name}</div>
    </div>
  `;

  // My Goal Streaks (renamed from Active Streaks)
  const myGoals = goals.filter(g => g.member === activeMember || g.member === 'All');
  document.getElementById('personal-streaks').innerHTML = myGoals.length ? `
    <div style="display:flex;flex-direction:column;gap:9px;">${myGoals.map(g => {
      const doneInStreaks = isDoneToday(g);
      const fp = Math.min((g.streak || 0) * 10, 100);
      const fb = g.streak >= 7 ? 'rgba(233,168,37,0.15)' : g.streak >= 3 ? 'rgba(233,168,37,0.08)' : 'rgba(255,255,255,0.04)';
      const fc = g.streak >= 7 ? 'var(--gold)' : g.streak >= 3 ? '#D97706' : 'var(--muted)';
      return `<div style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px;">

        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:12px;margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.name}</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${fp}%;background:${color};"></div></div>
        </div>
        <div style="background:${fb};border-radius:10px;padding:5px 9px;text-align:center;flex-shrink:0;border:1px solid ${g.streak>0?fc+'44':'transparent'};">
          <div style="font-size:${(g.streak||0)>=7?'18px':(g.streak||0)>=3?'15px':'12px'};line-height:1;">${(g.streak||0)>0?'🔥':'—'}</div>
          <div style="font-family:'Lexend',sans-serif;font-size:16px;font-weight:700;color:${(g.streak||0)>0?fc:'var(--muted)'};">${g.streak||0}</div>
          <div style="font-size:8px;color:var(--muted);">days</div>
        </div>
      </div>`;
    }).join('')}</div>
  ` : '<div style="color:var(--muted);font-size:12px;padding:8px 0;">No goals yet — add some on the My Goals page!</div>';
}

function selectPersonalMember(m){selectedMember=m;renderPersonalDashboard();}

// ── MODAL ──
function showModal(emoji,title,body){
  document.getElementById('modal-emoji').textContent=emoji;
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-body').textContent=body;
  document.getElementById('modal').classList.add('show');
}
function closeModal(){document.getElementById('modal').classList.remove('show');}

// ── CONFETTI ──
function launchConfetti(){
  const colors=['#1A6FA8','#4AAED9','#E9A825','#E05C3A','#7EC8F3','#F4D03F'];
  for(let i=0;i<60;i++){
    const el=document.createElement('div');
    el.className='confetti-piece';
    el.style.cssText=`left:${Math.random()*100}vw;top:0;background:${colors[Math.floor(Math.random()*colors.length)]};width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>.5?'50%':'2px'};animation-delay:${Math.random()*.5}s;animation-duration:${1.5+Math.random()}s;`;
    document.body.appendChild(el);
    el.addEventListener('animationend',()=>el.remove());
  }
}
