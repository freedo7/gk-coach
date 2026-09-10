-- ============================================================================
-- SEED — Dati demo per gli screenshot marketing di GK Coach
-- ----------------------------------------------------------------------------
-- Come si usa:
--   Supabase Dashboard -> SQL Editor -> New query -> incolla -> Run
--
-- Cosa fa:
--   crea una squadra dedicata "GK Coach Demo" con 3 portieri, 8 esercizi,
--   6 allenamenti (1 futuro + 5 passati, uno per settimana -> streak),
--   10 partite (2 future + 8 passate con voti/risultati) e alcune
--   "mappe tiri" (match_performances con eventi tiro).
--
-- Reversibile al 100%: esegui teardown_screenshots.sql per rimuovere tutto.
-- Non tocca nessun altro dato / nessun'altra squadra.
-- ============================================================================

DO $$
DECLARE
  v_email text := 'bravi.federico7@gmail.com';   -- email dell'account app

  v_coach uuid;
  v_team  uuid;
  d0      date := current_date;

  v_gk1 uuid; v_gk2 uuid; v_gk3 uuid;

  v_cat_any uuid;
  v_cat_base uuid; v_cat_coord uuid; v_cat_forza uuid; v_cat_sit uuid; v_cat_pod uuid;

  e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid; e6 uuid; e7 uuid; e8 uuid;
  t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid; t6 uuid;
  m1 uuid; m3 uuid; m4 uuid; m7 uuid;
