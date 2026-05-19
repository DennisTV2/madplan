<?php
/**
 * MadPlan — Password Reset API
 * POST {"action":"request","email":"..."}           → send reset-email
 * POST {"action":"reset","token":"...","password":"..."} → sæt nyt kodeord
 */

ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Strict');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
    ini_set('session.cookie_secure', '1');
}
session_start();

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Kun POST']); exit; }

function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    return $pdo;
}

$body   = file_get_contents('php://input');
$data   = json_decode($body ?: '{}', true) ?? [];
$action = $data['action'] ?? '';

// ── ANMOD OM RESET-LINK ────────────────────────────────────────────────────────
if ($action === 'request') {
    $email = strtolower(trim($data['email'] ?? ''));

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Ugyldig e-mailadresse']);
        exit;
    }

    try {
        $stmt = getDB()->prepare('SELECT id, name FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            $token   = bin2hex(random_bytes(32)); // 64 tegn
            $expires = date('Y-m-d H:i:s', time() + 3600); // 1 time

            $stmt = getDB()->prepare(
                'UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?'
            );
            $stmt->execute([$token, $expires, $email]);

            // Send reset-email
            $resetUrl  = 'https://madplan.birkeb%C3%B8g.dk/?reset=' . $token;
            $firstName = explode(' ', $user['name'])[0];
            $subject   = 'Nulstil din adgangskode – MadPlan';
            $htmlBody  = '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f0fdf4;padding:2rem;margin:0">
<div style="max-width:460px;margin:0 auto;background:#fff;border-radius:16px;padding:2rem 2.5rem;box-shadow:0 4px 16px rgba(0,0,0,0.08)">
  <div style="text-align:center;margin-bottom:1.5rem">
    <span style="font-size:1.9rem;font-weight:800;color:#0f172a">Mad<span style="color:#22c55e">Plan</span></span>
  </div>
  <h2 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 0.75rem">Hej ' . htmlspecialchars($firstName) . ' 👋</h2>
  <p style="color:#64748b;font-size:14px;line-height:1.65;margin:0 0 1.5rem">
    Vi har modtaget en anmodning om at nulstille adgangskoden til din MadPlan-konto.<br>
    Klik på knappen nedenfor for at vælge en ny adgangskode.
  </p>
  <div style="text-align:center;margin:0 0 1.5rem">
    <a href="' . $resetUrl . '" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
      Nulstil adgangskode
    </a>
  </div>
  <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 1rem">
    Linket er gyldigt i <strong>1 time</strong>. Hvis du ikke anmodede om dette, kan du roligt ignorere denne e-mail — dit kodeord er uændret.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0">
  <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0">MadPlan &middot; madplan.birkeb&oslash;g.dk</p>
</div>
</body></html>';

            $headers  = implode("\r\n", [
                'From: MadPlan <noreply@birkeboeg.dk>',
                'Reply-To: noreply@birkeboeg.dk',
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=utf-8',
                'X-Mailer: MadPlan/1.0',
            ]);

            mail($email, $subject, $htmlBody, $headers);
        }
    } catch (Exception $e) {
        // Log fejl uden at afsløre for brugeren
        error_log('[MadPlan reset] ' . $e->getMessage());
    }

    // Returnér altid succes — afslør ikke om e-mailen eksisterer
    echo json_encode(['ok' => true]);
    exit;
}

// ── NULSTIL KODEORD ───────────────────────────────────────────────────────────
if ($action === 'reset') {
    $token    = trim($data['token']    ?? '');
    $password = $data['password'] ?? '';

    if (!$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Manglende token']);
        exit;
    }
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Adgangskode skal være mindst 6 tegn']);
        exit;
    }

    try {
        $stmt = getDB()->prepare(
            'SELECT id, name, email FROM users WHERE reset_token = ? AND reset_expires > NOW() LIMIT 1'
        );
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(400);
            echo json_encode(['error' => 'Linket er udløbet eller ugyldigt – anmod om et nyt']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = getDB()->prepare(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?'
        );
        $stmt->execute([$hash, $user['id']]);

        // Auto-login efter nulstilling
        $_SESSION['mp_user'] = ['name' => $user['name'], 'email' => $user['email']];
        echo json_encode(['ok' => true, 'user' => $_SESSION['mp_user']]);

    } catch (Exception $e) {
        error_log('[MadPlan reset] ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Databasefejl – prøv igen']);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ukendt handling']);
