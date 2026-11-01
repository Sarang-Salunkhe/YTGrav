FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno
ENV DENO_INSTALL=/usr/local
ENV PATH="/usr/local/bin:${PATH}"
ENV DENO_NO_UPDATE_CHECK=1
ENV DENO_NO_PROMPT=1

RUN curl -fsSL https://deno.land/install.sh | sh

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Collect static files for WhiteNoise
RUN DJANGO_SECRET_KEY=build-only-placeholder-not-for-production python manage.py collectstatic --noinput

# Create writable directories for the application
RUN mkdir -p /app/downloads && chmod -R 777 /app/downloads

# Catalyst AppSail port configuration
EXPOSE 9000

CMD ["sh", "-c", "exec gunicorn core.wsgi:application --bind 0.0.0.0:${X_ZOHO_CATALYST_LISTEN_PORT:-${PORT:-9000}}"]
