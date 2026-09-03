import type { TrainingWithExercises } from '@/lib/api/trainings';
import type { Match, Goalkeeper } from '@/types/database';
import { formatDateLong, formatTime } from '@/lib/format';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function generateTrainingPdf(training: TrainingWithExercises): Promise<string> {
  const Print = await import('expo-print');

  const time = formatTime(training.training_time);

  const exercisesHtml = training.training_exercises
    .map((te, i) => {
      const ex = te.exercise;
      const meta: string[] = [];
      if (ex.duration_minutes) meta.push(`${ex.duration_minutes} min`);
      if (ex.sets && ex.reps) meta.push(`${ex.sets}x${ex.reps}`);
      else if (ex.sets) meta.push(`${ex.sets} serie`);
      else if (ex.reps) meta.push(`${ex.reps} reps`);
      if (ex.difficulty) meta.push(ex.difficulty);
      if (ex.equipment) meta.push(ex.equipment);

      return `
        <div class="exercise">
          <div class="ex-header">
            <span class="ex-num">${i + 1}</span>
            <div>
              <div class="ex-title">${escapeHtml(ex.title)}</div>
              ${meta.length ? `<div class="ex-meta">${meta.join(' · ')}</div>` : ''}
            </div>
          </div>
          <div class="ex-desc">${escapeHtml(ex.description)}</div>
          ${te.note ? `<div class="ex-note">Nota: ${escapeHtml(te.note)}</div>` : ''}
        </div>`;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 40px; color: #1a1a1a; }
        .header { border-bottom: 3px solid #6FC22C; padding-bottom: 16px; margin-bottom: 24px; }
        .date { color: #60646C; font-size: 14px; margin-bottom: 4px; }
        .title { font-size: 24px; font-weight: 700; }
        .notes { color: #60646C; font-size: 13px; margin-top: 8px; line-height: 1.4; }
        .section-title { font-size: 12px; font-weight: 700; color: #60646C; letter-spacing: 1px; margin-bottom: 12px; text-transform: uppercase; }
        .exercise { background: #F7F7F9; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
        .ex-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .ex-num { background: #6FC22C; color: #0F1A05; font-weight: 700; font-size: 13px; width: 26px; height: 26px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ex-title { font-weight: 600; font-size: 15px; }
        .ex-meta { color: #60646C; font-size: 12px; margin-top: 2px; }
        .ex-desc { font-size: 13px; line-height: 1.5; color: #333; }
        .ex-note { font-size: 12px; color: #60646C; margin-top: 6px; font-style: italic; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #B0B4BA; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="date">${escapeHtml(formatDateLong(training.training_date))}${time ? ` · ${time}` : ''}</div>
        <div class="title">${escapeHtml(training.title)}</div>
        ${training.notes ? `<div class="notes">${escapeHtml(training.notes)}</div>` : ''}
      </div>

      ${training.training_exercises.length > 0 ? `
        <div class="section-title">Esercizi (${training.training_exercises.length})</div>
        ${exercisesHtml}
      ` : '<p style="color:#60646C">Nessun esercizio assegnato.</p>'}

      <div class="footer">GK Coach</div>
    </body>
    </html>`;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function generateGoalkeeperPdf(
  goalkeeper: Goalkeeper,
  matches: Match[],
  trainingsCount: number,
): Promise<string> {
  const Print = await import('expo-print');

  const matchesWithScore = matches.filter((m) => m.goals_scored != null && m.goals_conceded != null);
  const wins = matchesWithScore.filter((m) => m.goals_scored! > m.goals_conceded!).length;
  const draws = matchesWithScore.filter((m) => m.goals_scored! === m.goals_conceded!).length;
  const losses = matchesWithScore.filter((m) => m.goals_scored! < m.goals_conceded!).length;
  const cleanSheets = matchesWithScore.filter((m) => m.goals_conceded === 0).length;

  const rated = matches.filter((m) => m.rating != null);
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, m) => sum + m.rating!, 0) / rated.length).toFixed(1)
    : '—';
  const avgConceded = matchesWithScore.length > 0
    ? (matchesWithScore.reduce((sum, m) => sum + m.goals_conceded!, 0) / matchesWithScore.length).toFixed(1)
    : '—';

  const matchRows = [...matches].reverse().slice(0, 15).map((m) => {
    const score = m.goals_scored != null && m.goals_conceded != null
      ? `${m.goals_scored} - ${m.goals_conceded}` : (m.result ?? '—');
    const ratingStr = m.rating != null ? `${m.rating}/10` : '—';
    return `
      <tr>
        <td>${escapeHtml(formatDateLong(m.match_date))}</td>
        <td>${escapeHtml(m.opponent)}</td>
        <td style="text-align:center">${score}</td>
        <td style="text-align:center">${ratingStr}</td>
      </tr>`;
  }).join('');

  const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 40px; color: #1a1a1a; }
        .header { border-bottom: 3px solid #6FC22C; padding-bottom: 16px; margin-bottom: 24px; }
        .name { font-size: 28px; font-weight: 700; }
        .date { color: #60646C; font-size: 13px; margin-top: 4px; }
        .stats-grid { display: flex; gap: 12px; margin-bottom: 24px; }
        .stat-box { flex: 1; background: #F7F7F9; border-radius: 10px; padding: 14px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: 800; color: #6FC22C; }
        .stat-label { font-size: 11px; color: #60646C; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .section-title { font-size: 12px; font-weight: 700; color: #60646C; letter-spacing: 1px; margin-bottom: 10px; margin-top: 20px; text-transform: uppercase; }
        .results { display: flex; gap: 16px; margin-bottom: 20px; }
        .result-item { text-align: center; flex: 1; }
        .result-num { font-size: 22px; font-weight: 800; }
        .result-label { font-size: 11px; color: #60646C; }
        .win { color: #34C759; }
        .draw { color: #8E8E93; }
        .loss { color: #FF3B30; }
        .cs { color: #5AC8FA; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #F7F7F9; padding: 8px; text-align: left; font-size: 11px; color: #60646C; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 8px; border-bottom: 1px solid #F0F0F0; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #B0B4BA; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${escapeHtml(goalkeeper.name)}</div>
        <div class="date">Report generato il ${today}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">${avgRating}</div>
          <div class="stat-label">Media voto</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:#1a1a1a">${matches.length}</div>
          <div class="stat-label">Partite</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:#1a1a1a">${trainingsCount}</div>
          <div class="stat-label">Allenamenti</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:#5AC8FA">${cleanSheets}</div>
          <div class="stat-label">Clean sheet</div>
        </div>
      </div>

      ${matchesWithScore.length > 0 ? `
        <div class="section-title">Risultati</div>
        <div class="results">
          <div class="result-item"><div class="result-num win">${wins}</div><div class="result-label">Vittorie</div></div>
          <div class="result-item"><div class="result-num draw">${draws}</div><div class="result-label">Pareggi</div></div>
          <div class="result-item"><div class="result-num loss">${losses}</div><div class="result-label">Sconfitte</div></div>
        </div>
        <p style="font-size:13px; color:#60646C; margin-bottom:20px">Media gol subiti: <strong style="color:#1a1a1a">${avgConceded}</strong></p>
      ` : ''}

      ${matches.length > 0 ? `
        <div class="section-title">Storico partite</div>
        <table>
          <thead><tr><th>Data</th><th>Avversario</th><th style="text-align:center">Risultato</th><th style="text-align:center">Voto</th></tr></thead>
          <tbody>${matchRows}</tbody>
        </table>
      ` : '<p style="color:#60646C">Nessuna partita registrata.</p>'}

      <div class="footer">GK Coach</div>
    </body>
    </html>`;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}
