-- Add winner field to matches table for knockout stages
-- This allows recording which team won when the score is tied (e.g., after penalties/extra time)

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS winner text;

-- Add check constraint to ensure winner is only 'home', 'away', or null
ALTER TABLE public.matches
ADD CONSTRAINT matches_winner_check
  CHECK (winner IS NULL OR winner IN ('home', 'away'));

-- Add comment
COMMENT ON COLUMN public.matches.winner IS 'Winner of the match for knockout stages when score is tied (home/away), null otherwise or for group stages';
