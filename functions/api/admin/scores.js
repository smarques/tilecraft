import { requireAuth, json } from './_auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    if (!await requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    try {
        const { results } = await env.DB.prepare(
            `SELECT id, player_name, score, moves, statement, board_state, date, created_at
             FROM game_sessions
             ORDER BY score DESC
             LIMIT 500`
        ).all();
        return json({ scores: results });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}
