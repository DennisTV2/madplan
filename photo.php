<?php
/**
 * MadPlan — madbilleder fra Wikipedia/Wikimedia Commons
 *
 * GET photo.php?dish=<dansk retnavn>&en=<engelsk Wikipedia-titel (valgfri)>
 * → { url, credit, link }  eller  { url: null }
 *
 * Princip: et forkert billede er værre end intet billede.
 *  1. Kendte retter slås op i en fast liste (dansk navn → Wikipedia-artikel).
 *  2. Ellers bruges AI'ens engelske retnavn – men kun hvis artiklen handler om mad.
 *  3. Intet match → url: null, og appen viser en illustration i stedet.
 * Resultatet caches på serveren, så samme ret altid får samme billede.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=604800');

const MP_UA        = 'MadPlan/1.0 (dansk madplan-app; https://birkeboeg.dk)';
const MP_THUMB     = 960;                     // Wikimedias standardstørrelse
const MP_CACHE_DIR = __DIR__ . '/cache/photos';
const MP_TTL_HIT   = 90 * 86400;              // fundne billeder: 90 dage
const MP_TTL_MISS  = 7 * 86400;               // ikke fundet: prøv igen om 7 dage

// Dansk nøgleord (i retnavnet) → Wikipedia-kandidater [sprog, titel].
// Mest specifikke først. Kun retter – aldrig råvarer (ellers "laks" = levende fisk).
const MP_DISHES = [
    // Dansk/nordisk
    ['svensk pølseret',     [['en', 'Korv Stroganoff']]],
    ['stegt flæsk',         [['da', 'Stegt flæsk med persillesovs'], ['en', 'Stegt flæsk']]],
    ['flæskesteg',          [['da', 'Flæskesteg'], ['en', 'Flæskesteg']]],
    ['fiskefrikadelle',     [['da', 'Fiskefrikadelle'], ['en', 'Fishcake']]],
    ['frikadelle',          [['da', 'Frikadelle'], ['en', 'Frikadeller']]],
    ['bøf lindstrøm',       [['da', 'Bøf Lindstrøm'], ['en', 'Biff à la Lindström']]],
    ['hakkebøf',            [['da', 'Hakkebøf'], ['en', 'Hamburg steak']]],
    ['millionbøf',          [['da', 'Millionbøf']]],
    ['biksemad',            [['da', 'Biksemad'], ['en', 'Pyttipanna']]],
    ['æggekage',            [['da', 'Æggekage']]],
    ['karbonade',           [['da', 'Karbonade']]],
    ['labskovs',            [['da', 'Labskovs'], ['en', 'Lobscouse']]],
    ['medisterpølse',       [['da', 'Medisterpølse'], ['en', 'Medisterpølse']]],
    ['boller i karry',      [['da', 'Boller i karry']]],
    ['brændende kærlighed', [['da', 'Brændende kærlighed']]],
    ['tartelet',            [['da', 'Tarteletter']]],
    ['pølsehorn',           [['da', 'Pølsehorn']]],
    ['ærtesuppe',           [['da', 'Gule ærter'], ['en', 'Pea soup']]],
    ['paneret torsk',       [['en', 'Fish and chips']]],
    ['fiskeburger',         [['en', 'Fish sandwich']]],
    ['fishcake',            [['en', 'Fishcake']]],
    ['fiskekage',           [['en', 'Fishcake']]],
    ['røget laks',          [['en', 'Lox']]],
    ['bagels med',          [['en', 'Lox']]],
    ['helstegt kylling',    [['en', 'Roast chicken']]],
    ['hel kylling',         [['en', 'Roast chicken']]],
    ['ovnstegt hel',        [['en', 'Roast chicken']]],
    ['koteletter',          [['en', 'Pork chop']]],
    ['svinekotelet',        [['en', 'Pork chop']]],
    ['svineribben',         [['en', 'Spare ribs']]],
    ['oksesteg',            [['en', 'Roast beef']]],
    ['steak med bearnaise', [['en', 'Steak frites']]],
    ['schnitzel',           [['en', 'Schnitzel']]],
    ['blomkålsgratin',      [['en', 'Cauliflower cheese']]],
    ['stuffed peberfrugt',  [['en', 'Stuffed peppers']]],
    ['fyldte peberfrugt',   [['en', 'Stuffed peppers']]],
    // Pasta
    ['bolognese',           [['en', 'Bolognese sauce']]],
    ['carbonara',           [['en', 'Carbonara']]],
    ['arrabiata',           [['en', 'Penne alla arrabbiata']]],
    ['arrabbiata',          [['en', 'Penne alla arrabbiata']]],
    ['primavera',           [['en', 'Pasta primavera']]],
    ['bagt feta pasta',     [['en', 'Baked feta pasta']]],
    ['ziti',                [['en', 'Baked ziti']]],
    ['linguine med rejer',  [['en', 'Shrimp scampi']]],
    ['pastasalat',          [['en', 'Pasta salad']]],
    ['lasagne',             [['en', 'Lasagna']]],
    ['lasagnette',          [['en', 'Lasagna']]],
    ['gnocchi',             [['en', 'Gnocchi']]],
    ['tortellini',          [['en', 'Tortellini']]],
    ['pizza',               [['en', 'Pizza']]],
    // Kylling og internationalt
    ['tikka masala',        [['en', 'Chicken tikka masala']]],
    ['butter chicken',      [['en', 'Butter chicken']]],
    ['butter paneer',       [['en', 'Paneer makhani']]],
    ['karahi',              [['en', 'Karahi']]],
    ['korma',               [['en', 'Korma']]],
    ['biryani',             [['en', 'Biryani']]],
    ['chana masala',        [['en', 'Chana masala']]],
    ['dahl',                [['en', 'Dal']]],
    ['dhal',                [['en', 'Dal']]],
    ['linser dahl',         [['en', 'Dal']]],
    ['grøn thai karry',     [['en', 'Green curry']]],
    ['grøn karry',          [['en', 'Green curry']]],
    ['rød thai karry',      [['en', 'Red curry']]],
    ['rød karry',           [['en', 'Red curry']]],
    ['panang',              [['en', 'Phanaeng curry']]],
    ['pad krapow',          [['en', 'Phat kaphrao']]],
    ['teriyaki',            [['en', 'Teriyaki']]],
    ['katsu',               [['en', 'Chicken katsu']]],
    ['stegt ris',           [['en', 'Fried rice']]],
    ['okonomiyaki',         [['en', 'Okonomiyaki']]],
    ['ramen',               [['en', 'Ramen']]],
    ['pho ',                [['en', 'Pho']]],
    ['sushi',               [['en', 'Sushi']]],
    ['forårsrulle',         [['en', 'Spring roll']]],
    ['shawarma',            [['en', 'Shawarma']]],
    ['kebab',               [['en', 'Kebab']]],
    ['falafel',             [['en', 'Falafel']]],
    ['moussaka',            [['en', 'Moussaka']]],
    ['gullasch',            [['en', 'Goulash']]],
    ['stroganoff',          [['en', 'Beef Stroganoff']]],
    ['osso buc',            [['en', 'Ossobuco']]],
    ['paella',              [['en', 'Paella']]],
    ['risotto',             [['en', 'Risotto']]],
    ['chili con carne',     [['en', 'Chili con carne']]],
    ['chili sin carne',     [['en', 'Chili con carne']]],
    ['sloppy joe',          [['en', 'Sloppy joe']]],
    ['cheeseburger',        [['en', 'Cheeseburger']]],
    ['burger',              [['en', 'Hamburger']]],
    ['pulled pork',         [['en', 'Pulled pork']]],
    ['tacosuppe',           [['en', 'Tortilla soup']]],
    ['tortillasuppe',       [['en', 'Tortilla soup']]],
    ['taco',                [['en', 'Taco']]],
    ['enchilada',           [['en', 'Enchilada']]],
    ['quesadilla',          [['en', 'Quesadilla']]],
    ['fajita',              [['en', 'Fajita']]],
    ['nachos',              [['en', 'Nachos']]],
    ['kyllinge nuggets',    [['en', 'Chicken nugget']]],
    ['cæsar',               [['en', 'Caesar salad']]],
    ['wok',                 [['en', 'Stir frying']]],
    ['rejer stegt i hvidløg', [['en', 'Gambas al ajillo']]],
    ['wrap',                [['en', 'Wrap (food)']]],
    // Supper og tærter
    ['tomatsuppe',          [['en', 'Tomato soup']]],
    ['kartoffelsuppe',      [['en', 'Potato soup']]],
    ['linsesuppe',          [['en', 'Lentil soup']]],
    ['grøntsagssuppe',      [['en', 'Vegetable soup']]],
    ['kyllingesuppe',       [['en', 'Chicken soup']]],
    ['fiskesuppe',          [['en', 'Fish soup']]],
    ['porretærte',          [['en', 'Quiche']]],
    ['tærte med porre',     [['en', 'Quiche']]],
    ['quiche',              [['en', 'Quiche']]],
    // Morgenmad
    ['havregrød',           [['da', 'Havregrød'], ['en', 'Porridge']]],
    ['grød',                [['en', 'Porridge']]],
    ['pandekage',           [['en', 'Pancake']]],
    ['smoothie',            [['en', 'Smoothie']]],
    ['røræg',               [['en', 'Scrambled eggs']]],
    ['spejlæg',             [['en', 'Fried egg']]],
];

// Ord der viser, at en artikel handler om en ret (bruges til AI'ens forslag)
const MP_FOOD_WORDS = '/\b(dish|dishes|food|cuisine|meal|soup|stew|sauce|recipe|curry|salad|pasta|sandwich|snack|bread|pastry|casserole|porridge|breakfast|ret|retter|mad|køkken|suppe|gryde|sovs)\b/iu';

function mp_out(array $data): void {
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function mp_get_json(string $url): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['User-Agent: ' . MP_UA, 'Accept: application/json'],
        CURLOPT_TIMEOUT        => 6,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200 || !$body) return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}

// Slår én Wikipedia-artikel op → billede + om artiklen handler om mad
function mp_wiki_page(string $lang, string $title): ?array {
    if (!preg_match('/^[a-z]{2,3}$/', $lang) || $title === '') return null;
    $url = "https://{$lang}.wikipedia.org/w/api.php?" . http_build_query([
        'action' => 'query', 'format' => 'json', 'formatversion' => 2, 'redirects' => 1,
        'prop' => 'pageimages|description|extracts',
        'piprop' => 'thumbnail|name', 'pithumbsize' => MP_THUMB,
        'exintro' => 1, 'explaintext' => 1, 'exsentences' => 2,
        'titles' => $title,
    ]);
    $j = mp_get_json($url);
    $page = $j['query']['pages'][0] ?? null;
    if (!$page || !empty($page['missing']) || empty($page['thumbnail']['source'])) return null;
    $text = ($page['description'] ?? '') . ' ' . ($page['extract'] ?? '');
    return [
        'url'     => $page['thumbnail']['source'],
        'file'    => $page['pageimage'] ?? '',
        'article' => "https://{$lang}.wikipedia.org/wiki/" . rawurlencode(str_replace(' ', '_', $page['title'])),
        'is_food' => (bool)preg_match(MP_FOOD_WORDS, $text),
    ];
}

// Fotograf + licens fra Wikimedia Commons (påkrævet af CC-licenserne)
function mp_attribution(string $file): ?array {
    if ($file === '') return null;
    $j = mp_get_json('https://commons.wikimedia.org/w/api.php?' . http_build_query([
        'action' => 'query', 'format' => 'json', 'formatversion' => 2,
        'prop' => 'imageinfo', 'iiprop' => 'extmetadata|url', 'titles' => 'File:' . $file,
    ]));
    $info = $j['query']['pages'][0]['imageinfo'][0] ?? null;
    if (!$info) return null;
    $meta    = $info['extmetadata'] ?? [];
    $artist  = trim(html_entity_decode(strip_tags($meta['Artist']['value'] ?? ''), ENT_QUOTES, 'UTF-8'));
    $license = trim($meta['LicenseShortName']['value'] ?? '');
    $artist  = mb_substr(preg_replace('/\s+/', ' ', $artist), 0, 60);
    return [
        'credit' => 'Foto: ' . ($artist ?: 'Wikimedia Commons') . ($license ? ' · ' . $license : ''),
        'link'   => $info['descriptionurl'] ?? null,
    ];
}

function mp_candidates(string $dish, string $en): array {
    $d = ' ' . mb_strtolower($dish, 'UTF-8') . ' ';
    $c = [];
    foreach (MP_DISHES as [$keyword, $titles]) {
        if (mb_strpos($d, $keyword) !== false) {
            foreach ($titles as $t) $c[] = [$t[0], $t[1], true];   // kendt ret: stol på listen
            break;
        }
    }
    if ($en !== '') $c[] = ['en', $en, false];                     // AI-forslag: skal bestå madtjek
    return $c;
}

// ── Input ──────────────────────────────────────────────────────────────────────
$dish = trim(mb_substr((string)($_GET['dish'] ?? $_GET['q'] ?? ''), 0, 120));
$en   = trim(mb_substr((string)($_GET['en'] ?? ''), 0, 80));
if ($dish === '' && $en === '') mp_out(['url' => null]);

// ── Cache ──────────────────────────────────────────────────────────────────────
$key  = md5(mb_strtolower($dish . '|' . $en, 'UTF-8'));
$file = MP_CACHE_DIR . '/' . $key . '.json';
if (is_file($file)) {
    $cached = json_decode((string)file_get_contents($file), true);
    $ttl = empty($cached['url']) ? MP_TTL_MISS : MP_TTL_HIT;
    if (is_array($cached) && filemtime($file) > time() - $ttl) mp_out($cached);
}

// ── Opslag ─────────────────────────────────────────────────────────────────────
$result = ['url' => null];
foreach (mp_candidates($dish, $en) as [$lang, $title, $trusted]) {
    $page = mp_wiki_page($lang, $title);
    if (!$page || (!$trusted && !$page['is_food'])) continue;
    $attr = mp_attribution($page['file']);
    $result = [
        'url'    => $page['url'],
        'credit' => $attr['credit'] ?? 'Foto: Wikipedia',
        'link'   => $attr['link'] ?? $page['article'],
        'source' => 'wikipedia',
    ];
    break;
}

if (!is_dir(MP_CACHE_DIR)) @mkdir(MP_CACHE_DIR, 0755, true);
@file_put_contents($file, json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
mp_out($result);
