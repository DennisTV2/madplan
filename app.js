/* ===========================
   MADPLAN — App Logic
   =========================== */

// ─── STATE ───────────────────────────────────────────────────────────────────

let currentUser = null;
let days = 7;
let persons = 2;
let selectedOpt = 'cheap';
let loadingInterval = null;
let currentPlan = null;
let kidsEnabled = false;
let kidsAge = '6-9';
let kidsOptions = new Set(['vask-skær', 'røre-blande']);
let swapContext = null;
let swapAlts = null;
let lunchDays = 5;
let lunchPersons = 2;
let realOffers = null; // Sættes af fetchRealOffers() — null = brug fallback

// Plan-historik (lokal cache pr. enhed — brugerprofil er server-side)
let history = JSON.parse(localStorage.getItem('mp_history') || '[]');

// ─── STORE OFFERS DATA ────────────────────────────────────────────────────────

const STORE_OFFERS = {
  netto: {
    name: 'Netto', color: 'netto',
    chips: ['Kylling 29kr/kg', 'Pasta 8kr', 'Hakkede tomater 7kr', 'Gulerødder 6kr/kg'],
    items: [
      'Kyllingefilet: 29 kr/kg ★',
      'Spaghetti/pasta 500g: 8 kr ★',
      'Hakkede tomater dåse: 7 kr ★',
      'Cherry-tomater 2 bakker: 25 kr ★',
      'Gulerødder 1kg: 6 kr ★',
      'Mælk 1L: 7 kr ★',
    ],
  },
  rema: {
    name: 'Rema 1000', color: 'rema',
    chips: ['Laks 49kr/400g', 'Havregryn 12kr', 'Æg 10stk 20kr', 'Ris 12kr/kg'],
    items: [
      'Atlanterhavslaks 400g: 49 kr ★',
      'Havregryn 1kg: 12 kr ★',
      'Æg 10 stk: 20 kr ★',
      'Jasminris 1kg: 12 kr ★',
      'Broccoli: 12 kr ★',
      'Hakket oksekød 8% fedt 500g: 39 kr ★',
      'Kokosmælk 400ml: 14 kr ★',
    ],
  },
  lidl: {
    name: 'Lidl', color: 'lidl',
    chips: ['Svinekam 35kr/kg', 'Broccoli 9kr', 'Spinat 12kr', 'Pasta 7kr'],
    items: [
      'Svinekam 1kg: 35 kr ★',
      'Broccoli: 9 kr ★',
      'Frisk spinat 200g: 12 kr ★',
      'Mozzarella 125g: 15 kr ★',
      'Penne pasta 500g: 7 kr ★',
      'Æbler 1kg: 18 kr ★',
    ],
  },
  '365': {
    name: '365discount', color: 'disc',
    chips: ['Tun 8kr', 'Bønner 9kr', 'Pasta 7kr'],
    items: [
      'Tun i vand 185g: 8 kr ★',
      'Kidneybønner 400g: 9 kr ★',
      'Pasta 500g: 7 kr ★',
    ],
  },
  fakta: {
    name: 'Spar', color: 'spar',
    chips: ['Hel kylling 55kr', 'Kartofler 9kr/kg', 'Porre 8kr'],
    items: [
      'Hel kylling 1.2kg: 55 kr ★',
      'Kartofler 1kg: 9 kr ★',
      'Porre: 8 kr ★',
    ],
  },
  meny: {
    name: 'Meny', color: 'meny',
    chips: ['Torsk 65kr/400g', 'Krydderurter 18kr'],
    items: [
      'Frisk torsk 400g: 65 kr ★',
      'Friske krydderurter: 18 kr ★',
    ],
  },
  bilka: {
    name: 'Bilka', color: 'bilka',
    chips: ['Storkøb tilbud aktive'],
    items: ['Stort udvalg — hent live tilbud'],
  },
  fotex: {
    name: 'Føtex', color: 'fotex',
    chips: ['Føtex tilbud aktive'],
    items: ['Stort udvalg — hent live tilbud'],
  },
  coop: {
    name: 'Coop', color: 'coop',
    chips: ['Kyllingelår 35kr/kg', 'Kartofler 2kg/15kr', 'Yoghurt 16kr'],
    items: [
      'Kyllingelår 1kg: 35 kr ★',
      'Hakket oksekød 400g: 42 kr ★',
      'Kartofler 2kg: 15 kr ★',
      'Yoghurt naturel 500g: 16 kr ★',
    ],
  },
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup'));
  });
  document.getElementById('login-form').style.display  = tab === 'login'  ? '' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? '' : 'none';
}

// ── AUTH-HJÆLPERE ─────────────────────────────────────────────────────────────

function setAuthLoading(formId, loading) {
  const btn = document.querySelector(`#${formId} .btn-primary`);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading
    ? (formId === 'login-form' ? 'Logger ind…' : 'Opretter konto…')
    : (formId === 'login-form' ? 'Log ind'      : 'Opret konto');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

async function doLogin() {
  hideAuthError();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showAuthError('Udfyld e-mail og adgangskode'); return; }

  setAuthLoading('login-form', true);
  try {
    const res  = await fetch('auth.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'login', email, password: pass }),
    });
    const data = await res.json();
    if (data.error) { showAuthError(data.error); return; }
    currentUser = data.user;
    enterApp();
  } catch {
    showAuthError('Kunne ikke forbinde til serveren – prøv igen');
  } finally {
    setAuthLoading('login-form', false);
  }
}

async function doSignup() {
  hideAuthError();
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const pass  = document.getElementById('signup-pass').value;

  if (!name || !email || !pass) { showAuthError('Udfyld alle felter'); return; }
  if (pass.length < 6)          { showAuthError('Adgangskode skal være mindst 6 tegn'); return; }

  setAuthLoading('signup-form', true);
  try {
    const res  = await fetch('auth.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'register', name, email, password: pass }),
    });
    const data = await res.json();
    if (data.error) { showAuthError(data.error); return; }
    currentUser = data.user;
    enterApp();
  } catch {
    showAuthError('Kunne ikke forbinde til serveren – prøv igen');
  } finally {
    setAuthLoading('signup-form', false);
  }
}

// ─── SKIFT KODEORD (profil) ───────────────────────────────────────────────────

async function doChangePassword() {
  const current = document.getElementById('cp-current').value;
  const newPass  = document.getElementById('cp-new').value;
  const newPass2 = document.getElementById('cp-new2').value;
  const btn      = document.getElementById('cp-btn');

  if (!current)           { showChangePassMsg('Indtast dit nuværende kodeord', false); return; }
  if (newPass.length < 6) { showChangePassMsg('Nyt kodeord skal være mindst 6 tegn', false); return; }
  if (newPass !== newPass2) { showChangePassMsg('De to kodeord er ikke ens', false); return; }

  btn.disabled = true; btn.textContent = 'Gemmer…';
  try {
    const res  = await fetch('auth.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'changePassword', currentPassword: current, newPassword: newPass }),
    });
    const data = await res.json();
    if (data.error) { showChangePassMsg(data.error, false); return; }
    showChangePassMsg('Kodeord er opdateret ✓', true);
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value     = '';
    document.getElementById('cp-new2').value    = '';
  } catch {
    showChangePassMsg('Kunne ikke forbinde – prøv igen', false);
  } finally {
    btn.disabled = false; btn.textContent = 'Skift kodeord';
  }
}

function showChangePassMsg(msg, success) {
  const el = document.getElementById('change-pass-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  if (success) {
    el.style.background = 'var(--green-50)'; el.style.color = '#15803d';
    el.style.border = '1px solid #bbf7d0';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  } else {
    el.style.background = '#fef2f2'; el.style.color = '#dc2626';
    el.style.border = '1px solid #fecaca';
  }
}

// ─── GLEMT ADGANGSKODE ───────────────────────────────────────────────────────

function showForgotForm() {
  hideAuthError();
  document.getElementById('auth-tabs').style.display   = 'none';
  document.getElementById('login-form').style.display  = 'none';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = '';
  document.getElementById('forgot-email').focus();
}

function showLoginForm() {
  hideAuthError();
  document.getElementById('auth-tabs').style.display   = '';
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('reset-form').style.display  = 'none';
  document.getElementById('login-form').style.display  = '';
  document.getElementById('signup-form').style.display = 'none';
  // Sæt aktiv tab til login
  document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
}

async function doForgotPassword() {
  hideAuthError();
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  if (!email || !email.includes('@')) { showAuthError('Indtast en gyldig e-mailadresse'); return; }

  const btn = document.querySelector('#forgot-form .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Sender…'; }

  try {
    const res  = await fetch('reset.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'request', email }),
    });
    const data = await res.json();
    if (data.error) { showAuthError(data.error); return; }

    // Vis bekræftelse (aldrig afslør om e-mail eksisterer)
    const form = document.getElementById('forgot-form');
    form.innerHTML = `
      <div style="text-align:center;padding:0.5rem 0 1rem">
        <div style="font-size:2.5rem;margin-bottom:0.75rem">📬</div>
        <p style="font-weight:600;color:var(--text);margin-bottom:0.5rem">Link sendt!</p>
        <p style="font-size:13px;color:var(--muted);line-height:1.6">
          Hvis <strong>${email}</strong> er tilknyttet en konto, modtager du om lidt et link til at vælge en ny adgangskode.<br>
          Tjek evt. spam-mappen.
        </p>
        <div style="text-align:center;margin-top:1.25rem">
          <button class="auth-link-btn" onclick="showLoginForm()">← Tilbage til login</button>
        </div>
      </div>`;
  } catch {
    showAuthError('Kunne ikke forbinde til serveren – prøv igen');
  } finally {
    if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = 'Send nulstilningslink'; }
  }
}

// Token gemmes her mens reset-formen vises
let _resetToken = '';

async function doResetPassword() {
  hideAuthError();
  const pass  = document.getElementById('reset-pass').value;
  const pass2 = document.getElementById('reset-pass2').value;

  if (pass.length < 6)  { showAuthError('Adgangskode skal være mindst 6 tegn'); return; }
  if (pass !== pass2)   { showAuthError('De to adgangskoder er ikke ens'); return; }
  if (!_resetToken)     { showAuthError('Ugyldigt reset-link – anmod om et nyt'); return; }

  const btn = document.querySelector('#reset-form .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Gemmer…'; }

  try {
    const res  = await fetch('reset.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'reset', token: _resetToken, password: pass }),
    });
    const data = await res.json();
    if (data.error) { showAuthError(data.error); return; }

    // Ryd token fra URL og log ind
    window.history.replaceState({}, '', window.location.pathname);
    currentUser = data.user;
    enterApp();
  } catch {
    showAuthError('Kunne ikke forbinde til serveren – prøv igen');
  } finally {
    if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = 'Gem nyt kodeord'; }
  }
}

// Tjek eksisterende session ved sideindlæsning
async function checkSession() {
  // Tjek om URL indeholder ?reset=TOKEN → vis reset-formular
  const resetToken = new URLSearchParams(window.location.search).get('reset');
  if (resetToken) {
    _resetToken = resetToken;
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display   = '';
    document.getElementById('auth-tabs').style.display     = 'none';
    document.getElementById('login-form').style.display    = 'none';
    document.getElementById('signup-form').style.display   = 'none';
    document.getElementById('reset-form').style.display    = '';
    document.getElementById('reset-pass').focus();
    return;
  }

  try {
    const res  = await fetch('auth.php?action=check');
    const data = await res.json();
    if (data.user) {
      currentUser = data.user;
      enterApp();
      return;
    }
  } catch { /* ingen session eller netværksfejl → vis login */ }
  // Vis auth-skærm
  document.getElementById('splash-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display   = '';
}

// Kør session-check når DOM er klar
document.addEventListener('DOMContentLoaded', checkSession);

// ─── NATIVE FEEL ──────────────────────────────────────────────────────────────

// Haptic feedback via Vibration API (virker på Android, ignoreres på iOS)
function haptic(ms = 8) {
  navigator.vibrate?.(ms);
}

// Global tap-haptics på alle interaktive elementer — ingen ændringer i HTML
document.addEventListener('touchstart', (e) => {
  if (e.target.closest(
    'button, .nav-item, .shop-card, .day-card, .recipe-card, ' +
    '.gen-btn, .swap-btn, .action-btn, .auth-tab, .rd-persons-btn'
  )) haptic();
}, { passive: true });

// Overscroll styres i CSS (overscroll-behavior) – ingen touchmove-lytter, den koster frames

async function enterApp() {
  document.getElementById('splash-screen')?.remove();
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = '';
  document.getElementById('bottom-nav').style.display  = 'flex';

  const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const navAvatar = document.getElementById('nav-avatar');
  if (navAvatar) navAvatar.textContent = initials;
  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-name').textContent   = currentUser.name;
  document.getElementById('profile-email').textContent  = currentUser.email;

  // Apply saved defaults
  const def = JSON.parse(localStorage.getItem('mp_defaults_' + currentUser.email) || '{}');
  if (def.days)    { days    = def.days;    document.getElementById('days-val').textContent    = days; }
  if (def.persons) { persons = def.persons; document.getElementById('persons-val').textContent = persons; }
  if (def.days)    document.getElementById('default-days').value    = def.days;
  if (def.persons) document.getElementById('default-persons').value = def.persons;

  // loadHistory: lokal kopi vises straks, server-sync sker i baggrunden
  loadHistory(); // starter fetch — ikke await, lad UI vise straks
  updateStats();
  renderOffersRow();
  showPage('plan');
}

async function doLogout() {
  try {
    await fetch('auth.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'logout' }),
    });
  } catch { /* ignorer netværksfejl ved logout */ }
  currentUser = null;
  currentPlan = null;
  document.getElementById('auth-screen').style.display = '';
  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('bottom-nav').style.display  = 'none';
  document.getElementById('plan-output').style.display = 'none';
  document.getElementById('result-empty').style.display = '';
  // Ryd login-felter
  document.getElementById('login-pass').value = '';
  hideAuthError();
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#bottom-nav .nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  // plan and result both highlight the Plan tab
  const navMap = { plan: 0, result: 0, opskrifter: 1, indkob: 2, profile: 3 };
  const navItems = document.querySelectorAll('#bottom-nav .nav-item');
  if (navMap[page] !== undefined) navItems[navMap[page]]?.classList.add('active');

  if (page === 'history') renderHistory();
  if (page === 'result' && currentPlan) { renderPlan(currentPlan); loadPlanPhotos(); }
  if (page === 'opskrifter') renderRecipeCatalog();
  if (page === 'indkob') renderIndkob();
}

