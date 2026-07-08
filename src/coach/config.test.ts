import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROVIDER, resolveCoachConfig } from './config';

describe('resolveCoachConfig', () => {
  it('defaults to gemini when VITE_AI_PROVIDER is unset', () => {
    const config = resolveCoachConfig({});
    expect(config.provider).toBe(DEFAULT_PROVIDER);
    expect(config.provider).toBe('gemini');
  });

  it('accepts every recognized provider id (case/whitespace-insensitive)', () => {
    expect(resolveCoachConfig({ VITE_AI_PROVIDER: 'gemini' }).provider).toBe('gemini');
    expect(resolveCoachConfig({ VITE_AI_PROVIDER: ' Claude ' }).provider).toBe('claude');
    expect(resolveCoachConfig({ VITE_AI_PROVIDER: 'OPENAI' }).provider).toBe('openai');
    expect(resolveCoachConfig({ VITE_AI_PROVIDER: 'ollama' }).provider).toBe('ollama');
  });

  it('falls back to the default (with a warning) on unknown values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveCoachConfig({ VITE_AI_PROVIDER: 'skynet' }).provider).toBe('gemini');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('carries the backend base URL and nulls it when absent', () => {
    expect(resolveCoachConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' }).supabaseUrl).toBe('https://x.supabase.co');
    expect(resolveCoachConfig({}).supabaseUrl).toBeNull();
    expect(resolveCoachConfig({ VITE_SUPABASE_URL: '  ' }).supabaseUrl).toBeNull();
  });
});
