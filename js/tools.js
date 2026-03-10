// tools.js
// This script provides a simple client‑side parser for TIFF/OME‑TIFF files.
// It extracts basic metadata such as image width, height and resolution
// directly from the binary header of the file. It does not support
// compressed TIFFs or files with multiple IFDs, but it works for many
// microscope images. When parsing fails, it falls back to showing the
// selected file name.

(function () {
  const fileInput = document.getElementById('file-input');
  const extractBtn = document.getElementById('extract-btn');
  const output = document.getElementById('metadata-output');

  if (!fileInput || !extractBtn || !output) return;

  function parseTiffMetadata(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    // Check for minimum length
    if (view.byteLength < 8) return {};
    // Determine endianness: 'II' (0x49 0x49) little-endian; 'MM' big-endian
    const byteOrder1 = view.getUint8(0);
    const byteOrder2 = view.getUint8(1);
    const littleEndian = byteOrder1 === 0x49 && byteOrder2 === 0x49;
    const getUint16 = (offset) => view.getUint16(offset, littleEndian);
    const getUint32 = (offset) => view.getUint32(offset, littleEndian);
    // Ensure TIFF magic number (42 or 43 for BigTIFF) at bytes 2-3
    const magic = getUint16(2);
    if (magic !== 42 && magic !== 43) return {};
    // Offset to first IFD (Image File Directory) is at bytes 4-7
    const firstIFDOffset = magic === 42 ? getUint32(4) : getUint64(view, 4, littleEndian);
    // Guard against invalid offset
    if (firstIFDOffset + 2 > view.byteLength) return {};
    const numEntries = getUint16(firstIFDOffset);
    let width,
      height,
      xRes,
      yRes;
    let description;
    const typeSizeMap = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 16: 8 };
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = firstIFDOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) continue;
      const tag = getUint16(entryOffset);
      const type = getUint16(entryOffset + 2);
      const count = getUint32(entryOffset + 4);
      const size = (typeSizeMap[type] || 0) * count;
      let valueOffset;
      if (size <= 4) {
        valueOffset = entryOffset + 8;
      } else {
        valueOffset = getUint32(entryOffset + 8);
        if (valueOffset + size > view.byteLength) continue;
      }
      if (tag === 0x0100) {
        // ImageWidth
        width = type === 3 ? getUint16(valueOffset) : getUint32(valueOffset);
      } else if (tag === 0x0101) {
        // ImageLength
        height = type === 3 ? getUint16(valueOffset) : getUint32(valueOffset);
      } else if (tag === 0x011A) {
        // XResolution (rational)
        const num = getUint32(valueOffset);
        const denom = getUint32(valueOffset + 4);
        xRes = denom ? num / denom : undefined;
      } else if (tag === 0x011B) {
        // YResolution (rational)
        const num = getUint32(valueOffset);
        const denom = getUint32(valueOffset + 4);
        yRes = denom ? num / denom : undefined;
      } else if (tag === 0x010E) {
        // ImageDescription (ASCII string). Contains OME-XML or other metadata.
        // Type 2 (ASCII) has 1-byte characters. 'count' indicates length including null terminator.
        const len = size;
        let chars = [];
        for (let j = 0; j < len && valueOffset + j < view.byteLength; j++) {
          const c = view.getUint8(valueOffset + j);
          if (c === 0) break; // stop at null terminator
          chars.push(String.fromCharCode(c));
        }
        description = chars.join('');
      }
    }
    const meta = { width, height, xResolution: xRes, yResolution: yRes };
    // Parse additional metadata from description if available
    if (description) {
      // If the description looks like XML, attempt to parse OME elements
      try {
        if (description.trim().startsWith('<')) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(description, 'application/xml');
          const pixels = xmlDoc.getElementsByTagName('Pixels')[0];
          if (pixels) {
            // Extract attributes if present
            const physX = pixels.getAttribute('PhysicalSizeX');
            const physY = pixels.getAttribute('PhysicalSizeY');
            const physZ = pixels.getAttribute('PhysicalSizeZ');
            const physUnit = pixels.getAttribute('PhysicalSizeXUnit') || pixels.getAttribute('PhysicalSizeYUnit');
            const timeInc = pixels.getAttribute('TimeIncrement');
            const timeUnit = pixels.getAttribute('TimeIncrementUnit');
            const frameRate = pixels.getAttribute('FrameRate');
            if (physX) meta.physicalSizeX = parseFloat(physX);
            if (physY) meta.physicalSizeY = parseFloat(physY);
            if (physZ) meta.physicalSizeZ = parseFloat(physZ);
            if (physUnit) meta.physicalSizeUnit = physUnit;
            if (timeInc) meta.timeIncrement = parseFloat(timeInc);
            if (timeUnit) meta.timeIncrementUnit = timeUnit;
            if (frameRate) meta.frameRate = parseFloat(frameRate);
          }
        } else {
          // For non-XML descriptions (e.g. ScanImage or Prairie View), try to find numeric info
          // Example patterns: 'micronsPerPixelX = 0.2' or 'frameRate = 30'
          const patterns = {
            physicalSizeX: /micronsPerPixelX\s*=\s*([0-9.]+)/i,
            physicalSizeY: /micronsPerPixelY\s*=\s*([0-9.]+)/i,
            frameRate: /frame\s*rate\s*[:=]\s*([0-9.]+)/i,
            timeIncrement: /time\s*increment\s*[:=]\s*([0-9.]+)/i
          };
          for (const key in patterns) {
            const match = description.match(patterns[key]);
            if (match) meta[key] = parseFloat(match[1]);
          }
        }
      } catch (err) {
        // ignore parsing errors
      }
    }
    return meta;
  }
  // Helper for reading 64‑bit integers for BigTIFF (not fully supported)
  function getUint64(view, offset, little) {
    const low = view.getUint32(offset, little);
    const high = view.getUint32(offset + 4, little);
    return little ? high * 0x100000000 + low : low * 0x100000000 + high;
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const buffer = e.target.result;
      let meta;
      try {
        meta = parseTiffMetadata(buffer);
      } catch (err) {
        meta = {};
      }
      // Build output string
      let out = `File: ${file.name}\nSize: ${file.size.toLocaleString()} bytes`;
      if (meta && (meta.width || meta.height)) {
        out += `\nWidth: ${meta.width ?? '?'} px\nHeight: ${meta.height ?? '?'} px`;
      }
      if (meta && (meta.xResolution || meta.yResolution)) {
        out += `\nX Resolution: ${meta.xResolution ?? '?'}\nY Resolution: ${meta.yResolution ?? '?'}`;
      }
      // Additional metadata if available
      if (meta && (meta.physicalSizeX || meta.physicalSizeY || meta.physicalSizeZ)) {
        const unit = meta.physicalSizeUnit ? ` ${meta.physicalSizeUnit.replace(/micro|Micro/, '\u03bcm')}` : ' units';
        if (meta.physicalSizeX)
          out += `\nPixel Size X: ${meta.physicalSizeX}${unit}`;
        if (meta.physicalSizeY)
          out += `\nPixel Size Y: ${meta.physicalSizeY}${unit}`;
        if (meta.physicalSizeZ)
          out += `\nPixel Size Z: ${meta.physicalSizeZ}${unit}`;
      }
      if (meta && meta.timeIncrement) {
        const unit = meta.timeIncrementUnit ? ` ${meta.timeIncrementUnit}` : ' s';
        out += `\nTime Increment: ${meta.timeIncrement}${unit}`;
      }
      if (meta && meta.frameRate) {
        out += `\nFrame Rate: ${meta.frameRate} Hz`;
      }
      if (!meta || (!meta.width && !meta.height && !meta.xResolution && !meta.yResolution)) {
        out += `\n\nUnable to parse metadata from this file.`;
      }
      output.textContent = out;
    };
    reader.onerror = function () {
      output.textContent = `Failed to read file: ${file.name}`;
    };
    reader.readAsArrayBuffer(file);
  }

  fileInput.addEventListener('change', () => {
    extractBtn.disabled = !fileInput.files.length;
    output.textContent = '';
  });
  extractBtn.addEventListener('click', () => {
    if (!fileInput.files.length) return;
    const file = fileInput.files[0];
    handleFile(file);
  });
})();