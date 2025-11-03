# Setup Google OAuth untuk Production (Vercel)

Setelah deploy ke Vercel, Google login mungkin gagal karena domain production belum dikonfigurasi di Google Cloud Console.

## Langkah-langkah Perbaikan

### 1. Tambahkan Authorized Domains di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project Firebase Anda
3. Navigasi ke **APIs & Services** > **Credentials**
4. Klik pada **OAuth 2.0 Client ID** yang digunakan untuk Firebase (biasanya berakhir dengan `.apps.googleusercontent.com`)
5. Edit OAuth client

### 2. Tambahkan Authorized JavaScript Origins

Tambahkan URL berikut ke **Authorized JavaScript origins**:

```
https://kelastanpatembok.vercel.app
https://[your-project-id].vercel.app (jika ada preview deployments)
https://[your-firebase-auth-domain].firebaseapp.com
```

**Catatan**: Ganti `[your-project-id]` dengan project ID Firebase Anda, dan `[your-firebase-auth-domain]` dengan auth domain dari Firebase config (biasanya `[project-id].firebaseapp.com`).

### 3. Tambahkan Authorized Redirect URIs

Tambahkan URL berikut ke **Authorized redirect URIs**:

```
https://[your-firebase-auth-domain].firebaseapp.com/__/auth/handler
https://[your-project-id].web.app/__/auth/handler
```

**Catatan**: Firebase akan menggunakan domain Firebase sendiri untuk redirect, bukan domain Vercel.

### 4. Verifikasi Firebase Auth Domain di Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project Anda
3. Navigasi ke **Authentication** > **Settings** > **Authorized domains**
4. Pastikan domain berikut sudah ada:
   - `kelastanpatembok.vercel.app`
   - `[your-project-id].vercel.app` (jika menggunakan preview deployments)
   - Domain default Firebase sudah otomatis ada

Jika domain belum ada:
1. Klik **Add domain**
2. Masukkan `kelastanpatembok.vercel.app`
3. Klik **Add**

### 5. Pastikan Environment Variables di Vercel

Pastikan semua environment variables Firebase sudah di-set di Vercel:

1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih project Anda
3. Navigasi ke **Settings** > **Environment Variables**
4. Pastikan variabel berikut ada:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (opsional)

### 6. Redeploy setelah Konfigurasi

Setelah menambahkan domain di Firebase Console, **redeploy** aplikasi di Vercel:

1. Klik **Deployments** di Vercel Dashboard
2. Klik **...** pada deployment terakhir
3. Pilih **Redeploy**

Atau trigger deployment baru dengan push ke repository.

## Troubleshooting

### Error: `redirect_uri_mismatch`

**Solusi**: Pastikan Firebase Auth domain sudah ditambahkan di Google Cloud Console Authorized JavaScript origins.

### Error: `popup_closed_by_user`

Ini bukan error, user hanya menutup popup. Tidak perlu perbaikan.

### Error: `auth/unauthorized-domain`

**Solusi**: Tambahkan domain Vercel di Firebase Console > Authentication > Settings > Authorized domains.

### Error: `auth/operation-not-allowed`

**Solusi**: Pastikan Google Sign-In method sudah diaktifkan di Firebase Console:
1. Firebase Console > Authentication > Sign-in method
2. Pastikan **Google** sudah diaktifkan
3. Pastikan OAuth consent screen sudah dikonfigurasi di Google Cloud Console

## Testing

Setelah semua konfigurasi selesai:
1. Test login di https://kelastanpatembok.vercel.app
2. Buka browser console (F12) untuk melihat error detail jika masih gagal
3. Pastikan tidak ada CORS errors atau OAuth errors di console

## Referensi

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Google OAuth Setup](https://support.google.com/cloud/answer/6158849)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

