<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Privatlivspolitik – MadPlan</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f0fdf4; color: #0f172a; line-height: 1.7; padding: 2rem 1rem; }
    .card { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 2.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
    .logo { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.25rem; }
    .logo em { color: #22c55e; font-style: normal; }
    .updated { font-size: 12px; color: #94a3b8; margin-bottom: 2rem; }
    h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; }
    h2 { font-size: 1rem; font-weight: 700; margin: 1.75rem 0 0.5rem; color: #166534; }
    p  { font-size: 14px; color: #475569; margin-bottom: 0.75rem; }
    ul { font-size: 14px; color: #475569; padding-left: 1.25rem; margin-bottom: 0.75rem; }
    ul li { margin-bottom: 0.25rem; }
    a  { color: #22c55e; }
    .back { display: inline-block; margin-top: 2rem; font-size: 14px; color: #22c55e; text-decoration: none; font-weight: 600; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Mad<em>Plan</em></div>
    <div class="updated">Sidst opdateret: <?= date('j. F Y') ?></div>

    <h1>Privatlivspolitik</h1>
    <p>MadPlan er en dansk madplanlægger. Vi tager dit privatliv alvorligt og indsamler kun det minimum af data, der er nødvendigt for at tjenesten kan fungere.</p>

    <h2>Hvad gemmer vi?</h2>
    <ul>
      <li><strong>Navn og e-mailadresse</strong> – til din konto og login</li>
      <li><strong>Adgangskode</strong> – gemt som en envejs-hash (bcrypt). Vi kan ikke se dit kodeord.</li>
      <li><strong>Madplaner og historik</strong> – gemt lokalt i din browser (localStorage). Intet sendes til vores server.</li>
    </ul>

    <h2>Hvad bruger vi dataen til?</h2>
    <ul>
      <li>At give dig adgang til din konto på tværs af enheder</li>
      <li>At sende dig et link til at nulstille dit kodeord, hvis du anmoder om det</li>
    </ul>

    <h2>Tredjeparts-tjenester</h2>
    <ul>
      <li><strong>Anthropic Claude AI</strong> – dine madpræferencer og antal personer sendes til Claude for at generere madplaner. Ingen personoplysninger (navn, e-mail) sendes.</li>
      <li><strong>Unsplash</strong> – til madbilleder. Søgeord (fx "kylling") sendes. Ingen personoplysninger.</li>
    </ul>

    <h2>Cookies og sessions</h2>
    <p>Vi bruger en enkelt session-cookie for at holde dig logget ind. Ingen tracking-cookies. Ingen reklame-cookies.</p>

    <h2>Dine rettigheder</h2>
    <p>Du kan til enhver tid bede om at få slettet din konto og alle tilknyttede data ved at kontakte os på <a href="mailto:kontakt@birkeboeg.dk">kontakt@birkeboeg.dk</a>.</p>

    <h2>Kontakt</h2>
    <p>Spørgsmål til denne politik? Skriv til <a href="mailto:kontakt@birkeboeg.dk">kontakt@birkeboeg.dk</a>.</p>

    <hr>
    <a href="/" class="back">← Tilbage til MadPlan</a>
  </div>
</body>
</html>
