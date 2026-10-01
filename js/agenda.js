// =========================================================
// AGENDA DE TURNOS — versión base
// Todo lo configurable está en AGENDA_CONFIG.
// La disponibilidad y el guardado son SIMULADOS (ver "BACKEND" más abajo):
// cuando se desarrolle en profundidad, solo hay que reemplazar esas dos funciones.
// =========================================================
const AGENDA_CONFIG = {
  // Tipos de consulta (duraciones de ejemplo, ajustar con Victor Hugo)
  servicios: [
    { id: 'tarot',    nombre: 'Lectura de tarot',              duracion: 60 },
    { id: 'pareja',   nombre: 'Amarres y uniones de pareja',   duracion: 45 },
    { id: 'limpieza', nombre: 'Limpieza espiritual',           duracion: 60 },
    { id: 'reiki',    nombre: 'Reiki / Péndulo hebreo',        duracion: 60 },
    { id: 'otro',     nombre: 'Otra consulta',                 duracion: 30 },
  ],
  modalidades: ['WhatsApp', 'Zoom', 'Skype', 'Presencial'],
  diasLaborables: [1, 2, 3, 4, 5, 6],     // 0 = domingo, 1 = lunes … 6 = sábado
  horarios: ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
  diasDeAnticipacion: 60,                  // hasta cuántos días hacia adelante se puede reservar
  zonaHoraria: 'Horario de Argentina (GMT-3)',
};

// ---------------------------------------------------------
// BACKEND (simulado) — reemplazar por la integración real:
// Google Calendar, Calendly, Firebase, una API propia, etc.
// ---------------------------------------------------------
const STORAGE_KEY = 'amt-reservas';

function leerReservasLocales() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

/** Devuelve los horarios ya ocupados de una fecha ("YYYY-MM-DD"). */
async function obtenerHorariosOcupados(fecha) {
  // Simulación: algunos turnos aparecen ocupados de forma "aleatoria" pero fija por día
  const seed = [...fecha].reduce((a, c) => a + c.charCodeAt(0), 0);
  const ocupados = AGENDA_CONFIG.horarios.filter((_, i) => (seed * (i + 3)) % 7 === 0);
  const propios = leerReservasLocales().filter(r => r.fecha === fecha).map(r => r.hora);
  return [...new Set([...ocupados, ...propios])];
}

/** Guarda la reserva. Debe devolver { ok: true, id } o { ok: false, error }. */
async function guardarReserva(reserva) {
  try {
    const reservas = leerReservasLocales();
    const id = 'T' + Date.now().toString(36).toUpperCase();
    reservas.push({ id, ...reserva });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservas));
    return { ok: true, id };
  } catch {
    return { ok: true, id: 'T' + Date.now().toString(36).toUpperCase() };
  }
}

