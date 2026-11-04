import { ReactNode, useState } from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import SpeedIcon from "@mui/icons-material/SpeedOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import MonitorIcon from "@mui/icons-material/Monitor";
import ThermostatIcon from "@mui/icons-material/ThermostatOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import TrafficIcon from "@mui/icons-material/Traffic";
import MenuIcon from "@mui/icons-material/Menu";
import PeopleAltIcon from "@mui/icons-material/PeopleAltOutlined";
import type { ConnectionStatus } from "../hooks/useTelemetrySocket";
import CompanyWatermark from "./CompanyWatermark";
import BrandLockup from "./BrandLockup";
import "../styles/drishti.css";
import { useDevice } from "../context/DeviceContext";


const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const NAV_ITEMS = [
  { label: "Cameras", path: "/network-cameras", icon: <VideocamOutlinedIcon />, permission: "network_cameras" },
  { label: "Live CCTV", path: "/live-cctv", icon: <MonitorIcon />, permission: "live_cctv" },
  { label: "Sliced Footage", path: "/sliced-footage", icon: <MovieOutlinedIcon />, permission: "sliced_footage" },
  { label: "Violations", path: "/ai-snapshots", icon: <CameraAltOutlinedIcon />, permission: "violations" },
  { label: "Traffic Signal Control", path: "/traffic-signal-control", icon: <TrafficIcon />, permission: "traffic_signal_control" },
  { label: "Settings", path: "/settings", icon: <SettingsIcon />, permission: "settings" },
];

