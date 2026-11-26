import assert from 'node:assert/strict';
import test from 'node:test';
import {
  requestGreenhouseJobUrl,
  validateGreenhouseJobUrl,
} from './job-lead-url.ts';

test('accepts HTTPS URLs on supported Greenhouse job-board hosts', () => {
  assert.equal(
    validateGreenhouseJobUrl('https://boards.greenhouse.io/acme/jobs/123')?.hostname,
    'boards.greenhouse.io',
  );
  assert.equal(
    validateGreenhouseJobUrl('https://job-boards.greenhouse.io/acme/jobs/123')?.hostname,
    'job-boards.greenhouse.io',
  );
  assert.equal(
    validateGreenhouseJobUrl('https://boards.greenhouse.io:443/acme/jobs/123')?.port,
    '',
  );
});

test('rejects insecure, credentialed, non-Greenhouse, IP, and nonstandard-port URLs', () => {
  const rejectedUrls = [
    'http://boards.greenhouse.io/acme/jobs/123',
    'https://boards.greenhouse.io.evil.example/acme/jobs/123',
    'https://evil.example/boards.greenhouse.io',
    'https://user:password@boards.greenhouse.io/acme/jobs/123',
    'https://127.0.0.1/acme/jobs/123',
    'https://10.0.0.1/acme/jobs/123',
    'https://192.168.1.1/acme/jobs/123',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/acme/jobs/123',
    'https://[fc00::1]/acme/jobs/123',
    'https://localhost/acme/jobs/123',
    'https://boards.greenhouse.io:8443/acme/jobs/123',
    'https://boards.greenhouse.io./acme/jobs/123',
    'not a URL',
  ];

  for (const url of rejectedUrls) {
    assert.equal(validateGreenhouseJobUrl(url), null, `expected rejection: ${url}`);
  }
});

test('follows validated Greenhouse redirects manually', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  const redirectOptions = [];
  globalThis.fetch = async (input, init) => {
    requestedUrls.push(String(input));
    redirectOptions.push(init.redirect);
    if (requestedUrls.length === 1) {
      return new Response(null, {
        status: 302,
        headers: { location: 'https://job-boards.greenhouse.io/acme/jobs/123' },
      });
    }
    return new Response(null, { status: 200 });
  };

  try {
    assert.equal(
      await requestGreenhouseJobUrl('https://boards.greenhouse.io/acme/jobs/123'),
      200,
    );
    assert.equal(requestedUrls.length, 2);
    assert.deepEqual(redirectOptions, ['manual', 'manual']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not request a redirect to a non-Greenhouse domain', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(null, {
      status: 302,
      headers: { location: 'https://example.com/redirected' },
    });
  };

  try {
    assert.equal(
      await requestGreenhouseJobUrl('https://boards.greenhouse.io/acme/jobs/123'),
      null,
    );
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('follows at most three redirects', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(null, {
      status: 302,
      headers: { location: `/acme/jobs/${requestCount + 1}` },
    });
  };

  try {
    assert.equal(
      await requestGreenhouseJobUrl('https://boards.greenhouse.io/acme/jobs/1'),
      null,
    );
    assert.equal(requestCount, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
