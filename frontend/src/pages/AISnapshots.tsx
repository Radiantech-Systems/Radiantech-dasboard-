import EventsTable from "../components/EventsTable";
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
  camera_id?: string;
  camera_location?: string;
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
  setSnapshotData({ NoHelmet: [], "wrong-rute": [], "signal-jumpig": [] });
  setLoading(false);
  let cancelled = false;
  let inFlight = false;

  async function refresh() {
    if (!selectedDeviceId || cancelled || inFlight) {
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

  return <EventsTable key={selectedDeviceId} snapshots={selectedDeviceId ? snapshots : []} loading={loading} />;
}