BEGIN
  ----------------------------------------------------------------------------
  -- 0. Coach
  ----------------------------------------------------------------------------
  SELECT id INTO v_coach FROM public.profiles WHERE email = v_email;
  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'Nessun profilo con email % — correggi v_email nello script.', v_email;
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams WHERE name = 'GK Coach Demo' AND coach_id = v_coach) THEN
    RAISE EXCEPTION 'Esiste già una squadra "GK Coach Demo": esegui prima teardown_screenshots.sql.';
  END IF;

  ----------------------------------------------------------------------------
  -- 1. Squadra + coach come membro
  ----------------------------------------------------------------------------
  INSERT INTO public.teams (name, coach_id) VALUES ('GK Coach Demo', v_coach)
  RETURNING id INTO v_team;

  INSERT INTO public.team_members (team_id, profile_id) VALUES (v_team, v_coach)
  ON CONFLICT DO NOTHING;

  ----------------------------------------------------------------------------
  -- 2. Portieri
  ----------------------------------------------------------------------------
  INSERT INTO public.goalkeepers (team_id, name, created_by)
  VALUES (v_team, 'Luca Bianchi', v_coach) RETURNING id INTO v_gk1;
  INSERT INTO public.goalkeepers (team_id, name, created_by)
  VALUES (v_team, 'Marco Ferrari', v_coach) RETURNING id INTO v_gk2;
  INSERT INTO public.goalkeepers (team_id, name, created_by)
  VALUES (v_team, 'Davide Greco', v_coach) RETURNING id INTO v_gk3;

  ----------------------------------------------------------------------------
  -- 3. Categorie esercizi (con fallback se lo schema categorie è diverso)
  ----------------------------------------------------------------------------
  SELECT id INTO v_cat_any FROM public.exercise_categories ORDER BY sort_order LIMIT 1;
  IF v_cat_any IS NULL THEN
    RAISE EXCEPTION 'Nessuna categoria esercizi presente nel database.';
  END IF;
  SELECT id INTO v_cat_base  FROM public.exercise_categories WHERE name = 'Tecnica di base';
  SELECT id INTO v_cat_coord FROM public.exercise_categories WHERE name = 'Coordinazione e mobilità';
  SELECT id INTO v_cat_forza FROM public.exercise_categories WHERE name = 'Forza e reattività';
  SELECT id INTO v_cat_sit   FROM public.exercise_categories WHERE name = 'Tecnica situazionale';
  SELECT id INTO v_cat_pod   FROM public.exercise_categories WHERE name = 'Tecnica podalica';
  v_cat_base  := COALESCE(v_cat_base,  v_cat_any);
  v_cat_coord := COALESCE(v_cat_coord, v_cat_any);
  v_cat_forza := COALESCE(v_cat_forza, v_cat_any);
  v_cat_sit   := COALESCE(v_cat_sit,   v_cat_any);
  v_cat_pod   := COALESCE(v_cat_pod,   v_cat_any);

  ----------------------------------------------------------------------------
  -- 4. Esercizi
  ----------------------------------------------------------------------------
  INSERT INTO public.exercises (title, description, category_id, team_id, created_by, sets, reps, difficulty, duration_minutes, equipment)
  VALUES ('Presa alta su cross', 'Uscita e presa sicura su traversone dalla trequarti, con contrasto passivo.', v_cat_sit, v_team, v_coach, 3, 8, 'intermedio', 15, 'Palloni, coni')
  RETURNING id INTO e1;
  INSERT INTO public.exercises (title, description, category_id, team_id, created_by, sets, reps, difficulty, duration_minutes, equipment)
  VALUES ('Uscita bassa 1 contro 1', 'Tempo di uscita e chiusura dello specchio sul portatore lanciato in profondita.', v_cat_sit, v_team, v_coach, 4, 6, 'avanzato', 12, 'Palloni, cinesini')
  RETURNING id INTO e2;
  INSERT INTO public.exercises (title, description, category_id, team_id, created_by, sets, reps, difficulty, duration_minutes, equipment)
  VALUES ('Riflessi a distanza ravvicinata', 'Serie rapide di parate reattive su rimbalzo e deviazione da corta distanza.', v_cat_forza, v_team, v_coach, 3, 12, 'intermedio', 10, 'Muro di rimbalzo, palloni')
  RETURNING id INTO e3;
  INSERT INTO public.exercises (title, description, category_id, team_id, created_by, sets, reps, difficulty, duration_minutes, equipment)
  VALUES ('Rinvio dal fondo di precisione', 'Rinvio dal fondo verso zone bersaglio a distanze crescenti.', v_cat_pod, v_team, v_coach, 4, 10, 'base', 15, 'Palloni, porte piccole')
  RETURNING id INTO e4;
  INSERT INTO public.exercises (title, description, category_id, team_id, created_by, sets, reps, difficulty, duration_minutes, equipment)
  VALUES ('Costruzione dal basso sotto pressione', 'Gestione del possesso e scelta della giocata con pressing avversario a uomo.', v_cat_pod, v_team, v_coach, 3, 8, 'avanzato', 20, 'Palloni, casacche')
  RETURNING id INTO e5;
  INSERT INTO public.exercises (title, description, category_id, team_id, created_by, sets, reps, difficulty, duration_minutes, equipment)
  VALUES ('Posizionamento e catena difensiva', 'Lettura della linea e riposizionamento in rapporto a palla e reparto.', v_cat_base, v_team, v_coach, 2, 10, 'base', 15, 'Coni, palloni')
  RETURNING id INTO e6;
  INSERT INTO public.exercises (title, description, category_id, team_id, created_by, sets, reps, difficulty, duration_minutes, equipment)
  VALUES ('Coordinazione con scaletta e parata', 'Lavoro di piede alla scaletta seguito da parata immediata su conclusione.', v_cat_coord, v_team, v_coach, 4, 8, 'intermedio', 12, 'Scaletta, palloni')
  RETURNING id INTO e7;
  INSERT INTO public.exercises (title, description, category_id, team_id, created_by, sets, reps, difficulty, duration_minutes, equipment)
  VALUES ('Presa in tuffo laterale', 'Tecnica di caduta e presa bloccata nel tuffo su tiro angolato.', v_cat_base, v_team, v_coach, 3, 10, 'intermedio', 12, 'Palloni, materassino')
  RETURNING id INTO e8;

  ----------------------------------------------------------------------------
  -- 5. Allenamenti (1 futuro + 5 passati, uno a settimana)
  ----------------------------------------------------------------------------
  INSERT INTO public.trainings (team_id, goalkeeper_id, created_by, training_date, training_time, title, notes, completed)
  VALUES (v_team, NULL, v_coach, d0 + 5, '18:30', 'Preparazione match — prese alte e uscite', 'Focus su tempi di uscita e comunicazione con la linea.', false)
  RETURNING id INTO t1;
  INSERT INTO public.trainings (team_id, goalkeeper_id, created_by, training_date, training_time, title, notes, completed)
  VALUES (v_team, NULL, v_coach, d0 - 2, '18:30', 'Reattività e prese', 'Buona intensita, migliorare la presa bloccata sul tuffo basso.', true)
  RETURNING id INTO t2;
  INSERT INTO public.trainings (team_id, goalkeeper_id, created_by, training_date, training_time, title, notes, completed)
  VALUES (v_team, v_gk1, v_coach, d0 - 9, '18:00', 'Gioco coi piedi e rinvii', 'Sessione individuale su costruzione e precisione dei rinvii.', true)
  RETURNING id INTO t3;
  INSERT INTO public.trainings (team_id, goalkeeper_id, created_by, training_date, training_time, title, notes, completed)
  VALUES (v_team, NULL, v_coach, d0 - 16, '18:30', 'Coordinazione e riflessi', 'Circuito a stazioni, ottima risposta sui riflessi ravvicinati.', true)
  RETURNING id INTO t4;
  INSERT INTO public.trainings (team_id, goalkeeper_id, created_by, training_date, training_time, title, notes, completed)
  VALUES (v_team, NULL, v_coach, d0 - 23, '18:00', 'Situazionale e costruzione', 'Lavoro su 1 contro 1 e uscita bassa, migliorare la lettura del tempo.', true)
  RETURNING id INTO t5;
  INSERT INTO public.trainings (team_id, goalkeeper_id, created_by, training_date, training_time, title, notes, completed)
  VALUES (v_team, v_gk1, v_coach, d0 - 30, '18:30', 'Tecnica di base', 'Ripasso posizionamento e presa in tuffo laterale.', true)
  RETURNING id INTO t6;

  INSERT INTO public.training_exercises (training_id, exercise_id, position, note) VALUES
    (t1, e1, 0, 'Serie da entrambe le fasce'),
    (t1, e2, 1, 'Curare il tempo di uscita'),
    (t1, e7, 2, NULL),
    (t2, e3, 0, 'Ritmo alto, recuperi brevi'),
    (t2, e8, 1, 'Presa bloccata, non respingere'),
    (t2, e1, 2, NULL),
    (t2, e6, 3, NULL),
    (t3, e4, 0, 'Zone bersaglio a 30-40-50 m'),
    (t3, e5, 1, 'Pressing a uomo'),
    (t3, e2, 2, NULL),
    (t4, e7, 0, NULL),
    (t4, e3, 1, 'Deviazione in angolo'),
    (t4, e8, 2, NULL),
    (t5, e1, 0, NULL),
    (t5, e2, 1, 'Chiusura dello specchio'),
    (t5, e6, 2, NULL),
    (t5, e4, 3, NULL),
    (t6, e5, 0, NULL),
    (t6, e4, 1, NULL),
    (t6, e3, 2, NULL);

  ----------------------------------------------------------------------------
  -- 6. Partite (2 future + 8 passate)
  ----------------------------------------------------------------------------
  -- Future
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, notes)
  VALUES (v_team, v_gk1, v_coach, 'Giovanile Lungavilla', true,  d0 + 6,  '15:30', 'campionato', 8, 'Squadra fisica, attenzione ai calci piazzati.');
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, notes)
  VALUES (v_team, v_gk2, v_coach, 'Real Fossano', false, d0 + 13, '18:00', 'coppa', NULL, 'Turno infrasettimanale, campo sintetico.');

  -- Passate (con risultato / voto)
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, goals_scored, goals_conceded, rating, notes)
  VALUES (v_team, v_gk1, v_coach, 'ASD Olimpya', false, d0 - 3, '16:00', 'campionato', 7, 3, 0, 8, 'Prestazione solida, due interventi decisivi nella ripresa.')
  RETURNING id INTO m1;
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, goals_scored, goals_conceded, rating, notes)
  VALUES (v_team, v_gk1, v_coach, 'Pol. Vallecrosia', true, d0 - 10, '15:30', 'campionato', 6, 1, 1, 6, 'Gol subito su punizione, per il resto ordinato.');
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, goals_scored, goals_conceded, rating, notes)
  VALUES (v_team, v_gk1, v_coach, 'Sporting Arenzano', false, d0 - 17, '16:00', 'campionato', 5, 0, 2, 5, 'Serata difficile, un gol evitabile sul palo corto.')
  RETURNING id INTO m3;
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, goals_scored, goals_conceded, rating, notes)
  VALUES (v_team, v_gk2, v_coach, 'Bordighera Sant Ampelio', true, d0 - 24, '20:45', 'coppa', NULL, 2, 1, 7, 'Buon esordio in coppa, sicuro nelle uscite.')
  RETURNING id INTO m4;
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, goals_scored, goals_conceded, rating, notes)
  VALUES (v_team, v_gk3, v_coach, 'Camporosso', true, d0 - 31, '15:00', 'amichevole', NULL, 4, 0, 8, 'Amichevole di preparazione, poco impegnato ma attento.');
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, goals_scored, goals_conceded, rating, notes)
  VALUES (v_team, v_gk1, v_coach, 'Ventimiglia', true, d0 - 38, '15:30', 'campionato', 4, 0, 0, 7, 'Clean sheet, ottima gestione della catena difensiva.');
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, goals_scored, goals_conceded, rating, notes)
  VALUES (v_team, v_gk1, v_coach, 'Dianese e Golfo', false, d0 - 45, '16:00', 'campionato', 3, 2, 3, 6, 'Sconfitta in rimonta, due gol nel finale su ripartenza.')
  RETURNING id INTO m7;
  INSERT INTO public.matches (team_id, goalkeeper_id, created_by, opponent, is_home, match_date, match_time, match_type, matchday, goals_scored, goals_conceded, rating, notes)
  VALUES (v_team, v_gk2, v_coach, 'Taggia', false, d0 - 52, '20:45', 'coppa', NULL, 1, 0, 8, 'Passaggio del turno, parata decisiva nel recupero.');

  ----------------------------------------------------------------------------
  -- 7. Mappe tiri (match_performances) su 4 partite passate
  ----------------------------------------------------------------------------
  INSERT INTO public.match_performances (match_id, goalkeeper_id, rating, goals_conceded, notes, shots) VALUES
  (m1, v_gk1, 8, 0, 'Nessun gol subito, due parate importanti su conclusione dal limite.', '[
    {"fromX":0.22,"fromY":0.35,"toX":0.14,"toY":0.55,"outcome":"save","curve":"straight","distance":18},
    {"fromX":0.55,"fromY":0.18,"toX":0.62,"toY":0.42,"outcome":"save","curve":"right","distance":14},
    {"fromX":0.40,"fromY":0.28,"toX":0.30,"toY":0.30,"outcome":"save","curve":"left","distance":20},
    {"fromX":0.68,"fromY":0.40,"toX":0.80,"toY":0.60,"outcome":"save","curve":"straight","distance":11},
    {"fromX":0.48,"fromY":0.12,"toX":0.50,"toY":0.20,"outcome":"save","curve":"straight","distance":24}
  ]'::jsonb),
  (m3, v_gk1, 5, 2, 'Due gol subiti, uno sul primo palo da rivedere in fase di posizionamento.', '[
    {"fromX":0.30,"fromY":0.30,"toX":0.10,"toY":0.62,"outcome":"goal","curve":"left","distance":16},
    {"fromX":0.60,"fromY":0.22,"toX":0.88,"toY":0.30,"outcome":"goal","curve":"right","distance":13},
    {"fromX":0.45,"fromY":0.40,"toX":0.40,"toY":0.55,"outcome":"save","curve":"straight","distance":19},
    {"fromX":0.52,"fromY":0.15,"toX":0.55,"toY":0.28,"outcome":"save","curve":"straight","distance":22},
    {"fromX":0.25,"fromY":0.48,"toX":0.18,"toY":0.50,"outcome":"save","curve":"left","distance":9},
    {"fromX":0.70,"fromY":0.35,"toX":0.82,"toY":0.58,"outcome":"save","curve":"right","distance":12}
  ]'::jsonb),
  (m4, v_gk2, 7, 1, 'Sicuro tra i pali, un gol su mischia da calcio d angolo.', '[
    {"fromX":0.50,"fromY":0.45,"toX":0.46,"toY":0.60,"outcome":"goal","curve":"straight","distance":6},
    {"fromX":0.35,"fromY":0.25,"toX":0.22,"toY":0.35,"outcome":"save","curve":"left","distance":17},
    {"fromX":0.64,"fromY":0.30,"toX":0.78,"toY":0.42,"outcome":"save","curve":"right","distance":15},
    {"fromX":0.48,"fromY":0.10,"toX":0.50,"toY":0.22,"outcome":"save","curve":"straight","distance":25}
  ]'::jsonb),
  (m7, v_gk1, 3, 2, 'Sconfitta pesante, entrambi i gol nel finale su ripartenza.', '[
    {"fromX":0.28,"fromY":0.32,"toX":0.12,"toY":0.58,"outcome":"goal","curve":"left","distance":14},
    {"fromX":0.66,"fromY":0.26,"toX":0.86,"toY":0.40,"outcome":"goal","curve":"right","distance":12},
    {"fromX":0.44,"fromY":0.38,"toX":0.38,"toY":0.52,"outcome":"save","curve":"straight","distance":18},
    {"fromX":0.55,"fromY":0.20,"toX":0.58,"toY":0.30,"outcome":"save","curve":"straight","distance":21},
    {"fromX":0.33,"fromY":0.44,"toX":0.24,"toY":0.48,"outcome":"save","curve":"left","distance":10}
  ]'::jsonb);

  RAISE NOTICE '--------------------------------------------------------------';
  RAISE NOTICE 'Seed completato. Team demo id = %', v_team;
  RAISE NOTICE 'Nell app: apri il selettore squadra e passa a "GK Coach Demo".';
  RAISE NOTICE '--------------------------------------------------------------';
END $$;
