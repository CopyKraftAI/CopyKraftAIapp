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

async function activatePro(email, isPro) {
  console.log('Attempting to set is_pro=' + isPro + ' for ' + email);

  // Step 1: Get user ID from Supabase auth
  const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const usersData = await usersRes.json();
  console.log('Total users found:', usersData.users?.length);
  
  const user = usersData.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.log('ERROR: No user found for email:', email);
    return false;
  }
  console.log('Found user ID:', user.id);

  // Step 2: Update existing profile
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ is_pro: isPro })
    }
  );
  const updateData = await updateRes.json();
  console.log('Update result:', JSON.stringify(updateData));

  // Step 3: If no rows updated, insert new profile
  if (!updateData || updateData.length === 0) {
    console.log('No existing profile found, inserting new one...');
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ id: user.id, email, is_pro: isPro })
    });
    const insertData = await insertRes.json();
    console.log('Insert result:', JSON.stringify(insertData));
  }

  return true;
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
    console.log('Sig error:', e.message);
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  if (!valid) return res.status(400).json({ error: 'Invalid signature' });

  const event = JSON.parse(rawBody.toString('utf8'));
  console.log('Stripe event received:', event.type);

  try {
    let email = null;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      email = session.customer_details?.email || session.customer_email;
      console.log('Checkout email:', email);
      if (email) await activatePro(email, true);
    }

    if (event.type === 'customer.subscription.created') {
      const sub = event.data.object;
      const customerRes = await fetch(`https://api.stripe.com/v1/customers/${sub.customer}`, {
        headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
      });
      const customer = await customerRes.json();
      email = customer.email;
      console.log('Subscription created for:', email);
      if (email) await activatePro(email, true);
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerRes = await fetch(`https://api.stripe.com/v1/customers/${sub.customer}`, {
        headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
      });
      const customer = await customerRes.json();
      email = customer.email;
      console.log('Subscription cancelled for:', email);
      if (email) await activatePro(email, false);
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
