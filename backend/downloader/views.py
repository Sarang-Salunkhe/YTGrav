from rest_framework.decorators import api_view
from rest_framework.response import Response

from django.http import FileResponse

import yt_dlp
import os
import urllib.parse

import re

from urllib.parse import quote

import shutil
import tempfile

def clean_filename(filename):
    filename = urllib.parse.unquote(filename)

    filename = re.sub(r'[<>:"/\\|?*]', '', filename)

    filename = filename.encode('ascii', errors='ignore').decode('ascii')

    filename = re.sub(r'\s+', ' ', filename).strip()

    return filename


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def create_download_directory():
    """Create an isolated directory for each download request."""
    return tempfile.mkdtemp(
        prefix="ytgrav_",
        dir=DOWNLOAD_DIR
    )


def create_download_response(file_path, content_type, download_dir):
    """Return a file response and remove its temporary directory after streaming."""
    filename = clean_filename(os.path.basename(file_path))

    response = FileResponse(
        open(file_path, "rb"),
        as_attachment=True,
        filename=filename,
        content_type=content_type
    )

    response["X-Filename"] = filename.encode(
        "ascii", errors="replace"
    ).decode("ascii")

    # FileResponse closes the file and then cleans up the request directory.
    response._resource_closers.append(
        lambda: shutil.rmtree(download_dir, ignore_errors=True)
    )

    return response


# =========================
# CLEANUP UNWANTED FILES
# =========================

def cleanup_unwanted_files():
    """Remove .txt files, .part files, and other artifacts from downloads folder"""
    try:
        unwanted_extensions = ['.txt', '.part', '.info.json', '.webp', '.jpg', '.png']
        for file in os.listdir(DOWNLOAD_DIR):
            if any(file.lower().endswith(ext) for ext in unwanted_extensions):
                try:
                    os.remove(os.path.join(DOWNLOAD_DIR, file))
                except Exception as e:
                    print(f"Failed to remove {file}: {str(e)}")
    except Exception as e:
        print(f"Cleanup error: {str(e)}")


# =========================
# GLOBAL DOWNLOAD PROGRESS
# =========================

download_progress = {
    "progress": 0
}


# =========================
# PROGRESS HOOK
# =========================

def progress_hook(d):

    if d['status'] == 'downloading':

        downloaded = d.get(
            'downloaded_bytes',
            0
        )

        total = d.get(
            'total_bytes',
            d.get(
                'total_bytes_estimate',
                1
            )
        )

        if total:

            percent = int(
                downloaded / total * 100
            )

            download_progress[
                'progress'
            ] = percent

    elif d['status'] == 'finished':

        download_progress[
            'progress'
        ] = 100


# =========================
# VIDEO INFO API
# =========================

@api_view(['POST'])
def video_info(request):

    url = request.data.get('url')

    if not url:

        return Response({
            'error': 'No URL provided'
        }, status=400)

    try:

        ydl_opts = {
            'quiet': True,
            'skip_download': True,
        }

        with yt_dlp.YoutubeDL(
            ydl_opts
        ) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )

        return Response({

            'title':
            info.get('title'),

            'thumbnail':
            info.get('thumbnail'),

            'duration':
            info.get('duration'),

            'uploader':
            info.get('uploader'),

            'view_count':
            info.get('view_count'),

        })

    except Exception as e:

        return Response({
            'error': str(e)
        }, status=500)


# =========================
# SEARCH VIDEOS API
# =========================

@api_view(['POST'])
def search_videos(request):

    query = request.data.get('query')

    if not query:

        return Response({
            'error':
            'No search query provided'
        }, status=400)

    try:

        ydl_opts = {

            'quiet': True,

            'skip_download': True,

            'extract_flat': True,

            'extractor_args': {
                'youtube': {
                    'player_client':
                    ['android']
                }
            },

        }

        with yt_dlp.YoutubeDL(
            ydl_opts
        ) as ydl:

            search_query = (
                f"ytsearch10:{query}"
            )

            result = ydl.extract_info(
                search_query,
                download=False
            )

            videos = []

            for entry in result['entries']:

                videos.append({

                    'title':
                    entry.get('title'),

                    'url':
                    f"https://www.youtube.com/watch?v={entry.get('id')}",

                    'thumbnail':
                    entry.get(
                        'thumbnails',
                        [{}]
                    )[-1].get('url'),

                    'duration':
                    entry.get('duration'),

                    'uploader':
                    entry.get('channel'),

                })

        return Response(videos)

    except Exception as e:

        return Response({
            'error': str(e)
        }, status=500)


# =========================
# GET VIDEO FORMATS API
# =========================

