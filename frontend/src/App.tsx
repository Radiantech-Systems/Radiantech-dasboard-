import { EventWorkflowProvider } from "./components/EventWorkflow";
import { DeviceProvider } from "./context/DeviceContext";
import { useEffect, useState, type ReactNode } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import Layout from "./components/Layout";
import { useTelemetrySocket } from "./hooks/useTelemetrySocket";
import { getCurrentUser, logout } from "./api/client";
import type { AuthResponse } from "./api/client";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SystemInformation from "./pages/SystemInformation";
import NetworkCameras from "./pages/NetworkCameras";
import LiveCCTV from "./pages/LiveCCTV";
import Network from "./pages/Network";
import AISnapshots from "./pages/AISnapshots";
import TemperatureHistory from "./pages/TemperatureHistory";
import RecordedFootage from "./pages/RecordedFootage";
import LiveCameraView from "./pages/LiveCameraView";
import Settings from "./pages/Settings";
import TrafficSignalControl from "./pages/TrafficSignalControl";
import UserManagement from "./pages/UserManagement";
import { OperationalHome, OperationalProfile } from "./components/OperationalPages";

const ROUTE_PERMISSIONS: Record<string, string> = {
  "/": "dashboard",
  "/system-information": "system_information",
  "/live-cctv": "live_cctv",
  "/network-cameras": "network_cameras",
  "/network": "network",
  "/ai-snapshots": "violations",
  "/temperature-history": "temperature_history",
  "/sliced-footage": "sliced_footage",
  "/settings": "settings",
  "/traffic-signal-control": "traffic_signal_control",
  "/user-management": "user_management",
};

function ProtectedDashboard() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<AuthResponse | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setIdentity(user))
      .catch(() => setIdentity(null))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        Checking authentication...
      </div>
    );
  }

  if (!identity?.authenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthenticatedApp
      identity={identity}
      onLogout={() => navigate("/login", { replace: true })}
    />
  );
}

function AuthenticatedApp({
  identity,
  onLogout,
}: {
  identity: AuthResponse;
  onLogout: () => void;
}) {
  const socket = useTelemetrySocket();
  const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      try {
        localStorage.setItem("telemetry_dashboard_logout", String(Date.now()));
      } catch {
        // Logout must still work if browser storage is unavailable.
      }
      onLogout();
    }
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let loggingOut = false;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!loggingOut) {
          loggingOut = true;
          void handleLogout();
        }
      }, INACTIVITY_TIMEOUT_MS);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "telemetry_dashboard_logout" && event.newValue) {
        window.location.assign("/login");
      }
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ] as const;

    activityEvents.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );
    window.addEventListener("storage", onStorage);
    resetTimer();

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <DeviceProvider>
      <EventWorkflowProvider identity={identity}>
      <Layout
        status={socket.status}
      userRole={identity.role ?? ""}
      username={identity.username}
      permissions={identity.permissions ?? []}
      onLogout={handleLogout}
    >
      <PermissionGuard identity={identity}>
        <Routes>
          <Route path="/operational" element={<OperationalHome identity={identity} />} />
          <Route path="/operational/profile" element={<OperationalProfile identity={identity} />} />
          <Route path="/" element={<Dashboard socket={socket} />} />
          <Route path="/system-information" element={<SystemInformation socket={socket} />} />
          <Route path="/live-cctv" element={<LiveCCTV />} />
          <Route path="/network-cameras" element={<NetworkCameras socket={socket} />} />
          <Route path="/network" element={<Network socket={socket} />} />
          <Route path="/ai-snapshots" element={<AISnapshots />} />
          <Route path="/temperature-history" element={<TemperatureHistory socket={socket} />} />
          <Route path="/sliced-footage" element={<RecordedFootage />} />
          <Route path="/live/:cameraPath" element={<LiveCameraView />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/traffic-signal-control" element={<TrafficSignalControl socket={socket} />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/no-access" element={<NoAccess />} />
          <Route path="/logout" element={<LogoutHandler onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PermissionGuard>
      </Layout>
      </EventWorkflowProvider>
    </DeviceProvider>
  );
}

function PermissionGuard({
  identity,
  children,
}: {
  identity: AuthResponse;
  children: ReactNode;
}) {
  const location = useLocation();

  if (
    location.pathname === "/operational" ||
    location.pathname === "/operational/profile"
  ) {
    return identity.role === "User"
      ? <>{children}</>
      : <Navigate to="/no-access" replace />;
  }

  if (
    location.pathname === "/" &&
    identity.role === "User" &&
    !(identity.permissions ?? []).includes("dashboard")
  ) {
    return <Navigate to="/operational" replace />;
  }

  const required = ROUTE_PERMISSIONS[location.pathname];

  if (
    required &&
    identity.role !== "IT" &&
    !(identity.permissions ?? []).includes(required)
  ) {
    return <Navigate to="/no-access" replace />;
  }

  return <>{children}</>;
}

function NoAccess() {
  return (
    <section className="drishti-card">
      <h1>Access denied</h1>
      <p>Your account does not have permission to view this page.</p>
    </section>
  );
}

function LogoutHandler({ onLogout }: { onLogout: () => void }) {
  useEffect(() => {
    onLogout();
  }, [onLogout]);

  return null;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedDashboard />} />
    </Routes>
  );
}

function LoginPage() {
  const navigate = useNavigate();

  return (
    <Login onLogin={(destination) => navigate(destination, { replace: true })} />
  );
}
