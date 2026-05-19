<?php
/**
 * MadPlan — Rate limiting via temp-filer
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
 * Returnerer en stabil IP-nøgle (håndterer proxies)
 */
function rl_ip(): string {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP']   // Cloudflare
       ?? $_SERVER['HTTP_X_FORWARDED_FOR']
       ?? $_SERVER['REMOTE_ADDR']
       ?? 'unknown';
    return explode(',', $ip)[0]; // kun første IP ved proxy-kæde
}
