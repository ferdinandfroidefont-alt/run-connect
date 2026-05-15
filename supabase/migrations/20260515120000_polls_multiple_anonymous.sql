-- Options et libellés sondage (UI maquette RunConnect 16)
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS multiple_answers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;
