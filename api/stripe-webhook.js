// api/stripe-webhook.js
// Vercel Serverless Function — reçoit la confirmation de paiement Stripe
// Stripe appelle cette URL automatiquement après un paiement réussi

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Client Supabase avec la clé SERVICE_ROLE (admin — peut écrire sans restriction)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ clé admin — JAMAIS côté client
);

// Désactiver le body parser de Vercel (Stripe envoie un body brut signé)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Lire le body brut (nécessaire pour vérifier la signature Stripe)
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    // Vérifier que l'événement vient vraiment de Stripe (sécurité)
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Traiter uniquement les paiements réussis
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error('userId manquant dans les metadata Stripe');
      return res.status(400).json({ error: 'userId manquant' });
    }

    // Activer Premium dans Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        premium: true,
        stripe_customer_id: session.customer || null,
        premium_activated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Erreur Supabase update premium:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Premium activé pour userId: ${userId}`);
  }

  // Toujours répondre 200 à Stripe (sinon il réessaie)
  return res.status(200).json({ received: true });
}
