# Tower Defense Mini

Game **tower defense 2D** ringan yang langsung bisa dimainkan di browser. Dibangun murni dengan **HTML5 Canvas + JavaScript ES6 modules** â€” tanpa framework berat, tanpa backend, tanpa aset berhak cipta.

> Pertahankan base-mu dari **10 gelombang musuh**, bangun menara strategis, gunakan skill **Serangan Udara**, dan kalahkan **Boss** di wave terakhir.

---

## Demo

**Live demo:** `https://iqbalarbani.github.io/Tower-Defense-Mini/` _(placeholder â€” aktifkan GitHub Pages sesuai panduan di bawah)_

### Screenshot / GIF

> Ganti placeholder di bawah dengan screenshot atau GIF gameplay kamu.

```
![Gameplay](docs/gameplay.gif)
![Menu](docs/menu.png)
```

---

## Cara Menjalankan Secara Lokal

Game memakai **ES modules**, jadi harus disajikan lewat HTTP (bukan `file://`).

```bash
# 1. Clone repo
git clone https://github.com/Iqbalarbani/Tower-Defense-Mini.git
cd Tower-Defense-Mini

# 2. Jalankan server statis (pilih salah satu)
python -m http.server 8000
# atau
npx serve
# atau ekstensi "Live Server" di VS Code

# 3. Buka browser
# http://localhost:8000
```

Tidak ada langkah build, tidak ada `npm install` â€” cukup file statis.

---

## Fitur

### Gameplay
- **Peta grid 15x10** dengan jalur dinamis dan rintangan batu.
- **Pathfinding A\*** â€” musuh menghitung ulang rute secara real-time ketika jalur berubah.
- **3 jenis menara** dengan peran berbeda:
  - **Menara Panah** â€” murah, cepat, damage kecil.
  - **Menara Meriam** â€” damage area (splash), lambat.
  - **Menara Es** â€” memperlambat musuh, damage rendah.
- **3 jenis musuh** (normal, cepat, tank) + **Boss** di wave terakhir.
- **10 gelombang** dengan kesulitan bertahap dan jeda antar wave.
- **Ekonomi** â€” uang awal, hadiah per kill, bonus akhir wave, biaya bangun/upgrade, refund saat jual.
- **Upgrade 2 level** untuk setiap menara.
- **Nyawa base** â€” berkurang saat musuh lolos.
- **Kondisi menang/kalah** dengan statistik lengkap.

### Fitur Unik
- **Serangan Udara** â€” skill aktif dengan **cooldown 25 detik**: klik area untuk damage besar ke semua musuh dalam radius, lengkap dengan preview radius dan crosshair.
- **Boss beraura** â€” HP 1400 dengan aura yang **memperlambat tembakan menara** di sekitarnya. Pemain harus menempatkan menara dengan cermat.

### Poles
- Menu utama, layar **Cara Bermain**, **Menang**, dan **Kalah** dengan statistik.
- **Skor tertinggi** disimpan di `localStorage`.
- **Efek suara sintetis** via Web Audio API (tembak, musuh mati, bangun menara, wave, base kena, fanfare) + tombol **mute**.
- **Animasi dan feedback visual**: health bar musuh, partikel ledakan, recoil menara, floating text (+gold/-nyawa), screen shake, flash layar, indikator jangkauan menara, highlight tile valid/invalid.
- **Responsif** â€” canvas menyesuaikan layar, kontrol sentuh di mobile.
- **Pause** dan **kecepatan game 1x/2x**.
- Visual konsisten dengan palet warna terbatas dan bentuk geometris sederhana.

---

## Tantangan Teknis dan Solusinya

### 1. Pathfinding dinamis dengan menara yang bisa ditempatkan
**Tantangan:** Pemain menaruh menara di tengah peta; jalur musuh harus berubah, tetapi menara tidak boleh memblokir total jalan ke base.

**Solusi:**
- A\* dijalankan pada grid dengan 4 arah gerak dan heuristik **Manhattan** (admissible, optimal untuk grid 4-arah).
- Sebelum menara ditempatkan, game **mensimulasikan** tile tersebut sebagai `BLOCKED`, menjalankan A\*, lalu mengembalikan tile. Jika A\* mengembalikan `null`, penempatan ditolak dengan pesan *"memblokir jalur"*.
- Setelah penempatan/jual, `repathAll()` menghitung ulang rute **semua musuh yang sudah di lapangan** dari tile tempat mereka berada â€” waypoint pertama = posisi sekarang agar musuh tidak berbalik arah secara aneh.
- Binary min-heap menjaga A\* tetap cepat (grid hanya 150 tile, aman dipanggil setiap perubahan).

### 2. Balancing gelombang dan ekonomi
**Tantangan:** Membuat 10 wave terasa menantang tapi adil tanpa playtesting berbulan-bulan.

