import { createTheme } from "@mui/material/styles";

const colors = {
  canvas: "#F2F5F8",
  paper: "#FFFFFF",
  sidebar: "#FFFFFF",
  primary: "#0E5261",
  secondary: "#176B80",
  text: "#19263B",
  muted: "#64748B",
  border: "#E0E5EC",
  success: "#218653",
  warning: "#B7791F",
  error: "#C53B3B",
  info: "#3569A8",
};

const theme = createTheme({
  palette: {
    mode: "light",

    primary: {
      main: colors.primary,
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: colors.secondary,
      contrastText: "#FFFFFF",
    },

    background: {
      default: colors.canvas,
      paper: colors.paper,
    },

    success: {
      main: colors.success,
    },

    warning: {
      main: colors.warning,
    },

    error: {
      main: colors.error,
    },

    info: {
      main: colors.info,
    },

    text: {
      primary: colors.text,
      secondary: colors.muted,
    },

    divider: colors.border,
  },

  shape: {
    borderRadius: 10,
  },

  typography: {
    fontFamily: [
      "Inter",
      "Roboto",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "sans-serif",
    ].join(","),

    h4: {
      fontWeight: 700,
      fontSize: "clamp(1.35rem, 2.5vw, 2rem)",
      letterSpacing: "-0.035em",
      color: colors.text,
    },

    h5: {
      fontWeight: 700,
      fontSize: "clamp(1.2rem, 2vw, 1.75rem)",
      letterSpacing: "-0.025em",
      color: colors.text,
    },

    h6: {
      fontWeight: 650,
      fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
      color: colors.text,
    },

    subtitle1: {
      fontSize: "clamp(0.9rem, 1.2vw, 1rem)",
      fontWeight: 500,
    },

    subtitle2: {
      color: colors.muted,
      fontSize: "clamp(0.78rem, 1vw, 0.9rem)",
      fontWeight: 500,
    },

    body1: {
      fontSize: "clamp(0.875rem, 1vw, 1rem)",
    },

    body2: {
      fontSize: "clamp(0.78rem, 0.9vw, 0.95rem)",
    },

    caption: {
      fontSize: "clamp(0.7rem, 0.8vw, 0.8rem)",
      color: colors.muted,
    },

    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          width: "100%",
          minHeight: "100%",
          overflowX: "hidden",
          backgroundColor: colors.canvas,
        },

        body: {
          width: "100%",
          minHeight: "100%",
          margin: 0,
          overflowX: "hidden",
          backgroundColor: colors.canvas,
          color: colors.text,
        },

        "#root": {
          position: "relative",
          zIndex: 1,
          width: "100%",
          minHeight: "100dvh",
          overflowX: "hidden",
          backgroundColor: colors.canvas,
        },

        ".page-content": {
          isolation: "isolate",
          position: "relative",
          minHeight: "calc(100dvh - 64px)",
          backgroundColor: colors.canvas,
          color: colors.text,
        },

        ".page-content > *": {
          position: "relative",
          zIndex: 1,
        },

        "*": {
          boxSizing: "border-box",
        },

        "img, video, canvas, svg": {
          maxWidth: "100%",
        },

        "img, video": {
          height: "auto",
        },

        "a, code": {
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        },

        pre: {
          maxWidth: "100%",
          overflowX: "auto",
        },

        "::selection": {
          backgroundColor: "#D8E4F0",
          color: colors.text,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: colors.paper,
          backgroundImage: "none",
          border: `1px solid ${colors.border}`,
          minWidth: 0,
          maxWidth: "100%",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.paper,
          backgroundImage: "none",
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          minWidth: 0,
          maxWidth: "100%",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(24, 37, 54, 0.035)",
          transition: "border-color 160ms ease, box-shadow 160ms ease",

          "&:hover": {
            borderColor: "#C5D0DC",
            boxShadow: "0 3px 10px rgba(24, 37, 54, 0.055)",
          },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          minWidth: 0,
          padding: "clamp(12px, 2vw, 24px)",

          "&:last-child": {
            paddingBottom: "clamp(12px, 2vw, 24px)",
          },
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.sidebar,
          color: colors.text,
          backgroundImage: "none",
          borderRight: `1px solid ${colors.border}`,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          color: colors.text,
          backgroundImage: "none",
          backdropFilter: "blur(10px)",
          boxShadow: "none",
          borderBottom: `1px solid ${colors.border}`,
        },
      },
    },

    MuiToolbar: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },

    MuiGrid: {
      styleOverrides: {
        root: {
          minWidth: 0,
          maxWidth: "100%",
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          borderRadius: 8,
        },
      },
    },

    MuiTable: {
      styleOverrides: {
        root: {
          minWidth: 520,
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#F6F8FA",
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          whiteSpace: "nowrap",
          borderBottom: `1px solid ${colors.border}`,
          color: colors.text,
          padding: "12px 16px",
        },

        head: {
          color: "#526174",
          fontWeight: 700,
          fontSize: "0.76rem",
          letterSpacing: "0.035em",
          textTransform: "uppercase",
          backgroundColor: "#F6F8FA",
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td, &:last-child th": {
            borderBottom: 0,
          },

          "&:hover": {
            backgroundColor: "#F8FAFC",
          },
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          width: "100%",
          maxWidth: "900px",
          margin: "clamp(8px, 3vw, 32px)",
          maxHeight: "calc(100dvh - 16px)",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(24, 37, 54, 0.16)",
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: colors.text,
          fontWeight: 700,
          borderBottom: `1px solid ${colors.border}`,
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          minWidth: 0,
          overflowX: "hidden",
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          maxWidth: "100%",
          minWidth: 0,
          borderRadius: 8,
          boxShadow: "none",
        },

        contained: {
          "&:hover": {
            boxShadow: "none",
          },
        },

        outlined: {
          borderColor: "#C9D3DE",

          "&:hover": {
            borderColor: colors.secondary,
            backgroundColor: "#F3F6FA",
          },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        fullWidth: true,
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: colors.paper,

          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#CBD5E1",
          },

          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.secondary,
          },

          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.secondary,
            borderWidth: 1,
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: colors.muted,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.primary,
          fontSize: "0.78rem",
          borderRadius: 6,
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
          backgroundColor: "#E7ECF1",
        },

        bar: {
          borderRadius: 8,
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
