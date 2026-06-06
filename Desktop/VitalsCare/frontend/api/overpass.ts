export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // We expect the client to send JSON: { query: "[out:json][timeout:15]..." }
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "VitalsCare-Vercel-Proxy"
      }
    });

    if (!overpassRes.ok) {
      const text = await overpassRes.text();
      return new Response(JSON.stringify({ error: 'Overpass API Error', details: text }), { 
        status: overpassRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await overpassRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
