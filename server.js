/**
 * Servidor local para Fronteira in Concert PWA
 * Sirve estáticos + API de contenido editable + subida de imágenes
 */
const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { enrichContent } = require('./lib/cronograma-pt');

function stripOrquestaLogos(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data.orquestas)) {
    data.orquestas = data.orquestas.map((o) => {
      if (!o || typeof o !== 'object') return o;
      return { ...o, logo: '' };
    });
  }
  return data;
}


const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fronteira2026';
const PUBLIC_DIR = path.join(__dirname, 'public');
const BUNDLE_CONTENT = path.join(__dirname, 'data', 'content.json');
const BUNDLE_UPLOADS = path.join(PUBLIC_DIR, 'uploads');

// Prefer Render persistent disk (/var/data) when mounted; else app directory.
const PERSIST_ROOT = (() => {
  const fromEnv = process.env.PERSIST_DIR || process.env.RENDER_DISK_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  if (fs.existsSync('/var/data')) return '/var/data';
  return __dirname;
})();
const DATA_DIR = path.join(PERSIST_ROOT, 'data');
const CONTENT_PATH = path.join(DATA_DIR, 'content.json');
const UPLOAD_DIR = path.join(PERSIST_ROOT, PERSIST_ROOT === __dirname ? path.join('public', 'uploads') : 'uploads');

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4']);
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
ensureDir(DATA_DIR);
ensureDir(UPLOAD_DIR);

function seedPersistFromBundle() {
  // Copy repo content/uploads onto disk only when missing (never clobber newer live data).
  try {
    if (!fs.existsSync(CONTENT_PATH) && fs.existsSync(BUNDLE_CONTENT)) {
      fs.copyFileSync(BUNDLE_CONTENT, CONTENT_PATH);
      console.log('seed_content', CONTENT_PATH);
    }
  } catch (err) {
    console.error('seed_content failed', err);
  }
  try {
    if (!fs.existsSync(BUNDLE_UPLOADS)) return;
    for (const name of fs.readdirSync(BUNDLE_UPLOADS)) {
      if (name === '.gitkeep') continue;
      const dest = path.join(UPLOAD_DIR, name);
      if (fs.existsSync(dest)) continue;
      const src = path.join(BUNDLE_UPLOADS, name);
      try {
        fs.copyFileSync(src, dest);
      } catch (e) {
        console.error('seed_upload failed', name, e.message);
      }
    }
  } catch (err) {
    console.error('seed_uploads failed', err);
  }
}
seedPersistFromBundle();
console.log('persist_root', PERSIST_ROOT, 'content', CONTENT_PATH, 'uploads', UPLOAD_DIR);

const app = express();
app.use(express.json({ limit: '2mb' }));

// Estáticos
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/data', express.static(DATA_DIR));

function readContent() {
  const raw = fs.readFileSync(CONTENT_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeContent(data) {
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(data, null, 2), 'utf8');
}

const GH_REPO = process.env.GITHUB_REPO || 'manproduccionesfull-creator/fronteira-in-concert';
const GH_BRANCH = process.env.GITHUB_BRANCH || 'main';

async function persistToGithub(relPath, buffer, message) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const err = new Error('Sin GITHUB_TOKEN en Render (respaldo externo activo)');
    err.code = 'NO_TOKEN';
    throw err;
  }
  const api = 'https://api.github.com/repos/' + GH_REPO + '/contents/' + relPath.split('/').map(encodeURIComponent).join('/');
  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'fronteira-app',
    'Content-Type': 'application/json',
  };
  let sha;
  const current = await fetch(api + '?ref=' + encodeURIComponent(GH_BRANCH), { headers });
  if (current.status === 200) {
    sha = (await current.json()).sha;
  } else if (current.status !== 404) {
    const err = await current.text();
    throw new Error('No se pudo guardar en GitHub (' + current.status + '): ' + String(err).slice(0, 180));
  }
  const body = {
    message,
    content: Buffer.from(buffer).toString('base64'),
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;
  const put = await fetch(api, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!put.ok) {
    const err = await put.text();
    throw new Error('No se pudo guardar en GitHub (' + put.status + '): ' + String(err).slice(0, 180));
  }
  return true;
}

function hasPersistDisk() {
  return PERSIST_ROOT !== __dirname;
}

function checkAdmin(req, res) {
  const pwd = req.get('X-Admin-Password') || '';
  if (pwd !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Contraseña incorrecta' });
    return false;
  }
  return true;
}