// ─── CONTROLS ─────────────────────────────────────────────────────────────────

function adjustDays(d) {
  days = Math.max(1, Math.min(14, days + d));
  document.getElementById('days-val').textContent = days;
}

function adjustPersons(d) {
  persons = Math.max(1, Math.min(20, persons + d));
  document.getElementById('persons-val').textContent = persons;
}

function toggleShop(el) {
  el.classList.toggle('selected');
  renderOffersRow();
  // Pre-fetch offers in background so they're cached when Generate is clicked
  const shops = [...document.querySelectorAll('.shop-card.selected')].map(s => s.dataset.shop);
  if (shops.length) fetchRealOffers(shops); // fire-and-forget
}

function selectOpt(opt) {
  selectedOpt = opt;
  ['cheap', 'one', 'balanced', 'quality'].forEach(o => {
    document.getElementById('opt-' + o).classList.toggle('active', o === opt);
  });
}

function addPantryItem() {
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = '<input type="text" placeholder="Råvare..."><button class="remove-btn" onclick="this.parentNode.remove()">×</button>';
  document.getElementById('pantry-list').appendChild(row);
  row.querySelector('input').focus();
}

function addPref() {
  const row = document.createElement('div');
  row.className = 'pref-row';
  row.innerHTML = `
    <select class="pref-type">
      <option value="include">Skal med</option>
      <option value="exclude">Må ikke</option>
    </select>
    <input type="text" placeholder="Ingrediens" aria-label="Ingrediens">
    <input type="number" class="pref-count" placeholder="antal" inputmode="numeric" aria-label="Antal retter" min="1" max="14">
    <button class="remove-btn" onclick="removePref(this)">×</button>
  `;
  document.getElementById('prefs-list').appendChild(row);
  row.querySelector('input[type="text"]').focus();
}

function removePref(btn) { btn.parentNode.remove(); }


// ─── KIDS FUNCTIONS ──────────────────────────────────────────────────────────

function toggleKids() {
  const cb = document.getElementById('kids-enabled');
  const body = document.getElementById('kids-body');
  kidsEnabled = cb.checked;
  body.classList.toggle('open', kidsEnabled);
}

function selectAge(el, age) {
  kidsAge = age;
  document.querySelectorAll('.kids-age-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function toggleKidsOpt(el, opt) {
  el.classList.toggle('active');
  if (kidsOptions.has(opt)) kidsOptions.delete(opt);
  else kidsOptions.add(opt);
}

function saveDefaults() {
  if (!currentUser) return;
  const def = {
    days:    parseInt(document.getElementById('default-days').value) || 7,
    persons: parseInt(document.getElementById('default-persons').value) || 2,
  };
  localStorage.setItem('mp_defaults_' + currentUser.email, JSON.stringify(def));
}

async function clearHistory() {
  if (!confirm('Er du sikker på du vil slette al historik?')) return;
  history = history.filter(h => h.user !== currentUser.email);
  localStorage.setItem('mp_history', JSON.stringify(history));
  renderHistory();
  updateStats();
  try { await fetch('history.php', { method: 'DELETE' }); } catch { /* ignorér netværksfejl */ }
}

// ─── GATHER SETTINGS ──────────────────────────────────────────────────────────

function gatherSettings() {
  const shops = [...document.querySelectorAll('.shop-card.selected')].map(s => s.dataset.shop);

  const mealTypes = [...document.querySelectorAll('#meal-types .tag.active')].map(t => t.textContent.trim());
  const dietTags  = [...document.querySelectorAll('#diet-tags .tag.active')].map(t => t.textContent.trim());
  const pantry    = [...document.querySelectorAll('#pantry-list input')].map(i => i.value.trim()).filter(Boolean);
  const budget    = document.getElementById('budget-input').value;

  const prefs = [...document.querySelectorAll('#prefs-list .pref-row')].map(row => {
    const type       = row.querySelector('.pref-type').value;
    const ingredient = row.querySelector('input[type="text"]').value.trim();
    const count      = row.querySelector('.pref-count').value;
    return ingredient ? { type, ingredient, count: count || null } : null;
  }).filter(Boolean);

  const kidsData = kidsEnabled ? {
    enabled: true,
    age: kidsAge,
    skills: [...kidsOptions],
  } : { enabled: false };

  return { days, persons, shops, mealTypes, dietTags, pantry, budget, prefs, optimizeMode: selectedOpt, kids: kidsData };
}

// ─── SEASONAL & WEEKDAY HELPERS ──────────────────────────────────────────────

const SEASON_DATA = {
  vinter: {
    months: [12, 1, 2],
    label: 'Vinter',
    pro:   ['rodfrugter', 'kål', 'porre', 'persillerod', 'selleri', 'pastinak', 'rødkål', 'savoykål', 'grønkål'],
    anti:  [],
    style: 'Solide varme retter — braiseret kød, tykke supper, gryder og ovnretter. Kål og rodfrugter er i sæson.',
    avoid: '',
    examples: 'Oksegryde, flæskesteg med rødkål, kartoffelsuppe, krebinetter med stuvet spidskål, grønkålspasta',
  },
  forår: {
    months: [3, 4, 5],
    label: 'Forår',
    pro:   ['asparges', 'spinat', 'radiser', 'ærter', 'ramsløg', 'nye kartofler', 'rejer', 'forårsløg', 'rabarbr'],
    anti:  ['rødkål'],
    style: 'Lette forårsretter med friske grøntsager. Undgå tunge vintergryder.',
    avoid: 'Brug IKKE rødkål, tunge kålgryder eller rodfrugtssupper — vintersæsonen er forbi for disse.',
    examples: 'Asparges med hollandaise, spinatpasta, nye kartofler med rejer, tarteletfyld med høns og asparges',
  },
  sommer: {
    months: [6, 7, 8],
    label: 'Sommer',
    pro:   ['tomater', 'agurk', 'courgette', 'squash', 'salat', 'ærter', 'bønner', 'majs', 'basilikum', 'fennikel', 'radiser', 'peberfrugt', 'jordbær', 'blåbær'],
    anti:  ['rødkål', 'grønkål', 'pastinak', 'selleri', 'porre'],
    style: 'Lette sommerretter: pastasalater, grillretter, kolde retter, friske tomatsaucer, hurtige sautéer.',
    avoid: '🚫 FORBUDT om sommeren: rødkålssuppe, tung kålgryde, kartoffelsuppe med porre, grønkålspasta som eneste slags grøntsagsret. Disse hører til i vinter/efterår.',
    examples: 'Pasta med friske tomater og basilikum, grillkylling med tomatsalsa, pandestegt laks med agurksalat, wok med courgette og bønner, kyllingesalat med mango',
  },
  efterår: {
    months: [9, 10, 11],
    label: 'Efterår',
    pro:   ['svampe', 'græskar', 'rødbeder', 'æbler', 'pærer', 'spidskål', 'porre', 'blomkål', 'broccoli'],
    anti:  [],
    style: 'Varme efterårsretter med svampe, rodfrugter og efterårsgrøntsager. Ovnretter og gryder passer perfekt.',
    avoid: 'Undgå lette kolde sommerretter som primær ret — sæsonen kalder på varme og fyldige smage.',
    examples: 'Svamperisotto, græskarsuppe, efterårsgryde med kyllingelår, ovnbagt blomkål, æblefyldt svinekotelet',
  },
};

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  return Object.values(SEASON_DATA).find(s => s.months.includes(m)) || SEASON_DATA.vinter;
}

function getSeasonalIngredients() {
  return getCurrentSeason().pro;
}

function getSeasonalHint() {
  const s = getCurrentSeason();
  const minRetter = s.label === 'Sommer' ? 3 : 2;
  const lines = [
    `• SÆSON: ${s.label.toUpperCase()} I DANMARK — OBLIGATORISK:`,
    `  Brug disse sæsonråvarer aktivt i mindst ${minRetter} retter: ${s.pro.join(', ')}`,
    `  Madstil om ${s.label.toLowerCase()}: ${s.style}`,
  ];
  if (s.avoid) lines.push(`  ${s.avoid}`);
  lines.push(`  Gode ${s.label.toLowerCase()}sretter: ${s.examples}`);
  return lines.join('\n');
}

// Sæson × tilbud — dobbeltgevinst: tilbudsvarer der OGSÅ er sæsonvarer
function getSeasonOffersCrossRef(shops) {
  const seasonPro = getSeasonalIngredients();
  const offerItems = realOffers?.grouped
    ? shops.flatMap(id => (realOffers.grouped[id] || []).map(o => ({ shop: id, heading: o.heading, price: o.price })))
    : [];
  const matches = offerItems.filter(o =>
    seasonPro.some(ing => o.heading.toLowerCase().includes(ing))
  ).slice(0, 6);
  if (!matches.length) return '';
  const shopName = id => STORE_OFFERS[id]?.name || id;
  return `• DOBBELT GEVINST — disse tilbud er OGSÅ sæsonvarer lige nu:\n` +
    matches.map(o =>
      `  ★ ${o.heading}${o.price != null ? ' (' + o.price + ' kr)' : ''} hos ${shopName(o.shop)}`
    ).join('\n') +
    '\n  → Disse bør indgå i mindst én ret da de er både billige og i sæson.';
}

function getWeekdayHint(numDays) {
  if (numDays < 5) return '';
  return `• UGEDAGSRYTME — tilpas sværhedsgrad til dagen:
  - Man–Tors: Enkle hverdagsretter (max 30–45 min tilberedning)
  - Fredag: Hyggeret — pizza, tacos, burger eller noget der markerer weekend
  - Lørdag: Mere tidskrævende eller festlig ret — steg, braiseret, noget særligt
  - Søndag: Klassisk søndagsret — ovnstegt, steg, eller familiens favorit`;
}

// ── SKELETON PLAN ─────────────────────────────────────────────────────────────
// ── HTML-escape af tekst fra AI/brugerinput (undgår brudt layout og injection) ──
function escHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ICON_SWAP  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h13l-3-3M20 17H7l3 3"/></svg>';
const ICON_HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';

// Børneopgave kan komme som tekst eller som objekt { task, instructions }
function kidsActivityText(k) {
  if (!k) return '';
  if (typeof k === 'string') return k;
  return [k.task, k.instructions].filter(Boolean).join(' – ');
}

// Toppen af madplanen: titel, nøgletal og ugens tema
function buildPlanTopHTML(plan) {
  let h = `
    <div class="plan-header">
      <div>
        <h1 class="plan-title">Din madplan</h1>
        ${plan.summary ? `<p class="plan-summary">${escHtml(plan.summary)}</p>` : ''}
      </div>
      <div class="plan-actions">
        <button class="action-btn" onclick="window.print()">Print</button>
        <button class="action-btn primary" onclick="showPage('indkob')">Indkøbsliste</button>
      </div>
    </div>`;
  const stats = [];
  if (plan.total_price)       stats.push(`<div class="plan-stat"><div class="plan-stat-label">Pris i alt</div><div class="plan-stat-value">${escHtml(plan.total_price)} kr</div></div>`);
  if (plan.savings)           stats.push(`<div class="plan-stat"><div class="plan-stat-label">Du sparer ca.</div><div class="plan-stat-value is-positive">${escHtml(plan.savings)} kr</div></div>`);
  if (plan.recommended_store) stats.push(`<div class="plan-stat"><div class="plan-stat-label">Bedste butik</div><div class="plan-stat-value is-text">${escHtml(plan.recommended_store)}</div></div>`);
  if (stats.length) h += `<div class="plan-stats">${stats.join('')}</div>`;
  if (plan._warnings?.length) {
    h += `<div class="plan-warnings" role="status">${plan._warnings.map(w => `<p>${escHtml(w)}</p>`).join('')}</div>`;
  }
  if (plan.weekly_theme) {
    h += `<div class="plan-theme"><span class="plan-theme-label">Ugens tema</span><span class="plan-theme-text">${escHtml(plan.weekly_theme)}</span></div>`;
  }
  return h;
}

