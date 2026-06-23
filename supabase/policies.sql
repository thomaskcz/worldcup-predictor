ALTER TABLE public.competition_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete their own competition predictions"
ON public.competition_predictions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


CREATE POLICY "Users can insert their own competition predictions"
ON public.competition_predictions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own competition predictions"
ON public.competition_predictions
FOR SELECT
                      TO authenticated
                      USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own competition predictions"
ON public.competition_predictions
FOR UPDATE
               TO authenticated
               USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view competition results"
ON public.competition_results
FOR SELECT
               TO authenticated
               USING (true);

CREATE POLICY "Service role can manage competition results"
ON public.competition_results
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


ALTER TABLE public.competition_visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read visibility settings"
ON public.competition_visibility_settings
FOR SELECT
               TO authenticated
               USING (true);

-- NOTE: "Only admins can update visibility settings"
-- nécessite une fonction is_admin()

CREATE POLICY "Only admins can update visibility settings"
ON public.competition_visibility_settings
FOR UPDATE
               TO authenticated
               USING (public.is_admin())
    WITH CHECK (public.is_admin());



ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete matches"
ON public.matches
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert matches"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update matches"
ON public.matches
FOR UPDATE
                      TO authenticated
                      USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view matches"
ON public.matches
FOR SELECT
               TO authenticated
               USING (true);

CREATE POLICY "Matches are publicly readable"
ON public.matches
FOR SELECT
               TO anon, authenticated
               USING (true);



ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view predictions"
ON public.predictions
FOR SELECT
               TO authenticated
               USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own predictions"
ON public.predictions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
ON public.predictions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
ON public.predictions
FOR UPDATE
                      TO authenticated
                      USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rules are publicly readable"
ON public.rules
FOR SELECT
               TO anon, authenticated
               USING (true);

CREATE POLICY "Admins can delete rules"
ON public.rules
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert rules"
ON public.rules
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update rules"
ON public.rules
FOR UPDATE
                      TO authenticated
                      USING (public.is_admin())
    WITH CHECK (public.is_admin());


ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read teams"
ON public.teams
FOR SELECT
               TO public
               USING (true);


ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user scores"
ON public.user_scores
FOR SELECT
               TO authenticated
               USING (true);

CREATE POLICY "Scores are publicly readable"
ON public.user_scores
FOR SELECT
               TO anon, authenticated
               USING (true);

-- NOTE: "Admins only can update scores"
-- logique admin nécessaire

CREATE POLICY "Admins only can update scores"
ON public.user_scores
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user profiles"
ON public.users_profiles
FOR SELECT
               TO authenticated
               USING (true);

CREATE POLICY "Profiles are publicly readable for leaderboard"
ON public.users_profiles
FOR SELECT
               TO anon, authenticated
               USING (true);

CREATE POLICY "Users can insert own profile"
ON public.users_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
ON public.users_profiles
FOR SELECT
                      TO authenticated
                      USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users_profiles
FOR UPDATE
               TO authenticated
               USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);