/**
 * Parseo multipart/form-data mínimo (un solo archivo "file").
 * Sin dependencias externas.
 */
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const ctype = req.headers['content-type'] || '';
    const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype);
    if (!m) {
      reject(new Error('Content-Type multipart inválido'));
      return;
    }
    const boundary = m[1] || m[2];
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES + 64 * 1024) {
        reject(new Error('Archivo demasiado grande (máx. 12 MB)'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks);
        const result = extractFileFromMultipart(buf, boundary);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function extractFileFromMultipart(buf, boundary) {
  const delim = Buffer.from('--' + boundary);
  let start = indexOf(buf, delim, 0);
  if (start < 0) throw new Error('No se encontró el límite multipart');

  while (start < buf.length) {
    let partStart = start + delim.length;
    // Skip leading CRLF after boundary
    if (buf[partStart] === 0x0d && buf[partStart + 1] === 0x0a) partStart += 2;
    // Closing boundary
    if (buf[partStart] === 0x2d && buf[partStart + 1] === 0x2d) break;

    const next = indexOf(buf, delim, partStart);
    if (next < 0) break;

    // Part ends before \r\n--boundary
    let partEnd = next;
    if (partEnd >= 2 && buf[partEnd - 2] === 0x0d && buf[partEnd - 1] === 0x0a) {
      partEnd -= 2;
    }

    const headerEnd = indexOf(buf, Buffer.from('\r\n\r\n'), partStart);
    if (headerEnd < 0 || headerEnd >= partEnd) {
      start = next;
      continue;
    }

    const headerStr = buf.slice(partStart, headerEnd).toString('utf8');
    const bodyStart = headerEnd + 4;
    const body = buf.slice(bodyStart, partEnd);

    const nameMatch = /name="([^"]+)"/i.exec(headerStr);
    const fileMatch = /filename="([^"]*)"/i.exec(headerStr);
    if (nameMatch && nameMatch[1] === 'file' && fileMatch) {
      const originalName = path.basename(fileMatch[1] || 'upload.bin');
      return { originalName, buffer: body };
    }
    start = next;
  }
  throw new Error('No se encontró el campo file');
}

function indexOf(haystack, needle, from) {
  return haystack.indexOf(needle, from);
}

function safeExt(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (ALLOWED_EXT.has(ext)) return ext;
  return '';
}


function preserveFestivalVideo(incoming, previous) {
  if (!incoming || typeof incoming !== 'object') return incoming;
  const fest = incoming.festival;
  if (!fest || typeof fest !== 'object') return incoming;
  const prevFest = (previous && previous.festival) || {};
  const prevVideo = prevFest.video || '';
  const mostrar = fest.mostrar || {};
  const incomingVideo = String(fest.video || '').trim();
  // Keep previous video unless admin explicitly turned video off
  if (!incomingVideo && prevVideo && mostrar.video !== false) {
    fest.video = prevVideo;
    fest.mostrar = mostrar;
    if (fest.mostrar.video === undefined) fest.mostrar.video = true;
  }
  // Default clip if still empty and file exists on disk
  const defaultVideo = '/uploads/inicio-15s.mp4';
  const defaultPath = path.join(UPLOAD_DIR, 'inicio-15s.mp4');
  if (!String(fest.video || '').trim() && mostrar.video !== false && fs.existsSync(defaultPath)) {
    fest.video = defaultVideo;
    fest.mostrar = fest.mostrar || {};
    if (fest.mostrar.video === undefined) fest.mostrar.video = true;
  }
  return incoming;
}

