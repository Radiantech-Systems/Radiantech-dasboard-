import { useDevice } from "../context/DeviceContext";
import { useEffect, useState } from "react";

import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
  Paper,
  TextField,
  InputAdornment,
} from "@mui/material";

import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { API_URL } from "../api/client";

type Snapshot = {
  filename: string;
  image: string;
  mime_type: string;
  timestamp: string;
  category: string;
};

type SnapshotData = {
  NoHelmet?: Snapshot[];
  "wrong-rute"?: Snapshot[];
  "signal-jumpig"?: Snapshot[];
};

type SnapshotRequestResponse = {
  status: string;
  request_id: string;
  device_id: string;
};

type SnapshotResultResponse = {
  status: string;
  request_id: string;
  device_id?: string;
  data?: SnapshotData;
};

type FineRate = {
  key: string;
  name: string;
  section: string;
  amount: number;
};

type FineRatesResponse = {
  source_url: string;
  fetched_at: string;
  stale: boolean;
  refresh_error?: string | null;
  rates: FineRate[];
};

const OFFENCE_ALIASES: Record<string, string> = {
  nohelmet: "nohelmet",
  helmetviolation: "nohelmet",
  withouthelmet: "nohelmet",
  notwearinghelmet: "nohelmet",
  helmetless: "nohelmet",

  signaljumping: "signaljumping",
  redlightjumping: "signaljumping",
  signalviolation: "signaljumping",

  tripleriding: "tripleriding",
  triplepersonriding: "tripleriding",
  morethantwopersons: "tripleriding",
};

const SUPPORTED_OFFENCES = [
  { key: "nohelmet", name: "No Helmet" },
  { key: "signaljumping", name: "Signal Jumping" },
  { key: "tripleriding", name: "Triple Riding" },
];

function normaliseOffence(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/*
 * Filenames follow the plate-offence convention.
 * Split at the first separator so offence labels such as
 * "no-helmet" and "signal-jumping" remain intact.
 */
function offenceLabelFromFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() || "";
  const stem = basename.replace(/\.[^.]+$/, "");
  const separator = stem.indexOf("-");
  if (separator < 0) return "";

  return stem
    .slice(separator + 1)
    .replace(/(?:[_-]\d+)$/, "")
    .trim();
}

function offenceKeyFromFilename(filename: string): string | null {
  const label = normaliseOffence(offenceLabelFromFilename(filename));
  return OFFENCE_ALIASES[label] || null;
}

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}


function imageUrl(snapshot: Snapshot): string {
  return `data:${snapshot.mime_type};base64,${snapshot.image}`;
}

