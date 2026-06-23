-- =========================================
-- handle_new_user (TRIGGER FUNCTION)
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
INSERT INTO public.users_profiles (id, email)
VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO UPDATE
                            SET email = EXCLUDED.email,
                            updated_at = timezone('utc', now());

RETURN NEW;
END;
$$;


-- =========================================
-- is_admin (BOOLEAN FUNCTION)
-- =========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT COALESCE(
               (
                   SELECT up.is_admin
                   FROM public.users_profiles up
                   WHERE up.id = auth.uid()
               ),
               false
       );
$$;


-- =========================================
-- rls_auto_enable (EVENT TRIGGER FUNCTION)
-- NOTE: This function is defined in triggers.sql with SET search_path TO 'pg_catalog' for security
-- The version in triggers.sql is the authoritative one
-- =========================================

-- =========================================
-- set_updated_at (TRIGGER FUNCTION)
-- =========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
RETURN NEW;
END;
$$;


-- =========================================
-- validate_prediction (TRIGGER FUNCTION)
-- =========================================
CREATE OR REPLACE FUNCTION public.validate_prediction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
match_record public.matches%ROWTYPE;
BEGIN
SELECT *
INTO match_record
FROM public.matches
WHERE id = NEW.match_id;

IF NOT FOUND THEN
        RAISE EXCEPTION 'Match % does not exist', NEW.match_id;
END IF;

    IF match_record.finished THEN
        RAISE EXCEPTION 'Cannot predict a finished match';
END IF;

    IF match_record.start_time <= timezone('utc', now()) THEN
        RAISE EXCEPTION 'Prediction deadline has passed for this match';
END IF;

    IF match_record.stage <> 'group'
       AND NEW.predicted_home_score = NEW.predicted_away_score
       AND NEW.predicted_winner IS NULL
    THEN
        RAISE EXCEPTION 'predicted_winner is required for knockout draw predictions';
END IF;

    IF match_record.stage = 'group'
       AND NEW.predicted_winner IS NOT NULL
    THEN
        RAISE EXCEPTION 'predicted_winner must be null for group-stage matches';
END IF;

RETURN NEW;
END;
$$;