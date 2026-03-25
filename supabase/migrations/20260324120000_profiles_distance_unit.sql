-- Préférence d'affichage des distances (UI) : km ou miles
alter table public.profiles
  add column if not exists distance_unit text not null default 'km';

alter table public.profiles
  drop constraint if exists profiles_distance_unit_check;

alter table public.profiles
  add constraint profiles_distance_unit_check
  check (distance_unit in ('km', 'mi'));

comment on column public.profiles.distance_unit is 'Unité d’affichage des distances dans l’app (km | mi). Les données restent en km côté API.';
