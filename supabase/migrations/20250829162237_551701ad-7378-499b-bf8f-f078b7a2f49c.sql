-- Ajouter une contrainte unique sur user_id dans la table profiles pour permettre l'upsert
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);