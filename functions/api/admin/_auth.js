const ITERATIONS = 100_000;
const SESSION_DAYS = 7;

export async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: ITERATIONS, hash: 'SHA-256' },
        key,
        256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function requireAuth(request, env) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_session=([a-f0-9]{64})/);
    if (!match) return null;
    const token = match[1];
    const row = await env.DB.prepare(
        `SELECT token, username FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')`
    ).bind(token).first();
    return row ? { token: row.token, username: row.username } : null;
}

export function sessionCookie(token, expires) {
    const d = expires instanceof Date ? expires : new Date(Date.now() + SESSION_DAYS * 86_400_000);
    return `admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${d.toUTCString()}`;
}

export function clearSessionCookie() {
    return `admin_session=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
