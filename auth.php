<?php
/**
 * MadPlan — Auth API
 * GET  ?action=check          → tjek aktiv session
 * POST {"action":"login"}     → log ind
 * POST {"action":"register"}  → opret konto
 * POST {"action":"logout"}    → log ud
 */

require_once __DIR__ . '/ratelimit.php';
session_configure();
session_start();

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) { header('Access-Control-Allow-Origin: ' . $origin); header('Vary: Origin'); }
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── DB-forbindelse ─────────────────────────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!defined('DB_HOST') || DB_HOST === 'DIN_DB_HOST') {
        throw new RuntimeException('Databasen er ikke konfigureret – udfyld DB_* i config.php');
    }
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
    return $pdo;
}

// ── GET: tjek session ──────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['action'] ?? '') === 'check') {
        if (!empty($_SESSION['mp_user'])) {
            $_SESSION['mp_last_active'] = time(); // forny aktivitetstidspunkt
        }
        echo json_encode(['user' => $_SESSION['mp_user'] ?? null]);
    }
    exit;
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metode ikke tilladt']);
    exit;
}

$body   = file_get_contents('php://input');
$data   = json_decode($body ?: '{}', true) ?? [];
$action = $data['action'] ?? '';

// ── LOGIN ─────────────────────────────────────────────────────────────────────
if ($action === 'login') {
    $email    = strtolower(trim($data['email']    ?? ''));
    $password = $data['password'] ?? '';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Udfyld e-mail og adgangskode']);
        exit;
    }

    // Rate limit: max 10 loginforsøg per IP per 15 min
    if (!rl_check('login_' . rl_ip(), 10, 900)) {
        http_response_code(429);
        echo json_encode(['error' => 'For mange loginforsøg – prøv igen om lidt']);
        exit;
    }

    // Demo-konto (ingen DB-kald)
    if ($email === 'demo@madplan.dk' && $password === 'demo123') {
        $_SESSION['mp_user'] = ['name' => 'Demo Bruger', 'email' => 'demo@madplan.dk'];
        echo json_encode(['user' => $_SESSION['mp_user']]);
        exit;
    }

    try {
        $stmt = getDB()->prepare('SELECT name, email, password_hash FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($password, $row['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Forkert e-mail eller adgangskode']);
            exit;
        }

        $_SESSION['mp_user'] = ['name' => $row['name'], 'email' => $row['email']];
        echo json_encode(['user' => $_SESSION['mp_user']]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Databasefejl – prøv igen om lidt']);
    }
    exit;
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
if ($action === 'register') {
    $name     = trim($data['name']     ?? '');
    $email    = strtolower(trim($data['email']    ?? ''));
    $password = $data['password'] ?? '';

    // Rate limit: max 5 oprettelser per IP per time
    if (!rl_check('register_' . rl_ip(), 5, 3600)) {
        http_response_code(429);
        echo json_encode(['error' => 'For mange registreringer – prøv igen om lidt']);
        exit;
    }

    if (!$name || !$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Udfyld alle felter']);
        exit;
    }
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Adgangskode skal være mindst 6 tegn']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Ugyldig e-mailadresse']);
        exit;
    }
    if (strlen($name) < 2) {
        http_response_code(400);
        echo json_encode(['error' => 'Navn skal være mindst 2 tegn']);
        exit;
    }

    try {
        // Tjek om e-mail allerede findes
        $stmt = getDB()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'E-mail er allerede registreret']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = getDB()->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
        $stmt->execute([$name, $email, $hash]);

        $_SESSION['mp_user'] = ['name' => $name, 'email' => $email];
        echo json_encode(['user' => $_SESSION['mp_user']]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Databasefejl – prøv igen om lidt']);
    }
    exit;
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
if ($action === 'logout') {
    session_destroy();
    echo json_encode(['ok' => true]);
    exit;
}

// ── SKIFT KODEORD ─────────────────────────────────────────────────────────────
if ($action === 'changePassword') {
    if (empty($_SESSION['mp_user'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Ikke logget ind']);
        exit;
    }

    $email       = $_SESSION['mp_user']['email'] ?? '';
    $currentPass = $data['currentPassword'] ?? '';
    $newPass     = $data['newPassword']     ?? '';

    if (!$currentPass || !$newPass) {
        http_response_code(400);
        echo json_encode(['error' => 'Udfyld begge felter']);
        exit;
    }
    if (strlen($newPass) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Nyt kodeord skal være mindst 6 tegn']);
        exit;
    }

    // Demo-konto kan ikke skifte kodeord
    if ($email === 'demo@madplan.dk') {
        http_response_code(403);
        echo json_encode(['error' => 'Demo-kontoen kan ikke ændres']);
        exit;
    }

    try {
        $stmt = getDB()->prepare('SELECT password_hash FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($currentPass, $row['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Nuværende kodeord er forkert']);
            exit;
        }

        $hash = password_hash($newPass, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = getDB()->prepare('UPDATE users SET password_hash = ? WHERE email = ?');
        $stmt->execute([$hash, $email]);

        echo json_encode(['ok' => true]);

    } catch (Exception $e) {
        error_log('[MadPlan changePassword] ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Databasefejl – prøv igen']);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ukendt handling']);
