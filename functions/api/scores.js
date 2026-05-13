function isAllowedOrigin(request, env) {
    const allowed = env.ALLOWED_ORIGIN;
    if (!allowed) return true;
    return request.headers.get('Origin') === allowed;
}

export async function onRequestGet(context) {
    const { env, request } = context;

    if (!isAllowedOrigin(request, env)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { results } = await env.DB.prepare(
            `SELECT player_name, score, moves, statement, board_state, date
             FROM game_sessions
             ORDER BY score DESC
             LIMIT 100`
        ).all();

        return new Response(JSON.stringify({ scores: results }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
