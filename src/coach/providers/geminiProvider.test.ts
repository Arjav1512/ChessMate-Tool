import { describe, expect, it, vi } from 'vitest';
import { CoachUnavailableError } from '../errors';
import { GeminiProvider } from './geminiProvider';

const BASE_URL = 'https://test.supabase.co';

function makeProvider(overrides?: {
  token?: string | null;
  response?: Response;
  fetchImpl?: typeof fetch;
}) {
  const fetchFn =
    overrides?.fetchImpl ??
    vi.fn(async () => overrides?.response ?? jsonResponse({ answer: 'Play Nf3.' }));
  const provider = new GeminiProvider({
    baseUrl: BASE_URL,
    getAccessToken: async () => (overrides && 'token' in overrides ? overrides.token! : 'jwt-123'),
    fetchFn: fetchFn as typeof fetch,
  });
  return { provider, fetchFn: fetchFn as ReturnType<typeof vi.fn> };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    throw new Error('expected rejection');
  } catch (err) {
    expect(err).toBeInstanceOf(CoachUnavailableError);
    return (err as CoachUnavailableError).reason;
  }
}

describe('GeminiProvider.generate', () => {
  it('POSTs the assembled prompt as the question with the caller JWT', async () => {
    const { provider, fetchFn } = makeProvider();
    const result = await provider.generate({ prompt: 'Why was 12...Nf6 a blunder?' });

    expect(result.text).toBe('Play Nf3.');
    expect(fetchFn).toHaveBeenCalledWith(
      `${BASE_URL}/functions/v1/chess-mentor`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-123' }),
        body: JSON.stringify({ question: 'Why was 12...Nf6 a blunder?' }),
      }),
    );
  });

  it('fails with auth-required when there is no session token', async () => {
    const { provider } = makeProvider({ token: null });
    expect(await reasonOf(provider.generate({ prompt: 'q' }))).toBe('auth-required');
  });

  it('fails with not-configured when no base URL is configured', async () => {
    const provider = new GeminiProvider({ baseUrl: null, getAccessToken: async () => 'jwt' });
    expect(await reasonOf(provider.generate({ prompt: 'q' }))).toBe('not-configured');
  });

  it('maps transport failures to vendor-neutral reasons', async () => {
    const cases: Array<[Response, string]> = [
      [jsonResponse({ error: 'Rate limit exceeded.' }, 429), 'rate-limited'],
      [jsonResponse({ error: 'Authentication required.' }, 401), 'auth-required'],
      // A 500 (e.g. missing server-side key) must NOT leak config details.
      [jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 500), 'not-configured'],
      [jsonResponse({ error: 'Question is too long' }, 413), 'unknown'],
    ];
    for (const [response, reason] of cases) {
      const { provider } = makeProvider({ response });
      const promise = provider.generate({ prompt: 'q' });
      expect(await reasonOf(promise)).toBe(reason);
    }
  });

  it('never surfaces vendor names in error messages', async () => {
    const { provider } = makeProvider({
      response: jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 500),
    });
    const err: Error = await provider.generate({ prompt: 'q' }).then(
      () => new Error('expected rejection'),
      (e: Error) => e,
    );
    expect(err.message.toLowerCase()).not.toContain('gemini');
    expect(err.message).not.toContain('API_KEY');
  });

  it('fails with offline when the network throws', async () => {
    const { provider } = makeProvider({
      fetchImpl: (async () => {
        throw new TypeError('Failed to fetch');
      }) as typeof fetch,
    });
    expect(await reasonOf(provider.generate({ prompt: 'q' }))).toBe('offline');
  });

  it('rejects a well-formed response with no answer', async () => {
    const { provider } = makeProvider({ response: jsonResponse({}) });
    expect(await reasonOf(provider.generate({ prompt: 'q' }))).toBe('unknown');
  });
});

describe('GeminiProvider capabilities & health', () => {
  it('declares its Phase-1 capabilities', () => {
    const { provider } = makeProvider();
    expect(provider.id).toBe('gemini');
    expect(provider.maxPromptChars).toBe(4000);
    expect(provider.supportsVision()).toBe(false);
    expect(provider.supportsStreaming()).toBe(false);
    expect(provider.supportsToolCalling()).toBe(false);
  });

  it('health is ok with url+session, and degraded otherwise (no network)', async () => {
    const { provider, fetchFn } = makeProvider();
    expect(await provider.health()).toEqual({ ok: true });
    expect(fetchFn).not.toHaveBeenCalled();

    const { provider: noSession } = makeProvider({ token: null });
    expect(await noSession.health()).toEqual({ ok: false, reason: 'auth-required' });

    const unconfigured = new GeminiProvider({ baseUrl: null, getAccessToken: async () => null });
    expect(await unconfigured.health()).toEqual({ ok: false, reason: 'not-configured' });
  });

  it('stream() pseudo-streams the full generate() result', async () => {
    const { provider } = makeProvider();
    const chunks: string[] = [];
    for await (const chunk of provider.stream({ prompt: 'q' })) chunks.push(chunk);
    expect(chunks).toEqual(['Play Nf3.']);
  });
});
