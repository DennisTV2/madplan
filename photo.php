<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once 'config.php';

$query = trim($_GET['q'] ?? 'food');
if (empty($query)) $query = 'food';

$url = 'https://api.unsplash.com/photos/random?' . http_build_query([
    'query'          => $query,
    'orientation'    => 'landscape',
    'content_filter' => 'high',
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Client-ID ' . UNSPLASH_ACCESS_KEY],
    CURLOPT_TIMEOUT        => 8,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'photo_unavailable', 'status' => $code]);
    exit;
}

$d = json_decode($body, true);
echo json_encode([
    'url'    => $d['urls']['regular'] ?? null,
    'thumb'  => $d['urls']['small']   ?? null,
    'credit' => ($d['user']['name']   ?? 'Unsplash') . ' / Unsplash',
    'link'   => $d['links']['html']   ?? 'https://unsplash.com',
]);
