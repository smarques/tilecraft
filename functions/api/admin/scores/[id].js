import { requireAuth, json } from '../_auth.js';

export async function onRequestDelete(context) {
    const { env, request, params } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return json({ error: 'Invalid id' }, 400);

    try {
        const result = await env.DB.prepare(
            'DELETE FROM game_sessions WHERE id = ?'
        ).bind(id).run();

        if (result.meta.changes === 0) return json({ error: 'Not found' }, 404);
        return json({ success: true });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
