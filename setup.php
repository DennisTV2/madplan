<?php
/**
 * MadPlan — Databaseopsætning
 * Kør denne side ÉN gang for at oprette users-tabellen.
 * Slet eller beskyt filen bagefter!
 */
require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

if (!defined('DB_HOST') || DB_HOST === 'DIN_DB_HOST') {
    die('<h2>⚠️ Udfyld DB_HOST, DB_NAME, DB_USER, DB_PASS i config.php først</h2>');
}

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name          VARCHAR(100)  NOT NULL,
            email         VARCHAR(150)  NOT NULL UNIQUE,
            password_hash VARCHAR(255)  NOT NULL,
            created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    echo '<h2 style="font-family:system-ui;color:#16a34a">✅ Tabellen <code>users</code> er klar!</h2>';
    echo '<p style="font-family:system-ui">Du kan nu slette eller omdøbe denne fil.</p>';

} catch (Exception $e) {
    http_response_code(500);
    echo '<h2 style="font-family:system-ui;color:#dc2626">❌ Databasefejl</h2>';
    echo '<pre style="font-family:monospace">' . htmlspecialchars($e->getMessage()) . '</pre>';
}
