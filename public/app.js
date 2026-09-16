(() => {
  const DAY_LABELS = {
    '2026-10-08': { dia: 'Jue', num: '8', full: 'Jueves 8 de octubre' },
    '2026-10-09': { dia: 'Vie', num: '9', full: 'Viernes 9 de octubre' },
    '2026-10-10': { dia: 'Sáb', num: '10', full: 'Sábado 10 de octubre' },
    '2026-10-11': { dia: 'Dom', num: '11', full: 'Domingo 11 de octubre' },
  };

  let content = null;
  let selectedDay = '2026-10-08';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2800);
  }

  function ejemploBadge(isEjemplo) {
    return isEjemplo ? '<span class="badge">ejemplo</span>' : '';
  }

  function showPanel(id) {
    if (id === 'inscripcion') id = 'contacto';
    $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === id));
    $$('.nav-item').forEach((n) => {
      const on = n.dataset.goto === id;
      n.classList.toggle('active', on);
      if (on) n.setAttribute('aria-current', 'page');
      else n.removeAttribute('aria-current');
    });
    // Hide bottom nav on Inicio (sections opened from explore grid)
    document.body.classList.toggle('on-inicio', id === 'inicio');
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.hidden = id === 'inicio';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  }

  function showLine(el, on, text) {
    if (!el) return;
    if (!on || !String(text || '').trim()) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = text;
  }

  function renderInicio(f) {
    const m = f.mostrar || {};
    const on = (key) => m[key] !== false;
    $('#brand-name').textContent = f.nombre || '';
    $('#brand-edicion').textContent = on('edicion') ? (f.edicion || '') : '';
    showLine($('#hero-edicion'), on('edicion'), f.edicion);
    $('#hero-nombre').textContent = f.nombre || '';
    showLine($('#hero-fechas'), on('fechas'), f.fechas);
    showLine($('#hero-lugar'), on('lugar'), f.lugar);
    showLine($('#hero-blurb'), on('blurb'), f.blurb);
    const orgBits = [];
    if (on('org')) orgBits.push(f.organizacion, f.personeria);
    showLine($('#hero-org'), on('org'), orgBits.filter(Boolean).join(' · '));
    const extra = $('#hero-extra');
    if (extra) {
      const lines = Array.isArray(f.lineas) ? f.lineas : [];
      extra.innerHTML = lines.map((line) => {
        const texto = (line && line.texto) || '';
        if (!texto.trim()) return '';
        return `<p class="hero-extra-line">${escapeHtml(texto)}</p>`;
      }).join('');
    }
    document.title = `${f.nombre || ''} — ${f.edicion || ''}`.replace(/ — $/, '');
    const logo = $('#hero-logo');
    if (logo) {
      if (on('logo') && f.logo) {
        logo.src = f.logo;
        logo.hidden = false;
        logo.style.display = '';
      } else {
        logo.hidden = true;
        logo.removeAttribute('src');
        logo.style.display = 'none';
      }
    }
    const videoRow = $('#hero-video-row');
    const videoWrap = $('#hero-video-wrap');
    const video = $('#hero-video');
    if (videoRow && videoWrap && video) {
      if (on('video') && f.video) {
        videoRow.hidden = false;
        if (video.getAttribute('src') !== f.video) {
          video.src = f.video;
        }
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        const play = () => video.play().catch(() => {});
        if (video.readyState >= 2) play();
        else video.addEventListener('loadeddata', play, { once: true });
      } else {
        videoRow.hidden = true;
        video.removeAttribute('src');
        video.load();
      }
    }
    const linksEl = $('#inicio-links');
    if (linksEl) linksEl.innerHTML = inicioButtons(f).join('');
  }

  function inicioButtons(f) {
    const pages = {
      cronograma: 'cronograma',
      inscripcion: 'contacto',
      orquestas: 'orquestas',
      profesores: 'profesores',
      apoyan: 'apoyan',
      contacto: 'contacto',
    };
    let items = Array.isArray(f.botones) ? f.botones : null;
    if (!items) {
      items = [
        { texto: 'Ver cronograma', tipo: 'pagina', destino: 'cronograma', estilo: 'gold' },
        { texto: 'Inscribirme', tipo: 'pagina', destino: 'inscripcion', estilo: 'outline' },
      ];
      if (Array.isArray(f.links)) {
        items = items.concat(f.links.map((l) => ({ texto: l.texto, tipo: 'link', destino: l.url, estilo: 'outline' })));
      }
    }
    return items.map((item) => {
      const texto = (item && item.texto) || '';
      if (!texto.trim()) return '';
      const estilo = item.estilo === 'gold' ? 'gold' : 'outline';
      if (item.tipo === 'pagina' && pages[item.destino]) {
        return `<button type="button" class="btn ${estilo} inicio-link" data-goto="${pages[item.destino]}">${escapeHtml(texto)}</button>`;
      }
      const url = normalizeLink(item.destino || item.url);
      if (!url) return '';
      return `<a class="btn ${estilo} inicio-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(texto)}</a>`;
    });
  }

  function normalizeLink(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
    if (s.startsWith('wa.me/') || s.startsWith('www.')) return 'https://' + s;
    if (s.startsWith('@')) return 'https://instagram.com/' + s.slice(1);
    return 'https://' + s;
  }

  function renderCronograma(cronograma) {
    const tabs = $('#day-tabs');
    const days = Object.keys(DAY_LABELS);
    tabs.innerHTML = days.map((d) => {
      const L = DAY_LABELS[d];
      const active = d === selectedDay ? 'active' : '';
      return `<button type="button" class="day-tab ${active}" role="tab" aria-selected="${d === selectedDay}" data-day="${d}">
        ${L.dia} <strong>${L.num}</strong><small>oct</small>
      </button>`;
    }).join('');

    tabs.onclick = (e) => {
      const btn = e.target.closest('[data-day]');
      if (!btn) return;
      selectedDay = btn.dataset.day;
      renderCronograma(cronograma);
    };

    const events = cronograma[selectedDay] || [];
    const list = $('#day-events');
    const L = DAY_LABELS[selectedDay];
    function ptLine(tituloPt, sedePt) {
      const parts = [];
      if (tituloPt) parts.push(`<span class="pt-titulo">${escapeHtml(tituloPt)}</span>`);
      if (sedePt) parts.push(`<span class="pt-sede">${escapeHtml(sedePt)}</span>`);
      if (!parts.length) return '';
      return `<p class="pt-line" lang="pt-BR">${parts.join(' · ')}</p>`;
    }

    function celdaBlockHtml(c) {
      if (typeof c === 'string') c = { hora: '', sede: '', titulo: c };
      c = c || {};
      const hora = c.hora || '';
      const titulo = c.titulo || c.texto || '';
      const sede = c.sede || '';
      const presentaciones = Array.isArray(c.presentaciones) ? c.presentaciones : [];
      if (!hora && !titulo && !sede && !c.tituloPt && !c.sedePt && !presentaciones.length) return '';
      return `
        <div class="event-celda-block">
          ${hora ? `<div class="hora">${escapeHtml(hora)}</div>` : ''}
          <div class="event-body">
            ${titulo ? `<h3 class="multi-lines">${multilineHtml(titulo)}</h3>` : ''}
            ${sede ? `<p class="venue">${escapeHtml(sede)}</p>` : ''}
            ${ptLine(c.tituloPt, c.sedePt)}
            ${presentacionesHtml(presentaciones)}
          </div>
        </div>`;
    }

    let html = `<p class="muted" style="margin:0 0 0.75rem">${L.full}</p>`;
    if (!events.length) {
      list.innerHTML = '<p class="empty">Sin eventos para este día.</p>';
      return;
    }
    html += events.map((ev) => {
      const celdas = Array.isArray(ev.celdas) ? ev.celdas : [];
      const medio = isMediodiaEvent(ev);
      let celdasHtml = '';
      if (celdas.length) {
        if (medio) {
          const items = celdas.map((c) => {
            if (typeof c === 'string') c = { titulo: c };
            c = c || {};
            const titulo = (c.titulo || c.texto || '').trim();
            const hora = (c.hora || '').trim();
            if (!titulo && !hora && !(c.presentaciones || []).length) return '';
            return `<li class="medio-item">
              ${hora ? `<span class="medio-hora">${escapeHtml(hora)}</span>` : ''}
              <span class="medio-nombre">${escapeHtml(titulo || '—')}</span>
            </li>`;
          }).filter(Boolean).join('');
          celdasHtml = items ? `<ul class="concert-name-cols medio-grid">${items}</ul>` : '';
        } else {
          celdasHtml = celdas.map(celdaBlockHtml).join('');
        }
      }
      return `
      <article class="event-card${medio ? ' event-mediodia' : ''}">
        ${ev.hora ? `<div class="hora">${escapeHtml(ev.hora)}</div>` : ''}
        <div class="event-body">
          <h3 class="multi-lines">${multilineHtml(ev.titulo)}</h3>
          <p class="venue">${escapeHtml(ev.sede)}</p>
          ${ptLine(ev.tituloPt, ev.sedePt)}
          ${ejemploBadge(ev.ejemplo)}
          ${celdasHtml}
        </div>
      </article>`;
    }).join('');
    list.innerHTML = html;
  }


  let selectedConcertDay = selectedDay;

  function renderConciertos(conciertos) {
    const tabs = $('#concert-day-tabs');
    const list = $('#concert-day-events');
    if (!tabs || !list) return;
    const days = Object.keys(DAY_LABELS);
    if (!DAY_LABELS[selectedConcertDay]) selectedConcertDay = days[0];

    tabs.innerHTML = days.map((d) => {
      const L = DAY_LABELS[d];
      const active = d === selectedConcertDay ? 'active' : '';
      return `<button type="button" class="day-tab ${active}" role="tab" aria-selected="${d === selectedConcertDay}" data-concert-day="${d}">
        ${L.dia} <strong>${L.num}</strong><small>oct</small>
      </button>`;
    }).join('');

    tabs.onclick = (e) => {
      const btn = e.target.closest('[data-concert-day]');
      if (!btn) return;
      selectedConcertDay = btn.dataset.concertDay;
      renderConciertos(conciertos);
    };

    const L = DAY_LABELS[selectedConcertDay];
    const concerts = (conciertos && conciertos[selectedConcertDay]) || [];
    let html = `<p class="muted" style="margin:0 0 0.75rem">${L.full}</p>`;
    if (!concerts.length) {
      list.innerHTML = html + '<p class="empty">Todavía no hay conciertos cargados para este día.</p>';
      return;
    }
    html += concerts.map((c) => `
      <article class="event-card concert-card">
        ${c.hora ? `<div class="hora">${escapeHtml(c.hora || '')}</div>` : ''}
        <div class="event-body">
          ${artistasBlockHtml(c)}
          <p class="venue">${escapeHtml(c.lugar || '')}</p>
          ${presentacionesHtml(c.presentaciones, { twoCols: isListaDosColumnas(c) })}
        </div>
      </article>
    `).join('');
    list.innerHTML = html;
  }


  function renderOrquestas(orquestas) {
    $('#orquestas-grid').innerHTML = orquestas.map((o) => {
      const imagen = o.imagen || (Array.isArray(o.imagenes) && o.imagenes[0]) || '';
      let media = '';
      if (imagen) {
        media += `<img class="card-img" src="${escapeAttr(imagen)}" alt="${escapeAttr(o.nombre)}" loading="lazy" />`;
      }
      // Logos disabled (bandwidth) — kept out of UI even if content still has them
      return `
      <article class="card">
        ${media}
        <h3>${escapeHtml(o.nombre)}</h3>
        <p class="origen">${escapeHtml(o.origen || '')}</p>
        <p>${escapeHtml(o.descripcion || '')}</p>
        ${ejemploBadge(o.ejemplo)}
      </article>`;
    }).join('');
  }

  function renderProfesores(profesores) {
    const list = (profesores || []).filter((p) => p && (p.nombre || p.foto || p.imagen));
    // Even first row so the mid divider does not leave a blank grid cell
    const mid = Math.floor(list.length / 2);
    const rows = [list.slice(0, mid), list.slice(mid)];

    function cardHtml(p) {
      const foto = p.foto || p.imagen || '';
      return `
      <article class="card card-profesor">
        ${foto ? `<img class="prof-foto" src="${escapeAttr(foto)}" alt="${escapeAttr(p.nombre)}" loading="lazy" />` : ''}
        <h3>${escapeHtml(p.nombre)}</h3>
        <p class="origen">${escapeHtml(p.instrumento || p.cargo || '')}</p>
        <p>${escapeHtml(p.bio || p.descripcion || '')}</p>
        ${ejemploBadge(p.ejemplo)}
      </article>`;
    }

    $('#profesores-grid').innerHTML = rows.map((row, i) => {
      const cards = row.map(cardHtml).join('');
      const divider = i === 0 && rows[1].length
        ? '<hr class="profesores-divider" aria-hidden="true" />'
        : '';
      return `<div class="profesores-row card-grid">${cards}</div>${divider}`;
    }).join('');
  }


  function youtubeId(url) {
    const s = String(url || '').trim();
    let m = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    m = s.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    m = s.match(/youtube\.com\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return '';
  }

  function renderVideos(videos) {
    const el = $('#videos-list');
    if (!el) return;
    const list = (videos || []).filter((v) => v && (v.texto || v.url));
    if (!list.length) {
      el.innerHTML = '<p class="muted">Todavía no hay videos.</p>';
      return;
    }
    el.innerHTML = list.map((v) => {
      const texto = v.texto || 'Video';
      const url = normalizeLink(v.url);
      const id = youtubeId(url);
      if (id) {
        return `<article class="video-card">
          <div class="video-frame">
            <iframe src="https://www.youtube.com/embed/${escapeAttr(id)}" title="${escapeAttr(texto)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <h3>${escapeHtml(texto)}</h3>
        </article>`;
      }
      if (!url) return '';
      return `<a class="video-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(texto)}</a>`;
    }).join('');
  }

  function renderApoyan(apoyan) {
    $('#apoyan-grid').innerHTML = apoyan.map((a) => `
      <div class="sponsor">
        ${a.imagen ? `<img class="sponsor-img" src="${escapeAttr(a.imagen)}" alt="${escapeAttr(a.nombre)}" loading="lazy" />` : ''}
        <strong>${escapeHtml(a.nombre)}</strong>
        <span>${escapeHtml(a.tipo || '')}</span>
        ${ejemploBadge(a.ejemplo)}
      </div>
    `).join('');
  }

  function renderContacto(c, f) {
    c = c || {};
    f = f || {};
    const donBox = $('#donacion-box');
    const donBtn = $('#donacion-btn');
    const donUrl = String(c.donacionUrl || '').trim();
    if (donBox && donBtn) {
      if (donUrl) {
        donBox.hidden = false;
        donBtn.href = donUrl;
        donBtn.textContent = c.donacionTexto || 'Donar con Mercado Pago';
      } else {
        donBox.hidden = true;
        donBtn.removeAttribute('href');
      }
    }
    const wa = String(c.whatsapp || '').replace(/\D/g, '');
    const items = [
      wa ? { label: 'WhatsApp', value: c.whatsappDisplay || c.whatsapp, href: `https://wa.me/54${wa}` } : null,
      c.instagram ? { label: 'Instagram', value: c.instagram, href: c.instagramUrl || '#' } : null,
      c.email ? { label: 'Email', value: c.email, href: `mailto:${c.email}` } : null,
      (c.web || c.webDisplay) ? { label: 'Web', value: c.webDisplay || c.web, href: c.web || '#' } : null,
    ].filter(Boolean);
    $('#contact-list').innerHTML = items.map((i) => `
      <li>
        <a href="${escapeAttr(i.href)}" target="_blank" rel="noopener noreferrer">
          <span><span class="label">${i.label}</span><span class="value">${escapeHtml(i.value)}</span></span>
        </a>
      </li>
    `).join('');
    const orgBits = [f.organizacion, f.personeria].filter(Boolean);
    $('#contact-org').textContent = orgBits.join(' · ');
  }

  function renderInscripcion(insc) {
    if (insc?.titulo) $('#insc-titulo').textContent = insc.titulo;
    if (insc?.intro) $('#insc-intro').textContent = insc.intro;
  }

  function multilineHtml(str) {
    return escapeHtml(str).replace(/\n/g, '<br>');
  }

  function isListaDosColumnas(c) {
    if (!c) return false;
    if (c.listaDosColumnas) return true;
    const h = String(c.hora || '').toLowerCase();
    const t = String(c.titulo || c.artistas || '').toLowerCase();
    return /\b13\b|mediod[ií]a|13\s*a\s*14|13:/.test(h) || /mediod/.test(t);
  }

  function isMediodiaEvent(ev) {
    const h = String((ev && ev.hora) || '').toLowerCase();
    const t = String((ev && ev.titulo) || '').toLowerCase();
    return /mediod/.test(t) || /13\s*a\s*14/.test(h) || /^13:/.test(h);
  }

  function parseArtistaLine(l) {
    let s = String(l || '').trim();
    // strip leading "1." / "1)" / "1 " if user typed a number
    s = s.replace(/^\d+[.)\-:]\s*/, '');
    const parts = s.split(/\s*[—–|]\s*|\s+-\s+/);
    if (parts.length >= 2) {
      return { nombre: parts.shift().trim(), info: parts.join(' — ').trim() };
    }
    return { nombre: s, info: '' };
  }

  function artistasBlockHtml(c) {
    const raw = String((c && c.artistas) || '').trim();
    if (!raw) return '';
    let lines = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 1 && /[,;|]/.test(lines[0])) {
      lines = lines[0].split(/[,;|]+/).map((s) => s.trim()).filter(Boolean);
    }
    if (isListaDosColumnas(c) && lines.length >= 2) {
      return `<ul class="concert-name-cols">${lines.map((l, i) => {
        const { nombre, info } = parseArtistaLine(l);
        const infoHtml = info ? `<span class="cn-info">${escapeHtml(info)}</span>` : '';
        return `<li><span class="cn-num">${i + 1}</span><span class="cn-name">${escapeHtml(nombre)}</span>${infoHtml}</li>`;
      }).join('')}</ul>`;
    }
    return `<h3 class="multi-lines">${multilineHtml(raw)}</h3>`;
  }

  function presentacionesHtml(list, opts) {
    if (!Array.isArray(list) || !list.length) return '';
    const items = list.filter((p) => p && (p.nombre || p.info || p.foto));
    if (!items.length) return '';
    const allPhotos = items.every((p) => p.foto);
    const twoCols = opts && opts.twoCols && items.length >= 2 && !allPhotos;
    const cls = twoCols ? 'pres-public cols-2' : 'pres-public';
    return `<ul class="${cls}">${items.map((p, i) => {
      const foto = p.foto
        ? `<img class="pres-thumb" src="${escapeAttr(p.foto)}" alt="" loading="lazy" />`
        : '';
      const num = twoCols ? `<span class="cn-num">${i + 1}</span>` : '';
      const nombre = p.nombre ? `<span class="pres-name">${multilineHtml(p.nombre)}</span>` : '';
      const info = p.info ? `<span class="pres-info">${multilineHtml(p.info)}</span>` : '';
      return `<li class="pres-item">${num}${foto}${nombre}${info}</li>`;
    }).join('')}</ul>`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function bindNav() {
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-goto]');
      if (!btn) return;
      showPanel(btn.dataset.goto);
    });
  }

  function bindForm() {
    $('#insc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const nombre = (fd.get('nombre') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const telefono = (fd.get('telefono') || '').toString().trim();
      const orquesta = (fd.get('orquesta') || '').toString().trim();
      const mensaje = (fd.get('mensaje') || '').toString().trim();
      if (!nombre || !email || !mensaje) {
        toast('Completá nombre, email y mensaje');
        return;
      }
      const phone = (content.contacto.whatsapp || '').replace(/\D/g, '');
      const text = [
        `Hola! Me contacto por Fronteira in Concert 2026.`,
        ``,
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        telefono ? `Teléfono: ${telefono}` : null,
        orquesta ? `Orquesta/institución: ${orquesta}` : null,
        ``,
        `Mensaje:`,
        mensaje,
      ].filter((l) => l !== null).join('\n');
      const url = `https://wa.me/54${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast('Abriendo WhatsApp…');
    });
  }

  async function loadContent() {
    try {
      const res = await fetch('/api/content', { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      content = await res.json();
    } catch {
      // Offline: intentar cache del SW vía misma URL o fallback local
      try {
        const res2 = await fetch('/data/content.json');
        content = await res2.json();
      } catch {
        toast('No se pudo cargar el contenido');
        return;
      }
    }
    renderInicio(content.festival);
    renderCronograma(content.cronograma);
    renderOrquestas(content.orquestas);
    renderProfesores(content.profesores);
    renderConciertos(content.conciertos);
    renderApoyan(content.apoyan);
    // Videos panel removed from nav (data kept for later)
    renderInscripcion(content.inscripcion);
    renderContacto(content.contacto, content.festival);
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  function boot() {
    bindNav();
    bindForm();
    const hash = (location.hash || '#inicio').slice(1);
    const valid = ['inicio', 'cronograma', 'orquestas', 'profesores', 'conciertos', 'apoyan', 'inscripcion', 'contacto'];
    showPanel(valid.includes(hash) ? hash : 'inicio');
    loadContent();
    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