function buildShoppingCtaHTML(plan) {
  const totalItems = (plan.shopping_list || []).reduce((s, st) => s + (st.items?.length || 0), 0);
  const storeCount = (plan.shopping_list || []).length;
  return `
    <div class="shopping-cta" role="button" tabindex="0" onclick="showPage('indkob')" onkeydown="if(event.key==='Enter')showPage('indkob')">
      <div class="shopping-cta-left">
        <div class="shopping-cta-icon">${icon('cart')}</div>
        <div>
          <div class="shopping-cta-title">Indkøbslisten er klar</div>
          <div class="shopping-cta-sub">${totalItems} varer i ${storeCount} butik${storeCount !== 1 ? 'ker' : ''}${plan.total_price ? ' · ca. ' + escHtml(plan.total_price) + ' kr' : ''}</div>
        </div>
      </div>
      <div class="shopping-cta-arrow">›</div>
    </div>`;
}

function renderSkeletonPlan(numDays) {
  const wrapper = document.getElementById('plan-output');
  wrapper.style.display = 'block';
  wrapper.innerHTML = `
    <div id="plan-meta-top"></div>
    <div id="plan-days-stream">
      ${Array.from({ length: numDays }, (_, i) => `
        <div class="day-card skel-card" id="skel-day-${i + 1}">
          <div class="day-card-photo-wrap skel-photo"></div>
          <div class="day-card-body" style="flex:1">
            <div class="skel-line" style="width:28%;height:13px"></div>
            <div class="skel-line" style="width:52%;height:19px;margin-top:7px"></div>
            <div class="skel-line" style="width:80%;height:12px;margin-top:18px"></div>
            <div class="skel-line" style="width:65%;height:12px;margin-top:8px"></div>
            <div class="skel-line" style="width:72%;height:12px;margin-top:8px"></div>
          </div>
        </div>`).join('')}
    </div>
    <div id="plan-meta-bot"></div>`;
}

// ── EXTRACT COMPLETE JSON OBJECTS FROM PARTIAL TEXT ───────────────────────────
function extractCompleteObjects(text) {
  const objects = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && text[i] !== '{') i++;
    if (i >= text.length) break;
    const start = i;
    let depth = 0, inStr = false, esc = false;
    while (i < text.length) {
      const c = text[i];
      if (esc)           { esc = false; }
      else if (c === '\\' && inStr) { esc = true; }
      else if (c === '"') { inStr = !inStr; }
      else if (!inStr) {
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { objects.push(text.slice(start, i + 1)); i++; break; } }
      }
      i++;
    }
    if (depth > 0) break; // incomplete — stop
  }
  return objects;
}

// ── BUILD SINGLE DAY CARD HTML ────────────────────────────────────────────────
function buildDayCardHTML(day, dayIdx) {
  let h = `
    <div class="day-card" id="real-day-${day.day}">
      <div class="day-card-photo-wrap photo-slot" id="photo-day-${day.day}">
        ${dishIllustration(mainMealOf(day)?.name || '', '', 'day-card-photo-placeholder')}
      </div>
      <div class="day-card-body">
        <div class="day-label">Dag ${day.day}</div>
        <div class="day-date">${escHtml(day.label || 'Dag ' + day.day)}</div>`;
  (day.meals || []).forEach((meal, mealIdx) => {
    const saleTag  = meal.on_sale  ? '<span class="badge badge-amber">Tilbud</span>' : '';
    const tags     = (meal.tags || []).map(t => `<span class="badge badge-green">${escHtml(t)}</span>`).join('');
    const storeTag = meal.store    ? `<span class="badge badge-gray">${escHtml(meal.store)}</span>` : '';
    const tipHtml  = meal.tip      ? `<div class="meal-note meal-note--tip"><strong>Tip:</strong> ${escHtml(meal.tip)}</div>` : '';
    const kidsTxt  = kidsActivityText(meal.kids_activity);
    const kidsHtml = kidsTxt       ? `<div class="meal-note meal-note--kids"><strong>Børnenes opgave:</strong> ${escHtml(kidsTxt)}</div>` : '';
    h += `
      <div class="meal-row">
        <div class="meal-type">${escHtml(meal.type)}</div>
        <div class="meal-price">${meal.price_per_person ? escHtml(meal.price_per_person) + ' kr<small> /pers.</small>' : ''}</div>
        <div class="meal-info">
          <div class="meal-name">${escHtml(meal.name)}</div>
          <div class="meal-detail">${escHtml(meal.description || '')}</div>
          <div class="meal-badges">${saleTag}${storeTag}${tags}</div>
          ${tipHtml}${kidsHtml}
        </div>
        <div class="meal-actions">
          <button class="save-meal-btn" onclick="saveMealToFavorites(${dayIdx},${mealIdx})" title="Gem til mine opskrifter" aria-label="Gem ret">${ICON_HEART}</button>
          <button class="swap-btn" onclick="swapMeal(${dayIdx},${mealIdx})">${ICON_SWAP}Udskift</button>
        </div>
      </div>`;
  });
  h += '</div></div>';
  return h;
}

// ── RENDER / REPLACE A SINGLE STREAMED DAY ────────────────────────────────────
function renderSingleDayCard(day, dayIdx) {
  const html = buildDayCardHTML(day, dayIdx);
  const skelEl = document.getElementById('skel-day-' + day.day);
  if (skelEl) {
    skelEl.outerHTML = html;
  } else {
    const container = document.getElementById('plan-days-stream');
    if (container) container.insertAdjacentHTML('beforeend', html);
  }
  document.getElementById('real-day-' + day.day)?.classList.add('is-arriving');
  showDayPhoto(day);
}

// ── TRY TO EXTRACT & RENDER STREAMED DAYS ─────────────────────────────────────
function tryRenderStreamedDays(streamText, collectedDays, renderedDayNums) {
  // Find where "plan": [ starts so we only look inside that array
  const planMatch = streamText.match(/"plan"\s*:\s*\[/);
  if (!planMatch) return;
  const afterPlan = streamText.slice(planMatch.index + planMatch[0].length);
  const objects = extractCompleteObjects(afterPlan);
  objects.forEach(objStr => {
    try {
      const obj = JSON.parse(objStr);
      if (typeof obj.day === 'number' && obj.meals && !renderedDayNums.has(obj.day)) {
        renderedDayNums.add(obj.day);
        collectedDays.push(obj);
        renderSingleDayCard(obj, collectedDays.length - 1);
      }
    } catch {}
  });
}

// ── FINALIZE PLAN UI AFTER STREAM COMPLETE ────────────────────────────────────
function finalizePlanUI(plan) {
  const metaTop = document.getElementById('plan-meta-top');
  if (metaTop) metaTop.innerHTML = buildPlanTopHTML(plan);
  const metaBot = document.getElementById('plan-meta-bot');
  if (metaBot) metaBot.innerHTML = buildShoppingCtaHTML(plan);
}

// ─── GENERATE PLAN ────────────────────────────────────────────────────────────

// ─── IKONER (ét sæt, samme stregtykkelse – erstatter emoji, der ser
//     forskellige ud på iPhone/Android) ─────────────────────────────────────────
const ICONS = {
  fish:    '<path d="M3 12c3-4.5 7-6 11-6 3 0 5.5 2 7 6-1.5 4-4 6-7 6-4 0-8-1.5-11-6z"/><path d="M3 12l-1.5-3M3 12l-1.5 3"/><circle cx="16.5" cy="10.5" r=".9" fill="currentColor"/>',
  pasta:   '<path d="M4 13h16a8 8 0 0 1-16 0z"/><path d="M8 13c0-4 2-6 4-6s3 1.5 3 3-1 2.5-2.5 2.5S10 11 10 9.5"/><path d="M17 4l-3 9"/>',
  soup:    '<path d="M3 11h18a9 7 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/><path d="M9 21h6"/>',
  leaf:    '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
  chicken: '<path d="M14.5 4.5a5 5 0 0 1 5 5c0 3-2.5 5.5-5.5 5.5-1 0-1.5.5-2 1l-3 3"/><path d="M14.5 4.5a5 5 0 0 0-5 5c0 1.5-.5 2-1 2.5L6 14.5"/><path d="M6 14.5l-1.8 1.8a1.6 1.6 0 1 0 2.3 2.3M9 19.5l-1.8 1.8a1.6 1.6 0 1 1-2.3-2.3"/>',
  meat:    '<path d="M4.5 11.5C4.5 7 8.5 4 13 4c4.5 0 7 3 7 6.5 0 5.5-5 9.5-10.5 9.5C6.5 20 4 18 4 15.5c0-1.6 1.6-2.4.5-4z"/><path d="M8 12.5c1.6-2.5 4.6-3.6 7.5-2.8"/><ellipse cx="14.5" cy="14.5" rx="1.8" ry="1.3"/>',
  bowl:    '<path d="M3 11h18a9 7.5 0 0 1-18 0z"/><path d="M7 11c.5-3 2.5-5 5-5s4.5 2 5 5"/><path d="M9 21h6"/>',
  sun:     '<circle cx="12" cy="13" r="4"/><path d="M12 4v2M5 7l1.4 1.4M19 7l-1.4 1.4M3 13h2M19 13h2M4 19h16"/>',
  cart:    '<path d="M3 4h2.5l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.3"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17.5" cy="19.5" r="1.3"/>',
  alert:   '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.5"/>',
  search:  '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  book:    '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19"/>',
  plate:   '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/>',
  copy:    '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  bag:     '<path d="M5 8h14l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
};
function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.plate}</svg>`;
}

// Rettens type ud fra navnet – bruges til illustrationen, når der ikke er et ægte foto
function dishKind(name = '', category = '') {
  const n = ' ' + name.toLowerCase() + ' ';
  if (/grød|yoghurt|müsli|havre|smoothie|røræg|pandekage|morgen/.test(n)) return 'sun';
  if (/suppe/.test(n)) return 'soup';
  if (category === 'fisk' || /laks|torsk|fisk|rejer|tun |sild|rødspætte|ørred|krabbe|sushi|rejer/.test(n)) return 'fish';
  if (category === 'pasta' || /pasta|spaghetti|lasagn|linguine|gnocchi|orzo|tortellini|ziti|penne|nudl|ramen/.test(n)) return 'pasta';
  if (category === 'vegetar' || /vegetar|vegan|linse|kikært|falafel|dahl|dhal|tofu|halloumi|grøntsag|blomkål|svampe/.test(n)) return 'leaf';
  if (/kylling|chicken|høns|kalkun|and /.test(n)) return 'chicken';
  if (category === 'kød' || category === 'klassisk' || /okse|svin|flæsk|bøf|frikadel|pølse|lam|kalv|mørbrad|kotelet|kød|steak/.test(n)) return 'meat';
  return 'bowl';
}
const DISH_KIND_LABEL = { sun: 'Morgenmad', soup: 'Suppe', fish: 'Fisk', pasta: 'Pasta', leaf: 'Grønt', chicken: 'Kylling', meat: 'Kød', bowl: 'Hverdagsmad' };

function dishIllustration(name, category, cls = '') {
  const kind = dishKind(name, category);
  return `<div class="dish-illu dish-illu--${kind} ${cls}" aria-hidden="true">${icon(kind)}<span>${DISH_KIND_LABEL[kind]}</span></div>`;
}

// Ægte foto (fra Wikipedia) – fader ind, når det er hentet; credit er påkrævet af licensen
function dishPhotoHTML(photo, alt, cls) {
  return `<img class="${cls} is-loading" src="${escHtml(photo.url)}" alt="${escHtml(alt)}" loading="lazy" decoding="async"
      onload="this.classList.remove('is-loading')" onerror="this.closest('.photo-slot')?.classList.add('photo-failed');this.remove()">
    <a class="photo-credit" href="${escHtml(photo.link || '#')}" target="_blank" rel="noopener noreferrer">${escHtml(photo.credit || 'Wikipedia')}</a>`;
}

// ─── AI-MODUL ─────────────────────────────────────────────────────────────────
// Modeller (proxy.php godkender kun disse)
const AI_MODEL_PLAN = 'claude-sonnet-5-5';   // madplan, udskiftning
const AI_MODEL_FAST = 'claude-haiku-5-5';    // korte opgaver: fremgangsmåde
const AI_MODEL_FALLBACK = 'claude-sonnet-4-6'; // bruges kun hvis første forsøg kommer tomt tilbage

// JSON-schema → API'et garanterer gyldig JSON (ingen "kunne ikke parse").
// Alle felter er required, så rækkefølgen holdes: dage streames først.
const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'name', 'dish_en', 'description', 'store', 'price_per_person', 'tags', 'on_sale', 'tip', 'kids_activity'],
  properties: {
    type:             { type: 'string', description: 'Morgenmad, Frokost, Aftensmad eller Snacks' },
    name:             { type: 'string' },
    dish_en:          { type: 'string', description: 'Rettens titel på engelsk Wikipedia, fx "Chicken tikka masala" eller "Frikadeller" – kun for kendte retter, ellers tom streng' },
    description:      { type: 'string', description: 'Én sætning: protein, tilbehør og sauce/grønt' },
    store:            { type: 'string', description: 'Butikken hvor hovedingredienserne købes' },
    price_per_person: { type: 'number', description: 'Råvarepris for retten delt med antal personer, i kr.' },
    tags:             { type: 'array', items: { type: 'string' }, description: '0-3 korte tags' },
    on_sale:          { type: 'boolean', description: 'true hvis hovedingrediensen er på tilbud' },
    tip:              { type: 'string', description: 'Konkret tip (rester, forberedelse) – ellers tom streng' },
    kids_activity:    { type: 'string', description: 'Barnets opgave hvis børn er slået til og det er aftensmad – ellers tom streng' },
  },
};

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['plan', 'shopping_list', 'total_price', 'savings', 'recommended_store', 'weekly_theme', 'summary'],
  properties: {
    plan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'label', 'meals'],
        properties: {
          day:   { type: 'integer' },
          label: { type: 'string' },
          meals: { type: 'array', items: MEAL_SCHEMA },
        },
      },
    },
    shopping_list: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['store', 'items'],
        properties: {
          store: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'amount', 'price', 'on_sale', 'used_in'],
              properties: {
                name:    { type: 'string', description: 'Vare inkl. pakningsstørrelse, fx "Hakket oksekød 8-12% 500 g"' },
                amount:  { type: 'string', description: 'Antal pakker/stk, fx "2 pk"' },
                price:   { type: 'number', description: 'Samlet pris for linjen i kr.' },
                on_sale: { type: 'boolean' },
                used_in: { type: 'string', description: 'Hvilke retter varen bruges i' },
              },
            },
          },
        },
      },
    },
    total_price:       { type: 'number', description: 'Summen af alle prices i shopping_list' },
    savings:           { type: 'number', description: 'Estimeret besparelse ift. normalpris, i kr.' },
    recommended_store: { type: 'string' },
    weekly_theme:      { type: 'string', description: 'Kort tema, maks 8 ord' },
    summary:           { type: 'string', description: '1-2 sætninger om ugen og de vigtigste tilbud' },
  },
};

// Faste regler → system-prompt med prompt caching (billigere og hurtigere ved gentagne kald).
const PLAN_SYSTEM_PROMPT = `Du er en dansk madplanlægger med en kokkes smag og en budgetrådgivers sans for tal. Du laver hverdagsmadplaner i stil med Bilkas ugentlige madplaner: realistiske, lækre retter, som en almindelig familie kan lave på en hverdag, bygget op omkring ugens tilbud.

