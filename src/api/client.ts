/**
 * Cliente de API para Apps Script.
 * - Tenta fetch JSON normal
 * - Se falhar por CORS / network, tenta JSONP automaticamente
 */
const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

function requireBase(): string {
  if (!API_BASE) {
    throw new Error("Defina VITE_API_BASE no arquivo .env (veja .env.example).");
  }
  return API_BASE.replace(/\/$/, "");
}

function buildUrl(params: Record<string, string | number | undefined>): string {
  const base = requireBase();
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined) return;
    usp.set(k, String(v));
  });
  return `${base}?${usp.toString()}`;
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// JSONP fallback (precisa do backend aceitar ?callback=...)
function jsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cb = `__pokerUplifeCb_${Math.random().toString(36).slice(2)}`;
    const u = new URL(url);
    u.searchParams.set("callback", cb);

    (window as any)[cb] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement("script");
    script.src = u.toString();
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("Falha ao carregar JSONP"));
    };

    function cleanup() {
      delete (window as any)[cb];
      script.remove();
    }

    document.body.appendChild(script);
  });
}

export async function apiGet(params: Record<string, string | number | undefined>): Promise<any> {
  const url = buildUrl(params);
  try {
    return await fetchJson(url);
  } catch (e) {
    // fallback para JSONP (GitHub Pages normalmente precisa)
    return await jsonp(url);
  }
}
