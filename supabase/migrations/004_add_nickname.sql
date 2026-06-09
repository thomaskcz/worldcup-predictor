-- Add nickname support to users_profiles
-- Allows users to set a unique display name that replaces their email

alter table public.users_profiles 
add column nickname text unique;

comment on column public.users_profiles.nickname is 
  'Optional unique display name for the user. If set, replaces email in display contexts.';
