export const config = { api: { bodyParser: false } };

const SUPABASE_URL = 'https://cwzvnlwbotgwjlxagglp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3enZubHdib3Rnd2pseGFnZ2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY1OTkyMCwiZXhwIjoyMDkzMjM1OTIwfQ.JWou_EUaUPglQueoDFmYWp-v-5IwVhHyv3HVf_ocmpY';
const STRIPE_WEBHOOK_SECRET = 'whsec_3YV4GradqRAT0uV00MEl9NoN4gfzG74V';

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function verifyStripeSignature(rawBody, signature, secret) {
  const encoder = new TextEncoder();
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
  const v1 = parts.find(p => p.startsWith('v1=')).split('=')[1];

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(signatureBytes)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computedSig === v1;
}

async function setProStatus(email, isPro) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ is_pro: isPro })
  });
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  if (!signature) return res.status(400).json({ error: 'No signature' });

  let valid;
  try {
    valid = await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  if (!valid) return res.status(400).json({ error: 'Invalid signature' });

  const event = JSON.parse(rawBody.toString('utf8'));
  console.log('Stripe event:', event.type);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email;
      if (email) {
        await setProStatus(email, true);
        console.log('Pro activated for:', email);
      }
    }

    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object;
      // Get customer email from Stripe
      const customerRes = await fetch(`https://api.stripe.com/v1/customers/${subscription.customer}`, {
        headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
      });
      const customer = await customerRes.json();
      if (customer.email) {
        await setProStatus(customer.email, true);
        console.log('Pro activated for:', customer.email);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerRes = await fetch(`https://api.stripe.com/v1/customers/${subscription.customer}`, {
        headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
      });
      const customer = await customerRes.json();
      if (customer.email) {
        await setProStatus(customer.email, false);
        console.log('Pro deactivated for:', customer.email);
      }
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: e.message });
  }
}