function snapshotLabel(snapshot: Snapshot): string {
  const value = `${snapshot.category} ${snapshot.filename}`.toLowerCase();
  if (/person|people|human/.test(value)) return "Person";
  if (/vehicle|car|truck|bus|motorcycle|bicycle/.test(value)) return "Vehicle";
  if (/dog|cat|bird|horse|sheep|cow|animal/.test(value)) return "Animal";
  if (/laptop|keyboard|mouse|remote|cell_phone|electronics/.test(value)) return "Electronics";
  return snapshot.category || "Snapshot";
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export default function AISnapshots() {
  const { selectedDeviceId } = useDevice();
  const [search, setSearch] = useState("");
  const [fineRates, setFineRates] = useState<FineRate[]>([]);
  const [fineRatesFetchedAt, setFineRatesFetchedAt] = useState<string | null>(null);
  const [fineRatesStale, setFineRatesStale] = useState(false);
  const [fineRatesError, setFineRatesError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDeviceId) return;
    let active = true;

    const loadFineRates = async () => {
      try {
        const response = await fetch(`${API_URL}/fine-rates`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          let message = `Fine rates request failed (${response.status})`;
          try {
            const errorData = await response.json();
            if (typeof errorData.detail === "string") {
              message = errorData.detail;
            }
          } catch {
            // Keep the HTTP status message.
          }
          throw new Error(message);
        }

        const data: FineRatesResponse = await response.json();
        if (!active) return;

        setFineRates(data.rates || []);
        setFineRatesFetchedAt(data.fetched_at || null);
        setFineRatesStale(Boolean(data.stale));
        setFineRatesError(
          data.stale
            ? "The official source could not be refreshed. Showing the last successful rates."
            : null,
        );
      } catch (error) {
        if (!active) return;
        setFineRatesError(
          error instanceof Error ? error.message : "Unable to load fine rates.",
        );
      }
    };

    void loadFineRates();
    const refreshTimer = window.setInterval(
      () => void loadFineRates(),
      6 * 60 * 60 * 1000,
    );

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  /*
   * Keep all categories in state.
   *
   * Expected snapshot category keys:
   *
   * We keep them separately so changing the selected
   * category does NOT trigger another Jetson request.
   */
  const [snapshotData, setSnapshotData] =
    useState<SnapshotData>({
      NoHelmet: [],
      "wrong-rute": [],
      "signal-jumpig": [],
    });

  const [loading, setLoading] =
    useState(false);

  const [selectedSnapshot, setSelectedSnapshot] =
    useState<Snapshot | null>(null);

  async function loadSnapshots(deviceId: string, isCurrent: () => boolean) {
    setLoading(true);

    try {
      const BATCH_SIZE = 30;
      let offset = 0;

      // Keep the currently displayed data until a complete scan succeeds.
      const allData: SnapshotData = {
        NoHelmet: [],
        "wrong-rute": [],
        "signal-jumpig": [],
      };

      const seen = new Set<string>();

      while (true) {
        const requestResponse = await fetch(
          `${API_URL}/snapshot-commands/request`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              device_id: deviceId,
              offset,
              limit: BATCH_SIZE,
            }),
          },
        );

        if (!requestResponse.ok) {
          throw new Error(
            `Snapshot request failed: ${requestResponse.status}`,
          );
        }

        const requestData: SnapshotRequestResponse =
          await requestResponse.json();

        let batchData: SnapshotData | null = null;

        for (let attempt = 0; attempt < 120; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 500));

          const resultResponse = await fetch(
            `${API_URL}/snapshot-commands/result/${requestData.request_id}`,
            {
              method: "GET",
              cache: "no-store",
              credentials: "include",
            },
          );

          if (!resultResponse.ok) {
            throw new Error(
              `Snapshot result failed: ${resultResponse.status}`,
            );
          }

          const resultData: SnapshotResultResponse =
            await resultResponse.json();

          if (resultData.status === "ready" && resultData.data) {
            batchData = resultData.data;
            break;
          }
        }

        if (!batchData) {
          throw new Error(`Snapshot batch at offset ${offset} timed out.`);
        }

        const noHelmetImages = batchData.NoHelmet;
        const wrongRouteImages = batchData["wrong-rute"];
        const signalJumpingImages = batchData["signal-jumpig"];

        if (
          !Array.isArray(noHelmetImages) ||
          !Array.isArray(wrongRouteImages) ||
          !Array.isArray(signalJumpingImages)
        ) {
          throw new Error(
            "Snapshot response contains a missing or invalid category.",
          );
        }

        const categories = [
          ["NoHelmet", noHelmetImages],
          ["wrong-rute", wrongRouteImages],
          ["signal-jumpig", signalJumpingImages],
        ] as const;

        for (const [category, images] of categories) {
          for (const image of images) {
            if (!image.filename || !image.image) {
              throw new Error(
                `Invalid snapshot in category: ${category}`,
              );
            }

            const key = `${category}:${image.filename}`;

            if (!seen.has(key)) {
              seen.add(key);
              allData[category]!.push({
                ...image,
                category,
              });
            }
          }
        }

        const maxCategoryCount = Math.max(
          noHelmetImages.length,
          wrongRouteImages.length,
          signalJumpingImages.length,
        );

        if (maxCategoryCount < BATCH_SIZE) {
          break;
        }

        offset += BATCH_SIZE;
      }

      // Only replace the visible list after the complete scan succeeds.
      if (!isCurrent()) return;
      setSnapshotData(allData);
    } catch (error) {
      // Preserve the last valid snapshot list on errors.
      console.error(
        "Snapshot refresh failed; retaining existing snapshots:",
        error,
      );
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  /*
   * Request snapshots only while this page is mounted.
   *
   * IMPORTANT:
   * category is intentionally NOT in the dependency list.
   *
   * Therefore changing NoHelmet / wrong-rute / signal-jumpig
   * does NOT create another request to Jetson.
   */
useEffect(() => {
  let cancelled = false;
  let inFlight = false;

  async function refresh() {
    if (cancelled || inFlight) {
      return;
    }

    inFlight = true;

    try {
      await loadSnapshots(selectedDeviceId, () => !cancelled);
    } finally {
      inFlight = false;
    }
  }

  refresh();

  const interval = window.setInterval(
    refresh,
    5000,
  );

  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}, [selectedDeviceId]);

  /*
   * Select the correct array for the currently selected category.
   */
  const snapshots = [
    ...(snapshotData.NoHelmet || []),
    ...(snapshotData["wrong-rute"] || []),
    ...(snapshotData["signal-jumpig"] || []),
  ].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filteredSnapshots = snapshots.filter((snapshot) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      snapshot.filename,
      snapshot.category,
      snapshot.timestamp,
      formatTimestamp(snapshot.timestamp),
    ].some((value) => value.toLowerCase().includes(query));
  });

  const offenceCounts: Record<string, number> = {
    nohelmet: 0,
    signaljumping: 0,
    tripleriding: 0,
  };
  const unidentifiedCounts: Record<string, number> = {};

  snapshots.forEach((snapshot) => {
    const key = offenceKeyFromFilename(snapshot.filename);

    if (key && key in offenceCounts) {
      offenceCounts[key] += 1;
      return;
    }

    const rawLabel = offenceLabelFromFilename(snapshot.filename);
    const label = rawLabel || "Missing offence label";
    unidentifiedCounts[label] = (unidentifiedCounts[label] || 0) + 1;
  });

  const ratesByKey = new Map(fineRates.map((rate) => [rate.key, rate]));
  const allRatesAvailable = SUPPORTED_OFFENCES.every((offence) => {
    const rate = ratesByKey.get(offence.key);
    return rate !== undefined && Number.isFinite(rate.amount);
  });

  const totalEstimatedFine = allRatesAvailable
    ? SUPPORTED_OFFENCES.reduce((total, offence) => {
        const rate = ratesByKey.get(offence.key)!;
        return total + offenceCounts[offence.key] * rate.amount;
      }, 0)
    : null;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <CameraAltOutlinedIcon color="primary" />

        <Typography
          variant="h5"
          fontWeight={700}
        >
          Violations
        </Typography>

        <Chip
          size="small"
          label={`${filteredSnapshots.length} snapshots`}
        />

        {loading && (
          <CircularProgress
            size={20}
            sx={{ ml: 1 }}
          />
        )}
      </Stack>

      <Grid
        container
        spacing={3}
      >
        {/* SNAPSHOTS */}
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by filename, category, or date..."
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
          <Grid
            container
            spacing={2}
          >
            {filteredSnapshots.map(
              (snapshot) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  lg={3}
                  key={`${snapshot.category}-${snapshot.filename}`}
                >
                  <Card
                    sx={{
                      cursor: "pointer",
                      height: "100%",
                    }}
                    onClick={() =>
                      setSelectedSnapshot(
                        snapshot,
                      )
                    }
                  >
                    <CardMedia
                      component="img"
                      image={imageUrl(
                        snapshot,
                      )}
                      alt={
                        snapshot.filename
                      }
                      sx={{
                        width: "100%",
                        aspectRatio: "4 / 3",
                        objectFit: "cover",
                      }}
                    />

                    <CardContent>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                      >
                        {snapshotLabel(snapshot)}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          wordBreak:
                            "break-word",
                        }}
                      >
                        {
                          snapshot.filename
                        }
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {formatTimestamp(
                          snapshot.timestamp,
                        )}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ),
            )}

            {!loading &&
              filteredSnapshots.length === 0 && (
                <Grid
                  item
                  xs={12}
                >
                  <Paper
                    sx={{
                      p: 4,
                      textAlign: "center",
                    }}
                  >
                    <Typography color="text.secondary">
                      {search.trim() ? "No snapshots match your search." : "No snapshots available"}
                    </Typography>
                  </Paper>
                </Grid>
              )}
          </Grid>
        </Grid>

        {/* FINE SUMMARY */}
        <Grid item xs={12} md={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2,
              height: "fit-content",
              position: { md: "sticky" },
              top: { md: 16 },
            }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Fine Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Counts are based on all loaded snapshots, regardless of search.
            </Typography>

            {SUPPORTED_OFFENCES.map((offence) => {
              const rate = ratesByKey.get(offence.key);
              const count = offenceCounts[offence.key];
              const subtotal = rate ? count * rate.amount : null;

              return (
                <Box key={offence.key} sx={{ py: 1.25 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography fontWeight={600}>{offence.name}</Typography>
                    <Typography fontWeight={700}>{count}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {rate
                      ? `Rate: ${formatRupees(rate.amount)}`
                      : "Rate unavailable"}
                    {rate?.section ? ` · ${rate.section}` : ""}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Subtotal
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {subtotal === null ? "—" : formatRupees(subtotal)}
                    </Typography>
                  </Stack>
                  <Divider sx={{ mt: 1.25 }} />
                </Box>
              );
            })}

            <Box sx={{ py: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography fontWeight={600}>
                  Unidentified / Unmatched
                </Typography>
                <Typography fontWeight={700}>
                  {Object.values(unidentifiedCounts).reduce((sum, count) => sum + count, 0)}
                </Typography>
              </Stack>

              {Object.keys(unidentifiedCounts).length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {Object.entries(unidentifiedCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([label, count]) => (
                      <Stack
                        key={label}
                        direction="row"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ overflowWrap: "anywhere" }}
                        >
                          {label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {count}
                        </Typography>
                      </Stack>
                    ))}
                  {Object.keys(unidentifiedCounts).length > 8 && (
                    <Typography variant="caption" color="text.secondary">
                      Showing 8 of {Object.keys(unidentifiedCounts).length} unmatched labels.
                    </Typography>
                  )}
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                No fine is assigned to unmatched labels.
              </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Typography fontWeight={700}>Total estimated fines</Typography>
              <Typography variant="h6" fontWeight={800} textAlign="right">
                {totalEstimatedFine === null ? "—" : formatRupees(totalEstimatedFine)}
              </Typography>
            </Stack>

            {!allRatesAvailable && (
              <Typography color="warning.main" variant="body2" sx={{ mt: 1 }}>
                Rates are unavailable or incomplete. The total is withheld until all supported rates load.
              </Typography>
            )}

            {fineRatesError && (
              <Typography color="warning.main" variant="caption" display="block" sx={{ mt: 1 }}>
                {fineRatesError}
              </Typography>
            )}

            {fineRatesStale && (
              <Typography color="warning.main" variant="caption" display="block" sx={{ mt: 0.5 }}>
                Using cached rates from the last successful refresh.
              </Typography>
            )}

            {fineRatesFetchedAt && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                Last successful refresh: {formatTimestamp(fineRatesFetchedAt)}
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Rates published by{" "}
              <a
                href="https://www.htp.gov.in/road_rules.html"
                target="_blank"
                rel="noreferrer"
              >
                Hyderabad Traffic Police
              </a>
              . Verify current legal penalties with the official authority.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* IMAGE PREVIEW */}
      <Dialog
        open={Boolean(
          selectedSnapshot,
        )}
        onClose={() =>
          setSelectedSnapshot(null)
        }
        maxWidth="md"
        fullWidth
      >
        {selectedSnapshot && (
          <Box>
            <CardMedia
              component="img"
              image={imageUrl(
                selectedSnapshot,
              )}
              alt={
                selectedSnapshot.filename
              }
              sx={{
                width: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />

            <Box sx={{ p: 2 }}>
              <Typography
                variant="h6"
                fontWeight={600}
              >
                {snapshotLabel(selectedSnapshot)}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                {
                  selectedSnapshot.filename
                }
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                {formatTimestamp(
                  selectedSnapshot.timestamp,
                )}
              </Typography>
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
