/* Bolingo Learn — adaptive wireframes v3 interactions. No dependencies. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 1900);
  };

  // Mirrors lib/lifeStage.ts (stageForAge + LIFE_STAGES ux).
  const TIERS = {
    explorer: { n: 1, name: 'Gamified Explorer', ages: '10–18', gam: 0.95, gamT: 'High', den: 0.3, denT: 'Roomy', min: 10, audio: 'Off', cel: 'Full storm', type: 'Baloo 2',
      psych: 'Wants: mastery you can see, friends to beat, a story to finish. Hates: walls of text.' },
    launcher: { n: 2, name: 'Career Launcher', ages: '19–25', gam: 0.55, gamT: 'Medium', den: 0.55, denT: 'Balanced', min: 15, audio: 'Off', cel: 'Quick line', type: 'Bricolage Grotesque',
      psych: 'Wants: a real goal, people on the same path, proof an employer believes. Hates: busywork.' },
    climber: { n: 3, name: 'Career Ladder Climber', ages: '26–40', gam: 0.15, gamT: 'Low', den: 0.85, denT: 'Compact', min: 5, audio: 'On', cel: 'One quiet line', type: 'Fraunces',
      psych: 'Wants: five minutes that count, an outcome on a date, control. Hates: being treated like a kid.' },
  };
  const stageForAge = (a) => (a <= 18 ? 'explorer' : a <= 25 ? 'launcher' : 'climber');
  const words = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four','thirty-five','thirty-six','thirty-seven','thirty-eight','thirty-nine','forty'];

  const age = $('#age');
  let current = null;
  function apply(a) {
    $('#age-out').textContent = a;
    $('#strip-who').textContent = 'at ' + words[a - 10];
    const id = stageForAge(a);
    if (id === current) return;
    current = id;
    const t = TIERS[id];
    document.body.dataset.tier = id;
    $('#eng-name').textContent = t.name;
    $('#eng-gam').style.setProperty('--v', t.gam); $('#eng-gam-t').textContent = t.gamT;
    $('#eng-den').style.setProperty('--v', t.den); $('#eng-den-t').textContent = t.denT;
    $('#eng-min').textContent = t.min; $('#eng-audio').textContent = t.audio;
    $('#eng-cel').textContent = t.cel; $('#eng-type').textContent = t.type;
    $('#eng-psych').textContent = t.psych;
    $('#dial-tier').textContent = t.name;
    $('#strip-kicker').textContent = `Tier ${t.n} · ${t.name} · ages ${t.ages}`;
    $$('.tier-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.go === id)));
    $$('.strip').forEach((s) => (s.hidden = s.dataset.strip !== id));
  }
  age.addEventListener('input', () => apply(+age.value));
  $$('.tier-tabs button').forEach((b) =>
    b.addEventListener('click', () => { age.value = b.dataset.age; apply(+b.dataset.age); })
  );
  apply(+age.value);

  // ---------- Tier 1: boss battle ----------
  let combo = 0, hp = 1;
  const burst = $('#xp-burst');
  function confetti(host) {
    const colors = ['#FFC94D', '#FF8A3D', '#38C6A0', '#4FD8FF', '#FF4F7B'];
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--c', colors[i % colors.length]);
      p.style.setProperty('--dx', (Math.random() * 260 - 130) + 'px');
      p.style.setProperty('--dy', (Math.random() * -240 - 40) + 'px');
      host.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
  }
  $$('.battle-opts button').forEach((btn) =>
    btn.addEventListener('click', () => {
      const ok = btn.dataset.ok === '1';
      $$('.battle-opts button').forEach((b) => b.classList.remove('right', 'wrong'));
      if (ok) {
        combo++;
        hp = Math.max(0, hp - 0.22 * Math.min(combo, 3));
        btn.classList.add('right');
        burst.textContent = '+' + 15 * combo + ' XP';
        burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go');
        confetti($('#confetti'));
        $('#battle-foot').textContent = hp === 0 ? 'Glitch Golem defeated! The chest is yours.' : combo >= 3 ? 'Critical hit! Keep the combo alive.' : 'Direct hit. Tap it again to build the combo.';
        if (hp === 0) setTimeout(() => { hp = 1; combo = 0; $('#boss-hp').style.setProperty('--p', 1); $('#combo-n').textContent = '×0'; }, 2200);
      } else {
        combo = 0;
        btn.classList.add('wrong');
        $('#battle-foot').textContent = 'Close! <h1> is the biggest heading. No hearts lost on a practice round.';
      }
      $('#boss-hp').style.setProperty('--p', hp);
      $('#combo-n').textContent = '×' + combo;
      const c = $('#combo'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    })
  );

  // ---------- Tier 1: chest ----------
  const prizes = ['Comet trail (cosmetic)', 'Sunset outfit (cosmetic)', '+40 gems', 'Streak shield', 'Golden owl frame (cosmetic)'];
  $('#chest').addEventListener('click', (e) => {
    const c = e.currentTarget;
    if (c.classList.contains('open')) { c.classList.remove('open'); $('#loot').textContent = 'Tap the chest. Every chest has a prize.'; return; }
    c.classList.add('open');
    $('#loot').textContent = 'You got: ' + prizes[Math.floor(Math.random() * prizes.length)];
    confetti(c.closest('.phone').appendChild(Object.assign(document.createElement('div'), { className: 'confetti' })));
  });

  // ---------- Tier 1: tournament countdown ----------
  let left = 45;
  setInterval(() => {
    left = left <= 0 ? 45 : left - 1;
    $('#arena-t').textContent = '00:' + String(left).padStart(2, '0');
  }, 1000);
  $('#ready').addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('is-ready');
    e.currentTarget.textContent = e.currentTarget.classList.contains('is-ready') ? 'Ready! Waiting for squads' : "I'm ready";
  });

  // ---------- Tier 1: avatar ----------
  $$('.swatches button').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.swatches button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      $('#avatar').style.setProperty('--fit', b.style.getPropertyValue('--c'));
    })
  );
  $$('.unlock[data-hat]').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.unlock[data-hat]').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      $('#av-hat').className = 'av-hat' + (b.dataset.hat === 'cap' ? ' cap' : '');
    })
  );
  $$('.unlock.locked').forEach((b) => b.parentElement.addEventListener('click', (e) => { if (e.target.closest('.locked')) toast('Keep a 7-day streak to unlock this.'); }));

  // ---------- Tier 2: study room ----------
  let pomo = 25 * 60, running = false, timer = null;
  $('#join').addEventListener('click', (e) => {
    running = !running;
    e.currentTarget.textContent = running ? 'Leave room' : 'Join with camera off';
    $('#room-count').textContent = (running ? 15 : 14) + ' in room';
    const grid = $('#room-grid');
    if (running) {
      const me = document.createElement('li');
      me.className = 'me'; me.style.setProperty('--c', '#E0663A'); me.innerHTML = 'You<small>JS arrays</small>';
      grid.appendChild(me);
      timer = setInterval(() => { pomo = Math.max(0, pomo - 1); $('#pomo').textContent = String(Math.floor(pomo / 60)).padStart(2, '0') + ':' + String(pomo % 60).padStart(2, '0'); }, 1000);
    } else {
      grid.querySelector('.me')?.remove(); clearInterval(timer);
    }
  });
  $$('.room-react button').forEach((b) =>
    b.addEventListener('click', () => {
      const me = $('#room-grid .me') || $('#room-grid li');
      const bub = document.createElement('span'); bub.className = 'bubble'; bub.textContent = b.dataset.r;
      me.appendChild(bub); setTimeout(() => bub.remove(), 1600);
    })
  );

  // ---------- Tier 2: portfolio + job match ----------
  function syncProject() {
    const boxes = $$('#tasks input');
    const p = boxes.filter((x) => x.checked).length / boxes.length;
    $('#proj-bar').style.setProperty('--p', p);
    $('#proj-pct').textContent = Math.round(p * 100) + '%';
    const match = 0.71 + (p - 0.5) * 0.4;
    $('#match-ring').style.setProperty('--p', match);
    $('#match-pct').textContent = Math.round(match * 100) + '%';
    if (p === 1) { $('#gap').className = 'ok'; $('#gap').textContent = 'React · portfolio-verified'; toast('Project shipped. Job match rose to ' + Math.round(match * 100) + '%.'); }
    else { $('#gap').className = 'gap'; $('#gap').textContent = 'React · 1 project short'; }
  }
  $$('#tasks input').forEach((x) => x.addEventListener('change', syncProject));
  $('#close-gap').addEventListener('click', () => { $$('#tasks input').forEach((x) => (x.checked = true)); syncProject(); });
  $$('.share-row button').forEach((b) => b.addEventListener('click', () => toast(b.textContent === 'Copy link' ? 'Verification link copied.' : 'Opening LinkedIn share…')));

  // ---------- Tier 3: commute player ----------
  const wave = $('#wave');
  const bars = [];
  for (let i = 0; i < 44; i++) {
    const b = document.createElement('i');
    b.style.setProperty('--h', (0.2 + Math.abs(Math.sin(i * 0.7)) * 0.6 + Math.random() * 0.2).toFixed(2));
    wave.appendChild(b); bars.push(b);
  }
  let pos = 43, dur = 242, speed = 1, playing = null;
  const paint = () => {
    $('#scrub').style.setProperty('--p', pos / dur);
    $('#t-now').textContent = Math.floor(pos / 60) + ':' + String(Math.floor(pos % 60)).padStart(2, '0');
    const k = Math.floor((pos / dur) * bars.length);
    bars.forEach((b, i) => b.classList.toggle('on', i <= k));
  };
  paint();
  $('#pp').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (playing) { clearInterval(playing); playing = null; btn.innerHTML = '<svg><use href="#i-play"/></svg>'; btn.setAttribute('aria-label', 'Play'); return; }
    btn.innerHTML = '<svg><use href="#i-pause"/></svg>'; btn.setAttribute('aria-label', 'Pause');
    playing = setInterval(() => {
      pos = Math.min(dur, pos + speed);
      paint();
      if (Math.floor(pos) === 200) toast('Checkpoint: say it back in one sentence.');
      if (pos >= dur) { clearInterval(playing); playing = null; toast('Episode done · finish date moved to 16 Dec'); }
    }, 1000);
  });
  $('.player button[aria-label^="Back"]').addEventListener('click', () => { pos = Math.max(0, pos - 15); paint(); });
  $('#speed').addEventListener('click', (e) => {
    const steps = [1, 1.25, 1.5, 2]; speed = steps[(steps.indexOf(speed) + 1) % steps.length];
    e.currentTarget.textContent = speed.toFixed(speed % 1 ? 2 : 1).replace(/0$/, '') + '×';
  });
  $('#t3-start').addEventListener('click', () => {
    age.value = 33; apply(33);
    $('#pp').scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Commute mode: press play.');
  });

  // ---------- Tier 3: flashcards ----------
  const cards = [
    ['What does <code>ROW_NUMBER() OVER (PARTITION BY team)</code> reset on?', 'It restarts the count at 1 for each <code>team</code>.'],
    ['<code>RANK()</code> vs <code>DENSE_RANK()</code>: which leaves gaps after ties?', '<code>RANK()</code>. Two firsts are followed by a third.'],
    ['What does <code>LAG(sales, 1)</code> return?', 'The previous row\'s <code>sales</code> in the window order.'],
    ['Why use a window function instead of <code>GROUP BY</code>?', 'It adds a per-group value without collapsing the rows.'],
  ];
  let card = 0;
  const flip = $('#flip');
  flip.addEventListener('click', () => flip.classList.toggle('on'));
  $$('.grade button').forEach((b) =>
    b.addEventListener('click', () => {
      const next = { again: 'in 10 minutes', good: 'in 3 days', easy: 'in 9 days' }[b.dataset.g];
      $('#card-foot').textContent = 'Next review ' + next + '.';
      card = (card + 1) % cards.length;
      flip.classList.remove('on');
      setTimeout(() => {
        $('.front b', flip).innerHTML = cards[card][0];
        $('.back b', flip).innerHTML = cards[card][1];
        $('#card-n').textContent = card + 1;
      }, 250);
    })
  );
  $$('.t3-ghost, .t2-cta, .t1-cta:not(#ready)').forEach((b) => b.addEventListener('click', () => { if (b.id !== 'join') toast('Wireframe action: ' + b.textContent.trim()); }));
})();
