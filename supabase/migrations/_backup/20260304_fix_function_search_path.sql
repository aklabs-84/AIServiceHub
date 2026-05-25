-- Fix Supabase linter warning: function_search_path_mutable
-- Sets a fixed search_path for security-definer and trigger functions.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_post_like_count' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_post_like_count() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'check_role_update' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.check_role_update() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_editorial_collections_updated_at' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_editorial_collections_updated_at() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_app_like_count' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_app_like_count() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_prompt_like_count' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_prompt_like_count() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_post_comment_count' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_post_comment_count() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'handle_new_user' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
  END IF;
END;
$$;
