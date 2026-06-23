-- Enum pour match_stage
CREATE TYPE public.match_stage AS ENUM (
    'group',
    'round_of_16',
    'round_of_32',
    'quarter_final',
    'semi_final',
    'third_place',
    'final'
);

-- Enum pour knockout_winner_pick
CREATE TYPE public.knockout_winner_pick AS ENUM (
    'home',
    'away'
);