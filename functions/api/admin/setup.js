import { hashPassword, generateSalt, json } from './_auth.js';

// Works only when admin_users is empty — call once after deployment to create the first admin.
export async function onRequestPost(context) {
    const { env, request } = context;
    try {
        const row = await env.DB.prepare('SELECT COUNT(*) as count FROM admin_users').first();
        if (row.count > 0) return json({ error: 'Not found' }, 404);

        const { username, password } = await request.json();
        if (!username || typeof username !== 'string' || username.trim().length === 0 || username.length > 50)
            return json({ error: 'Invalid username' }, 400);
        if (!password || typeof password !== 'string' || password.length < 12)
            return json({ error: 'Password must be at least 12 characters' }, 400);

        const salt = generateSalt();
        const hash = await hashPassword(password, salt);

        await env.DB.prepare(
            'INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)'
        ).bind(username.trim(), hash, salt).run();

        return json({ success: true });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
