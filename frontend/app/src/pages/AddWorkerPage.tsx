import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
  type TextFieldProps,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import SendIcon from '@mui/icons-material/Send';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

/* ---------- types & constants ---------- */

type Yes = 'Yes' | 'No';

interface WorkerForm {
  firstName: string; surname: string; internalId: string; dob: string;
  nationality: string; photo: File | null;
  telephone: string; email: string; address: string;
  emergencyName: string; emergencyPhone: string;
  coordinator: string; arrivalDate: string; workStart: string;
  intendedProject: string; coordinatorInterest: Yes;
  employmentRelationship: string; employmentStart: string;
  spEffectiveFrom: string; spEvidence: File | null; spVerified: boolean;
  project: string; role: string; assignmentStart: string;
  facility: string; stayStart: string; plannedDeparture: string;
  notes: string;
}

const EMPTY: WorkerForm = {
  firstName: '', surname: '', internalId: '', dob: '', nationality: '', photo: null,
  telephone: '', email: '', address: '', emergencyName: '', emergencyPhone: '',
  coordinator: 'Jana Kollárová', arrivalDate: '', workStart: '', intendedProject: '',
  coordinatorInterest: 'No', employmentRelationship: 'Not yet started',
  employmentStart: '', spEffectiveFrom: '', spEvidence: null, spVerified: false,
  project: '', role: '', assignmentStart: '', facility: '', stayStart: '',
  plannedDeparture: '', notes: '',
};

const COORDINATORS = ['Jana Kollárová', 'Peter Novák'];
const PROJECTS = ['Assembly Line A', 'Warehouse North', 'Packaging Plant'];
const FACILITIES = ['Dormitory 1', 'Dormitory 2', 'Apartment block B'];
const EMPLOYMENT = ['Not yet started', 'Employed', 'Agency contract', 'Terminated'];
const DOC_CATEGORIES = [
  'Employment Contract', 'Passport', 'TRC / Residence Card',
  'Authority Approval Statement', 'Accommodation Agreement', 'Insurance Certificate',
] as const;

const STEPS = [
  { label: '1. Identification', icon: <img src="/images/identification.svg" alt="Identification" width={16} height={16} /> },
  { label: '2. Contact', icon: <img src="/images/contact.svg" alt="Contact" width={16} height={16} /> },
  { label: '3. Preparation', icon: <img src="/images/preparation.svg" alt="Preparation" width={16} height={16} /> },
  { label: '4. Employment & SP', icon: <img src="/images/employment.svg" alt="Employment & SP" width={16} height={16} /> },
  { label: '5. Assignment', icon: <img src="/images/assignment.svg" alt="Assignment" width={16} height={16} /> },
  { label: '6. Accommodation', icon: <img src="/images/accomodation.svg" alt="Accommodation" width={16} height={16} /> },
  { label: '7. Documents', icon: <img src="/images/document.svg" alt="Documents" width={16} height={16} /> },
  { label: '8. Summary', icon: <img src="/images/summary.svg" alt="Summary" width={16} height={16} /> },
];

const GREEN = '#14632c';
const GREEN_SOFT = '#c8ebcf';
const GREEN_LINE = '#2e7d32';

/* ---------- size scale (tweak these to make the whole page bigger/smaller) ---------- */

const FS = { label: 13, body: 13, field: 13, note: 12, title: 16, chip: 13, btn: 13, summary: 13, heading: 15 };

/* ---------- small helpers ---------- */

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff' },
  '& .MuiInputBase-input': { fontSize: FS.field, py: '10.5px', px: '12px' },
};
const labelSx = { fontSize: FS.label, color: '#3c3c3c', mb: 0.75 };

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <Box>
      <Typography sx={labelSx}>{label}{required && ' *'}</Typography>
      {children}
    </Box>
  );
}

const Grid2 = ({ children }: { children: ReactNode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2, rowGap: 2.25 }}>{children}</Box>
);

function FileInput({ file, onChange, accept }: { file: File | null; onChange: (f: File | null) => void; accept?: string }) {
  return (
    <Box sx={{ border: '1px solid #c4c4c4', borderRadius: '8px', px: 1.5, py: 0.75, minHeight: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: '#fff', fontSize: FS.field }}>
      <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file && <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{file.name}</Typography>}
    </Box>
  );
}

const note = (text: string) => (
  <Typography sx={{ color: '#6b6b6b', fontSize: FS.note, lineHeight: 1.55 }}>{text}</Typography>
);

