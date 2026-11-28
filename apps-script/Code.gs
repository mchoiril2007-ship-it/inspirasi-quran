/**
 * Jembatan Web "Quran Inspiration" <-> Google Drive, Google Sheets, YouTube.
 * Dijalankan sebagai akun Google pemilik. Tidak pernah memindahkan atau menghapus naskah.
 *
 * Aksi:
 *  GET  ?key=..&action=ping
 *  GET  ?key=..&action=list                 -> daftar naskah di folder "Inspirasi Quran"
 *  GET  ?key=..&action=download&id=FILE_ID  -> isi .docx (base64); Google Docs diekspor ke .docx
 *  GET  ?key=..&action=videos&handle=..     -> semua video channel YouTube
 *  GET  ?key=..&action=subscribers          -> isi Google Sheet pendaftar
 *  POST {key, action:'subscribe', name, email, whatsapp, page}
 *  POST {key, action:'uploadAudio', name, base64}  -> simpan ke subfolder "Audio"
 *  POST {key, action:'hit', slug, kind}  -> tambah hitungan baca/dengar/tonton
 *  GET  ?key=..&action=stats              -> semua hitungan
 *  GET  ?key=..&action=comments&slug=..   -> komentar satu surat (terbaru di atas)
 *  GET  ?key=..&action=allComments        -> semua komentar (untuk halaman admin)
 *  POST {key, action:'addComment', slug, name, text, ipHash}  -> tambah komentar (langsung tampil)
 *  POST {key, action:'deleteComment', id}  -> hapus komentar
 */

var KEY = 'GANTI_DENGAN_KUNCI_RAHASIA';
var FOLDER_ID = '1-1ZW84uj74cpH4s7Hq6HdzPzq7y4PitP'; // folder "Inspirasi Quran"
var SHEET_NAME = 'Pendaftar Web Quran Inspiration';

function doGet(e) {
  return handle_(e.parameter || {});
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'JSON tidak valid' });
  }
  return handle_(body);
}

function handle_(p) {
  if (p.key !== KEY) return json_({ ok: false, error: 'Kunci salah' });
  try {
    switch (p.action) {
      case 'ping':
        return json_({ ok: true, folder: DriveApp.getFolderById(FOLDER_ID).getName() });
      case 'list':
        return json_({ ok: true, files: listNaskah_() });
      case 'download':
        return json_(download_(p.id));
      case 'videos':
        return json_(videos_(p.handle));
      case 'subscribe':
        return json_(subscribe_(p));
      case 'subscribers':
        return json_(subscribers_());
      case 'hit':
        return json_(hit_(p.slug, p.kind));
      case 'stats':
        return json_({ ok: true, stats: stats_() });
      case 'comments':
        return json_(comments_(p.slug));
      case 'allComments':
        return json_(allComments_());
      case 'addComment':
        return json_(addComment_(p));
      case 'deleteComment':
        return json_(deleteComment_(p.id));
      case 'uploadAudio':
        return json_(uploadAudio_(p.name, p.base64));
      default:
        return json_({ ok: false, error: 'Aksi tidak dikenal' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

var NASKAH_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.document',
];

function listNaskah_() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var out = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (NASKAH_TYPES.indexOf(f.getMimeType()) < 0) continue;
    out.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), modifiedTime: f.getLastUpdated().toISOString(), size: f.getSize() });
  }
  return out;
}

function download_(id) {
  var f = DriveApp.getFileById(id);
  // Pastikan file memang berada di folder naskah
  var parents = f.getParents();
  var inside = false;
  while (parents.hasNext()) if (parents.next().getId() === FOLDER_ID) inside = true;
  if (!inside) return { ok: false, error: 'File bukan bagian dari folder Inspirasi Quran' };
  var blob;
  if (f.getMimeType() === 'application/vnd.google-apps.document') {
    var url = 'https://docs.google.com/document/d/' + id + '/export?format=docx';
    blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
  } else {
    blob = f.getBlob();
  }
  return { ok: true, name: f.getName(), modifiedTime: f.getLastUpdated().toISOString(), base64: Utilities.base64Encode(blob.getBytes()) };
}

