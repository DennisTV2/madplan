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

// Load from localStorage
let users    = JSON.parse(localStorage.getItem('mp_users') || '[]');
let history  = JSON.parse(localStorage.getItem('mp_history') || '[]');
let apiKey   = localStorage.getItem('mp_api_key') || '';

// ─── API KEY ─────────────────────────────────────────────────────────────────

function saveApiKey() {
  const val = document.getElementById('api-key-input').value.trim();
  if (!val.startsWith('sk-ant-')) {
    document.getElementById('api-key-status').textContent = '⚠️ Nøglen ser ikke korrekt ud (skal starte med sk-ant-)';
    document.getElementById('api-key-status').style.color = 'var(--coral-600)';
    return;
  }
  apiKey = val;
  localStorage.setItem('mp_api_key', apiKey);
  document.getElementById('api-key-status').textContent = '✅ Gemt!';
  document.getElementById('api-key-status').style.color = 'var(--green-600)';
}

function loadApiKeyField() {
  if (apiKey) {
    document.getElementById('api-key-input').value = apiKey;
    document.getElementById('api-key-status').textContent = '✅ Nøgle indlæst';
    document.getElementById('api-key-status').style.color = 'var(--green-600)';
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup'));
  });
  document.getElementById('login-form').style.display  = tab === 'login'  ? '' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? '' : 'none';
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-pass').value;

  // Demo account
  if (email === 'demo@madplan.dk' && pass === 'demo123') {
    currentUser = { name: 'Demo Bruger', email: 'demo@madplan.dk' };
    enterApp();
    return;
  }

  const u = users.find(u => u.email === email && u.pass === pass);
  if (!u) { alert('Forkert e-mail eller adgangskode'); return; }
  currentUser = { name: u.name, email: u.email };
  enterApp();
}

function doSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const pass  = document.getElementById('signup-pass').value;

  if (!name || !email || !pass) { alert('Udfyld alle felter'); return; }
  if (pass.length < 6)          { alert('Adgangskode skal være mindst 6 tegn'); return; }
  if (users.find(u => u.email === email)) { alert('E-mail er allerede registreret'); return; }

  users.push({ name, email, pass });
  localStorage.setItem('mp_users', JSON.stringify(users));
  currentUser = { name, email };
  enterApp();
}

function enterApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = '';

  const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  document.getElementById('nav-avatar').textContent   = initials;
  document.getElementById('nav-name').textContent     = currentUser.name;
  document.getElementById('nav-email').textContent    = currentUser.email;
  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-name').textContent   = currentUser.name;
  document.getElementById('profile-email').textContent  = currentUser.email;

  // Apply saved defaults
  const def = JSON.parse(localStorage.getItem('mp_defaults_' + currentUser.email) || '{}');
  if (def.days)    { days    = def.days;    document.getElementById('days-val').textContent    = days; }
  if (def.persons) { persons = def.persons; document.getElementById('persons-val').textContent = persons; }
  if (def.days)    document.getElementById('default-days').value    = def.days;
  if (def.persons) document.getElementById('default-persons').value = def.persons;

  loadApiKeyField();
  loadHistory();
  updateStats();
  showPage('plan');
}

