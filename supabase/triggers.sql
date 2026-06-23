-- =========================================
-- matches_set_updated_at
-- =========================================
CREATE TRIGGER matches_set_updated_at
    BEFORE UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- =========================================
-- predictions_set_updated_at
-- =========================================
CREATE TRIGGER predictions_set_updated_at
    BEFORE UPDATE ON public.predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- =========================================
-- predictions_validate_before_insert
-- =========================================
CREATE TRIGGER predictions_validate_before_insert
    BEFORE INSERT ON public.predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_prediction();


-- =========================================
-- predictions_validate_before_update
-- =========================================
CREATE TRIGGER predictions_validate_before_update
    BEFORE UPDATE ON public.predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_prediction();


-- =========================================
-- rules_set_updated_at
-- =========================================
CREATE TRIGGER rules_set_updated_at
    BEFORE UPDATE ON public.rules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- =========================================
-- users_profiles_set_updated_at
-- =========================================
CREATE TRIGGER users_profiles_set_updated_at
    BEFORE UPDATE ON public.users_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- =========================================
-- FUNCTION: rls_auto_enable
-- =========================================
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
cmd record;
BEGIN
FOR cmd IN
SELECT *
FROM pg_event_trigger_ddl_commands()
WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  AND object_type IN ('table','partitioned table')
    LOOP
     IF cmd.schema_name IS NOT NULL
        AND cmd.schema_name IN ('public')
        AND cmd.schema_name NOT IN ('pg_catalog','information_schema')
        AND cmd.schema_name NOT LIKE 'pg_toast%'
        AND cmd.schema_name NOT LIKE 'pg_temp%'
     THEN
BEGIN
EXECUTE format(
        'ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',
        cmd.object_identity
        );

RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;

EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
END;
ELSE
        RAISE LOG 'rls_auto_enable: skip % (schema: %)',
          cmd.object_identity, cmd.schema_name;
END IF;
END LOOP;
END;
$function$;

-- =========================================
-- EVENT TRIGGER: ensure_rls
-- =========================================

DROP EVENT TRIGGER IF EXISTS ensure_rls;

CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION public.rls_auto_enable();