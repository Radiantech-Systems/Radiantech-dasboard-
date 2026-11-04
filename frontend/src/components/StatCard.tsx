import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Stack,
} from "@mui/material";

import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  icon?: ReactNode;
  progress?: number | null;
  progressColor?: "primary" | "warning" | "error" | "success";
  subtitle?: string;
}

function fmt(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  return String(value);
}

export default function StatCard({
  title,
  value,
  unit,
  icon,
  progress,
  progressColor = "primary",
  subtitle,
}: StatCardProps) {
  return (
    <Card
      sx={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        height: "100%",
        overflow: "hidden",

        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 6,
        },
      }}
    >
      <CardContent
        sx={{
          width: "100%",
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
          sx={{
            width: "100%",
            minWidth: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </Typography>

          {icon && (
            <Box
              sx={{
                color: "primary.main",
                opacity: 0.85,
                flexShrink: 0,
                display: "flex",
              }}
            >
              {icon}
            </Box>
          )}
        </Stack>

        <Typography
          variant="h5"
          sx={{
            mt: 1,
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {fmt(value)}

          {value !== null &&
          value !== undefined &&
          unit ? (
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{
                ml: 0.5,
              }}
            >
              {unit}
            </Typography>
          ) : null}
        </Typography>

        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              overflowWrap: "anywhere",
            }}
          >
            {subtitle}
          </Typography>
        )}

        {progress !== undefined && progress !== null && (
          <LinearProgress
            variant="determinate"
            value={Math.min(
              100,
              Math.max(0, progress)
            )}
            color={progressColor}
            sx={{
              mt: 1.5,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
