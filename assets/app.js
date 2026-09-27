/* =========================================================
   CONFIGURACIÓN — lo único que necesitas editar
   ========================================================= */
const CONFIG = {
  // Pega aquí la URL del Web App de Google Apps Script (termina en /exec).
  // Sin endpoint no se emiten confirmaciones ni pases.
  ENDPOINT: "https://script.google.com/macros/s/AKfycbxEkV985Kzv372ajrfXNi51criJ_karnNJKfR0_Z3AZr4Gvmx7Z95HlQxTMFKdf9WaT_w/exec",
  FECHA_EVENTO: "2026-11-07T16:00:00-07:00",  // ceremonia
  MAX_PASES: 9,
  LS_KEY: "hs2026-pase"                        // dónde se guarda el pase en el celular
};

/* ---------- sobre → carta → sitio ---------- */
(function gate(){
  const gate     = document.getElementById('gate');
  const openBtn  = document.getElementById('openBtn');
  const env      = document.getElementById('envelope');
  const card     = document.getElementById('card');
  const paper    = card.querySelector('.paper');   // el papel es el que scrollea
  const enterBtn = document.getElementById('enterBtn');
  const noMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const content = document.getElementById('siteContent');
  const envCol = gate.querySelector('.env-col');
  gate.hidden = false;
  content.inert = true;
  card.inert = true;
  document.body.classList.add('locked');
  openBtn.focus({preventScroll:true});
  let phase = 'closed';   // closed → opening → reading → leaving → gone

  function abrir(){
    if (phase !== 'closed') return;
    phase = 'opening';
    gate.classList.add('opening');
    setTimeout(() => {
      if (phase !== 'opening') return;
      gate.classList.add('reading'); phase = 'reading';
      envCol.inert = true; card.inert = false;
      enterBtn.focus({preventScroll:true});
    }, noMotion ? 0 : 1450);
  }

  function entrar(){
    if (phase === 'gone' || phase === 'leaving') return;
    phase = 'leaving';
    card.style.transition = '';
    card.style.transform = '';
    card.style.opacity = '';
    gate.classList.add('leaving');
    setTimeout(() => {
      gate.classList.add('gone');
      gate.hidden = true;
      content.inert = false;
      document.getElementById('inicio').focus({preventScroll:true});
      document.body.classList.remove('locked');
      phase = 'gone';
      revealCheck();
    }, noMotion ? 0 : 620);
  }

  // ¿la carta todavía tiene contenido por scrollear? entonces no salimos aún
  function cartaAlFinal(){
    return paper.scrollTop + paper.clientHeight >= paper.scrollHeight - 4;
  }

  openBtn.addEventListener('click', abrir);
  env.addEventListener('click', abrir);
  env.style.cursor = 'pointer';
  enterBtn.addEventListener('click', entrar);
  document.getElementById('skipGate').addEventListener('click', entrar);

  gate.addEventListener('wheel', e => {
    if (phase === 'reading' && e.deltaY > 4 && cartaAlFinal()) entrar();
  }, {passive:true});

  gate.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); entrar(); }
    if (e.key === 'Tab') {
      const buttons = [...gate.querySelectorAll('button')].filter(b => !b.closest('[inert]'));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // gesto de deslizar: la carta sigue el dedo y se va si el impulso alcanza
  let y0 = null, arrastrando = false;
  gate.addEventListener('touchstart', e => {
    y0 = e.touches[0].clientY;
    arrastrando = phase === 'reading' && cartaAlFinal();
  }, {passive:true});

  gate.addEventListener('touchmove', e => {
    if (!arrastrando || y0 === null || phase !== 'reading') return;
    const dy = y0 - e.touches[0].clientY;
    if (dy > 0){
      const d = Math.min(dy, 150);
      card.style.transform =
        `perspective(1200px) translateY(${-d}px) rotateX(${(-d / 26).toFixed(2)}deg) scale(${1 - d / 1800})`;
      card.style.opacity = String(Math.max(0, 1 - dy / 300));
      if (dy > 85) entrar();
    }
  }, {passive:true});

  gate.addEventListener('touchend', () => {
    if (phase === 'reading' && card.style.transform){
      card.style.transition = 'transform .45s ease,opacity .45s ease';
      card.style.transform = '';
      card.style.opacity = '';
      setTimeout(() => { card.style.transition = ''; }, 460);
    }
    y0 = null; arrastrando = false;
  });
})();

