import { useDevice } from "../context/DeviceContext";
import { useEffect, useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
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
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  TextField,
  InputAdornment,
} from "@mui/material";

import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import LinkIcon from "@mui/icons-material/LinkOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNewOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { getFootage, footageClipUrl } from "../api/client";
import type { RangePreset } from "../api/client";
import type { FootageClip } from "../types/telemetry";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";

  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);

  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "--";

  const mb = bytes / (1024 * 1024);

  return mb >= 1
    ? `${mb.toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function RecordedFootage() {
  const { selectedDeviceId } = useDevice();
  const [range, setRange] =
    useState<Exclude<RangePreset, "custom">>("last_day");

  const [clips, setClips] = useState<FootageClip[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeClip, setActiveClip] =
    useState<FootageClip | null>(null);

  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

  const filteredClips = clips.filter((clip) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [
      clip.filename,
      clip.device_id,
      clip.started_at,
      new Date(clip.started_at).toLocaleString(),
    ].some((value) => value.toLowerCase().includes(query));
  });

  function copyClipLink(clip: FootageClip) {
    navigator.clipboard?.writeText(footageClipUrl(clip.url, clip.device_id));
    setCopied(true);
  }

  useEffect(() => {
    setClips([]);
    setActiveClip(null);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;

    const pollClips = async (initialLoad: boolean) => {
      if (!selectedDeviceId || inFlight || cancelled) return;

      inFlight = true;

      if (initialLoad) {
        setLoading(true);
      }

      try {
        const data = await getFootage({ deviceId: selectedDeviceId, range });

        if (cancelled) return;

        if (initialLoad) {
          // Load the complete list only when the page/range opens.
          setClips(data);
        } else {
          // Background polling: add only previously unseen videos.
          setClips((current) => {
            const existingIds = new Set(
              current.map((clip) => clip.id)
            );

            const newClips = data
              .filter((clip) => !existingIds.has(clip.id))
              .sort(
                (a, b) =>
                  new Date(b.started_at).getTime() -
                  new Date(a.started_at).getTime()
              );

            if (newClips.length === 0) {
              return current;
            }

            return [...newClips, ...current];
          });
        }
      } catch {
        // Keep the existing list if a background request fails.
      } finally {
        inFlight = false;

        if (initialLoad && !cancelled) {
          setLoading(false);
        }

        // Wait 15 seconds after the previous request completes.
        if (!cancelled) {
          timer = setTimeout(() => {
            void pollClips(false);
          }, 15000);
        }
      }
    };

    void pollClips(true);

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [range, selectedDeviceId]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          {/* Header */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
            mb={2}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <MovieOutlinedIcon sx={{ color: "primary.main" }} />

              <Typography variant="h6">
                Sliced Footage
              </Typography>

              <Chip
                size="small"
                label={`${filteredClips.length} clip${
                  filteredClips.length === 1 ? "" : "s"
                }`}
              />
            </Stack>

            <ToggleButtonGroup
              size="small"
              exclusive
              value={range}
              onChange={(_, v) => v && setRange(v)}
            >
              <ToggleButton value="last_hour">
                Last Hour
              </ToggleButton>

              <ToggleButton value="last_day">
                Last Day
              </ToggleButton>

              <ToggleButton value="last_week">
                Last Week
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Video recorded on the Jetson, sliced into fixed-length
            segments, and uploaded to the server automatically.
            {loading ? " (refreshing…)" : ""}
          </Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Search by filename, device, or date..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* Responsive table */}
          <TableContainer
            sx={{
              width: "100%",
              maxWidth: "100%",
              maxHeight: 520,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Started</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell align="right">
                    Duration
                  </TableCell>
                  <TableCell align="right">
                    Size
                  </TableCell>
                  <TableCell align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredClips.map((clip) => (
                  <TableRow key={clip.id} hover>
                    <TableCell>
                      {new Date(
                        clip.started_at
                      ).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      {clip.device_id}
                    </TableCell>

                    <TableCell align="right">
                      {formatDuration(
                        clip.duration_seconds
                      )}
                    </TableCell>

                    <TableCell align="right">
                      {formatSize(clip.size_bytes)}
                    </TableCell>

                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                      >
                        {/* Play inside dashboard */}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            <PlayCircleOutlineIcon />
                          }
                          onClick={() =>
                            setActiveClip(clip)
                          }
                        >
                          Play
                        </Button>

                        {/* Copy direct stream URL */}
                        <Tooltip title="Copy direct link">
                          <IconButton
                            size="small"
                            onClick={() =>
                              copyClipLink(clip)
                            }
                          >
                            <LinkIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Open raw stream in new tab */}
                        <Tooltip title="Open in new tab">
                          <IconButton
                            size="small"
                            component="a"
                            href={footageClipUrl(
                              clip.url,
                              clip.device_id
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredClips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {search.trim()
                          ? "No clips match your search."
                          : "No clips for this range yet. Make sure footage_recorder.py is running."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Video player dialog */}
      <Dialog
        open={!!activeClip}
        onClose={() => setActiveClip(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {activeClip &&
            new Date(
              activeClip.started_at
            ).toLocaleString()}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {activeClip && (
              <video
                key={activeClip.id}
                src={footageClipUrl(activeClip.url, activeClip.device_id)}
                controls
                autoPlay
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  display: "block",
                  borderRadius: 8,
                  backgroundColor: "#000",
                }}
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Copy notification */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copied to clipboard"
      />
    </Grid>
  );
}
