import { requireAuth, clearSessionCookie, json } from './_auth.js';

export async function onRequestPost(context) {
    const { env, request } = context;
    const auth = await requireAuth(request, env);
    if (auth) {
        await env.DB.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(auth.token).run();
    }
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': clearSessionCookie()
        }
    });
}
