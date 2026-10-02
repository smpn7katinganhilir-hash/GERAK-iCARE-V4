# Perbaikan Database Guru – GERAK iCARE

Perbaikan ini **tidak mengubah tampilan dashboard, halaman, login lampu, EWS, Mood Check, Refleksi Harian, Evaluasi Mingguan, maupun analytics**.

Yang diperbaiki hanya jalur:

`GitHub Pages → Google Apps Script → Google Sheets → DATA_GURU`

## 1. File yang diperbarui

- `GERAK-iCARE-Apps-Script-EWS.gs`
  - koneksi spreadsheet dibuat lebih stabil menggunakan `SS_ID` pada Script Properties;
  - `setupDatabase()` tetap dapat dijalankan dari editor Apps Script;
  - ditambahkan `setSpreadsheetId()` untuk menghubungkan spreadsheet secara eksplisit;
  - `saveGuru()` kompatibel dengan header baru maupun header lama (`ID`, `Nama`, `Status`);
  - `deleteGuru()` juga kompatibel dengan struktur lama;
  - ID guru baru dibuat unik dan tidak menimpa ID lama.

## 2. WAJIB dilakukan setelah mengganti kode Apps Script

Buka project Google Apps Script yang digunakan oleh URL API GERAK iCARE.

1. Ganti kode backend dengan isi file `GERAK-iCARE-Apps-Script-EWS.gs`.
2. Pastikan project Apps Script terhubung ke spreadsheet GERAK iCARE, atau set Spreadsheet ID secara eksplisit.
3. Jalankan fungsi `setupDatabase()` **sekali dari editor Apps Script**.
4. Berikan izin akses Google jika diminta.
5. Buka **Deploy → Manage deployments**.
6. Edit deployment Web App yang digunakan GitHub.
7. Pilih **New version**.
8. Pastikan:
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Deploy.

## 3. Jika project Apps Script TIDAK bound ke spreadsheet

Gunakan fungsi:

`setSpreadsheetId('SPREADSHEET_ID_ANDA')`

Jalankan sekali dari editor Apps Script.

Spreadsheet ID adalah bagian URL Google Sheets di antara `/d/` dan `/edit`.

Contoh URL:

`https://docs.google.com/spreadsheets/d/ABC123XYZ/edit`

Maka ID-nya adalah:

`ABC123XYZ`

Setelah berhasil, jalankan `setupDatabase()` sekali.

## 4. Jangan membuat spreadsheet baru

Jika DATA_GURU lama sudah berisi data, **jangan menghapus sheet DATA_GURU** dan jangan membuat spreadsheet database baru.

Kode baru membaca struktur lama maupun struktur baru.

## 5. Struktur DATA_GURU yang direkomendasikan

Header utama:

`user_id | nama | nip | mapel | kelas | status`

Data lama dengan:

`ID | Nama | Status`

juga masih dapat dibaca.

## 6. Setelah deployment

Buka URL GitHub Pages dan:

1. Pilih Kepala Sekolah.
2. Masukkan password `1234`.
3. Buka **Data Guru**.
4. Tambahkan satu guru uji.
5. Pastikan guru muncul di tabel.
6. Logout.
7. Pilih Guru.
8. Pastikan nama guru tersebut muncul pada pilihan login.

## 7. Jika masih muncul "Database Google Sheets belum terhubung"

Itu berarti deployment `/exec` belum menunjuk ke project Apps Script/database yang benar. Jalankan `setupDatabase()` dari project Apps Script yang sama dengan deployment tersebut, lalu buat **New version** pada deployment.

## API yang digunakan frontend

`https://script.google.com/macros/s/AKfycbx8KEXcpv0LFazkHnR6vzSInsDGvC7fYwJ6UV5MqTnFaXnwfCD-JqPN4QLADiUQNklO/exec`
