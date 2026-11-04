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

import VideoPlayer from "../components/VideoPlayer";
import MjpegPlayer from "../components/MjpegPlayer";

import { CCTV_STREAMS } from "../config/cctvStreams";
import type { CctvStream } from "../config/cctvStreams";

import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

function liveViewUrl(path: string): string {
  return `${window.location.origin}/live/${path}`;
}


export default function LiveCCTV() {
  const [activeStream, setActiveStream] = useState<CctvStream | null>(null);

  function liveViewUrl(path: string): string {
    return `${window.location.origin}/live/${path}`;
  }

  async function copyLink(path: string) {
    const url = liveViewUrl(path);
    await navigator.clipboard.writeText(url);
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: "100%", minWidth: 0 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Live CCTV
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View configured live CCTV streams or open a stream in a separate tab.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, width: "100%", minWidth: 0 }}>


          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              overflowWrap: "anywhere",
            }}
          >
            Each camera has a direct, shareable
            link that opens straight to the live
            stream.
          </Typography>

          <TableContainer sx={{ width: "100%", maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    Camera
                  </TableCell>

                  <TableCell>
                    Source
                  </TableCell>

                  <TableCell>
                    Direct Link
                  </TableCell>

                  <TableCell align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {CCTV_STREAMS.map((cam) => (
                  <TableRow
                    key={cam.path}
                    hover
                  >
                    <TableCell>
                      {cam.label}
                    </TableCell>

                    <TableCell>
                      <code>
                        {cam.source}
                      </code>
                    </TableCell>

                    <TableCell>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            maxWidth: {
                              xs: "min(45vw, 180px)",
                              sm: 220,
                            },
                            overflow: "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {liveViewUrl(
                            cam.path
                          )}
                        </Typography>

                        <Tooltip title="Copy link">
                          <IconButton
                            size="small"
                            onClick={() =>
                              copyLink(
                                cam.path
                              )
                            }
                          >
                            <LinkIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Open in new tab">
                          <IconButton
                            size="small"
                            component="a"
                            href={`/live/${cam.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          <VideocamIcon />
                        }
                        onClick={() =>
                          setActiveStream(cam)
                        }
                      >
                        View Live
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {CCTV_STREAMS.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        No CCTV streams configured.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* =====================================================
          VIDEO DIALOG
          ===================================================== */}
      <Dialog
        open={!!activeStream}
        onClose={() =>
          setActiveStream(null)
        }
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            overflowWrap: "anywhere",
          }}
        >
          {activeStream?.label}
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              pt: 1,
              width: "100%",
              minWidth: 0,
            }}
          >
            {activeStream?.source ===
              "mjpeg" &&
              activeStream.streamUrl && (
                <MjpegPlayer
                  streamUrl={
                    activeStream.streamUrl
                  }
                />
              )}

            {activeStream?.source ===
              "mediamtx" && (
              <VideoPlayer
                cameraPath={activeStream.path}
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
