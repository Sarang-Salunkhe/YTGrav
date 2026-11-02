# YTGrav

**Pull Media at the Speed of Gravity.**

YTGrav is a browser-based media utility for searching YouTube videos, checking available video qualities, and downloading supported media as MP4 or MP3.

**Live application:** https://ytgrav.onslate.in  
**Source code:** https://github.com/Sarang-Salunkhe/YTGrav

## Features

- **Video search:** search YouTube and browse up to 10 matching results.
- **Quality detection:** inspect available formats, including 360p, 480p, 720p, 1080p, 1440p and 2160p when provided by the source.
- **MP4 downloads:** use the best available quality or choose a listed format.
- **MP3 extraction:** convert audio to MP3 using the configured 192 kbps setting.
- **Download progress:** display progress while media is prepared.
- **Local history:** keep recent download entries in browser local storage.
- **Responsive UI:** dark interface, motion effects and toast notifications.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| UI and networking | Framer Motion, Axios, Lucide React, React Hot Toast |
| Backend | Python 3.13, Django 5.2, Django REST Framework |
| Media tools | yt-dlp, FFmpeg, Deno |
| Hosting | Zoho Catalyst Slate (frontend), Zoho Catalyst AppSail (backend) |

## Architecture

1. The React frontend sends search terms or media URLs to the Django REST API.
2. The backend uses yt-dlp to retrieve search results and inspect available formats.
3. FFmpeg handles media merging and MP3 conversion. Deno is configured as a JavaScript runtime for yt-dlp.
4. The backend returns the processed file to the browser for local saving.

~~~text
Browser
  |
  v
React + Vite frontend (Catalyst Slate)
  | HTTPS API requests
  v
Django REST API (Catalyst AppSail)
  |
  +-- yt-dlp  -- Search and media information
  +-- FFmpeg  -- Merge / MP3 conversion
  +-- Deno    -- JavaScript runtime
  |
  v
File response to browser
~~~

## Repository Structure

~~~text
YTGrav/
|-- backend/
|   |-- core/                 # Django project configuration
|   |-- downloader/           # Search, format and download API
|   |-- .env.example          # Backend environment template
|   |-- Dockerfile            # AppSail custom-runtime container
|   |-- manage.py
|   `-- requirements.txt
|
`-- frontend/
    |-- public/               # Public assets and YTGrav favicon
    |-- src/                  # React application and styles
    |-- index.html
    |-- package.json
    `-- vite.config.js
~~~

## API Reference

All endpoints are prefixed with `/api/`. The frontend currently sends form-encoded POST data.

| Method | Endpoint | Parameters | Purpose |
|---|---|---|---|
| POST | `/api/search/` | `query` | Search YouTube and return matching videos. |
| POST | `/api/info/` | `url` | Retrieve information about a media URL. |
| POST | `/api/formats/` | `url` | Return available video formats and resolutions. |
| POST | `/api/download/video/` | `url`, optional `format_id` | Download video as an MP4 response. |
| POST | `/api/download/mp3/` | `url` | Extract audio and return an MP3 response. |
| GET | `/api/progress/` | — | Retrieve the current download progress value. |
| GET, POST | `/api/cleanup/` | — | Clean up unwanted temporary files. |

Download responses include an `X-Filename` header when available.

## Run Locally

### Prerequisites

- Node.js 22
- Python 3.13
- FFmpeg installed and available on `PATH`
- Deno installed and available on `PATH`
- Git

### 1. Clone the repository

~~~cmd
git clone https://github.com/Sarang-Salunkhe/YTGrav.git
cd YTGrav
~~~

### 2. Set up the backend (Windows Command Prompt)

~~~cmd
cd backend
py -3.13 -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
~~~

Edit `backend\.env` and set a unique local secret and development configuration:

~~~dotenv
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=
FRONTEND_URL=http://localhost:5173
~~~

Keep `.env` private. Do not commit secrets or production environment values.

Then migrate and start Django:

~~~cmd
python manage.py migrate
python manage.py runserver
~~~

The local API will be available at `http://127.0.0.1:8000`.

### 3. Set up the frontend

In a second Command Prompt window, from the repository root:

~~~cmd
cd frontend
npm install
npm run dev
~~~

Vite normally serves the frontend at `http://localhost:5173`.

**Local API connection:** the frontend currently defines `API_URL` in `frontend/src/App.jsx`. Set it to `http://127.0.0.1:8000` when using the local Django server. The checked-in deployment configuration points to the hosted Catalyst backend.

FFmpeg and Deno must be installed and available on `PATH` for the media-processing configuration.

## Deployment

- **Frontend:** Catalyst Slate, connected to the `main` branch. Project root: `frontend`; install command: `npm install`; build command: `npm run build`; build output: `dist`; Node runtime: 22.
- **Backend:** Catalyst AppSail using `backend/Dockerfile`. The container installs Python dependencies, FFmpeg and Deno, then starts Django with Gunicorn.

The frontend backend address is configured in `frontend/src/App.jsx`. When changing environments, point it to the intended AppSail service and configure that environment's `FRONTEND_URL`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_SECRET_KEY`, and any other required variables.

## Launch Verification

The live deployment was manually tested for:

- YouTube search
- Available-quality fetching
- MP3 download
- MP4 download using the default quality
- MP4 download using a selected quality (tested at 1080p)

## Responsible Use

Use YTGrav only for media that you own, have permission to download, or are otherwise legally allowed to save. You are responsible for complying with applicable copyright laws and the terms that apply to the source service. YTGrav is an independent project and is not affiliated with or endorsed by YouTube or Google.

## License

No license has been added to this repository yet. Unless and until a license is provided, no permission to reuse, modify, or redistribute this code should be assumed.

---

**YTGrav — Pull Media at the Speed of Gravity.**
