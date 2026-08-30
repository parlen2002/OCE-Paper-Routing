/**
 * Minimal JPEG EXIF GPS reader — scans the APP1 segment, walks TIFF IFD0 to the
 * GPSInfo sub-IFD and decodes latitude/longitude rationals. Returns null when
 * the file is not a JPEG, has no EXIF block, or carries no GPS coordinates.
 */

export interface GpsCoord {
  lat: number;
  lng: number;
}

export async function readGpsFromJpeg(file: File): Promise<GpsCoord | null> {
  try {
    if (!/jpe?g$/i.test(file.name) && !/jpeg/i.test(file.type)) return null;
    const buf = await file.slice(0, 1024 * 1024).arrayBuffer();
    const dv = new DataView(buf);
    if (dv.byteLength < 12 || dv.getUint16(0) !== 0xffd8) return null;

    let off = 2;
    while (off + 4 < dv.byteLength) {
      const marker = dv.getUint16(off);
      if ((marker & 0xff00) !== 0xff00) break;
      if (marker === 0xffd8 || (marker >= 0xffd0 && marker <= 0xffd9)) {
        off += 2;
        continue;
      }
      const segLen = dv.getUint16(off + 2);
      if (marker === 0xffe1 && off + 10 < dv.byteLength) {
        // 'Exif\0\0'
        if (
          dv.getUint32(off + 4) === 0x45786966 &&
          dv.getUint16(off + 8) === 0x0000
        ) {
          return parseTiff(dv, off + 10);
        }
      }
      off += 2 + segLen;
    }
  } catch {
    /* unreadable / truncated — treat as no geotag */
  }
  return null;
}

function parseTiff(dv: DataView, base: number): GpsCoord | null {
  try {
    const endian = dv.getUint16(base);
    const le = endian === 0x4949; // 'II' little endian; 'MM' = big
    const u16 = (o: number) => dv.getUint16(base + o, le);
    const u32 = (o: number) => dv.getUint32(base + o, le);
    if (u16(2) !== 0x002a) return null;

    const ifd0 = u32(4);
    const gpsOffset = findLongTag(dv, base, ifd0, 0x8825, le);
    if (gpsOffset == null) return null;

    const count = u16(gpsOffset);
    let latRef = 'N';
    let lngRef = 'E';
    let lat: number | null = null;
    let lng: number | null = null;

    for (let i = 0; i < count; i++) {
      const e = gpsOffset + 2 + i * 12;
      const tag = u16(e);
      const valueOffset = e + 8;
      const rationalAt = (o: number) => u32(o) / Math.max(1, u32(o + 4));
      if (tag === 0x0001) latRef = String.fromCharCode(dv.getUint8(base + valueOffset));
      else if (tag === 0x0003) lngRef = String.fromCharCode(dv.getUint8(base + valueOffset));
      else if (tag === 0x0002) {
        const o = u32(valueOffset);
        lat = rationalAt(o) + rationalAt(o + 8) / 60 + rationalAt(o + 16) / 3600;
      } else if (tag === 0x0004) {
        const o = u32(valueOffset);
        lng = rationalAt(o) + rationalAt(o + 8) / 60 + rationalAt(o + 16) / 3600;
      }
    }

    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;
    if (latRef === 'S') lat = -lat;
    if (lngRef === 'W') lng = -lng;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function findLongTag(
  dv: DataView,
  base: number,
  ifdOffset: number,
  target: number,
  le: boolean
): number | null {
  const u16 = (o: number) => dv.getUint16(base + o, le);
  const u32 = (o: number) => dv.getUint32(base + o, le);
  const count = u16(ifdOffset);
  for (let i = 0; i < count; i++) {
    const e = ifdOffset + 2 + i * 12;
    if (u16(e) === target) return u32(e + 8);
  }
  return null;
}
