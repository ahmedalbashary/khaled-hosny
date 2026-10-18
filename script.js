(function () {
  'use strict';
  /* ===== CONFIG ===== */
  const WEDDING_DATE = new Date('2026-12-05T19:00:00').getTime();
  const COUNT_START  = new Date('2026-01-01T00:00:00').getTime(); // where the "boss bar" starts full
  const RSVP_ENDPOINT = '';   // e.g. a Formspree URL (JSON POST). Leave '' to skip.
  const WHATSAPP_NUMBER = ''; // e.g. '201001234567' — opens a prefilled WhatsApp message instead.
  const STORY = [
    ['✦', 'البداية', 'تعارفنا في يوم عادي، لكن نظرة واحدة كانت كافية لتبدأ قصة العمر، ابتسامة كانت فاتحة حديث لم ينتهِ إلى اليوم.'],
    ['♡', 'المسيرة', 'مشينا معاً في دروب الحياة، نتقاسم الأفراح والأحزان، نتعلم من كل تجربة، ونكبر معاً بقلوب مليئة بالحب.'],
    ['∞', 'الوعد', 'اليوم نقف أمامكم لنعاهد بعضنا البعض على الحب والوفاء، ونرجو من الله أن يبارك مسيرتنا ويملأ حياتنا سعادة.']
  ];

  const $ = id => document.getElementById(id);
  let soundOn = true, ac;
  function beep(f, d = .12) {
    if (!soundOn) return;
    try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.value = .04; o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + d); } catch (e) {}
  }
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }

  /* ===== Start ===== */
  const audio = $('bgMusic'), musicBtn = $('musicToggle');
  function start() {
    if ($('title').classList.contains('gone')) return;
    $('title').classList.add('gone'); $('game').hidden = false; document.body.classList.remove('locked');
    beep(523); setTimeout(() => beep(784, .2), 120);
    audio.play().then(() => musicBtn.classList.add('playing')).catch(() => {});
    window.scrollTo(0, 0);
  }
  $('startBtn').addEventListener('click', start);
  addEventListener('keydown', e => { if (e.key === 'Enter') start(); });
  musicBtn.addEventListener('click', () => {
    if (audio.paused) { audio.play().then(() => { musicBtn.classList.add('playing'); soundOn = true; }).catch(() => {}); }
    else { audio.pause(); musicBtn.classList.remove('playing'); soundOn = false; }
  });

  /* ===== HUD: progress + level label ===== */
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('meterFill').style.width = Math.min(100, scrollY / max * 100) + '%';
  }, { passive: true });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $('levelLabel').textContent = e.target.dataset.label; }), { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('[data-label]').forEach(s => io.observe(s));

  /* ===== Story cutscene ===== */
  let step = 0;
  function showStep() {
    const [i, t, p] = STORY[step];
    $('cutIcon').textContent = i; $('cutTitle').textContent = t; $('cutText').textContent = p;
    $('cutDots').innerHTML = STORY.map((_, n) => `<i class="${n === step ? 'on' : ''}"></i>`).join('');
    $('cutNext').textContent = step === STORY.length - 1 ? 'من البداية' : 'التالي';
  }
  $('cutNext').addEventListener('click', () => { step = (step + 1) % STORY.length; beep(440 + step * 110); showStep(); });
  showStep();

  /* ===== Countdown ===== */
  const pad = n => String(Math.max(0, n)).padStart(2, '0');
  function tick() {
    const diff = Math.max(0, WEDDING_DATE - Date.now());
    $('days').textContent = pad(Math.floor(diff / 864e5));
    $('hours').textContent = pad(Math.floor(diff / 36e5 % 24));
    $('minutes').textContent = pad(Math.floor(diff / 6e4 % 60));
    $('seconds').textContent = pad(Math.floor(diff / 1e3 % 60));
    $('timeBar').style.width = Math.min(100, diff / (WEDDING_DATE - COUNT_START) * 100) + '%';
  }
  tick(); setInterval(tick, 1000);

  /* ===== Gallery collectibles (set data-photo="assets/photo1.jpg" in index.html) ===== */
  let got = 0;
  document.querySelectorAll('.slot').forEach(s => {
    if (s.dataset.photo) s.style.setProperty('--photo', `url(${s.dataset.photo})`);
    s.addEventListener('click', () => {
      if (s.classList.contains('got')) return;
      s.classList.add('got'); beep(660); $('gotCount').textContent = ++got;
      if (got === 6) toast('إنجاز: جمعت كل اللحظات!');
    });
  });

  /* ===== Co-op door: hold both pads together ===== */
  const pads = { 1: $('pad1'), 2: $('pad2') }, held = { 1: 0, 2: 0 }, keys = { a: 1, l: 2 };
  let sync = 0, opened = false, last = performance.now();
  const setHeld = (k, v) => { held[k] = v; pads[k].classList.toggle('on', !!v); };
  Object.entries(pads).forEach(([k, el]) => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); setHeld(k, 1); beep(300 + k * 150, .06); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => setHeld(k, 0)));
    el.addEventListener('contextmenu', e => e.preventDefault());
  });
  addEventListener('keydown', e => { const k = keys[e.key.toLowerCase()]; if (k && !e.repeat && !e.target.closest('form')) setHeld(k, 1); });
  addEventListener('keyup', e => { const k = keys[e.key.toLowerCase()]; if (k) setHeld(k, 0); });

  function openGate() {
    if (opened) return; opened = true;
    $('gate').classList.add('open'); $('rsvpForm').removeAttribute('inert');
    $('syncBar').style.width = '100%'; $('soloBtn').hidden = true;
    pads[1].disabled = pads[2].disabled = true;
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .18), i * 110));
    toast('إنجاز: It Takes Two ✦');
    const cols = ['#D6322B', '#F2B01E', '#2F3E8F', '#FFD23F', '#fff'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div'); c.className = 'cf';
      c.style.cssText = `left:${Math.random() * 100}vw;background:${cols[i % 5]};animation-delay:${Math.random() * .6}s`;
      document.body.appendChild(c); setTimeout(() => c.remove(), 3500);
    }
  }
  $('soloBtn').addEventListener('click', openGate);
  (function loop(t) {
    const dt = (t - last) / 1000; last = t;
    if (!opened) {
      sync = held[1] && held[2] ? Math.min(1, sync + dt / 1.2) : Math.max(0, sync - dt * 2);
      $('syncBar').style.width = sync * 100 + '%';
      if (sync >= 1) openGate();
    }
    requestAnimationFrame(loop);
  })(last);

  /* ===== RSVP ===== */
  $('rsvpForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f)), yes = d.attending === 'yes', st = $('formStatus');
    const thanks = yes ? `شكراً ${d.name}، تم تأكيد حضوركم بنجاح. نتطلع لرؤيتكم!` : `شكراً ${d.name} على ردّكم. نتمنى لو كنا معاً.`;
    try {
      if (RSVP_ENDPOINT) {
        const r = await fetch(RSVP_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) });
        if (!r.ok) throw new Error();
        st.textContent = thanks;
      } else if (WHATSAPP_NUMBER) {
        const msg = `${yes ? 'سأحضر' : 'أعتذر عن الحضور'} — ${d.name} (${d.count} أشخاص)\n${d.message || ''}`;
        open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank'); st.textContent = thanks;
      } else { st.textContent = 'وضع تجريبي: لم يُرسل الرد. اضبط RSVP_ENDPOINT أو WHATSAPP_NUMBER في script.js'; return; }
      f.reset(); beep(784, .2);
    } catch (err) { st.textContent = 'تعذّر الإرسال، حاول مرة أخرى.'; }
  });
})();
