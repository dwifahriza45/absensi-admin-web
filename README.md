# absensi-admin-web

Dashboard absensi dan pengelolaan Mitra, Bidang, serta Karyawan. React + TypeScript + Vite; tampilan dashboard dan palet warna sebelumnya dipertahankan.

## Menjalankan

Node.js 20.19+ atau 22.13+.

```bash
cp .env.example .env
npm ci
npm run dev
```

Buka **http://localhost:5174/admin/** atau **http://127.0.0.1:5174/admin/**. `VITE_API_URL` mengatur target proxy Vite, default `http://127.0.0.1:8082`. Browser selalu memanggil `/api` di host frontend sendiri; cookie tidak perlu disalin dari Postman. Port bersifat strict supaya tidak diam-diam pindah ke origin lain. Sesudah mengubah `.env`, restart Vite.

Backend harus berjalan dan seluruh migration sudah diterapkan (`make dev-migrate`, `make dev` dari absensi-api). `CORS_ORIGINS` backend development mengizinkan frontend localhost/127.0.0.1 port 5174. Jika menggunakan port/domain lain, tambahkan origin spesifik itu ke konfigurasi backend.

Login menggunakan **email dan password admin**, bukan PIN. Session memakai cookie HttpOnly; access/refresh token tidak ditaruh di localStorage. Saat halaman dibuka ulang, frontend memeriksa `/auth/me`. Request 401 mencoba refresh sekali; request bersamaan berbagi satu refresh. Logout mencabut session di server dan baru mengeluarkan admin setelah berhasil. Error validasi field mengikuti response backend.

## Halaman

- `/admin/`: dashboard pemantauan absensi dengan filter, peta, foto, dan export sebelumnya.
- `/admin/mitra`: list, pencarian, pagination, detail, tambah/ubah/hapus, export XLSX, template dan import file. Header template/export hanya **NAMA MITRA**.
- `/admin/bidang`: fitur yang sama, header **NAMA BIDANG**.
- `/admin/karyawan`: list, pencarian nama/NIK/HP, filter mitra/bidang/status, detail, tambah/ubah, nonaktifkan dan aktifkan kembali lewat ikon power di tabel. Mitra/bidang dipilih dari data master; API menerima kode INT/BID dan path memakai EMP. Nomor HP tampil untuk admin; data lama yang belum mempunyai nomor terenkripsi ditandai “Belum diisi”.

Import master mengirim multipart field `file` langsung ke backend, maksimal 8 MiB/5.000 baris. Ringkasan menampilkan jumlah berhasil/dilewati/error dan detail per baris yang dapat difilter. Template dan file export dapat langsung digunakan ulang; nama yang sudah ada di-skip. Rename master lama lewat form Ubah, bukan mengganti nama di file satu kolom.

Import karyawan menggunakan format Excel **Nama, Nomor HP, Mitra, Bidang, NIK, ID Karyawan**, dibaca di frontend dan dikirim sebagai JSON ke endpoint employee import yang sudah ada. Batas 4 MiB/file, 32 MiB setelah dibuka, 5.000 baris. Hasil menampilkan jumlah baru/diperbarui/dinonaktifkan dan baris dilewati beserta alasan. Opsi nonaktifkan data yang tidak ada dalam file tidak aktif secara default. Import karyawan tetap membuat/mencari master dari nama sesuai aturan backend.

NIK wajib 16 digit dan unik, bisa diubah. Menyimpan perubahan profil mencabut session karyawan agar login ulang memakai nama + NIK terbaru. Frontend tidak mengirim phone jika nilainya tidak berubah. Karyawan tanpa attendance dapat dihapus permanen; semua sesi ikut dicabut. Ikon hapus disabled dengan tooltip bila sudah ada riwayat absensi. Form Tambah/Ubah tidak memuat Status. Nonaktifkan/aktifkan dilakukan lewat ikon power di tabel, dengan konfirmasi. Endpoint status hanya mengubah isActive sehingga edit profil tidak menimpa status. Master yang masih dipakai karyawan tidak dapat dihapus.

## Verifikasi

```bash
npm run build
npm run lint
npm audit
npx playwright install chromium
npm run test:e2e
```

