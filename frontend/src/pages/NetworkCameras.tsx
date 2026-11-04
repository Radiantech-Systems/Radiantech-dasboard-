import { useDevice } from "../context/DeviceContext";
import { useState } from "react";

import {
  Grid,
  Paper,
  Typography,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Snackbar,
  IconButton,
  Tooltip,
} from "@mui/material";

import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNewOutlined";
import LinkIcon from "@mui/icons-material/LinkOutlined";



import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

function liveViewUrl(path: string): string {
  return `${window.location.origin}/live/${path}`;
}

export default function NetworkCameras({
  socket,
}: {
  socket: ReturnType<typeof useTelemetrySocket>;
}) {
  const { selectedDeviceId } = useDevice();
  const network = socket.byDevice[selectedDeviceId]?.network;
  const cameras = socket.byDevice[selectedDeviceId]?.cameras ?? [];

  const [copied, setCopied] =
    useState(false);

  function copyLink(path: string) {
    navigator.clipboard?.writeText(
      liveViewUrl(path)
    );

    setCopied(true);
  }

  return (
    <Grid
      container
      spacing={{
        xs: 1.5,
        sm: 2,
        md: 3,
      }}
      sx={{
        width: "100%",
        minWidth: 0,
        margin: 0,
      }}
    >
      {/* =====================================================
          ONBOARD CAMERAS
          ===================================================== */}
      <Grid item xs={12}>
        <Paper
          sx={{
            p: {
              xs: 1.5,
              sm: 2,
              md: 3,
            },
            width: "100%",
            minWidth: 0,
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
          >
            Onboard Cameras
          </Typography>

          <TableContainer sx={{ width: "100%", maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Resolution</TableCell>
                  <TableCell>FPS</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {cameras.map((cam) => (
                  <TableRow
                    key={cam.name}
                    hover
                  >
                    <TableCell>
                      {cam.name}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={cam.status}
                        color={
                          cam.status === "connected"
                            ? "success"
                            : "default"
                        }
                      />
                    </TableCell>

                    <TableCell>
                      {cam.resolution ?? "--"}
                    </TableCell>

                    <TableCell>
                      {cam.fps ?? "--"}
                    </TableCell>
                  </TableRow>
                ))}

                {cameras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        No cameras detected.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() =>
          setCopied(false)
        }
        message="Link copied to clipboard"
      />
    </Grid>
  );
}