**Solusi:**
- Semua angka (HP, speed, reward, damage, biaya, cooldown) dipusatkan di **`js/config.js`** â€” sekali ubah, berlaku di seluruh game.
- Wave terstruktur sebagai data murni (`groups: [{ type, count }]`), mudah di-tuning.
- Bonus gold akhir wave (`20 + wave x 5`) memberi ruang untuk membangun sebelum gelombang berat.
- Boss diberi **aura** sebagai soft counter terhadap strategi "tumpuk semua menara di satu titik".

### 3. Audio tanpa aset berhak cipta
**Solusi:** Semua suara disintesis lewat **Web Audio API** (`OscillatorNode` + envelope gain). Tidak ada file audio, sehingga repo bebas lisensi dan ukurannya kecil. `AudioContext` dibuat lazy setelah interaksi pengguna pertama untuk mematuhi kebijakan autoplay browser.

### 4. Menjaga sinkronisasi state UI dan game
**Solusi:** Game memanggil `onStateChange()` setiap kali ada perubahan penting (gold, nyawa, seleksi menara, fase wave). `main.js` merender ulang UI dari state itu â€” satu arah data, tanpa duplikasi state di DOM.

---

## Struktur Proyek

```
Tower-Defense-Mini/
â”œâ”€â”€ index.html            # Shell + canvas + overlay menu
â”œâ”€â”€ css/
â”‚   â””â”€â”€ style.css         # Palet warna, layout, overlay, responsif
â”œâ”€â”€ js/
â”‚   â”œâ”€â”€ config.js         # Konstanta terpusat (menara, musuh, wave, skill)
â”‚   â”œâ”€â”€ main.js           # Bootstrap dan wiring UI
â”‚   â”œâ”€â”€ game.js           # State, game loop, ekonomi, kondisi menang/kalah
â”‚   â”œâ”€â”€ map.js            # Grid, spawn/base, render peta
â”‚   â”œâ”€â”€ pathfinding.js    # Algoritma A* (min-heap + heuristik Manhattan)
â”‚   â”œâ”€â”€ enemies.js        # Musuh, HP bar, slow, repath, boss
â”‚   â”œâ”€â”€ towers.js         # Menara, targeting, upgrade, aura boss
â”‚   â”œâ”€â”€ projectiles.js    # Proyektil, partikel, ledakan
â”‚   â”œâ”€â”€ waves.js          # Manajer gelombang berbasis data
â”‚   â”œâ”€â”€ skills.js         # Skill aktif (Air Strike) + cooldown
â”‚   â”œâ”€â”€ effects.js        # Floating text, screen shake, flash
â”‚   â””â”€â”€ audio.js          # Efek suara sintetis (Web Audio API)
â”œâ”€â”€ .gitignore
â”œâ”€â”€ LICENSE               # MIT
â””â”€â”€ README.md
```

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Render | HTML5 Canvas 2D |
| Logika | JavaScript ES6 modules (vanilla) |
| Pathfinding | A* custom (binary heap) |
| Audio | Web Audio API (sintesis, tanpa file) |
| Penyimpanan | localStorage (skor tertinggi) |
| Hosting | GitHub Pages / itch.io (statis) |

**Tanpa dependensi runtime. Tanpa build step. Tanpa backend.**

---

## Panduan Deploy ke GitHub Pages

Repo: `https://github.com/Iqbalarbani/Tower-Defense-Mini`

1. **Push semua file** ke branch `main`:
   ```bash
   git add .
   git commit -m "Final: Tower Defense Mini siap deploy"
   git push origin main
   ```
2. Buka repo di GitHub -> **Settings** -> **Pages**.
3. Di **Build and deployment** -> **Source**, pilih **Deploy from a branch**.
4. **Branch:** `main`, **Folder:** `/ (root)` -> **Save**.
5. Tunggu 1-2 menit. Situs akan tersedia di:
   ```
   https://iqbalarbani.github.io/Tower-Defense-Mini/
   ```
6. Karena game memakai ES modules relatif, path bekerja otomatis di GitHub Pages. Tidak perlu konfigurasi tambahan.

### Deploy ke itch.io (opsional)
1. Zip seluruh isi proyek (mulai dari `index.html` di root zip).
2. Di itch.io: **Create new project** -> **Kind of project:** HTML.
3. Upload zip, centang **"This file will be played in the browser"**.
4. Atur ukuran embed (mis. 960x540), simpan dan publish.

---

## Rencana Pengembangan Selanjutnya

- [ ] Menara ke-4 (mis. menara listrik berantai / chain lightning).
- [ ] Sistem "wave preview" yang menampilkan komposisi musuh berikutnya.
- [ ] Multiple map dengan layout berbeda.
- [ ] Mode endless dengan skor dan leaderboard lokal.
- [ ] Musik latar (looping ambient).
- [ ] Peningkatan aksesibilitas (navigasi keyboard, kontras warna).
- [ ] Unit test untuk pathfinding dan logika wave.

---

## Lisensi

Dirilis di bawah lisensi **MIT** â€” lihat [LICENSE](LICENSE).

Dibuat sebagai proyek portofolio. Semua visual dibuat dengan bentuk geometris sederhana dan semua audio disintesis â€” tidak ada aset berhak cipta.
