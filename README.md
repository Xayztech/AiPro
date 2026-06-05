# ✦ AIPro - Floating AI Assistant

Multi-model AI chat dengan floating overlay. Support Gemini & ChatGPT, auto-switch ketika limit/error, no-reload, upload semua jenis file, screenshot, clipboard.

---

## 🚀 Fitur

- **12 AI Models**: Gemini 2.5 Flash, 2.0 Flash-Lite, 1.5 Flash, ChatGPT GPT-4o, dll
- **12 API Keys per provider** — auto-rotate saat limit, auto-switch AI saat error
- **Floating Window** — drag, resize, close, fullscreen
- **No Reload** — Pure SPA, PWA, Service Worker
- **Upload Semua File** — gambar, video, audio, PDF, dokumen, dll
- **Screenshot** — screen capture langsung dari browser
- **Clipboard Paste** — tempel gambar/teks dari clipboard (Ctrl+V)
- **Drag & Drop** — seret file ke window
- **Ringan** — Zero dependency, pure HTML/CSS/JS + Node.js CJS
- **Install sebagai APK** — PWA installable di Android

---

## 📁 Struktur File

```
aipro/
├── aipro.js          # Backend utama (CJS Node.js)
├── package.json      # Package config
├── vercel.json       # Vercel deployment config
├── .env.example      # Template environment variables
├── .gitignore
└── public/
    ├── home.html     # Frontend (SPA + PWA)
    ├── manifest.json # PWA manifest (install sebagai app)
    └── sw.js         # Service Worker (no-reload, offline)
```

---

## 🔑 Setup API Keys

1. Copy `.env.example` ke `.env`
2. Isi API keys:
   - **Gemini**: Dapatkan di https://aistudio.google.com/app/apikey (GRATIS)
   - **OpenAI**: Dapatkan di https://platform.openai.com/api-keys

```env
GEMINI_KEY_1=AIza...
GEMINI_KEY_2=AIza...
# dst hingga KEY_12
```

---

## 🖥️ Jalankan Lokal

```bash
node aipro.js
# Buka http://localhost:3000
```

---

## ☁️ Deploy di Vercel

1. Push ke GitHub
2. Import repo di https://vercel.com/new
3. Tambah Environment Variables di Vercel Dashboard:
   - `GEMINI_KEY_1` sampai `GEMINI_KEY_12`
   - `OPENAI_KEY_1` sampai `OPENAI_KEY_12`
4. Deploy!

---

## 🌐 Deploy di VPS/Hosting

```bash
# Install Node.js 18+
git clone https://github.com/USERNAME/aipro.git
cd aipro
cp .env.example .env
nano .env  # isi API keys

# Jalankan
node aipro.js

# Atau dengan PM2 (production)
npm install -g pm2
pm2 start aipro.js --name aipro
pm2 save
pm2 startup
```

### Nginx reverse proxy:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        client_max_body_size 50M;
    }
}
```

---

## 🐳 Deploy dengan Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["node", "aipro.js"]
```

```bash
docker build -t aipro .
docker run -p 3000:3000 --env-file .env aipro
```

---

## 📱 Install sebagai APK (Android)

1. Buka website di Chrome Android
2. Tap menu ⋮ → **"Tambahkan ke layar utama"** atau **"Install app"**
3. Konfirmasi install
4. App terinstall seperti APK di layar utama
5. Buka app → izinkan "Tampil di atas app lain" di Pengaturan Android

### Aktifkan Floating (Draw Over Other Apps):
```
Pengaturan → Aplikasi → Izin Aplikasi Khusus → 
Tampilkan di atas aplikasi lain → AIPro → Izinkan
```

---

## 🔌 API Usage

```bash
# Chat
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [{"role":"user","content":"Halo!"}],
    "files": []
  }'

# List models
curl https://your-domain.com/api/models

# Health check
curl https://your-domain.com/api/health
```

### Chat dengan file (base64):
```json
{
  "model": "gemini-2.5-flash",
  "messages": [{"role":"user","content":"Analisis gambar ini"}],
  "files": [{
    "name": "foto.jpg",
    "mimeType": "image/jpeg",
    "data": "BASE64_STRING_HERE"
  }]
}
```

---

## 🤖 Model yang Tersedia

| ID | Nama | Provider |
|----|------|---------|
| `gemini-2.5-flash` | Gemini 2.5 Flash | Google |
| `gemini-2.0-flash-lite` | Gemini 2.0 Flash-Lite | Google |
| `gemini-1.5-flash` | Gemini 1.5 Flash | Google |
| `gemini-1.5-flash-8b` | Gemini 1.5 Flash-8B | Google |
| `gemini-2.0-flash` | Gemini 2.0 Flash | Google |
| `gemini-flash-thinking` | Gemini 2.5 Flash Thinking | Google |
| `gemini-1.0-pro` | Gemini 1.0 Pro | Google |
| `gemini-exp` | Gemini Experimental | Google |
| `gpt-4o-mini` | ChatGPT GPT-4o Mini | OpenAI |
| `gpt-4o` | ChatGPT GPT-4o | OpenAI |
| `gpt-3.5-turbo` | ChatGPT GPT-3.5 Turbo | OpenAI |
| `gpt-4-turbo` | ChatGPT GPT-4 Turbo | OpenAI |

---

## ⚡ Auto-Switch Logic

1. Kirim request ke model yang dipilih
2. Jika rate limit (429/503) → coba key berikutnya (max 3x)
3. Jika semua key limit → switch ke model lain
4. Urutkan: Gemini 2.5 Flash → 2.0 Flash-Lite → 1.5 Flash → ... → GPT-4o Mini → GPT-4o → ...
5. Jika semua gagal → tampilkan error

---

## 📝 License

MIT License - Bebas digunakan dan dimodifikasi
