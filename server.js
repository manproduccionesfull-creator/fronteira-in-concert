/**
 * Servidor local para Fronteira in Concert PWA
 * Sirve estáticos + API de contenido editable + subida de imágenes
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { enrichContent } = require('./lib/cronograma-pt');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fronteira2026';
const CONTENT_PATH = path.join(__dirname, 'data', 'content.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4']);
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// Estáticos
app.use(express.static(PUBLIC_DIR));
app.use('/data', express.static(path.join(__dirname, 'data')));

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
  if (!token) return;
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
    throw new Error('No se pudo guardar en GitHub (' + current.status + ')');
  }
  const body = {
    message,
    content: Buffer.from(buffer).toString('base64'),
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;
  const put = await fetch(api, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!put.ok) {
    throw new Error('No se pudo guardar en GitHub (' + put.status + ')');
  }
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
    res.json(readContent());
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
    payload = preserveFestivalVideo(payload, previous);
    writeContent(payload);
    try {
      await persistToGithub('data/content.json', fs.readFileSync(CONTENT_PATH), 'Guardar contenido del festival');
    } catch (err) {
      console.error(err);
    }
    res.json({ ok: true, message: 'Contenido guardado', content: payload });
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
    try {
      await persistToGithub('public/uploads/' + filename, fs.readFileSync(dest), 'Guardar imagen ' + filename);
    } catch (err) {
      console.error(err);
    }
    res.json({ ok: true, url, filename });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'No se pudo subir el archivo' });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Fronteira in Concert -> http://localhost:' + PORT);
  console.log('Admin: http://localhost:' + PORT + '/admin.html');
});
