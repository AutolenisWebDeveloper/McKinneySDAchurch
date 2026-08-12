import QRCode from "qrcode";

/**
 * QR generation for the printed bulletin (§16). Codes are generated from canonical production
 * URLs, high error-correction for print robustness, with a proper quiet zone and high contrast.
 * SVG is preferred for print (vector-crisp, self-contained, no network request → CSP-safe);
 * PNG data URLs are available for contexts that need a raster <img>.
 */

const DARK = "#0b2233"; // near-black dark denim: >15:1 contrast on white, reliably scannable
const LIGHT = "#ffffff";

type QrOpts = { size?: number; margin?: number; dark?: string; light?: string };

/** Inline SVG markup for a QR code encoding `text`. Never throws (returns "" on failure). */
export async function qrSvg(text: string, opts: QrOpts = {}): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: "svg",
      errorCorrectionLevel: "Q",
      margin: opts.margin ?? 2,
      width: opts.size ?? 160,
      color: { dark: opts.dark ?? DARK, light: opts.light ?? LIGHT },
    });
  } catch {
    return "";
  }
}

/** PNG data URL for a QR code encoding `text`. Never throws (returns "" on failure). */
export async function qrDataUrl(text: string, opts: QrOpts = {}): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "Q",
      margin: opts.margin ?? 2,
      width: opts.size ?? 240,
      color: { dark: opts.dark ?? DARK, light: opts.light ?? LIGHT },
    });
  } catch {
    return "";
  }
}
