// URL pubblici dei documenti legali (ospitati su gk-web).
// Aggiornare il dominio quando gk-web viene deployato in produzione.
const BASE = 'https://gkcoach.it';

export const LEGAL_URLS = {
  privacy: `${BASE}/privacy`,
  terms: `${BASE}/termini`,
  cookie: `${BASE}/cookie`,
} as const;

/** Pagina web che gestisce il link di reimpostazione password inviato via email. */
export const RESET_PASSWORD_URL = `${BASE}/reset-password`;
