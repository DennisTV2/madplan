<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: public, max-age=1800');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('ETILBUD_BASE', 'https://api.etilbudsavis.dk/v2');

// Ingen API-nøgle nødvendig — eTilbudsavis API er åben
function etGet(string $path): array {
    $ch = curl_init(ETILBUD_BASE . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'User-Agent: MadPlan/2.0 (madplan.birkebøg.dk)',
        ],
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    $parsed = json_decode($body ?: '[]', true);
    return [$code, is_array($parsed) ? $parsed : [], $err];
}

// Vores interne shop-ID → søgetekst i eTilbudsavis
const SHOP_QUERIES = [
    'netto'  => 'Netto',
    'rema'   => 'Rema 1000',
    'lidl'   => 'Lidl',
    'fakta'  => 'Spar',
    'meny'   => 'Meny',
    'aldi'   => 'Aldi',
    'coop'   => 'Coop',
    '365'    => '365discount',
];

// ── Valider input ─────────────────────────────────────────────────────────────
$requestedShops = array_values(array_unique(array_filter(
    array_map('trim', explode(',', $_GET['shops'] ?? ''))
)));
if (empty($requestedShops)) {
    echo json_encode(['grouped' => [], 'count' => 0]);
    exit;
}

// ── Hent alle danske dealers (session-cached 1 time) ─────────────────────────
$allDealers = $_SESSION['etilbud_dealers'] ?? null;
if (!$allDealers) {
    [$code, $data] = etGet('/dealers?country_id=DK&limit=200');
    $allDealers = ($code === 200) ? $data : [];
    if (!empty($allDealers)) {
        $_SESSION['etilbud_dealers']    = $allDealers;
        $_SESSION['etilbud_dealers_ts'] = time();
    }
}

// ── Match vores shops til dealer-IDs ─────────────────────────────────────────
$dealerMap = [];
foreach ($requestedShops as $shopId) {
    $q = SHOP_QUERIES[$shopId] ?? null;
    if (!$q) continue;
    foreach ($allDealers as $d) {
        if (stripos($d['name'] ?? '', $q) !== false) {
            $dealerMap[$shopId] = $d['id'];
            break;
        }
    }
}

if (empty($dealerMap)) {
    // Fallback: søg direkte via API
    foreach ($requestedShops as $shopId) {
        $q = SHOP_QUERIES[$shopId] ?? null;
        if (!$q || isset($dealerMap[$shopId])) continue;
        [$code, $data] = etGet('/dealers?country_id=DK&query=' . urlencode($q) . '&limit=10');
        foreach ($data as $d) {
            if (stripos($d['name'] ?? '', $q) !== false) {
                $dealerMap[$shopId] = $d['id'];
                break;
            }
        }
    }
}

if (empty($dealerMap)) {
    http_response_code(404);
    echo json_encode(['error' => 'no_dealers', 'message' => 'Ingen butikker fundet i eTilbudsavis']);
    exit;
}

// ── Hent tilbud for alle matchede dealers ─────────────────────────────────────
$dealerIds = implode(',', array_values($dealerMap));
[$code, $offers, $curlErr] = etGet('/offers/search?dealer_id=' . $dealerIds . '&limit=200&country_id=DK');

if ($code !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'api_error', 'status' => $code, 'curl' => $curlErr]);
    exit;
}

// ── Gruppér og formater ───────────────────────────────────────────────────────
$grouped = [];

foreach ($offers as $o) {
    $storeId = $o['storeId'] ?? ($o['dealer_id'] ?? '');

    // Find vores shopId ud fra dealer-match
    $shopId = null;
    foreach ($dealerMap as $sid => $did) {
        if ($did === $storeId) { $shopId = $sid; break; }
    }
    // Fallback: match på store-navn
    if (!$shopId) {
        $storeName = strtolower($o['store'] ?? '');
        foreach (SHOP_QUERIES as $sid => $q) {
            if (in_array($sid, $requestedShops) && stripos($storeName, strtolower($q)) !== false) {
                $shopId = $sid;
                break;
            }
        }
    }
    if (!$shopId) continue;

    $grouped[$shopId][] = [
        'heading'   => trim($o['heading'] ?? ''),
        'price'     => isset($o['price']) ? (float)round($o['price'], 2) : null,
        'prePrice'  => isset($o['prePrice']) ? (float)round($o['prePrice'], 2) : null,
        'quantity'  => trim(($o['quantity'] ?? '') . ' ' . ($o['unit'] ?? '')),
        'store'     => $o['store'] ?? (SHOP_QUERIES[$shopId] ?? $shopId),
        'validUntil'=> substr($o['validUntil'] ?? '', 0, 10),
        'on_sale'   => true,
    ];
}

echo json_encode([
    'grouped' => $grouped,
    'count'   => array_sum(array_map('count', $grouped)),
    'source'  => 'etilbudsavis.dk',
]);
