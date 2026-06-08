<?php
/**
 * MadPlan — Rigtige tilbud fra eTilbudsavis (Tjek/ShopGun) API
 * GET ?shops=netto,rema,lidl
 * Returnerer: { grouped: { shopId: [{ heading, price, quantity, image, till }] } }
 * Cache: 2 timer via temp-filer (server-side) + 30 min sessionStorage (klient)
 */
require_once __DIR__ . '/ratelimit.php';
session_configure();
session_start();

header('Content-Type: application/json; charset=utf-8');
cors_send();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Auth ──────────────────────────────────────────────────────────────────────
if (empty($_SESSION['mp_user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'login_required', 'message' => 'Login kræves']);
    exit;
}

// ── Rate limit ────────────────────────────────────────────────────────────────
$userEmail = $_SESSION['mp_user']['email'] ?? '';
$isDemo    = ($userEmail === 'demo@madplan.dk');
$maxCalls  = $isDemo ? 10 : 60; // 60 kald/time pr. bruger
if (!rl_check('offers_' . md5($userEmail), $maxCalls, 3600)) {
    http_response_code(429);
    echo json_encode(['error' => 'rate_limit', 'message' => 'For mange kald — prøv igen om lidt']);
    exit;
}

// ── Dealer IDs (hardkodet — verificeret via API maj 2025) ─────────────────────
const DEALER_MAP = [
    'netto'  => '9ba51',
    'rema'   => '11deC',
    'lidl'   => '71c90',
    '365'    => 'DWZE1w',
    'fakta'  => '88ddE',   // SPAR (fakta-slots i app)
    'bilka'  => '93f13',
    'foetex' => 'bdf5A',
    'meny'   => 'e8b3C',
];

// ── Valider input ─────────────────────────────────────────────────────────────
$shops = array_values(array_filter(
    array_map('trim', explode(',', $_GET['shops'] ?? '')),
    fn($s) => isset(DEALER_MAP[$s])
));

if (empty($shops)) {
    echo json_encode(['grouped' => new stdClass(), 'count' => 0]);
    exit;
}

// ── Server-side cache (2 timer) ───────────────────────────────────────────────
$cacheKey  = md5('v3_' . implode(',', $shops));
$cacheFile = sys_get_temp_dir() . '/mpoffers_' . $cacheKey . '.json';
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 7200 && filesize($cacheFile) > 10) {
    // Læs med shared lock — undgår partial-read fra concurrent skrivning
    $fh = @fopen($cacheFile, 'r');
    if ($fh && flock($fh, LOCK_SH)) {
        $cached = stream_get_contents($fh);
        flock($fh, LOCK_UN);
        fclose($fh);
        if ($cached !== false && $cached !== '') {
            header('X-Cache: HIT');
            echo $cached;
            exit;
        }
    } elseif ($fh) { fclose($fh); }
}

// ── Hent tilbud per butik ─────────────────────────────────────────────────────
$grouped = [];

foreach ($shops as $shopId) {
    $dealerId = DEALER_MAP[$shopId];
    $url = 'https://api.etilbudsavis.dk/v2/offers?' . http_build_query([
        'dealer_ids' => $dealerId,
        'limit'      => 24,
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'User-Agent: MadPlan/3.0',
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$raw || $code !== 200) continue;

    $offers = json_decode($raw, true);
    if (!is_array($offers)) continue;

    $grouped[$shopId] = array_values(array_map(function ($o) {
        // Mængde / enhed
        $qty  = '';
        $unit = $o['quantity']['unit']['symbol'] ?? '';
        $from = $o['quantity']['size']['from']   ?? null;
        $to   = $o['quantity']['size']['to']     ?? null;
        $pcs  = $o['quantity']['pieces']['from'] ?? null;

        if ($unit && $from !== null) {
            if ($unit === 'g' && $from >= 1000) {
                $qty = round($from / 1000, 1) . 'kg';
            } elseif ($unit === 'cl' && $from >= 100) {
                $qty = round($from / 100, 1) . 'L';
            } elseif ($to && $to !== $from) {
                $qty = "{$from}-{$to}{$unit}";
            } else {
                $qty = "{$from}{$unit}";
            }
        } elseif ($pcs && $pcs > 1) {
            $qty = "{$pcs} stk";
        }

        return [
            'heading'  => trim($o['heading'] ?? ''),
            'price'    => isset($o['pricing']['price'])  ? (float) $o['pricing']['price']  : null,
            'prePrice' => isset($o['pricing']['pre_price']) ? (float) $o['pricing']['pre_price'] : null,
            'quantity' => $qty,
            'image'    => $o['images']['thumb'] ?? null,
            'till'     => isset($o['run_till']) ? substr($o['run_till'], 0, 10) : null,
        ];
    }, array_slice($offers, 0, 20)));
}

// ── Gem cache og returner ─────────────────────────────────────────────────────
$result = [
    'grouped' => empty($grouped) ? new stdClass() : $grouped,
    'count'   => array_sum(array_map('count', $grouped)),
    'source'  => 'etilbudsavis.dk',
];
$json = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Atomisk skrivning: skriv til temp-fil, rename — undgår partial-read
$tmpFile = $cacheFile . '.tmp.' . getmypid();
if (@file_put_contents($tmpFile, $json, LOCK_EX) !== false) {
    @rename($tmpFile, $cacheFile);
}
header('X-Cache: MISS');
echo $json;
