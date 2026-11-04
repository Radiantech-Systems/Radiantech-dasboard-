#!/usr/bin/env bash
###############################################################
# start-all.sh — one command to bring up the entire system:
#   - PostgreSQL, FastAPI backend, React frontend, MediaMTX (Docker)
#   - The Jetson telemetry agent (started remotely over SSH)
#
# Run this from the project root, on the SERVER:
#   ./start-all.sh
###############################################################
set -e

# ---- EDIT THESE THREE VALUES FOR YOUR SETUP ----
JETSON_USER="root"
JETSON_IP="192.168.1.155"
JETSON_AGENT_DIR="/root/telemetry-agent-app"
# --------------------------------------------------

echo "==> Starting server containers (postgres, backend, frontend, mediamtx)..."
docker compose up -d --build

echo "==> Waiting for backend to become healthy..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    echo "    backend is up."
    break
  fi
  sleep 1
done

echo "==> Checking local webcam RTSP server (used for CCTV live view)..."
if sudo fuser /dev/video0 >/dev/null 2>&1; then
  echo "    webcam RTSP source is already running."
else
  echo "    WARNING: nothing appears to be using /dev/video0."
  echo "    Start your local RTSP server app before viewing the camera feed."
fi

echo "==> Ensuring the Jetson telemetry agent (systemd service) is running..."
ssh "${JETSON_USER}@${JETSON_IP}" "systemctl is-active --quiet telemetry-agent || systemctl start telemetry-agent"
ssh "${JETSON_USER}@${JETSON_IP}" "systemctl is-active telemetry-agent"

echo
echo "==> All done."
echo "    Dashboard:        http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<server-ip>'):8080"
echo "    Jetson agent log: ssh ${JETSON_USER}@${JETSON_IP} 'journalctl -u telemetry-agent -f'"
