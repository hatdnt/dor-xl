# MYnyak Engsel Sunset

![banner](bnr.png)

CLI client for a certain Indonesian mobile internet service provider.

# How to get environtment Variables
Go to [OUR TELEGRAM CHANNEL](https://t.me/alyxcli)
Copy the provided environment variables and paste it into a text file named `.env` in the same directory as `main.py`.
You can use nano or any text editor to create the file.

# How to run with TERMUX
1. Update & Upgrade Termux
```
pkg update && pkg upgrade -y
```
2. Install Git
```
pkg install git -y
```
3. Clone this repo
```
git clone https://github.com/purplemashu/me-cli-sunset
```
4. Open the folder
```
cd me-cli-sunset
```
5. Setup
```
bash setup.sh
```
6. Run the script
```
python main.py
```

# Web & API (Localhost)

## Cara Menjalankan Backend (FastAPI)
1. Buka folder root proyek di terminal.
2. Aktifkan venv:  
   - Windows: `venv\Scripts\activate`  
   - Linux/Termux: `source venv/bin/activate`
3. Install requirements (jika belum):
```bash
pip install -r requirements.txt
```
4. Jalankan server (pilih salah satu):
```bash
python server.py
# ATAU gunakan uvicorn langsung (untuk auto-reload):
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```
_(Server akan berjalan di http://localhost:8000)_

## Info Sinkronisasi Bot Telegram
Sistem sekarang mendukung update otomatis masa aktif server via Telegram:
- Bot akan membaca pesan yang di-*forward* atau dikirim dengan format: `Akun Howdy dengan username ... berakhir pada 03-Apr-2026`.
- Bot akan membalas pesan Anda di Telegram untuk konfirmasi sukses/gagal.
- Sinkronisasi terjadi otomatis saat Anda masuk ke halaman utama website (proaktif sync).

# Info

## PS for Certain Indonesian mobile internet service provider

Instead of just delisting the package from the app, ensure the user cannot purchase it.
What's the point of strong client side security when the server don't enforce it?

## Terms of Service
By using this tool, the user agrees to comply with all applicable laws and regulations and to release the developer from any and all claims arising from its use.

## Contact

contact@mashu.lol
