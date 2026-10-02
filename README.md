# GERAK iCARE — Dashboard Pinterest Style + Integrated Analytics

Versi ini mempertahankan UX/UI dashboard pastel/lavender yang sudah dibuat dan mengintegrasikan frontend dengan Google Apps Script + Google Sheets.

## File utama

```text
index.html
css/style.css
js/api.js
js/app.js
assets/care-logo.jpg
GERAK-iCARE-Apps-Script-EWS.gs
```

## Modul yang sudah terhubung

- Login Kepala Sekolah / Guru
- Guru login dengan memilih nama dari DATA_GURU
- Kepala Sekolah: Dashboard, Data Guru, Early Warning, Pengaturan
- Guru: Dashboard pribadi, Mood Check, Refleksi Harian, Evaluasi Mingguan
- Foto profil Guru per akun/perangkat
- Partisipasi Harian
- Distribusi Mood
- Wellbeing Guru 40% Mood + 30% Refleksi + 30% Evaluasi
- Implementasi Pembelajaran Mendalam: Berkesadaran, Bermakna, Menyenangkan, Memahami, Mengaplikasi, Merefleksi
- EWS: Aman, Perlu Perhatian, Waspada, Prioritas Tindak Lanjut, Belum Mengisi
- Recommendation Engine
- Tindak Lanjut dan monitoring
- Trend 7/30 hari
- Detail Guru
- Tidak ada ranking guru

## Penting sebelum digunakan

1. Buka Google Apps Script yang terhubung ke Google Spreadsheet.
2. Ganti kode Apps Script lama dengan `GERAK-iCARE-Apps-Script-EWS.gs`.
3. Jalankan `setupDatabase()` satu kali dari editor Apps Script dan berikan izin yang diminta.
4. Deploy sebagai **Web app**:
   - Execute as: Me
   - Who has access: Anyone
5. Salin URL `/exec` hasil deployment.
6. Jika URL deployment berbeda dengan URL pada `js/api.js`, ubah:

```js
const API_URL = "URL_WEB_APP_ANDA";
```

7. Jalankan `index.html` dengan Live Server/VS Code.

## Struktur Google Sheets

Apps Script akan membuat/migrasikan:

- SETTING
- USERS
- DATA_GURU
- MOOD_CHECK
- REFLEKSI_HARIAN
- EVALUASI_MINGGUAN
- EWS
- WELLBEING
- IMPLEMENTASI_PM
- TINDAK_LANJUT
- LOG

Script menggunakan migrasi header: kolom yang belum ada akan ditambahkan, bukan menghapus data lama.

## Login

Kepala Sekolah:
- Username: `kepala`
- PIN awal: `1234`

Guru:
- pilih nama Guru yang sudah dimasukkan Kepala Sekolah di DATA_GURU
- tidak menggunakan password

## Foto profil

Guru dapat klik foto/inisial di header atau sidebar, memilih gambar, lalu menyimpannya. Foto disimpan berdasarkan ID akun Guru pada browser/perangkat tersebut sehingga tidak mengubah database sekolah.

## Alur data

Guru mengisi → Google Sheets → EWS/Wellbeing/PM dihitung otomatis → Dashboard Kepala Sekolah → Rekomendasi → Tindak lanjut → Monitoring → Trend.


## LOGIN GURU FIX
Versi ini memperbaiki validasi form agar input Kepala Sekolah yang tersembunyi tidak menghalangi login Guru.
