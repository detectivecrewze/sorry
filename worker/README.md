# Sorry Letter API

This Worker owns the Phase 2 Studio, public gift and admin APIs. It uses a dedicated KV namespace and the existing media R2 bucket under the `sorry-letter/` prefix.

Before running or deploying, replace the placeholder binding IDs in `wrangler.toml` and configure `ADMIN_SECRET` and `PROJECT_SIGNING_SECRET` with Wrangler secrets. There are intentionally no secret defaults in source code.

Local development:

```powershell
npm run worker:dev
```

## Production deployment

1. Login ke akun Cloudflare yang memiliki bucket `valentine-upload`:

   ```powershell
   npx wrangler login
   ```

2. Buat KV khusus Sorry Letter. Jangan memakai KV Snoopy karena lifecycle project keduanya berbeda:

   ```powershell
   npx wrangler kv namespace create GIFT_KV
   ```

3. Salin `id` yang dihasilkan ke `[[kv_namespaces]].id` di `wrangler.toml`. Binding R2 sudah diarahkan ke bucket bersama `valentine-upload`; tidak perlu membuat bucket baru.

4. Ganti `PUBLIC_GIFT_BASE_URL`, `PUBLIC_STUDIO_BASE_URL`, dan `ALLOWED_ORIGINS` dari localhost menjadi origin frontend Vercel final. Gunakan origin tanpa slash di akhir.

5. Pasang secret production. Gunakan dua nilai acak yang berbeda dan jangan mengganti signing secret setelah project customer dibuat:

   ```powershell
   npx wrangler secret put ADMIN_SECRET --config worker/wrangler.toml
   npx wrangler secret put PROJECT_SIGNING_SECRET --config worker/wrangler.toml
   ```

6. Deploy Worker dari root project:

   ```powershell
   npx wrangler deploy --config worker/wrangler.toml
   ```

7. Buka `https://<worker-url>/api/health`. Respons harus memiliki `ok: true` dan seluruh nilai `storage` bernilai `true`.

8. Di Vercel, tambahkan `VITE_API_BASE_URL=https://<worker-url>` untuk Production, Preview, dan Development jika diperlukan, lalu redeploy frontend. Variabel Vite dibaca saat build, sehingga menambahkannya tanpa redeploy belum mengubah aplikasi.

9. Buat satu project uji dari Admin, buka Studio, upload thumbnail dan MP3, simpan/publish, lalu pastikan kedua media dapat diputar dari `https://cdn.for-you-always.my.id/sorry-letter/...`.

The root Vite app defaults to `http://127.0.0.1:8787` for its API.
