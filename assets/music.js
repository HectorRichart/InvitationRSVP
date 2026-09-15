/* Música local: se inicia únicamente tras una interacción. */
(() => {
  const audio = document.getElementById('weddingMusic');
  const controls = [...document.querySelectorAll('[data-music-toggle]')];
  let attempted = false;
  let pending = false;
  audio.volume = 0.3;

  function update() {
    const playing = !audio.paused;
    controls.forEach(button => {
      button.hidden = false;
      button.disabled = pending;
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
      button.querySelector('span').textContent = pending ? 'Cargando…' : playing ? 'Pausar' : 'Música';
      button.title = 'One Summer’s Day · Joe Hisaishi';
    });
  }

  async function play() {
    if (pending) return;
    attempted = true;
    pending = true;
    update();
    try {
      await audio.play();
    } catch (_) {
      // Si el navegador bloquea el audio, queda disponible el botón de reintento.
    } finally {
      pending = false;
      update();
    }
  }

  controls.forEach(button => button.addEventListener('click', () => {
    attempted = true;
    if (audio.paused) play();
    else audio.pause();
  }));
  ['openBtn', 'envelope', 'skipGate', 'enterBtn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      if (!attempted) play();
    });
  });
  ['play', 'pause', 'error', 'ended'].forEach(event => audio.addEventListener(event, update));
  update();
})();
