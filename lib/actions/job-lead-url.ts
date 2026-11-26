const GREENHOUSE_JOB_HOSTS = new Set([
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
]);

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;

export function validateGreenhouseJobUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !GREENHOUSE_JOB_HOSTS.has(url.hostname) ||
      url.username !== '' ||
      url.password !== '' ||
      url.port !== ''
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function getValidatedRedirectUrl(currentUrl: URL, location: string): URL | null {
  try {
    return validateGreenhouseJobUrl(new URL(location, currentUrl).href);
  } catch {
    return null;
  }
}

export async function requestGreenhouseJobUrl(value: string): Promise<number | null> {
  let currentUrl = validateGreenhouseJobUrl(value);
  if (!currentUrl) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let redirects = 0;

  try {
    while (true) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'LinkedInAIStudio/1.0' },
        redirect: 'manual',
        signal: controller.signal,
      });

      const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
      if (!isRedirect) {
        await response.body?.cancel();
        return response.status;
      }

      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects >= MAX_REDIRECTS) return null;

      const redirectUrl = getValidatedRedirectUrl(currentUrl, location);
      if (!redirectUrl) return null;

      currentUrl = redirectUrl;
      redirects += 1;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
