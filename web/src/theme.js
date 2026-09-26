// Shared look of the web client: the design tokens and the Material UI theme.
// The Android app uses the same values in mobile/app/src/main/res/values/colors.xml,
// so change a colour in both files to keep the two apps consistent.
import { createTheme } from '@mui/material/styles';

export const tokens = {
  brand: '#F59E0B', // solar amber: primary buttons, active navigation, the sun logo
  brandHover: '#D97706',
  brandStrong: '#B45309', // amber for text, links and focus rings (readable on white)
  brandSoft: '#FEF3C7', // tinted background behind amber icons
  onBrand: '#0F172A', // text on amber
  navy: '#0F172A', // navigation drawer and top bars
  navyLight: '#1E293B',
  navyText: '#CBD5E1', // secondary text on navy
  page: '#F6F7FB', // page background
  surface: '#FFFFFF', // cards and dialogs
  text: '#0F172A',
  textMuted: '#64748B',
  outline: '#CBD5E1', // input borders
  divider: '#E2E8F0', // card borders and table lines
  error: '#DC2626',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

// Colour pairs for status labels and icon badges. The Android booking cards use
// the same pairs (tone_*_fg / tone_*_bg in colors.xml).
export const tones = {
  brand: { fg: tokens.brandStrong, bg: tokens.brandSoft },
  success: { fg: '#166534', bg: '#DCFCE7' },
  warning: { fg: '#92400E', bg: '#FEF3C7' },
  info: { fg: '#1E40AF', bg: '#DBEAFE' },
  neutral: { fg: '#475569', bg: '#F1F5F9' },
  danger: { fg: '#991B1B', bg: '#FEE2E2' },
};

// Which tone each reservation status uses, on the web and on Android.
export const reservationTone = {
  Pending: 'warning',
  Approved: 'success',
  Completed: 'info',
  Cancelled: 'neutral',
};

const theme = createTheme({
  palette: {
    primary: { main: tokens.brand, dark: tokens.brandHover, contrastText: tokens.onBrand },
    secondary: { main: tokens.navy, light: tokens.navyLight, contrastText: '#FFFFFF' },
    error: { main: tokens.error },
    background: { default: tokens.page, paper: tokens.surface },
    text: { primary: tokens.text, secondary: tokens.textMuted },
    divider: tokens.divider,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 500 },
    subtitle1: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999 } },
      variants: [
        // Plain amber is too light for text on white, so text and outlined buttons use the darker amber.
        { props: { variant: 'text', color: 'primary' }, style: { color: tokens.brandStrong } },
        { props: { variant: 'outlined', color: 'primary' }, style: { color: tokens.brandStrong, borderColor: tokens.brand } },
      ],
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 16, borderColor: tokens.divider } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20 } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.brandStrong },
        },
        notchedOutline: { borderColor: tokens.outline },
      },
    },
    MuiFormLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: tokens.brandStrong } } },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: tokens.brandStrong } } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, minHeight: 44, '&.Mui-selected': { color: tokens.brandStrong } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: tokens.divider },
        head: { fontWeight: 500, color: tokens.textMuted, backgroundColor: '#F8FAFC', whiteSpace: 'nowrap' },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
  },
});

export default theme;
