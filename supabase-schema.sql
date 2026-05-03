-- ============================================================
-- LeasEval — Schéma Supabase
-- Colle ce code dans : Supabase > SQL Editor > New query
-- ============================================================

-- 1. TABLE PROFILES (un profil par utilisateur)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  premium       BOOLEAN DEFAULT FALSE,
  admin         BOOLEAN DEFAULT FALSE,
  stripe_customer_id    TEXT,
  premium_activated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Créer automatiquement un profil quand un utilisateur s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. TABLE SIMULATIONS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.simulations (
  id            BIGINT PRIMARY KEY,         -- timestamp JS (Date.now())
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT CHECK (type IN ('LOA', 'LLD')),
  date          TEXT,
  vnr           NUMERIC,
  l1            NUMERIC DEFAULT 0,
  n_months      INTEGER,
  lm            NUMERIC,
  km            INTEGER DEFAULT 15000,
  oa            NUMERIC,                    -- NULL si LLD
  services      JSONB DEFAULT '{}',
  results       JSONB,                      -- objet calculé complet
  score         TEXT,                       -- 'good' | 'ok' | 'bad'
  img_url       TEXT,
  vehicle       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- 3. ROW LEVEL SECURITY (RLS)
-- Chaque utilisateur ne voit et ne modifie QUE ses propres données
-- -----------------------------------------------

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- Simulations
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulations"
  ON public.simulations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations"
  ON public.simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulations"
  ON public.simulations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations"
  ON public.simulations FOR DELETE
  USING (auth.uid() = user_id);


-- 4. INDEX pour les performances
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON public.simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_created_at ON public.simulations(created_at DESC);


-- ============================================================
-- COMPTE ADMIN MANUEL
-- Après avoir créé un compte via l'interface, run cette requête
-- en remplaçant 'ton-email@exemple.com' par ton email réel :
-- ============================================================
-- UPDATE public.profiles
-- SET admin = TRUE, premium = TRUE
-- WHERE email = 'ton-email@exemple.com';