## Kulinarisk sammenhæng
Hver ret er en kendt, komplet ret: protein + tilbehør + sauce/grønt, der naturligt hører sammen. Skriv retten, som den står i en dansk kogebog.
- Brug kun en tilbudsvare i en ret, hvor den er en autentisk ingrediens. Broccoli hører ikke til tikka masala eller bolognese; laks hører ikke til carbonara; kokosmælk hører ikke til frikadeller.
- Ét hovedprotein pr. ret. Ingen laks + kylling i samme ret.
- Tilbehør følger køkkenet: pasta til italiensk, ris/nudler til asiatisk og indisk, kartofler til dansk/nordisk, tortillas til mexicansk.
- Morgenmad er let (grød, yoghurt, brød, æg). Aftensmad er aldrig grød.

Gode eksempler: spaghetti bolognese med parmesan; citronkylling med ris og broccoli; kylling tikka masala med basmatiris og raita; ovnbagt laks med dild, kartofler og agurkesalat; stegt flæsk med persillesovs; tacos med oksekød, bønner og salsa; shakshuka med brød; ovnstegt hel kylling med rodfrugter; dahl med kokosmælk og naan; frikadeller med kartofler og brun sovs.

## Ugen som helhed
- Ingen ret gentages. Højst 1 pastaret og højst 2 retter med samme hovedprotein. Ikke samme protein to dage i træk.
- Variér køkken: overvejende dansk, plus italiensk, asiatisk, mexicansk eller mellemøstligt.
- Mindst én klassisk dansk hverdagsret (frikadeller, stegt flæsk, biksemad, tarteletter, boller i karry).
- Hverdage: retter på højst 30-40 minutter. Weekend må tage længere tid.
- Planlæg med pakkestørrelser: varer købes i hele pakker. Brug resten af en pakke (fløde, hakket kød, kål, krydderurter) i en senere ret, og nævn det i "tip". Det er den vigtigste måde at holde prisen nede på.
- Rester: en stor portion én dag kan blive til en ny ret senere (kylling → wraps). Nævn det i "tip".

## Frokost og madpakker
Hurtigt og gerne restebaseret: rugbrød med pålæg, wraps med gårsdagens kød, suppe, salat med protein.

## Priser
- Brug tilbudspriserne nøjagtigt. Brug realistiske danske normalpriser for resten, fx: løg 5 kr/stk, hvidløg 8 kr, parmesan 100 g 20 kr, fløde 20 kr, creme fraiche 15 kr, tomatpuré 10 kr, dåsebønner 12 kr, tortillas 18 kr, burgerboller 16 kr, ris 1 kg 15 kr, røde linser 20 kr, frosne ærter 15 kr, karrypasta 22 kr, rugbrød 25 kr, franskbrød 15 kr, yoghurt 18 kr, leverpostej 18 kr.
- Køb ikke varer, som brugeren har i basislageret.
- Indkøbslisten er det, brugeren faktisk køber: hele pakker, samlet pris pr. linje, grupperet pr. butik. total_price = summen af alle linjer.
- price_per_person = rettens råvareforbrug delt med antal personer (ikke hele pakkens pris).
- Et budget er et loft. Hold total_price under det, også hvis det betyder enklere retter.

## Hårde krav fra brugeren
Fravalgte ingredienser (allergi eller smag) må aldrig forekomme – heller ikke i sauce, tilbehør eller indkøbsliste. Kostpræferencer gælder hver eneste ret. Ingredienser, brugeren vil have med, skal med i mindst det ønskede antal retter.

## Sprog og felter
Skriv på dansk, kort og konkret, uden udråbstegn. "label" er ugedagen. "dish_en" er den nøjagtige titel på engelsk Wikipedia for kendte retter (bruges til at finde et billede af præcis den ret) – ellers en tom streng; gæt ikke. "tip" og "kids_activity" er tomme strenge, når de ikke er relevante.`;

// HTTP-fejl fra proxy → læsbar besked
async function aiErrorFromResponse(res) {
  const err = await res.json().catch(() => ({}));
  const msg = typeof err.error === 'string' ? err.error : err.error?.message;
  if (res.status === 401) return new Error('Du er blevet logget ud – log ind igen');
  if (res.status === 429) return new Error(msg || 'For mange forespørgsler – prøv igen senere');
  return new Error(msg || 'AI-fejl (' + res.status + ')');
}

function aiRequestBody({ model = AI_MODEL_PLAN, system, user, schema, max_tokens = 4000, stream = false }) {
  const body = { model, max_tokens, messages: [{ role: 'user', content: user }] };
  if (system) body.system = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
  if (schema) body.output_config = { format: { type: 'json_schema', schema } };
  if (stream) body.stream = true;
  return body;
}

// Ikke-streamet kald → parset JSON (med schema) eller tekst
async function callClaude(opts) {
  const res = await fetch('proxy.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiRequestBody(opts)),
  });
  if (!res.ok) throw await aiErrorFromResponse(res);
  const data = await res.json();
  if (data.type === 'error') throw new Error(data.error?.message || 'AI-fejl');
  if (data.stop_reason === 'refusal') throw new Error('AI\'en kunne ikke svare på denne forespørgsel');
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return opts.schema ? JSON.parse(text) : text;
}

// Streamet kald. Buffer linjer, så en "data:"-linje der deles over to
// netværkspakker ikke tabes (det gav før tilfældige parse-fejl).
async function streamClaude(opts, onText) {
  const res = await fetch('proxy.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiRequestBody({ ...opts, stream: true })),
  });
  if (!res.ok) throw await aiErrorFromResponse(res);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '', stopReason = null, events = 0, raw = '';

  const handleLine = (line) => {
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let ev;
    try { ev = JSON.parse(payload); } catch { return; }
    events++;
    if (ev.type === 'error') throw new Error(ev.error?.message || 'AI-fejl under generering');
    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
      text += ev.delta.text;
      onText?.(text);
    }
    if (ev.type === 'message_delta' && ev.delta?.stop_reason) stopReason = ev.delta.stop_reason;
  };

  while (true) {
    const { done, value } = await reader.read();
    const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
    if (raw.length < 400) raw += chunk;
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, nl).trim());
      buffer = buffer.slice(nl + 1);
    }
    if (done) { handleLine(buffer.trim()); break; }
  }

  if (stopReason === 'refusal') throw new Error('AI\'en kunne ikke lave denne madplan');
  if (stopReason === 'max_tokens') throw new Error('Madplanen blev for lang. Prøv med færre dage eller måltider.');
  if (!text) {
    // Beskriv hvad der faktisk skete, så fejlen kan findes
    if (!events) {
      const hint = raw.trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 140);
      const err = new Error('Serveren afbrød forbindelsen, før AI\'en svarede' + (hint ? ` (${hint})` : ''));
      err.retryable = true;
      throw err;
    }
    const err = new Error(`AI'en sendte intet indhold (${events} hændelser, stop: ${stopReason || 'ukendt'})`);
    err.retryable = true;
    throw err;
  }
  return { text, stopReason };
}

// ── Efterkontrol: tal regnes i koden, krav tjekkes ────────────────────────────
function normalizeWord(s) { return String(s || '').toLowerCase().trim(); }

function validatePlan(plan, settings) {
  const warnings = [];

  // Prisen = summen af indkøbslisten (AI'en er ikke god til at lægge sammen)
  const itemsTotal = (plan.shopping_list || [])
    .flatMap(s => s.items || [])
    .reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  if (itemsTotal > 0) plan.total_price = Math.round(itemsTotal);
  if (plan.savings && plan.total_price) plan.savings = Math.min(Math.round(plan.savings), plan.total_price);

  const budget = Number(settings.budget) || 0;
  if (budget && plan.total_price > budget) {
    warnings.push(`Indkøbet koster ca. ${plan.total_price - budget} kr mere end dit budget på ${budget} kr. Udskift en dyr ret for at komme ned.`);
  }

  const meals = (plan.plan || []).flatMap(d => (d.meals || []).map(m => ({ ...m, _day: d.label })));
  const mealText = m => normalizeWord(`${m.name} ${m.description}`);

  settings.prefs.filter(p => p.type === 'exclude').forEach(p => {
    const w = normalizeWord(p.ingredient);
    if (!w) return;
    const hits = meals.filter(m => mealText(m).includes(w)).map(m => m._day);
    const listHits = (plan.shopping_list || []).flatMap(s => s.items || []).filter(it => normalizeWord(it.name).includes(w));
    if (hits.length || listHits.length) {
      warnings.push(`"${p.ingredient}" skulle være fravalgt, men indgår${hits.length ? ' ' + [...new Set(hits)].join(', ') : ' på indkøbslisten'}. Udskift retten.`);
    }
  });

  settings.prefs.filter(p => p.type === 'include' && p.count).forEach(p => {
    const w = normalizeWord(p.ingredient);
    const n = meals.filter(m => mealText(m).includes(w)).length;
    if (n < Number(p.count)) warnings.push(`Du ønskede ${p.ingredient} i ${p.count} retter – planen har ${n}.`);
  });

  plan._warnings = warnings;
  return plan;
}

// ─── GENERATE PLAN (madplan) ─────────────────────────────────────────────────

