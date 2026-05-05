export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.ANTHROPIC_KEY;
  const body = req.body;
  
  res.status(200).json({ 
    hasKey: !!key,
    keyLength: key?.length,
    body: body,
    bodyType: typeof body
  });
}
