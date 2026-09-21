(() => {
  // Подключать только сервис, возвращающий JSON { "ok": true } после сохранения.
  const ENDPOINT = '';

  const countdown = {
    days: document.getElementById('count-days'),
    hours: document.getElementById('count-hours'),
    minutes: document.getElementById('count-minutes'),
    seconds: document.getElementById('count-seconds')
  };

  if (Object.values(countdown).every(Boolean)) {
    const weddingStart = new Date('2027-01-15T15:30:00+03:00').getTime();
    const updateCountdown = () => {
      const remaining = Math.max(0, weddingStart - Date.now());
      const totalSeconds = Math.floor(remaining / 1000);
      countdown.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(3, '0');
      countdown.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
      countdown.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      countdown.seconds.textContent = String(totalSeconds % 60).padStart(2, '0');
    };
    updateCountdown();
    window.setInterval(updateCountdown, 1000);
  }

  const form = document.getElementById('rsvp-form');
  const details = document.getElementById('details-block');
  const message = document.getElementById('form-msg');
  const thanks = document.getElementById('thanks');

  // Анкета работает независимо от поддержки декоративных анимаций.
  if (form && details && message && thanks) {
    const nameField = form.elements.namedItem('name');
    const allergyField = form.elements.namedItem('allergy');
    const submitButton = form.querySelector('[type="submit"]');
    const attendanceFields = [...form.querySelectorAll('input[name="attending"]')];
    let submitting = false;

    const updateDetails = () => {
      const attending = form.querySelector('input[name="attending"]:checked');
      const isAttending = attending?.value === 'Обязательно приду';
      details.classList.toggle('hidden', !isAttending);
      details.hidden = !isAttending;

      if (!isAttending) {
        details.querySelectorAll('input').forEach((input) => {
          if (input.type === 'checkbox' || input.type === 'radio') input.checked = false;
          else input.value = '';
        });
      }
    };

    attendanceFields.forEach((radio) => {
      radio.addEventListener('change', () => {
        updateDetails();
        attendanceFields.forEach((field) => field.removeAttribute('aria-invalid'));
        message.textContent = '';
      });
    });
    nameField?.addEventListener('input', () => {
      nameField.removeAttribute('aria-invalid');
      message.textContent = '';
    });
    updateDetails();
    window.addEventListener('pageshow', updateDetails);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting || !nameField || !allergyField || !submitButton) return;

      const name = nameField.value.trim();
      const attending = form.querySelector('input[name="attending"]:checked');

      if (!name) {
        message.textContent = 'Напишите, пожалуйста, имя и фамилию';
        nameField.setAttribute('aria-invalid', 'true');
        nameField.focus();
        return;
      }
      nameField.removeAttribute('aria-invalid');

      if (!attending) {
        message.textContent = 'Отметьте, сможете ли вы прийти';
        attendanceFields.forEach((field) => field.setAttribute('aria-invalid', 'true'));
        attendanceFields[0]?.focus();
        return;
      }

      const isAttending = attending.value === 'Обязательно приду';
      const answer = {
        Отправлено: new Date().toLocaleString('ru-RU'),
        Гость: name,
        Присутствие: attending.value,
        Напитки: isAttending ? [...form.querySelectorAll('input[name="drinks"]:checked')].map((item) => item.value).join(', ') : '',
        Горячее: isAttending ? form.querySelector('input[name="main"]:checked')?.value || '' : '',
        Аллергия: isAttending ? allergyField.value.trim() : ''
      };

      if (!ENDPOINT) {
        message.innerHTML = 'Анкета пока не подключена. Передайте ответ <a href="tel:+79676250267">Натали: +7 967 625-02-67</a>';
        return;
      }

      submitting = true;
      submitButton.disabled = true;
      message.textContent = 'Отправляем…';
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(answer),
          signal: controller.signal
        });
        if (!response.ok) throw new Error('The server did not accept the answer');
        const acknowledgement = await response.json();
        if (acknowledgement?.ok !== true) throw new Error('Saving was not confirmed');

        form.classList.add('hidden');
        form.hidden = true;
        thanks.classList.remove('hidden');
        thanks.hidden = false;
        thanks.setAttribute('tabindex', '-1');
        thanks.focus({ preventScroll: true });
      } catch (error) {
        message.textContent = 'Не получилось отправить. Напишите, пожалуйста, Натали: +7 967 625-02-67';
      } finally {
        window.clearTimeout(timeout);
        submitting = false;
        submitButton.disabled = false;
      }
    });
  }

  const revealElements = [...document.querySelectorAll('[data-reveal]')];
  const motionPreference = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  const animations = new Set();
  let observer;
  let motionStarted = false;

  const showAll = () => {
    observer?.disconnect();
    revealElements.forEach((element) => element.classList.add('is-visible'));
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  };

  const reveal = (element) => {
    element.classList.add('is-visible');
    if (motionPreference?.matches || typeof element.animate !== 'function') return;
    try {
      const canLift = getComputedStyle(element).transform === 'none';
      const keyframes = canLift
        ? [
            { opacity: 0.16, transform: 'translateY(18px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ]
        : [{ opacity: 0.16 }, { opacity: 1 }];
      const animation = element.animate(
        keyframes,
        { duration: 950, easing: 'cubic-bezier(.22,.61,.36,1)' }
      );
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
      animation.oncancel = () => animations.delete(animation);
    } catch (error) {
      // Контент виден и при недоступном Web Animations API.
    }
  };

  const startMotion = () => {
    if (motionStarted) return;
    motionStarted = true;
    if (motionPreference?.matches || typeof window.IntersectionObserver !== 'function') {
      showAll();
      return;
    }
    try {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -3% 0px' });
      revealElements.forEach((element) => observer.observe(element));
    } catch (error) {
      showAll();
    }
  };

  const onMotionPreferenceChange = (event) => {
    if (event.matches) showAll();
  };
  if (typeof motionPreference?.addEventListener === 'function') {
    motionPreference.addEventListener('change', onMotionPreferenceChange);
  } else if (typeof motionPreference?.addListener === 'function') {
    motionPreference.addListener(onMotionPreferenceChange);
  }

  if (document.documentElement.classList.contains('env-on')) {
    document.addEventListener('envelope:opened', startMotion, { once: true });
  } else {
    startMotion();
  }
})();