@api_view(['POST'])
def get_formats(request):

    url = request.data.get('url')

    if not url:

        return Response({
            'error': 'No URL provided'
        }, status=400)

    try:

        ydl_opts = {

            'quiet': True,

            'skip_download': True,

            'retries': 10,

            'fragment_retries': 10,
        }

        with yt_dlp.YoutubeDL(
            ydl_opts
        ) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )

        allowed_resolutions = [

            360,
            480,
            720,
            1080,
            1440,
            2160
        ]

        best_formats = {}

        for f in info.get(
            'formats',
            []
        ):

            height = f.get('height')

            format_id = f.get(
                'format_id'
            )

            vcodec = f.get(
                'vcodec'
            )

            acodec = f.get(
                'acodec'
            )

            if (

                height in
                allowed_resolutions

                and

                vcodec != 'none'
            ):

                # Prefer mp4 streams

                ext = f.get('ext')

                current = best_formats.get(
                    height
                )

                if not current:

                    best_formats[
                        height
                    ] = {
                        'format_id':
                        format_id,

                        'resolution':
                        f"{height}p",

                        'ext':
                        ext,
                    }

        formats = list(
            best_formats.values()
        )

        formats.sort(

            key=lambda x: int(
                x['resolution']
                .replace('p', '')
            ),

            reverse=True
        )

        return Response(formats)

    except Exception as e:

        return Response({
            'error': str(e)
        }, status=500)


# =========================
# DOWNLOAD VIDEO API
# =========================

@api_view(['POST'])
def download_video(request):
    url = request.data.get('url')
    format_id = request.data.get('format_id')

    if not url:
        return Response({'error': 'No URL provided'}, status=400)

    download_dir = create_download_directory()

    try:
        download_progress['progress'] = 0

        if format_id:
            format_str = (
                f'({format_id}+bestaudio/best)/'
                f'(bestvideo+bestaudio)/best'
            )
        else:
            format_str = 'bestvideo+bestaudio/best'

        ydl_opts = {
            'format': format_str,
            'outtmpl': os.path.join(
                download_dir, '%(title)s.%(ext)s'
            ),
            'merge_output_format': 'mp4',
            'overwrites': True,
            'progress_hooks': [progress_hook],
            'js_runtimes': {
                'deno': {}
            },
            'quiet': False,
            'no_warnings': False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        video_extensions = (
            '.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv'
        )

        video_files = [
            f for f in os.listdir(download_dir)
            if f.lower().endswith(video_extensions)
            and not f.endswith('.part')
        ]

        if not video_files:
            raise FileNotFoundError(
                'Video download completed but no video file was found.'
            )

        latest_file = os.path.join(download_dir, video_files[0])

        return create_download_response(
            latest_file,
            'video/mp4',
            download_dir
        )

    except Exception as e:
        shutil.rmtree(download_dir, ignore_errors=True)
        download_progress['progress'] = 0

        return Response({'error': str(e)}, status=500)   
# =========================
# DOWNLOAD MP3 API
# =========================

@api_view(['POST'])
def download_mp3(request):
    url = request.data.get('url')

    if not url:
        return Response({'error': 'No URL provided'}, status=400)

    download_dir = create_download_directory()

    try:
        download_progress['progress'] = 0

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(
                download_dir, '%(title)s.%(ext)s'
            ),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
                'nopostoverwrites': False,
            }],
            'progress_hooks': [progress_hook],
            'js_runtimes': {
                'deno': {}
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['android']
                }
            },
            'overwrites': True,
            'quiet': False,
            'no_warnings': False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        mp3_files = [
            f for f in os.listdir(download_dir)
            if f.lower().endswith('.mp3')
        ]

        if not mp3_files:
            raise FileNotFoundError(
                'MP3 conversion completed but no MP3 file was found.'
            )

        latest_file = os.path.join(download_dir, mp3_files[0])

        return create_download_response(
            latest_file,
            'audio/mpeg',
            download_dir
        )

    except Exception as e:
        shutil.rmtree(download_dir, ignore_errors=True)
        download_progress['progress'] = 0

        return Response({
            'error': str(e)
        }, status=500)


# =========================
# GET PROGRESS API
# =========================

@api_view(['GET'])
def get_progress(request):

    return Response({

        'progress':

        download_progress[
            'progress'
        ]
    })


# =========================
# CLEANUP API
# =========================

@api_view(['POST', 'GET'])
def cleanup_files(request):
    """Clean up .txt, .part and other unwanted files from downloads folder"""
    try:
        cleanup_unwanted_files()
        return Response({
            'success': 'Cleanup completed'
        })
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)
