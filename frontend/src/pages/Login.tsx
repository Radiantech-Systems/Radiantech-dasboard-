import { FormEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { login } from "../api/client";
import BrandLockup from "../components/BrandLockup";
import "../styles/drishti.css";
import "./Login.css";

type AccountRole = "User" | "IT";

interface LoginProps {
  onLogin: (destination: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [role, setRole] = useState<AccountRole>("IT");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const identity = await login(username, password, role);
      onLogin(identity.role === "User" ? "/operational" : "/");
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError("Invalid username or password.");
      } else {
        setError("Unable to connect to the dashboard server.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="login-page drishti-login">
      <section className="drishti-login-brand" aria-label="Drishti introduction">
        <BrandLockup />
        <div className="drishti-login-brand-copy">
          <p className="drishti-login-eyebrow">City edge intelligence platform</p>
          <div className="drishti-agency"><span className="drishti-agency-logo" aria-hidden="true">HCP</span><strong>Hyderabad City Police</strong></div>
          <div className="drishti-agency-subtitle">Government of Telangana</div>
        </div>
        <div className="drishti-security-note"><span aria-hidden="true">&#9672;</span><p><strong>Authorized access only.</strong> Access is governed by your account and assigned permissions.</p></div>
      </section>
      <main className="login-main">
        <Paper elevation={0} className="login-card">
          <Box className="login-heading">
            <Typography component="p" className="login-welcome">
              Secure sign in
            </Typography>

            <Typography component="h1" className="login-brand">
              Access your workspace
            </Typography>

            <Typography className="login-subtitle">
              Choose the account type that matches your responsibilities.
            </Typography>
          </Box>

          <Box className="role-section">
            <Typography className="role-label">
              Select your account type
            </Typography>

            <Box
              className="role-switch"
              role="group"
              aria-label="Select account type"
            >
              {(["IT", "User"] as AccountRole[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  disableRipple
                  className={`role-option ${
                    role === item ? "selected" : ""
                  }`}
                  aria-pressed={role === item}
                  onClick={() => setRole(item)}
                >
                  {item === "IT" ? "IT operations" : item === "User" ? "Operational user" : item}
                </Button>
              ))}
            </Box>

          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
            className="login-form"
          >
            {error && <Alert severity="error">{error}</Alert>}

            <Box className="login-field-group">
              <Typography component="label" htmlFor="login-username">
                User ID
              </Typography>

              <TextField
                id="login-username"
                placeholder="Enter your user ID"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                fullWidth
                required
                autoComplete="username"
                size="small"
                className="login-field"
              />
            </Box>

            <Box className="login-field-group">
              <Typography component="label" htmlFor="login-password">
                Password
              </Typography>

              <TextField
                id="login-password"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                fullWidth
                required
                autoComplete="current-password"
                size="small"
                className="login-field"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        edge="end"
                        size="small"
                      >
                        {showPassword ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
              className="login-submit"
            >
              {loading ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                <>
                  Sign in securely <span className="submit-arrow">→</span>
                </>
              )}
            </Button>
          </Box>

          <p className="drishti-login-support">Need access or support? Contact your designated system administrator.</p>

          <Box component="footer" className="login-copyright">
            © {new Date().getFullYear()} Radiantech-Systems Pvt LTD.
            {" "}All rights reserved.
          </Box>
        </Paper>
      </main>
    </Box>
  );
}
