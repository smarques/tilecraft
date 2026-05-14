import { requireAuth, json } from './_auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const { results } = await env.DB.prepare(
            `SELECT key, value FROM app_settings WHERE key IN ('tagline', 'about', 'min_words', 'save_placeholder')`
        ).all();
        const out = {};
        for (const row of results) out[row.key] = row.value;
        return json(out);
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}

export async function onRequestPut(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const body = await request.json();
        const allowed = ['tagline', 'about', 'min_words', 'save_placeholder'];
        const updates = [];

        for (const key of allowed) {
            if (!(key in body)) continue;
            if (key === 'min_words') {
                const n = parseInt(body[key]);
                if (!Number.isInteger(n) || n < 0)
                    return json({ error: 'min_words must be a non-negative integer' }, 400);
                updates.push({ key, value: String(n) });
            } else {
                if (typeof body[key] !== 'string')
                    return json({ error: `${key} must be a string` }, 400);
                updates.push({ key, value: body[key] });
            }
        }

        if (updates.length === 0) return json({ error: 'No valid fields to update' }, 400);

        for (const { key, value } of updates) {
            await env.DB.prepare(
                `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
            ).bind(key, value).run();
        }

        return json({ success: true });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
