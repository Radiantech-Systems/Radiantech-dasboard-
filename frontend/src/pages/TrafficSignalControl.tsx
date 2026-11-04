import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import TrafficIcon from "@mui/icons-material/Traffic";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const LANE_COUNT = 4;

import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

export default function TrafficSignalControl({
  socket,
}: {
  socket: ReturnType<typeof useTelemetrySocket>;
}) {
  const [greenLane, setGreenLane] = useState<number | null>(null);
  const [sharedStateReady, setSharedStateReady] = useState(false);

  // Receive the authoritative shared lane state from AWS.
  useEffect(() => {
    const handleSharedState = (event: Event) => {
      const customEvent = event as CustomEvent<{
        lane_1: "RED" | "GREEN";
        lane_2: "RED" | "GREEN";
        lane_3: "RED" | "GREEN";
        lane_4: "RED" | "GREEN";
      }>;

      const lanes = customEvent.detail;
      if (!lanes) return;

      const greenLanes = [
        lanes.lane_1,
        lanes.lane_2,
        lanes.lane_3,
        lanes.lane_4,
      ].filter((state) => state === "GREEN").length;

      if (greenLanes <= 1) {
        const activeLane = [
          lanes.lane_1,
          lanes.lane_2,
          lanes.lane_3,
          lanes.lane_4,
        ].findIndex((state) => state === "GREEN");

        setGreenLane(activeLane === -1 ? null : activeLane + 1);
        setSharedStateReady(true);
      }
    };

    window.addEventListener("shared-traffic-signal-state", handleSharedState);
    return () => {
      window.removeEventListener("shared-traffic-signal-state", handleSharedState);
    };
  }, []);

  // Send changes only when the user changes a lane.
  useEffect(() => {
    // Never send the browser's default state before AWS initializes it.
    if (!sharedStateReady) return;

    socket.sendTrafficSignalState({
      lane_1: greenLane === 1 ? "GREEN" : "RED",
      lane_2: greenLane === 2 ? "GREEN" : "RED",
      lane_3: greenLane === 3 ? "GREEN" : "RED",
      lane_4: greenLane === 4 ? "GREEN" : "RED",
    });
  }, [greenLane, sharedStateReady, socket.sendTrafficSignalState]);

  const selectGreen = (lane: number) => {
    setGreenLane(lane);
  };

  const selectRed = (lane: number) => {
    if (greenLane === lane) {
      setGreenLane(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TrafficIcon sx={{ fontSize: 36, color: "primary.main" }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Traffic Signal Control
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Four-lane signal status sent as JSON to the AWS backend
            </Typography>
          </Box>
        </Stack>

        <Chip
          label={socket.status === "connected" ? "WEBSOCKET CONNECTED" : "WEBSOCKET DISCONNECTED"}
          color={socket.status === "connected" ? "success" : "warning"}
          variant="outlined"
        />
      </Stack>

      <Stack spacing={1} sx={{ mb: 3 }}>
        <Alert severity="info">
          These controls send lane-state JSON to the AWS backend as AI input.
          They do not operate physical traffic signals.
        </Alert>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={
              socket.signalDeliveryStatus === "accepted"
                ? "AWS: STATE ACCEPTED"
                : socket.signalDeliveryStatus === "pending"
                  ? "AWS: WAITING FOR ACKNOWLEDGMENT"
                  : socket.signalDeliveryStatus === "error"
                    ? "AWS: SEND ERROR"
                    : "AWS: NO STATE ACKNOWLEDGED"
            }
            color={
              socket.signalDeliveryStatus === "accepted"
                ? "success"
                : socket.signalDeliveryStatus === "error"
                  ? "error"
                  : "default"
            }
            variant="outlined"
          />
          <Chip
            label="ASRock: RECEIPT NOT CONFIRMED"
            color="warning"
            variant="outlined"
          />
        </Stack>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Signal Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {greenLane === null
                  ? "All lanes are Red"
                  : `Lane ${greenLane} is Green; all other lanes are Red`}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              color="error"
              onClick={() => setGreenLane(null)}
            >
              Set All Red
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {Array.from({ length: LANE_COUNT }, (_, index) => {
          const lane = index + 1;
          const isGreen = greenLane === lane;

          return (
            <Grid item xs={12} sm={6} md={3} key={lane}>
              <Card
                sx={{
                  height: "100%",
                  border: "1px solid",
                  borderColor: isGreen ? "success.main" : "divider",
                  transition: "border-color 0.2s ease",
                }}
              >
                <CardContent>
                  <Stack spacing={2} alignItems="center">
                    <Typography variant="h6" fontWeight={700}>
                      Lane {lane}
                    </Typography>

                    <Box
                      sx={{
                        width: 76,
                        p: 1.25,
                        borderRadius: 3,
                        bgcolor: "#20242a",
                        border: "2px solid #444a52",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        aria-label={`Lane ${lane} red signal`}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          bgcolor: isGreen ? "#512b30" : "#f44336",
                          boxShadow: isGreen
                            ? "none"
                            : "0 0 12px rgba(244,67,54,0.65)",
                        }}
                      />
                      <Box
                        aria-label={`Lane ${lane} green signal`}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          bgcolor: isGreen ? "#4caf50" : "#244b35",
                          boxShadow: isGreen
                            ? "0 0 12px rgba(76,175,80,0.65)"
                            : "none",
                        }}
                      />
                    </Box>

                    <Chip
                      icon={<CheckCircleOutlineIcon />}
                      label={isGreen ? "GREEN" : "RED"}
                      color={isGreen ? "success" : "error"}
                      variant="filled"
                    />

                    <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                      <Button
                        fullWidth
                        size="small"
                        variant={isGreen ? "contained" : "outlined"}
                        color="success"
                        onClick={() => selectGreen(lane)}
                      >
                        Green
                      </Button>
                      <Button
                        fullWidth
                        size="small"
                        variant={!isGreen ? "contained" : "outlined"}
                        color="error"
                        onClick={() => selectRed(lane)}
                      >
                        Red
                      </Button>
                    </Stack>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textAlign="center"
                    >
                      {isGreen
                        ? "Active lane"
                        : "Red lane"}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
