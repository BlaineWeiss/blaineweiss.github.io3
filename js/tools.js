(function () {
  const fileInput = document.getElementById('file-input');
  const extractBtn = document.getElementById('extract-btn');
  const output = document.getElementById('metadata-output');
  const copyBtn = document.getElementById('copy-btn');

  function parseTiffMetadata(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    if (view.byteLength < 8) return {};
    const little = view.getUint8(0) === 0x49 && view.getUint8(1) === 0x49;
    const get16 = (o) => view.getUint16(o, little);
    const get32 = (o) => view.getUint32(o, little);
    if (get16(2) !== 42) return {};
    const ifd = get32(4);
    if (ifd + 2 >= view.byteLength) return {};

    const count = get16(ifd);
    const meta = {};
    for (let i = 0; i < count; i++) {
      const off = ifd + 2 + i * 12;
      if (off + 12 > view.byteLength) continue;
      const tag = get16(off);
      const type = get16(off + 2);
      const itemCount = get32(off + 4);
      const valOff = get32(off + 8);
      if (tag === 0x0100) meta.width = type === 3 ? get16(off + 8) : get32(off + 8);
      if (tag === 0x0101) meta.height = type === 3 ? get16(off + 8) : get32(off + 8);
      if (tag === 0x010E && valOff + itemCount < view.byteLength) {
        let s = '';
        for (let j = 0; j < itemCount; j++) {
          const c = view.getUint8(valOff + j);
          if (!c) break;
          s += String.fromCharCode(c);
        }
        meta.description = s;
      }
    }
    return meta;
  }

  function setOut(message) {
    if (output) output.textContent = message;
    if (copyBtn) copyBtn.disabled = !message;
  }

  if (fileInput && extractBtn && output) {
    fileInput.addEventListener('change', () => {
      extractBtn.disabled = !fileInput.files.length;
      setOut('');
    });

    extractBtn.addEventListener('click', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      setOut('Reading file...');
      reader.onload = function (e) {
        let meta = {};
        try {
          meta = parseTiffMetadata(e.target.result);
        } catch (_) {}
        let out = `File: ${file.name}\nSize: ${file.size.toLocaleString()} bytes`;
        if (meta.width || meta.height) {
          out += `\nWidth: ${meta.width || '?'} px\nHeight: ${meta.height || '?'} px`;
        }
        if (meta.description) out += `\n\nDescription Snippet:\n${meta.description.slice(0, 450)}`;
        if (!meta.width && !meta.height && !meta.description) {
          out += '\n\nUnable to parse key metadata from this TIFF variant.';
        }
        setOut(out);
      };
      reader.onerror = () => setOut('Failed to read selected file.');
      reader.readAsArrayBuffer(file);
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!output.textContent) return;
      await navigator.clipboard.writeText(output.textContent);
      copyBtn.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Results';
      }, 1200);
    });
  }

  const px = document.getElementById('px-value');
  const mpp = document.getElementById('mpp-value');
  const convertBtn = document.getElementById('convert-btn');
  const convertOut = document.getElementById('convert-output');
  if (convertBtn && px && mpp && convertOut) {
    convertBtn.addEventListener('click', () => {
      const pxValue = Number(px.value);
      const mppValue = Number(mpp.value);
      if (!pxValue || !mppValue) {
        convertOut.textContent = 'Enter valid positive values.';
        return;
      }
      const microns = pxValue * mppValue;
      const mm = microns / 1000;
      convertOut.textContent = `${pxValue} px = ${microns.toFixed(2)} µm (${mm.toFixed(3)} mm)`;
    });
  }

  const fps = document.getElementById('fps-value');
  const fpsBtn = document.getElementById('fps-btn');
  const fpsOut = document.getElementById('fps-output');
  if (fpsBtn && fps && fpsOut) {
    fpsBtn.addEventListener('click', () => {
      const v = Number(fps.value);
      if (!v) {
        fpsOut.textContent = 'Enter a valid frame rate.';
        return;
      }
      const ms = 1000 / v;
      fpsOut.textContent = `Frame interval: ${ms.toFixed(2)} ms (${(1 / v).toFixed(4)} s).`;
    });
  }
})();