app.get('/api/content', (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(stripOrquestaLogos(readContent()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo leer el contenido' });
  }
});

app.post('/api/content', async (req, res) => {
  if (!checkAdmin(req, res)) return;
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  try {
    const required = ['festival', 'contacto', 'cronograma', 'sedes', 'orquestas', 'profesores', 'apoyan'];
    for (const key of required) {
      if (!(key in req.body)) {
        return res.status(400).json({ error: 'Falta la seccion: ' + key });
      }
    }
    const previous = readContent();
    let payload = enrichContent(req.body);
    payload = stripOrquestaLogos(payload);
    payload = preserveFestivalVideo(payload, previous);
    if (!payload.conciertos && previous && previous.conciertos) {
      payload.conciertos = previous.conciertos;
    }
    writeContent(payload);
    const durable = { disk: hasPersistDisk(), github: false };
    const warnings = [];
    try {
      await persistToGithub('data/content.json', fs.readFileSync(CONTENT_PATH), 'Guardar contenido del festival');
      durable.github = true;
    } catch (err) {
      console.error('persist_content', err);
      warnings.push(err.message || String(err));
    }
    // Also mirror into repo bundle path when using external disk (helps next build)
    try {
      if (hasPersistDisk() && BUNDLE_CONTENT !== CONTENT_PATH) {
        ensureDir(path.dirname(BUNDLE_CONTENT));
        fs.copyFileSync(CONTENT_PATH, BUNDLE_CONTENT);
      }
    } catch (err) {
      console.error('mirror_bundle_content', err);
    }
    // Local save always succeeds. Durable = GitHub token, Render disk, or external backup routine.
    let message = 'Contenido guardado.';
    if (durable.github) message = 'Contenido guardado (también en GitHub).';
    else if (durable.disk) message = 'Contenido guardado en disco persistente.';
    else {
      message = 'Contenido guardado. El respaldo a GitHub lo hace HOLA automáticamente.';
      warnings.push('Sin GITHUB_TOKEN/disco en Render: no redesplegar hasta que HOLA respalde.');
    }
    res.json({
      ok: true,
      message,
      content: payload,
      durable,
      warnings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

app.post('/api/upload', async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { originalName, buffer } = await parseMultipart(req);
    if (!buffer || !buffer.length) {
      return res.status(400).json({ error: 'Archivo vacío' });
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: 'Archivo demasiado grande (máx. 12 MB)' });
    }
    const ext = safeExt(originalName);
    if (!ext) {
      return res.status(400).json({
        error: 'Tipo no permitido. Usá JPG, PNG, WEBP, GIF, SVG o MP4',
      });
    }
    const stamp = Date.now().toString(36);
    const rand = crypto.randomBytes(4).toString('hex');
    let filename = `${stamp}-${rand}${ext}`;
    let dest = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(dest, buffer);

    // Shrink photos/logos for cheaper bandwidth (skip video/svg)
    const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
    if (IMAGE_EXT.has(ext)) {
      let outExt = ext === '.jpeg' ? '.jpg' : ext;
      if (ext === '.png' && String(req.query.keepPng || '') !== '1') outExt = '.jpg';
      const outName = `${stamp}-${rand}${outExt}`;
      const outDest = path.join(UPLOAD_DIR, outName);
      try {
        let pipeline = sharp(buffer, { failOn: 'none' }).rotate();
        const meta = await pipeline.metadata();
        const w = meta.width || 0;
        const h = meta.height || 0;
        if (Math.max(w, h) > 1600) {
          pipeline = sharp(buffer, { failOn: 'none' }).rotate().resize({
            width: 1600,
            height: 1600,
            fit: 'inside',
            withoutEnlargement: true,
          });
        } else {
          pipeline = sharp(buffer, { failOn: 'none' }).rotate();
        }
        let outBuf;
        if (outExt === '.jpg') {
          outBuf = await pipeline.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
        } else if (outExt === '.webp') {
          outBuf = await pipeline.webp({ quality: 80 }).toBuffer();
        } else if (outExt === '.png') {
          outBuf = await pipeline.png({ compressionLevel: 8, palette: true }).toBuffer();
        } else if (outExt === '.gif') {
          // sharp does not optimize animated gif well — keep original
          outBuf = buffer;
        } else {
          outBuf = await pipeline.toBuffer();
        }
        if (outBuf && outBuf.length && (outBuf.length < buffer.length || outExt !== ext)) {
          fs.writeFileSync(outDest, outBuf);
          try { if (outDest !== dest) fs.unlinkSync(dest); } catch (_) {}
          filename = outName;
          dest = outDest;
          console.log('compress_image', originalName, buffer.length, '->', outBuf.length);
        }
      } catch (compressErr) {
        console.error('compress_image failed', compressErr);
        // keep original dest
      }
    }

    // Profes: smart square crop so the circle fills without empty gaps
    const fit = String(req.query.fit || '').toLowerCase();
    if (false && fit === 'prof' && ext !== '.svg') { // DISABLED_PROF_CROP keep originals like pre-Adilson look
      const croppedName = `${stamp}-${rand}-prof.jpg`;
      const croppedDest = path.join(UPLOAD_DIR, croppedName);
      const script = path.join(__dirname, 'scripts', 'smart_prof_crop.py');
      const env = { ...process.env, PYTHONPATH: '/workspace/.venv/lib/python3.13/site-packages' };
      const run = spawnSync('python3', [script, dest, croppedDest], {
        encoding: 'utf8',
        env,
        timeout: 30000,
      });
      if (run.status === 0 && fs.existsSync(croppedDest)) {
        try { fs.unlinkSync(dest); } catch (_) {}
        filename = croppedName;
        dest = croppedDest;
      } else {
        console.error('smart_prof_crop failed', run.stderr || run.stdout || run.error);
      }
    }

    const url = '/uploads/' + filename;
    const durable = { disk: hasPersistDisk(), github: false };
    const warnings = [];
    try {
      await persistToGithub('public/uploads/' + filename, fs.readFileSync(dest), 'Guardar imagen ' + filename);
      durable.github = true;
    } catch (err) {
      console.error('persist_upload', err);
      warnings.push(err.message || String(err));
    }
    try {
      if (hasPersistDisk()) {
        const bundleDest = path.join(BUNDLE_UPLOADS, filename);
        ensureDir(BUNDLE_UPLOADS);
        if (bundleDest !== dest) fs.copyFileSync(dest, bundleDest);
      }
    } catch (err) {
      console.error('mirror_bundle_upload', err);
    }
    let message = 'ok';
    if (!durable.github && !durable.disk) {
      warnings.push('Foto en servidor temporal: HOLA la respalda a GitHub. Evitá Manual Deploy hasta el respaldo.');
    }
    res.json({ ok: true, url, filename, durable, warnings, message });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'No se pudo subir el archivo' });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    persistRoot: PERSIST_ROOT,
    disk: hasPersistDisk(),
    githubToken: !!process.env.GITHUB_TOKEN,
    contentExists: fs.existsSync(CONTENT_PATH),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Fronteira in Concert -> http://localhost:' + PORT);
  console.log('Admin: http://localhost:' + PORT + '/admin.html');
  console.log('Persistencia:', hasPersistDisk() ? 'disco ' + PERSIST_ROOT : 'solo efímero + GitHub');
});