async function generatePlan() {

  const settings = gatherSettings();

  if (!settings.shops.length) {
    showToast('Vælg mindst én butik først');
    return;
  }

  // Navigate to result page and show skeleton immediately
  showPage('result');
  document.getElementById('result-empty').style.display   = 'none';
  document.getElementById('result-loading').style.display = 'none';
  document.getElementById('plan-output').innerHTML        = '';

  // Show skeleton plan immediately
  renderSkeletonPlan(settings.days);

  // Loading bar while offers fetch
  let loadingEl = document.createElement('div');
  loadingEl.className = 'stream-loading-bar';
  loadingEl.textContent = 'Henter aktuelle tilbud…';
  const metaTopEl = document.getElementById('plan-meta-top');
  if (metaTopEl) metaTopEl.appendChild(loadingEl);

  // Build prompt
  const selectedShopNames = settings.shops.map(s => STORE_OFFERS[s]?.name || s);
  const recentMeals = getRecentMealNames();
  const catalogHint = getDishCatalogSuggestions(settings.shops);

  // Offers (fast from pre-fetch cache)
  realOffers = await fetchRealOffers(settings.shops);
  renderOffersRow();

  loadingEl.textContent = 'Genererer din madplan…';

  const scoredRecipes = scoreRecipesAgainstOffers(settings.shops, settings.dietTags);

  const includeRules = settings.prefs.filter(p => p.type === 'include')
    .map(p => `${p.ingredient}${p.count ? ' (mindst ' + p.count + ' retter i ugen)' : ''}`).join(', ');
  const excludeRules = settings.prefs.filter(p => p.type === 'exclude')
    .map(p => p.ingredient).join(', ');

  const optLabels = {
    cheap:    'Billigst muligt – følg tilbuddene på tværs af alle valgte butikker.',
    one:      'Alt i én butik – vælg den butik, hvor hele kurven samlet er billigst, og køb alt dér.',
    balanced: 'Balance – lav pris, men med tydelig variation i retterne.',
    quality:  'Kvalitet først – sæsonens og de bedste råvarer inden for budgettet.',
  };
  const dayNames = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag', 'Mandag (uge 2)', 'Tirsdag (uge 2)', 'Onsdag (uge 2)', 'Torsdag (uge 2)', 'Fredag (uge 2)', 'Lørdag (uge 2)', 'Søndag (uge 2)'];
  const lines = (arr) => arr.filter(Boolean).join('\n');

  const kidsBlock = settings.kids.enabled ? `
## Lav mad med børn
Barnet er ${settings.kids.age} år og kan hjælpe med: ${settings.kids.skills.join(', ')}.
Alle aftensretter får en "kids_activity": én alderssvarende opgave på højst 2 sætninger, med simple ord og konkrete handlinger.${settings.kids.age === '3-5' ? ' Ingen knive og ingen varme til denne alder.' : ''}${settings.kids.age === '14+' ? ' Barnet kan stå for et helt trin selv.' : ''}
Vælg gerne retter, hvor børn naturligt kan være med (tacos, pizza, frikadeller, wraps, salater).` : '';

  const recipeBlock = scoredRecipes.length ? `
## Forslag fra vores opskriftskartotek
Disse retter passer bedst til ugens tilbud. Brug mindst ${Math.min(Math.ceil(settings.days * 0.6), scoredRecipes.length)} af dem som aftensmad:
${scoredRecipes.slice(0, 8).map((r, i) => `${i + 1}. ${r.name} (tilbudsvarer der hører til: ${r.matched.join(', ')})`).join('\n')}` : catalogHint;

  const userPrompt = lines([
    `Lav en madplan ud fra disse ønsker.`,
    ``,
    `## Ønsker`,
    `- Dage: ${settings.days} (${dayNames.slice(0, settings.days).join(', ')})`,
    `- Personer: ${settings.persons}`,
    `- Måltider pr. dag: ${settings.mealTypes.join(', ') || 'Aftensmad'}`,
    `- Butikker (brug kun disse): ${selectedShopNames.join(', ')}`,
    `- Prioritet: ${optLabels[settings.optimizeMode]}`,
    settings.budget ? `- Budget: højst ${settings.budget} kr i alt` : `- Budget: intet fast loft – hold det fornuftigt`,
    settings.dietTags.length ? `- Kost (gælder alle retter): ${settings.dietTags.join(', ')}` : '',
    includeRules ? `- Skal med: ${includeRules}` : '',
    excludeRules ? `- MÅ IKKE forekomme (allergi/fravalg): ${excludeRules}` : '',
    settings.pantry.length ? `- Har allerede hjemme (køb ikke): ${settings.pantry.join(', ')}` : '',
    recentMeals.length ? `- Spist for nylig (undgå): ${recentMeals.slice(0, 14).join(', ')}` : '',
    getSeasonalHint(),
    getSeasonOffersCrossRef(settings.shops),
    getWeekdayHint(settings.days),
    kidsBlock,
    recipeBlock,
    ``,
    `## Ugens tilbud i ${selectedShopNames.join(', ')}`,
    getFilteredOffersText(settings.shops),
  ]);

  try {
    let firstText = true;
    const renderedDayNums = new Set();
    const collectedDays   = [];

    const planRequest = (model) => streamClaude({
      model,
      system: PLAN_SYSTEM_PROMPT,
      user: userPrompt,
      schema: PLAN_SCHEMA,
      max_tokens: Math.min(16000, 2500 + settings.days * settings.mealTypes.length * 650),
    }, (soFar) => {
      if (firstText) { loadingEl?.remove(); firstText = false; }
      tryRenderStreamedDays(soFar, collectedDays, renderedDayNums);
    });

    let text;
    try {
      ({ text } = await planRequest(AI_MODEL_PLAN));
    } catch (err) {
      // Tomt svar → ét automatisk forsøg med reservemodellen, før vi viser en fejl
      if (!err.retryable || !firstText) throw err;
      console.warn('[MadPlan] Tomt svar – prøver reservemodel:', err.message);
      ({ text } = await planRequest(AI_MODEL_FALLBACK));
    }

    const parsed = validatePlan(JSON.parse(text), settings);

    // Dage der ikke nåede at blive vist under streaming
    (parsed.plan || []).forEach((day, idx) => {
      if (!renderedDayNums.has(day.day)) renderSingleDayCard(day, idx);
    });

    currentPlan = parsed;
    finalizePlanUI(parsed);
    savePlanToHistory(parsed, settings);
    updateStats();

  } catch (e) {
    loadingEl?.remove();
    document.getElementById('plan-output').style.display = 'none';
    document.getElementById('result-empty').style.display = '';
    document.getElementById('result-empty').innerHTML = `
      <div class="empty-icon">${icon('alert')}</div>
      <div class="empty-text">Madplanen kunne ikke laves</div>
      <div class="empty-sub" style="color:var(--berry-600);margin-top:12px">${escHtml(e.message)}</div>
      <button onclick="generatePlan()" class="btn-primary" style="margin-top:1.25rem;max-width:220px">Prøv igen</button>
    `;
  }
}

// ─── RENDER PLAN ──────────────────────────────────────────────────────────────

function renderPlan(plan) {
  const wrapper = document.getElementById('plan-output');
  wrapper.style.display = 'block';
  let html = buildPlanTopHTML(plan);
  (plan.plan || []).forEach((day, dayIdx) => { html += buildDayCardHTML(day, dayIdx); });
  html += buildShoppingCtaHTML(plan);
  wrapper.innerHTML = html;
}

function toggleItem(id) {
  document.getElementById(id).classList.toggle('checked');
  document.getElementById('row_' + id).classList.toggle('done');
}

function exportShoppingList(plan) {
  if (!plan) return;
  let text = '🛒 INDKØBSLISTE — MadPlan\n';
  text += '━'.repeat(40) + '\n\n';

  (plan.shopping_list || []).forEach(store => {
    text += `📍 ${store.store.toUpperCase()}\n`;
    (store.items || []).forEach(item => {
      text += `  □ ${item.name} — ${item.amount || ''}${item.price ? '  (ca. ' + item.price + ' kr)' : ''}\n`;
    });
    text += '\n';
  });

  if (plan.total_price) text += `TOTAL: ~${plan.total_price} kr\n`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'indkoebsliste.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// Make accessible globally for inline onclick in renderPlan
window.currentPlan = null;
const _origRender = renderPlan;
window.renderPlan = (plan) => {
  window.currentPlan = plan;
  _origRender(plan);
};
window.exportShoppingList = exportShoppingList;

// ─── HISTORY ──────────────────────────────────────────────────────────────────

async function savePlanToHistory(plan, settings) {
  if (!currentUser) return;
  const entry = {
    id:      Date.now(),
    user:    currentUser.email,
    date:    new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' }),
    days:    settings.days,
    persons: settings.persons,
    shops:   settings.shops,
    total:   plan.total_price,
    savings: plan.savings,
    tags:    settings.dietTags,
    opt:     settings.optimizeMode,
    summary: plan.summary,
    plan:    plan,
  };
  // Opdater lokalt med det samme (optimistisk UI)
  history.unshift(entry);
  if (history.length > 50) history = history.slice(0, 50);
  localStorage.setItem('mp_history', JSON.stringify(history));
  updateDishCatalog(plan);

  // Gem asynkront på server
  try {
    await fetch('history.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        plan:    plan,
        shops:   settings.shops,
        days:    settings.days,
        persons: settings.persons,
        tags:    settings.dietTags,
        opt:     settings.optimizeMode,
        total:   plan.total_price,
        savings: plan.savings,
        summary: plan.summary,
      }),
    });
  } catch { /* Netværksfejl — lokal kopi er stadig gemt */ }
}

async function loadHistory() {
  // Indlæs lokal kopi med det samme (hurtig visning)
  history = JSON.parse(localStorage.getItem('mp_history') || '[]');

  // Prøv at hente fra server og merge
  try {
    const res = await fetch('history.php');
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data.plans) || !data.plans.length) return;

    // Konvertér server-format til app-format og merge med lokal historik
    const serverEntries = data.plans.map(p => ({
      id:      p.id,
      user:    currentUser.email,
      date:    new Date(p.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' }),
      days:    p.days,
      persons: p.persons,
      shops:   (p.shops || '').split(',').filter(Boolean),
      total:   p.total,
      savings: p.savings,
      tags:    (p.tags || '').split(',').filter(Boolean),
      opt:     p.opt,
      summary: p.summary,
      plan:    p.plan,
    }));

    // Server er kilde til sandhed — erstat lokal historik for denne bruger
    history = [
      ...serverEntries,
      ...history.filter(h => h.user !== currentUser.email), // historik fra andre brugere (delt enhed)
    ].slice(0, 50);
    localStorage.setItem('mp_history', JSON.stringify(history));
    renderHistory();
    updateStats();
  } catch { /* Netværksfejl — vis lokal historik */ }
}

