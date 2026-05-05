export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const prompt = body?.prompt || '';
    
    console.log('Prompt received:', prompt?.slice(0, 50));
    console.log('API Key exists:', !!process.env.ANTHROPIC_KEY);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log('Anthropic response:', JSON.stringify(data));
    
    const text = data?.content?.[0]?.text || '';
    res.status(200).json({ text });
  } catch(e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
