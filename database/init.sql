-- ============================================================
-- Jetson Telemetry Dashboard - Database Schema
-- ============================================================
-- Only historical TEMPERATURE / COOLING data is persisted.
-- All other metrics (CPU/GPU/RAM/Storage/Power/Network/Camera)
-- are live-only and never written to the database.
-- ============================================================

CREATE TABLE IF NOT EXISTS devices (
    device_id       VARCHAR(64) PRIMARY KEY,
    device_name     VARCHAR(128) NOT NULL,
    hostname        VARCHAR(128),
    ip_address      VARCHAR(64),
    status          VARCHAR(16) NOT NULL DEFAULT 'offline',   -- 'online' | 'offline'
    last_seen       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS temperature_history (
    id                  BIGSERIAL PRIMARY KEY,
    device_id           VARCHAR(64) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    cpu_temperature      DOUBLE PRECISION,
    gpu_temperature      DOUBLE PRECISION,
    board_temperature    DOUBLE PRECISION,
    fan_rpm              INTEGER,
    fan_pwm              INTEGER,
    timestamp            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast range queries for the Temperature History page (hour/day/week/custom filters)
CREATE INDEX IF NOT EXISTS idx_temp_history_device_ts
    ON temperature_history (device_id, timestamp DESC);

-- ============================================================
-- Recorded Footage (sliced video clips uploaded from the Jetson)
-- ============================================================
CREATE TABLE IF NOT EXISTS footage_clips (
    id                  BIGSERIAL PRIMARY KEY,
    device_id           VARCHAR(64) NOT NULL,
    filename            VARCHAR(256) NOT NULL,
    started_at          TIMESTAMPTZ NOT NULL,
    duration_seconds    DOUBLE PRECISION,
    size_bytes          BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_footage_device_started
    ON footage_clips (device_id, started_at DESC);

-- ============================================================
-- Subsystem Power Details (power on/off event log)
-- ============================================================
CREATE TABLE IF NOT EXISTS power_events (
    id              BIGSERIAL PRIMARY KEY,
    device_id       VARCHAR(64) NOT NULL,
    event_type      VARCHAR(16) NOT NULL,   -- 'power_on' | 'power_off'
    reason          VARCHAR(256),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_power_events_device_ts
    ON power_events (device_id, timestamp DESC);

-- ============================================================
-- AI Snapshots
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    camera          VARCHAR(128) NOT NULL,
    category        VARCHAR(32) NOT NULL,
    label           VARCHAR(128) NOT NULL,
    confidence      DOUBLE PRECISION,
    filename        VARCHAR(256) NOT NULL,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_snapshots_category_ts
    ON ai_snapshots (category, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_snapshots_camera_ts
    ON ai_snapshots (camera, captured_at DESC);
