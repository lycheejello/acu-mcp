import 'dotenv/config';

interface AcumaticaConfig {
  baseUrl: string;
  username: string;
  password: string;
  company: string;
  endpoint: string;
  version: string;
  timeoutMs: number;
}

class AcumaticaClient {
  private config: AcumaticaConfig;
  private cookie: string | null = null;

  constructor(config: AcumaticaConfig) {
    this.config = config;
  }

  async login(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/entity/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.config.username,
        password: this.config.password,
        company: this.config.company,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Acumatica login failed (${response.status}): ${body}`);
    }

    this.cookie = this.extractCookies(response);
    if (!this.cookie) {
      throw new Error('Login succeeded but no session cookie returned');
    }
  }

  async logout(): Promise<void> {
    if (!this.cookie) return;
    try {
      await fetch(`${this.config.baseUrl}/entity/auth/logout`, {
        method: 'POST',
        headers: { Cookie: this.cookie },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } finally {
      this.cookie = null;
    }
  }

  // GET /entity/{endpoint}/{version}/{Entity}?params
  async getEntity(entity: string, params?: Record<string, string>): Promise<unknown> {
    const path = `/entity/${this.config.endpoint}/${this.config.version}/${entity}`;
    return this.get(path, params);
  }

  // GET /entity/{endpoint}/{version}/{Entity}/{key1}/{key2}?params
  async getEntityByKey(entity: string, keys: string[], params?: Record<string, string>): Promise<unknown> {
    const keyPath = keys.map(k => encodeURIComponent(k)).join('/');
    const path = `/entity/${this.config.endpoint}/${this.config.version}/${entity}/${keyPath}`;
    return this.get(path, params);
  }

  // GET /entity/{endpoint}/{version}/GI/{InquiryName}?params
  async getGI(giName: string, params?: Record<string, string>): Promise<unknown> {
    const path = `/entity/${this.config.endpoint}/${this.config.version}/GI/${encodeURIComponent(giName)}`;
    return this.get(path, params);
  }

  private async get(path: string, params?: Record<string, string>): Promise<unknown> {
    if (!this.cookie) await this.login();

    const url = new URL(`${this.config.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Cookie: this.cookie!,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    // Session expired — re-auth and retry once
    if (response.status === 401) {
      this.cookie = null;
      await this.login();
      return this.get(path, params);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Request failed (${response.status}) ${path}: ${body}`);
    }

    return response.json();
  }

  private extractCookies(response: Response): string {
    const setCookies: string[] = [];
    // Node 18.14+ exposes getSetCookie()
    if (typeof (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function') {
      setCookies.push(...(response.headers as unknown as { getSetCookie: () => string[] }).getSetCookie());
    } else {
      const raw = response.headers.get('set-cookie');
      if (raw) setCookies.push(raw);
    }
    return setCookies.map(c => c.split(';')[0]).join('; ');
  }
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const client = new AcumaticaClient({
  baseUrl: requireEnv('ACU_BASE_URL'),
  username: requireEnv('ACU_USERNAME'),
  password: requireEnv('ACU_PASSWORD'),
  company: requireEnv('ACU_COMPANY'),
  endpoint: process.env.ACU_ENDPOINT ?? 'Default',
  version: process.env.ACU_VERSION ?? '25.200.001',
  timeoutMs: parseInt(process.env.ACU_TIMEOUT_MS ?? '30000', 10),
});
