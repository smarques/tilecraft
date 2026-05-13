import { requireAuth, hashPassword, generateSalt, json } from '../_auth.js';

export async function onRequestDelete(context) {
    const { env, request, params } = context;
    const auth = await requireAuth(request, env);
    if (!auth) return json({ error: 'Unauthorized' }, 401);

    const target = params.username;
    if (auth.username === target)
        return json({ error: 'Cannot delete your own account' }, 400);

    try {
        const count = await env.DB.prepare('SELECT COUNT(*) as c FROM admin_users').first();
        if (count.c <= 1) return json({ error: 'Cannot delete the last admin' }, 400);

        await env.DB.prepare('DELETE FROM admin_users WHERE username = ?').bind(target).run();
        await env.DB.prepare('DELETE FROM admin_sessions WHERE username = ?').bind(target).run();
        return json({ success: true });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}

export async function onRequestPut(context) {
    const { env, request, params } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    const target = params.username;
    try {
        const { password } = await request.json();
        if (!password || typeof password !== 'string' || password.length < 8)
            return json({ error: 'Password must be at least 8 characters' }, 400);

        const user = await env.DB.prepare(
            'SELECT username FROM admin_users WHERE username = ?'
        ).bind(target).first();
        if (!user) return json({ error: 'User not found' }, 404);

        const salt = generateSalt();
        const hash = await hashPassword(password, salt);
        await env.DB.prepare(
            'UPDATE admin_users SET password_hash = ?, salt = ? WHERE username = ?'
        ).bind(hash, salt, target).run();

        return json({ success: true });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
