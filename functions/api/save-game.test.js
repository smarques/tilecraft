import { describe, it, expect, vi } from 'vitest';
import { onRequestPost } from './save-game.js';

const ORIGIN = 'https://tilecraft-game.pages.dev';

// 36-cell board matching TOTAL_TILES (cells include the selected flag)
const validBoard = Array.from({ length: 36 }, (_, i) =>
    i < 35 ? { id: i, text: 'word', category: 'activities', selected: i < 3 } : null
);

const validPayload = {
    playerName: 'Alice',
    score: 150,
    moves: 42,
    statement: 'A great session exploring words.',
    boardState: validBoard,
    date: '2026-04-12T10:00:00.000Z'
};

function makeContext(body, { origin = ORIGIN, allowedOrigin = ORIGIN, dbRun = vi.fn().mockResolvedValue({}) } = {}) {
    const bind = vi.fn().mockReturnValue({ run: dbRun });
    const prepare = vi.fn().mockReturnValue({ bind });

    return {
        request: new Request('https://example.com/api/save-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(origin ? { Origin: origin } : {})
            },
            body: JSON.stringify(body)
        }),
        env: {
            DB: { prepare },
            ...(allowedOrigin ? { ALLOWED_ORIGIN: allowedOrigin } : {})
        },
        _mocks: { prepare, bind, dbRun }
    };
}

