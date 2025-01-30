import { Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import { cacheDb } from './cache-middleware.ts';
import { llmCliConfigStore } from './llm-cli-config-store.ts';
import {
  Provider,
  PROVIDERS,
  Model,
  supportedModelByProvider,
} from './types.ts';
import { vValidator } from '@hono/valibot-validator';
import * as v from 'valibot';

// import tailwind from './web/public/styles.css' with { type: "text" };

type CacheEntry = {
  hash: string;
  cache_key: string;
  result: string;
  created_at: string;
};

export const app = new Hono();

// Setup JSX renderer
app.use(
  '*',
  jsxRenderer(async ({ children }) => {
    const tailwind = await Deno.readTextFile('./web/public/styles.css');

    return (
      <html>
        <head>
          <title>LLM CLI Dashboard</title>
          <style>{tailwind}</style>
        </head>
        <body class="font-sans max-w-3xl mx-auto p-5">
          <h1 class="text-2xl font-bold mb-5">LLM CLI Dashboard</h1>
          {children}
        </body>
      </html>
    );
  })
);

// Main route
app.get('/', async (c) => {
  // Read config file
  const config = await llmCliConfigStore.getConfig();

  // Get cache entries with sizes
  const cacheEntries = cacheDb
    .prepare(
      `
      SELECT
        hash,
        length(cache_key) as key_size,
        length(result) as value_size,
        created_at
      FROM llm_cache
      ORDER BY created_at DESC
      LIMIT 50
    `
    )
    .all();

  return c.render(
    <div>
      <div class="bg-gray-100 p-5 rounded-lg mb-5">
        <h2 class="text-xl font-semibold mb-3">Current Configuration</h2>
        <div class="flex gap-2 mb-5">
          {PROVIDERS.map((provider) => (
            <form method="post" action="/set-provider" class="m-0">
              <input type="hidden" name="provider" value={provider} />
              <button
                type="submit"
                class={`px-4 py-2 rounded ${
                  config.provider === provider
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300'
                }`}
              >
                {provider}
              </button>
            </form>
          ))}
        </div>
        <div class="flex flex-wrap gap-2 mb-5">
          {Object.values(supportedModelByProvider)
            .flat()
            .map((model) => {
              const isSupported =
                supportedModelByProvider[config.provider as Provider]?.includes(
                  model
                );
              return (
                <form method="post" action="/set-model" class="m-0">
                  <input type="hidden" name="model" value={model} />
                  <button
                    type="submit"
                    class={`px-4 py-2 rounded ${
                      config.model === model
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300'
                    } ${
                      !isSupported ? 'text-gray-500 cursor-not-allowed' : ''
                    }`}
                    disabled={!isSupported}
                  >
                    {model}
                  </button>
                </form>
              );
            })}
        </div>

        <div class="flex flex-col gap-2 mt-5">
          <h3 class="text-lg font-medium">File Patterns</h3>
          {Object.entries(config.files || {}).map(([pattern, enabled]) => (
            <form
              method="post"
              action="/toggle-file-pattern"
              class="flex items-center gap-2 p-2 bg-gray-50 rounded"
              style="margin: 0"
            >
              <input type="hidden" name="pattern" value={pattern} />
              <input
                type="checkbox"
                name="enabled"
                checked={enabled}
                onchange="this.form.submit()"
                class="w-5 h-5"
              />
              <span class="font-mono flex-grow">{pattern}</span>
            </form>
          ))}
          <form
            method="post"
            action="/add-file-pattern"
            class="flex gap-2 mt-2 bg-gray-50 rounded"
          >
            <input
              type="text"
              name="pattern"
              placeholder="Enter new file pattern (e.g. *.{ts,tsx})"
              class="flex-grow p-2 border border-gray-300 rounded font-mono"
              required
            />
            <button
              type="submit"
              class="px-4 py-2 m-2 bg-blue-500 text-white rounded"
            >
              Add Pattern
            </button>
          </form>
        </div>

        <pre class="bg-gray-200 p-2 rounded mt-5">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
      <div class="bg-gray-100 p-5 rounded-lg">
        <h2 class="text-xl font-semibold mb-3">Recent Cache Entries</h2>
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="text-left p-2 border-b border-gray-300">Hash</th>
              <th class="text-left p-2 border-b border-gray-300">Key Size</th>
              <th class="text-left p-2 border-b border-gray-300">Value Size</th>
              <th class="text-left p-2 border-b border-gray-300">Created At</th>
            </tr>
          </thead>
          <tbody>
            {cacheEntries.map((entry) => (
              <tr>
                <td class="p-2 border-b border-gray-300">
                  <a href={`/cache/${entry.hash}`} class="text-blue-500">
                    {entry.hash.slice(0, 10)}
                  </a>
                </td>
                <td class="p-2 border-b border-gray-300">
                  {(entry.key_size / 1024).toFixed(2)} KB
                </td>
                <td class="p-2 border-b border-gray-300">
                  {(entry.value_size / 1024).toFixed(2)} KB
                </td>
                <td class="p-2 border-b border-gray-300">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// Cache entry detail route
app.get('/cache/:hash', (c) => {
  const hash = c.req.param('hash');

  const entry = cacheDb
    .prepare('SELECT * FROM llm_cache WHERE hash = ?')
    .get<CacheEntry>(hash);

  if (!entry) {
    return c.notFound();
  }

  return c.render(
    <div>
      <div class="bg-gray-100 p-5 rounded-lg">
        <h2 class="text-xl font-semibold mb-3">Cache Entry Details</h2>
        <p>
          <a href="/" class="text-blue-500">
            ← Back to Dashboard
          </a>
        </p>
        <table class="w-full border-collapse">
          <tr>
            <th class="text-left p-2 border-b border-gray-300">Hash</th>
            <td class="p-2 border-b border-gray-300">
              <code>{entry.hash}</code>
            </td>
          </tr>
          <tr>
            <th class="text-left p-2 border-b border-gray-300">Created At</th>
            <td class="p-2 border-b border-gray-300">
              {new Date(entry.created_at).toLocaleString()}
            </td>
          </tr>
          <tr>
            <th class="text-left p-2 border-b border-gray-300">Cache Key</th>
            <td class="p-2 border-b border-gray-300">
              <pre class="bg-gray-200 p-2 rounded">
                {JSON.stringify(JSON.parse(entry.cache_key), null, 2)}
              </pre>
            </td>
          </tr>
          <tr>
            <th class="text-left p-2 border-b border-gray-300">Result</th>
            <td class="p-2 border-b border-gray-300">
              <pre class="bg-gray-200 p-2 rounded">
                {JSON.stringify(JSON.parse(entry.result), null, 2)}
              </pre>
            </td>
          </tr>
        </table>
      </div>
    </div>
  );
});

// Provider change route
app.post(
  '/set-provider',
  vValidator('form', v.object({ provider: Provider })),
  async (c) => {
    const { provider } = c.req.valid('form');

    await llmCliConfigStore.updateConfig({ provider });

    return c.redirect('/');
  }
);

// Model change route
app.post(
  '/set-model',
  vValidator('form', v.object({ model: Model })),
  async (c) => {
    const { model } = c.req.valid('form');

    await llmCliConfigStore.updateConfig({ model });

    return c.redirect('/');
  }
);

// File pattern toggle route
app.post(
  '/toggle-file-pattern',
  vValidator(
    'form',
    v.object({
      pattern: v.string(),
      enabled: v.optional(v.string()),
    })
  ),
  async (c) => {
    const { pattern, enabled } = c.req.valid('form');
    const config = await llmCliConfigStore.getConfig();

    await llmCliConfigStore.updateConfig({
      files: {
        ...(config.files || {}),
        [pattern]: enabled !== undefined,
      },
    });

    return c.redirect('/');
  }
);

// Add file pattern route
app.post(
  '/add-file-pattern',
  vValidator('form', v.object({ pattern: v.string() })),
  async (c) => {
    const { pattern } = c.req.valid('form');
    const config = await llmCliConfigStore.getConfig();

    await llmCliConfigStore.updateConfig({
      files: {
        ...(config.files || {}),
        [pattern]: true, // New patterns are enabled by default
      },
    });

    return c.redirect('/');
  }
);
