-- =============================================================================
-- Add external_id to matches for API-Football sync (idempotent upserts)
-- =============================================================================

alter table public.matches
add column if not exists external_id text;

create unique index if not exists matches_external_id_unique_idx
on public.matches (external_id)
where external_id is not null;

create index if not exists matches_external_id_idx on public.matches (external_id);

comment on column public.matches.external_id is
  'Unique fixture ID from the football API. Used for idempotent match sync.';