/* ---------- carta: inclinación 3D con el cursor (solo mouse) ---------- */
(function tilt(){
  const card  = document.getElementById('card');
  const paper = card.querySelector('.paper');
  if (!paper) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const MAX = 5.5;

  card.addEventListener('pointermove', e => {
    const r  = paper.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width  - .5;
    const py = (e.clientY - r.top)  / r.height - .5;
    paper.style.transition = 'transform .12s linear';
    paper.style.setProperty('--ty', (px * MAX * 2).toFixed(2) + 'deg');
    paper.style.setProperty('--tx', (-py * MAX).toFixed(2) + 'deg');
    paper.style.setProperty('--lx', (28 + px * 44).toFixed(1) + '%');
    paper.style.setProperty('--ly', (8  + py * 30).toFixed(1) + '%');
  });

  card.addEventListener('pointerleave', () => {
    paper.style.transition = 'transform .7s cubic-bezier(.2,.7,.3,1)';
    paper.style.setProperty('--tx', '0deg');
    paper.style.setProperty('--ty', '0deg');
    paper.style.setProperty('--lx', '28%');
    paper.style.setProperty('--ly', '8%');
  });
})();

/* ---------- cuenta regresiva ---------- */
(function countdown(){
  const target = new Date(CONFIG.FECHA_EVENTO).getTime();
  const el = {d:document.getElementById('cd-d'),h:document.getElementById('cd-h'),
              m:document.getElementById('cd-m'),s:document.getElementById('cd-s')};
  let timer = null;

  // ya pasó la boda: los números se van y queda el agradecimiento
  function terminado(){
    if (timer) clearInterval(timer);
    document.getElementById('cdBox').style.display = 'none';
    document.getElementById('cdDone').classList.add('on');
    document.getElementById('cdEyebrow').textContent = '07 · 11 · 2026';
    document.getElementById('cdTitle').innerHTML = 'Ya somos <em>familia</em>';
  }

  function tick(){
    const diff = target - Date.now();
    if (diff <= 0){ terminado(); return; }
    const d = Math.floor(diff/86400000);
    const h = Math.floor(diff%86400000/3600000);
    const m = Math.floor(diff%3600000/60000);
    const s = Math.floor(diff%60000/1000);
    el.d.textContent = String(d).padStart(3,'0');
    el.h.textContent = String(h).padStart(2,'0');
    el.m.textContent = String(m).padStart(2,'0');
    el.s.textContent = String(s).padStart(2,'0');
  }
  timer = setInterval(tick, 1000);
  tick();
})();

/* ---------- reveal al hacer scroll ---------- */
const revealEls = document.querySelectorAll('.reveal');
function revealCheck(){
  revealEls.forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 80) el.classList.add('on');
  });
}
window.addEventListener('scroll', revealCheck, {passive:true});
window.addEventListener('resize', revealCheck);

