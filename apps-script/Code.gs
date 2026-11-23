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
        publishedAt: it.contentDetails.videoPublishedAt || it.snippet.publishedAt,
        thumbnail: it.snippet.thumbnails && (it.snippet.thumbnails.high || it.snippet.thumbnails.medium || it.snippet.thumbnails.default || {}).url,
      });
    });
    token = res.nextPageToken;
  } while (token && videos.length < 2000);
  return { ok: true, channel: { id: channel.id, title: channel.snippet.title, handle: channel.snippet.customUrl }, videos: videos };
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

/** Jalankan sekali dari editor untuk memberi izin akses (tombol Run). */
function izinkanAkses() {
  Logger.log(DriveApp.getFolderById(FOLDER_ID).getName());
  Logger.log(sheet_().getParent().getUrl());
  Logger.log((YouTube.Channels.list('snippet', { mine: true }).items || []).length);
}
