<?php
/**
 * MadPlan — Anthropic API Proxy
 * Kræver aktiv PHP-session (bruger skal være logget ind).
 * Rate limit: 30 kald/time pr. bruger (5 for demo-konto).
 */

require_once __DIR__ . '/ratelimit.php';
session_configure();
session_start();

require_once __DIR__ . '/config.php';

// ── Autentificering ───────────────────────────────────────────────────────────
if (empty($_SESSION['mp_user'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Login kræves']);
    exit;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
$userEmail = $_SESSION['mp_user']['email'] ?? '';
$isDemo    = ($userEmail === 'demo@madplan.dk');
$rlLimit   = $isDemo ? 5 : 30;  // kald pr. time
$rlKey     = 'proxy_' . md5($userEmail);

if (!rl_check($rlKey, $rlLimit, 3600)) {
    http_response_code(429);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'For mange AI-kald – vent lidt og prøv igen om en time']);
    exit;
}

// ── CORS (kun eget domæne) ────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Kun POST tilladt']);
    exit;
}

// ── Request → Anthropic payload ───────────────────────────────────────────────
// Kun godkendte modeller (ellers kunne en bruger vælge en dyr model selv)
const MP_MODELS        = ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-sonnet-4-6'];
const MP_DEFAULT_MODEL = 'claude-sonnet-5-5';
const MP_MAX_TOKENS    = 16000;
// Sonnet/Haiku 5.5 "tænker" som standard før de svarer (skjult, men tæller med i
// max_tokens og koster tokens). Det gav tomme svar/timeouts. Vi slår den
// forudgående tænkning fra – værdien er forskellig pr. model (forkert værdi = 400).
const MP_THINKING_OFF = [
    'claude-sonnet-5-5' => ['type' => 'between_tools'],
    'claude-haiku-5-5'  => ['type' => 'disabled'],
];

$rawBody = file_get_contents('php://input');
$reqData = json_decode($rawBody ?: '{}', true);

if (!is_array($reqData) || !isset($reqData['messages']) || !is_array($reqData['messages'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Ugyldigt request-format']);
    exit;
}

function mp_build_payload(array $req, bool $stream): array {
    $model = in_array($req['model'] ?? '', MP_MODELS, true) ? $req['model'] : MP_DEFAULT_MODEL;
    $p = [
        'model'      => $model,
        'max_tokens' => max(1, min((int)($req['max_tokens'] ?? 8000), MP_MAX_TOKENS)),
        'messages'   => $req['messages'],
    ];
    if ($stream) $p['stream'] = true;
    if (isset(MP_THINKING_OFF[$model])) $p['thinking'] = MP_THINKING_OFF[$model];

    // System-prompt: streng eller tekstblokke (evt. med cache_control: ephemeral)
    if (isset($req['system'])) {
        if (is_string($req['system'])) {
            $p['system'] = $req['system'];
        } elseif (is_array($req['system'])) {
            $blocks = [];
            foreach ($req['system'] as $b) {
                if (!is_array($b) || ($b['type'] ?? '') !== 'text' || !is_string($b['text'] ?? null)) continue;
                $blk = ['type' => 'text', 'text' => $b['text']];
                if (($b['cache_control']['type'] ?? '') === 'ephemeral') $blk['cache_control'] = ['type' => 'ephemeral'];
                $blocks[] = $blk;
            }
            if ($blocks) $p['system'] = $blocks;
        }
    }

    // Struktureret output (JSON schema) – kun format-feltet sendes videre
    $fmt = $req['output_config']['format'] ?? null;
    if (is_array($fmt) && ($fmt['type'] ?? '') === 'json_schema' && is_array($fmt['schema'] ?? null)) {
        $p['output_config'] = ['format' => ['type' => 'json_schema', 'schema' => $fmt['schema']]];
    }
    return $p;
}

function mp_curl(array $payload) {
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-api-key: ' . ANTHROPIC_API_KEY,
            'anthropic-version: 2023-06-01',
        ],
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    return $ch;
}

// ── Streaming mode ────────────────────────────────────────────────────────────
if (!empty($reqData['stream'])) {
    while (ob_get_level()) ob_end_clean();
    @ini_set('output_buffering', '0');
    @ini_set('implicit_flush', '1');
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Accel-Buffering: no');

    $ch = mp_curl(mp_build_payload($reqData, true));
    $status  = 0;
    $errBody = '';
    curl_setopt_array($ch, [
        // Fang HTTP-status, så API-fejl (fx 529 overbelastet) kan sendes som SSE-fejl
        CURLOPT_HEADERFUNCTION => function($ch, $header) use (&$status) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $header, $m)) $status = (int)$m[1];
            return strlen($header);
        },
        CURLOPT_WRITEFUNCTION  => function($ch, $data) use (&$status, &$errBody) {
            if ($status >= 400) { $errBody .= $data; return strlen($data); }
            echo $data;
            @ob_flush();
            @flush();
            return strlen($data);
        },
    ]);
    curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr || $status >= 400) {
        $msg = $curlErr ? 'Forbindelsen til AI-tjenesten fejlede' : mp_error_message($status, $errBody);
        echo 'data: ' . json_encode(['type' => 'error', 'error' => ['message' => $msg]]) . "\n\n";
        @flush();
    }
    exit;
}

function mp_error_message(int $status, string $body): string {
    if ($status === 429) return 'AI-tjenesten har travlt lige nu – prøv igen om et minut';
    if ($status === 529 || $status >= 500) return 'AI-tjenesten er overbelastet – prøv igen om lidt';
    $j = json_decode($body, true);
    return 'AI-fejl (' . $status . '): ' . ($j['error']['message'] ?? 'ukendt fejl');
}

// ── Almindeligt (ikke-streamet) kald ──────────────────────────────────────────
$ch = mp_curl(mp_build_payload($reqData, false));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result   = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Proxy-fejl: ' . $curlErr]);
    exit;
}

http_response_code($httpCode);
header('Content-Type: application/json');
echo $result;
