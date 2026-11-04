# Jetson Telemetry Dashboard

A real-time monitoring and visualization platform for **NVIDIA Jetson AGX Orin** devices.

The system collects telemetry from Jetson devices and provides a centralized web dashboard for monitoring system performance, power, temperature, network status, CCTV streams, recorded footage, and AI-generated snapshots.

## Features

* Real-time Jetson telemetry monitoring
* CPU, GPU, memory, storage and temperature monitoring
* Power and system information
* Network and device status monitoring
* Live CCTV streaming
* Multi-camera support
* Video footage recording and playback
* AI snapshot viewing
* User authentication
* Real-time updates using WebSockets
* PostgreSQL-based data storage
* Docker-based deployment
* MediaMTX integration for video streaming

## Architecture

```text
Jetson AGX Orin
      │
      │ Telemetry / Video
      ▼
┌──────────────────┐
│  FastAPI Backend │
│  REST + WebSocket│
└────────┬─────────┘
         │
         ├──────────► PostgreSQL
         │
         ▼
┌──────────────────┐
│ React Dashboard  │
│   TypeScript     │
└──────────────────┘

Camera ──► MediaMTX ──► HLS / WebRTC ──► Dashboard
```

## Technology Stack

### Backend

* Python
* FastAPI
* WebSockets
* SQLAlchemy
* PostgreSQL

### Frontend

* React
* TypeScript
* Vite
* Axios
* Material UI
* HLS.js

### Video

* MediaMTX
* RTSP
* HLS
* WebRTC
* FFmpeg

### Deployment

* Docker
* Docker Compose
* Linux
* NVIDIA Jetson AGX Orin

## Project Structure

```text
Dashboard/
├── backend/        # FastAPI backend
├── frontend/       # React frontend
├── mediamtx/       # MediaMTX configuration
├── docker-compose.yml
├── .env.example
└── README.md
```

## Getting Started

### Clone the repository

```bash
git clone https://github.com/Radiantech-Systems/Dashboard.git
cd Dashboard
```

### Configure environment

Create a local `.env` file and configure the required database, backend, frontend, authentication, and MediaMTX settings.

> Do not commit `.env` files or other credentials to the repository.

### Run with Docker

```bash
docker compose up -d --build
```

Check the running containers:

```bash
docker compose ps
```

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deployment

The dashboard is designed to run with a centralized backend and frontend while Jetson devices operate as edge nodes sending telemetry to the server.

The Jetson platform can also be integrated with custom **Yocto/OpenEmbedded** images for embedded deployments.

## Security

The project supports authenticated dashboard access.

Keep the following out of Git:

* Passwords
* API keys
* Authentication secrets
* Database credentials
* Camera/RTSP credentials
* Private configuration files

## Maintainer

**Radiantech Systems**

[GitHub Repository](https://github.com/Radiantech-Systems/Dashboard)
