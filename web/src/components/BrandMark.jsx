// Smart Solar logo for the navy bars: the amber sun badge with the product name, as on the Android app.
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import { tokens } from '../theme.js';

export default function BrandMark({ compact = false }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(tokens.brand, 0.16),
          color: tokens.brand,
        }}
      >
        <WbSunnyIcon />
      </Box>
      <Box>
        <Typography sx={{ color: '#FFFFFF', fontWeight: 700, lineHeight: 1.2 }}>Smart Solar</Typography>
        {!compact && (
          <Typography variant="caption" sx={{ color: tokens.navyText }}>
            Microgrid Trading
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
