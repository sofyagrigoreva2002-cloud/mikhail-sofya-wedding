(() => {
  const root = document.documentElement;
  const gate = document.getElementById('envelope');
  const site = document.getElementById('site-shell');
  const openButton = document.getElementById('envelope-open');
  const textButton = document.getElementById('envelope-open-text');
  const status = document.getElementById('envelope-status');
  const firstContent = document.getElementById('top') || document.getElementById('main');
  const storageKey = 'weddingEditorialV18';
  const motionPreference = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  if (!gate || !site || !openButton) {
    root.classList.remove('envelope-pending');
    return;
  }

  let state = 'closed';
  let returnFocus = firstContent;
  let restoreGateFromCache = false;
  const timers = new Set();
  const openControls = [openButton, textButton].filter(Boolean);

  const later = (callback, delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  };

  const clearTimers = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
  };

  const remember = () => {
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch (error) {
      // The invitation remains available when storage is blocked.
    }
  };

  const focusGate = () => requestAnimationFrame(() => openButton.focus({ preventScroll: true }));

  const setControlsDisabled = (disabled) => {
    openControls.forEach((control) => {
      control.disabled = disabled;
    });
  };

  const finish = ({ focus = 'content', markSeen = true, announce = true } = {}) => {
    if (state === 'closed') return;
    state = 'closed';
    clearTimers();
    gate.classList.remove('is-opening', 'is-leaving');
    gate.hidden = true;
    setControlsDisabled(false);
    site.inert = false;
    root.classList.remove('env-on', 'envelope-pending');
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('pagehide', onPageHide);
    if (status) status.textContent = '';
    if (markSeen) remember();
    if (announce) document.dispatchEvent(new CustomEvent('envelope:opened'));

    const target = focus === 'return' ? returnFocus : firstContent;
    if (target?.isConnected && !target.inert) target.focus({ preventScroll: true });
  };

  const openLetter = () => {
    if (state !== 'ready') return;
    if (motionPreference?.matches) {
      finish();
      return;
    }

    state = 'opening';
    gate.classList.add('is-opening');
    setControlsDisabled(true);
    if (status) status.textContent = 'Письмо открывается.';
    later(() => gate.classList.add('is-leaving'), 760);
    later(() => finish(), 1060);
  };

  function onKeydown(event) {
    if (state === 'closed') return;

    if (event.key === 'Escape') {
      event.preventDefault();
      finish({ focus: 'return' });
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      if (openButton.disabled) return;
      const currentIndex = openControls.indexOf(document.activeElement);
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + openControls.length) % openControls.length;
      openControls[nextIndex].focus();
    }
  }

  const onPageHide = () => {
    restoreGateFromCache = state === 'ready';
    finish({ focus: 'return', markSeen: state === 'opening', announce: false });
  };

  const show = ({ trigger = null } = {}) => {
    if (state !== 'closed') {
      if (!openButton.disabled) focusGate();
      return;
    }

    returnFocus = trigger || firstContent;
    state = 'ready';
    gate.hidden = false;
    gate.classList.remove('is-opening', 'is-leaving');
    setControlsDisabled(false);
    site.inert = true;
    root.classList.add('env-on');
    root.classList.remove('envelope-pending');
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('pagehide', onPageHide);
    if (status) status.textContent = 'Нажмите, чтобы открыть приглашение.';
    focusGate();
  };

  openButton.addEventListener('click', openLetter);
  textButton?.addEventListener('click', openLetter);

  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('#reopen-letter') : null;
    if (!trigger) return;
    event.preventDefault();
    try {
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      // Replay remains available without storage.
    }
    show({ trigger });
  });

  const onMotionPreferenceChange = (event) => {
    if (event.matches && state === 'opening') finish();
  };

  if (typeof motionPreference?.addEventListener === 'function') {
    motionPreference.addEventListener('change', onMotionPreferenceChange);
  } else if (typeof motionPreference?.addListener === 'function') {
    motionPreference.addListener(onMotionPreferenceChange);
  }

  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem(storageKey) === '1';
  } catch (error) {
    // A fresh session simply starts with the envelope.
  }

  const params = new URLSearchParams(location.search);
  const forceIntro = params.has('intro');
  if (forceIntro || (!location.hash && !alreadySeen)) {
    show();
  } else {
    gate.hidden = true;
    site.inert = false;
    root.classList.remove('envelope-pending', 'env-on');
  }

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    if (restoreGateFromCache) {
      restoreGateFromCache = false;
      show();
      return;
    }
    site.inert = false;
    root.classList.remove('envelope-pending', 'env-on');
    document.dispatchEvent(new CustomEvent('envelope:opened'));
  });
})();