function videos_(handle) {
  handle = String(handle || '').replace(/^@/, '');
  var ch = YouTube.Channels.list('snippet,contentDetails', { forHandle: handle });
  if (!ch.items || !ch.items.length) {
    var search = YouTube.Search.list('snippet', { q: handle, type: 'channel', maxResults: 5 });
    return {
      ok: false,
      error: 'Channel @' + handle + ' tidak ditemukan',
      suggestions: (search.items || []).map(function (s) {
        return { id: s.snippet.channelId, title: s.snippet.channelTitle };
      }),
    };
  }
  var channel = ch.items[0];
  var uploads = channel.contentDetails.relatedPlaylists.uploads;
  var videos = [];
  var token;
  do {
    var res = YouTube.PlaylistItems.list('snippet,contentDetails,status', { playlistId: uploads, maxResults: 50, pageToken: token });
    (res.items || []).forEach(function (it) {
      if (it.status && it.status.privacyStatus === 'private') return;
      videos.push({
        id: it.contentDetails.videoId,
        title: it.snippet.title,
        description: String(it.snippet.description || '').slice(0, 2000),
        publishedAt: it.contentDetails.videoPublishedAt || it.snippet.publishedAt,
        thumbnail: it.snippet.thumbnails && (it.snippet.thumbnails.high || it.snippet.thumbnails.medium || it.snippet.thumbnails.default || {}).url,
      });
    });
    token = res.nextPageToken;
  } while (token && videos.length < 2000);
  // Tag video (diambil per 50 video)
  var byId = {};
  videos.forEach(function (v) {
    byId[v.id] = v;
  });
  for (var i = 0; i < videos.length; i += 50) {
    var ids = videos.slice(i, i + 50).map(function (v) {
      return v.id;
    });
    var vr = YouTube.Videos.list('snippet', { id: ids.join(','), maxResults: 50 });
    (vr.items || []).forEach(function (x) {
      if (byId[x.id]) byId[x.id].tags = (x.snippet.tags || []).slice(0, 40);
    });
  }
  // Playlist milik channel beserta isinya
  var playlists = [];
  var pt;
  do {
    var pl = YouTube.Playlists.list('snippet', { channelId: channel.id, maxResults: 50, pageToken: pt });
    (pl.items || []).forEach(function (p) {
      playlists.push({ id: p.id, title: p.snippet.title, videoIds: [] });
    });
    pt = pl.nextPageToken;
  } while (pt && playlists.length < 300);
  playlists.forEach(function (p) {
    var t;
    do {
      var r = YouTube.PlaylistItems.list('contentDetails', { playlistId: p.id, maxResults: 50, pageToken: t });
      (r.items || []).forEach(function (it) {
        p.videoIds.push(it.contentDetails.videoId);
      });
      t = r.nextPageToken;
    } while (t && p.videoIds.length < 1000);
  });
  return { ok: true, channel: { id: channel.id, title: channel.snippet.title, handle: channel.snippet.customUrl }, videos: videos, playlists: playlists };
}

function sheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss = null;
  if (id) {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (e) {
      ss = null;
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    ss.getSheets()[0].appendRow(['Waktu', 'Nama', 'Email', 'WhatsApp', 'Halaman']);
    ss.getSheets()[0].setFrozenRows(1);
    props.setProperty('SHEET_ID', ss.getId());
  }
  return ss.getSheets()[0];
}

function subscribe_(p) {
  var name = String(p.name || '').trim().slice(0, 100);
  var email = String(p.email || '').trim().toLowerCase().slice(0, 150);
  var wa = String(p.whatsapp || '').trim().slice(0, 30);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Nama atau email tidak valid' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last > 1) {
      var emails = sh.getRange(2, 3, last - 1, 1).getValues();
      for (var i = 0; i < emails.length; i++) {
        if (String(emails[i][0]).toLowerCase() === email) return { ok: true, duplicate: true };
      }
    }
    // Awali dengan apostrof bila diawali + atau = agar tidak dibaca sebagai rumus
    var safe = function (s) {
      return /^[=+\-@]/.test(s) ? "'" + s : s;
    };
    sh.appendRow([new Date(), safe(name), safe(email), safe(wa), safe(String(p.page || '').slice(0, 200))]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function subscribers_() {
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  var rows = values.slice(1).map(function (r) {
    return { time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), name: r[1], email: r[2], whatsapp: r[3], page: r[4] };
  });
  return { ok: true, sheetUrl: sh.getParent().getUrl(), rows: rows };
}

function audioFolder_() {
  var parent = DriveApp.getFolderById(FOLDER_ID);
  var it = parent.getFoldersByName('Audio');
  return it.hasNext() ? it.next() : parent.createFolder('Audio');
}

function uploadAudio_(name, base64) {
  if (!/^[a-z0-9\-]+\.mp3$/.test(name || '')) return { ok: false, error: 'Nama file audio tidak valid' };
  var folder = audioFolder_();
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), 'audio/mpeg', name);
  var existing = folder.getFilesByName(name);
  if (existing.hasNext()) {
    var f = existing.next();
    Drive.Files.update({}, f.getId(), blob);
    return { ok: true, id: f.getId(), updated: true };
  }
  var created = folder.createFile(blob);
  return { ok: true, id: created.getId() };
}

