/**
 * claude.js — Anthropic Claude API provider.
 * Handles both single-turn (completion) and multi-turn (chat) calls.
 *
 * NOTE: Claude requires messages to strictly alternate user/assistant.
 * The chat variant normalizes the history to satisfy this constraint.
 */
import { fetchWithRetry } from './fetchWithRetry';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Single-turn completion.
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callClaude(prompt, apiKey, model) {
  try {
    const response = await fetchWithRetry(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model || 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Error en la API de Anthropic');
    }

    const data = await response.json();
    return {
      text: data.content?.[0]?.text?.trim() || 'Error al generar la respuesta.',
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    console.error('Error in callClaude:', error);
    throw error;
  }
}

/**
 * Multi-turn chat.
 * Normalizes alternating-role constraint required by Anthropic's API.
 * @param {string} systemPrompt
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function callClaudeChat(systemPrompt, messages, apiKey, model) {
  // Merge consecutive same-role messages to satisfy Anthropic's alternation rule
  const normalized = [];
  for (const m of messages) {
    if (normalized.length > 0 && normalized[normalized.length - 1].role === m.role) {
      normalized[normalized.length - 1].content += '\n' + m.content;
    } else {
      normalized.push({ ...m });
    }
  }
  // Must start with user
  if (normalized.length === 0 || normalized[0].role !== 'user') {
    normalized.unshift({ role: 'user', content: '.' });
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-3-haiku-20240307',
        system: systemPrompt,
        messages: normalized,
        max_tokens: 1024,
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Error en la API de Claude');
    }
    const data = await response.json();
    return {
      text: data.content?.[0]?.text?.trim() || 'Sin respuesta.',
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    console.error('Error in callClaudeChat:', error);
    throw error;
  }
}

/**
 * Streaming single-turn completion for Generate tab.
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} model
 * @param {AbortSignal} signal
 * @returns {AsyncGenerator<string>}
 */
export async function* callClaudeStream(prompt, apiKey, model, signal) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Stream error with Claude API');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const jsonStr = trimmed.slice(6);

      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'content_block_delta') {
          const text = data.delta?.text;
          if (text) yield text;
        }
      } catch {
        // skip
      }
    }
  }
}
