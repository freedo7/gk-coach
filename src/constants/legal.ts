// URL pubblici dei documenti legali (ospitati su gk-web).
// Aggiornare il dominio quando gk-web viene deployato in produzione.
const BASE = 'https://gk-coach.app';

export const LEGAL_URLS = {
  privacy: `${BASE}/privacy`,
  terms: `${BASE}/termini`,
  cookie: `${BASE}/cookie`,
} as const;
