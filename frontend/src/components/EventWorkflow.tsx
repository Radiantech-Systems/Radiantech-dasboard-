import { createPortal } from "react-dom";
import {
  createContext, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { Dialog } from "@mui/material";
import { API_URL, type AuthResponse } from "../api/client";
import { useDevice } from "../context/DeviceContext";
import "../styles/event-workflow.css";

type EventInfo = {
  category: string;
  filename: string;
  timestamp: string;
  camera?: string;
  location?: string;
  violation?: string;
  image?: string;
  mime_type?: string;
};

type WorkflowRow = EventInfo & {
  id: string;
  device_id: string;
  status: string;
  requested_by: string;
  reviewed_by?: string;
  updated_at: string;
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10000,
});

const keyOf = (device: string, row: EventInfo) =>
  JSON.stringify([device, row.category, row.filename, row.timestamp]);

function message(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    return typeof detail === "string"
      ? detail
      : "Unable to save or refresh. Please try again.";
  }
  return "Unable to save or refresh. Please try again.";
}

type WorkflowContext = {
  device: string;
  states: Record<string, WorkflowRow>;
  ready: boolean;
  busy: boolean;
  act: (row: EventInfo, action: "process" | "exemption") => Promise<void>;
};

const Context = createContext<WorkflowContext | null>(null);

export function EventActions({ row }: { row: EventInfo }) {
  const context = useContext(Context);
  if (!context) return <span>Actions unavailable</span>;

  const state = context.states[keyOf(context.device, row)];
  const labels: Record<string, string> = {
    processed: "Processed",
    exemption_pending: "Pending Commissioner review",
    exemption_approved: "Exemption approved",
    exemption_rejected: "Exemption rejected",
  };

  if (state) {
    return (
      <span className={`workflow-status ${state.status}`} role="status">
        {labels[state.status] || state.status}
      </span>
    );
  }

  const disabled =
    context.busy || !context.ready || !context.device;

  return (
    <div className="action-buttons">
      <button
        type="button"
        className="action-button process-action"
        disabled={disabled}
        onClick={() => void context.act(row, "process")}
      >
        Process Action
      </button>
      <button
        type="button"
        className="action-button exemption-action"
        disabled={disabled}
        onClick={() => void context.act(row, "exemption")}
      >
        Request Exemption
      </button>
    </div>
  );
}

