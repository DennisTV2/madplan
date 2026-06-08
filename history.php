<?php
/**
 * MadPlan — Server-side madplan-historik
 * GET    → hent brugerens historik (maks 50)
 * POST   → gem ny plan
 * DELETE → ryd al historik for brugeren
 */
require_once __DIR__ . '/ratelimit.php';
require_once __DIR__ . '/config.php';
session_configure();
session_start();

header('Content-Type: application/json; charset=utf-8');
cors_send();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Auth ──────────────────────────────────────────────────────────────────────
if (empty($_SESSION['mp_user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Login kræves']);
    exit;
}

$userEmail = $_SESSION['mp_user']['email'];
$isDemo    = ($userEmail === 'demo@madplan.dk');

// ── DB (genbruger samme pattern som auth.php) ─────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
         PDO::ATTR_EMULATE_PREPARES => false]
    );
    return $pdo;
}

// Opretter tabellen første gang (idempotent)
function ensureTable(): void {
    getDB()->exec("CREATE TABLE IF NOT EXISTS mp_plans (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        plan_json  MEDIUMTEXT   NOT NULL,
        shops      VARCHAR(255),
        days       TINYINT,
        persons    TINYINT,
        tags       VARCHAR(255),
        opt        VARCHAR(50),
        total      DECIMAL(8,2),
        savings    DECIMAL(8,2),
        summary    TEXT,
        INDEX idx_user_date (user_email, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: hent historik ────────────────────────────────────────────────────────
if ($method === 'GET') {
    if ($isDemo) { echo json_encode(['plans' => []]); exit; }

    try {
        ensureTable();
        $stmt = getDB()->prepare(
            'SELECT id, created_at, shops, days, persons, tags, opt, total, savings, summary, plan_json
             FROM mp_plans WHERE user_email = ? ORDER BY created_at DESC LIMIT 50'
        );
        $stmt->execute([$userEmail]);
        $plans = [];
        foreach ($stmt->fetchAll() as $row) {
            $row['plan'] = json_decode($row['plan_json'] ?? '{}', true);
            unset($row['plan_json']);
            $plans[] = $row;
        }
        echo json_encode(['plans' => $plans]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'DB-fejl', 'msg' => $e->getMessage()]);
    }
    exit;
}

// ── POST: gem plan ────────────────────────────────────────────────────────────
if ($method === 'POST') {
    if ($isDemo) { echo json_encode(['ok' => true, 'demo' => true]); exit; }

    if (!rl_check('history_' . md5($userEmail), 30, 3600)) {
        http_response_code(429);
        echo json_encode(['error' => 'For mange kald — prøv igen om lidt']);
        exit;
    }

    // Begræns POST-body til 200 KB (en madplan er typisk < 20 KB)
    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 204800) {
        http_response_code(413);
        echo json_encode(['error' => 'Plan-data for stor (maks 200 KB)']);
        exit;
    }
    $raw  = stream_get_contents(fopen('php://input', 'r'), 204800);
    $body = json_decode($raw ?: '{}', true);
    if (empty($body['plan'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Mangler plan-data']);
        exit;
    }

    try {
        ensureTable();
        $db        = getDB();
        $planJson  = json_encode($body['plan'], JSON_UNESCAPED_UNICODE);

        // Dobbeltsikring: plan_json må ikke overstige MEDIUMTEXT (16 MB)
        if (strlen($planJson) > 1_000_000) {
            http_response_code(413);
            echo json_encode(['error' => 'Plan-data for stor']);
            exit;
        }

        $stmt = $db->prepare(
            'INSERT INTO mp_plans (user_email, plan_json, shops, days, persons, tags, opt, total, savings, summary)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $userEmail, $planJson,
            implode(',', (array)($body['shops']   ?? [])),
            (int)   ($body['days']    ?? 0),
            (int)   ($body['persons'] ?? 0),
            implode(',', (array)($body['tags']    ?? [])),
            (string)($body['opt']     ?? ''),
            (float) ($body['total']   ?? 0),
            (float) ($body['savings'] ?? 0),
            (string)($body['summary'] ?? ''),
        ]);
        $newId = (int)$db->lastInsertId();

        // Behold maks 50 planer pr. bruger — hent og slet ældste eksplicit
        // (undgår MySQL-fejl med self-referentielle subqueries)
        $old = $db->prepare(
            'SELECT id FROM mp_plans WHERE user_email = ? ORDER BY created_at DESC LIMIT 1000 OFFSET 50'
        );
        $old->execute([$userEmail]);
        $oldIds = $old->fetchAll(PDO::FETCH_COLUMN);
        if ($oldIds) {
            $ph = implode(',', array_fill(0, count($oldIds), '?'));
            $db->prepare("DELETE FROM mp_plans WHERE id IN ($ph)")->execute($oldIds);
        }

        echo json_encode(['ok' => true, 'id' => $newId]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'DB-fejl', 'msg' => $e->getMessage()]);
    }
    exit;
}

// ── DELETE: ryd historik ──────────────────────────────────────────────────────
if ($method === 'DELETE') {
    if ($isDemo) { echo json_encode(['ok' => true]); exit; }
    try {
        ensureTable();
        getDB()->prepare('DELETE FROM mp_plans WHERE user_email = ?')->execute([$userEmail]);
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'DB-fejl']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
