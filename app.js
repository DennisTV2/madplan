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

// Load from localStorage
let users   = JSON.parse(localStorage.getItem('mp_users') || '[]');
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

  loadHistory();
  updateStats();
  renderOffersRow();
  showPage('plan');
}

function doLogout() {
  currentUser = null;
  currentPlan = null;
  document.getElementById('auth-screen').style.display = '';
  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('bottom-nav').style.display  = 'none';
  document.getElementById('plan-output').style.display = 'none';
  document.getElementById('result-empty').style.display = '';
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

// ─── SEASONAL & WEEKDAY HELPERS ──────────────────────────────────────────────

function getSeasonalHint() {
  const m = new Date().getMonth() + 1;
  const map = {
    1:  ['porre', 'rodfrugter', 'kål', 'persillerod', 'selleri'],
    2:  ['porre', 'rodfrugter', 'kål', 'citrus', 'radicchio'],
    3:  ['asparges', 'radiser', 'spinat', 'ærter'],
    4:  ['asparges', 'radiser', 'spinat', 'ærter', 'nye kartofler'],
    5:  ['asparges', 'jordbær', 'rabarbr', 'radiser', 'spinat', 'ærter'],
    6:  ['jordbær', 'ærter', 'nye kartofler', 'courgette', 'salat', 'agurk'],
    7:  ['tomater', 'courgette', 'bønner', 'agurk', 'salat', 'blåbær'],
    8:  ['tomater', 'courgette', 'peberfrugt', 'bønner', 'blommer'],
    9:  ['svampe', 'æbler', 'pærer', 'squash', 'porre', 'blomkål'],
    10: ['svampe', 'æbler', 'rødbeder', 'kål', 'græskar', 'porre'],
    11: ['rodfrugter', 'kål', 'rødkål', 'persillerod', 'selleri'],
    12: ['rødkål', 'rodfrugter', 'appelsin', 'klementin', 'porre'],
  };
  const items = map[m] || [];
  const season = m >= 3 && m <= 5 ? 'Forår' : m >= 6 && m <= 8 ? 'Sommer' : m >= 9 && m <= 11 ? 'Efterår' : 'Vinter';
  return items.length ? `• SÆSON (${season} i Danmark): Prioritér gerne disse råvarer i min. 2 retter: ${items.join(', ')}` : '';
}

function getWeekdayHint(numDays) {
  if (numDays < 5) return '';
  return `• UGEDAGSRYTME — tilpas sværhedsgrad til dagen:
  - Man–Tors: Enkle hverdagsretter (max 30–45 min tilberedning)
  - Fredag: Hyggeret — pizza, tacos, burger eller noget der markerer weekend
  - Lørdag: Mere tidskrævende eller festlig ret — steg, braiseret, noget særligt
  - Søndag: Klassisk søndagsret — ovnstegt, steg, eller familiens favorit`;
}

// ─── GENERATE PLAN ────────────────────────────────────────────────────────────

async function generatePlan() {

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
  const selectedShopNames = settings.shops.map(s => STORE_OFFERS[s]?.name || s);
  const recentMeals = getRecentMealNames();
  const catalogHint = getDishCatalogSuggestions(settings.shops);

  // Hent rigtige tilbud (med 30-min cache — falder tilbage til statiske data ved fejl)
  document.getElementById('loading-msg').textContent = 'Henter aktuelle tilbud...';
  realOffers = await fetchRealOffers(settings.shops);
  renderOffersRow();

  const scoredRecipes = scoreRecipesAgainstOffers(settings.shops, settings.dietTags);

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
${recentMeals.length ? '• UNDGÅ disse retter – brugt de seneste uger: ' + recentMeals.slice(0, 14).join(', ') : ''}
${getSeasonalHint()}
${getWeekdayHint(settings.days)}
• VARIATIONSREGEL: Ingen ret gentages i denne plan. Brug max 1 pastabaseret ret og max 2 retter med samme protein. Varier køkken: dansk / italiensk / asiatisk / mexicansk / mellemøstligt.
• BUTIKSBEGRÆNSNING: Brug KUN produkter og tilbud fra: ${selectedShopNames.join(', ')} – ignorer alle andre butikker i dine svar.
${settings.kids.enabled ? `
════════════════════════════════════
LAV MAD MED BØRN — OBLIGATORISKE TRIN
════════════════════════════════════

Barnets alder: ${settings.kids.age} år
Barnets bidrag: ${settings.kids.skills.join(', ')}

For HVER aftensmadsret skal du tilføje et ekstra felt "kids_activity" i JSON-outputtet med:
• En kort, alderssvarende opgave barnet kan løse (maks 2 sætninger)
• Brug simple ord og konkrete handlinger
• Match opgaven til barnets bidragsniveau: ${settings.kids.skills.join(', ')}

Eksempel for alder ${settings.kids.age} år:
- "vask-skær" → "Vask karruerne under den kolde vandhane og hjælp med at rive dem i stykker"
- "røre-blande" → "Rør saucen rundt med træskeen mens den bobler – tæl til 20 hvert omrøring!"
- "komfur" → "Hjælp en voksen med at vende kødet i panden – hold godt fat i grebet"
- "anrette" → "Pynt tallerknerne med et par blade frisk basilikum og drys parmesan på"

Vælg aktiviteter der passer til alderen – for 3-5 år: enkle og sikre opgaver uden varme; for 14+: selvstændige trin.` : ''}

${scoredRecipes.length ? `════════════════════════════════════
OPSKRIFTSKARTOTEK — ANBEFALEDE RETTER I DAG
════════════════════════════════════

Disse retter fra vores kartotek bruger flest ingredienser fra aktuelle tilbud.
Vælg mindst ${Math.min(Math.ceil(settings.days * 0.6), scoredRecipes.length)} af disse som aftensmad i planen:

${scoredRecipes.slice(0, 8).map((r, i) =>
    `${i + 1}. ${r.name}
   Tilbudsvarer der hører naturligt til i denne ret: ${r.matched.join(', ')}`
  ).join('\n')}

KULINARISK REGEL (OVERHOLD ALTID):
Brug KUN tilbudsvarer der er AUTENTISKE ingredienser i den valgte ret.
Eksempler på hvad der ALDRIG må ske:
• Broccoli tilhører IKKE tikka masala, tacos, bolognese eller biksemad
• Laks tilhører IKKE pasta carbonara, lasagne eller kylling-wok
• Kokosmælk tilhører IKKE klassiske danske retter som frikadeller eller stegt flæsk
• Chili tilhører IKKE citronkylling, frikadeller eller ovnkylling
Hvis en tilbudsvare IKKE fremgår af rettenens naturlige ingredienser ovenfor — brug den IKKE.

` : catalogHint}════════════════════════════════════
TILBUDSAVISER — KUN DISSE BUTIKKER: ${selectedShopNames.join(', ')}
════════════════════════════════════

${getFilteredOffersText(settings.shops)}

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
          "tip": "Lav dobbelt portion og frys den ene halvdel – perfekt til en travl dag",
          "kids_activity": "Riv osten og drys den over spaghettien – se den smelte ned i den varme sauce!"
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
    const response = await fetch('proxy.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    loadPlanPhotos();
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
        <div class="plan-title">Din madplan</div>
        <div style="font-size:13px;color:var(--muted);margin-top:5px;max-width:560px">${plan.summary || ''}</div>
      </div>
      <div class="plan-actions">
        <button class="action-btn" onclick="window.print()">🖨️ Print</button>
        <button class="action-btn primary" onclick="showPage('indkob')">🛒 Indkøbsliste</button>
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
  (plan.plan || []).forEach((day, dayIdx) => {
    html += `
      <div class="day-card">
        <div class="day-card-photo-wrap" id="photo-day-${day.day}">
          <div class="day-card-photo-placeholder">${getDayEmoji(day.day)}</div>
        </div>
        <div class="day-card-body">
        <div class="day-label">Dag ${day.day}</div>
        <div class="day-date">${day.label || 'Dag ' + day.day}</div>`;

    (day.meals || []).forEach((meal, mealIdx) => {
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
      const kidsHtml = meal.kids_activity
        ? `<div style="margin-top:8px;font-size:12px;color:#7c5c1e;background:#fef9ec;padding:6px 10px;border-radius:6px;border-left:3px solid #f5d57a">👨‍🍳 <strong>Børneopgave:</strong> ${meal.kids_activity}</div>`
        : '';

      html += `
        <div class="meal-row">
          <div class="meal-type">${meal.type}</div>
          <div class="meal-info">
            <div class="meal-name">${meal.name}</div>
            <div class="meal-detail">${meal.description || ''}</div>
            <div class="meal-badges">${saleTag}${storeTag}${tags}</div>
            ${tipHtml}
            ${kidsHtml}
          </div>
          <div class="meal-price">${meal.price_per_person ? meal.price_per_person + ' kr/p' : ''}</div>
          <div class="meal-actions">
            <button class="swap-btn" onclick="swapMeal(${dayIdx},${mealIdx})">🔄 Udskift</button>
            <button class="save-meal-btn" onclick="saveMealToFavorites(${dayIdx},${mealIdx})" title="Gem til mine opskrifter">♡</button>
          </div>
        </div>`;
    });

    html += '</div></div>'; // close day-card-body + day-card
  });

  // Shopping list CTA → Indkøb tab
  const totalItems = (plan.shopping_list || []).reduce((s, st) => s + (st.items?.length || 0), 0);
  const storeCount = (plan.shopping_list || []).length;
  html += `
    <div class="shopping-cta" onclick="showPage('indkob')">
      <div class="shopping-cta-left">
        <div class="shopping-cta-icon">🛒</div>
        <div>
          <div class="shopping-cta-title">Indkøbsliste klar</div>
          <div class="shopping-cta-sub">${totalItems} varer fordelt på ${storeCount} butik${storeCount !== 1 ? 'ker' : ''}${plan.total_price ? ' · ~' + plan.total_price + ' kr' : ''}</div>
        </div>
      </div>
      <div class="shopping-cta-arrow">›</div>
    </div>`;

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
  updateDishCatalog(plan);
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

  const prompt = `Du er madplanekspert. Ret der skal udskiftes: "${meal.name}" (${meal.type}, ${day.label}).

Krav til de 3 alternativer:
• Brug KUN produkter fra: ${shopNames}
• Budgetniveau: ${budgetNote}
• Kostpræferencer: ${dietStr}
• MINDST ÉT forslag SKAL være vegetarisk (mærk med "vegetarian": true)
• Alle retter skal være kulinarisk korrekte og komplette (protein + tilbehør + sauce)
• Brug aktuelle tilbud når muligt
• Alternativerne skal være FORSKELLIGE fra hinanden og fra originalretten

Aktuelle tilbud (kun valgte butikker):
${offersText}

Svar KUN med ét validt JSON-objekt. Ingen markdown, ingen forklaringer.

{
  "alternatives": [
    {
      "name": "Ret navn",
      "description": "Ret og tilbehør der hænger kulinarisk korrekt sammen",
      "store": "Butiksnavn",
      "price_per_person": 35,
      "tags": ["Tag"],
      "on_sale": false,
      "vegetarian": false
    }
  ]
}`;

  try {
    const res  = await fetch('proxy.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error('API-fejl: ' + res.status);
    const data = await res.json();
    let text   = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    const m    = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : text);
    renderAlternatives(parsed.alternatives || []);
  } catch (e) {
    document.getElementById('swap-loading').innerHTML =
      `<div style="text-align:center;padding:1rem"><div style="font-size:2rem;margin-bottom:8px">⚠️</div><div style="color:var(--berry-600);font-size:14px">${e.message}</div><button onclick="closeSwapModal()" style="margin-top:1rem;padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:var(--r-sm);cursor:pointer;font-family:var(--font-body)">Luk</button></div>`;
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
  closeSwapModal();
  renderPlan(currentPlan);
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
  if (!settings.shops.length) { alert('Vælg mindst én butik på Ny madplan-siden'); return; }

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
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 6000, messages: [{ role: 'user', content: prompt }] }),
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
    empty.innerHTML = `<div class="empty-icon">⚠️</div><div class="empty-text">Noget gik galt</div><div class="empty-sub" style="color:var(--berry-600)">${e.message}</div>`;
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

  return pool
    .map(r => {
      const matched = r.ingredients.filter(ing => offerText.includes(ing.toLowerCase()));
      return { ...r, score: matched.length, matched };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ─── FOOD PHOTOS ──────────────────────────────────────────────────────────────

function getDayEmoji(dayNum) {
  const emojis = ['🍽️','🥘','🍲','🫕','🥗','🍱','🫔','🥙','🍜','🥩','🐟','🥚','🧆','🌮'];
  return emojis[(dayNum - 1) % emojis.length];
}

const PHOTO_QUERIES = [
  // Klassisk dansk
  ['frikadeller',               'danish meatballs brown gravy potatoes'],
  ['hakkebøf',                  'hamburger steak onion gravy potatoes'],
  ['stegt flæsk',               'danish fried pork belly parsley sauce'],
  ['flæskesteg',                'pork roast red cabbage caramelized potatoes'],
  ['biksemad',                  'hash potatoes fried egg pan'],
  ['æggekage',                  'danish egg cake bacon omelette skillet'],
  ['karbonader',                'pork chop potato salad remoulade'],
  ['labskovs',                  'beef potato stew nordic'],
  ['medisterpølse',             'pork sausage red cabbage danish'],
  ['svinekam',                  'roast pork loin parsley sauce potatoes'],
  ['boller i karry',            'meatballs curry sauce rice danish'],
  ['brændende kærlighed',       'mashed potatoes bacon caramelized onion'],
  ['pølseret',                  'sausage potatoes mustard sauce'],
  ['mørbradgryde',              'pork tenderloin mushroom cream sauce'],
  ['baconruller',               'bacon rolls potato casserole baked'],
  ['tærte med porre',           'quiche leek bacon tart'],
  // Kød & kylling
  ['hel kylling',               'whole roast chicken rosemary root vegetables'],
  ['citronkylling',             'lemon chicken rice steamed vegetables'],
  ['tikka masala',              'chicken tikka masala basmati rice'],
  ['butter chicken',            'butter chicken naan bread'],
  ['wok med kylling',           'chicken stir fry wok vegetables noodles'],
  ['kyllingewrap',              'chicken wrap avocado herb tortilla'],
  ['shawarma',                  'chicken shawarma pita wrap'],
  ['kylling i fad',             'baked chicken thighs potatoes thyme'],
  // Oksekød & international
  ['bolognese',                 'spaghetti bolognese meat sauce parmesan'],
  ['lasagne',                   'lasagna baked cheese bechamel'],
  ['chili con carne',           'chili con carne rice sour cream'],
  ['tacos',                     'beef tacos salsa guacamole mexican'],
  ['burgere',                   'homemade burger fries beef'],
  ['pulled pork',               'pulled pork burger coleslaw bun'],
  // Fisk & skaldyr
  ['ovnbagt laks',              'baked salmon dill potatoes cucumber'],
  ['pasta med laks',            'salmon pasta cream dill'],
  ['bagels med røget laks',     'bagel smoked salmon cream cheese dill'],
  ['fiskefrikadeller',          'fish cakes remoulade potatoes danish'],
  ['paneret torsk',             'breaded cod fish chips peas'],
  ['fiskesuppe',                'creamy fish chowder vegetables dill'],
  ['rejer',                     'garlic butter shrimp prawns bread lemon'],
  // Pasta
  ['carbonara',                 'pasta carbonara egg bacon parmesan'],
  ['pesto',                     'pesto pasta chicken cherry tomatoes'],
  ['linguine',                  'linguine shrimp garlic butter parsley'],
  ['primavera',                 'pasta primavera spring vegetables cream'],
  ['pasta med kylling',         'pasta chicken bacon spinach creamy'],
  // Vegetar
  ['linser dahl',               'red lentil dahl coconut milk naan'],
  ['kikærtekarry',              'chickpea curry spinach coconut milk rice'],
  ['kikærtegryde',              'chickpea stew tomato feta baked'],
  ['grøntsagssuppe',            'homemade vegetable soup bread bowl'],
  ['tomatsuppe',                'tomato soup cream croutons'],
  ['falafler',                  'falafel hummus pita bread plate'],
  ['risotto',                   'mushroom risotto parmesan herb'],
  ['okonomiyaki',               'okonomiyaki japanese savory pancake'],
  ['stegt ris',                 'fried rice egg vegetables wok'],
  // Generiske tilberedningsmåder — dækker AI-genererede retter
  ['grillet',                   'grilled meat vegetables plate'],
  ['grillspyd',                 'grilled skewers kebab vegetables'],
  ['gratin',                    'gratin baked cheese crust dish'],
  ['ovnbagt',                   'oven baked dish vegetables herbs'],
  ['ovnstegt',                  'roasted oven dish potatoes herbs'],
  ['ovnret',                    'casserole baked dish oven'],
  ['dampet',                    'steamed fish vegetables plate'],
  ['paneret',                   'breaded fried crispy plate'],
  ['friturestegt',              'deep fried crispy food plate'],
  // Generiske madtyper
  ['suppe',                     'homemade soup bowl bread rustic'],
  ['salat',                     'fresh salad bowl vegetables healthy'],
  ['sandwich',                  'sandwich bread filling plate'],
  ['toast',                     'toast sandwich melted cheese plate'],
  ['wrap',                      'wrap tortilla filling plate fresh'],
  ['tærte',                     'savory tart quiche crust plate'],
  ['quiche',                    'quiche lorraine egg cheese tart'],
  ['pizza',                     'homemade pizza tomato cheese basil'],
  ['gryde',                     'stew pot hearty vegetables'],
  ['bøf',                       'beef steak potatoes sauce plate'],
  ['kotelet',                   'pork chop potato vegetables plate'],
  ['filet',                     'fish fillet lemon butter plate'],
  ['schnitzel',                 'schnitzel breaded veal potato salad'],
  ['curry',                     'curry rice coconut milk spices'],
  ['wok',                       'stir fry wok vegetables noodles'],
  ['nudler',                    'noodles broth asian bowl'],
  ['ris',                       'rice bowl garnish vegetables plate'],
  ['pasta',                     'pasta dish sauce parmesan plate'],
  ['kylling',                   'chicken dinner plate herbs vegetables'],
  ['laks',                      'salmon fillet lemon dill plate'],
  ['fisk',                      'fish dinner plate vegetables lemon'],
  ['svinekød',                  'pork dish potatoes gravy plate'],
  ['oksekød',                   'beef dish potatoes vegetables plate'],
  ['lam',                       'lamb chops rosemary potatoes plate'],
  ['tofu',                      'tofu vegetables asian plate healthy'],
  ['æg',                        'egg dish plate breakfast skillet'],
];

function getPhotoQuery(mealName) {
  const n = mealName.toLowerCase();
  for (const [keyword, query] of PHOTO_QUERIES) {
    if (n.includes(keyword)) return query;
  }
  return 'food dinner plate homemade';
}

async function fetchMealPhoto(mealName) {
  const key = 'mp_photo2_' + mealName.toLowerCase().replace(/[^a-z0-9æøå]/g, '_').slice(0, 60);
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return data; // 7-day TTL
    }
  } catch { /* ignore */ }
  try {
    const res = await fetch('photo.php?q=' + encodeURIComponent(getPhotoQuery(mealName)));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    return data;
  } catch {
    return null;
  }
}

async function loadPlanPhotos() {
  if (!currentPlan?.plan) return;
  const tasks = currentPlan.plan.map(day => {
    const dinner = (day.meals || []).find(m => m.type === 'Aftensmad');
    if (!dinner) return Promise.resolve();
    return fetchMealPhoto(dinner.name).then(photo => {
      const slot = document.getElementById('photo-day-' + day.day);
      if (!slot || !photo?.url) return;
      slot.innerHTML = `<img class="day-card-photo" src="${photo.url}" alt="${dinner.name}" loading="lazy">
        <div class="day-card-photo-credit"><a href="${photo.link}" target="_blank" rel="noopener noreferrer">${photo.credit}</a></div>`;
    });
  });
  await Promise.all(tasks);
}

// ─── RECIPE CATALOG ───────────────────────────────────────────────────────────

let activeRecipeCategory = null;
let recipeSearchQuery = '';

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
    <div class="saved-section-label">⭐ Mine gemte retter</div>
    <div class="recipe-grid">${filtered.map(m => `
      <div class="recipe-card saved-recipe-card">
        <div class="recipe-card-photo-placeholder">⭐</div>
        <div class="recipe-card-body">
          <div class="recipe-card-name">${m.name}</div>
          ${m.description ? `<div class="recipe-card-meta">${m.description.slice(0, 60)}${m.description.length > 60 ? '…' : ''}</div>` : ''}
        </div>
        <button class="delete-saved-btn" onclick="deleteSavedMeal('${m.id}')" title="Fjern">×</button>
      </div>`).join('')}
    </div>`;
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
      <div class="empty-icon">🔍</div>
      <div class="empty-text">Ingen resultater for "${recipeSearchQuery}"</div>
      <div class="empty-sub">Prøv et andet ord — f.eks. en ingrediens eller kategori</div>
    </div>`;
    return;
  }
  container.innerHTML = `<div class="recipe-grid">${filtered.map(r => `
    <div class="recipe-card" onclick="showRecipeDetail('${r.id}')">
      <div class="recipe-card-photo-placeholder">${getCategoryEmoji(r.category)}</div>
      <div class="recipe-card-body">
        <div class="recipe-card-name">${r.name}</div>
        <div class="recipe-card-tags">${r.tags.slice(0, 2).map(t => `<span class="cat-chip">${t}</span>`).join('')}</div>
      </div>
      <div class="recipe-card-arrow">›</div>
    </div>`).join('')}</div>`;
}

