const LIMITS = {
    playerName: 60,
    statement: 5000,
    boardCells: 36,       // must stay in sync with TOTAL_TILES in script.js
    maxScore: 1_000_000,
    maxMoves: 100_000
};

// Returns true when the request origin is allowed.
// If ALLOWED_ORIGIN is not configured (e.g. local dev), all origins pass.
function isAllowedOrigin(request, env) {
    const allowed = env.ALLOWED_ORIGIN;
    if (!allowed) return true;
    return request.headers.get('Origin') === allowed;
}

function validate({ playerName, score, moves, statement, boardState, date }) {
    if (!playerName || typeof playerName !== 'string' || playerName.length > LIMITS.playerName)
        return 'Invalid playerName';
    if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > LIMITS.maxScore)
        return 'Invalid score';
    if (typeof moves !== 'number' || !isFinite(moves) || moves < 0 || moves > LIMITS.maxMoves)
        return 'Invalid moves';
    if (statement != null && (typeof statement !== 'string' || statement.length > LIMITS.statement))
        return 'Invalid statement';
    if (!Array.isArray(boardState) || boardState.length !== LIMITS.boardCells)
        return 'Invalid boardState';
    if (!date || typeof date !== 'string' || isNaN(Date.parse(date)))
        return 'Invalid date';
    return null;
}

export async function onRequestPost(context) {
    const { env, request } = context;

    if (!isAllowedOrigin(request, env)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { playerName, score, moves, statement, boardState, date } = body;

        const validationError = validate({ playerName, score, moves, statement, boardState, date });
        if (validationError) {
            return new Response(JSON.stringify({ error: validationError }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await env.DB.prepare(
            `INSERT INTO game_sessions (player_name, score, moves, statement, board_state, date)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
            playerName.trim(),
            score,
            moves,
            (statement || '').trim(),
            JSON.stringify(boardState),
            date
        ).run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
