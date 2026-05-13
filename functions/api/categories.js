// Public categories endpoint. Serves from D1 if admin has saved categories; 404 otherwise
// (client falls back to /data/categories.json).
export async function onRequestGet(context) {
    const { env } = context;
    try {
        const row = await env.DB.prepare(
            'SELECT value FROM app_settings WHERE key = ?'
        ).bind('categories').first();
        if (!row) return new Response(null, { status: 404 });
        return new Response(row.value, { headers: { 'Content-Type': 'application/json' } });
    } catch {
        return new Response(null, { status: 404 });
    }
}