function filterRecipes(category) {
  activeRecipeCategory = category;
  renderRecipeCategoryFilter();
  renderRecipeGrid();
}

function showRecipeDetail(recipeId) {
  const r = RECIPES.find(rec => rec.id === recipeId);
  if (!r) return;
  document.getElementById('rd-name').textContent = r.name;
  document.getElementById('rd-category').innerHTML =
    `${getCategoryEmoji(r.category)} <span>${catDanish(r.category)}</span>`;
  document.getElementById('rd-tags').innerHTML =
    r.tags.map(t => `<span class="cat-chip">${t}</span>`).join('');
  document.getElementById('rd-ingredients').innerHTML =
    (r.ingredients || []).map(i =>
      `<div class="rd-ingredient"><span class="rd-dot"></span>${i}</div>`
    ).join('');
  document.getElementById('recipe-detail-modal').style.display = 'flex';
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
  const btn = event?.target;
  if (btn) { btn.textContent = '♥'; btn.classList.add('saved'); }
  showToast('Gemt til dine opskrifter ♥');
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
        <div class="empty-icon">🛒</div>
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
    <button class="action-btn" style="width:100%;justify-content:center" onclick="exportShoppingList(window.currentPlan)">📋 Eksportér indkøbsliste</button>
  </div>`;

  // Custom items section
  const customItems = getCustomItems();
  html += `
    <div class="custom-items-section">
      <div class="custom-items-label">🛍️ Egne varer</div>
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