Untuk Chrome yang sudah terpasang: `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Tes browser memakai mock API untuk perubahan data, sehingga tidak mengubah data development. Tes mencakup cookie-session flow, refresh bersamaan, logout, CRUD master, error FK, import summary, relasi employee, edit tanpa perubahan nomor, nonaktifkan/aktifkan ulang, dan viewport mobile. Playwright menjalankan Vite sendiri bila port 5174 belum aktif.

## Deployment

### Docker / VPS

Docker mengikuti pola `absensi-pegawai-web`: build Node 24, runtime Nginx, proxy API dari `.env`, healthcheck `/healthz`, dan network eksternal yang sama. Path admin serta seluruh asset tetap `/admin/`. Compose ada di `docker-compose.yml`.

Siapkan `.env` dari `.env.example` bila belum ada, lalu isi untuk VPS:

```dotenv
DOCKER_IMAGE=USERNAME_DOCKERHUB/absensi-admin-web
IMAGE_TAG=sha-FULL_COMMIT_DARI_GITHUB_ACTIONS
WEB_PORT=8088
API_UPSTREAM=http://absensi-api:8087
API_NETWORK=absen
```

`API_UPSTREAM` memakai port internal API sesuai konfigurasi VPS (8087), bukan port frontend. API dan kedua FE harus bergabung ke network `absen`; API harus punya service name/network alias `absensi-api`. Nilai 8088 adalah port admin, sedangkan FE pegawai 8086 dan API 8087. Port admin hanya bind ke loopback host.

```sh
# Buat sekali bila network belum ada, termasuk jika API belum disiapkan.
docker network inspect absen >/dev/null 2>&1 || docker network create absen
docker compose config --quiet
docker compose pull
docker compose up -d --no-build
docker compose ps
```

Untuk build dari source: `docker compose up -d --build`. Untuk mencoba image lokal, `.env.example` menyediakan `DOCKER_IMAGE=absensi-admin-web` dan `IMAGE_TAG=local`; ganti ke nama Docker Hub/tag SHA pada VPS. Private image perlu `docker login` terlebih dahulu.

Buka `http://127.0.0.1:8088/admin/` langsung dari VPS atau `https://domain.com/admin/` lewat reverse proxy. `/admin` diredirect ke `/admin/`; reload `/admin/karyawan`, `/admin/mitra`, atau `/admin/bidang` tetap berfungsi. Asset yang hilang mengembalikan 404, bukan index HTML. Runtime `API_UPSTREAM` bisa diganti tanpa rebuild dengan recreate container; `VITE_API_URL` hanya untuk Vite development.

Frontend dapat hidup sebelum API tersedia karena DNS upstream di-resolve saat request, bukan startup Nginx. Healthcheck memeriksa Nginx saja. Login/pengambilan data menghasilkan 502 jika API belum ada; setelah API bergabung, DNS diperbarui dalam sekitar 30 detik. Rekap PDF memiliki timeout proxy satu jam dan streaming tanpa temporary file proxy; proxy luar juga harus mengizinkan durasi itu.

Contoh location reverse proxy VPS tersedia di [docker/vps-locations.example.conf](docker/vps-locations.example.conf), untuk dimasukkan dalam server HTTPS yang sudah ada. Routing: `/admin` dan `/admin/*` ke 8088, `/api/*` ke 8087, dan `/` ke FE pegawai 8086. Jangan menambahkan trailing slash pada `proxy_pass` admin karena prefix `/admin/` harus dipertahankan. Sesuaikan port jika deployment berubah. Domain perlu terdaftar di `CORS_ORIGINS` API; production memakai HTTPS dan Secure cookies.

### GitHub Actions → Docker Hub

Workflow `.github/workflows/docker-hub.yml` sama dengan FE pegawai: push `main`/`master`, Git tag `v*`, atau manual. Folder `absensi-admin-web` harus menjadi root repository GitHub. Image Linux amd64 dipublikasikan dengan `sha-<full commit SHA>`; branch default juga mendapat `latest`.

Buat repository Docker Hub **absensi-admin-web**. Tambahkan repository secrets GitHub **DOCKERHUB_USERNAME** dan **DOCKERHUB_TOKEN** (Read & Write). Variable **DOCKERHUB_REPOSITORY** opsional jika nama repository image berbeda; isi nama repo saja tanpa username. Ringkasan Actions menampilkan `DOCKER_IMAGE`, `IMAGE_TAG`, dan digest yang bisa disalin ke `.env` VPS. Workflow memublikasikan image, tidak otomatis deploy VPS. Credentials/.env/artefak tes tidak disertakan ke image.

