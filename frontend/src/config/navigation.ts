export interface NavigationItem {
  path: string;
  label: string;
  section: "Overview" | "Monitoring" | "Operations" | "Management";
  permission?: string;
  userOnly?: boolean;
  itOnly?: boolean;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: "/", label: "Health", section: "Overview", permission: "dashboard" },
  { path: "/operational", label: "Home", section: "Overview", userOnly: true },
  { path: "/operational/profile", label: "Profile", section: "Overview", userOnly: true },
  { path: "/system-information", label: "System Information", section: "Monitoring", permission: "system_information" },
  { path: "/temperature-history", label: "Temperature History", section: "Monitoring", permission: "temperature_history" },
  { path: "/network", label: "Network", section: "Monitoring", permission: "network" },
  { path: "/network-cameras", label: "Cameras", section: "Monitoring", permission: "network_cameras" },
  { path: "/live-cctv", label: "Live CCTV", section: "Operations", permission: "live_cctv" },
  { path: "/ai-snapshots", label: "Events & Violations", section: "Operations", permission: "violations" },
  { path: "/sliced-footage", label: "Sliced Footage", section: "Operations", permission: "sliced_footage" },
  { path: "/traffic-signal-control", label: "Traffic Signal Control", section: "Operations", permission: "traffic_signal_control" },
  { path: "/settings", label: "Settings", section: "Management", permission: "settings" },
  { path: "/user-management", label: "User Management", section: "Management", permission: "user_management", itOnly: true },
];

export function visibleNavigation(
  role: string,
  permissions: readonly string[]
): NavigationItem[] {
  if (role === "User") {
    return NAVIGATION_ITEMS.filter((item) => {
      if (item.userOnly) return true;

      return (
        item.path === "/traffic-signal-control" &&
        permissions.includes("traffic_signal_control")
      );
    });
  }

  return NAVIGATION_ITEMS.filter((item) => {
    if (item.userOnly) return false;
    if (item.itOnly) return role === "IT";

    return role === "IT" || !item.permission || permissions.includes(item.permission);
  });
}