function doLogout() {
  currentUser = null;
  currentPlan = null;
  document.getElementById('auth-screen').style.display = '';
  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('plan-output').style.display = 'none';
  document.getElementById('result-empty').style.display = '';
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function showPage(page) {
  document.querySelectorAll('.page').forEach(p      => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n  => n.classList.remove('active'));

  document.getElementById('page-' + page).classList.add('active');

  const navMap = { plan: 0, result: 1, history: 2, profile: 3 };
  const navItems = document.querySelectorAll('.nav-item');
  if (navMap[page] !== undefined) navItems[navMap[page]].classList.add('active');

  if (page === 'history') renderHistory();
  if (page === 'result' && currentPlan) renderPlan(currentPlan);
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
      <option value="include">✅ Inkluder</option>
      <option value="exclude">🚫 Ekskluder</option>
    </select>
    <input type="text" placeholder="f.eks. laks, rødbeder, nødder...">
    <input type="number" class="pref-count" placeholder="× retter" min="1" max="14">
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

function clearHistory() {
  if (!confirm('Er du sikker på du vil slette al historik?')) return;
  history = history.filter(h => h.user !== currentUser.email);
  localStorage.setItem('mp_history', JSON.stringify(history));
  renderHistory();
  updateStats();
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

// ─── GENERATE PLAN ────────────────────────────────────────────────────────────

async function generatePlan() {
  if (!apiKey) {
    alert('Indtast din Anthropic API-nøgle øverst på siden.');
    document.getElementById('api-key-input').focus();
    return;
  }

  const settings = gatherSettings();

  if (!settings.shops.length) {
    alert('Vælg mindst én butik');
    return;
  }

  // Navigate to result page and show loader
  showPage('result');
  document.getElementById('result-empty').style.display   = 'none';
  document.getElementById('result-loading').style.display = '';
  document.getElementById('plan-output').style.display    = 'none';
  document.getElementById('plan-output').innerHTML        = '';

  const loadingMessages = [
    'Henter ugens tilbud...',
    'Finder de bedste måltider...',
    'Optimerer på tværs af butikker...',
    'Beregner den billigste indkøbsliste...',
    'Tilpasser til dine præferencer...',
    'Næsten klar...',
  ];
  let mi = 0;
  clearInterval(loadingInterval);
  loadingInterval = setInterval(() => {
    document.getElementById('loading-msg').textContent = loadingMessages[mi++ % loadingMessages.length];
  }, 1800);

  // Build prompt
  const shopNames = { netto: 'Netto', rema: 'Rema 1000', lidl: 'Lidl', '365': '365discount', fakta: 'Spar', meny: 'Meny', aldi: 'Aldi', coop: 'Coop' };
  const selectedShopNames = settings.shops.map(s => shopNames[s] || s);

  const includeRules = settings.prefs.filter(p => p.type === 'include')
    .map(p => `${p.ingredient}${p.count ? ' (mindst ' + p.count + ' retter i ugen)' : ''}`).join(', ');
  const excludeRules = settings.prefs.filter(p => p.type === 'exclude')
    .map(p => p.ingredient).join(', ');

  const optLabels = {
    cheap:    'Gør det så billigt som muligt – spred indkøb på tværs af tilbud i alle valgte butikker',
    one:      'Find den ENKELT billigste butik at handle det hele i – anbefal en enkelt butik til alt',
    balanced: 'God balance – lav pris OG variation i retterne, ikke kun det billigste',
    quality:  'Bedst mulig kvalitet inden for budgettet – friske råvarer, sæsonvarer, mangfoldige retter',
  };

  const dayNames = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag', 'Dag 8', 'Dag 9', 'Dag 10', 'Dag 11', 'Dag 12', 'Dag 13', 'Dag 14'];

  const prompt = `Du er Danmarks bedste madplanlægger – en kombination af professionel kok og budgetekspert. Du laver madplaner i stil med Bilkas ugentlige madplaner: gennemtænkte, lækre hverdagsretter hvor ingredienserne hænger kulinarisk KORREKT sammen.

════════════════════════════════════
KULINARISKE GRUNDREGLER – OVERHOLD ALTID
════════════════════════════════════

FORBUDTE KOMBINATIONER – lav dem ALDRIG:
• Pasta + hakkebøf direkte – det hedder bolognese og kræver tomatsauce som bindemiddel
• To proteiner i samme ret (fx laks + kylling, eller tun + æg i samme varm ret)
• Asiatiske saucer på dansk tilbehør (fx soya på kartofler)
• Ris til italienske retter, pasta til asiatiske retter
• Grød som aftensmad, eller tung varm ret som morgenmad

TÆNK I KOMPLETTE RETTER med smagsprofil:
Hver ret = protein + tilbehør + sauce/grøntsag der hænger NATURLIGT sammen.

Gode eksempler på velfungerende retter:
• Hakket oksekød → Spaghetti bolognese med tomatsauce og parmesan
• Kyllingefilet → Citronkylling med ris og dampet broccoli
• Kyllingefilet → Kylling tikka masala med basmatiris og raita
• Laks → Ovnbagt laks med dild, kogte kartofler og agurke-cremefraiche
• Svinekød → Pulled pork i burgerboller med coleslaw og pickles
• Hakket oksekød → Mexicansk tacofyld med bønner, salsa, ost i tortillas
• Torsk → Paneret fiskefilet med remoulade, pommes frites og ærter
• Æg → Shakshuka: æg pocheret i krydret tomatsauce, serveret med brød
• Hel kylling → Ovnstegt med rosmarin, hvidløg, rodfrugter og kartofler
• Svinekam → Stegt med persillesovs og kogte kartofler (klassisk dansk)
• Linser → Dahl med kokosmælk, karry, basmatiris og naan
• Tun → Tunmelt på ristet brød med smeltet ost og tomat

UGEPLANLÆGNING – variation er nøglen:
• Variér protein: ikke kylling to dage i træk
• Variér køkken: 2-3 dage dansk, 1-2 dage italiensk/pasta, 1 dag asiatisk, 1 dag mex/wrap
• Brug rester smart: stor portion mandag → rester i ny ret onsdag (fx kylling → kyllingewrap)
• Inkludér mindst én klassisk dansk hverdagsret: frikadeller, stegt flæsk, biksemad, tarteletter

MORGENMAD – enkelt og realistisk:
• Havregrød med bær/æbler/banan og evt. nødder
• Yoghurt naturel med müsli og frisk frugt
• Franskbrød eller rugbrød med smør, ost og pålæg
• Scrambled eggs eller røræg med brød og tomat
• Smoothiebowl med yoghurt og granola

FROKOST – hurtig og gerne restebaseret:
• Rugbrød med pålæg (leverpostej, makrel, ost, æg)
• Wrap/sandwich med gårsdagens protein
• Suppe (ev. fra fryseren)
• Salat med protein (tun, æg, kylling)

════════════════════════════════════
PARAMETRE FOR DENNE MADPLAN
════════════════════════════════════

• Antal dage: ${settings.days} (${dayNames.slice(0, settings.days).join(', ')})
• Antal personer: ${settings.persons}
• Valgte butikker: ${selectedShopNames.join(', ')}
• Måltider der ønskes: ${settings.mealTypes.join(', ')}
• Optimeringstilstand: ${optLabels[settings.optimizeMode]}
${settings.budget ? '• MAX BUDGET: ' + settings.budget + ' kr i alt – dette MÅ IKKE overskrides' : '• Intet fast budget – vær fornuftig'}
${settings.dietTags.length ? '• Kostpræferencer (OBLIGATORISK overhold): ' + settings.dietTags.join(', ') : ''}
${settings.pantry.length ? '• Basislager hjemme – KØB IKKE disse: ' + settings.pantry.join(', ') : ''}
${includeRules ? '• SKAL indgå i planen: ' + includeRules : ''}
${excludeRules ? '• MÅ ALDRIG bruges – allergi/fravalg: ' + excludeRules : ''}

════════════════════════════════════
TILBUDSAVISER DENNE UGE
════════════════════════════════════

Netto tilbud:
- Kyllingefilet: 29 kr/kg ★
- Spaghetti/pasta 500g: 8 kr ★
- Hakkede tomater dåse: 7 kr ★
- Cherry-tomater 2 bakker: 25 kr ★
- Gulerødder 1kg: 6 kr ★
- Mælk 1L: 7 kr ★

Rema 1000 tilbud:
- Atlanterhavslaks 400g: 49 kr ★
- Havregryn 1kg: 12 kr ★
- Æg 10 stk: 20 kr ★
- Jasminris 1kg: 12 kr ★
- Broccoli: 12 kr ★
- Hakket oksekød 8% fedt 500g: 39 kr ★
- Kokosmælk 400ml: 14 kr ★

Lidl tilbud:
- Svinekam 1kg: 35 kr ★
- Broccoli: 9 kr ★
- Frisk spinat 200g: 12 kr ★
- Mozzarella 125g: 15 kr ★
- Penne pasta 500g: 7 kr ★
- Æbler 1kg: 18 kr ★

365discount tilbud:
- Tun i vand 185g: 8 kr ★
- Kidneybønner 400g: 9 kr ★
- Pasta 500g: 7 kr ★

Spar tilbud:
- Hel kylling 1.2kg: 55 kr ★
- Kartofler 1kg: 9 kr ★
- Porre: 8 kr ★

Meny tilbud:
- Frisk torsk 400g: 65 kr ★
- Friske krydderurter: 18 kr ★

Normalpriser (ikke på tilbud):
- Løg: 5 kr/stk, Hvidløg: 8 kr/hoved
- Parmesan 100g: 20 kr, Fløde: 20 kr, Creme fraiche: 15 kr
- Tomatpuré tube: 10 kr, Dåsebønner: 12 kr, Majs: 10 kr
- Tortillas 8 stk: 18 kr, Burgerboller 4 stk: 16 kr
- Ris 1kg: 15 kr, Couscous 500g: 18 kr, Røde linser: 20 kr
- Frosne ærter 450g: 15 kr, Karrypasta: 22 kr
- Rugbrød: 25 kr, Franskbrød: 15 kr, Müsli 500g: 22 kr
- Yoghurt naturel 500g: 18 kr, Leverpostej 200g: 18 kr

════════════════════════════════════
OUTPUT – KUN JSON, INTET ANDET
════════════════════════════════════

Svar UDELUKKENDE med ét valid JSON-objekt. Ingen markdown. Ingen backticks. Ingen forklaringstekst. Kun JSON.

{
  "plan": [
    {
      "day": 1,
      "label": "Mandag",
      "meals": [
        {
          "type": "Aftensmad",
          "name": "Spaghetti bolognese",
          "description": "Klassisk kødsauce med hakket oksekød, løg, hvidløg og hakkede tomater – serveret med spaghetti og revet parmesan",
          "store": "Netto + Rema 1000",
          "price_per_person": 28,
          "tags": ["Familiefavorit", "Fryseegnet"],
          "on_sale": true,
          "tip": "Lav dobbelt portion og frys den ene halvdel – perfekt til en travl dag"
        }
      ]
    }
  ],
  "shopping_list": [
    {
      "store": "Netto",
      "items": [
        {"name": "Spaghetti 500g", "amount": "2 pakker", "price": 16, "on_sale": true, "used_in": "Bolognese, Pasta primavera"},
        {"name": "Hakkede tomater", "amount": "3 dåser", "price": 21, "on_sale": true, "used_in": "Bolognese, Shakshuka"}
      ]
    }
  ],
  "total_price": 620,
  "savings": 145,
  "recommended_store": "Netto",
  "weekly_theme": "Klassisk hverdagsmad med internationalt twist",
  "summary": "En veltilrettelagt uge med variation: dansk klassiker tirsdag, italiensk pasta onsdag, asiatisk karry torsdag og mexicansk fredag. Udnytter stærke tilbud på kylling fra Netto og laks fra Rema 1000."
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'API-fejl: ' + response.status);
    }

    const data = await response.json();
    clearInterval(loadingInterval);

    let text = (data.content || []).map(b => b.text || '').join('');
    // Strip any accidental markdown
    text = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON object from response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Kunne ikke parse JSON fra AI-svar');
    }

    currentPlan = parsed;
    savePlanToHistory(parsed, settings);

    document.getElementById('result-loading').style.display = 'none';
    renderPlan(parsed);
    updateStats();

  } catch (e) {
    clearInterval(loadingInterval);
    document.getElementById('result-loading').style.display = 'none';
    document.getElementById('result-empty').style.display = '';
    document.getElementById('result-empty').innerHTML = `
      <div class="empty-icon">⚠️</div>
      <div class="empty-text">Noget gik galt</div>
      <div class="empty-sub" style="color:var(--coral-600);margin-top:12px">${e.message}</div>
      <div class="empty-sub" style="margin-top:8px">Tjek din API-nøgle og prøv igen</div>
    `;
  }
}

// ─── RENDER PLAN ──────────────────────────────────────────────────────────────

function renderPlan(plan) {
  const wrapper = document.getElementById('plan-output');
  wrapper.style.display = 'block';

  const storeColors = {
    'Netto':        'amber',
    'Rema 1000':    'coral',
    'Lidl':         'teal',
    '365discount':  'green',
    'Spar':         'amber',
    'Meny':         'gray',
    'Aldi':         'teal',
    'Coop':         'teal',
  };

  let html = `
    <div class="plan-header">
      <div>
        <div class="plan-title">🍽️ Din madplan</div>
        <div style="font-size:13px;color:var(--muted);margin-top:5px;max-width:560px">${plan.summary || ''}</div>
      </div>
      <div class="plan-actions">
        <button class="action-btn" onclick="window.print()">🖨️ Print</button>
        <button class="action-btn" onclick="exportShoppingList(window.currentPlan)">📋 Eksportér liste</button>
        <button class="action-btn primary" onclick="document.getElementById('plan-shopping').scrollIntoView({behavior:'smooth'})">🛒 Til indkøbsliste</button>
      </div>
    </div>`;

  // Stats row
  if (plan.total_price || plan.savings || plan.recommended_store) {
    html += `<div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">`;
    if (plan.total_price) {
      html += `<div class="total-bar" style="flex:1;min-width:160px">
        <div class="total-label">Estimeret total</div>
        <div class="total-amount">${plan.total_price} kr</div>
      </div>`;
    }
    if (plan.savings) {
      html += `<div class="total-bar" style="flex:1;min-width:160px;background:var(--teal-50);border-color:var(--teal-100)">
        <div class="total-label" style="color:var(--teal-800)">Estimeret besparelse</div>
        <div class="total-amount" style="color:var(--teal-800)">${plan.savings} kr</div>
      </div>`;
    }
    if (plan.recommended_store) {
      html += `<div class="total-bar" style="flex:1;min-width:160px;background:var(--amber-50);border-color:var(--amber-100)">
        <div class="total-label" style="color:var(--amber-800)">Anbefalet butik</div>
        <div class="total-amount" style="color:var(--amber-800);font-size:1.1rem">${plan.recommended_store}</div>
      </div>`;
    }
    html += '</div>';
  }

  // Weekly theme banner
  if (plan.weekly_theme) {
    html += `<div style="background:var(--amber-50);border:0.5px solid var(--amber-100);border-radius:var(--r-sm);padding:12px 16px;margin-bottom:1.5rem;display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">🗓️</span>
      <div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:var(--amber-600);margin-bottom:2px">Ugens tema</div>
        <div style="font-size:14px;color:var(--amber-800)">${plan.weekly_theme}</div>
      </div>
    </div>`;
  }

  // Day cards
  (plan.plan || []).forEach(day => {
    html += `
      <div class="day-card">
        <div class="day-label">Dag ${day.day}</div>
        <div class="day-date">${day.label || 'Dag ' + day.day}</div>`;

    (day.meals || []).forEach(meal => {
      const saleTag = meal.on_sale
        ? '<span class="badge badge-amber">🏷️ Tilbud</span>'
        : '';
      const tags = (meal.tags || [])
        .map(t => `<span class="badge badge-green">${t}</span>`).join('');
      const storeTag = meal.store
        ? `<span class="badge badge-gray">${meal.store}</span>`
        : '';
      const tipHtml = meal.tip
        ? `<div style="margin-top:8px;font-size:12px;color:var(--teal-600);background:var(--teal-50);padding:6px 10px;border-radius:6px;border-left:3px solid var(--teal-200)">💡 ${meal.tip}</div>`
        : '';

      html += `
        <div class="meal-row">
          <div class="meal-type">${meal.type}</div>
          <div class="meal-info">
            <div class="meal-name">${meal.name}</div>
            <div class="meal-detail">${meal.description || ''}</div>
            <div class="meal-badges">${saleTag}${storeTag}${tags}</div>
            ${tipHtml}
          </div>
          <div class="meal-price">${meal.price_per_person ? meal.price_per_person + ' kr/p' : ''}</div>
        </div>`;
    });

    html += '</div>';
  });

  // Shopping list
  html += `
    <div class="shop-list" id="plan-shopping">
      <div class="shop-list-header">
        <div class="shop-list-title">🛒 Indkøbsliste</div>
      </div>`;

  (plan.shopping_list || []).forEach(store => {
    const col = storeColors[store.store] || 'gray';
    const total = (store.items || []).reduce((s, i) => s + (i.price || 0), 0);

    html += `
      <div class="shop-section">
        <div class="shop-section-name">
          ${store.store}
          <span class="shop-section-badge badge badge-${col}">${(store.items || []).length} varer</span>
          ${total ? `<span style="margin-left:auto;font-size:13px;font-weight:500;color:var(--accent)">~${total} kr</span>` : ''}
        </div>`;

    (store.items || []).forEach((item, i) => {
      const id = 'cb_' + store.store.replace(/\s/g, '') + '_' + i;
      const sale = item.on_sale ? ' <span class="badge badge-amber" style="font-size:10px;padding:1px 7px">Tilbud</span>' : '';
      html += `
        <div class="shop-item" id="row_${id}">
          <div class="shop-cb" id="${id}" onclick="toggleItem('${id}')"></div>
          <div class="shop-item-name">${item.name}${sale}</div>
          <div class="shop-item-amount">${item.amount || ''}</div>
          <div class="shop-item-price">${item.price ? item.price + ' kr' : ''}</div>
        </div>`;
    });

    html += '</div>';
  });

  if (plan.total_price) {
    html += `
      <div class="total-bar">
        <div class="total-label">Estimeret total indkøb</div>
        <div class="total-amount">${plan.total_price} kr</div>
      </div>`;
  }

  html += '</div>'; // .shop-list

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

function savePlanToHistory(plan, settings) {
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
  history.unshift(entry);
  if (history.length > 50) history = history.slice(0, 50);
  localStorage.setItem('mp_history', JSON.stringify(history));
}

function loadHistory() {
  history = JSON.parse(localStorage.getItem('mp_history') || '[]');
}

function renderHistory() {
  const userHistory = history.filter(h => h.user === (currentUser?.email || ''));
  const container   = document.getElementById('history-list');

  if (!userHistory.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
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

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Enter to login
  if (document.getElementById('auth-screen').style.display !== 'none') {
    if (e.key === 'Enter') doLogin();
  }
});