// ---------------------------------------------------------
// Interfaz
// ---------------------------------------------------------
(() => {
  const root = document.getElementById('booking');
  if (!root) return;

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  const state = { servicio: null, modalidad: null, fecha: null, hora: null, step: 1 };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + AGENDA_CONFIG.diasDeAnticipacion);
  let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const $ = sel => root.querySelector(sel);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fechaLarga = s => { const d = fromIso(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`; };
  const servicioActual = () => AGENDA_CONFIG.servicios.find(s => s.id === state.servicio);

  // ---- Navegación entre pasos ----
  function goStep(step) {
    state.step = step;
    root.querySelectorAll('.booking__panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === String(step)));
    root.querySelectorAll('.booking__steps li').forEach(li => {
      const n = Number(li.dataset.step);
      li.classList.toggle('is-active', n === step);
      li.classList.toggle('is-done', step === 'done' || n < step);
    });
    if (step === 3) renderSummary();
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateNext() {
    $('[data-panel="1"] [data-next]').disabled = !(state.servicio && state.modalidad);
    $('[data-panel="2"] [data-next]').disabled = !(state.fecha && state.hora);
  }

  root.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => goStep(state.step + 1)));
  root.querySelectorAll('[data-prev]').forEach(b => b.addEventListener('click', () => goStep(state.step - 1)));

  // ---- Paso 1: servicio y modalidad ----
  const servicesEl = $('#booking-services');
  AGENDA_CONFIG.servicios.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.innerHTML = `<strong>${s.nombre}</strong><small>${s.duracion} min</small>`;
    b.addEventListener('click', () => {
      state.servicio = s.id;
      servicesEl.querySelectorAll('.choice').forEach(c => c.classList.toggle('is-selected', c === b));
      updateNext();
    });
    servicesEl.appendChild(b);
  });

  const modesEl = $('#booking-modes');
  AGENDA_CONFIG.modalidades.forEach(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = m;
    b.addEventListener('click', () => {
      state.modalidad = m;
      modesEl.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-selected', c === b));
      updateNext();
    });
    modesEl.appendChild(b);
  });

  // ---- Paso 2: calendario ----
  const daysEl = $('#calendar-days');
  const isAvailableDay = d => d >= today && d <= maxDate && AGENDA_CONFIG.diasLaborables.includes(d.getDay());

  function renderCalendar() {
    $('#calendar-month').textContent = `${MESES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
    daysEl.innerHTML = '';

    const offset = (viewMonth.getDay() + 6) % 7; // semana empieza el lunes
    for (let i = 0; i < offset; i++) daysEl.appendChild(document.createElement('span'));

    const total = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= total; n++) {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), n);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = n;
      b.className = 'day';
      if (iso(d) === iso(today)) b.classList.add('is-today');
      if (state.fecha === iso(d)) b.classList.add('is-selected');
      if (!isAvailableDay(d)) b.disabled = true;
      else b.addEventListener('click', () => selectDay(iso(d)));
      daysEl.appendChild(b);
    }

    const prevMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 0);
    const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    $('[data-month="-1"]').disabled = prevMonth < new Date(today.getFullYear(), today.getMonth(), 1);
    $('[data-month="1"]').disabled = nextMonth > maxDate;
  }

  root.querySelectorAll('[data-month]').forEach(b =>
    b.addEventListener('click', () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + Number(b.dataset.month), 1);
      renderCalendar();
    })
  );

  async function selectDay(fecha) {
    state.fecha = fecha;
    state.hora = null;
    renderCalendar();
    updateNext();

    const grid = $('#slots-grid');
    $('#slots-date').textContent = fechaLarga(fecha);
    grid.innerHTML = '<p class="slots__loading">Buscando horarios…</p>';

    const ocupados = await obtenerHorariosOcupados(fecha);
    const now = new Date();
    grid.innerHTML = '';

    AGENDA_CONFIG.horarios.forEach(h => {
      const [hh, mm] = h.split(':').map(Number);
      const slotDate = fromIso(fecha); slotDate.setHours(hh, mm);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.textContent = h;
      if (ocupados.includes(h) || slotDate <= now) {
        b.disabled = true;
        b.title = 'No disponible';
      } else {
        b.addEventListener('click', () => {
          state.hora = h;
          grid.querySelectorAll('.slot').forEach(s => s.classList.toggle('is-selected', s === b));
          updateNext();
        });
      }
      grid.appendChild(b);
    });

    if (!grid.querySelector('.slot:not(:disabled)')) {
      grid.innerHTML = '<p class="slots__loading">No quedan horarios este día. Probá con otra fecha.</p>';
    }
  }

  $('#slots-tz').textContent = AGENDA_CONFIG.zonaHoraria;

  // ---- Paso 3: resumen y confirmación ----
  function renderSummary() {
    const s = servicioActual();
    $('#booking-summary').innerHTML = `
      <p class="eyebrow">Tu turno</p>
      <dl>
        <div><dt>Consulta</dt><dd>${s.nombre}</dd></div>
        <div><dt>Modalidad</dt><dd>${state.modalidad}</dd></div>
        <div><dt>Día</dt><dd>${fechaLarga(state.fecha)}</dd></div>
        <div><dt>Horario</dt><dd>${state.hora} hs · ${s.duracion} min</dd></div>
      </dl>
      <p class="summary__note">El turno queda confirmado al recibir el pago (PayPal, Mercado Pago, transferencia o depósito).</p>`;
  }

  const form = $('#booking-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const s = servicioActual();
    const reserva = {
      servicio: s.nombre, modalidad: state.modalidad, fecha: state.fecha, hora: state.hora,
      nombre: d.nombre, apellido: d.apellido, nacimiento: d.nacimiento,
      telefono: d.telefono, email: d.email, comentario: d.comentario,
    };

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const res = await guardarReserva(reserva);
    btn.disabled = false;
    if (!res.ok) { alert('No pudimos guardar el turno. Probá de nuevo o escribinos por WhatsApp.'); return; }

    const [y, m, day] = d.nacimiento.split('-');
    const msg =
      `Hola Victor Hugo, reservé un turno desde la web (código ${res.id}).\n\n` +
      `Consulta: ${s.nombre}\nModalidad: ${state.modalidad}\n` +
      `Día: ${fechaLarga(state.fecha)} a las ${state.hora} hs\n\n` +
      `Nombre: ${d.nombre} ${d.apellido}\nFecha de nacimiento: ${day}/${m}/${y}\nTeléfono: ${d.telefono}` +
      (d.comentario ? `\n\nComentario: ${d.comentario}` : '');

    $('#booking-done-text').textContent =
      `${d.nombre}, tu turno de ${s.nombre.toLowerCase()} es el ${fechaLarga(state.fecha)} a las ${state.hora} hs por ${state.modalidad}. Código: ${res.id}.`;
    $('#booking-wa').href = waLink(msg);
    goStep('done');
  });

  // ---- Reiniciar ----
  $('[data-restart]').addEventListener('click', () => {
    Object.assign(state, { servicio: null, modalidad: null, fecha: null, hora: null });
    root.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
    $('#slots-grid').innerHTML = '';
    $('#slots-date').textContent = 'Elegí un día en el calendario';
    form.reset();
    renderCalendar();
    updateNext();
    goStep(1);
  });

  renderCalendar();
})();
