// Public words endpoint. Serves from D1 if admin has saved a word list; 404 otherwise
// (client falls back to /data/words.json).
export async function onRequestGet(context) {
    const { env } = context;
    try {
        const row = await env.DB.prepare(
            'SELECT value FROM app_settings WHERE key = ?'
        ).bind('words').first();
        if (!row) return new Response(null, { status: 404 });
        return new Response(row.value, { headers: { 'Content-Type': 'application/json' } });
    } catch {
        return new Response(null, { status: 404 });
    }
}
