import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiProviders from '../../src/admin/AiProviders';
import { AiUsagePanel } from '../../src/admin/AiUsagePanel';
import type { AdminAiProvider, AiUsage } from '../../src/admin/api';
import { API, HttpResponse, http, server, useMockServer } from '../helpers/server';

const provider = (over: Partial<AdminAiProvider>): AdminAiProvider => ({
  id: 'p1',
  name: 'OpenRouter',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  model: 'openrouter/free',
  keyHint: '…a1b2',
  enabled: true,
  position: 0,
  status: 'ok',
  lastCheckedAt: Date.now() - 120_000,
  lastOkAt: Date.now() - 120_000,
  lastError: null,
  retryAt: null,
  latencyMs: 840,
  ...over,
});

let providers: AdminAiProvider[] = [];
const list = () => HttpResponse.json({ providers, available: providers.some((p) => p.enabled && p.status !== 'down') });

useMockServer(http.get(`${API}/admin/ai/providers`, list));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin: AI providers', () => {
  it('WEB-AIADM-001 lists providers in order with their status and never a key', async () => {
    providers = [
      provider({}),
      provider({
        id: 'p2',
        name: 'Google AI Studio',
        model: 'gemini-3.1-flash-lite',
        position: 1,
        status: 'down',
        lastError: '429 Quota exceeded',
        retryAt: Date.now() + 3600_000,
      }),
    ];
    render(<AiProviders />);
    expect(await screen.findByText('AI is on: 1 of 2 providers answering.')).toBeInTheDocument();
    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByText('OpenRouter')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Answering')).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Key …a1b2/)).toBeInTheDocument();
    expect(within(cards[1]).getByText(/^Down, retry at/)).toBeInTheDocument();
    expect(within(cards[1]).getByText('429 Quota exceeded')).toBeInTheDocument();
  });

  it('WEB-AIADM-002 with nothing answering it says AI is hidden in the apps', async () => {
    providers = [provider({ enabled: false })];
    render(<AiProviders />);
    expect(
      await screen.findByText(
        'AI is off: no enabled provider is answering, so the AI features are hidden in the apps.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('WEB-AIADM-003 adds a provider with its key, and an edit without a key keeps it', async () => {
    providers = [provider({})];
    const bodies: unknown[] = [];
    server.use(
      http.post(`${API}/admin/ai/providers`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(provider({ id: 'p3', name: 'Groq' }), { status: 201 });
      }),
      http.patch(`${API}/admin/ai/providers/p1`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(provider({ name: 'OpenRouter free' }));
      }),
    );
    const user = userEvent.setup();
    render(<AiProviders />);
    await screen.findByText('OpenRouter');

    const form = screen.getByRole('button', { name: /Add provider/ }).closest('form')!;
    const add = within(form);
    expect(add.getByRole('button', { name: /Add provider/ })).toBeDisabled();
    await user.type(add.getByLabelText('Name'), 'Groq');
    await user.type(add.getByLabelText('Model'), 'llama-3.3-70b');
    await user.type(add.getByLabelText('Chat completions URL'), 'https://api.groq.com/openai/v1/chat/completions');
    await user.type(add.getByLabelText('API key'), 'gsk_secret');
    await user.click(add.getByRole('button', { name: /Add provider/ }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      name: 'Groq',
      model: 'llama-3.3-70b',
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: 'gsk_secret',
    });

    const card = screen.getAllByRole('article')[0];
    await user.click(within(card).getByRole('button', { name: /Edit/ }));
    const name = within(card).getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'OpenRouter free');
    await user.click(within(card).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ name: 'OpenRouter free' });
  });

  it('WEB-AIADM-004 check now, disable, move and delete call the backend', async () => {
    providers = [provider({}), provider({ id: 'p2', name: 'Second', position: 1 })];
    const calls: string[] = [];
    server.use(
      http.post(`${API}/admin/ai/providers/p1/check`, () => {
        calls.push('check');
        return HttpResponse.json({
          ok: false,
          ms: 1200,
          error: '401 Invalid API key',
          provider: provider({ status: 'down' }),
        });
      }),
      http.patch(`${API}/admin/ai/providers/p2`, async ({ request }) => {
        calls.push(`patch ${JSON.stringify(await request.json())}`);
        return HttpResponse.json(provider({ id: 'p2', name: 'Second', position: 1, enabled: false }));
      }),
      http.put(`${API}/admin/ai/providers/order`, async ({ request }) => {
        calls.push(`order ${JSON.stringify(await request.json())}`);
        return list();
      }),
      http.delete(`${API}/admin/ai/providers/p2`, () => {
        calls.push('delete');
        return HttpResponse.json({ ok: true });
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<AiProviders />);
    await screen.findByText('Second');
    const [first, second] = screen.getAllByRole('article');

    await user.click(within(first).getByRole('button', { name: /Check now/ }));
    expect(await within(first).findByText('401 Invalid API key')).toBeInTheDocument();
    await user.click(within(second).getByRole('switch', { name: 'Disable Second' }));
    await user.click(within(second).getByRole('button', { name: 'Move Second up' }));
    await user.click(within(second).getByRole('button', { name: /Delete/ }));
    await waitFor(() => expect(calls).toHaveLength(4));
    expect(calls).toEqual(['check', 'patch {"enabled":false}', 'order {"ids":["p2","p1"]}', 'delete']);
  });
});

describe('admin: AI usage', () => {
  it('WEB-AIADM-005 shows calls, tokens in and out, by provider and by feature', async () => {
    const usage: AiUsage = {
      days: 7,
      totals: { calls: 42, failures: 3, promptTokens: 120_000, completionTokens: 30_500 },
      byProvider: [
        {
          providerId: 'p1',
          name: 'OpenRouter',
          calls: 40,
          failures: 3,
          promptTokens: 119_000,
          completionTokens: 30_000,
        },
      ],
      byFeature: [
        { feature: 'titles', calls: 30, failures: 1, promptTokens: 100_000, completionTokens: 25_000 },
        { feature: 'health', calls: 12, failures: 2, promptTokens: 20_000, completionTokens: 5_500 },
      ],
      series: Array.from({ length: 7 }, (_, i) => ({
        day: `2026-10-${String(10 + i).padStart(2, '0')}`,
        calls: i,
        failures: 0,
        promptTokens: i * 100,
        completionTokens: i * 10,
      })),
    };
    server.use(
      http.get(`${API}/admin/analytics/ai`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('days')).toBe('7');
        return HttpResponse.json(usage);
      }),
    );
    render(<AiUsagePanel days={7} />);
    const panel = await screen.findByRole('region', { name: 'AI usage' });
    expect(within(panel).getByText('42')).toBeInTheDocument();
    expect(within(panel).getByText('120K')).toBeInTheDocument();
    expect(within(panel).getByText('30.5K')).toBeInTheDocument();
    expect(within(panel).getByText('Tokens in per day')).toBeInTheDocument();
    expect(within(panel).getByText('Title cleanup')).toBeInTheDocument();
    expect(within(panel).getByText('Health checks')).toBeInTheDocument();
    expect(within(panel).getByText('OpenRouter')).toBeInTheDocument();
  });
});
