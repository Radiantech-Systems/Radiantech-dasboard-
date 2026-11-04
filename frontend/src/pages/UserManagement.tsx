import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import {
  createUser,
  getUsers,
  getPermissionCatalog,
  updateUser,
} from "../api/client";

import type {
  DashboardUser,
  PermissionCatalog,
} from "../api/client";

const PERMISSION_LABELS: Record<string, string> = {
  dashboard: "Health Dashboard",
  system_information: "System Information",
  live_cctv: "Live CCTV",
  network_cameras: "Network Cameras",
  network: "Network",
  ai_snapshots: "AI Snapshots",
  violations: "Violations",
  temperature_history: "Temperature History",
  sliced_footage: "Sliced Footage",
  traffic_signal_control: "Traffic Signal Control",
  settings: "Settings",
  user_management: "User Management",
};

export default function UserManagement() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  async function reload() {
    setLoading(true);
    setError("");

    try {
      const [userList, permissionData] = await Promise.all([
        getUsers(),
        getPermissionCatalog(),
      ]);
      setUsers(userList);
      setCatalog(permissionData);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function openCreate() {
    setEditing(null);
    setUsername("");
    setPassword("");
    setRole("User");
    setPermissions(catalog?.role_defaults?.User ?? []);
    setActive(true);
    setError("");
    setMessage("");
    setDialogOpen(true);
  }

  function openEdit(user: DashboardUser) {
    setEditing(user);
    setUsername(user.username);
    setPassword("");
    setRole(user.role);
    setPermissions(user.permissions ?? []);
    setActive(user.is_active);
    setError("");
    setMessage("");
    setDialogOpen(true);
  }

  function changeRole(nextRole: string) {
    setRole(nextRole);
    setPermissions(catalog?.role_defaults?.[nextRole] ?? []);
  }

  function togglePermission(permission: string, checked: boolean) {
    setPermissions((current) =>
      checked
        ? [...new Set([...current, permission])]
        : current.filter((item) => item !== permission)
    );
  }

  async function submit() {
    setError("");
    setMessage("");

    if (!editing && password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password && password.length < 8) {
      setError("A new password must contain at least 8 characters.");
      return;
    }

    if (role === "Admin" && catalog) {
      const allPermissions = catalog.permissions;
      if (allPermissions.some((item) => !permissions.includes(item))) {
        setError("Admin accounts must retain all permissions.");
        return;
      }
    }

    setSaving(true);

    try {
      if (editing) {
        await updateUser(editing.id, {
          role,
          permissions,
          is_active: active,
          ...(password ? { password } : {}),
        });
        setMessage("User updated successfully.");
      } else {
        await createUser({
          username: username.trim(),
          password,
          role,
          permissions,
        });
        setMessage("User created successfully.");
      }

      setDialogOpen(false);
      await reload();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            User Management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Create accounts and manage page-level access permissions.
          </Typography>
        </Box>

        <Button variant="contained" onClick={openCreate} disabled={!catalog}>
          Create User
        </Button>
      </Stack>

      {error && !dialogOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 2, overflowX: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Page Permissions</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.username}</TableCell>
                  <TableCell><Chip size="small" label={user.role} /></TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={user.is_active ? "success" : "default"}
                      label={user.is_active ? "Active" : "Inactive"}
                    />
                  </TableCell>
                  <TableCell>
                    {(user.permissions ?? []).length
                      ? (user.permissions ?? [])
                          .map((permission) => PERMISSION_LABELS[permission] ?? permission)
                          .join(", ")
                      : "No pages assigned"}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openEdit(user)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No database users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editing ? `Edit ${editing.username}` : "Create User"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={Boolean(editing)}
              required
              fullWidth
              autoComplete="off"
            />

            <TextField
              label={editing ? "New password (optional)" : "Password"}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={!editing}
              helperText="Use at least 8 characters."
              fullWidth
              autoComplete="new-password"
            />

            <FormControl fullWidth>
              <InputLabel id="user-role-label">Role</InputLabel>
              <Select
                labelId="user-role-label"
                label="Role"
                value={role}
                onChange={(event) => changeRole(event.target.value)}
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="IT">IT</MenuItem>
                <MenuItem value="User">User</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="h6">Page Permissions</Typography>
            <Typography variant="body2" color="text.secondary">
              Select the pages this account can access. Changing the role loads
              that role&apos;s default permissions, which you can customize.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 0.5,
              }}
            >
              {(catalog?.permissions ?? []).map((permission) => (
                <FormControlLabel
                  key={permission}
                  control={
                    <Checkbox
                      checked={permissions.includes(permission)}
                      disabled={role === "Admin"}
                      onChange={(event) =>
                        togglePermission(permission, event.target.checked)
                      }
                    />
                  }
                  label={PERMISSION_LABELS[permission] ?? permission}
                />
              ))}
            </Box>

            {editing && (
              <FormControlLabel
                control={
                  <Switch
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                    disabled={editing.username === ""}
                  />
                }
                label="Account active"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={saving || !username.trim() || (!editing && !password)}
          >
            {saving ? "Saving..." : editing ? "Save Changes" : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
