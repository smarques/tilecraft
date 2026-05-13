// Public settings endpoint — returns tagline and about content from D1.
export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare(
            `SELECT key, value FROM app_settings WHERE key IN ('tagline', 'about')`
        ).all();
        const out = {};
        for (const row of results) out[row.key] = row.value;
        return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
    } catch {
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    }
}
