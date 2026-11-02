# YTGrav

### Pull Media at the Speed of Gravity.

**YTGrav** is a browser-based media utility that lets users search YouTube videos, inspect available media qualities, and download supported media in MP4 or MP3 format through a clean, responsive interface.

<p align="center">
  <a href="https://ytgrav.onslate.in">
    <strong>🌐 Visit YTGrav — Live Website</strong>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Sarang-Salunkhe/YTGrav">GitHub Repository</a>
  ·
  <a href="https://ytgrav.onslate.in">Live Application</a>
</p>

---

## ✨ Features

- **YouTube Search:** Search for videos and browse matching results.
- **Quality Detection:** Fetch available media formats and resolutions, depending on the source.
- **MP4 Downloads:** Download videos using the default available quality or select a specific quality.
- **MP3 Downloads:** Extract audio and download it in MP3 format.
- **Download Progress:** Track download preparation through the interface.
- **Download History:** Keep recent download entries using browser local storage.
- **Modern Interface:** Dark-themed UI with animations, responsive layouts, and toast notifications.

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React 19, Vite 8 |
| Styling | Tailwind CSS 4 |
| UI & Animation | Framer Motion, Lucide React |
| HTTP Requests | Axios |
| Backend | Python 3.13, Django 5.2 |
| API | Django REST Framework |
| Media Extraction | yt-dlp |
| Media Processing | FFmpeg |
| JavaScript Runtime | Deno |
| Frontend Hosting | Zoho Catalyst Slate |
| Backend Hosting | Zoho Catalyst AppSail |

## 🏗️ Architecture

YTGrav follows a frontend-backend architecture.

1. The React frontend accepts search queries and media URLs.
2. The Django REST API processes incoming requests.
3. yt-dlp handles media search, information retrieval, and format extraction.
4. FFmpeg handles media merging and audio conversion.
5. The processed media is returned to the browser for downloading.

```text
                  USER
                    |
                    v
          React + Vite Frontend
             (Catalyst Slate)
                    |
                 HTTPS
                    |
                    v
             Django REST API
             (Catalyst AppSail)
                    |
          +---------+---------+
          |         |         |
          v         v         v
        yt-dlp    FFmpeg     Deno
          |         |         |
          +---------+---------+
                    |
                    v
             Media Response
                    |
                    v
             User's Browser
```

## 📂 Repository Structure

```text
YTGrav/
│
├── backend/
│   ├── core/                  # Django project configuration
│   ├── downloader/            # Media API and processing logic
│   ├── .env.example           # Environment variable template
│   ├── Dockerfile             # AppSail deployment configuration
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/
    ├── public/                # Public assets and branding
    ├── src/                   # React application and styles
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## 🔌 API Reference

All API endpoints are exposed through the Django backend under `/api/`.

| Method | Endpoint | Parameters | Description |
|---|---|---|---|
| POST | `/api/search/` | `query` | Search for videos |
| POST | `/api/info/` | `url` | Fetch media information |
| POST | `/api/formats/` | `url` | Retrieve available formats |
| POST | `/api/download/video/` | `url`, optional `format_id` | Download video as MP4 |
| POST | `/api/download/mp3/` | `url` | Extract and download audio |
| GET | `/api/progress/` | — | Retrieve download progress |
| GET / POST | `/api/cleanup/` | — | Clean temporary files |

Download responses can include an `X-Filename` response header.

## 💻 Run Locally

### Prerequisites

Install the following before starting:

- Git
- Node.js 22
- Python 3.13
- FFmpeg
- Deno

FFmpeg and Deno must be accessible through your system's `PATH`.

### 1. Clone the repository

```cmd
git clone https://github.com/Sarang-Salunkhe/YTGrav.git
cd YTGrav
```

### 2. Configure the backend

Open Command Prompt:

```cmd
cd backend
py -3.13 -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
```

Configure your local `backend\.env` file:

```dotenv
DJANGO_SECRET_KEY=your-local-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=
FRONTEND_URL=http://localhost:5173
```

Use a unique secret key and never commit your `.env` file.

Run database migrations and start the backend:

```cmd
python manage.py migrate
python manage.py runserver
```

The local backend will be available at:

`http://127.0.0.1:8000`

### 3. Configure the frontend

Open a second Command Prompt window:

```cmd
cd YTGrav\frontend
npm install
npm run dev
```

The frontend will normally be available at:

`http://localhost:5173`

**Important:** The frontend API URL is currently configured in `frontend/src/App.jsx` for the hosted backend. For local development, point `API_URL` to `http://127.0.0.1:8000`.

## 🚀 Deployment

YTGrav uses Zoho Catalyst for hosting.

### Frontend — Catalyst Slate

| Configuration | Value |
|---|---|
| Framework | React + Vite |
| Runtime | Node 22 |
| Repository | `Sarang-Salunkhe/YTGrav` |
| Branch | `main` |
| Root Path | `./frontend` |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Build Output | `dist` |

### Backend — Catalyst AppSail

The Django backend is containerized using `backend/Dockerfile`.

The deployment includes:

- Python dependencies
- FFmpeg
- Deno
- Gunicorn
- Django REST API

Backend environment variables must be configured securely through Catalyst.

## ✅ Launch Verification

The live application has been manually tested successfully for:

- [x] YouTube search
- [x] Available-quality fetching
- [x] MP3 download
- [x] MP4 download using default quality
- [x] MP4 download using a selected quality
- [x] MP4 download at 1080p

**Launch status: Successfully deployed and tested.**

## ⚖️ Responsible Use

YTGrav is intended for media that users own, have permission to download, or are otherwise legally permitted to save.

Users are responsible for respecting applicable copyright laws, intellectual property rights, and the terms of the source platforms.

YTGrav is an independent project and is not affiliated with, endorsed by, or officially associated with YouTube or Google.

## 📜 License

No open-source license has currently been added to this repository.

Until a license is added, all rights remain with the copyright holder. Do not assume permission to redistribute, modify, or reuse the source code.

---

<p align="center">
  <strong>YTGrav</strong><br/>
  Pull Media at the Speed of Gravity.
  <br/><br/>
  Built with curiosity, code, and persistence. 🚀
</p>