Hasil build ada di `dist`. Pasang isi `dist` pada direktori `/admin/`. Arahkan `/admin` ke `/admin/`, dan gunakan fallback SPA khusus `/admin/*` ke `/admin/index.html` agar reload halaman seperti `/admin/karyawan` tetap berfungsi. Root `/` dan fallback-nya dipakai aplikasi pegawai, sementara `/api` di-reverse proxy ke absensi-api. Base asset Vite dan basename router admin sudah `/admin/`; endpoint API tetap `/api/v1/admin/*`. Halaman login admin berada di `/admin/login`. `VITE_API_URL` adalah target proxy development, bukan alamat hardcoded browser. Daftarkan origin frontend production yang tepat di `CORS_ORIGINS` backend dan gunakan HTTPS dengan Secure cookies. Foto dan download XLSX juga memakai API client cookie yang sama.

Halaman Karyawan juga menyediakan **Export Excel** dari API `/api/v1/admin/employees/export`. Export mengikuti pencarian nama/NIK/HP, filter mitra/bidang/status dan mencakup semua halaman. Kolom: Nama Lengkap, Nomor HP, Mitra, Bidang, NIK, ID Karyawan; NIK dan nomor HP tetap teks dan header memakai gaya biru tua yang sama dengan master.

## Checklist hapus beberapa data

Tabel Karyawan, Mitra dan Bidang memiliki checkbox per baris dan “pilih semua” untuk **data yang boleh dihapus pada halaman saat ini**. Data dengan relasi penghalang tidak bisa dicentang dan memiliki tooltip alasan, sama dengan ikon hapus. Untuk karyawan, penghalang adalah riwayat attendance; untuk master, seluruh employee yang merujuk termasuk nonaktif. Metadata penghapusan yang belum tersedia juga tidak dapat dicentang sampai data dimuat ulang.

Pilihan dipertahankan saat berpindah halaman, dan direset saat pencarian/filter berubah. Toolbar pilihan menampilkan jumlah terpilih, pembatalan pilihan, serta Hapus terpilih. Modal menampilkan nama-nama yang akan dihapus dan membutuhkan konfirmasi. Penghapusan memanggil API yang sama dengan delete satuan, berurutan, masing-masing tetap dilindungi transaksi dan FK server. Hasil ditampilkan per data: berhasil, dilewati (relasi baru/data sudah tidak tersedia), atau gagal. Proses berhenti saat gangguan jaringan/auth/server dan tidak mengklaim data sisanya berhasil. Muat ulang data sebelum mencoba kembali jika status permintaan tidak pasti.

Detail Pemantauan Absensi menyediakan tombol Download PDF di sebelah Zoom ke lokasi. PDF per karyawan/tanggal berisi identitas, status, jam dan koordinat (WIB), selfie masuk/pulang, serta foto laporan pekerjaan. Foto dimuat melalui API cookie admin; kegagalan memuat foto membatalkan unduhan dan menampilkan pesan. Generator PDF dimuat saat tombol digunakan.

Tombol PDF + Rekap di sebelah Export Excel mengambil seluruh hasil filter aktif dari API sebagai satu PDF. Rentang daftar/export maksimal 31 hari inklusif; jika melebihi batas, tampil pesan profesional dan unduhan dibatalkan. PDF diproses bertahap di server dan satu rekap berat dijalankan per instance; tombol unduhan dikunci selama proses. PDF terputus ditolak klien. Untuk rentang panjang, tanggal tanpa catatan mengikuti perilaku daftar (ditampilkan saat mencari nama atau memilih status Belum absen).

Rekap PDF absensi wajib memilih satu Mitra dan mencakup semua bidang dalam mitra tersebut; filter Bidang diabaikan untuk rekap. API juga memvalidasi Mitra sebelum mengambil data. Export Excel tetap wajib memilih satu Mitra dan satu Bidang. Batas 31 hari tetap berlaku.

NIK KTP dipakai bersama nama untuk login pegawai. Isi NIK asli karyawan lama lewat form atau import setelah migration 000011. Untuk mengganti NIK lewat import, gunakan hasil export dan pertahankan ID Karyawan agar riwayat absensi tetap terhubung. Tanpa ID, NIK yang sama memperbarui profil; data lama tanpa NIK dapat dicocokkan dari nomor HP. Format kolom NIK sebagai teks di Excel untuk mempertahankan seluruh 16 digit.
