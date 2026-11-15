<?php
/**
 * MadPlan — Rate limiting + session helpers
 * Ingen ny DB-tabel, ingen afhængigheder.
 *
 * rl_check(string $key, int $max, int $windowSecs): bool
 *   true  → request tilladt
 *   false → for mange requests, afvis
 */

function rl_check(string $key, int $max, int $windowSecs): bool {
    $file = sys_get_temp_dir() . '/mprl_' . md5($key) . '.rl';
    $now  = time();

    $times = [];
    if (file_exists($file)) {
        $raw = @file_get_contents($file);
        if ($raw !== false && $raw !== '') {
            $times = array_map('intval', explode(',', $raw));
        }
    }

    // Fjern timestamps udenfor vinduet
    $times = array_values(array_filter($times, fn($t) => ($now - $t) < $windowSecs));

    if (count($times) >= $max) {
        return false; // limit overskredet
    }

    $times[] = $now;
    @file_put_contents($file, implode(',', $times), LOCK_EX);
    return true;
}

/**
 * Sætter CORS-header — kun hvis origin matcher APP_ORIGIN (config.php).
 * Reflekterer ALDRIG blinde origins (sikkerhedsregel).
 * Kald denne inden output sendes.
 */
function cors_send(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!$origin) return;

    // APP_ORIGIN kan sættes i config.php som én streng eller kommasepareret liste
    $allowed = defined('APP_ORIGIN')
        ? array_map('trim', explode(',', APP_ORIGIN))
        : [];

    if (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }
    // Ukendt origin → ingen CORS-header → browseren afviser cross-origin request
}

/**
 * Konfigurer session til at vare 30 dage.
 * Kald denne FØR session_start().
 */
function session_configure(): void {
    $ttl    = 30 * 24 * 3600; // 30 dage i sekunder
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    ini_set('session.gc_maxlifetime',  (string)$ttl);
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Strict');

    session_set_cookie_params([
        'lifetime' => $ttl,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

/**
 * Klientens IP. Vi stoler KUN på REMOTE_ADDR: X-Forwarded-For og lignende
 * headers kan klienten selv sætte, og så kan alle IP-grænser omgås.
 */
function rl_ip(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'unknown';
}