function renderHistory() {
  const userHistory = history.filter(h => h.user === (currentUser?.email || ''));
  const container   = document.getElementById('history-list');

  if (!userHistory.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('book')}</div>
        <div class="empty-text">Ingen historik endnu</div>
        <div class="empty-sub">Dine madplaner gemmes automatisk her</div>
      </div>`;
    return;
  }

  const optLabels = {
    cheap:    '💰 Billigst muligt',
    one:      '🏪 Én butik',
    balanced: '⚖️ Balance',
    quality:  '⭐ Kvalitet',
  };

  container.innerHTML = userHistory.map(h => `
    <div class="history-card" onclick="loadHistoryPlan(${h.id})">
      <div class="history-meta">
        <div>
          <div class="history-title">${h.days}-dages madplan for ${h.persons} person${h.persons > 1 ? 'er' : ''}</div>
          <div class="history-stat">
            ${h.days} dage · ${h.persons} pers.
            ${h.total ? ' · ' + h.total + ' kr' : ''}
            ${h.savings ? ' · sparet ~' + h.savings + ' kr' : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div class="history-date">${h.date}</div>
          ${h.opt ? `<div style="font-size:11px;color:var(--light);margin-top:3px">${optLabels[h.opt] || ''}</div>` : ''}
        </div>
      </div>
      ${h.summary ? `<div style="font-size:13px;color:var(--muted);margin-top:8px;line-height:1.4">${h.summary}</div>` : ''}
      <div class="history-tags">
        ${(h.tags || []).map(t => `<span class="tag" style="font-size:11px;padding:4px 10px">${t}</span>`).join('')}
        ${(h.shops || []).map(s => `<span class="badge badge-gray" style="font-size:11px;padding:3px 10px">${s}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function loadHistoryPlan(id) {
  const entry = history.find(h => h.id === id);
  if (!entry) return;
  currentPlan = entry.plan;
  showPage('result');
}

function updateStats() {
  if (!currentUser) return;
  const userHistory = history.filter(h => h.user === currentUser.email);
  const totalMeals  = userHistory.reduce((s, h) => {
    return s + (h.plan?.plan?.reduce((a, d) => a + (d.meals?.length || 0), 0) || 0);
  }, 0);
  const totalSaved = userHistory.reduce((s, h) => s + (h.savings || 0), 0);

  document.getElementById('stat-plans').textContent = userHistory.length;
  document.getElementById('stat-meals').textContent = totalMeals;
  document.getElementById('stat-saved').textContent = totalSaved ? totalSaved + ' kr' : '—';
}

// ─── OFFERS ROW ──────────────────────────────────────────────────────────────

function renderOffersRow() {
  const container = document.getElementById('offers-row');
  if (!container) return;
  const selected = [...document.querySelectorAll('.shop-card.selected')].map(s => s.dataset.shop);

  if (realOffers?.grouped) {
    const chips = selected.flatMap(id => {
      const store = STORE_OFFERS[id];
      return (realOffers.grouped[id] || []).slice(0, 5).map(o => {
        const price = o.price !== null ? ` ${o.price} kr${o.quantity ? '/' + o.quantity : ''}` : '';
        return `<span class="offer-chip ${store?.color || 'gray'}">${store?.name || id}: ${o.heading}${price}</span>`;
      });
    });
    container.innerHTML = chips.length
      ? chips.join('')
      : '<span style="font-size:13px;color:var(--faint);font-style:italic">Ingen aktuelle tilbud fundet — bruger standarddata</span>';
    return;
  }

  // Fallback: statiske data
  const chips = selected.flatMap(id => {
    const store = STORE_OFFERS[id];
    if (!store) return [];
    return store.chips.map(c => `<span class="offer-chip ${store.color}">${store.name}: ${c}</span>`);
  });
  container.innerHTML = chips.length
    ? chips.join('')
    : '<span style="font-size:13px;color:var(--faint)">Vælg butikker for at se aktuelle tilbud</span>';
}

function getFilteredOffersText(shops) {
  if (realOffers?.grouped) {
    const lines = shops.map(id => {
      const store = STORE_OFFERS[id];
      const items = (realOffers.grouped[id] || []).slice(0, 15);
      if (!items.length) return '';
      const header = `${store?.name || id} tilbud (aktuelle — hentet live):`;
      const body = items.map(o => {
        const price = o.price !== null ? `: ${o.price} kr${o.quantity ? '/' + o.quantity : ''}` : '';
        return `- ${o.heading}${price} ★`;
      }).join('\n');
      return header + '\n' + body;
    }).filter(Boolean);
    return lines.length ? lines.join('\n\n') : 'Ingen tilbud tilgængelige for valgte butikker.';
  }
  // Fallback: statiske simulerede data
  if (!shops.length) return 'Ingen butikker valgt.';
  return shops.map(id => {
    const s = STORE_OFFERS[id];
    if (!s) return '';
    return `${s.name} tilbud (simulerede):\n${s.items.map(i => '- ' + i).join('\n')}`;
  }).filter(Boolean).join('\n\n');
}

// ─── REAL OFFERS (ShopGun API) ───────────────────────────────────────────────

async function fetchRealOffers(shops) {
  if (!shops.length) return null;
  const cacheKey = 'mp_offers_' + [...shops].sort().join(',');
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 30 * 60 * 1000) return data; // 30 min
    }
  } catch { /* ignore parse errors */ }

  try {
    const res = await fetch('offers.php?shops=' + shops.join(','));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) {
      console.warn('[MadPlan] Tilbuds-API fejl:', data.error, data.message || '');
      return null;
    }
    sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
    return data;
  } catch (e) {
    console.warn('[MadPlan] Kunne ikke hente tilbud:', e.message);
    return null;
  }
}

// ─── VARIATION — RECENT MEALS ─────────────────────────────────────────────────

function getRecentMealNames() {
  if (!currentUser) return [];
  const names = new Set();
  history
    .filter(h => h.user === currentUser.email)
    .slice(0, 3)
    .forEach(entry => {
      (entry.plan?.plan || []).forEach(day => {
        (day.meals || []).forEach(meal => { if (meal.name) names.add(meal.name); });
      });
    });
  return [...names];
}

// ─── DISH CATALOG (feature 4) ─────────────────────────────────────────────────

function updateDishCatalog(plan) {
  let catalog = JSON.parse(localStorage.getItem('mp_dish_catalog') || '[]');
  const now = Date.now();
  (plan.plan || []).forEach(day => {
    (day.meals || []).forEach(meal => {
      if (!meal.name) return;
      const idx = catalog.findIndex(c => c.name.toLowerCase() === meal.name.toLowerCase());
      if (idx >= 0) {
        catalog[idx].useCount++;
        catalog[idx].lastUsed = now;
        if (meal.store) catalog[idx].store = meal.store;
      } else {
        catalog.push({
          name: meal.name,
          description: meal.description || '',
          store: meal.store || '',
          tags: meal.tags || [],
          useCount: 1,
          lastUsed: now,
        });
      }
    });
  });
  catalog.sort((a, b) => b.useCount - a.useCount || b.lastUsed - a.lastUsed);
  localStorage.setItem('mp_dish_catalog', JSON.stringify(catalog.slice(0, 150)));
}

function getDishCatalogSuggestions(shops) {
  const catalog = JSON.parse(localStorage.getItem('mp_dish_catalog') || '[]');
  if (!catalog.length) return '';
  const keywords = shops.flatMap(id =>
    (STORE_OFFERS[id]?.items || []).map(i => i.split(':')[0].split(' ')[0].toLowerCase())
  ).filter(kw => kw.length > 3);

  const matches = catalog.filter(d => {
    const text = (d.name + ' ' + d.description).toLowerCase();
    return keywords.some(kw => text.includes(kw));
  }).slice(0, 4);

  if (!matches.length) return '';
  return `════════════════════════════════════
DIT KARTOTEK — TIDLIGERE RETTER DER MATCHER AKTUELLE TILBUD
════════════════════════════════════

Disse retter fra din historik bruger råvarer der er på tilbud nu. Overvej at inkludere én:
${matches.map(m => `• ${m.name}${m.useCount > 1 ? ' (brugt ' + m.useCount + 'x)' : ''}: ${m.description}`).join('\n')}

`;
}

// ─── MEAL SWAP (feature 3 + 6) ────────────────────────────────────────────────

async function swapMeal(dayIdx, mealIdx) {
  if (!currentPlan) return;
  const day  = currentPlan.plan[dayIdx];
  const meal = day.meals[mealIdx];
  swapContext = { dayIdx, mealIdx };

  document.getElementById('swap-modal').style.display = 'flex';
  document.getElementById('swap-loading').style.display = 'block';
  document.getElementById('swap-alts').style.display   = 'none';
  document.getElementById('swap-context').textContent   = `${day.label}: ${meal.type} — ${meal.name}`;

  const settings    = gatherSettings();
  const shopNames   = settings.shops.map(id => STORE_OFFERS[id]?.name || id).join(', ');
  const offersText  = getFilteredOffersText(settings.shops);
  const dietStr     = settings.dietTags.length ? settings.dietTags.join(', ') : 'ingen';
  const budgetNote  = meal.price_per_person ? `ca. ${meal.price_per_person} kr/person` : 'tilpas budgettet';
  const excludeList = settings.prefs.filter(p => p.type === 'exclude').map(p => p.ingredient).join(', ');

  const prompt = `Du er madplanekspert. Ret der skal udskiftes: "${meal.name}" (${meal.type}, ${day.label}).

Krav til de 3 alternativer:
• Brug KUN produkter fra: ${shopNames}
• Budgetniveau: ${budgetNote}
• Kostpræferencer: ${dietStr}
• MINDST ÉT forslag SKAL være vegetarisk (mærk med "vegetarian": true)
• Alle retter skal være kulinarisk korrekte og komplette (protein + tilbehør + sauce)
• Brug aktuelle tilbud når muligt
• Alternativerne skal være FORSKELLIGE fra hinanden og fra originalretten
• Ugens øvrige retter (gentag dem ikke): ${currentPlan.plan.flatMap(d => d.meals.map(m => m.name)).filter(n => n !== meal.name).join(', ')}

Aktuelle tilbud (kun valgte butikker):
${offersText}`;

  try {
    const altSchema = {
      type: 'object', additionalProperties: false, required: ['alternatives'],
      properties: { alternatives: { type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'description', 'store', 'price_per_person', 'tags', 'on_sale', 'vegetarian'],
        properties: {
          name: { type: 'string' }, description: { type: 'string' }, store: { type: 'string' },
          price_per_person: { type: 'number' }, tags: { type: 'array', items: { type: 'string' } },
          on_sale: { type: 'boolean' }, vegetarian: { type: 'boolean' },
        },
      } } },
    };
    const parsed = await callClaude({
      model: AI_MODEL_PLAN,
      system: PLAN_SYSTEM_PROMPT,           // samme cachede regler som madplanen
      user: prompt + (excludeList ? `\n• MÅ IKKE indeholde: ${excludeList}` : ''),
      schema: altSchema,
      max_tokens: 1500,
    });
    renderAlternatives((parsed.alternatives || []).slice(0, 3));
  } catch (e) {
    document.getElementById('swap-loading').innerHTML =
      `<div class="empty-state" style="padding:1.5rem 0"><div class="empty-icon">${icon('alert')}</div><div class="empty-sub" style="color:var(--berry-600)">${escHtml(e.message)}</div><button class="btn-ghost" style="margin-top:1rem" onclick="closeSwapModal()">Luk</button></div>`;
  }
}

function renderAlternatives(alts) {
  document.getElementById('swap-loading').style.display = 'none';
  swapAlts = alts;
  const container = document.getElementById('swap-alts');
  container.style.display = 'block';
  container.innerHTML = alts.map((alt, i) => `
    <div class="alt-card" onclick="applyAlternative(${i})">
      <div class="alt-card-name">${alt.name}</div>
      <div class="alt-card-desc">${alt.description || ''}</div>
      <div class="alt-card-meta">
        ${alt.price_per_person ? `<span class="alt-card-price">${alt.price_per_person} kr/p</span>` : ''}
        ${alt.on_sale      ? '<span class="badge badge-amber">🏷️ Tilbud</span>' : ''}
        ${alt.vegetarian   ? '<span class="badge badge-veg">🥬 Vegetarisk</span>' : ''}
        ${alt.store        ? `<span class="badge badge-gray">${alt.store}</span>` : ''}
        ${(alt.tags || []).map(t => `<span class="badge badge-green">${t}</span>`).join('')}
      </div>
    </div>`).join('');
}

function applyAlternative(altIdx) {
  if (!swapContext || !swapAlts) return;
  const { dayIdx, mealIdx } = swapContext;
  const mealType = currentPlan.plan[dayIdx].meals[mealIdx].type;
  currentPlan.plan[dayIdx].meals[mealIdx] = { ...swapAlts[altIdx], type: mealType };
  validatePlan(currentPlan, gatherSettings());   // opdatér advarsler efter udskiftning
  closeSwapModal();
  renderPlan(currentPlan);
  showToast('Retten er udskiftet – tjek indkøbslisten');
}

function closeSwapModal() {
  document.getElementById('swap-modal').style.display = 'none';
  swapContext = null;
  swapAlts    = null;
  document.getElementById('swap-loading').innerHTML = `
    <div class="spinner"></div>
    <div class="loading-text">Finder alternativer...</div>
    <div class="loading-sub">Henter 3 forslag der passer til dit budget og dine butikker</div>`;
}

// ─── MADPAKKER (feature 5) ────────────────────────────────────────────────────

function adjustLunchDays(d) {
  lunchDays = Math.max(1, Math.min(7, lunchDays + d));
  document.getElementById('lunch-days-val').textContent = lunchDays;
}

function adjustLunchPersons(d) {
  lunchPersons = Math.max(1, Math.min(20, lunchPersons + d));
  document.getElementById('lunch-persons-val').textContent = lunchPersons;
}

async function generateLunchPlan() {
  const settings = gatherSettings();
  if (!settings.shops.length) { showToast('Vælg mindst én butik på Plan-siden'); return; }

  const genBtn  = document.getElementById('lunch-gen-btn');
  const loading = document.getElementById('lunch-loading');
  const empty   = document.getElementById('lunch-empty');
  const output  = document.getElementById('lunch-output');

  empty.style.display   = 'none';
  loading.style.display = 'block';
  output.style.display  = 'none';
  genBtn.disabled       = true;

  const shopNames  = settings.shops.map(id => STORE_OFFERS[id]?.name || id);
  realOffers = await fetchRealOffers(settings.shops);
  renderOffersRow();
  const offersText = getFilteredOffersText(settings.shops);
  const dietStr    = settings.dietTags.length ? settings.dietTags.join(', ') : '';
  const budgetVal  = document.getElementById('lunch-budget').value;
  const hasKids    = document.getElementById('lunch-has-kids').checked;
  const hasAdults  = document.getElementById('lunch-has-adults').checked;
  const dayNames   = ['Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag','Søndag'];
  const boxTypes   = [...(hasKids ? ['Børnemadpakke'] : []), ...(hasAdults ? ['Voksenmadpakke'] : [])];
  if (!boxTypes.length) boxTypes.push('Madpakke');

  const prompt = `Du er Danmarks bedste madpakkeekspert. Lav varierede, sunde og budgetvenlige madpakker til hele ugen.

PARAMETRE:
• Antal dage: ${lunchDays} (${dayNames.slice(0, lunchDays).join(', ')})
• Antal personer: ${lunchPersons}
• Madpakketyper: ${boxTypes.join(' + ')}
• Brug KUN produkter fra: ${shopNames.join(', ')}
${dietStr ? '• Kostpræferencer: ' + dietStr : ''}
${budgetVal ? '• Max budget: ' + budgetVal + ' kr for alle madpakker i ugen' : ''}

FOKUS:
• Brug rugbrød eller franskbrød som base – variér mellem dem
• Pålæg: leverpostej, makrel, ost, skinke, tun, æg, hummus – variér dagligt
• Grøntsager: gulerødder, agurk, tomat, radiser, peberfrugt
• Frugt: æble, pære, banan, appelsin (sæsonbaseret)
• Snacks: yoghurt, kærnemælk, nødder, kiks, müslibar
• Wraps eller sandwich som variation 2 gange ugen
• Drikkevarer: vand, mælk, 100% juice
${hasKids ? '• Børnemadpakker: enkle, farverige og lette at spise. Ingen stærkt krydret mad.' : ''}
• Variationsregel: Ikke samme pålæg to dage i træk

AKTUELLE TILBUD (brug disse prioriteret):
${offersText}

OUTPUT – KUN JSON, INTET ANDET:

{
  "lunchplan": [
    {
      "day": 1,
      "label": "Mandag",
      "boxes": [
        {
          "label": "Børnemadpakke",
          "items": ["2 stk rugbrød med smør og leverpostej og agurk", "Gulerodsstave", "Æble", "Yoplait frugt"],
          "store": "Netto",
          "price": 22,
          "tip": "Pak det i en sjov boks"
        }
      ]
    }
  ],
  "shopping_list": [
    {
      "store": "Netto",
      "items": [
        {"name": "Rugbrød 500g", "amount": "2 pakker", "price": 50, "on_sale": false}
      ]
    }
  ],
  "total_price": 380,
  "savings": 55,
  "summary": "En varieret uges madpakker..."
}`;

  try {
    const res  = await fetch('proxy.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: AI_MODEL_PLAN, max_tokens: 6000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || 'API-fejl: ' + res.status); }
    const data = await res.json();
    let text   = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    const m    = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : text);
    loading.style.display = 'none';
    renderLunchPlan(parsed);
  } catch (e) {
    loading.style.display = 'none';
    empty.style.display   = 'block';
    empty.innerHTML = `<div class="empty-icon">${icon('alert')}</div><div class="empty-text">Noget gik galt</div><div class="empty-sub" style="color:var(--berry-600)">${e.message}</div>`;
  } finally {
    genBtn.disabled = false;
  }
}

function renderLunchPlan(plan) {
  const container = document.getElementById('lunch-output');
  container.style.display = 'block';
  const storeColors = { 'Netto': 'amber', 'Rema 1000': 'coral', 'Lidl': 'teal', '365discount': 'green' };

  let html = '';

  if (plan.total_price || plan.savings) {
    html += `<div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">`;
    if (plan.total_price) html += `<div class="total-bar" style="flex:1;min-width:140px"><div class="total-label">Estimeret total</div><div class="total-amount">${plan.total_price} kr</div></div>`;
    if (plan.savings)     html += `<div class="total-bar" style="flex:1;min-width:140px;background:var(--fjord-50);border-color:var(--fjord-100)"><div class="total-label" style="color:var(--fjord-800)">Estimeret besparelse</div><div class="total-amount" style="color:var(--fjord-800)">${plan.savings} kr</div></div>`;
    html += '</div>';
  }

  if (plan.summary) html += `<div style="font-size:13px;color:var(--muted);margin-bottom:1.5rem;line-height:1.5">${plan.summary}</div>`;

  (plan.lunchplan || []).forEach(day => {
    html += `<div class="lunch-day-card"><div class="day-label">Dag ${day.day}</div><div class="day-date">${day.label}</div>`;
    (day.boxes || []).forEach(box => {
      html += `<div class="lunch-box">
        <div class="lunch-box-type">${box.label}${box.store ? ' · ' + box.store : ''}</div>
        <ul class="lunch-items">${(box.items || []).map(i => `<li class="lunch-item">${i}</li>`).join('')}</ul>
        ${box.price ? `<div class="lunch-price">${box.price} kr</div>` : ''}
        ${box.tip   ? `<div class="lunch-tip">💡 ${box.tip}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  });

  if ((plan.shopping_list || []).length) {
    html += `<div class="shop-list"><div class="shop-list-header"><div class="shop-list-title">🛒 Indkøbsliste</div></div>`;
    (plan.shopping_list || []).forEach(store => {
      const col   = storeColors[store.store] || 'gray';
      const total = (store.items || []).reduce((s, i) => s + (i.price || 0), 0);
      html += `<div class="shop-section"><div class="shop-section-name">${store.store} <span class="shop-section-badge badge badge-${col}">${(store.items||[]).length} varer</span>${total ? `<span style="margin-left:auto;font-size:13px;color:var(--accent)">${total} kr</span>` : ''}</div>`;
      (store.items || []).forEach((item, i) => {
        const id = 'lc_' + store.store.replace(/\s/g,'') + '_' + i;
        html += `<div class="shop-item" id="row_${id}"><div class="shop-cb" id="${id}" onclick="toggleItem('${id}')"></div><div class="shop-item-name">${item.name}${item.on_sale ? ' <span class="badge badge-amber" style="font-size:10px">Tilbud</span>' : ''}</div><div class="shop-item-amount">${item.amount||''}</div><div class="shop-item-price">${item.price ? item.price + ' kr' : ''}</div></div>`;
      });
      html += '</div>';
    });
    if (plan.total_price) html += `<div class="total-bar"><div class="total-label">Estimeret total</div><div class="total-amount">${plan.total_price} kr</div></div>`;
    html += '</div>';
  }

  container.innerHTML = html;
}

// ─── RECIPE SCORING ──────────────────────────────────────────────────────────

function scoreRecipesAgainstOffers(shops, dietTags = []) {
  let offerText = '';
  if (realOffers?.grouped) {
    offerText = shops.flatMap(id =>
      (realOffers.grouped[id] || []).map(o => o.heading.toLowerCase())
    ).join(' ');
  } else {
    offerText = shops.flatMap(id =>
      (STORE_OFFERS[id]?.items || []).map(i => i.toLowerCase())
    ).join(' ');
  }
  if (!offerText) return [];

  // Map UI diet labels → dietary array keys
  const dietMap = {
    'Vegetarisk': 'vegetarisk',
    'Vegansk':    'vegansk',
    'Glutenfrit': 'glutenfri',
    'Laktosefri': 'laktosefri',
  };
  const requiredDiets = dietTags
    .map(t => Object.entries(dietMap).find(([k]) => t.includes(k))?.[1])
    .filter(Boolean);

  let pool = RECIPES;
  if (requiredDiets.length) {
    pool = pool.filter(r => requiredDiets.every(d => (r.dietary || []).includes(d)));
  }

  // Sæsonboost: opskrifter med sæsonråvarer rykker op
  const seasonalIngs = getSeasonalIngredients();
  const season = getCurrentSeason();

  return pool
    .map(r => {
      const matched = r.ingredients.filter(ing => offerText.includes(ing.toLowerCase()));
      if (!matched.length) return null; // ingen tilbudsmatch → altid ekskluder
      // Sæsonboost: +0.5 pr. sæsonvare i ingredienslisten
      const recipeText = (r.name + ' ' + r.ingredients.join(' ')).toLowerCase();
      const seasonBoost = seasonalIngs.filter(ing => recipeText.includes(ing)).length * 0.5;
      // Anti-sæson straf: rykker NED i ranking men kasseres ikke (har stadig tilbudsmatch)
      const antiPenalty = season.anti.some(ing => recipeText.includes(ing)) ? -1.5 : 0;
      return { ...r, score: matched.length + seasonBoost + antiPenalty, matched };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

// ─── FOOD PHOTOS ──────────────────────────────────────────────────────────────

// Hovedretten for en dag (aftensmad, ellers første måltid)
function mainMealOf(day) {
  return (day?.meals || []).find(m => m.type === 'Aftensmad') || (day?.meals || [])[0] || null;
}

// Billede til en ret: Wikipedia via photo.php. Samme ret → samme billede (cachet).
async function fetchMealPhoto(mealName, dishEn = '') {
  const key = 'mp_photo5_' + (mealName + '|' + dishEn).toLowerCase().replace(/[^a-z0-9æøå|]/g, '_').slice(0, 90);
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      const ttl = data?.url ? 30 : 3; // dage: fundet / ikke fundet
      if (Date.now() - ts < ttl * 86400000) return data;
    }
  } catch { /* ignore */ }
  try {
    const qs = new URLSearchParams({ dish: mealName });
    if (dishEn) qs.set('en', dishEn);
    const res = await fetch('photo.php?' + qs);
    if (!res.ok) return null;
    const data = await res.json();
    try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { /* fuld storage */ }
    return data;
  } catch {
    return null;
  }
}

function showDayPhoto(day) {
  const meal = mainMealOf(day);
  if (!meal) return Promise.resolve();
  return fetchMealPhoto(meal.name, meal.dish_en).then(photo => {
    const slot = document.getElementById('photo-day-' + day.day);
    if (!slot || !photo?.url) return;
    slot.insertAdjacentHTML('beforeend', dishPhotoHTML(photo, meal.name, 'day-card-photo'));
  });
}

async function loadPlanPhotos() {
  if (!currentPlan?.plan) return;
  await Promise.all(currentPlan.plan.map(showDayPhoto));
}

// ─── RECIPE CATALOG ───────────────────────────────────────────────────────────

let activeRecipeCategory = null;
let recipeSearchQuery = '';
let rdPersons = 4;
let rdCurrentName = '';
let rdBaseIngredients = [];

function renderRecipeCatalog() {
  const searchInput = document.getElementById('recipe-search');
  if (searchInput && !searchInput._bound) {
    searchInput._bound = true;
    searchInput.addEventListener('input', e => {
      recipeSearchQuery = e.target.value.trim().toLowerCase();
      renderSavedRecipesSection();
      renderRecipeGrid();
    });
  }
  renderSavedRecipesSection();
  renderRecipeCategoryFilter();
  renderRecipeGrid();
}

function renderSavedRecipesSection() {
  const container = document.getElementById('saved-recipes-section');
  if (!container) return;
  const saved = getSavedMeals();
  const q = recipeSearchQuery;
  const filtered = q ? saved.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) : saved;

  if (!filtered.length) { container.innerHTML = ''; return; }

  container.innerHTML = `
    <div class="saved-section-label">Mine gemte retter</div>
    <div class="recipe-grid">${filtered.map(m => `
      <div class="recipe-card saved-recipe-card" onclick="showRecipeDetail(null,'${m.name.replace(/'/g,"\\'")}')">
        ${recipePhotoHtml(RECIPES.find(r=>r.name===m.name) || { name: m.name })}
        <div class="recipe-card-body">
          <div class="recipe-card-name">${escHtml(m.name)}</div>
          ${m.description ? `<div class="recipe-card-meta">${m.description.slice(0, 60)}${m.description.length > 60 ? '…' : ''}</div>` : ''}
        </div>
        <button class="delete-saved-btn" onclick="event.stopPropagation();deleteSavedMeal('${m.id}')" title="Fjern">×</button>
      </div>`).join('')}
    </div>`;
  observeRecipePhotos(document.getElementById('saved-recipes-section') || document);
}

function renderRecipeCategoryFilter() {
  const filterRow = document.getElementById('cat-filter-row');
  if (!filterRow) return;
  const categories = [...new Set(RECIPES.map(r => r.category))];
  filterRow.innerHTML =
    `<button class="cat-chip${activeRecipeCategory === null ? ' active' : ''}" onclick="filterRecipes(null)">Alle</button>` +
    categories.map(cat =>
      `<button class="cat-chip${activeRecipeCategory === cat ? ' active' : ''}" onclick="filterRecipes('${cat}')">${catDanish(cat)}</button>`
    ).join('');
}

function renderRecipeGrid() {
  const container = document.getElementById('recipes-grid');
  if (!container) return;
  let filtered = activeRecipeCategory ? RECIPES.filter(r => r.category === activeRecipeCategory) : RECIPES;
  if (recipeSearchQuery) {
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(recipeSearchQuery) ||
      r.tags.some(t => t.toLowerCase().includes(recipeSearchQuery)) ||
      (r.ingredients || []).some(i => i.toLowerCase().includes(recipeSearchQuery))
    );
  }
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state" style="padding:2.5rem 0">
      <div class="empty-icon">${icon('search')}</div>
      <div class="empty-text">Ingen resultater for "${recipeSearchQuery}"</div>
      <div class="empty-sub">Prøv et andet ord — f.eks. en ingrediens eller kategori</div>
    </div>`;
    return;
  }
  container.innerHTML = `<div class="recipe-grid">${filtered.map(r => `
    <div class="recipe-card" onclick="showRecipeDetail('${r.id}')">
      ${recipePhotoHtml(r)}
      <div class="recipe-card-body">
        <div class="recipe-card-name">${r.name}</div>
        <div class="recipe-card-tags">${r.tags.slice(0, 2).map(t => `<span class="cat-chip">${t}</span>`).join('')}</div>
      </div>
      <div class="recipe-card-arrow">›</div>
    </div>`).join('')}</div>`;
  observeRecipePhotos(container);
}

function filterRecipes(category) {
  activeRecipeCategory = category;
  renderRecipeCategoryFilter();
  renderRecipeGrid();
}

function showRecipeDetail(recipeId, overrideName = null) {
  const r = recipeId ? RECIPES.find(rec => rec.id === recipeId) : null;
  const name = overrideName || r?.name || '';
  if (!name) return;

  rdCurrentName = name;
  rdPersons = persons; // sync with global setting

  document.getElementById('rd-name').textContent = name;
  document.getElementById('rd-category').innerHTML = r
    ? `${icon(dishKind('', r.category))} <span>${catDanish(r.category)}</span>`
    : '🍽️ <span>Ret</span>';

  // Tags: dietary first, then regular tags
  const dietLabels = { vegetarisk: '🌿 Vegetarisk', vegansk: '🌱 Vegansk', glutenfri: '🌾 Glutenfri', laktosefri: '🥛 Laktosefri' };
  const dietChips = (r?.dietary || []).map(d => `<span class="cat-chip" style="background:var(--green-50);color:var(--primary)">${dietLabels[d] || d}</span>`);
  const tagChips = (r?.tags || []).slice(0, 3).map(t => `<span class="cat-chip">${t}</span>`);
  document.getElementById('rd-tags').innerHTML = [...dietChips, ...tagChips].join('');

  // Persons row
  document.getElementById('rd-persons-val').textContent = rdPersons;
  updateRdScaleNote();

  // Ingredients — store originals, render scaled
  rdBaseIngredients = r?.ingredients || [];
  renderRdIngredients();

  // Steps — show spinner, then load
  document.getElementById('rd-steps').innerHTML = '<div class="rd-steps-loading">Henter fremgangsmåde…</div>';
  document.getElementById('recipe-detail-modal').style.display = 'flex';

  fetchRecipeSteps(name, ingredients, rdPersons);
}

function updateRdScaleNote() {
  const note = document.getElementById('rd-scale-note');
  if (!note) return;
  const base = 4;
  if (rdPersons === base) { note.textContent = ''; return; }
  const ratio = Math.round((rdPersons / base) * 10) / 10;
  note.textContent = `(×${ratio} af mængderne)`;
}

function adjustRdPersons(d) {
  rdPersons = Math.max(1, Math.min(20, rdPersons + d));
  document.getElementById('rd-persons-val').textContent = rdPersons;
  updateRdScaleNote();
  renderRdIngredients();
}

// Skaler en ingrediensstreng (fx "400g kylling" → "200g kylling" ved ratio 0.5)
function scaleIngredient(str, ratio) {
  if (Math.abs(ratio - 1) < 0.001) return str;
  const m = str.match(/^(\d+(?:[.,]\d+)?)/);
  if (!m) return str;
  const orig = parseFloat(m[1].replace(',', '.'));
  if (!orig || isNaN(orig)) return str;
  const scaled = orig * ratio;
  let display;
  if (scaled >= 100)    display = String(Math.round(scaled));
  else if (scaled >= 10) display = String(Math.round(scaled * 2) / 2);
  else if (scaled >= 1)  display = String(Math.round(scaled * 4) / 4);
  else                   display = String(Math.round(scaled * 10) / 10);
  display = display.replace(/\.0$/, '');
  return str.replace(m[1], display);
}

function renderRdIngredients() {
  const el = document.getElementById('rd-ingredients');
  if (!el) return;
  if (!rdBaseIngredients.length) {
    el.innerHTML = '<div class="rd-ingredient" style="color:var(--muted);font-style:italic">Ingen ingrediensliste tilgængelig</div>';
    return;
  }
  const ratio = rdPersons / 4; // opskrifter er baseret på 4 pers.
  el.innerHTML = rdBaseIngredients
    .map(i => `<div class="rd-ingredient"><span class="rd-dot"></span>${scaleIngredient(i, ratio)}</div>`)
    .join('');
}

async function fetchRecipeSteps(name, ingredients, numPersons) {
  // 30-day localStorage cache per recipe name
  const key = 'mp_steps_' + name.toLowerCase().replace(/[^a-zæøå0-9]/g, '_').replace(/_+/g, '_');
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { steps, ts } = JSON.parse(cached);
      if (Date.now() - ts < 30 * 24 * 3600 * 1000) {
        renderRecipeSteps(steps);
        return;
      }
    }
  } catch { /* stale cache */ }

  try {
    const ingList = ingredients.length ? `\nIngredienser: ${ingredients.join(', ')}` : '';
    const { steps } = await callClaude({
      model: AI_MODEL_FAST,
      user: `Skriv en kort fremgangsmåde til "${name}" til ${numPersons} person${numPersons > 1 ? 'er' : ''}.${ingList}
Højst 7 trin. Hvert trin er én konkret sætning med tid/temperatur hvor relevant. Ingen nummerering i teksten.`,
      schema: {
        type: 'object', additionalProperties: false, required: ['steps'],
        properties: { steps: { type: 'array', items: { type: 'string' } } },
      },
      max_tokens: 700,
    });
    if (!Array.isArray(steps) || !steps.length) throw new Error('empty');
    localStorage.setItem(key, JSON.stringify({ steps, ts: Date.now() }));
    renderRecipeSteps(steps);
  } catch {
    document.getElementById('rd-steps').innerHTML = '<div class="rd-steps-error">Fremgangsmåde ikke tilgængelig</div>';
  }
}

function renderRecipeSteps(steps) {
  const el = document.getElementById('rd-steps');
  if (!el) return;
  el.innerHTML = steps.map((s, i) => `
    <div class="rd-step">
      <div class="rd-step-num">${i + 1}</div>
      <div class="rd-step-text">${s.replace(/^trin\s*\d+[:.]\s*/i, '')}</div>
    </div>`).join('');
}

function closeRecipeDetail() {
  document.getElementById('recipe-detail-modal').style.display = 'none';
}

function catDanish(cat) {
  const map = { klassisk: 'Klassisk', kød: 'Kød', internationalt: 'International', pasta: 'Pasta', vegetar: 'Vegetar', fisk: 'Fisk' };
  return map[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getCategoryEmoji(category) {
  const map = { klassisk: '🥘', kød: '🥩', internationalt: '🌍', pasta: '🍝', vegetar: '🥗', fisk: '🐟' };
  return map[category] || '🍽️';
}

// ─── RECIPE PHOTOS (Wikipedia, hentes først når kortet er synligt) ─────────────
function recipePhotoHtml(recipe) {
  const name = recipe?.name || '';
  return `<div class="recipe-card-media photo-slot" data-dish="${escHtml(name)}">${dishIllustration(name, recipe?.category, 'recipe-card-photo-placeholder')}</div>`;
}

let _photoObserver = null;
function observeRecipePhotos(root = document) {
  const slots = root.querySelectorAll('.recipe-card-media[data-dish]:not([data-loaded])');
  if (!('IntersectionObserver' in window)) { slots.forEach(loadRecipePhoto); return; }
  _photoObserver ??= new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { _photoObserver.unobserve(e.target); loadRecipePhoto(e.target); } });
  }, { rootMargin: '200px' });
  slots.forEach(el => _photoObserver.observe(el));
}

function loadRecipePhoto(slot) {
  slot.dataset.loaded = '1';
  fetchMealPhoto(slot.dataset.dish).then(photo => {
    if (photo?.url) slot.insertAdjacentHTML('beforeend', dishPhotoHTML(photo, slot.dataset.dish, 'recipe-card-photo'));
  });
}

// ─── SAVED MEALS / FAVORITES ─────────────────────────────────────────────────

function getSavedMealsKey() {
  return 'mp_saved_meals_' + (currentUser?.email || 'guest');
}

function saveMealToFavorites(dayIdx, mealIdx) {
  if (!currentPlan) return;
  const meal = currentPlan.plan[dayIdx]?.meals[mealIdx];
  if (!meal) return;

  const saved = JSON.parse(localStorage.getItem(getSavedMealsKey()) || '[]');
  const exists = saved.some(m => m.name.toLowerCase() === meal.name.toLowerCase());
  if (exists) {
    showToast('Allerede gemt i dine opskrifter');
    return;
  }
  saved.unshift({
    id: 'saved_' + Date.now(),
    name: meal.name,
    description: meal.description || '',
    store: meal.store || '',
    tags: meal.tags || [],
    savedAt: new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }),
  });
  localStorage.setItem(getSavedMealsKey(), JSON.stringify(saved.slice(0, 50)));

  // Visual feedback on button
  const btn = event?.target?.closest?.('.save-meal-btn');
  if (btn) btn.classList.add('saved');
  showToast('Gemt under Opskrifter');
}

function getSavedMeals() {
  return JSON.parse(localStorage.getItem(getSavedMealsKey()) || '[]');
}

function deleteSavedMeal(id) {
  const saved = getSavedMeals().filter(m => m.id !== id);
  localStorage.setItem(getSavedMealsKey(), JSON.stringify(saved));
  renderRecipeCatalog();
}

function showToast(msg) {
  let toast = document.getElementById('mp-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mp-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'mp-toast show';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── INDKØB PAGE ──────────────────────────────────────────────────────────────

function renderIndkob() {
  const container = document.getElementById('indkob-content');
  if (!container) return;

  if (!currentPlan?.shopping_list?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('cart')}</div>
        <div class="empty-text">Ingen indkøbsliste endnu</div>
        <div class="empty-sub">Generer en madplan under Plan for at se din indkøbsliste her</div>
        <button onclick="showPage('plan')" class="btn-primary" style="margin-top:1.25rem">Gå til Plan</button>
      </div>`;
    return;
  }

  const storeColors = { 'Netto': 'amber', 'Rema 1000': 'coral', 'Lidl': 'teal', '365discount': 'green', 'Spar': 'amber', 'Meny': 'gray', 'Aldi': 'teal', 'Coop': 'teal' };
  let html = '';

  if (currentPlan.total_price) {
    html += `<div class="total-bar" style="margin-bottom:1.5rem">
      <div class="total-label">Estimeret total indkøb</div>
      <div class="total-amount">${currentPlan.total_price} kr</div>
    </div>`;
  }

  (currentPlan.shopping_list || []).forEach(store => {
    const col = storeColors[store.store] || 'gray';
    const total = (store.items || []).reduce((s, i) => s + (i.price || 0), 0);
    html += `<div class="shop-section">
      <div class="shop-section-name">
        ${store.store}
        <span class="shop-section-badge badge badge-${col}">${(store.items || []).length} varer</span>
        ${total ? `<span style="margin-left:auto;font-size:13px;font-weight:500;color:var(--primary)">~${total} kr</span>` : ''}
      </div>`;
    (store.items || []).forEach((item, i) => {
      const id = 'ib_' + store.store.replace(/\s/g, '') + '_' + i;
      const sale = item.on_sale ? ' <span class="badge badge-amber" style="font-size:10px;padding:1px 7px">Tilbud</span>' : '';
      html += `<div class="shop-item" id="row_${id}">
        <div class="shop-cb" id="${id}" onclick="toggleItem('${id}')"></div>
        <div class="shop-item-name">${item.name}${sale}</div>
        <div class="shop-item-amount">${item.amount || ''}</div>
        <div class="shop-item-price">${item.price ? item.price + ' kr' : ''}</div>
      </div>`;
    });
    html += '</div>';
  });

  html += `<div style="margin-top:1rem">
    <button class="action-btn" style="width:100%;justify-content:center" onclick="exportShoppingList(window.currentPlan)">${icon('copy')} Eksportér indkøbsliste</button>
  </div>`;

  // Custom items section
  const customItems = getCustomItems();
  html += `
    <div class="custom-items-section">
      <div class="custom-items-label">${icon('bag')} Egne varer</div>
      <div id="custom-items-list">
        ${customItems.map(item => `
          <div class="shop-item" id="row_ci_${item.id}">
            <div class="shop-cb${item.checked ? ' checked' : ''}" id="ci_${item.id}" onclick="toggleCustomItem('${item.id}')"></div>
            <div class="shop-item-name" style="${item.checked ? 'text-decoration:line-through;color:var(--light)' : ''}">${item.name}</div>
            <button class="remove-btn" onclick="removeCustomItem('${item.id}')" style="margin-left:auto">×</button>
          </div>`).join('')}
      </div>
      <div class="custom-item-add">
        <input type="text" id="custom-item-input" class="custom-item-input" placeholder="Tilføj vare — f.eks. shampoo, tandpasta...">
        <button class="custom-item-btn" onclick="addCustomItem()">Tilføj</button>
      </div>
    </div>`;

  container.innerHTML = html;

  // Re-wire Enter key on input
  const input = container.querySelector('#custom-item-input');
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') addCustomItem(); });
}

function getCustomItemsKey() {
  return 'mp_custom_items_' + (currentUser?.email || 'guest');
}

function getCustomItems() {
  return JSON.parse(localStorage.getItem(getCustomItemsKey()) || '[]');
}

function saveCustomItems(items) {
  localStorage.setItem(getCustomItemsKey(), JSON.stringify(items));
}

function addCustomItem() {
  const input = document.getElementById('custom-item-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  const items = getCustomItems();
  items.push({ id: 'ci_' + Date.now(), name, checked: false });
  saveCustomItems(items);
  input.value = '';
  renderIndkob();
  // Restore focus on input after re-render
  setTimeout(() => {
    const newInput = document.getElementById('custom-item-input');
    if (newInput) newInput.focus();
  }, 50);
}

function removeCustomItem(id) {
  saveCustomItems(getCustomItems().filter(i => i.id !== id));
  renderIndkob();
}

function toggleCustomItem(id) {
  const items = getCustomItems().map(i => i.id === id ? { ...i, checked: !i.checked } : i);
  saveCustomItems(items);
  // Update DOM directly without full re-render
  const cb = document.getElementById('ci_' + id);
  const row = document.getElementById('row_ci_' + id);
  if (cb) cb.classList.toggle('checked');
  const nameEl = row?.querySelector('.shop-item-name');
  if (nameEl) {
    const isChecked = cb?.classList.contains('checked');
    nameEl.style.textDecoration = isChecked ? 'line-through' : '';
    nameEl.style.color = isChecked ? 'var(--light)' : '';
  }
}

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Enter to login
  if (document.getElementById('auth-screen').style.display !== 'none') {
    if (e.key === 'Enter') doLogin();
  }
});