// Penghitung baca/dengar/tonton per surat (disimpan di Script Properties)
function hit_(slug, kind) {
  if (!/^[a-z0-9\-]{2,40}$/.test(slug || '') || ['baca', 'dengar', 'tonton'].indexOf(kind) < 0) return { ok: false, error: 'Data tidak valid' };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var k = 'stat:' + slug + ':' + kind;
    var n = (parseInt(props.getProperty(k) || '0', 10) || 0) + 1;
    props.setProperty(k, String(n));
    return { ok: true, count: n };
  } finally {
    lock.releaseLock();
  }
}

function stats_() {
  var all = PropertiesService.getScriptProperties().getProperties();
  var out = {};
  Object.keys(all).forEach(function (k) {
    var m = k.match(/^stat:([a-z0-9\-]+):(baca|dengar|tonton)$/);
    if (!m) return;
    out[m[1]] = out[m[1]] || { baca: 0, dengar: 0, tonton: 0 };
    out[m[1]][m[2]] = parseInt(all[k], 10) || 0;
  });
  return out;
}

// ---------- Komentar (disimpan di lembar "Komentar" pada Google Sheet yang sama) ----------
var LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9][a-z0-9-]*\.(com|net|org|id|io|co|me|xyz|info|biz|ly|link|site|online|shop|store|app|dev|tv|cc|top|club|vip)\b|\bt\.me\/|\bwa\.me\/|bit\.ly|\bdot\s*(com|net|org)\b)/i;

function commentsSheet_() {
  var ss = sheet_().getParent();
  var sh = ss.getSheetByName('Komentar');
  if (!sh) {
    sh = ss.insertSheet('Komentar');
    sh.appendRow(['ID', 'Waktu', 'Surat', 'Nama', 'Komentar']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readComments_() {
  var values = commentsSheet_().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue;
    out.push({ id: String(r[0]), time: r[1] instanceof Date ? r[1].toISOString() : String(r[1]), slug: String(r[2]), name: String(r[3]), text: String(r[4]) });
  }
  out.sort(function (a, b) {
    return a.time < b.time ? 1 : a.time > b.time ? -1 : 0;
  });
  return out;
}

function comments_(slug) {
  if (!/^[a-z0-9\-]{2,40}$/.test(slug || '')) return { ok: false, error: 'Surat tidak valid' };
  var all = readComments_().filter(function (c) {
    return c.slug === slug;
  });
  return { ok: true, total: all.length, comments: all.slice(0, 300) };
}

function allComments_() {
  var all = readComments_();
  return { ok: true, total: all.length, comments: all.slice(0, 500) };
}

function addComment_(p) {
  var slug = String(p.slug || '');
  var name = String(p.name || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  var text = String(p.text || '').replace(/[\u0000-\u0009\u000b-\u001f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1000);
  if (!/^[a-z0-9\-]{2,40}$/.test(slug)) return { ok: false, error: 'Surat tidak valid' };
  if (!name || !text) return { ok: false, error: 'Nama dan komentar wajib diisi' };
  if (LINK_RE.test(name + ' ' + text)) return { ok: false, error: 'Komentar yang berisi tautan tidak bisa dikirim' };
  // Batas kiriman per perangkat: 3 per menit
  var cache = CacheService.getScriptCache();
  var rk = 'rl:' + String(p.ipHash || 'x').slice(0, 64);
  var now = Date.now();
  var hist = [];
  try {
    hist = JSON.parse(cache.get(rk) || '[]').filter(function (t) {
      return now - t < 60000;
    });
  } catch (e) {
    hist = [];
  }
  if (hist.length >= 3) return { ok: false, error: 'Terlalu cepat. Tunggu sebentar lalu kirim lagi.', limited: true };
  hist.push(now);
  cache.put(rk, JSON.stringify(hist), 90);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var safe = function (v) {
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    };
    var c = { id: Utilities.getUuid(), time: new Date().toISOString(), slug: slug, name: name, text: text };
    commentsSheet_().appendRow([c.id, new Date(c.time), slug, safe(name), safe(text)]);
    return { ok: true, comment: c };
  } finally {
    lock.releaseLock();
  }
}

function deleteComment_(id) {
  if (!/^[a-f0-9\-]{36}$/.test(id || '')) return { ok: false, error: 'ID tidak valid' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = commentsSheet_();
    var ids = sh.getRange(1, 1, Math.max(1, sh.getLastRow()), 1).getValues();
    for (var i = ids.length - 1; i >= 1; i--) {
      if (String(ids[i][0]) === id) {
        sh.deleteRow(i + 1);
        return { ok: true };
      }
    }
    return { ok: true, missing: true };
  } finally {
    lock.releaseLock();
  }
}

/** Jalankan sekali dari editor untuk memberi izin akses (tombol Run). */
function izinkanAkses() {
  Logger.log(DriveApp.getFolderById(FOLDER_ID).getName());
  Logger.log(sheet_().getParent().getUrl());
  Logger.log((YouTube.Channels.list('snippet', { mine: true }).items || []).length);
}
