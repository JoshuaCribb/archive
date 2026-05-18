// /api/metadata.js
// Fetches a URL server-side and extracts og:title / og:description (and fallbacks).
// Usage: GET /api/metadata?url=https://example.com
// Returns: { title, description, image, url }

export default async function handler(req, res) {
  const url = req.query?.url;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  // Basic validation
  let target;
  try {
    target = new URL(url);
    if (!/^https?:$/.test(target.protocol)) throw new Error('bad protocol');
  } catch {
    res.status(400).json({ error: 'Invalid url' });
    return;
  }

  try {
    const r = await fetch(target.href, {
      headers: {
        // Pretend to be a real browser so sites don't block us
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });
    const html = await r.text();

    // Trim to <head> if possible (faster regex; falls back to whole doc)
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const scope = headMatch ? headMatch[1] : html;

    const pick = (...patterns) => {
      for (const re of patterns) {
        const m = scope.match(re);
        if (m && m[1]) return decodeEntities(m[1].trim());
      }
      return '';
    };

    const title = pick(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<title[^>]*>([^<]+)<\/title>/i
    );

    const description = pick(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    );

    const image = pick(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
    );

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).json({
      url: target.href,
      title,
      description,
      image
    });
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err && err.message || err) });
  }
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}