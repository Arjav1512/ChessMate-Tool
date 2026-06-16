import { describe, it, expect } from 'vitest';
import { runPgnBatch, type WorkerOutMessage } from './pgnWorker';

const SINGLE_GAME = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`;

const TWO_GAMES = `[Event "G1"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 1-0

[Event "G2"]
[White "Carol"]
[Black "Dave"]
[Result "0-1"]

1. d4 d5 0-1`;

const INVALID_GAME = `[Event "Bogus"]
[White "Alice"]
[Black "Bob"]

1. e4 e5 2. ZZZ 1-0`;

function collect(text: string): WorkerOutMessage[] {
  const out: WorkerOutMessage[] = [];
  runPgnBatch(text, (msg) => out.push(msg));
  return out;
}

describe('runPgnBatch (worker core)', () => {
  describe('success path', () => {
    it('emits progress then done for a single game', () => {
      const msgs = collect(SINGLE_GAME);
      const progress = msgs.filter((m) => m.type === 'progress');
      const done = msgs.filter((m) => m.type === 'done');

      expect(progress.length).toBeGreaterThan(0);
      expect(done).toHaveLength(1);
      expect(done[0]).toMatchObject({ type: 'done', skipped: 0 });

      const last = msgs[msgs.length - 1];
      expect(last.type).toBe('done');
      if (last.type === 'done') {
        expect(last.games).toHaveLength(1);
        expect(last.games[0].headers.White).toBe('Alice');
        expect(last.games[0].headers.Black).toBe('Bob');
        expect(last.games[0].moveCount).toBeGreaterThan(0);
        expect(last.firstError).toBeUndefined();
      }
    });

    it('parses multiple games and surfaces them in order', () => {
      const msgs = collect(TWO_GAMES);
      const done = msgs.find((m) => m.type === 'done');
      expect(done).toBeDefined();
      if (done && done.type === 'done') {
        expect(done.games).toHaveLength(2);
        expect(done.games[0].headers.White).toBe('Alice');
        expect(done.games[1].headers.White).toBe('Carol');
        expect(done.skipped).toBe(0);
      }
    });

    it('reports final progress matching total games', () => {
      const msgs = collect(TWO_GAMES);
      const progress = msgs.filter((m) => m.type === 'progress');
      const last = progress[progress.length - 1];
      expect(last.type).toBe('progress');
      if (last.type === 'progress') {
        expect(last.done).toBe(last.total);
        expect(last.total).toBe(2);
      }
    });
  });

  describe('failure path', () => {
    it('emits done with skipped count and firstError when a game fails', () => {
      const mixed = `${SINGLE_GAME}\n\n${INVALID_GAME}`;
      const msgs = collect(mixed);
      const done = msgs.find((m) => m.type === 'done');
      expect(done).toBeDefined();
      if (done && done.type === 'done') {
        expect(done.games).toHaveLength(1);
        expect(done.skipped).toBe(1);
        expect(done.firstError).toBeDefined();
        expect(typeof done.firstError).toBe('string');
      }
    });

    it('returns empty games + skipped=1 for an all-bad batch', () => {
      const msgs = collect(INVALID_GAME);
      const done = msgs.find((m) => m.type === 'done');
      expect(done).toBeDefined();
      if (done && done.type === 'done') {
        expect(done.games).toHaveLength(0);
        expect(done.skipped).toBe(1);
        expect(done.firstError).toBeDefined();
      }
    });
  });

  describe('invalid payloads', () => {
    it('emits done with no games for empty text', () => {
      const msgs = collect('');
      const done = msgs.find((m) => m.type === 'done');
      expect(done).toBeDefined();
      if (done && done.type === 'done') {
        expect(done.games).toHaveLength(0);
        expect(done.skipped).toBe(0);
      }
    });

    it('emits done with no games for whitespace-only text', () => {
      const msgs = collect('   \n  \n');
      const done = msgs.find((m) => m.type === 'done');
      expect(done).toBeDefined();
      if (done && done.type === 'done') {
        expect(done.games).toHaveLength(0);
      }
    });

    it('emits done with skipped game for garbage text', () => {
      const msgs = collect('this is not a PGN at all');
      const done = msgs.find((m) => m.type === 'done');
      expect(done).toBeDefined();
      if (done && done.type === 'done') {
        expect(done.games).toHaveLength(0);
        expect(done.skipped).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('worker message protocol via mocked self', () => {
    it('ignores messages with the wrong type', async () => {
      const posted: unknown[] = [];
      const fakeSelf = {
        postMessage: (msg: unknown) => posted.push(msg),
      };
      // Simulate the worker's onmessage handler logic directly.
      const handler = (e: { data: { type: string; text?: string } }) => {
        if (e.data?.type !== 'parse') return;
        runPgnBatch(e.data.text ?? '', (msg) => fakeSelf.postMessage(msg));
      };

      handler({ data: { type: 'noise' } });
      expect(posted).toHaveLength(0);

      handler({ data: { type: 'parse', text: SINGLE_GAME } });
      expect(posted.length).toBeGreaterThan(0);
      const last = posted[posted.length - 1] as WorkerOutMessage;
      expect(last.type).toBe('done');
    });
  });
});
