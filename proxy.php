<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Kun POST tilladt']);
    exit;
}

// ── Streaming mode ──────────────────────────────────────────────────────────
$rawBody = file_get_contents('php://input');
$reqData = json_decode($rawBody ?: '{}', true);

if (!empty($reqData['stream'])) {
    while (ob_get_level()) ob_end_clean();
    @ini_set('output_buffering', '0');
    @ini_set('implicit_flush', '1');
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Accel-Buffering: no');

    if (!isset($reqData['messages'])) {
        echo "data: {\"error\":\"no messages\"}\n\n"; exit;
    }

    $streamPayload = json_encode([
        'model'      => $reqData['model'] ?? 'claude-sonnet-4-6',
        'max_tokens' => $reqData['max_tokens'] ?? 8000,
        'stream'     => true,
        'messages'   => $reqData['messages'],
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $streamPayload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-api-key: ' . ANTHROPIC_API_KEY,
            'anthropic-version: 2023-06-01',
        ],
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_WRITEFUNCTION  => function($ch, $data) {
            echo $data;
            @ob_flush();
            @flush();
            return strlen($data);
        },
    ]);
    curl_exec($ch);
    curl_close($ch);
    exit;
}
// ── End streaming mode ───────────────────────────────────────────────────────

$body = $rawBody;
$data = $reqData;

if (!$data || !isset($data['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Ugyldigt request-format']);
    exit;
}

$payload = json_encode([
    'model'      => $data['model'] ?? 'claude-sonnet-4-6',
    'max_tokens' => $data['max_tokens'] ?? 8000,
    'messages'   => $data['messages'],
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: ' . ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_TIMEOUT        => 120,
]);

$result   = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    echo json_encode(['error' => 'Proxy-fejl: ' . $curlErr]);
    exit;
}

http_response_code($httpCode);
echo $result;
