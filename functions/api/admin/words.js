import { requireAuth, json } from './_auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const row = await env.DB.prepare(
            'SELECT value FROM app_settings WHERE key = ?'
        ).bind('words').first();
        return json({ words: row ? JSON.parse(row.value) : null });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}

export async function onRequestPut(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const { words } = await request.json();
        if (!Array.isArray(words) || words.length === 0)
            return json({ error: 'words must be a non-empty array' }, 400);

        for (const w of words) {
            if (!w || typeof w.text !== 'string' || !w.text.trim())
                return json({ error: 'Each word must have a non-empty text field' }, 400);
            if (typeof w.category !== 'string')
                return json({ error: 'Each word must have a category field' }, 400);
        }

        const value = JSON.stringify(words.map(w => ({ text: w.text.trim().toUpperCase(), category: w.category })));

        await env.DB.prepare(
            `INSERT INTO app_settings (key, value, updated_at) VALUES ('words', ?, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).bind(value).run();

        return json({ success: true, count: words.length });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
