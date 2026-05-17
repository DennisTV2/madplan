/* ===========================
   MADPLAN — Opskriftskartotek
   Udvid listen her over tid.
   =========================== */

const RECIPES = [

  // ── KLASSISK DANSK ──────────────────────────────────────────────────────────

  {
    id: 'frikadeller',
    name: 'Frikadeller med kartofler og brun sovs',
    category: 'klassisk',
    tags: ['klassisk dansk', 'børnevenlig', 'familie'],
    ingredients: ['svinekød', 'løg', 'æg', 'mel', 'mælk', 'smør', 'kartofler'],
  },
  {
    id: 'hakkebøf',
    name: 'Hakkebøf med bløde løg og kartofler',
    category: 'klassisk',
    tags: ['klassisk dansk', 'hurtig', 'børnevenlig'],
    ingredients: ['oksekød', 'løg', 'smør', 'kartofler'],
  },
  {
    id: 'stegt-flæsk',
    name: 'Stegt flæsk med persillesovs og kartofler',
    category: 'klassisk',
    tags: ['klassisk dansk', 'hurtig'],
    ingredients: ['flæsk', 'kartofler', 'persille', 'smør', 'mel', 'mælk'],
  },
  {
    id: 'flæskesteg',
    name: 'Flæskesteg med rødkål og brunede kartofler',
    category: 'klassisk',
    tags: ['klassisk dansk', 'weekend', 'festmad'],
    ingredients: ['svinekød', 'kartofler', 'rødkål', 'æbler', 'laurbær'],
  },
  {
    id: 'biksemad',
    name: 'Biksemad med spejlæg',
    category: 'klassisk',
    tags: ['klassisk dansk', 'restemat', 'hurtig'],
    ingredients: ['kartofler', 'pølse', 'løg', 'æg', 'smør'],
  },
  {
    id: 'æggekage',
    name: 'Æggekage med bacon og purløg',
    category: 'klassisk',
    tags: ['klassisk dansk', 'hurtig', 'billig'],
    ingredients: ['æg', 'bacon', 'purløg', 'mel', 'mælk', 'smør'],
  },
  {
    id: 'karbonader',
    name: 'Karbonader med kartoffelsalat og remoulade',
    category: 'klassisk',
    tags: ['klassisk dansk', 'børnevenlig'],
    ingredients: ['svinekød', 'rasp', 'æg', 'smør', 'kartofler'],
  },
  {
    id: 'labskovs',
    name: 'Skipper labskovs',
    category: 'klassisk',
    tags: ['klassisk dansk', 'comfort food', 'vinter'],
    ingredients: ['oksekød', 'kartofler', 'løg', 'laurbær'],
  },
  {
    id: 'medister',
    name: 'Medisterpølse med kartofler og rødkål',
    category: 'klassisk',
    tags: ['klassisk dansk', 'enkel'],
    ingredients: ['medisterpølse', 'kartofler', 'rødkål'],
  },
  {
    id: 'svinekam',
    name: 'Stegt svinekam med persillesovs og kartofler',
    category: 'klassisk',
    tags: ['klassisk dansk', 'weekend'],
    ingredients: ['svinekød', 'kartofler', 'persille', 'smør', 'mel', 'mælk'],
  },

  // ── KYLLING ─────────────────────────────────────────────────────────────────

  {
    id: 'ovnkylling',
    name: 'Ovnstegt hel kylling med rosmarin og rodfrugter',
    category: 'kød',
    tags: ['weekend', 'klassisk'],
    ingredients: ['kylling', 'kartofler', 'gulerødder', 'løg', 'hvidløg', 'rosmarin', 'citron'],
  },
  {
    id: 'citronkylling',
    name: 'Citronkylling med ris og dampede grøntsager',
    category: 'kød',
    tags: ['hurtig', 'let'],
    ingredients: ['kylling', 'citron', 'hvidløg', 'ris', 'broccoli', 'smør'],
  },
  {
    id: 'tikka-masala',
    name: 'Kylling tikka masala med basmatiris og raita',
    category: 'internationalt',
    tags: ['indisk', 'krydret'],
    ingredients: ['kylling', 'tomat', 'fløde', 'løg', 'hvidløg', 'ingefær', 'ris', 'yoghurt'],
  },
  {
    id: 'butter-chicken',
    name: 'Butter chicken med naan og raita',
    category: 'internationalt',
    tags: ['indisk', 'mild'],
    ingredients: ['kylling', 'smør', 'tomat', 'fløde', 'løg', 'hvidløg', 'ingefær', 'yoghurt'],
  },
  {
    id: 'kylling-wok',
    name: 'Wok med kylling, grøntsager og sojasovs',
    category: 'internationalt',
    tags: ['asiatisk', 'hurtig', 'let'],
    ingredients: ['kylling', 'gulerødder', 'peberfrugt', 'sojasovs', 'hvidløg', 'ingefær', 'ris'],
  },
  {
    id: 'kyllingewrap',
    name: 'Kyllingewrap med avocado og krydderurt',
    category: 'internationalt',
    tags: ['hurtig', 'let', 'nem'],
    ingredients: ['kylling', 'tortilla', 'salat', 'tomat', 'rødløg', 'creme fraiche'],
  },
  {
    id: 'shawarma',
    name: 'Hjemmelavet kyllingeshawarma med pitabrød',
    category: 'internationalt',
    tags: ['mellemøstlig', 'populær'],
    ingredients: ['kylling', 'pitabrød', 'løg', 'tomat', 'salat', 'hvidløg', 'yoghurt'],
  },
  {
    id: 'kylling-fad',
    name: 'Kylling i fad med kartofler og timian',
    category: 'kød',
    tags: ['enkel', 'weekend'],
    ingredients: ['kylling', 'kartofler', 'løg', 'hvidløg', 'timian', 'citron', 'smør'],
  },

  // ── OKSEKØD ─────────────────────────────────────────────────────────────────

  {
    id: 'bolognese',
    name: 'Spaghetti bolognese med revet parmesan',
    category: 'pasta',
    tags: ['italiensk', 'familie', 'fryseegnet'],
    ingredients: ['oksekød', 'spaghetti', 'tomat', 'løg', 'hvidløg', 'gulerødder', 'parmesan'],
  },
  {
    id: 'lasagne',
    name: 'Lasagne al forno med bechamelsovs',
    category: 'pasta',
    tags: ['italiensk', 'familie', 'fryseegnet'],
    ingredients: ['oksekød', 'lasagneplader', 'tomat', 'løg', 'hvidløg', 'mælk', 'mel', 'smør', 'ost'],
  },
  {
    id: 'chili-con-carne',
    name: 'Chili con carne med ris og rømme',
    category: 'internationalt',
    tags: ['mexicansk', 'fryseegnet', 'krydret'],
    ingredients: ['oksekød', 'kidneybønner', 'tomat', 'løg', 'hvidløg', 'chili', 'ris'],
  },
  {
    id: 'tacos',
    name: 'Tacos med hakket oksekød og salsa',
    category: 'internationalt',
    tags: ['mexicansk', 'børnevenlig', 'familie'],
    ingredients: ['oksekød', 'tortilla', 'tomat', 'salat', 'løg', 'ost', 'majs'],
  },
  {
    id: 'burger',
    name: 'Hjemmelavede burgere med pommes frites',
    category: 'internationalt',
    tags: ['populær', 'weekend', 'børnevenlig'],
    ingredients: ['oksekød', 'burgerboller', 'salat', 'tomat', 'løg', 'ost', 'kartofler'],
  },
  {
    id: 'moussaka',
    name: 'Moussaka med aubergine og bechamelsovs',
    category: 'internationalt',
    tags: ['græsk', 'weekend'],
    ingredients: ['oksekød', 'aubergine', 'løg', 'hvidløg', 'tomat', 'mælk', 'mel', 'smør', 'ost'],
  },

  // ── SVINEKØD ────────────────────────────────────────────────────────────────

  {
    id: 'pulled-pork',
    name: 'Pulled pork i burgerboller med coleslaw',
    category: 'internationalt',
    tags: ['weekend', 'populær'],
    ingredients: ['svinekød', 'burgerboller', 'hvidkål', 'gulerødder', 'æbler', 'mayonnaise'],
  },

  // ── FISK ────────────────────────────────────────────────────────────────────

  {
    id: 'laks-ovn',
    name: 'Ovnbagt laks med dild, kartofler og agurk-cremefraiche',
    category: 'fisk',
    tags: ['let', 'sund', 'hurtig'],
    ingredients: ['laks', 'citron', 'dild', 'kartofler', 'smør', 'creme fraiche', 'agurk'],
  },
  {
    id: 'laks-pasta',
    name: 'Pasta med laks og cremet dild-flødesovs',
    category: 'fisk',
    tags: ['hurtig', 'let'],
    ingredients: ['laks', 'pasta', 'fløde', 'hvidløg', 'dild', 'citron'],
  },
  {
    id: 'fiskefrikadeller',
    name: 'Fiskefrikadeller med remoulade og kogte kartofler',
    category: 'fisk',
    tags: ['klassisk dansk'],
    ingredients: ['fisk', 'æg', 'mel', 'dild', 'kartofler', 'løg'],
  },
  {
    id: 'torsk-paneret',
    name: 'Paneret torsk med remoulade, ærter og pommes frites',
    category: 'fisk',
    tags: ['klassisk', 'børnevenlig'],
    ingredients: ['torsk', 'rasp', 'æg', 'kartofler', 'ærter', 'citron'],
  },
  {
    id: 'fiskesuppe',
    name: 'Cremet fiskesuppe med grøntsager og dild',
    category: 'fisk',
    tags: ['suppe', 'sund'],
    ingredients: ['fisk', 'gulerødder', 'løg', 'fløde', 'kartofler', 'dild'],
  },
  {
    id: 'rejer-hvidløg',
    name: 'Rejer stegt i hvidløgssmør med brød og citron',
    category: 'fisk',
    tags: ['hurtig', 'festmad'],
    ingredients: ['rejer', 'smør', 'hvidløg', 'persille', 'citron', 'brød'],
  },

  // ── PASTA ───────────────────────────────────────────────────────────────────

  {
    id: 'carbonara',
    name: 'Pasta carbonara med bacon og parmesan',
    category: 'pasta',
    tags: ['italiensk', 'hurtig'],
    ingredients: ['spaghetti', 'bacon', 'æg', 'parmesan', 'hvidløg'],
  },
  {
    id: 'pasta-pesto',
    name: 'Pasta med pesto, cherrytomater og mozzarella',
    category: 'pasta',
    tags: ['italiensk', 'hurtig', 'vegetarisk'],
    ingredients: ['pasta', 'pesto', 'tomat', 'mozzarella', 'parmesan', 'hvidløg'],
  },
  {
    id: 'pasta-rejer',
    name: 'Linguine med rejer, hvidløg og persille',
    category: 'pasta',
    tags: ['italiensk', 'festmad'],
    ingredients: ['pasta', 'rejer', 'hvidløg', 'smør', 'persille', 'citron', 'tomat'],
  },
  {
    id: 'pasta-primavera',
    name: 'Pasta primavera med årstidens grøntsager og fløde',
    category: 'pasta',
    tags: ['vegetarisk', 'forår'],
    ingredients: ['pasta', 'broccoli', 'gulerødder', 'ærter', 'løg', 'hvidløg', 'fløde', 'parmesan'],
  },

  // ── VEGETAR ─────────────────────────────────────────────────────────────────

  {
    id: 'shakshuka',
    name: 'Shakshuka — æg pocheret i krydret tomatsauce',
    category: 'vegetar',
    tags: ['vegetarisk', 'hurtig', 'mellemøstlig'],
    ingredients: ['æg', 'tomat', 'løg', 'hvidløg', 'peberfrugt', 'spidskommen', 'brød'],
  },
  {
    id: 'dahl',
    name: 'Røde linser dahl med kokosmælk, basmatiris og naan',
    category: 'vegetar',
    tags: ['vegetarisk', 'vegansk', 'indisk'],
    ingredients: ['linser', 'kokosmælk', 'tomat', 'løg', 'hvidløg', 'ingefær', 'karry', 'ris'],
  },
  {
    id: 'vegetarisk-chili',
    name: 'Vegetarisk chili con carne med ris og rømme',
    category: 'vegetar',
    tags: ['vegetarisk', 'vegansk', 'fryseegnet'],
    ingredients: ['kidneybønner', 'tomat', 'løg', 'hvidløg', 'peberfrugt', 'majs', 'chili', 'ris'],
  },
  {
    id: 'kikærte-karry',
    name: 'Kikærtekarry med spinat, kokosmælk og basmatiris',
    category: 'vegetar',
    tags: ['vegetarisk', 'vegansk', 'indisk'],
    ingredients: ['kikærter', 'spinat', 'tomat', 'løg', 'hvidløg', 'ingefær', 'kokosmælk', 'karry', 'ris'],
  },
  {
    id: 'grøntsagssuppe',
    name: 'Hjemmelavet grøntsagssuppe med brød',
    category: 'vegetar',
    tags: ['vegetarisk', 'vegansk', 'sund'],
    ingredients: ['gulerødder', 'løg', 'selleri', 'kartofler', 'persille', 'brød'],
  },
  {
    id: 'tomatsuppe',
    name: 'Cremet tomatsuppe med croutoner',
    category: 'vegetar',
    tags: ['vegetarisk', 'hurtig'],
    ingredients: ['tomat', 'løg', 'hvidløg', 'fløde', 'smør', 'brød'],
  },
  {
    id: 'falafler',
    name: 'Hjemmelavede falafler med hummus og pitabrød',
    category: 'vegetar',
    tags: ['vegetarisk', 'vegansk', 'mellemøstlig'],
    ingredients: ['kikærter', 'løg', 'hvidløg', 'persille', 'spidskommen', 'pitabrød', 'tomat', 'salat'],
  },
  {
    id: 'risotto',
    name: 'Champignonrisotto med parmesan og timian',
    category: 'vegetar',
    tags: ['italiensk', 'vegetarisk', 'weekend'],
    ingredients: ['risottoris', 'champignon', 'løg', 'hvidløg', 'parmesan', 'smør', 'fløde'],
  },

  // ── SUPPER ──────────────────────────────────────────────────────────────────

  {
    id: 'gule-ærter',
    name: 'Gule ærter med røget svinekød og grøntsager',
    category: 'suppe',
    tags: ['klassisk dansk', 'vinter', 'comfort food'],
    ingredients: ['gule ærter', 'svinekød', 'gulerødder', 'selleri', 'løg', 'kartofler'],
  },
  {
    id: 'linsesuppe',
    name: 'Krydret linsesuppe med tomat og spidskommen',
    category: 'suppe',
    tags: ['vegetarisk', 'vegansk', 'hurtig'],
    ingredients: ['linser', 'løg', 'hvidløg', 'gulerødder', 'tomat', 'spidskommen'],
  },

  // ── DIVERSE ─────────────────────────────────────────────────────────────────

  {
    id: 'fried-rice',
    name: 'Stegt ris med æg, grøntsager og sojasovs',
    category: 'internationalt',
    tags: ['asiatisk', 'restemat', 'hurtig'],
    ingredients: ['ris', 'æg', 'sojasovs', 'løg', 'gulerødder', 'ærter', 'hvidløg'],
  },
  {
    id: 'paella',
    name: 'Simpel paella med kylling, rejer og paprika',
    category: 'internationalt',
    tags: ['spansk', 'weekend', 'festmad'],
    ingredients: ['ris', 'kylling', 'rejer', 'løg', 'hvidløg', 'tomat', 'peberfrugt'],
  },

];
