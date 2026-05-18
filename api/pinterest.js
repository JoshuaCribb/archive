export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param' });

  try {
    // Fetch the Pinterest page as a real browser would
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!r.ok) return res.status(502).json({ error: 'Pinterest fetch failed', status: r.status });

    const html = await r.text();

    // Pinterest embeds image data in a JSON blob inside a <script> tag
    // Try several known patterns in order of preference (highest res first)
    const patterns = [
      // og:image meta tag — usually high res
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
      /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i,
      // Pinimg originals in JSON blobs
      /"url"\s*:\s*"(https:\/\/i\.pinimg\.com\/originals\/[^"]+)"/,
      // Any pinimg URL (fallback)
      /"url"\s*:\s*"(https:\/\/i\.pinimg\.com\/[^"]+\.(?:jpg|jpeg|png|webp))"/i,
      /https:\/\/i\.pinimg\.com\/originals\/[^"'\s]+/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        // Unescape any unicode escapes Pinterest puts in JSON
        const imgUrl = (match[1] || match[0]).replace(/\\u002F/g, '/').replace(/\\/g, '');
        return res.status(200).json({ img: imgUrl });
      }
    }

    return res.status(404).json({ error: 'Could not find image in Pinterest page' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}