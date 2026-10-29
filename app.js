/**
 * app.js - jembatan antara halaman di GitHub Pages dan Apps Script.
 *
 * Halaman memakai google.script.run.withSuccessHandler(...).namaFungsi(...)
 * (cara bawaan Apps Script). Di GitHub Pages cara itu tidak ada, jadi file ini
 * menirunya: setiap panggilan dikirim lewat fetch() ke URL /exec (doPost di Code.gs).
 */
const API_URL = 'https://script.google.com/macros/s/AKfycby7AdtwBYlN4fU_EynKRqPYEvyVZkb4MA5euTF47bxvlL70aYbmXpe4U1VZcAYpEj0Y/exec';

function api(action, args) {
  // Body berupa teks biasa (tanpa header JSON) supaya tidak memicu preflight CORS.
  return fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ action: action, args: args || [] })
  })
    .then(function (r) {
      if (!r.ok) throw new Error('Server error (' + r.status + ')');
      return r.json();
    })
    .then(function (j) {
      if (!j || j.ok !== true) throw new Error((j && j.error) || 'Terjadi kesalahan di server.');
      return j.data;
    })
    .catch(function (e) {
      if (e instanceof TypeError) throw new Error('Tidak bisa terhubung ke server. Periksa koneksi internet.');
      throw e;
    });
}

// Tiruan google.script.run
(function () {
  function runner(ok, fail) {
    return new Proxy({}, {
      get: function (_, nama) {
        if (nama === 'withSuccessHandler') return function (f) { return runner(f, fail); };
        if (nama === 'withFailureHandler') return function (f) { return runner(ok, f); };
        if (typeof nama !== 'string') return undefined;
        return function () {
          const args = Array.prototype.slice.call(arguments);
          api(nama, args).then(
            function (data) { if (ok) ok(data); },
            function (err) { if (fail) fail(err); else console.error(err); }
          );
        };
      }
    });
  }
  window.google = { script: { run: runner(null, null) } };
})();

// Daftarkan service worker (syarat PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (e) {
      console.warn('Service worker gagal didaftarkan:', e);
    });
  });
}
