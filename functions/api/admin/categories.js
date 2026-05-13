import { requireAuth, json } from './_auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const row = await env.DB.prepare(
            'SELECT value FROM app_settings WHERE key = ?'
        ).bind('categories').first();
        return json({ categories: row ? JSON.parse(row.value) : null });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}

export async function onRequestPut(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const { categories } = await request.json();
        if (!categories || typeof categories !== 'object' || Array.isArray(categories))
            return json({ error: 'categories must be an object' }, 400);

        for (const [key, val] of Object.entries(categories)) {
            if (!/^[a-z0-9_-]+$/.test(key))
                return json({ error: `Invalid category key: "${key}" (use lowercase letters, numbers, - or _)` }, 400);
            if (!val || typeof val.label !== 'string' || !val.label.trim())
                return json({ error: `Category "${key}" must have a label` }, 400);
            if (!val.color || !/^#[0-9a-fA-F]{6}$/.test(val.color))
                return json({ error: `Category "${key}" must have a valid hex color` }, 400);
        }

        const value = JSON.stringify(categories);
        await env.DB.prepare(
            `INSERT INTO app_settings (key, value, updated_at) VALUES ('categories', ?, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).bind(value).run();

        return json({ success: true, count: Object.keys(categories).length });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
