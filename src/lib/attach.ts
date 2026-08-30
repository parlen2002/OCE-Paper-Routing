import type { Attachment } from './types';
import { readAsDataURL, uid } from './util';
import { readGpsFromJpeg } from './exif';
import { fmtSize } from './util';

const MAX_INLINE = 2.5 * 1024 * 1024; // above this, keep a session-only object URL
const MAX_ACCEPT = 12 * 1024 * 1024;

export interface AttachResult {
  atts: Attachment[];
  skipped: string[];
}

/** Turns picked files into Attachment records, parsing EXIF GPS from JPEGs. */
export async function buildAttachments(files: FileList | File[], by: string): Promise<AttachResult> {
  const atts: Attachment[] = [];
  const skipped: string[] = [];
  for (const f of Array.from(files)) {
    const isImage = /^image\/(jpeg|png|webp|gif)/i.test(f.type);
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    if (!isImage && !isPdf) {
      skipped.push(`${f.name} (only JPG/PNG images and PDF are accepted)`);
      continue;
    }
    if (f.size > MAX_ACCEPT) {
      skipped.push(`${f.name} (over 12 MB limit)`);
      continue;
    }
    let lat: number | undefined;
    let lng: number | undefined;
    if (/jpe?g/i.test(f.name) || /jpeg/i.test(f.type)) {
      const gps = await readGpsFromJpeg(f);
      if (gps) {
        lat = gps.lat;
        lng = gps.lng;
      }
    }
    let url: string;
    if (f.size <= MAX_INLINE) {
      url = await readAsDataURL(f);
    } else {
      url = URL.createObjectURL(f); // session-only preview for very large files
    }
    atts.push({
      id: uid(),
      name: f.name,
      kind: isPdf ? 'pdf' : 'image',
      url,
      geotagged: lat != null && lng != null,
      lat,
      lng,
      by,
      at: Date.now(),
      size: fmtSize(f.size),
    });
  }
  return { atts, skipped };
}