export function EventWorkflowProvider({
  identity, children,
}: {
  identity: AuthResponse;
  children: ReactNode;
}) {
  const { selectedDeviceId: device } = useDevice();
  const isCommissioner = identity.police_role === "COMMISSIONER";
  const canUseEvents =
    identity.role === "IT" ||
    (identity.permissions ?? []).includes("violations");

  const [states, setStates] =
    useState<Record<string, WorkflowRow>>({});
  const [loadedDevice, setLoadedDevice] = useState("");
  const [notifications, setNotifications] = useState<WorkflowRow[]>([]);
  const [open, setOpen] = useState(false);
  const [notificationHost, setNotificationHost] =
    useState<HTMLElement | null>(null);
  const [evidence, setEvidence] = useState<{
    row: WorkflowRow;
    image?: string;
    error?: string;
  } | null>(null);
  const evidenceVersion = useRef(0);

  useEffect(() => {
    setNotificationHost(
      document.getElementById("commissioner-notification-slot")
    );
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deviceRef = useRef(device);
  const locked = useRef(false);
  const notificationVersion = useRef(0);
  deviceRef.current = device;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();

    setStates({});
    setLoadedDevice("");

    async function refresh() {
      const version = ++notificationVersion.current;
      try {
        const [stateResponse, notificationResponse] = await Promise.all([
          device && canUseEvents
            ? api.get<WorkflowRow[]>("/event-workflow/states", {
                params: { device_id: device },
                signal: controller.signal,
              })
            : Promise.resolve(null),
          isCommissioner
            ? api.get<WorkflowRow[]>("/event-workflow/notifications", {
                signal: controller.signal,
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;
        if (stateResponse) {
          setStates(Object.fromEntries(
            stateResponse.data.map(row => [
              keyOf(row.device_id, row), row,
            ])
          ));
          setLoadedDevice(device);
        }
        if (
          notificationResponse &&
          version === notificationVersion.current
        ) {
          setNotifications(notificationResponse.data);
        }
      } catch (reason) {
        if (!cancelled && !axios.isCancel(reason)) {
          setError(message(reason));
        }
      } finally {
        if (!cancelled) timer = setTimeout(refresh, 5000);
      }
    }

    void refresh();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [device, canUseEvents, isCommissioner]);

  async function act(
    row: EventInfo,
    action: "process" | "exemption",
  ) {
    if (locked.current || !device) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const targetDevice = device;
    const payload = {
      device_id: targetDevice,
      category: row.category,
      filename: row.filename,
      timestamp: row.timestamp,
      camera: row.camera || "",
      location: row.location || "",
      violation: row.violation || "",
      image: action === "exemption" ? row.image || "" : "",
      mime_type: row.mime_type || "",
      action,
    };

    try {
      const response = await api.post<WorkflowRow>(
        "/event-workflow/actions", payload,
      );
      if (deviceRef.current === targetDevice) {
        const saved = response.data;
        setStates(current => ({
          ...current,
          [keyOf(saved.device_id, saved)]: saved,
        }));
      }
    } catch (reason) {
      setError(message(reason));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  function closeEvidence() {
    ++evidenceVersion.current;
    setEvidence(null);
  }

  async function openEvidence(row: WorkflowRow) {
    const version = ++evidenceVersion.current;
    setEvidence({ row });
    try {
      const response = await api.get<{
        image: string;
        mime_type: string;
      }>(`/event-workflow/notifications/${row.id}/snapshot`);

      if (version !== evidenceVersion.current) return;
      setEvidence({
        row,
        image: `data:${response.data.mime_type};base64,${response.data.image}`,
      });
    } catch (reason) {
      if (version === evidenceVersion.current) {
        setEvidence({ row, error: message(reason) });
      }
    }
  }

  async function review(id: string, decision: "approve" | "reject") {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");

    try {
      const response = await api.post<WorkflowRow>(
        `/event-workflow/notifications/${id}/review`,
        { decision },
      );
      ++notificationVersion.current;
      closeEvidence();
      setNotifications(current => current.filter(row => row.id !== id));
      const saved = response.data;
      if (saved.device_id === deviceRef.current) {
        setStates(current => ({
          ...current,
          [keyOf(saved.device_id, saved)]: saved,
        }));
      }
    } catch (reason) {
      setError(message(reason));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <Context.Provider value={{
      device, states, ready: !!device && loadedDevice === device,
      busy, act,
    }}>
      {children}


      <Dialog
        open={!!evidence}
        onClose={closeEvidence}
        maxWidth="md"
        fullWidth
        aria-labelledby="exemption-evidence-title"
      >
        {evidence && (
          <div className="exemption-notifications-panel">
            <div className="exemption-notifications-heading">
              <h2 id="exemption-evidence-title">
                Review exemption evidence
              </h2>
              <button type="button" onClick={closeEvidence}>
                Close
              </button>
            </div>

            <p><strong>
              {evidence.row.violation || evidence.row.category}
            </strong></p>
            <p>Requested by: {evidence.row.requested_by}</p>
            <p>Device: {evidence.row.device_id}</p>
            <p>Camera: {evidence.row.camera || "Unavailable"}</p>
            <p>Location: {evidence.row.location || "Unavailable"}</p>
            <p>Filename: {evidence.row.filename}</p>
            <p>Event time: {
              new Date(evidence.row.timestamp).toLocaleString(
                "en-IN", { timeZone: "Asia/Kolkata" }
              )
            }</p>

            {evidence.error ? (
              <p role="alert">{evidence.error}</p>
            ) : evidence.image ? (
              <img
                className="commissioner-evidence-image"
                src={evidence.image}
                alt={`${evidence.row.violation || evidence.row.category} event snapshot`}
              />
            ) : (
              <p role="status">Loading snapshot...</p>
            )}

            <div className="exemption-review-buttons">
              <button
                type="button"
                disabled={busy || !evidence.image}
                onClick={() => void review(evidence.row.id, "approve")}
              >
                Approve exemption
              </button>
              <button
                type="button"
                disabled={busy || !evidence.image}
                onClick={() => void review(evidence.row.id, "reject")}
              >
                Process challan
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {error && (
        <div className="workflow-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {isCommissioner && (
        <>
          {notificationHost && createPortal(
<button
            type="button"
            className="commissioner-notifications"
            aria-label={`${notifications.length} pending exemption requests`}
            onClick={() => setOpen(true)}
          >
            Notifications ({notifications.length})
          </button>, notificationHost)}

          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            maxWidth="sm"
            fullWidth
            aria-labelledby="exemption-notifications-title"
          >
            <div className="exemption-notifications-panel">
              <div className="exemption-notifications-heading">
                <h2 id="exemption-notifications-title">
                  Exemption requests
                </h2>
                <button type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
              {!notifications.length && <p>No pending requests.</p>}

              {notifications.map(row => (
                <article className="exemption-notification" key={row.id}>
                  <strong>{row.violation || row.category}</strong>
                  <p>Requested by: {row.requested_by}</p>
                  <p>Device: {row.device_id}</p>
                  <p>Camera: {row.camera || "Unavailable"}</p>
                  <p>Location: {row.location || "Unavailable"}</p>
                  <p>Snapshot: {row.filename}</p>
                  <p>
                    Event time: {new Date(row.timestamp).toLocaleString(
                      "en-IN", { timeZone: "Asia/Kolkata" },
                    )}
                  </p>
                  <div className="exemption-review-buttons">
                    <button
                      type="button"
                      onClick={() => void openEvidence(row)}
                    >
                      Open snapshot and review
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void review(row.id, "approve")}
                    >
                      Approve exemption
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void review(row.id, "reject")}
                    >
                      Process challan
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </Dialog>
        </>
      )}
    </Context.Provider>
  );
}
