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

  goals = (data || []).map(row => ({
    id: row.id,
    name: row.title,
    member: row.member,
    done: row.completed,
    cat: row.cat || "fitness",
    freq: row.freq || "daily",
    streak: row.streak || 0
  }));
}

async function insertGoalToSupabase(goal) {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from("goals")
    .insert([{
      title: goal.name,
      member: goal.member,
      completed: goal.done,
      cat: goal.cat,
      freq: goal.freq,
      streak: goal.streak
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
      completed: goal.done,
      streak: goal.streak
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
let goals = [
  { id:1,  name:'Walk 10,000 steps',   cat:'fitness',  freq:'daily', member:'Dad',     done:true,  streak:5 },
  { id:2,  name:'Morning Prayer',      cat:'spiritual',freq:'daily', member:'All',     done:true,  streak:7 },
  { id:3,  name:'No Junk Food',        cat:'fitness',  freq:'daily', member:'Mom',     done:false, streak:3 },
  { id:4,  name:'Track Spending',      cat:'finance',  freq:'daily', member:'All',     done:false, streak:2 },
  { id:5,  name:'Read Bible',          cat:'spiritual',freq:'daily', member:'Zach',    done:true,  streak:4 },
  { id:6,  name:'Save $10 Today',      cat:'finance',  freq:'daily', member:'Mom',     done:true,  streak:6 },
  { id:7,  name:'Exercise 30 min',     cat:'fitness',  freq:'daily', member:'Berrett', done:false, streak:1 },
  { id:8,  name:'Gratitude Journal',   cat:'spiritual',freq:'daily', member:'Jaxon',   done:false, streak:0 },
  { id:9,  name:'No impulse buys',     cat:'finance',  freq:'daily', member:'Dad',     done:true,  streak:8 },
  { id:10, name:'Family devotion',     cat:'spiritual',freq:'daily', member:'All',     done:true,  streak:7 },
];

const leaderboardData = [
  { name:'Dad', score:95, streak:8 },
  { name:'Zach', score:88, streak:5 },
  { name:'Mom', score:85, streak:6 },
  { name:'Berrett', score:78, streak:4 },
  { name:'Jaxon', score:72, streak:3 },
];

const badges = [
  { icon:'🔥', label:'7-Day Streak', who:'Family', bg:'rgba(233,168,37,0.15)', isNew:true },
  { icon:'💪', label:'Fitness Week', who:'Dad', bg:'rgba(74,174,217,0.12)' },
  { icon:'💰', label:'Saver', who:'Mom', bg:'rgba(34,197,94,0.12)', isNew:true },
  { icon:'🙏', label:'Faithful', who:'Zach', bg:'rgba(155,89,182,0.15)' },
  { icon:'⭐', label:'Perfect Day', who:'Berrett', bg:'rgba(233,168,37,0.12)' },
  { icon:'🏅', label:'Month Strong', who:'Jaxon', bg:'rgba(74,174,217,0.1)' },
];

const personalData = {
  Dad:     { score:95, streak:8, bestStreak:14, goalsTotal:4, goalsDone:4, daysActive:28, successRate:91, badges:['🔥 7-Day Streak','💰 Saver','🏅 Month Strong','⭐ Perfect Day'] },
  Mom:     { score:85, streak:6, bestStreak:11, goalsTotal:3, goalsDone:2, daysActive:25, successRate:83, badges:['💰 Saver','🙏 Faithful'] },
  Zach:    { score:88, streak:5, bestStreak:9,  goalsTotal:2, goalsDone:2, daysActive:22, successRate:87, badges:['🙏 Faithful','⭐ Perfect Day'] },
  Berrett: { score:78, streak:4, bestStreak:7,  goalsTotal:2, goalsDone:1, daysActive:19, successRate:74, badges:['💪 Fitness Week'] },
  Jaxon:   { score:72, streak:3, bestStreak:6,  goalsTotal:2, goalsDone:0, daysActive:15, successRate:68, badges:['🔥 First Streak'] },
};

const personalCats = {
  Dad:     { fitness:90, finance:95, spiritual:100 },
  Mom:     { fitness:70, finance:88, spiritual:90 },
  Zach:    { fitness:85, finance:75, spiritual:100 },
  Berrett: { fitness:60, finance:80, spiritual:85 },
  Jaxon:   { fitness:50, finance:70, spiritual:80 },
};

let currentCatFilter = 'all', selectedCat = 'fitness', selectedFreq = 'daily';

let selectedMembers = new Set(['All']);   // used on Add Goal screen
let selectedMember = 'Dad';              // used on Personal Dashboard tabs

let planViewMember = null;               // used on My Plan view

// ── INIT ──
async function initApp() {
  await loadGoalsFromSupabase();
  planViewMember = loggedInUser;
  renderLeaderboard();
  renderBadges();
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
  renderTracker();
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
  const sym=['🥈','🥉','4️⃣','5️⃣'];
  const bg=['linear-gradient(135deg,#5A6472,#8A9CB0)','linear-gradient(135deg,#6B3A1F,#A0622A)','linear-gradient(135deg,#1F2E4A,#253660)','linear-gradient(135deg,#1F2E4A,#253660)'];

  const first = leaderboardData[0];
  const rest = leaderboardData.slice(1);
  const firstLevel = getMemberLevel(first.name);

  const firstHtml = `
    <div style="background:linear-gradient(135deg,#8B6000,#E9A825,#FFD700);border-radius:16px;padding:16px 15px 14px;color:white;margin-bottom:8px;box-shadow:0 0 22px rgba(233,168,37,0.5),0 4px 16px rgba(0,0,0,0.4);">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:22px;flex-shrink:0;">🥇</div>
        <div style="flex-shrink:0;">${getLevelBadgeSVG(firstLevel, 44)}</div>
        <div style="flex:1;min-width:0;">
          <div style="position:relative;display:inline-block;">
            <div style="font-size:18px;line-height:1;position:absolute;top:-20px;left:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">👑</div>
            <div style="font-weight:800;font-size:15px;margin-bottom:2px;padding-top:2px;">${first.name}</div>
          </div>
          <div style="font-size:9px;opacity:0.8;margin-bottom:5px;">${trophyLevels[firstLevel-1].name}</div>
          <div style="background:rgba(255,255,255,0.25);border-radius:100px;height:5px;overflow:hidden;"><div style="width:${first.score}%;height:100%;background:white;border-radius:100px;"></div></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
          <div style="font-family:'Lexend',sans-serif;font-size:20px;font-weight:800;line-height:1;">${first.score}%</div>
          <div style="background:rgba(0,0,0,0.2);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;">🔥 ${first.streak} day streak</div>
        </div>
      </div>
    </div>
  `;

  const restHtml = rest.map((m,i)=>{
    const lvl = getMemberLevel(m.name);
    return `
      <div style="background:${bg[i]};border-radius:12px;padding:10px 13px;color:white;display:flex;align-items:center;gap:10px;margin-bottom:7px;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='translateX(3px)'" onmouseout="this.style.transform=''">
        <div style="font-size:16px;flex-shrink:0;">${sym[i]}</div>
        <div style="flex-shrink:0;">${getLevelBadgeSVG(lvl, 34)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:12px;margin-bottom:1px;">${m.name}</div>
          <div style="font-size:9px;opacity:0.65;margin-bottom:4px;">${trophyLevels[lvl-1].name}</div>
          <div style="background:rgba(255,255,255,0.18);border-radius:100px;height:4px;overflow:hidden;"><div style="width:${m.score}%;height:100%;background:white;border-radius:100px;"></div></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;">
          <div style="font-family:'Lexend',sans-serif;font-size:16px;font-weight:700;line-height:1;">${m.score}%</div>
          <div style="background:rgba(0,0,0,0.22);border-radius:20px;padding:2px 7px;font-size:10px;font-weight:700;">🔥 ${m.streak} day streak</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('leaderboard').innerHTML = `<div style="padding-top:12px;">${firstHtml}${restHtml}</div>`;
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
  // Show goals for the selected plan member (their own + All goals)
  const filtered=goals.filter(g=>{
    const memberOk = g.member===planViewMember || g.member==='All';
    const catOk = currentCatFilter==='all' || g.cat===currentCatFilter;
    return memberOk && catOk;
  });
  const done=filtered.filter(g=>g.done).length;
  const isViewingOwn = planViewMember === loggedInUser;
  document.getElementById('tracker-summary').textContent=`${done}/${filtered.length} completed today${!isViewingOwn?' · Viewing '+planViewMember+"'s plan":''}`;
  const ci={fitness:'💪',finance:'💰',spiritual:'🙏'};
  document.getElementById('goal-list').innerHTML=filtered.map(g=>{
    const canToggle = isViewingOwn; // only check off your own view
    return `
      <div class="goal-card ${g.done?'completed':''}" onclick="${canToggle?`toggleGoal('${g.id}')`:''}">
        <div style="flex:1;">
          <div style="font-weight:600;font-size:13px;${g.done?'text-decoration:line-through;opacity:0.4;':''}">${g.name}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">${ci[g.cat]} ${g.cat.charAt(0).toUpperCase()+g.cat.slice(1)}</div>
        </div>
        <div class="check-btn ${g.done?'done':''}" ${!canToggle?'style="opacity:0.3;cursor:default;"':''}>${g.done?'✓':''}</div>
      </div>
    `;
  }).join('')||'<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px;">No goals found.</div>';
}

function showLockedMsg(){ showModal('🔒','Not Your Goal',"You can only check off your own goals."); }

function memberColor(m){
  return getMember(m).color;
}

async function toggleGoal(id){
  const g = goals.find(g=> String(g.id) === String(id));
  if(!g) return;

  g.done = !g.done;
  if(g.done){ g.streak++; checkCelebration(g); }
  else { g.streak = Math.max(0, g.streak-1); }

  await updateGoalInSupabase(g);

  renderTracker();
}

function checkCelebration(g){
  if(g.streak===7){showModal('🔥','7-Day Streak!',`"${g.name}" — keep that fire going!`);launchConfetti();}
  else if(goals.filter(g=>g.done).length===goals.length){showModal('🎉','Perfect Day!','All Johnson family goals complete!');launchConfetti();}
  else if(Math.random()<0.15){showModal('✅','Goal Complete!',`Nice work on "${g.name}"!`);}
}

// ── ADD GOAL ──
function renderAddForm(){
  const notice=document.getElementById('add-lock-notice');
  notice.style.display='block';
  notice.innerHTML=`🔒 Adding as <strong>${loggedInUser}</strong>. You can assign to yourself or All.`;

  // Member assign chips — only show logged-in user + All
  const allowed=['All',loggedInUser];
document.getElementById('member-assign').innerHTML = allowed.map(m=>`
  <div class="member-chip ${m==='All'?'selected':''}" data-member="${m}" onclick="toggleMember(this)">
    ${m==='All' ? '👪 All' : `${getMember(m).emoji} ${m}`}
  </div>
`).join('');
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

  const assignTo = [...selectedMembers][0] || loggedInUser;

  const newGoal = {
    id: null,
    name,
    cat: selectedCat,
    freq: selectedFreq,
    member: assignTo,
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
  const entries=[
    {date:'Today',name:'Morning Prayer',who:'All',done:true},
    {date:'Today',name:'Walk 10,000 steps',who:'Dad',done:true},
    {date:'Today',name:'Save $10 Today',who:'Mom',done:true},
    {date:'Yesterday',name:'No Junk Food',who:'Mom',done:false},
    {date:'Yesterday',name:'Read Bible',who:'Zach',done:true},
    {date:'2 days ago',name:'Gratitude Journal',who:'Jaxon',done:false},
    {date:'2 days ago',name:'Exercise 30 min',who:'Berrett',done:true},
  ];
  document.getElementById('history-log').innerHTML=entries.map(e=>`
    <div class="history-entry">
      <div style="width:6px;height:6px;border-radius:50%;background:${e.done?'#22C55E':'var(--coral)'};flex-shrink:0;"></div>
      <div class="history-date">${e.date}</div>
      <div class="history-name">${e.name}</div>
      <div class="history-who" style="color:${memberColor(e.who)}">${e.who}</div>
      <div>${e.done?'✅':'❌'}</div>
    </div>
  `).join('');
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
  document.getElementById('profile-streak-line').textContent = `🔥 ${streak} day streak`;

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

function renderTrophyRoad(streak, currentLevel) {
  // Build the Clash Royale-style stacked steps path
  // Each level = 7 steps (days). Steps go 1–7 for each level.
  const html = trophyLevels.slice().reverse().map((lvl, revIdx) => {
    const lvlNum = trophyLevels.length - revIdx; // ✅ 8 down to 1
    const realLvl = trophyLevels[lvlNum - 1];
    const levelStartDay = (lvlNum - 1) * 7;
    const isCurrentLevel = lvlNum === currentLevel;
    const isCompleted = streak >= lvlNum * 7;
    const isLocked = streak < levelStartDay;

    // Steps within this level (7 steps = days)
    const stepsHtml = Array.from({length:7}, (_,i) => {
      const stepDay = levelStartDay + i + 1;
      const isDone = streak >= stepDay;
      const isCurrent = stepDay === streak + 1; // next step to achieve
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
          <!-- Crown icons on sides -->
          <div style="position:absolute;left:14px;opacity:${isLocked?0.2:0.7};font-size:13px;">👑</div>
          <div style="font-size:13px;font-weight:700;color:${isDone?'rgba(255,255,255,0.9)':isLocked?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.5)'};">${stepDay <= 49 ? stepDay : ''}</div>
          <div style="position:absolute;right:14px;opacity:${isLocked?0.2:0.7};font-size:13px;">👑</div>
          ${isCurrent ? `<div style="position:absolute;right:-2px;font-size:10px;background:var(--gold);color:#000;border-radius:8px;padding:1px 5px;font-weight:700;">YOU</div>` : ''}
        </div>
      `;
    }).reverse().join(''); // reverse so highest step is on top

    const opacity = isLocked ? 0.35 : 1;

    return `
      <div style="opacity:${opacity};margin-bottom:0;">
        <!-- Level badge row -->
        <div style="
          background:${isCompleted ? realLvl.bg : isCurrentLevel ? realLvl.bg : 'linear-gradient(135deg,#111827,#1F2E4A)'};
          padding:14px 20px;
          display:flex; align-items:center; justify-content:space-between;
          border-top:2px solid ${realLvl.color}55;
          ${isCurrentLevel ? `box-shadow:0 0 20px ${realLvl.color}44;` : ''}
        ">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:10px;font-weight:700;color:${realLvl.color};letter-spacing:0.5px;opacity:0.8;">LEVEL ${lvlNum}</div>
          </div>
          <div style="text-align:center;">
            <div>${getLevelBadgeSVG(lvlNum)}</div>
            <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.8);margin-top:2px;letter-spacing:0.3px;">${realLvl.name}</div>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-align:right;">
            ${isCompleted ? '<span style="color:#22C55E;font-weight:700;">✓ Done</span>' : isCurrentLevel ? `<span style="color:var(--gold);font-weight:700;">${streak - levelStartDay}/7</span>` : isLocked ? '🔒' : ''}
          </div>
        </div>
        <!-- Steps -->
        <div>${stepsHtml}</div>
        <!-- Glowing divider between levels -->
        <div style="height:3px;background:linear-gradient(90deg,transparent,${realLvl.color}88,transparent);"></div>
      </div>
    `;
  }).join('');

  document.getElementById('trophy-road-content').innerHTML = `
    <div style="background:var(--bg);border-radius:0 0 12px 12px;overflow:hidden;">
      ${html}
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
  // Dashboard always shows the logged-in user's own data
  const activeMember = loggedInUser || selectedMember;

  const d=personalData[activeMember],cats=personalCats[activeMember];
  const m = getMember(activeMember);
  const color = m.color;
  const emoji = m.emoji;
  const rank=leaderboardData.findIndex(x=>x.name===activeMember)+1;
  const rl=['🥇 #1','🥈 #2','🥉 #3','#4','#5'][rank-1];

  document.getElementById('personal-hero').innerHTML=`
    <div style="background:linear-gradient(135deg,${color}BB,${color}55);border-radius:16px;padding:16px 18px;color:white;display:flex;align-items:center;gap:14px;border:1px solid ${color}30;">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${emoji}</div>
      <div style="flex:1;">
        <div style="font-family:'Lexend',sans-serif;font-size:18px;font-weight:700;margin-bottom:2px;">${activeMember}</div>
        <div style="opacity:0.8;font-size:10px;">Rank ${rl} · Best streak: ${d.bestStreak}d</div>
      </div>
      <div style="text-align:center;background:rgba(20,12,0,0.4);border:2px solid rgba(255,120,0,0.8);border-radius:16px;padding:12px 16px;flex-shrink:0;box-shadow:0 0 18px rgba(255,100,0,0.5),0 0 40px rgba(255,80,0,0.2),inset 0 0 16px rgba(255,100,0,0.07);">
        <div style="font-size:28px;line-height:1;margin-bottom:4px;filter:drop-shadow(0 0 10px rgba(255,140,0,0.9));">🔥</div>
        <div style="font-family:'Lexend',sans-serif;font-size:32px;font-weight:800;color:#FFD700;line-height:1;margin-bottom:3px;text-shadow:0 0 16px rgba(255,200,0,0.5);">${d.streak}</div>
        <div style="font-size:9px;font-weight:500;letter-spacing:0.8px;color:rgba(255,180,80,0.75);">day streak</div>
      </div>
    </div>
  `;

  document.getElementById('personal-stats').innerHTML=`
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Today</div><div class="stat-value">${d.goalsDone}/${d.goalsTotal}</div><div class="stat-sub">${d.goalsDone===d.goalsTotal?'🎉 Perfect!':d.goalsTotal-d.goalsDone+' left'}</div></div>
    <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-label">Active Days</div><div class="stat-value">${d.daysActive}</div><div class="stat-sub">this month</div></div>
    <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-label">Success</div><div class="stat-value">${d.successRate}%</div><div class="stat-sub">all-time</div></div>
  `;

  const myGoals=goals.filter(g=>g.member===activeMember||g.member==='All');
  document.getElementById('personal-streaks').innerHTML=myGoals.length?`
    <div style="display:flex;flex-direction:column;gap:9px;">${myGoals.map(g=>{
      const fp=Math.min(g.streak*10,100);
      const fb=g.streak>=7?'rgba(233,168,37,0.15)':g.streak>=3?'rgba(233,168,37,0.08)':'rgba(255,255,255,0.04)';
      const fc=g.streak>=7?'var(--gold)':g.streak>=3?'#D97706':'var(--muted)';
      return `<div style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px;">
        <div style="font-size:18px;">${g.cat==='fitness'?'💪':g.cat==='finance'?'💰':'🙏'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:12px;margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.name}</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${fp}%;background:${color};"></div></div>
        </div>
        <div style="background:${fb};border-radius:10px;padding:5px 9px;text-align:center;flex-shrink:0;border:1px solid ${g.streak>0?fc+'44':'transparent'};">
          <div style="font-size:${g.streak>=7?'18px':g.streak>=3?'15px':'12px'};line-height:1;">${g.streak>0?'🔥':'—'}</div>
          <div style="font-family:'Lexend',sans-serif;font-size:16px;font-weight:700;color:${g.streak>0?fc:'var(--muted)'};">${g.streak}</div>
          <div style="font-size:8px;color:var(--muted);">days</div>
        </div>
      </div>`;
    }).join('')}</div>
  `:'<div style="color:var(--muted);font-size:12px;padding:8px 0;">No goals yet.</div>';

  document.getElementById('personal-categories').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:11px;">
      <div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>💪 Fitness</span><strong>${cats.fitness}%</strong></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${cats.fitness}%;background:linear-gradient(90deg,#4A3880,#7B5EA7);"></div></div></div>
      <div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>💰 Finance</span><strong>${cats.finance}%</strong></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${cats.finance}%;background:linear-gradient(90deg,#1A5C54,#2D8C80);"></div></div></div>
      <div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>🙏 Spiritual</span><strong>${cats.spiritual}%</strong></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${cats.spiritual}%;background:linear-gradient(90deg,#7A1F35,#A8384F);"></div></div></div>
    </div>
  `;

  document.getElementById('personal-goals').innerHTML=myGoals.map(g=>`
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);">
      <div style="width:28px;height:28px;border-radius:50%;background:${g.done?color:'var(--bg3)'};display:flex;align-items:center;justify-content:center;color:white;font-size:12px;flex-shrink:0;border:1px solid ${g.done?color:'var(--border)'};">${g.done?'✓':''}</div>
      <div style="flex:1;"><div style="font-weight:600;font-size:12px;${g.done?'text-decoration:line-through;opacity:0.4;':''}">${g.name}</div><div style="font-size:10px;color:var(--muted);">${g.cat} · ${g.freq}</div></div>
      ${g.streak>0?`<div class="streak-chip">🔥 ${g.streak}d</div>`:''}
    </div>
  `).join('');

  document.getElementById('personal-badges').innerHTML=d.badges.length
    ?`<div style="display:flex;flex-wrap:wrap;gap:7px;">${d.badges.map(b=>`<div style="background:${color}18;border:1px solid ${color}40;border-radius:10px;padding:7px 11px;font-size:12px;font-weight:500;">${b}</div>`).join('')}</div>`
    :'<div style="color:var(--muted);font-size:12px;">No badges yet — keep going!</div>';
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
