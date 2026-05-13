import { requireAuth, clearSessionCookie, json } from './_auth.js';

export async function onRequestPost(context) {
    const { env, request } = context;
    const token = await requireAuth(request, env);
    if (token) {
        await env.DB.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(token).run();
    }
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': clearSessionCookie()
        }
    });
}
