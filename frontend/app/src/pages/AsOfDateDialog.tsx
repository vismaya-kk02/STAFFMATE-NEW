import { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogTitle, IconButton, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const GREEN = '#14632c';

const FS = { label: 13, field: 13, body: 13, title: 18, btn: 14 };

interface Props {
  /** Optional. If omitted, the dialog manages its own open/closed state. */
  open?: boolean;
  onClose?: () => void;
  /** Current "as of" date in yyyy-mm-dd format. Defaults to today. */
  value?: string;
  onApply?: (date: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AsOfDateDialog({ open, onClose, value, onApply }: Props) {
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = open ?? internalOpen;
  const handleClose = () => {
    setInternalOpen(false);
    onClose?.();
  };

  const [date, setDate] = useState(value ?? today());

  // keep the field in sync if the parent changes the value or re-opens the dialog
  useEffect(() => {
    if (isOpen) setDate(value ?? today());
  }, [isOpen, value]);

  const apply = () => {
    if (!date) return;
    onApply?.(date);
    handleClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      slotProps={{
        paper: { sx: { width: 'min(680px, 92vw)', borderRadius: '16px' } },
        backdrop: {
          sx: {
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(15, 23, 20, 0.35)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3, pb: 1.5, px: 3 }}
      >
        <Typography sx={{ fontSize: FS.title, fontWeight: 600 }}>Set "as of" date</Typography>
        <IconButton size="small" onClick={handleClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1, pb: 3 }}>
        <Typography sx={{ fontSize: FS.label, color: '#3c3c3c', mb: 0.75 }}>As of date</Typography>
        <TextField
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff' },
            '& .MuiInputBase-input': { fontSize: FS.field, py: '10.5px', px: '12px' },
          }}
        />

        <Typography sx={{ color: '#6b6b6b', fontSize: FS.body, lineHeight: 1.6, mt: 2 }}>
          Recalculates the Overview counts and alerts as of the selected date. In the full application this also
          drives historical accommodation and assignment views.
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={apply}
            sx={{
              fontSize: FS.btn, fontWeight: 600, textTransform: 'none', borderRadius: '8px',
              px: 2.5, py: 0.75, bgcolor: GREEN, '&:hover': { bgcolor: '#0f4f23' },
            }}
          >
            Apply
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
