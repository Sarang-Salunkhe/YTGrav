from rest_framework.decorators import api_view
from rest_framework.response import Response

from django.http import FileResponse

import yt_dlp
import os
import urllib.parse

import re

from urllib.parse import quote

def clean_filename(filename):
    filename = urllib.parse.unquote(filename)
    
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    
    filename = filename.encode('ascii', errors='ignore').decode('ascii')
    
    filename = re.sub(r'\s+', ' ', filename).strip()
    
    return filename


DOWNLOAD_DIR = "downloads"


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
        return Response({
            'error': 'No URL provided'
        }, status=400)

    try:
        
        # Cleanup any .txt or .part files first
        cleanup_unwanted_files()

        download_progress['progress'] = 0

        before_files = set(
            os.listdir(DOWNLOAD_DIR)
        )

        # Build format string safely
        if format_id:
            # Use format with fallback to best audio
            format_str = f'({format_id}+bestaudio/best)/(bestvideo+bestaudio)/best'
        else:
            format_str = 'bestvideo+bestaudio/best'

        ydl_opts = {

            'format': format_str,

            'outtmpl':
            f'{DOWNLOAD_DIR}/%(title)s.%(ext)s',

            'merge_output_format':
            'mp4',

            'overwrites': True,

            'progress_hooks':
            [progress_hook],
            
            'quiet': False,
            
            'no_warnings': False,
        }

        with yt_dlp.YoutubeDL(
            ydl_opts
        ) as ydl:

            ydl.download([url])

        after_files = set(
            os.listdir(DOWNLOAD_DIR)
        )

        new_files = list(
            after_files - before_files
        )

        # Filter for actual video files, exclude .txt, .part, and other non-video formats
        video_extensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv']
        
        video_files = [
            file for file in new_files
            if any(file.lower().endswith(ext) for ext in video_extensions)
        ]

        if not video_files:
            # If no new video files found, look for the most recent video file
            all_video_files = [
                file for file in os.listdir(DOWNLOAD_DIR)
                if any(file.lower().endswith(ext) for ext in video_extensions)
                and not file.endswith('.part')
            ]

            all_video_files.sort(
                key=lambda x: os.path.getmtime(
                    os.path.join(
                        DOWNLOAD_DIR,
                        x
                    )
                ),
                reverse=True
            )

            if not all_video_files:
                return Response({
                    'error':
                    'Video download failed - no video files found'
                }, status=500)

            latest_file = os.path.join(
                DOWNLOAD_DIR,
                all_video_files[0]
            )
            
            filename = clean_filename(
                os.path.basename(
                    latest_file
                )
            )

        else:

            latest_file = os.path.join(
                DOWNLOAD_DIR,
                video_files[0]
            )
            
            filename = os.path.basename(
                latest_file
            )

        response = FileResponse(
            open(latest_file, 'rb'),
            as_attachment=False,
            content_type='video/mp4'
        )

        # Properly encode filename in Content-Disposition header
        safe_filename = clean_filename(filename)
        response['Content-Disposition'] = f'attachment; filename="{safe_filename}"'
        response['X-Filename'] = safe_filename.encode('utf-8').decode('ascii', errors='replace')
        response['Content-Type'] = 'video/mp4'

        return response

    except Exception as e:

        return Response({
            'error': str(e)
        }, status=500)


# =========================
# DOWNLOAD MP3 API
# =========================

@api_view(['POST'])
def download_mp3(request):

    url = request.data.get('url')

    if not url:

        return Response({
            'error': 'No URL provided'
        }, status=400)

    try:
        
        # Cleanup any .txt or .part files first
        cleanup_unwanted_files()

        download_progress[
            'progress'
        ] = 0

        ydl_opts = {

            'format':
            'bestaudio/best',

            'outtmpl':
            f'{DOWNLOAD_DIR}/%(title)s.%(ext)s',

            'postprocessors': [
                {
                    'key':
                    'FFmpegExtractAudio',

                    'preferredcodec':
                    'mp3',

                    'preferredquality':
                    '192',

                    'nopostoverwrites':
                    False,
                }
            ],

            'progress_hooks':
            [progress_hook],

            'extractor_args': {
                'youtube': {
                    'player_client':
                    ['android']
                }
            },

            'overwrites': True,

            'quiet': False,

            'no_warnings': False,

        }

        with yt_dlp.YoutubeDL(
            ydl_opts
        ) as ydl:

            ydl.download([url])

        # Filter for MP3 files only, excluding .txt, .part, and other artifacts
        mp3_files = [
            file for file in os.listdir(DOWNLOAD_DIR)
            if file.lower().endswith('.mp3')
            and not file.endswith('.part')
        ]

        mp3_files.sort(
            key=lambda x:
            os.path.getmtime(
                os.path.join(
                    DOWNLOAD_DIR,
                    x
                )
            ),
            reverse=True
        )

        if not mp3_files:
            # Check if FFmpeg is the issue
            return Response({
                'error':
                'MP3 conversion failed. Please ensure FFmpeg is installed and accessible.'
            }, status=500)

        latest_file = os.path.join(

            DOWNLOAD_DIR,

            mp3_files[0]
        )
        
        filename = clean_filename(
            os.path.basename(
                latest_file
            )
        )

        response = FileResponse(
            open(latest_file, 'rb'),
            as_attachment=False,
            content_type='audio/mpeg'
        )

        # Properly encode filename in Content-Disposition header
        safe_filename = clean_filename(filename)
        response['Content-Disposition'] = f'attachment; filename="{safe_filename}"'
        response['X-Filename'] = safe_filename.encode('utf-8').decode('ascii', errors='replace')
        response['Content-Type'] = 'audio/mpeg'

        return response

    except Exception as e:

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