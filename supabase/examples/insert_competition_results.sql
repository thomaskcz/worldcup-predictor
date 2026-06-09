-- ============================================================================
-- EXEMPLES D'INSERT POUR LA TABLE competition_results
-- ============================================================================
-- Cette table stocke les résultats officiels du tournoi
-- Les résultats peuvent être insérés manuellement via le dashboard Supabase
-- ============================================================================

-- ===== PHASE DE GROUPES =====
-- Format: stage='groups', group_name=lettre du groupe, position=1/2

-- Groupe A - résultats fictifs
INSERT INTO public.competition_results (stage, group_name, team_id, position)
SELECT 'groups', 'A', id, 1 FROM public.teams WHERE fifa_code = 'BRA' AND group_name = 'C'
  ON CONFLICT DO NOTHING;

INSERT INTO public.competition_results (stage, group_name, team_id, position)
SELECT 'groups', 'A', id, 2 FROM public.teams WHERE fifa_code = 'MAR' AND group_name = 'C'
  ON CONFLICT DO NOTHING;

-- Groupe B
INSERT INTO public.competition_results (stage, group_name, team_id, position)
SELECT 'groups', 'B', id, 1 FROM public.teams WHERE fifa_code = 'GER' AND group_name = 'E'
  ON CONFLICT DO NOTHING;

INSERT INTO public.competition_results (stage, group_name, team_id, position)
SELECT 'groups', 'B', id, 2 FROM public.teams WHERE fifa_code = 'CUW' AND group_name = 'E'
  ON CONFLICT DO NOTHING;

-- ===== DEMI-FINALES =====
-- Format: stage='semi_final', position optionnel

INSERT INTO public.competition_results (stage, team_id, position)
SELECT 'semi_final', id, 1 FROM public.teams WHERE fifa_code = 'BRA'
  ON CONFLICT DO NOTHING;

INSERT INTO public.competition_results (stage, team_id, position)
SELECT 'semi_final', id, 2 FROM public.teams WHERE fifa_code = 'GER'
  ON CONFLICT DO NOTHING;

INSERT INTO public.competition_results (stage, team_id, position)
SELECT 'semi_final', id, 3 FROM public.teams WHERE fifa_code = 'MAR'
  ON CONFLICT DO NOTHING;

INSERT INTO public.competition_results (stage, team_id, position)
SELECT 'semi_final', id, 4 FROM public.teams WHERE fifa_code = 'CUW'
  ON CONFLICT DO NOTHING;

-- ===== FINALE =====
-- Format: stage='final', pas de position nécessaire

INSERT INTO public.competition_results (stage, team_id)
SELECT 'final', id FROM public.teams WHERE fifa_code = 'BRA'
  ON CONFLICT DO NOTHING;

INSERT INTO public.competition_results (stage, team_id)
SELECT 'final', id FROM public.teams WHERE fifa_code = 'GER'
  ON CONFLICT DO NOTHING;

-- ============================================================================
-- ALTERNATIVE: Insérer directement avec les UUID (si vous connaissez les IDs)
-- ============================================================================
-- Récupérez d'abord les UUIDs des équipes:
-- SELECT id, name, fifa_code FROM public.teams;

-- Exemple avec UUIDs fixes:
-- INSERT INTO public.competition_results (stage, group_name, team_id, position)
-- VALUES ('groups', 'A', '12345678-1234-1234-1234-123456789012', 1);

-- ============================================================================
-- VÉRIFIER LES RÉSULTATS INSÉRÉS
-- ============================================================================
-- SELECT cr.id, cr.stage, cr.group_name, t.name, t.fifa_code, cr.position
-- FROM public.competition_results cr
-- LEFT JOIN public.teams t ON cr.team_id = t.id
-- ORDER BY cr.stage, cr.group_name, cr.position;
