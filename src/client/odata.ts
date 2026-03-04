import 'dotenv/config';

interface ODataConfig {
  baseUrl: string;
  username: string;
  password: string;
  company: string;
  timeoutMs: number;
}

class ODataClient {
  private config: ODataConfig;

  constructor(config: ODataConfig) {
    this.config = config;
  }

  private get serviceRoot(): string {
    return `${this.config.baseUrl}/odata/${this.config.company}`;
  }

  private get v4ServiceRoot(): string {
    return `${this.config.baseUrl}/ODataV4/${this.config.company}`;
  }

  private get authHeader(): string {
    return `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`;
  }

  async getServiceDocument(): Promise<{ value: { name: string; url: string }[] }> {
    return this.get(this.serviceRoot, '') as Promise<{ value: { name: string; url: string }[] }>;
  }

  async queryEntity(name: string, params?: Record<string, string>): Promise<{ value: unknown[] }> {
    return this.get(this.serviceRoot, `/${encodeURIComponent(name)}`, params) as Promise<{ value: unknown[] }>;
  }

  async getV4ServiceDocument(): Promise<{ value: { name: string; url: string }[] }> {
    return this.get(this.v4ServiceRoot, '') as Promise<{ value: { name: string; url: string }[] }>;
  }

  async queryV4Entity(name: string, params?: Record<string, string>): Promise<{ value: unknown[] }> {
    return this.get(this.v4ServiceRoot, `/${encodeURIComponent(name)}`, params) as Promise<{ value: unknown[] }>;
  }

  private async get(root: string, path: string, params?: Record<string, string>): Promise<unknown> {
    const url = new URL(`${root}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OData request failed (${response.status}) ${path}: ${body}`);
    }

    return response.json();
  }
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const odataClient = new ODataClient({
  baseUrl: requireEnv('ACU_BASE_URL'),
  username: requireEnv('ACU_USERNAME'),
  password: requireEnv('ACU_PASSWORD'),
  company: requireEnv('ACU_COMPANY'),
  timeoutMs: parseInt(process.env.ACU_TIMEOUT_MS ?? '30000', 10),
});
