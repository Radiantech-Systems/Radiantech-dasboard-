import { Box, Typography } from "@mui/material";

export default function CompanyWatermark() {
  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 12, sm: 20 },
        bottom: { xs: 10, sm: 16 },
        zIndex: 10,
        opacity: 0.72,
        pointerEvents: "none",
        userSelect: "none",
        textAlign: "right",
        lineHeight: 1.2,
      }}
    >
      <Typography
        sx={{
          fontSize: { xs: "11px", sm: "13px" },
          fontWeight: 700,
          color: "#0e5261",
          letterSpacing: "0.035em",
          whiteSpace: "nowrap",
          lineHeight: 1.4,
        }}
      >
        DRISHTI
      </Typography>

      <Typography
        sx={{
          fontSize: { xs: "8px", sm: "9px" },
          fontWeight: 500,
          color: "#64748b",
          whiteSpace: "nowrap",
          lineHeight: 1.4,
        }}
      >
        Powered by Radian Edge Platform
      </Typography>
    </Box>
  );
}
