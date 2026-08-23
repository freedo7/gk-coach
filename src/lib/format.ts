const WEEKDAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

// `dateStr` in formato YYYY-MM-DD (come restituito da Postgres per le colonne `date`).
export function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${WEEKDAYS[date.getDay()]} ${day} ${MONTHS[month - 1]}`;
}

export function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${day}/${month.toString().padStart(2, '0')}`;
}

// `timeStr` in formato HH:MM:SS (come restituito da Postgres per le colonne `time`), o null.
export function formatTime(timeStr: string | null): string | null {
  if (!timeStr) return null;
  return timeStr.slice(0, 5);
}
