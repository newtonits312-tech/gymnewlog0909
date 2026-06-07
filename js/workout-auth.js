(function () {
  'use strict';

  var USERS_KEY = 'workout_accounts_v1';
  var SESSION_KEY = 'workout_session_v1';
  var MIN_PASSWORD_LEN = 8;
  var ADMIN_EMAIL = 'admin@workout.app';
  var currentUser = null;

  function useCloud() {
    return !!(window.WorkoutSupabase && window.WorkoutSupabase.isConfigured() && window.WorkoutSupabase.getClient());
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function resolveLoginEmail(input) {
    var raw = String(input || '').trim().toLowerCase();
    if (raw === 'admin') return ADMIN_EMAIL;
    return raw;
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

  function isAdminUser(user) {
    if (window.WorkoutSync && window.WorkoutSync.isAdminUser) {
      return window.WorkoutSync.isAdminUser(user);
    }
    return normalizeEmail(user && user.email) === ADMIN_EMAIL;
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
    if (avatarEl) avatarEl.textContent = isAdminUser(user) ? '👑' : '🏋️';
    if (editName) editName.value = user.name || handle;
    if (editHandle) editHandle.value = handle;

    if (typeof window.profName !== 'undefined') window.profName = user.name || handle;
    if (typeof window.profHandle !== 'undefined') window.profHandle = handle;
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();
    if (typeof updateProfileStats === 'function') updateProfileStats();

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
  }

  function hideGate() {
    var gate = document.getElementById('authGate');
    if (gate) gate.classList.remove('open');
    document.body.classList.remove('auth-locked');
    showError('');
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
      sub.textContent = isLogin ? 'Welcome back.' : 'Create your account.';
    }
    showError('');
    if (!isLogin) updateSignupPasswordUI();
  }

  function loadAccountData(user, opts) {
    opts = opts || {};
    var sync = window.WorkoutSync;
    if (!sync) return Promise.resolve();

    if (sync.setActiveUser) sync.setActiveUser(user);

    if (opts.isNewAccount) {
      if (sync.resetToFreshAccount) sync.resetToFreshAccount();
      if (useCloud() && sync.push) return sync.push();
      return Promise.resolve();
    }

    if (useCloud() && sync.pull) {
      return sync.pull().then(function (hadData) {
        if (hadData) return;
        if (isAdminUser(user)) {
          if (sync.migrateLegacyLocalStorage && sync.migrateLegacyLocalStorage()) {
            return sync.push ? sync.push() : undefined;
          }
          if (sync.loadDemoSeed) sync.loadDemoSeed();
          return sync.push ? sync.push() : undefined;
        }
        if (sync.resetToFreshAccount) sync.resetToFreshAccount();
        return sync.push ? sync.push() : undefined;
      });
    }

    if (sync.loadLocalState) sync.loadLocalState();
    if (sync.hasLocalWorkoutData && sync.hasLocalWorkoutData()) return Promise.resolve();
    if (isAdminUser(user)) {
      if (sync.migrateLegacyLocalStorage && sync.migrateLegacyLocalStorage()) {
        if (sync.saveLocalState) sync.saveLocalState();
        return Promise.resolve();
      }
      if (sync.loadDemoSeed) sync.loadDemoSeed();
      return Promise.resolve();
    }
    if (sync.resetToFreshAccount) sync.resetToFreshAccount();
    return Promise.resolve();
  }

  function afterLogin(user, welcomeName, opts) {
    currentUser = user;
    applyUserToProfile(user);
    hideGate();

    loadAccountData(user, opts).finally(function () {
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
      afterLogin({ email: email, name: name, memberSince: createdAt, handle: handleFromEmail(email) }, name, { isNewAccount: true });
      document.getElementById('authSignupForm')?.reset();
      updateSignupPasswordUI();
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
      }, null, {});
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
    var appMeta = user.app_metadata || {};
    return {
      email: user.email || '',
      name: meta.name || meta.full_name || handleFromEmail(user.email || ''),
      memberSince: user.created_at,
      handle: handleFromEmail(user.email || ''),
      id: user.id,
      role: appMeta.role || ''
    };
  }

  function friendlySupabaseError(err) {
    if (!err) return 'Something went wrong. Try again.';
    var code = err.code || err.error_code || '';
    if (code === 'email_address_invalid') {
      return 'Supabase rejected this email. Use a real address you own (not test names like random@…), check spelling (@gmail.com not .con), then try again.';
    }
    if (code === 'over_email_send_rate_limit') {
      return 'Too many signup attempts. Wait an hour, or turn off email confirmation in Supabase Auth settings.';
    }
    if (code === 'email_address_not_authorized') {
      return 'This email cannot receive Supabase confirmation mail on the free plan. Turn off “Confirm email” in Supabase Auth, or use custom SMTP.';
    }
    if (code === 'user_already_exists' || code === 'email_exists') {
      return 'An account with this email already exists. Try logging in instead.';
    }
    if (code === 'invalid_credentials') {
      return 'Incorrect email or password.';
    }
    return err.message || 'Could not complete request.';
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
      afterLogin(cloudUserFromSession(res.data.user), name, { isNewAccount: true });
      document.getElementById('authSignupForm')?.reset();
      updateSignupPasswordUI();
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

  // ── Password strength + match UI ──

  function scorePassword(password) {
    var score = 0;
    if (!password) return { score: 0, label: '' };
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    var labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
    return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
  }

  function updateSignupPasswordUI() {
    var password = document.getElementById('signupPassword')?.value || '';
    var confirm = document.getElementById('signupConfirm')?.value || '';
    var meter = document.getElementById('signupPasswordMeter');
    var fill = document.getElementById('signupMeterFill');
    var label = document.getElementById('signupMeterLabel');
    var matchHint = document.getElementById('signupMatchHint');
    var confirmInput = document.getElementById('signupConfirm');

    if (meter && fill && label) {
      if (!password) {
        meter.hidden = true;
      } else {
        meter.hidden = false;
        var result = scorePassword(password);
        fill.style.width = ((result.score / 4) * 100) + '%';
        fill.dataset.level = String(result.score);
        label.textContent = result.label;
      }
    }

    if (matchHint && confirmInput) {
      if (!confirm) {
        matchHint.textContent = '';
        matchHint.className = 'auth-match-hint';
        confirmInput.classList.remove('auth-input-match', 'auth-input-mismatch');
      } else if (password === confirm) {
        matchHint.textContent = 'Passwords match';
        matchHint.className = 'auth-match-hint is-match';
        confirmInput.classList.add('auth-input-match');
        confirmInput.classList.remove('auth-input-mismatch');
      } else {
        matchHint.textContent = 'Passwords do not match';
        matchHint.className = 'auth-match-hint is-mismatch';
        confirmInput.classList.add('auth-input-mismatch');
        confirmInput.classList.remove('auth-input-match');
      }
    }
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
      showError(useCloud() ? friendlySupabaseError(err) : (err && err.message ? err.message : 'Could not create account.'));
    });
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    showError('');

    var email = resolveLoginEmail(document.getElementById('loginEmail')?.value);
    var password = document.getElementById('loginPassword')?.value || '';

    if (!isValidEmail(email)) { showError('Enter a valid email or admin.'); return; }

    var action = useCloud()
      ? cloudLogin(email, password)
      : localLogin(email, password);

    Promise.resolve(action).catch(function (err) {
      showError(useCloud() ? friendlySupabaseError(err) : (err && err.message ? err.message : 'Could not log in.'));
    });
  }

  function signOut() {
    currentUser = null;
    if (window.WorkoutSync && window.WorkoutSync.setActiveUser) window.WorkoutSync.setActiveUser(null);
    if (window.WorkoutSync && window.WorkoutSync.resetToFreshAccount) window.WorkoutSync.resetToFreshAccount();
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
    document.getElementById('signupPassword')?.addEventListener('input', updateSignupPasswordUI);
    document.getElementById('signupConfirm')?.addEventListener('input', updateSignupPasswordUI);
  }

  function init() {
    var gate = document.getElementById('authGate');
    if (!gate) return;

    bindForms();
    setAuthMode('login');

    if (useCloud()) {
      loadCloudUser().then(function (user) {
        if (user) {
          currentUser = user;
          if (window.WorkoutSync && window.WorkoutSync.setActiveUser) window.WorkoutSync.setActiveUser(user);
          return loadAccountData(user, {}).then(function () {
            applyUserToProfile(user);
            hideGate();
          });
        }
        showGate();
      });
      return;
    }

    currentUser = loadLocalUser();
    if (currentUser) {
      if (window.WorkoutSync && window.WorkoutSync.setActiveUser) window.WorkoutSync.setActiveUser(currentUser);
      loadAccountData(currentUser, {}).then(function () {
        applyUserToProfile(currentUser);
        hideGate();
      });
      return;
    }
    showGate();
  }

  window.WorkoutAuth = {
    getUser: function () { return currentUser; },
    isSignedIn: function () { return !!currentUser; },
    signOut: signOut,
    useCloud: useCloud,
    ADMIN_EMAIL: ADMIN_EMAIL
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