describe('onRequestPost', () => {
    describe('origin check', () => {
        it('allows the request when origin matches ALLOWED_ORIGIN', async () => {
            const ctx = makeContext(validPayload);
            const res = await onRequestPost(ctx);
            expect(res.status).toBe(200);
        });

        it('returns 403 when origin does not match ALLOWED_ORIGIN', async () => {
            const ctx = makeContext(validPayload, { origin: 'https://evil.com' });
            const res = await onRequestPost(ctx);
            expect(res.status).toBe(403);
            expect(await res.json()).toEqual({ error: 'Forbidden' });
        });

        it('returns 403 when Origin header is missing and ALLOWED_ORIGIN is set', async () => {
            const ctx = makeContext(validPayload, { origin: null });
            const res = await onRequestPost(ctx);
            expect(res.status).toBe(403);
        });

        it('allows any origin when ALLOWED_ORIGIN is not configured (dev mode)', async () => {
            const ctx = makeContext(validPayload, { origin: 'http://localhost:8788', allowedOrigin: null });
            const res = await onRequestPost(ctx);
            expect(res.status).toBe(200);
        });

        it('does not touch the database on a 403', async () => {
            const ctx = makeContext(validPayload, { origin: 'https://evil.com' });
            await onRequestPost(ctx);
            expect(ctx._mocks.prepare).not.toHaveBeenCalled();
        });
    });

    describe('happy path', () => {
        it('returns 200 with { success: true }', async () => {
            const ctx = makeContext(validPayload);
            expect(await (await onRequestPost(ctx)).json()).toEqual({ success: true });
        });

        it('calls DB.prepare with the correct INSERT statement', async () => {
            const ctx = makeContext(validPayload);
            await onRequestPost(ctx);
            const sql = ctx._mocks.prepare.mock.calls[0][0];
            expect(sql).toMatch(/INSERT INTO game_sessions/i);
            expect(sql).toMatch(/player_name.*score.*moves.*statement.*board_state.*date/is);
        });

        it('binds all six values in the right order', async () => {
            const ctx = makeContext(validPayload);
            await onRequestPost(ctx);
            const args = ctx._mocks.bind.mock.calls[0];
            expect(args[0]).toBe('Alice');
            expect(args[1]).toBe(150);
            expect(args[2]).toBe(42);
            expect(args[3]).toBe('A great session exploring words.');
            expect(args[4]).toBe(JSON.stringify(validBoard));
            expect(args[5]).toBe('2026-04-12T10:00:00.000Z');
        });

        it('persists the selected flag for each board cell', async () => {
            const ctx = makeContext(validPayload);
            await onRequestPost(ctx);
            const stored = JSON.parse(ctx._mocks.bind.mock.calls[0][4]);
            const selectedPositions = stored
                .map((cell, i) => (cell?.selected ? i : null))
                .filter(i => i !== null);
            expect(selectedPositions).toEqual([0, 1, 2]);
        });

        it('coerces a missing statement to an empty string', async () => {
            const { statement: _, ...noStatement } = validPayload;
            const ctx = makeContext(noStatement);
            await onRequestPost(ctx);
            expect(ctx._mocks.bind.mock.calls[0][3]).toBe('');
        });
    });

    describe('input validation', () => {
        describe('playerName', () => {
            it.each([
                ['empty string', ''],
                ['over 60 chars', 'A'.repeat(61)],
            ])('returns 400 for %s', async (_, playerName) => {
                const ctx = makeContext({ ...validPayload, playerName });
                expect((await onRequestPost(ctx)).status).toBe(400);
            });
        });

        describe('score', () => {
            it.each([
                ['negative', -1],
                ['above max', 1_000_001],
                ['Infinity', Infinity],
                ['string', '150'],
            ])('returns 400 for %s', async (_, score) => {
                const ctx = makeContext({ ...validPayload, score });
                expect((await onRequestPost(ctx)).status).toBe(400);
            });
        });

        describe('moves', () => {
            it.each([
                ['negative', -1],
                ['above max', 100_001],
                ['string', '42'],
            ])('returns 400 for %s', async (_, moves) => {
                const ctx = makeContext({ ...validPayload, moves });
                expect((await onRequestPost(ctx)).status).toBe(400);
            });
        });

        describe('statement', () => {
            it('returns 400 when statement exceeds 5000 chars', async () => {
                const ctx = makeContext({ ...validPayload, statement: 'x'.repeat(5001) });
                expect((await onRequestPost(ctx)).status).toBe(400);
            });

            it('accepts a null statement', async () => {
                const ctx = makeContext({ ...validPayload, statement: null });
                expect((await onRequestPost(ctx)).status).toBe(200);
            });
        });

        describe('boardState', () => {
            it.each([
                ['not an array', 'bad'],
                ['too few cells', validBoard.slice(0, 35)],
                ['too many cells', [...validBoard, null]],
            ])('returns 400 for %s', async (_, boardState) => {
                const ctx = makeContext({ ...validPayload, boardState });
                expect((await onRequestPost(ctx)).status).toBe(400);
            });
        });

        describe('date', () => {
            it.each([
                ['empty string', ''],
                ['not a date string', 'yesterday'],
                ['missing', undefined],
            ])('returns 400 for %s', async (_, date) => {
                const ctx = makeContext({ ...validPayload, date });
                expect((await onRequestPost(ctx)).status).toBe(400);
            });
        });

        it('does not touch the database on a 400', async () => {
            const ctx = makeContext({ ...validPayload, score: -1 });
            await onRequestPost(ctx);
            expect(ctx._mocks.prepare).not.toHaveBeenCalled();
        });
    });

    describe('database error handling', () => {
        it('returns 500 when DB.run() rejects', async () => {
            const ctx = makeContext(validPayload, {
                dbRun: vi.fn().mockRejectedValue(new Error('D1: table not found'))
            });
            const res = await onRequestPost(ctx);
            expect(res.status).toBe(500);
            expect((await res.json()).error).toBe('D1: table not found');
        });

        it('returns 500 when the request body is invalid JSON', async () => {
            const ctx = {
                request: new Request('https://example.com/api/save-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
                    body: 'not json'
                }),
                env: { DB: { prepare: vi.fn() }, ALLOWED_ORIGIN: ORIGIN }
            };
            const res = await onRequestPost(ctx);
            expect(res.status).toBe(500);
        });
    });
});
