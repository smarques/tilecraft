import { requireAuth, json } from './_auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    const auth = await requireAuth(request, env);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    return json({ authenticated: true, username: auth.username });
}
