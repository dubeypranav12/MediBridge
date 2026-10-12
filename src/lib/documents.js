/* Helpers for the patient/doctor medical-documents feature.
   Files are stored as base64 data-URLs inside localStorage (key: mb_docs),
   so the doctor dashboard can read what the patient uploaded - demo only. */

export const DOC_TYPES = [
  { v: 'history', label: 'Medical history' },
  { v: 'lab', label: 'Lab / test report' },
  { v: 'prescription', label: 'Prescription' },
  { v: 'imaging', label: 'Imaging / scan (X-ray, MRI, CT)' },
  { v: 'discharge', label: 'Discharge summary' },
  { v: 'insurance', label: 'Insurance document' },
  { v: 'id', label: 'ID proof' },
  { v: 'other', label: 'Other' },
];
export const typeLabel = (v) => (DOC_TYPES.find((t) => t.v === v) || { label: 'Other' }).label.split(' (')[0];

export const MAX_MB = 1.5;                      // browser storage is small, keep files light
export const MAX_BYTES = MAX_MB * 1024 * 1024;
export const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt';
const OK_EXT = ACCEPT.split(',').map((e) => e.slice(1));

export const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
export const fileTag = (name) => {
  const e = extOf(name);
  return ['jpg', 'jpeg', 'png', 'webp'].includes(e) ? 'IMG' : e === 'docx' ? 'DOC' : e.toUpperCase().slice(0, 4);
};
export const isImage = (d) => (d.mime || '').startsWith('image/');
export const isPdf = (d) => d.mime === 'application/pdf' || extOf(d.fileName) === 'pdf';
export const isText = (d) => (d.mime || '').startsWith('text/') || extOf(d.fileName) === 'txt';

export function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

export function checkFile(f) {
  if (!OK_EXT.includes(extOf(f.name))) return f.name + ': file type not supported (use PDF, image, Word or text).';
  if (f.size > MAX_BYTES) return f.name + ': larger than ' + MAX_MB + ' MB (' + fmtSize(f.size) + ').';
  if (f.size === 0) return f.name + ': the file is empty.';
  return '';
}

export function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('Could not read ' + file.name));
    r.readAsDataURL(file);
  });
}

export function dataUrlToBlob(url) {
  const [head, b64] = url.split(',');
  const mime = (head.match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function downloadDoc(d) {
  const url = URL.createObjectURL(dataUrlToBlob(d.data));
  const a = document.createElement('a');
  a.href = url; a.download = d.fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
