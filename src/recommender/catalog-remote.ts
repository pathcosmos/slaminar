import type { RemoteCatalog } from '../types/index.js';

export const DEFAULT_CATALOG_URL =
  'https://raw.githubusercontent.com/pathcosmos/slaminar/main/catalog/catalog.json';

export interface FetchResult {
  catalog: RemoteCatalog;
  etag?: string;
  notModified: boolean;
}

export function validateCatalogSchema(data: unknown): data is RemoteCatalog {
  if (data === null || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.version === 'string' &&
    typeof obj.minSlaminarVersion === 'string' &&
    Array.isArray(obj.tools)
  );
}

export async function fetchRemoteCatalog(
  url?: string,
  etag?: string,
): Promise<FetchResult> {
  const catalogUrl = url ?? DEFAULT_CATALOG_URL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    const response = await fetch(catalogUrl, {
      headers,
      signal: controller.signal,
    });

    if (response.status === 304) {
      return { catalog: null as any, notModified: true };
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch remote catalog: ${response.status} ${response.statusText}`,
      );
    }

    const json: unknown = await response.json();

    if (!validateCatalogSchema(json)) {
      throw new Error('Remote catalog does not match expected schema');
    }

    const responseEtag = response.headers.get('etag') ?? undefined;

    return {
      catalog: json,
      etag: responseEtag,
      notModified: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}
