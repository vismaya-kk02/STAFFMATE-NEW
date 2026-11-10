import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
  type TextFieldProps,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import FlightLandOutlinedIcon from '@mui/icons-material/FlightLandOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlined';
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import SendIcon from '@mui/icons-material/Send';

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
  { label: '1. Identification', icon: <BadgeOutlinedIcon fontSize="small" /> },
  { label: '2. Contact', icon: <PhoneOutlinedIcon fontSize="small" /> },
  { label: '3. Preparation', icon: <FlightLandOutlinedIcon fontSize="small" /> },
  { label: '4. Employment & SP', icon: <WorkOutlineIcon fontSize="small" /> },
  { label: '5. Assignment', icon: <FactoryOutlinedIcon fontSize="small" /> },
  { label: '6. Accommodation', icon: <ApartmentOutlinedIcon fontSize="small" /> },
  { label: '7. Documents', icon: <ArticleOutlinedIcon fontSize="small" /> },
  { label: '8. Summary', icon: <ChecklistIcon fontSize="small" /> },
];

const GREEN = '#14632c';
const GREEN_SOFT = '#c8ebcf';
const GREEN_LINE = '#2e7d32';

/* ---------- small helpers ---------- */

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff' } };
const labelSx = { fontSize: 15, color: '#3c3c3c', mb: 0.75 };

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <Box>
      <Typography sx={labelSx}>{label}{required && ' *'}</Typography>
      {children}
    </Box>
  );
}

const Grid2 = ({ children }: { children: ReactNode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>{children}</Box>
);

function FileInput({ file, onChange, accept }: { file: File | null; onChange: (f: File | null) => void; accept?: string }) {
  return (
    <Box sx={{ border: '1px solid #c4c4c4', borderRadius: '10px', px: 1.5, py: 1.4, bgcolor: '#fff' }}>
      <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file && <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{file.name}</Typography>}
    </Box>
  );
}

const note = (text: string) => (
  <Typography sx={{ color: '#6b6b6b', fontSize: 15, lineHeight: 1.6 }}>{text}</Typography>
);

function spBadge(f: WorkerForm) {
  if (!f.spEvidence) return { text: 'SP – Not Registered', color: '#c62828', bg: '#fdeaea' };
  if (!f.spVerified) return { text: 'SP – Pending verification', color: '#b26a00', bg: '#fff3e0' };
  if (!f.spEffectiveFrom) return { text: 'SP – Verified, no effective date', color: '#b26a00', bg: '#fff3e0' };
  return { text: 'SP – Registered', color: GREEN, bg: '#e6f4ea' };
}

/* ---------- page ---------- */

interface Props {
  open?: boolean;
  onClose?: () => void;
  onSaved?: (worker: WorkerForm, status: 'Draft' | 'Pending Review') => void;
}

