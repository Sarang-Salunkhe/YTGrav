from django.urls import path

from .views import (
    video_info,
    search_videos,
    download_video,
    download_mp3,
    get_progress,
    get_formats,
    cleanup_files
)

urlpatterns = [

    path('info/', video_info),

    path('search/', search_videos),

    path(
        'download/video/',
        download_video
    ),

    path(
        'download/mp3/',
        download_mp3
    ),

    path(
        'progress/',
        get_progress
    ),
    
    path('formats/', get_formats),
    
    path('cleanup/', cleanup_files),
]