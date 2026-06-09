-- Add 'round_of_32' value to match_stage enum in PostgreSQL
-- Idempotent: only adds value if it does not exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'match_stage' AND e.enumlabel = 'round_of_32'
  ) THEN
    ALTER TYPE public.match_stage ADD VALUE 'round_of_32' AFTER 'group';
  END IF;
END$$;
