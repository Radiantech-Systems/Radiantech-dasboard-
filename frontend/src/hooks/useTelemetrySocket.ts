import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "../api/client";
import type { TelemetryPayload } from "../types/telemetry";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export type LaneStates = {
  lane_1: "RED" | "GREEN";
  lane_2: "RED" | "GREEN";
  lane_3: "RED" | "GREEN";
  lane_4: "RED" | "GREEN";
};

export type SignalDeliveryStatus =
  | "idle"
  | "pending"
  | "accepted"
  | "error";

interface ServerMessage {
  type?: string;
  device_id?: string;
  data?: TelemetryPayload;
  lane_states?: LaneStates;
  error?: string;
}

function sameLaneStates(a: LaneStates, b: LaneStates): boolean {
  return (
    a.lane_1 === b.lane_1 &&
    a.lane_2 === b.lane_2 &&
    a.lane_3 === b.lane_3 &&
    a.lane_4 === b.lane_4
  );
}

export function useTelemetrySocket() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [byDevice, setByDevice] = useState<
    Record<string, TelemetryPayload>
  >({});
  const [signalDeliveryStatus, setSignalDeliveryStatus] =
    useState<SignalDeliveryStatus>("idle");

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const mountedRef = useRef(true);
  const latestSignalRef = useRef<LaneStates | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const sendTrafficSignalState = useCallback((laneStates: LaneStates) => {
    // Always retain only the newest desired state.
    latestSignalRef.current = { ...laneStates };
    setSignalDeliveryStatus("pending");

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      ws.send(
        JSON.stringify({
          type: "traffic_signal_state",
          lane_states: laneStates,
        })
      );
    } catch {
      // Keep the latest state for the next successful connection.
      setSignalDeliveryStatus("pending");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      setStatus("connecting");

      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        setStatus("disconnected");
        const delay = Math.min(1000 * 2 ** retryRef.current, 10000);
        retryRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setStatus("connected");

      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);

          if (
            msg.type === "telemetry" &&
            typeof msg.device_id === "string" &&
            msg.data
          ) {
            setByDevice((prev) => ({
              ...prev,
              [msg.device_id as string]: msg.data as TelemetryPayload,
            }));
            return;
          }

          if (
            msg.type === "traffic_signal_state" &&
            msg.lane_states
          ) {
            const lanes = msg.lane_states;
            const valid =
              ["lane_1", "lane_2", "lane_3", "lane_4"].every(
                (key) => lanes[key as keyof LaneStates] === "RED" ||
                         lanes[key as keyof LaneStates] === "GREEN"
              ) &&
              Object.values(lanes).filter((state) => state === "GREEN").length <= 1;

            if (valid) {
              latestSignalRef.current = { ...lanes };
              window.dispatchEvent(
                new CustomEvent("shared-traffic-signal-state", {
                  detail: { ...lanes },
                })
              );
            }
            return;
          }

          if (
            msg.type === "traffic_signal_accepted" &&
            msg.lane_states
          ) {
            latestSignalRef.current = { ...msg.lane_states };
            setSignalDeliveryStatus("accepted");
            return;
          }

          if (msg.type === "traffic_signal_error") {
            setSignalDeliveryStatus("error");
          }
        } catch {
          // Ignore malformed or unrelated frames.
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;

        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        setStatus("disconnected");


        const delay = Math.min(1000 * 2 ** retryRef.current, 10000);
        retryRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      mountedRef.current = false;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      const ws = wsRef.current;
      wsRef.current = null;

      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  const devices = Object.keys(byDevice);
  const primary = devices.length > 0 ? byDevice[devices[0]] : undefined;

  return {
    status,
    byDevice,
    devices,
    primary,
    sendTrafficSignalState,
    signalDeliveryStatus,
  };
}
