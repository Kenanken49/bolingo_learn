/* ============================================================
   Bolingo Learn — Hi-fi screens v2
   Small, dependency-free interactions for the design deck.
   ============================================================ */

(function () {
  'use strict';

  var root = document.documentElement;
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function toast(message) {
    if (!toastEl || !message) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('show');
    }, 3600);
  }

  /* ---------- Theme ---------- */

  // v3 key: the jungle expedition should not inherit an old light toggle.
  var THEME_KEY = 'bolingo.deck.theme.v3';
  var storedTheme = null;
  try {
    storedTheme = window.localStorage.getItem(THEME_KEY);
  } catch (err) {
    storedTheme = null;
  }
  // QD-OLED is the deck default; an explicit saved "light" choice wins.
  root.setAttribute('data-theme', storedTheme === 'light' ? 'light' : 'dark');

  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch (err) {}
      themeBtn.setAttribute(
        'aria-label',
        next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    });
    themeBtn.setAttribute(
      'aria-label',
      root.getAttribute('data-theme') === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  /* ---------- Screen filter ---------- */

  var filterButtons = Array.prototype.slice.call(
    document.querySelectorAll('[data-filter]')
  );
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-group]'));

  function applyFilter(filter) {
    filterButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-filter') === filter;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    groups.forEach(function (group) {
      var kind = group.getAttribute('data-group');
      group.hidden = filter !== 'all' && filter !== kind;
    });
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.getAttribute('data-filter'));
    });
  });

  /* ---------- Scroll / flash ---------- */

  function revealTarget(selector) {
    var target = document.querySelector(selector);
    if (!target) return null;

    var group = target.closest('[data-group]');
    if (group && group.hidden) applyFilter('all');

    var shot = target.closest('.shot');
    if (shot && shot !== target) {
      // keep the shot in view, not just its inner anchor
      target = shot;
    }

    var top = target.getBoundingClientRect().top + window.pageYOffset - 92;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    return shot || target;
  }

  document.addEventListener('click', function (event) {
    var goto = event.target.closest('[data-goto]');
    if (goto) {
      var shot = revealTarget('#' + goto.getAttribute('data-goto'));
      if (shot && shot.classList) {
        shot.classList.remove('flash');
        void shot.offsetWidth;
        shot.classList.add('flash');
        window.setTimeout(function () {
          shot.classList.remove('flash');
        }, 1300);
      } else {
        toast('This node opens the lesson screen.');
      }
      return;
    }

    var scroller = event.target.closest('[data-scroll]');
    if (scroller) {
      revealTarget(scroller.getAttribute('data-scroll'));
      return;
    }

    var action = event.target.closest('[data-toast]');
    if (action) {
      if (action.tagName === 'A' && action.getAttribute('href') === '#') {
        event.preventDefault();
      }
      toast(action.getAttribute('data-toast'));
    }
  });

  /* ---------- Lesson token builder ---------- */

  var bank = document.getElementById('token-bank');
  var dropzone = document.getElementById('dropzone');
  var feedback = document.getElementById('feedback');
  var checkBtn = document.getElementById('check-btn');
  var selected = [];
  var correct = false;

  function renderDropzone() {
    if (!dropzone) return;
    dropzone.innerHTML = '<span class="dz-label">Your answer</span>';

    if (selected.length === 0) {
      var empty = document.createElement('span');
      empty.className = 'dz-blank';
      empty.textContent = 'Tap a token to begin';
      dropzone.appendChild(empty);
      return;
    }

    selected.forEach(function (token) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'dz-tok';
      chip.textContent = token.value;
      chip.setAttribute('aria-label', 'Remove ' + token.value);
      chip.addEventListener('click', function () {
        removeToken(token);
      });
      dropzone.appendChild(chip);
    });
  }

  function syncBank() {
    if (!bank) return;
    Array.prototype.forEach.call(bank.querySelectorAll('.tok'), function (btn) {
      var picked = selected.some(function (token) {
        return token.el === btn;
      });
      btn.classList.toggle('sel', picked);
      btn.setAttribute('aria-pressed', picked ? 'true' : 'false');
    });
  }

  function resetFeedback() {
    correct = false;
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
      feedback.className = 'feedback';
    }
    if (checkBtn) checkBtn.textContent = 'CHECK ANSWER';
  }

  function addToken(btn) {
    selected.push({ el: btn, value: btn.getAttribute('data-token') || btn.textContent });
    syncBank();
    renderDropzone();
    resetFeedback();
  }

  function removeToken(token) {
    selected = selected.filter(function (item) {
      return item !== token;
    });
    syncBank();
    renderDropzone();
    resetFeedback();
  }

  if (bank) {
    bank.addEventListener('click', function (event) {
      var btn = event.target.closest('.tok');
      if (!btn) return;
      var picked = selected.some(function (token) {
        return token.el === btn;
      });
      if (picked) {
        removeToken(
          selected.filter(function (token) {
            return token.el === btn;
          })[0]
        );
      } else {
        addToken(btn);
      }
    });
  }

  if (checkBtn) {
    checkBtn.addEventListener('click', function () {
      if (correct) {
        toast('Back to the path — the next node is already unlocked.');
        return;
      }
      if (selected.length === 0) {
        toast('Tap the tokens above to build the answer first.');
        return;
      }

      var answer = selected
        .map(function (token) {
          return token.value;
        })
        .join('');

      if (answer === '<p>Hello</p>') {
        correct = true;
        if (feedback) {
          feedback.hidden = false;
          feedback.className = 'feedback ok';
          feedback.textContent = 'Correct! +10 XP — and the combo is now ×3.';
        }
        checkBtn.textContent = 'CONTINUE';
      } else {
        correct = false;
        if (feedback) {
          feedback.hidden = false;
          feedback.className = 'feedback bad';
          feedback.textContent =
            'Not quite — the closing tag must match the opening tag. Tap a token in the box to take it back.';
        }
      }
    });
  }

  renderDropzone();

  /* ---------- Auth preview ---------- */

  var authOut = document.getElementById('auth-out');
  var authIn = document.getElementById('auth-in');

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-auth]');
    if (!btn) return;
    var mode = btn.getAttribute('data-auth');
    if (authOut) authOut.hidden = mode !== 'out';
    if (authIn) authIn.hidden = mode !== 'in';
    if (mode === 'in') toast('Signed in — the account card uses the neutral learner avatar.');
  });

  /* ---------- Misc ---------- */

  Array.prototype.forEach.call(document.querySelectorAll('[data-toggle-lesson]'), function (btn) {
    btn.addEventListener('click', function () {
      toast('Closing mid-lesson keeps your progress; hearts only change on a wrong answer.');
    });
  });
})();