/* ---------- calendario ---------- */
function calendarUrl(){
  const start = '20261107T160000';
  const end   = '20261108T020000';
  const text  = encodeURIComponent('Boda de Sofía y Héctor');
  const loc   = encodeURIComponent('Parroquia María Reina del Universo, C. Lucero s/n, Parajes del Sol, Juárez, Chih.');
  const det   = encodeURIComponent('Ceremonia 4:00 p.m. en la Parroquia María Reina del Universo. Recepción 9:00 p.m. en Jardín Terraza Arjeri. Vestimenta: formal.');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${det}&location=${loc}&ctz=America/Ciudad_Juarez`;
}
['calBtn','calBtn2'].forEach(id => {
  const b = document.getElementById(id);
  if (b) b.addEventListener('click', e => { e.preventDefault(); window.open(calendarUrl(), '_blank', 'noopener,noreferrer'); });
});

/* El servidor resuelve nombre y cupo desde un enlace privado ?i=token. */
const invitationToken = new URLSearchParams(location.search).get('i') || '';
let authorizedInvitation = null;

/* ---------- mostrar/ocultar pases según asistencia ---------- */
document.querySelectorAll('input[name="asiste"]').forEach(r => {
  r.addEventListener('change', () => {
    const asiste = document.querySelector('input[name="asiste"]:checked').value === 'Sí';
    document.getElementById('pasesField').style.display = asiste ? '' : 'none';
  });
});

/* ---------- envío del RSVP ---------- */
const form = document.getElementById('rsvpForm');
const msg  = document.getElementById('formMsg');
const submitBtn = document.getElementById('submitBtn');
const formCard  = document.getElementById('formCard');
const backBox   = document.getElementById('rsvpBack');

// Se conserva el identificador al reintentar el mismo envío. El servidor debe deduplicarlo.
let pendingSubmission = null;
function folioFor(){
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return 'HS-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
function validPass(p){
  return p && typeof p.nombre === 'string' && p.nombre.trim().length >= 3 && p.nombre.length <= 100
    && typeof p.folio === 'string' && /^[A-Za-z0-9_-]{4,100}$/.test(p.folio)
    && ['Sí','No'].includes(p.asiste) && Number.isInteger(p.pases)
    && (p.asiste === 'Sí' ? p.pases >= 1 && p.pases <= CONFIG.MAX_PASES : p.pases === 0);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitBtn.disabled || !authorizedInvitation || !form.reportValidity()) return;
  const nombre = document.getElementById('nombre').value.trim();
  const asiste = document.querySelector('input[name="asiste"]:checked').value;


  msg.className = 'form-msg';
  if (nombre.length < 3 || nombre.length > 100){
    msg.className = 'form-msg err';
    msg.textContent = 'Escribe tu nombre completo para continuar.';
    return;
  }

  const tel = document.getElementById('tel').value.trim();
  if (!tel || tel.length > 25 || !/^[+\d\s().-]+$/.test(tel) || tel.replace(/\D/g, '').length < 7) {
    msg.className = 'form-msg err';
    msg.textContent = 'Déjanos tu WhatsApp con al menos 7 dígitos para poder contactarte.';
    return;
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(CONFIG.ENDPOINT)) {
    msg.className = 'form-msg err';
    msg.textContent = 'La confirmación todavía no está disponible. Contacta a los novios.';
    return;
  }
  const values = {invitacion: invitationToken, nombre, asiste, tel};
  const signature = JSON.stringify(values);
  if (!pendingSubmission || pendingSubmission.signature !== signature) {
    pendingSubmission = {signature, payload: {...values, folio: folioFor(), enviado: new Date().toISOString()}};
  }
  const payload = {...pendingSubmission.payload};

  submitBtn.disabled = true;
  msg.textContent = 'Guardando tu confirmación…';

  form.setAttribute('aria-busy', 'true');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(CONFIG.ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    });
    if (!res.ok) throw new Error('HTTP error');
    const data = await res.json();
    if (!data || data.ok !== true) throw new Error(serverMessage(data));
    if (!validPass(data.pase) || data.pase.nombre !== authorizedInvitation.nombre
        || data.pase.pases > authorizedInvitation.maximo) throw new Error('Respuesta de confirmación inválida. Contacta a los novios.');
    showConfirmation(data.pase);

  } catch (err){
    submitBtn.disabled = false;
    msg.className = 'form-msg err';
    msg.textContent = err.message && err.message !== 'HTTP error' && err.name !== 'TypeError' && err.name !== 'AbortError'
      ? err.message : 'No pudimos verificar la confirmación. Revisa tu conexión y reintenta; si el problema sigue, contacta a los novios.';
  } finally {
    clearTimeout(timeout);
    form.removeAttribute('aria-busy');
  }
});

/* ---------- pase digital ---------- */
function showPass(p, mover = true){
  if (!validPass(p)) return;
  document.getElementById('passName').textContent = p.nombre;
  document.getElementById('passQty').textContent = p.pases;
  document.getElementById('passFolio').textContent = 'Folio ' + p.folio;

  const box = document.getElementById('qr');
  box.innerHTML = '';

  // El QR abre la página de validación del Apps Script con el folio.
  // Sin ENDPOINT configurado cae al texto simple de respaldo.
  const destino = CONFIG.ENDPOINT
    ? CONFIG.ENDPOINT + '?f=' + encodeURIComponent(p.folio)
    : `HS2026|${p.folio}|${p.nombre}|${p.pases}`;

  try {
    if (!window.QRCode) throw new Error('QR unavailable');
    new QRCode(box, {
      text: destino,
      width: 148, height: 148,
      colorDark: '#0b0b0c', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'Código QR del pase de acceso');
  } catch {
    box.textContent = 'Conserva tu folio';
    box.classList.add('qr-fallback');
    document.querySelector('.scan').textContent = 'Presenta este folio en la entrada';
  }
  const wrap = document.getElementById('passWrap');
  wrap.classList.add('show');
  if (mover) wrap.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block:'center'});
}

/* ---------- el pase se queda guardado en el celular ---------- */
function guardarLocal(p){
  try {
    localStorage.setItem(CONFIG.LS_KEY, JSON.stringify({
      folio: p.folio, nombre: p.nombre, pases: p.pases, asiste: p.asiste
    }));
  } catch(e){ /* modo privado o sin espacio: no pasa nada */ }
}
function serverMessage(data) {
  const messages = {
    INVITACION:'Abre el enlace privado que te enviaron los novios.',
    CUPO:'La cantidad de pases no corresponde a tu invitación.',
    CERRADO:'El plazo de confirmación terminó. Contacta a los novios.',
    OCUPADO:'Estamos procesando otras confirmaciones. Intenta de nuevo.',
    CONFIGURACION:'La confirmación todavía no está disponible. Contacta a los novios.'
  };
  return messages[data && data.code] || 'No se pudo verificar la confirmación. Intenta de nuevo o contacta a los novios.';
}
function showConfirmation(p, mover = true) {
  guardarLocal(p);
  formCard.style.display = 'none';
  backBox.classList.add('on');
  document.getElementById('rbName').textContent = p.nombre;
  document.getElementById('rbText').textContent = p.asiste === 'Sí'
    ? 'Tu confirmación está guardada. Descarga tu pase para presentarlo en la entrada. Para hacer cambios, contacta a los novios.'
    : 'Gracias por avisarnos. Te vamos a extrañar. Para hacer cambios, contacta a los novios.';
  if (p.asiste === 'Sí') showPass(p, mover);
  else document.getElementById('passWrap').classList.remove('show');
  if (mover && p.asiste === 'No') backBox.scrollIntoView({block:'center',behavior:'instant'});
}
const retryInvite = document.getElementById('retryInvite');
async function loadInvitation() {
  authorizedInvitation = null;
  form.querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = true);
  retryInvite.hidden = true;
  msg.className = 'form-msg';
  if (!/^[a-f0-9]{32}$/.test(invitationToken)) {
    msg.textContent = 'Para confirmar, abre el enlace privado que te enviaron los novios. Si no lo tienes, pídeles que te lo compartan.';
    return;
  }
  msg.textContent = 'Consultando tu invitación…';
  form.setAttribute('aria-busy','true');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(CONFIG.ENDPOINT)) throw new Error('endpoint');
    const response = await fetch(CONFIG.ENDPOINT + '?i=' + encodeURIComponent(invitationToken), {
      signal:controller.signal, credentials:'omit', referrerPolicy:'no-referrer', cache:'no-store'
    });
    if (!response.ok) throw new Error('HTTP error');
    const data = await response.json();
    if (!data || data.ok !== true) { msg.textContent = serverMessage(data); return; }
    if (typeof data.nombre !== 'string' || data.nombre.trim().length < 3 || data.nombre.length > 100
        || !Number.isInteger(data.maximo) || data.maximo < 1 || data.maximo > CONFIG.MAX_PASES
        || typeof data.cerrado !== 'boolean') throw new Error('Invalid invitation');
    authorizedInvitation = {nombre:data.nombre,maximo:data.maximo};
    if (data.pase !== null) {
      if (!validPass(data.pase) || data.pase.nombre !== data.nombre || data.pase.pases > data.maximo) throw new Error('Invalid pass');
      showConfirmation(data.pase, false);
      return;
    }
    const name = document.getElementById('nombre');
    name.value = data.nombre;
    name.readOnly = true;
    document.getElementById('pases').textContent = `${data.maximo} ${data.maximo === 1 ? 'pase' : 'pases'}`;
    document.getElementById('pasesHint').textContent = 'Estos son los lugares reservados para tu invitación. Si necesitas algún ajuste, escríbenos.';
    if (data.cerrado) { msg.textContent = serverMessage({code:'CERRADO'}); return; }
    form.querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = false);
    msg.textContent = '';
  } catch (_) {
    authorizedInvitation = null;
    msg.className = 'form-msg err';
    msg.textContent = 'No pudimos consultar tu invitación. Revisa tu conexión e intenta de nuevo.';
  } finally {
    clearTimeout(timeout);
    form.removeAttribute('aria-busy');
    if (submitBtn.disabled && !backBox.classList.contains('on')) { retryInvite.hidden = false; retryInvite.disabled = false; }
  }
}
retryInvite.addEventListener('click', loadInvitation);
document.getElementById('rbReset').addEventListener('click', () => location.reload());
loadInvitation();

document.getElementById('dlBtn').addEventListener('click', async () => {
  const node = document.getElementById('pass');
  if (!window.html2canvas){ alert('Toma una captura de pantalla para guardar tu pase.'); return; }
  try {
    const canvas = await html2canvas(node, {backgroundColor:'#0b0b0c', scale:2, useCORS:true});
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'pase-boda-sofia-hector.png';
    a.click();
  } catch (err){
    console.error(err);
    alert('No se pudo generar la imagen. Toma una captura de pantalla para guardar tu pase.');
  }
});

document.documentElement.classList.add('js');
revealCheck();
