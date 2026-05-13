import { requireAuth, hashPassword, generateSalt, json } from './_auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const { results } = await env.DB.prepare(
            'SELECT username FROM admin_users ORDER BY username'
        ).all();
        return json({ users: results.map(r => r.username) });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const { username, password } = await request.json();
        if (!username || typeof username !== 'string' || username.trim().length === 0 || username.trim().length > 50)
            return json({ error: 'Username must be 1–50 characters' }, 400);
        if (!password || typeof password !== 'string' || password.length < 8)
            return json({ error: 'Password must be at least 8 characters' }, 400);

        const existing = await env.DB.prepare(
            'SELECT username FROM admin_users WHERE username = ?'
        ).bind(username.trim()).first();
        if (existing) return json({ error: 'Username already exists' }, 409);

        const salt = generateSalt();
        const hash = await hashPassword(password, salt);
        await env.DB.prepare(
            'INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)'
        ).bind(username.trim(), hash, salt).run();

        return json({ success: true, username: username.trim() }, 201);
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
