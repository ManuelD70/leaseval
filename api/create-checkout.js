// api/create-checkout.js
// Vercel Serverless Function — crée une session Stripe Checkout
// Appelée par le frontend quand l'utilisateur clique "Payer 4,99 €"

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS pour autoriser les appels depuis le frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userEmail } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId requis' });
    }

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'LeasEval Premium',
              description: 'Accès permanent — exports PDF/Excel, comparaisons illimitées',
              images: [], // tu peux ajouter une image produit ici
            },
            unit_amount: 499, // 4,99 € en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}?premium=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}?premium=cancel`,
      metadata: {
        userId: userId, // CRUCIAL : permet d'activer Premium dans le webhook
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