function spBadge(f: WorkerForm) {
  if (!f.spEvidence) return { text: 'SP – Not Registered', color: '#c62828', bg: '#fdeaea' };
  if (!f.spVerified) return { text: 'SP – Pending verification', color: '#b26a00', bg: '#fff3e0' };
  if (!f.spEffectiveFrom) return { text: 'SP – Verified, no effective date', color: '#b26a00', bg: '#fff3e0' };
  return { text: 'SP – Registered', color: GREEN, bg: '#e6f4ea' };
}

const alertSx = { bgcolor: '#ffe0b2', color: '#7a4a00', borderRadius: '8px', fontSize: FS.body, py: 0.25 };
const btnSx = { fontSize: FS.btn, textTransform: 'none', borderRadius: '8px', px: 2, py: 0.5, minHeight: 34, minWidth: 0, lineHeight: 1.4 } as const;

/* ---------- page ---------- */

interface Props {
  /** Optional. If omitted, the component manages its own open/closed state. */
  open?: boolean;
  onClose?: () => void;
  onSaved?: (worker: WorkerForm, status: 'Draft' | 'Pending Review') => void;
}

export default function AddWorkerPage({ open, onClose, onSaved }: Props) {
  /* Close handling:
     - controlled: parent passes `open` -> parent's value wins, and its onClose is called
     - standalone: no `open` prop -> the dialog closes itself via internal state */
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = open ?? internalOpen;
  const handleClose = () => {
    setInternalOpen(false);
    onClose?.();
  };

  const [form, setForm] = useState<WorkerForm>(EMPTY);
  const [docs, setDocs] = useState<Record<string, File | null>>({});
  const [step, setStep] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const addTarget = useRef<string>('');

  const set = <K extends keyof WorkerForm>(k: K, v: WorkerForm[K]) => setForm((p) => ({ ...p, [k]: v }));
  const text = (k: keyof WorkerForm): TextFieldProps => ({
    value: form[k] as string,
    onChange: (e) => set(k, e.target.value as never),
    fullWidth: true,
    size: 'small',
    sx: fieldSx,
  });
  const date = (k: keyof WorkerForm): TextFieldProps => ({
    ...text(k),
    type: 'date',
  });

  const uploaded = DOC_CATEGORIES.filter((c) => docs[c]).length;
  const coreMissing = useMemo(() => {
    const core: [string, string][] = [
      ['First name', form.firstName], ['Surname', form.surname], ['Date of birth', form.dob],
      ['Nationality', form.nationality], ['Telephone', form.telephone],
    ];
    return core.filter(([, v]) => !v.trim()).map(([n]) => n);
  }, [form]);

  const title = `New Worker Profile (${savedAt ? 'draft' : 'unsaved'})`;

  const save = (): boolean => {
    if (!form.firstName.trim() || !form.surname.trim()) {
      setError('First name and surname are required to save.');
      setStep(0);
      return false;
    }
    setError(null);
    if (!form.internalId) set('internalId', `W-${String(Date.now()).slice(-5)}`);
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    return true;
  };

  const saveAndContinue = () => { if (save()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const submit = () => { if (save()) { onSaved?.(form, 'Pending Review'); handleClose(); } };
  const draft = () => { if (save()) onSaved?.(form, 'Draft'); };

  const dropFiles = (files: FileList | null) => {
    if (!files) return;
    const free = DOC_CATEGORIES.filter((c) => !docs[c]);
    const next = { ...docs };
    Array.from(files).forEach((f, i) => { if (free[i]) next[free[i]] = f; });
    setDocs(next);
  };

  /* ----- step bodies ----- */

  const bodies: ReactNode[] = [
    <Stack spacing={2.25} key="id">
      <Grid2>
        <Field label="First Name" required><TextField {...text('firstName')} /></Field>
        <Field label="Surname" required><TextField {...text('surname')} /></Field>
        <Field label="Internal ID">
          <TextField value={form.internalId} fullWidth size="small" sx={fieldSx} slotProps={{ input: { readOnly: true } }}
            placeholder="Assigned automatically on first save" />
        </Field>
        <Field label="Date of Birth"><TextField {...date('dob')} /></Field>
        <Field label="Nationality"><TextField {...text('nationality')} placeholder="e.g. Vietnam" /></Field>
        <Field label="Photograph">
          <FileInput file={form.photo} accept="image/*" onChange={(f) => set('photo', f)} />
        </Field>
      </Grid2>
      {note('A draft may be created with just a first name and surname — the system assigns an ID immediately on Save Draft. Everything else can be completed later.')}
    </Stack>,

    <Stack spacing={2.25} key="contact">
      <Grid2>
        <Field label="Telephone"><TextField {...text('telephone')} /></Field>
        <Field label="Email"><TextField {...text('email')} type="email" /></Field>
      </Grid2>
      <Field label="Address"><TextField {...text('address')} /></Field>
      <Grid2>
        <Field label="Emergency Contact Name"><TextField {...text('emergencyName')} /></Field>
        <Field label="Emergency Contact Phone"><TextField {...text('emergencyPhone')} /></Field>
      </Grid2>
    </Stack>,

    <Stack spacing={2.25} key="prep">
      <Grid2>
        <Field label="Responsible Coordinator" required>
          <TextField select {...text('coordinator')}>
            {COORDINATORS.map((c) => <MenuItem key={c} value={c} sx={{ fontSize: FS.field }}>{c}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Planned Arrival Date"><TextField {...date('arrivalDate')} /></Field>
        <Field label="Planned Work Start"><TextField {...date('workStart')} /></Field>
        <Field label="Intended Project (optional)">
          <TextField select {...text('intendedProject')} slotProps={{ select: { displayEmpty: true } }}>
            <MenuItem value="" sx={{ fontSize: FS.field }}>— none yet —</MenuItem>
            {PROJECTS.map((p) => <MenuItem key={p} value={p} sx={{ fontSize: FS.field }}>{p}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Coordinator interest?">
          <TextField select {...text('coordinatorInterest')}>
            <MenuItem value="No" sx={{ fontSize: FS.field }}>No</MenuItem>
            <MenuItem value="Yes" sx={{ fontSize: FS.field }}>Yes</MenuItem>
          </TextField>
        </Field>
      </Grid2>
      {note('Selecting an intended project here does not create an assignment — it’s informational until you complete Step 5.')}
    </Stack>,

    <Stack spacing={2.25} key="emp">
      <Grid2>
        <Field label="Employment Relationship">
          <TextField select {...text('employmentRelationship')}>
            {EMPLOYMENT.map((e) => <MenuItem key={e} value={e} sx={{ fontSize: FS.field }}>{e}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Employment Start Date"><TextField {...date('employmentStart')} /></Field>
        <Field label="Registration Effective From"><TextField {...date('spEffectiveFrom')} /></Field>
      </Grid2>
      <Field label="Supporting Evidence">
        <FileInput file={form.spEvidence} onChange={(f) => set('spEvidence', f)} />
      </Field>
      <FormControlLabel
        control={<Checkbox size="small" checked={form.spVerified} onChange={(e) => set('spVerified', e.target.checked)}
          sx={{ '&.Mui-checked': { color: GREEN } }} />}
        slotProps={{ typography: { sx: { fontSize: FS.body } } }}
        label="I confirm this registration evidence has been reviewed (verification — authorised users only)"
      />
      {note('There is no separate status picker — the badge is derived here from whether evidence exists, whether it’s verified, and the effective date, exactly as it will be in the worker profile. An assignment cannot be activated without verified SP registration effective on the planned start date. This is enforced on save, not just in the UI.')}
    </Stack>,

    <Stack spacing={2.25} key="assign">
      <Grid2>
        <Field label="Project">
          <TextField select {...text('project')} slotProps={{ select: { displayEmpty: true } }}>
            <MenuItem value="" sx={{ fontSize: FS.field }}>— not yet —</MenuItem>
            {PROJECTS.map((p) => <MenuItem key={p} value={p} sx={{ fontSize: FS.field }}>{p}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Role"><TextField {...text('role')} placeholder="e.g. Production Operator" /></Field>
        <Field label="Assignment Start Date"><TextField {...date('assignmentStart')} /></Field>
      </Grid2>
      {!(form.spVerified && form.spEvidence) && (
        <Alert severity="warning" icon={<InfoDot />} sx={alertSx}>
          SP registration is not yet verified — this assignment will save as <b>Planned/Blocked</b> and remain inactive until verified.
        </Alert>
      )}
    </Stack>,

    <Stack spacing={2.25} key="acc">
      <Grid2>
        <Field label="Facility">
          <TextField select {...text('facility')} slotProps={{ select: { displayEmpty: true } }}>
            <MenuItem value="" sx={{ fontSize: FS.field }}>— not accommodated —</MenuItem>
            {FACILITIES.map((p) => <MenuItem key={p} value={p} sx={{ fontSize: FS.field }}>{p}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Stay Start (planned)"><TextField {...date('stayStart')} /></Field>
        <Field label="Planned Departure"><TextField {...date('plannedDeparture')} /></Field>
      </Grid2>
      {note('A planned stay is information only — it does not reduce available bed capacity until actual check-in is recorded.')}
    </Stack>,

    <Stack spacing={2.25} key="docs">
      <Typography sx={{ color: '#555', fontSize: FS.body }}>
        Upload what you have now — this checklist can be completed progressively. Missing items are tracked, not blocking.
      </Typography>
      <Box
        onClick={() => dropRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); dropFiles(e.dataTransfer.files); }}
        sx={{ border: `2px dashed ${GREEN_LINE}`, borderRadius: '10px', color: GREEN, textAlign: 'center',
          py: 2, px: 2, cursor: 'pointer', '&:hover': { bgcolor: '#f3faf4' } }}>
        <CloudUploadOutlinedIcon fontSize="small" />
        <Typography sx={{ fontSize: FS.body }}>Drag files here or click to upload — PDF, JPG, PNG. Assign a category to each file.</Typography>
        <input ref={dropRef} type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => { dropFiles(e.target.files); e.target.value = ''; }} />
      </Box>
      <input ref={addRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setDocs((d) => ({ ...d, [addTarget.current]: f }));
          e.target.value = '';
        }} />
      <Table size="small">
        <TableHead>
          <TableRow>
            {['CATEGORY', 'FILE(S)', 'STATUS', ''].map((h, i) => (
              <TableCell key={`${h}-${i}`} sx={{ fontSize: 11, fontWeight: 600, color: '#444', borderBottom: '1px solid #e6e6e6', py: 0.75 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {DOC_CATEGORIES.map((c) => {
            const f = docs[c];
            return (
              <TableRow key={c}>
                <TableCell sx={{ fontWeight: 600, fontSize: FS.body, py: 0.75 }}>{c}</TableCell>
                <TableCell sx={{ color: '#666', fontSize: FS.body, py: 0.75 }}>{f ? f.name : '— not uploaded'}</TableCell>
                <TableCell sx={{ py: 0.75 }}>
                  <Chip size="small" label={f ? 'Uploaded' : 'Missing'}
                    icon={<Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: f ? GREEN : '#c62828', ml: '8px !important' }} />}
                    sx={{ bgcolor: f ? '#e6f4ea' : '#fdeaea', color: f ? GREEN : '#c62828', fontWeight: 500, fontSize: 12, height: 22 }} />
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>
                  <Button size="small" sx={{ color: GREEN, fontSize: FS.body, textTransform: 'none', minWidth: 0 }}
                    onClick={() => { addTarget.current = c; addRef.current?.click(); }}>
                    {f ? 'Replace' : 'Add'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Stack>,

    <Box key="sum" sx={{ border: '1px solid #e3e3e3', borderRadius: '10px', p: 1.75 }}>
      <Typography sx={{ fontWeight: 600, fontSize: FS.heading, mb: 1 }}>
        Profile Summary — {form.firstName || form.surname ? `${form.firstName} ${form.surname}`.trim() : '(no name)'}{' '}
        {savedAt ? `(${form.internalId})` : '(not yet saved)'}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 0.9, fontSize: FS.summary, alignItems: 'center' }}>
        <span style={{ color: '#666' }}>Completeness</span>
        <span>{uploaded} of {DOC_CATEGORIES.length} document items uploaded, {5 - coreMissing.length}/5 core fields complete</span>
        <span style={{ color: '#666' }}>Coordinator</span><span>{form.coordinator}</span>
        <span style={{ color: '#666' }}>Project</span><span>{form.project || form.intendedProject || 'None selected'}</span>
        <span style={{ color: '#666' }}>SP Status</span>
        <span>
          {(() => { const b = spBadge(form); return (
            <Chip size="small" label={b.text}
              icon={<Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: b.color, ml: '8px !important' }} />}
              sx={{ bgcolor: b.bg, color: b.color, fontSize: 12, height: 22 }} />
          ); })()}
        </span>
        <span style={{ color: '#666' }}>Accommodation</span><span>{form.facility || 'Not yet assigned'}</span>
      </Box>
      <Stack spacing={0.75} sx={{ mt: 1.5 }}>
        {coreMissing.length > 0 && (
          <Alert severity="warning" icon={<InfoDot />} sx={alertSx}>
            Missing: {coreMissing.join(', ')}
          </Alert>
        )}
        {uploaded < DOC_CATEGORIES.length && (
          <Alert severity="warning" icon={<InfoDot />} sx={alertSx}>
            {DOC_CATEGORIES.length - uploaded} document item(s) still not uploaded
          </Alert>
        )}
        <Alert severity="info" icon={<InfoDot />} sx={{ ...alertSx, bgcolor: '#dbe8fb', color: '#1a4fa0' }}>
          This profile will save as <b>{coreMissing.length || uploaded < DOC_CATEGORIES.length ? 'Pending Review' : 'Complete'}</b>.
        </Alert>
        <Field label="Notes for reviewer">
          <TextField {...text('notes')} multiline minRows={2} />
        </Field>
      </Stack>
    </Box>,
  ];

  const last = step === STEPS.length - 1;

  return (
    <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth={false}
      slotProps={{
        paper: { sx: { width: '840px', borderRadius: '14px', maxHeight: '86vh' } },
        // blurred + lightly tinted page behind the dialog
        backdrop: {
          sx: {
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(15, 23, 20, 0.35)',
          },
        },
      }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3.5, pb: 1.5, px: 3.5 }}>
        <Typography sx={{ fontSize: FS.title, fontWeight: 600 }}>{title}</Typography>
        <IconButton size="small" onClick={handleClose} aria-label="Close"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <StepTabs active={step} onSelect={setStep} />

      <DialogContent sx={{ px: 3.5, pt: 1.5, pb: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: FS.body }}>{error}</Alert>}
        {bodies[step]}
      </DialogContent>

      <DialogActions sx={{ px: 3.5, py: 2, borderTop: '1px solid #e6e6e6', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: '#555' }}>
          <AccessTimeIcon fontSize="small" />
          <Typography sx={{ fontSize: FS.body }}>{savedAt ? `Saved at ${savedAt}` : 'Not saved yet'}</Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)} sx={{ ...btnSx, color: GREEN, fontWeight: 500 }}>Back</Button>
          )}
          <Button variant="outlined" onClick={draft} sx={{ ...btnSx, color: '#222', borderColor: '#d5d5d5' }}>
            Save Draft
          </Button>
          {last ? (
            <Button variant="contained" startIcon={<SendIcon fontSize="small" />} onClick={submit}
              sx={{ ...btnSx, bgcolor: GREEN, '&:hover': { bgcolor: '#0f4f23' } }}>
              Submit for Review
            </Button>
          ) : (
            <Button variant="contained" onClick={saveAndContinue}
              sx={{ ...btnSx, bgcolor: GREEN, '&:hover': { bgcolor: '#0f4f23' } }}>
              Save &amp; Continue
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- step tabs: no scroll bar, left / right arrow buttons ---------- */

function StepTabs({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // keep the active step in view
  useEffect(() => {
    const tab = trackRef.current?.children[active] as HTMLElement | undefined;
    tab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [active]);

  const nudge = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' });
  };

  const arrowSx = {
    flexShrink: 0, width: 28, height: 28, border: '1px solid #d9dde3', color: GREEN, bgcolor: '#fff',
    '&:hover': { bgcolor: '#f1f7f2' },
    '&.Mui-disabled': { color: '#c3c8d0', bgcolor: '#f9fafb' },
  } as const;

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 3.5, pb: 2, flexShrink: 0 }}>
      <IconButton aria-label="Previous steps" disabled={!canLeft} onClick={() => nudge(-1)} sx={arrowSx}>
        <ChevronLeftIcon sx={{ fontSize: 18 }} />
      </IconButton>

      <Box
        ref={trackRef}
        sx={{
          display: 'flex', gap: 1, flex: 1, minWidth: 0, overflowX: 'auto',
          scrollbarWidth: 'none', msOverflowStyle: 'none',          // Firefox / old Edge
          '&::-webkit-scrollbar': { display: 'none' },              // Chrome / Edge / Safari
        }}
      >
        {STEPS.map((s, i) => {
          const isActive = i === active; const done = i < active;
          return (
            <Chip key={s.label} icon={s.icon} label={s.label} onClick={() => onSelect(i)}
              sx={{
                flexShrink: 0, height: 34, borderRadius: '17px', px: 0, fontSize: FS.chip, fontWeight: isActive ? 600 : 400,
                bgcolor: isActive ? GREEN : done ? GREEN_SOFT : '#f0f1f1',
                color: isActive ? '#fff' : done ? '#1b4d27' : '#444',
                '& .MuiChip-icon': {
                  color: 'inherit', ml: '14px', mr: 0,
                  // the icons are <img> SVGs, so colour can't be inherited: turn them white on the green (active) tab
                  filter: isActive ? 'brightness(0) invert(1)' : 'none',
                },
                '& .MuiChip-label': { pl: '10px', pr: '14px' },
                '&:hover': { bgcolor: isActive ? GREEN : done ? '#b5e2be' : '#e6e7e7' },
              }} />
          );
        })}
      </Box>

      <IconButton aria-label="Next steps" disabled={!canRight} onClick={() => nudge(1)} sx={arrowSx}>
        <ChevronRightIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Stack>
  );
}

function InfoDot() {
  return (
    <Box component="span" sx={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid currentColor',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>i</Box>
  );
}
