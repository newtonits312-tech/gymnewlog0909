(function () {
  'use strict';

  var USERS_KEY = 'workout_accounts_v1';
  var SESSION_KEY = 'workout_session_v1';
  var MIN_PASSWORD_LEN = 6;
  var currentUser = null;

  function useCloud() {
    return !!(window.WorkoutSupabase && window.WorkoutSupabase.isConfigured() && window.WorkoutSupabase.getClient());
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleFromEmail(email) {
    var at = email.indexOf('@');
    return at > 0 ? email.slice(0, at) : 'user';
  }

  function formatMemberSince(iso) {
    if (!iso) return 'Recently';
    var date = new Date(iso);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  function applyUserToProfile(user) {
    if (!user) return;
    var nameEl = document.getElementById('profName') || document.querySelector('.prof-name');
    var handleEl = document.getElementById('profHandle') || document.querySelector('.prof-handle');
    var avatarEl = document.getElementById('profAvatar') || document.querySelector('.prof-avatar');
    var editName = document.getElementById('editName');
    var editHandle = document.getElementById('editHandle');
    var handle = user.handle || handleFromEmail(user.email);
    var sinceLabel = useCloud() ? 'Synced' : ('Since ' + formatMemberSince(user.memberSince));

    if (nameEl) nameEl.textContent = user.name || handle;
    if (handleEl) handleEl.textContent = '@' + handle + ' · ' + sinceLabel;
    if (avatarEl) avatarEl.textContent = '🏋️';
    if (editName) editName.value = user.name || handle;
    if (editHandle) editHandle.value = handle;

    if (typeof window.profName !== 'undefined') window.profName = user.name || handle;
    if (typeof window.profHandle !== 'undefined') window.profHandle = handle;
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();

    document.dispatchEvent(new CustomEvent('workout:auth', { detail: { user: user } }));
  }

  function showError(message) {
    var err = document.getElementById('authError');
    if (!err) return;
    if (message) {
      err.textContent = message;
      err.hidden = false;
    } else {
      err.hidden = true;
    }
  }

  function showGate() {
    var gate = document.getElementById('authGate');
    if (gate) gate.classList.add('open');
    document.body.classList.add('auth-locked');
    updateSetupPanel();
  }

  function hideGate() {
    var gate = document.getElementById('authGate');
    if (gate) gate.classList.remove('open');
    document.body.classList.remove('auth-locked');
    showError('');
  }

  function updateSetupPanel() {
    var setup = document.getElementById('authSetup');
    var note = document.getElementById('authStorageNote');
    if (setup) setup.hidden = useCloud();
    if (note) {
      note.innerHTML = useCloud()
        ? 'Cloud sync enabled — same account works on phone &amp; computer (free Supabase).'
        : 'Device-only until you add <strong>SUPABASE_URL</strong> and <strong>SUPABASE_ANON_KEY</strong> in Vercel.';
    }
  }

  function setAuthMode(mode) {
    var loginForm = document.getElementById('authLoginForm');
    var signupForm = document.getElementById('authSignupForm');
    var loginTab = document.getElementById('authTabLogin');
    var signupTab = document.getElementById('authTabSignup');
    var sub = document.getElementById('authGateSub');
    var isLogin = mode === 'login';

    if (loginForm) loginForm.hidden = !isLogin;
    if (signupForm) signupForm.hidden = isLogin;
    if (loginTab) loginTab.classList.toggle('active', isLogin);
    if (signupTab) signupTab.classList.toggle('active', !isLogin);
    if (loginTab) loginTab.setAttribute('aria-selected', isLogin ? 'true' : 'false');
    if (signupTab) signupTab.setAttribute('aria-selected', !isLogin ? 'true' : 'false');
    if (sub) {
      sub.textContent = isLogin
        ? 'Log in — your workouts sync across devices.'
        : 'Create your free account for cloud sync.';
    }
    showError('');
  }

  function afterLogin(user, welcomeName) {
    currentUser = user;
    applyUserToProfile(user);
    hideGate();

    var syncPromise = Promise.resolve();
    if (window.WorkoutSync && window.WorkoutSync.isEnabled()) {
      syncPromise = window.WorkoutSync.pull().then(function (hadData) {
        if (!hadData && window.WorkoutSync.push) return window.WorkoutSync.push();
      });
    }

    syncPromise.finally(function () {
      if (typeof showToast === 'function') {
        showToast('Welcome, ' + (welcomeName || user.name || 'back') + (useCloud() ? ' — synced' : '') + '!');
      }
    });
  }

  // ── Local-only fallback (no Supabase keys) ──

  function loadUsers() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function loadSessionEmail() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var session = JSON.parse(raw);
      return session && session.email ? normalizeEmail(session.email) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSession(email) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: normalizeEmail(email) }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function randomSalt() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function hashPassword(password, salt) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + password)).then(function (buf) {
      return Array.from(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function localSignup(name, email, password) {
    if (getUserByEmailLocal(email)) {
      showError('An account with this email already exists. Try logging in.');
      return;
    }
    var salt = randomSalt();
    return hashPassword(password, salt).then(function (passwordHash) {
      var users = loadUsers();
      var createdAt = new Date().toISOString();
      users[email] = { email: email, name: name, salt: salt, passwordHash: passwordHash, createdAt: createdAt };
      saveUsers(users);
      saveSession(email);
      afterLogin({ email: email, name: name, memberSince: createdAt, handle: handleFromEmail(email) }, name);
      document.getElementById('authSignupForm')?.reset();
    });
  }

  function getUserByEmailLocal(email) {
    return loadUsers()[normalizeEmail(email)] || null;
  }

  function localLogin(email, password) {
    var record = getUserByEmailLocal(email);
    if (!record) {
      showError('No account found for this email. Sign up first.');
      return Promise.resolve();
    }
    return hashPassword(password, record.salt).then(function (hash) {
      if (hash !== record.passwordHash) {
        showError('Incorrect password. Try again.');
        return;
      }
      saveSession(email);
      afterLogin({
        email: record.email,
        name: record.name,
        memberSince: record.createdAt,
        handle: handleFromEmail(record.email)
      });
      document.getElementById('authLoginForm')?.reset();
    });
  }

  function loadLocalUser() {
    var email = loadSessionEmail();
    if (!email) return null;
    var record = getUserByEmailLocal(email);
    if (!record) {
      clearSession();
      return null;
    }
    return {
      email: record.email,
      name: record.name,
      memberSince: record.createdAt,
      handle: handleFromEmail(record.email)
    };
  }

  // ── Supabase cloud auth + sync ──

  function cloudUserFromSession(user) {
    var meta = user.user_metadata || {};
    return {
      email: user.email || '',
      name: meta.name || meta.full_name || handleFromEmail(user.email || ''),
      memberSince: user.created_at,
      handle: handleFromEmail(user.email || ''),
      id: user.id
    };
  }

  function cloudSignup(name, email, password) {
    var sb = window.WorkoutSupabase.getClient();
    return sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { name: name } }
    }).then(function (res) {
      if (res.error) throw res.error;
      if (!res.data.user) throw new Error('Sign up failed');
      if (!res.data.session) {
        showError('Check your email to confirm the account, or disable email confirmation in Supabase.');
        return;
      }
      afterLogin(cloudUserFromSession(res.data.user), name);
      document.getElementById('authSignupForm')?.reset();
    });
  }

  function cloudLogin(email, password) {
    var sb = window.WorkoutSupabase.getClient();
    return sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) throw res.error;
      if (!res.data.user) throw new Error('Login failed');
      afterLogin(cloudUserFromSession(res.data.user));
      document.getElementById('authLoginForm')?.reset();
    });
  }

  function loadCloudUser() {
    if (!useCloud()) return Promise.resolve(null);
    var sb = window.WorkoutSupabase.getClient();
    return sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session || !session.user) return null;
      return cloudUserFromSession(session.user);
    });
  }

  function cloudSignOut() {
    var sb = window.WorkoutSupabase.getClient();
    return sb.auth.signOut();
  }

  // ── Form handlers ──

  function handleSignupSubmit(e) {
    e.preventDefault();
    showError('');

    var name = (document.getElementById('signupName')?.value || '').trim();
    var email = normalizeEmail(document.getElementById('signupEmail')?.value);
    var password = document.getElementById('signupPassword')?.value || '';
    var confirm = document.getElementById('signupConfirm')?.value || '';

    if (!name) { showError('Enter your name.'); return; }
    if (!isValidEmail(email)) { showError('Enter a valid email address.'); return; }
    if (password.length < MIN_PASSWORD_LEN) {
      showError('Password must be at least ' + MIN_PASSWORD_LEN + ' characters.');
      return;
    }
    if (password !== confirm) { showError('Passwords do not match.'); return; }

    var action = useCloud()
      ? cloudSignup(name, email, password)
      : localSignup(name, email, password);

    Promise.resolve(action).catch(function (err) {
      showError(err && err.message ? err.message : 'Could not create account.');
    });
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    showError('');

    var email = normalizeEmail(document.getElementById('loginEmail')?.value);
    var password = document.getElementById('loginPassword')?.value || '';

    if (!isValidEmail(email)) { showError('Enter a valid email address.'); return; }

    var action = useCloud()
      ? cloudLogin(email, password)
      : localLogin(email, password);

    Promise.resolve(action).catch(function (err) {
      showError(err && err.message ? err.message : 'Could not log in.');
    });
  }

  function signOut() {
    currentUser = null;
    if (useCloud()) {
      cloudSignOut().finally(function () {
        setAuthMode('login');
        showGate();
        if (typeof showToast === 'function') showToast('Signed out');
      });
      return;
    }
    clearSession();
    setAuthMode('login');
    showGate();
    if (typeof showToast === 'function') showToast('Signed out');
  }

  function bindForms() {
    document.getElementById('authTabLogin')?.addEventListener('click', function () { setAuthMode('login'); });
    document.getElementById('authTabSignup')?.addEventListener('click', function () { setAuthMode('signup'); });
    document.getElementById('authLoginForm')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('authSignupForm')?.addEventListener('submit', handleSignupSubmit);
  }

  function init() {
    var gate = document.getElementById('authGate');
    if (!gate) return;

    bindForms();
    setAuthMode('login');
    updateSetupPanel();

    if (useCloud()) {
      loadCloudUser().then(function (user) {
        if (user) {
          currentUser = user;
          return window.WorkoutSync && window.WorkoutSync.pull
            ? window.WorkoutSync.pull().then(function () { applyUserToProfile(user); hideGate(); })
            : (applyUserToProfile(user), hideGate());
        }
        showGate();
      });
      return;
    }

    currentUser = loadLocalUser();
    if (currentUser) {
      applyUserToProfile(currentUser);
      hideGate();
      return;
    }
    showGate();
  }

  window.WorkoutAuth = {
    getUser: function () { return currentUser; },
    isSignedIn: function () { return !!currentUser; },
    signOut: signOut,
    useCloud: useCloud
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
