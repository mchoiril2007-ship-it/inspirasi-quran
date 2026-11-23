// Klien untuk Google Apps Script "jembatan" (lihat apps-script/Code.gs).
export function makeBridge(url, key) {
  if (!url || !key) return null;
  async function call(params, { post = false, tries = 3 } = {}) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
      try {
        let res;
        if (post) {
          res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key, ...params }), redirect: 'follow' });
        } else {
          const qs = new URLSearchParams({ key, ...params });
          res = await fetch(url + (url.includes('?') ? '&' : '?') + qs, { redirect: 'follow' });
        }
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Jawaban jembatan bukan JSON (HTTP ${res.status}). Pastikan Apps Script di-deploy sebagai Web App dengan akses "Anyone".`);
        }
        if (!data.ok) {
          const e = new Error(data.error || 'Jembatan gagal');
          e.data = data;
          e.fatal = true;
          throw e;
        }
        return data;
      } catch (e) {
        lastErr = e;
        if (e.fatal) break;
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      }
    }
    throw lastErr;
  }
  return {
    ping: () => call({ action: 'ping' }),
    list: () => call({ action: 'list' }).then((d) => d.files),
    download: (id) => call({ action: 'download', id }).then((d) => ({ ...d, buffer: Buffer.from(d.base64, 'base64') })),
    videos: (handle) => call({ action: 'videos', handle }),
    uploadAudio: (name, buffer) => call({ action: 'uploadAudio', name, base64: buffer.toString('base64') }, { post: true, tries: 2 }),
  };
}