export default function AddWorkerPage({ open = true, onClose, onSaved }: Props) {
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
  const submit = () => { if (save()) { onSaved?.(form, 'Pending Review'); onClose?.(); } };
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
    <Stack spacing={2.5} key="id">
      <Grid2>
        <Field label="First Name" required><TextField {...text('firstName')} /></Field>
        <Field label="Surname" required><TextField {...text('surname')} /></Field>
        <Field label="Internal ID">
          <TextField value={form.internalId} fullWidth sx={fieldSx} slotProps={{ input: { readOnly: true } }}
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

    <Stack spacing={2.5} key="contact">
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

    <Stack spacing={2.5} key="prep">
      <Grid2>
        <Field label="Responsible Coordinator" required>
          <TextField select {...text('coordinator')}>
            {COORDINATORS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Planned Arrival Date"><TextField {...date('arrivalDate')} /></Field>
        <Field label="Planned Work Start"><TextField {...date('workStart')} /></Field>
        <Field label="Intended Project (optional)">
         <TextField select {...text('intendedProject')} slotProps={{ select: { displayEmpty: true } }}>
            <MenuItem value="">— none yet —</MenuItem>
            {PROJECTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Coordinator interest?">
          <TextField select {...text('coordinatorInterest')}>
            <MenuItem value="No">No</MenuItem><MenuItem value="Yes">Yes</MenuItem>
          </TextField>
        </Field>
      </Grid2>
      {note('Selecting an intended project here does not create an assignment — it’s informational until you complete Step 5.')}
    </Stack>,

    <Stack spacing={2.5} key="emp">
      <Grid2>
        <Field label="Employment Relationship">
          <TextField select {...text('employmentRelationship')}>
            {EMPLOYMENT.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Employment Start Date"><TextField {...date('employmentStart')} /></Field>
        <Field label="Registration Effective From"><TextField {...date('spEffectiveFrom')} /></Field>
      </Grid2>
      <Field label="Supporting Evidence">
        <FileInput file={form.spEvidence} onChange={(f) => set('spEvidence', f)} />
      </Field>
      <FormControlLabel
        control={<Checkbox checked={form.spVerified} onChange={(e) => set('spVerified', e.target.checked)}
          sx={{ '&.Mui-checked': { color: GREEN } }} />}
        label="I confirm this registration evidence has been reviewed (verification — authorised users only)"
      />
      {note('There is no separate status picker — the badge is derived here from whether evidence exists, whether it’s verified, and the effective date, exactly as it will be in the worker profile. An assignment cannot be activated without verified SP registration effective on the planned start date. This is enforced on save, not just in the UI.')}
    </Stack>,

    <Stack spacing={2.5} key="assign">
      <Grid2>
        <Field label="Project">
          <TextField select {...text('project')} slotProps={{ select: { displayEmpty: true } }}>
            <MenuItem value="">— not yet —</MenuItem>
            {PROJECTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Role"><TextField {...text('role')} placeholder="e.g. Production Operator" /></Field>
        <Field label="Assignment Start Date"><TextField {...date('assignmentStart')} /></Field>
      </Grid2>
      {!(form.spVerified && form.spEvidence) && (
        <Alert severity="warning" icon={<InfoDot />}
          sx={{ bgcolor: '#ffe0b2', color: '#7a4a00', borderRadius: '10px', fontSize: 16 }}>
          SP registration is not yet verified — this assignment will save as <b>Planned/Blocked</b> and remain inactive until verified.
        </Alert>
      )}
    </Stack>,

    <Stack spacing={2.5} key="acc">
      <Grid2>
        <Field label="Facility">
          <TextField select {...text('facility')} slotProps={{ select: { displayEmpty: true } }}>
            <MenuItem value="">— not accommodated —</MenuItem>
            {FACILITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        </Field>
        <Field label="Stay Start (planned)"><TextField {...date('stayStart')} /></Field>
        <Field label="Planned Departure"><TextField {...date('plannedDeparture')} /></Field>
      </Grid2>
      {note('A planned stay is information only — it does not reduce available bed capacity until actual check-in is recorded.')}
    </Stack>,

    <Stack spacing={2} key="docs">
      <Typography sx={{ color: '#555', fontSize: 16 }}>
        Upload what you have now — this checklist can be completed progressively. Missing items are tracked, not blocking.
      </Typography>
      <Box
        onClick={() => dropRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); dropFiles(e.dataTransfer.files); }}
        sx={{ border: `2px dashed ${GREEN_LINE}`, borderRadius: '12px', color: GREEN, textAlign: 'center',
          py: 4, px: 2, cursor: 'pointer', '&:hover': { bgcolor: '#f3faf4' } }}>
        <CloudUploadOutlinedIcon />
        <Typography>Drag files here or click to upload — PDF, JPG, PNG. Assign a category to each file.</Typography>
        <input ref={dropRef} type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => { dropFiles(e.target.files); e.target.value = ''; }} />
      </Box>
      <input ref={addRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setDocs((d) => ({ ...d, [addTarget.current]: f }));
          e.target.value = '';
        }} />
      <Table size="medium">
        <TableHead>
          <TableRow>
            {['CATEGORY', 'FILE(S)', 'STATUS', ''].map((h) => (
              <TableCell key={h} sx={{ fontSize: 13, fontWeight: 600, color: '#444', borderBottom: '1px solid #e6e6e6' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {DOC_CATEGORIES.map((c) => {
            const f = docs[c];
            return (
              <TableRow key={c}>
                <TableCell sx={{ fontWeight: 600, fontSize: 17 }}>{c}</TableCell>
                <TableCell sx={{ color: '#666', fontSize: 16 }}>{f ? f.name : '— not uploaded'}</TableCell>
                <TableCell>
                  <Chip size="small" label={f ? 'Uploaded' : 'Missing'}
                    icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: f ? GREEN : '#c62828', ml: '8px !important' }} />}
                    sx={{ bgcolor: f ? '#e6f4ea' : '#fdeaea', color: f ? GREEN : '#c62828', fontWeight: 500, fontSize: 15, height: 32 }} />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" sx={{ color: GREEN, fontSize: 16, textTransform: 'none' }}
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

    <Box key="sum" sx={{ border: '1px solid #e3e3e3', borderRadius: '12px', p: 2.5 }}>
      <Typography sx={{ fontWeight: 600, fontSize: 19, mb: 1.5 }}>
        Profile Summary — {form.firstName || form.surname ? `${form.firstName} ${form.surname}`.trim() : '(no name)'}{' '}
        {savedAt ? `(${form.internalId})` : '(not yet saved)'}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '200px 1fr', rowGap: 1.6, fontSize: 17, alignItems: 'center' }}>
        <span style={{ color: '#666' }}>Completeness</span>
        <span>{uploaded} of {DOC_CATEGORIES.length} document items uploaded, {5 - coreMissing.length}/5 core fields complete</span>
        <span style={{ color: '#666' }}>Coordinator</span><span>{form.coordinator}</span>
        <span style={{ color: '#666' }}>Project</span><span>{form.project || form.intendedProject || 'None selected'}</span>
        <span style={{ color: '#666' }}>SP Status</span>
        <span>
          {(() => { const b = spBadge(form); return (
            <Chip size="small" label={b.text}
              icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: b.color, ml: '8px !important' }} />}
              sx={{ bgcolor: b.bg, color: b.color, fontSize: 15, height: 32 }} />
          ); })()}
        </span>
        <span style={{ color: '#666' }}>Accommodation</span><span>{form.facility || 'Not yet assigned'}</span>
      </Box>
      <Stack spacing={1.5} sx={{ mt: 2.5 }}>
        {coreMissing.length > 0 && (
          <Alert severity="warning" icon={<InfoDot />} sx={{ bgcolor: '#ffe0b2', color: '#7a4a00', borderRadius: '10px', fontSize: 17 }}>
            Missing: {coreMissing.join(', ')}
          </Alert>
        )}
        {uploaded < DOC_CATEGORIES.length && (
          <Alert severity="warning" icon={<InfoDot />} sx={{ bgcolor: '#ffe0b2', color: '#7a4a00', borderRadius: '10px', fontSize: 17 }}>
            {DOC_CATEGORIES.length - uploaded} document item(s) still not uploaded
          </Alert>
        )}
        <Alert severity="info" icon={<InfoDot />} sx={{ bgcolor: '#dbe8fb', color: '#1a4fa0', borderRadius: '10px', fontSize: 17 }}>
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={false}
      slotProps={{ paper: { sx: { width: 'min(1230px, 94vw)', borderRadius: '20px', maxHeight: '88vh' } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3, px: 5 }}>
        <Typography sx={{ fontSize: 28, fontWeight: 600 }}>{title}</Typography>
        <IconButton onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
      </DialogTitle>

      <Box sx={{ px: 5, pb: 1, overflowX: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>
        <Stack direction="row" spacing={1.25} sx={{ width: 'max-content', pb: 1.5 }}>
          {STEPS.map((s, i) => {
            const active = i === step; const done = i < step;
            return (
              <Chip key={s.label} icon={s.icon} label={s.label} onClick={() => setStep(i)}
                sx={{
                  height: 46, borderRadius: '23px', px: 1, fontSize: 18, fontWeight: active ? 600 : 400,
                  bgcolor: active ? GREEN : done ? GREEN_SOFT : '#f0f1f1',
                  color: active ? '#fff' : done ? '#1b4d27' : '#444',
                  '& .MuiChip-icon': { color: 'inherit' },
                  '&:hover': { bgcolor: active ? GREEN : done ? '#b5e2be' : '#e6e7e7' },
                }} />
            );
          })}
        </Stack>
      </Box>

      <DialogContent sx={{ px: 5, pt: 1.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {bodies[step]}
      </DialogContent>

      <DialogActions sx={{ px: 5, py: 2.5, borderTop: '1px solid #e6e6e6', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: '#555' }}>
          <AccessTimeIcon fontSize="small" />
          <Typography sx={{ fontSize: 17 }}>{savedAt ? `Saved at ${savedAt}` : 'Not saved yet'}</Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)} sx={{ color: GREEN, fontSize: 18, textTransform: 'none', fontWeight: 500 }}>Back</Button>
          )}
          <Button variant="outlined" onClick={draft}
            sx={{ color: '#222', borderColor: '#d5d5d5', fontSize: 18, textTransform: 'none', borderRadius: '10px', px: 2.5, py: 1 }}>
            Save Draft
          </Button>
          {last ? (
            <Button variant="contained" startIcon={<SendIcon />} onClick={submit}
              sx={{ bgcolor: GREEN, fontSize: 18, textTransform: 'none', borderRadius: '10px', px: 2.5, py: 1, '&:hover': { bgcolor: '#0f4f23' } }}>
              Submit for Review
            </Button>
          ) : (
            <Button variant="contained" onClick={saveAndContinue}
              sx={{ bgcolor: GREEN, fontSize: 18, textTransform: 'none', borderRadius: '10px', px: 2.5, py: 1, '&:hover': { bgcolor: '#0f4f23' } }}>
              Save &amp; Continue
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

function InfoDot() {
  return (
    <Box component="span" sx={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid currentColor',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>i</Box>
  );
}