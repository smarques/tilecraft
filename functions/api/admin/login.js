import { hashPassword, generateToken, sessionCookie, json } from './_auth.js';

const SESSION_DAYS = 7;

export async function onRequestPost(context) {
    const { env, request } = context;
    try {
        const { username, password } = await request.json();
        if (!username || !password) return json({ error: 'Missing credentials' }, 400);

        const user = await env.DB.prepare(
            'SELECT username, password_hash, salt FROM admin_users WHERE username = ?'
        ).bind(username).first();

        if (!user) return json({ error: 'Invalid credentials' }, 401);

        const hash = await hashPassword(password, user.salt);
        if (hash !== user.password_hash) return json({ error: 'Invalid credentials' }, 401);

        const token = generateToken();
        const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

        await env.DB.prepare(
            'INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)'
        ).bind(token, expires.toISOString()).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': sessionCookie(token, expires)
            }
        });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
