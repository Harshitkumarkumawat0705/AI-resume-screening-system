# Use an official lightweight Python base image
FROM python:3.10-slim

# Set working directory inside the container
WORKDIR /app

# Install system-level dependencies required for building Python package dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependency manifest
COPY requirements.txt .

# Install dependencies without local pip caching
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose FastAPI server port
EXPOSE 8000

# Start application via Uvicorn runner
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
