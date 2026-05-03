# LeasEval — Guide de déploiement

## Structure du projet

```
leaseval-prod/
├── index.html              ← Application principale
├── api/
│   ├── create-checkout.js  ← Serverless: crée session Stripe
│   └── stripe-webhook.js   ← Serverless: active Premium après paiement
├── supabase-schema.sql     ← SQL à coller dans Supabase
├── vercel.json             ← Config Vercel
├── .env.example            ← Template des variables d'environnement
└── README.md               ← Ce fichier
```

## Étapes de déploiement

### ÉTAPE 1 — Créer les comptes (5 min)
1. **Supabase** : https://supabase.com → Sign up → New Project
   - Retiens bien le mot de passe de la DB
2. **Stripe** : https://stripe.com → Créer un compte → Mode Test activé au début
3. **Vercel** : https://vercel.com → Sign up avec GitHub
4. **GitHub** : https://github.com → New repository "leaseval" (public)

### ÉTAPE 2 — Configurer Supabase (10 min)
1. Dans Supabase : ouvre **SQL Editor** → **New query**
2. Colle tout le contenu de `supabase-schema.sql` → **Run**
3. Va dans **Authentication → Providers** : vérifie que "Email" est activé
4. (Optionnel) Désactive "Confirm email" pour les tests : **Auth → Settings → Email**
5. Récupère tes clés dans **Project Settings → API** :
   - `Project URL` → `SUPABASE_URL`
   - `anon/public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### ÉTAPE 3 — Modifier index.html (2 min)
Ouvre `index.html`, trouve ces 2 lignes (vers le début) et remplace :
```js
window.SUPABASE_URL = '__SUPABASE_URL__';         // ← colle ton URL Supabase
window.SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__'; // ← colle ta clé anon
```

### ÉTAPE 4 — Pousser sur GitHub (3 min)
```bash
cd leaseval-prod
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/leaseval.git
git push -u origin main
```

### ÉTAPE 5 — Déployer sur Vercel (5 min)
1. vercel.com → **Add New Project** → Importe ton repo GitHub "leaseval"
2. **Framework Preset** : Other
3. Dans **Environment Variables**, ajoute ces 4 variables :
   | Variable | Valeur |
   |---|---|
   | `STRIPE_SECRET_KEY` | `sk_test_...` (Stripe → Developers → API keys) |
   | `STRIPE_WEBHOOK_SECRET` | (voir étape 6) |
   | `SUPABASE_URL` | ton URL Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | ta clé service_role |
   | `NEXT_PUBLIC_SITE_URL` | `https://leaseval.vercel.app` (ton URL Vercel) |
4. Clique **Deploy** → note l'URL générée (ex: https://leaseval-abc123.vercel.app)

### ÉTAPE 6 — Configurer le webhook Stripe (5 min)
1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL : `https://TON_URL_VERCEL.vercel.app/api/stripe-webhook`
3. Events : sélectionne **checkout.session.completed**
4. Copie le **Signing secret** (commence par `whsec_...`)
5. Retourne dans Vercel → **Settings → Environment Variables** → ajoute :
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
6. **Redéploie** : Vercel Dashboard → Deployments → Redeploy

### ÉTAPE 7 — Ton compte admin (1 min)
1. Ouvre ton site et crée un compte avec TON email
2. Dans Supabase → **Table Editor → profiles**
3. Trouve ta ligne → double-clique sur `admin` → mets `true` → Save
4. Recharge le site → tu as accès Premium sans payer

### ÉTAPE 8 — Passer en production Stripe (quand tu es prêt)
1. Stripe Dashboard → active le **Live mode**
2. Remplace `sk_test_...` par `sk_live_...` dans Vercel
3. Recrée un webhook en Live mode et mets à jour `STRIPE_WEBHOOK_SECRET`
