// Número de WhatsApp en formato internacional (54 + 9 + código de área sin 0 + número)
const WHATSAPP = '5491168277598';
const WA_DEFAULT_MSG = 'Hola Victor Hugo, quisiera hacer una consulta.';

const waLink = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

document.querySelectorAll('.js-whatsapp').forEach(a => {
  a.href = waLink(WA_DEFAULT_MSG);
  a.target = '_blank';
  a.rel = 'noopener';
});

// Menú mobile
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', open);
});

nav.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', false);
  })
);

// Borde del header al scrollear
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
  header.classList.toggle('is-scrolled', window.scrollY > 10);
});

// Aparición de elementos al hacer scroll
const revealEls = document.querySelectorAll('.section__head, .history__head, .carousel, .step, .specialties li, #servicios .grid');
revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => observer.observe(el));

// ---------------------------------------------------------
// Carrusel de "Mi historia"
// ---------------------------------------------------------
const carousel = document.getElementById('history-carousel');
const slides = [...carousel.querySelectorAll('.stage')];
const dotsWrap = document.querySelector('.carousel__dots');
const [prevBtn, nextBtn] = document.querySelectorAll('.carousel__btn');

const step = () => slides[1].offsetLeft - slides[0].offsetLeft;
const goTo = i => carousel.scrollTo({ left: i * step(), behavior: 'smooth' });

const dots = slides.map((_, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', `Etapa ${i + 1}`);
  b.addEventListener('click', () => goTo(i));
  dotsWrap.appendChild(b);
  return b;
});

function updateCarousel() {
  const max = carousel.scrollWidth - carousel.clientWidth;
  const i = Math.round(carousel.scrollLeft / step());
  dots.forEach((d, n) => d.classList.toggle('is-active', n === i));
  prevBtn.disabled = carousel.scrollLeft <= 2;
  nextBtn.disabled = carousel.scrollLeft >= max - 2;
}

[prevBtn, nextBtn].forEach(btn =>
  btn.addEventListener('click', () =>
    carousel.scrollBy({ left: step() * Number(btn.dataset.dir), behavior: 'smooth' })
  )
);
carousel.addEventListener('scroll', updateCarousel, { passive: true });
window.addEventListener('resize', updateCarousel);
updateCarousel();

// Arrastrar con el mouse (en celular ya se desliza con el dedo)
let dragStartX = 0, dragStartScroll = 0, dragging = false;
carousel.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') return;
  dragging = true;
  dragStartX = e.clientX;
  dragStartScroll = carousel.scrollLeft;
  carousel.classList.add('is-dragging');
});
window.addEventListener('pointermove', e => {
  if (dragging) carousel.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
});
window.addEventListener('pointerup', () => {
  if (!dragging) return;
  dragging = false;
  carousel.classList.remove('is-dragging');
  goTo(Math.round(carousel.scrollLeft / step()));
});


// Formulario: arma el mensaje con los datos y abre WhatsApp
const form = document.getElementById('contact-form');
form.addEventListener('submit', e => {
  e.preventDefault();
  const d = new FormData(form);
  const [y, m, day] = d.get('nacimiento').split('-');
  const msg =
    `Hola Victor Hugo, quisiera hacer una consulta.\n\n` +
    `Nombre: ${d.get('nombre')} ${d.get('apellido')}\n` +
    `Fecha de nacimiento: ${day}/${m}/${y}\n` +
    (d.get('mensaje') ? `\nConsulta: ${d.get('mensaje')}` : '');
  window.open(waLink(msg), '_blank', 'noopener');
});

// Año del footer
document.getElementById('year').textContent = new Date().getFullYear();
