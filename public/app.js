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
    $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === id));
    $$('.nav-item').forEach((n) => {
      const on = n.dataset.goto === id;
      n.classList.toggle('active', on);
      if (on) n.setAttribute('aria-current', 'page');
      else n.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  }

  function renderInicio(f) {
    $('#brand-name').textContent = f.nombre;
    $('#brand-edicion').textContent = f.edicion;
    $('#hero-edicion').textContent = f.edicion;
    $('#hero-nombre').textContent = f.nombre;
    $('#hero-fechas').textContent = f.fechas;
    $('#hero-lugar').textContent = f.lugar;
    $('#hero-blurb').textContent = f.blurb;
    const orgBits = [f.organizacion, f.personeria].filter(Boolean);
    $('#hero-org').textContent = orgBits.join(' · ');
    document.title = `${f.nombre} — ${f.edicion}`;
    const logo = $('#hero-logo');
    if (logo) {
      if (f.logo) {
        logo.src = f.logo;
        logo.hidden = false;
      } else {
        logo.hidden = true;
        logo.removeAttribute('src');
      }
    }
    const linksEl = $('#inicio-links');
    if (linksEl) {
      const links = Array.isArray(f.links) ? f.links : [];
      linksEl.innerHTML = links.map((item) => {
        const texto = (item && item.texto) || '';
        const url = normalizeLink(item && item.url);
        if (!texto || !url) return '';
        return `<a class="btn outline inicio-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(texto)}</a>`;
      }).join('');
    }
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
    if (!events.length) {
      list.innerHTML = '<p class="empty">Sin eventos para este día.</p>';
      return;
    }
    const L = DAY_LABELS[selectedDay];
    list.innerHTML = `<p class="muted" style="margin:0 0 0.75rem">${L.full}</p>` + events.map((ev) => `
      <article class="event-card">
        <div class="hora">${escapeHtml(ev.hora)}</div>
        <div>
          <h3>${escapeHtml(ev.titulo)}</h3>
          <p class="venue">${escapeHtml(ev.sede)}</p>
          ${ejemploBadge(ev.ejemplo)}
        </div>
      </article>
    `).join('');
  }


  function renderOrquestas(orquestas) {
    $('#orquestas-grid').innerHTML = orquestas.map((o) => {
      const logo = o.logo || '';
      const imagen = o.imagen || (Array.isArray(o.imagenes) && o.imagenes[0]) || '';
      let media = '';
      if (imagen) {
        media += `<img class="card-img" src="${escapeAttr(imagen)}" alt="${escapeAttr(o.nombre)}" loading="lazy" />`;
      }
      if (logo) {
        media += `<img class="orch-logo" src="${escapeAttr(logo)}" alt="Logo ${escapeAttr(o.nombre)}" loading="lazy" />`;
      }
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
    const mid = Math.ceil(list.length / 2);
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
    const items = [
      { label: 'WhatsApp', value: c.whatsappDisplay || c.whatsapp, href: `https://wa.me/54${c.whatsapp.replace(/\D/g, '')}` },
      { label: 'Instagram', value: c.instagram, href: c.instagramUrl },
      { label: 'Email', value: c.email, href: `mailto:${c.email}` },
      { label: 'Web', value: c.webDisplay || c.web, href: c.web },
    ];
    $('#contact-list').innerHTML = items.map((i) => `
      <li>
        <a href="${escapeAttr(i.href)}" target="_blank" rel="noopener noreferrer">
          <span><span class="label">${i.label}</span><span class="value">${escapeHtml(i.value)}</span></span>
        </a>
      </li>
    `).join('');
    $('#contact-org').textContent = `${f.organizacion} · ${f.personeria}`;
  }

  function renderInscripcion(insc) {
    if (insc?.titulo) $('#insc-titulo').textContent = insc.titulo;
    if (insc?.intro) $('#insc-intro').textContent = insc.intro;
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
    renderApoyan(content.apoyan);
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
    const valid = ['inicio', 'cronograma', 'orquestas', 'profesores', 'apoyan', 'inscripcion', 'contacto'];
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