export default function Layout({
  children,
  status,
  userRole = "",
  permissions = [],
  onLogout,
}: {
  children: ReactNode;
  status: ConnectionStatus;
  userRole?: string;
  permissions?: string[];
  onLogout: () => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const {
    devices,
    selectedDeviceId,
    selectedDevice,
    setSelectedDeviceId,
    loadingDevices,
  } = useDevice();


  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deviceStatusOpen, setDeviceStatusOpen] = useState(
    ["/", "/system-information", "/temperature-history", "/network"].includes(location.pathname)
  );

  const canSee = (permission: string) =>
    userRole === "Admin" || permissions.includes(permission);

  const visibleNavItems = [
    ...NAV_ITEMS.filter((item) => canSee(item.permission)),
    ...(userRole === "Admin"
      ? [{
          label: "User Management",
          path: "/user-management",
          icon: <PeopleAltIcon />,
          permission: "user_management",
        }]
      : []),
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const navLabelSx = {
    "& .MuiListItemText-root": {
      display: !isMobile && sidebarCollapsed ? "none" : "block",
    },
  };

  const drawerContent = (
    <Box sx={{ height: "100%", width: "100%", overflowX: "hidden" }}>
      <Box
        sx={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: !isMobile && sidebarCollapsed ? "center" : "flex-start",
          px: !isMobile && sidebarCollapsed ? 0 : 1,
        }}
      >
        <IconButton
          aria-label={isMobile ? "Close navigation" : sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isMobile ? "Close navigation" : sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => {
            if (isMobile) setMobileOpen(false);
            else setSidebarCollapsed((value) => !value);
          }}
          sx={{ color: "#24364b" }}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      <List sx={{ px: !isMobile && sidebarCollapsed ? 0.5 : { xs: 1, md: 1.25 }, pb: 2 }}>
        <ListItemButton
          selected={["/", "/system-information", "/temperature-history", "/network"].includes(location.pathname)}
          onClick={() => {
            if (!isMobile && sidebarCollapsed) {
              setSidebarCollapsed(false);
              setDeviceStatusOpen(true);
            } else {
              setDeviceStatusOpen((open) => !open);
            }
          }}
          sx={{
            ...navLabelSx,
            minHeight: 48,
            borderRadius: 2,
            mb: 0.5,
            px: !isMobile && sidebarCollapsed ? 1.5 : 2,
            "&.Mui-selected": {
              backgroundColor: "rgba(57,214,200,0.12)",
              color: "primary.main",
              "& .MuiListItemIcon-root": { color: "primary.main" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: !isMobile && sidebarCollapsed ? 0 : 40, justifyContent: "center" }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Device Status" />
          {(!sidebarCollapsed || isMobile) && (
            <Typography component="span">{deviceStatusOpen ? "â–¾" : "â–¸"}</Typography>
          )}
        </ListItemButton>

        {(deviceStatusOpen || (!isMobile && sidebarCollapsed)) &&
          [
            { label: "Health", path: "/", icon: <SpeedIcon />, permission: "dashboard" },
            { label: "System Information", path: "/system-information", icon: <InfoIcon />, permission: "system_information" },
            { label: "Temperature History", path: "/temperature-history", icon: <ThermostatIcon />, permission: "temperature_history" },
            { label: "Network", path: "/network", icon: <MonitorIcon />, permission: "network" },
          ]
            .filter((item) => canSee(item.permission))
            .map((item) => (
              <ListItemButton
                key={item.path}
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                title={!isMobile && sidebarCollapsed ? item.label : undefined}
                sx={{
                  ...navLabelSx,
                  minHeight: 44,
                  pl: !isMobile && sidebarCollapsed ? 1.5 : 5,
                  pr: 1,
                  justifyContent: !isMobile && sidebarCollapsed ? "center" : "flex-start",
                  borderRadius: 2,
                  mb: 0.5,
                  "&.Mui-selected": {
                    backgroundColor: "rgba(57,214,200,0.12)",
                    color: "primary.main",
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: !isMobile && sidebarCollapsed ? 0 : 36, justifyContent: "center" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ noWrap: true }} />
              </ListItemButton>
            ))}

        {visibleNavItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNavigation(item.path)}
            title={!isMobile && sidebarCollapsed ? item.label : undefined}
            sx={{
              ...navLabelSx,
              minHeight: 48,
              px: !isMobile && sidebarCollapsed ? 1.5 : 2,
              justifyContent: !isMobile && sidebarCollapsed ? "center" : "flex-start",
              borderRadius: 2,
              mb: 0.5,
              "&.Mui-selected": {
                backgroundColor: "rgba(57,214,200,0.12)",
                color: "primary.main",
                "& .MuiListItemIcon-root": { color: "primary.main" },
              },
              "&.Mui-selected:hover": {
                backgroundColor: "rgba(57,214,200,0.18)",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: !isMobile && sidebarCollapsed ? 0 : 40,
                justifyContent: "center",
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ noWrap: true }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      className="app-shell drishti-workspace"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minHeight: "100dvh",
        overflowX: "hidden",
      }}
    >
      {/* FULL-WIDTH LOGO BANNER ABOVE SIDEBAR AND PAGE CONTENT */}
      <AppBar
        className="drishti-dashboard-header"
        position="sticky"
        elevation={0}
        sx={{
          width: "100%",
          flexShrink: 0,
          bgcolor: "#06172D",
          backgroundImage:
            "radial-gradient(ellipse at 65% 50%, rgba(0,125,255,0.16), transparent 55%), linear-gradient(110deg, #06172D 0%, #08264B 60%, #06172D 100%)",
          overflow: "hidden",
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 72, sm: 80, md: 96 },
            height: { xs: 72, sm: 80, md: 96 },
            p: 0,
            position: "relative",
            justifyContent: "flex-end",
          }}
        >
          <Box className="drishti-dashboard-brand"><BrandLockup /></Box>
          <Box className="drishti-dashboard-session">
            <Typography className="drishti-session-role">{userRole}</Typography>
            <Chip className="drishti-connection-status" size="small" label={`Telemetry: ${status}`} />
          </Box>

          {/* SIGN OUT REMAINS AVAILABLE IN THE TOP-RIGHT CORNER */}
          <IconButton
            color="inherit"
            aria-label="Sign Out"
            title="Sign Out"
            onClick={() => void onLogout()}
            sx={{
              flexShrink: 0,
              zIndex: 2,
              mr: { xs: 0.5, sm: 1.5, md: 2 },
              color: "#ffffff",
              bgcolor: "rgba(0,0,0,0.2)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
            }}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* GLOBAL DEVICE SELECTOR */}
      <Box
        className="drishti-device-toolbar"
        sx={{
          px: { xs: 1.5, sm: 2.5, md: 3 },
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          Active Device
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            justifyContent: "flex-end",
            minWidth: 0,
          }}
        >
          <FormControl
            size="small"
            sx={{ minWidth: { xs: "100%", sm: 280 }, maxWidth: 420 }}
          >
            <InputLabel id="global-device-selector-label">Select device</InputLabel>
            <Select
              labelId="global-device-selector-label"
              value={selectedDeviceId}
              label="Select device"
              onChange={(event) => setSelectedDeviceId(event.target.value)}
              displayEmpty
            >
              {devices.length === 0 && (
                <MenuItem value="" disabled>
                  {loadingDevices ? "Loading devices..." : "No devices registered"}
                </MenuItem>
              )}
              {devices.map((device) => (
                <MenuItem key={device.device_id} value={device.device_id}>
                  {device.device_name || device.device_id} ({device.device_id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedDevice && (
            <Chip
              size="small"
              label={selectedDevice.status.toUpperCase()}
              color={selectedDevice.status === "online" ? "success" : "default"}
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* SIDEBAR AND MAIN CONTENT START BELOW THE BANNER */}
      <Box className="drishti-dashboard-body" sx={{ display: "flex", flex: "1 1 auto", minHeight: 0, minWidth: 0 }}>
        {!isMobile && (
          <Drawer
            className="drishti-dashboard-sidebar"
            variant="permanent"
            open
            sx={{
              width: sidebarCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                position: "relative",
                top: "auto",
                height: "auto",
                width: sidebarCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
                boxSizing: "border-box",
                overflowX: "hidden",
                transition: "width 0.2s ease",
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}

        {isMobile && (
          <>
            <Box
              sx={{
                width: 48,
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                pt: 1,
              }}
            >
              <IconButton
                aria-label="Open navigation"
                title="Open navigation"
                onClick={() => setMobileOpen(true)}
                sx={{ color: "#24364b" }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
            <Drawer
              className="drishti-dashboard-sidebar"
              variant="temporary"
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                "& .MuiDrawer-paper": {
                  width: "min(82vw, 300px)",
                  maxWidth: 300,
                  boxSizing: "border-box",
                  overflowX: "hidden",
                },
              }}
            >
              {drawerContent}
            </Drawer>
          </>
        )}

        <Box
          component="main"
          className="main-content"
          sx={{
            flex: "1 1 auto",
            minWidth: 0,
            width: "100%",
            maxWidth: "100%",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            className="page-content"
            sx={{
              flex: "1 1 auto",
              minWidth: 0,
              width: "100%",
              maxWidth: "100%",
              p: { xs: 1.25, sm: 2, md: 3, lg: 4 },
              overflowX: "hidden",
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>

      <CompanyWatermark />
    </Box>
  );
}
