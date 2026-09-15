/* Galería estática: sin librerías ni reproducción automática. */
(() => {
  const config = window.FOTOS_BODA || {};
  function localPhoto(photo) {
    return photo && typeof photo.src === 'string'
      && /^(?:[\w-]+\/)*[\w-]+\.(?:jpe?g|png|webp)$/i.test(photo.src)
      && typeof photo.alt === 'string' && photo.alt.trim().length > 0;
  }

  function responsiveImage(img, photo, sizes) {
    if (Number.isInteger(photo.ancho) && Number.isInteger(photo.alto)) {
      img.width = photo.ancho;
      img.height = photo.alto;
    }
    if (localPhoto({src:photo.pequena, alt:photo.alt})
        && Number.isInteger(photo.anchoPequena) && Number.isInteger(photo.ancho)) {
      img.sizes = sizes;
      img.srcset = `${photo.pequena} ${photo.anchoPequena}w, ${photo.src} ${photo.ancho}w`;
    }
  }

  if (localPhoto(config.portada)) {
    const photo = config.portada;
    const replacement = new Image();
    replacement.alt = photo.alt;
    replacement.decoding = 'async';
    replacement.fetchPriority = 'high';
    responsiveImage(replacement, photo, '(max-width:760px) 75vw, 460px');
    replacement.addEventListener('load', () => {
      replacement.width = replacement.naturalWidth;
      replacement.height = replacement.naturalHeight;
      const position = Array.isArray(photo.posicion) ? photo.posicion : [50, 50];
      replacement.style.objectPosition = [0, 1].map(i =>
        `${Number.isFinite(position[i]) ? Math.max(0, Math.min(100, position[i])) : 50}%`
      ).join(' ');
      document.querySelector('.portrait-frame img').replaceWith(replacement);
    }, {once:true});
    // Si el archivo falla, la portada actual permanece visible.
    replacement.src = photo.src;
  }

  const photos = Array.isArray(config.casuales) ? config.casuales.filter(localPhoto) : [];
  if (!photos.length) return;
  const section = document.getElementById('momentos');
  const track = document.getElementById('casualTrack');
  const previous = document.getElementById('casualPrev');
  const next = document.getElementById('casualNext');
  const status = document.getElementById('casualStatus');
  let current = 0;
  let frame = 0;

  function update() {
    const slides = [...track.children];
    section.hidden = !slides.length;
    document.getElementById('casualControls').hidden = slides.length < 2;
    document.getElementById('casualHint').hidden = slides.length < 2;
    if (!slides.length) return;
    const left = track.getBoundingClientRect().left;
    current = slides.reduce((closest, slide, i) =>
      Math.abs(slide.getBoundingClientRect().left - left) < Math.abs(slides[closest].getBoundingClientRect().left - left) ? i : closest, 0);
    slides.forEach((slide, i) => slide.setAttribute('aria-label', `Foto ${i + 1} de ${slides.length}`));
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    status.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  }

  photos.forEach(photo => {
    const slide = document.createElement('figure');
    slide.className = 'casual-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'diapositiva');
    const img = new Image();
    img.alt = photo.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    responsiveImage(img, photo, '(max-width:760px) 90vw, 850px');
    img.addEventListener('error', () => { slide.remove(); update(); }, {once:true});
    img.src = photo.src;
    slide.append(img);
    if (typeof photo.pie === 'string' && photo.pie.trim()) {
      const caption = document.createElement('figcaption');
      caption.textContent = photo.pie;
      slide.append(caption);
    }
    track.append(slide);
  });
  function go(index) {
    const slide = track.children[Math.max(0, Math.min(track.children.length - 1, index))];
    if (!slide) return;
    track.scrollBy({
      left: slide.getBoundingClientRect().left - track.getBoundingClientRect().left,
      behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth'
    });
  }
  previous.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  track.addEventListener('keydown', e => {
    const destinations = {ArrowLeft:current - 1, ArrowRight:current + 1, Home:0, End:track.children.length - 1};
    if (Object.prototype.hasOwnProperty.call(destinations, e.key)) { e.preventDefault(); go(destinations[e.key]); }
  });
  function scheduleUpdate() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }
  track.addEventListener('scroll', scheduleUpdate, {passive:true});
  window.addEventListener('resize', scheduleUpdate);
  update();
})();
