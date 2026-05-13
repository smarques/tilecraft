import { requireAuth, json } from './_auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    const token = await requireAuth(request, env);
    if (!token) return json({ error: 'Unauthorized' }, 401);
    return json({ authenticated: true });
}
