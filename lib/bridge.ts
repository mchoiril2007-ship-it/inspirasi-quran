import config from '../content/config.json';

export function bridgeConfig() {
  const url = (config as any).bridgeUrl || process.env.BRIDGE_URL;
  // Toleran terhadap salah tempel: buang spasi, tanda petik, titik koma, dan awalan "var KEY ="
  const key = (process.env.BRIDGE_KEY || '').replace(/^\s*(var\s+)?KEY\s*=\s*/i, '').replace(/[\s'";]/g, '');
  return url && key ? { url, key } : null;
}

export async function bridgeCall(params: Record<string, string>, post = false) {
  const cfg = bridgeConfig();
  if (!cfg) throw new Error('Penyimpanan pendaftar belum diatur');
  const res = post
    ? await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: cfg.key, ...params }), redirect: 'follow', cache: 'no-store' })
    : await fetch(cfg.url + '?' + new URLSearchParams({ key: cfg.key, ...params }), { redirect: 'follow', cache: 'no-store' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Jembatan Google tidak menjawab dengan benar');
  }
}
