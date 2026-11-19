import qrcode from 'qrcode-generator';

/**
 * QR code for the install page.
 *
 * Someone reading bolingo.co.ke/install on a laptop cannot tap the download
 * button with their phone, so the page shows a code that carries the same
 * absolute file URL. This module owns the encoding so the web-publish gate can
 * rasterize the matrix it returns and decode it back with a real reader —
 * a code that does not scan is worse than no code at all.
 *
 * `qrcode-generator` is pure JavaScript with no dependencies, so it bundles for
 * web and native alike; nothing here touches the DOM or React Native.
 *
 * The gate (`npm run check:web`) rasterizes `pathData` — the exact string the
 * browser paints — and decodes it with a real reader, `jsqr`.
 */

export type QrMatrix = {
  /** Modules per side, quiet zone excluded. */
  count: number;
  /** `rows[row][col]` — true is a dark module. */
  rows: boolean[][];
  /**
   * The same matrix as SVG path data in module units: one `h`-run per row of
   * dark modules, so a 29×29 code stays a few hundred bytes instead of ~900
   * separate rectangles. Pair with `viewBox="0 0 count count"`.
   */
  pathData: string;
};

/**
 * Encode `payload` as a QR matrix.
 *
 * Version is chosen automatically (a 38-character URL lands on version 3,
 * 29×29 at ~439 modules), and error correction defaults to level M — 15% of
 * the code can be damaged or covered and it still reads, which is what a
 * screen-then-camera handoff needs.
 */
export function qrMatrix(payload: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'): QrMatrix {
  const qr = qrcode(0, errorCorrectionLevel);
  qr.addData(payload, 'Byte');
  qr.make();

  const count = qr.getModuleCount();
  const rows: boolean[][] = [];
  let pathData = '';

  for (let row = 0; row < count; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < count; col += 1) line.push(qr.isDark(row, col));
    rows.push(line);

    // Merge each run of dark modules in the row into one rectangle.
    let col = 0;
    while (col < count) {
      if (!line[col]) {
        col += 1;
        continue;
      }
      let end = col;
      while (end < count && line[end]) end += 1;
      pathData += `M${col} ${row}h${end - col}v1h-${end - col}z`;
      col = end;
    }
  }

  return { count, rows, pathData };
}
