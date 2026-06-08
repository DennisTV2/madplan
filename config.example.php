<?php
// Kopiér denne fil til config.php og udfyld dine værdier
// config.php er i .gitignore og må ALDRIG committes

// ── Anthropic (Claude AI) ─────────────────────────────────────────────────────
define('ANTHROPIC_API_KEY', 'sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

// ── Unsplash (madbilleder) ────────────────────────────────────────────────────
define('UNSPLASH_ACCESS_KEY', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

// ── App URL (bruges til CORS-whitelist) ───────────────────────────────────────
// Sæt til din apps fulde URL uden trailing slash
define('APP_ORIGIN', 'https://din-domæne.dk');

// ── MySQL database (Simply.com) ───────────────────────────────────────────────
// Find disse værdier i Simply.com kontrolpanel → Databaser
define('DB_HOST', 'mysql42.simply.com');    // dit MySQL-hostnavn
define('DB_NAME', 'db_madplan');            // dit databasenavn
define('DB_USER', 'dit_brugernavn');        // dit MySQL-brugernavn
define('DB_PASS', 'dit_kodeord');           // dit MySQL-kodeord
