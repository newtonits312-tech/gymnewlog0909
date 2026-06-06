(function () {
  'use strict';

  var STORAGE_KEY = 'workout_google_user_v1';
  var GIS_SRC = 'https://accounts.google.com/gsi/client';
  var currentUser = null;

  function getClientId() {
    var cfg = window.WORKOUT_AUTH_CONFIG || {};
    return (cfg.googleClientId || '').trim();
  }

  function decodeJwt(token) {
    try {
      var payload = token.split('.')[1];
      var json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function isTokenValid(claims) {
    return !!(claims && claims.exp && claims.exp * 1000 > Date.now());
  }

  function userFromCredential(credential) {
    var claims = decodeJwt(credential);
    if (!claims || !isTokenValid(claims)) return null;
    return {
      credential: credential,
      name: claims.name || '',
      email: claims.email || '',
      picture: claims.picture || '',
      sub: claims.sub || '',
      memberSince: claims.iat ? new Date(claims.iat * 1000) : new Date()
    };
  }

  function saveUser(user) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {}
  }

  function loadStoredUser() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var user = JSON.parse(raw);
      if (!user || !user.credential) return null;
      var fresh = userFromCredential(user.credential);
      if (!fresh) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      fresh.memberSince = user.memberSince ? new Date(user.memberSince) : fresh.memberSince;
      return fresh;
    } catch (e) {
      return null;
    }
  }

  function formatMemberSince(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  function handleFromEmail(email) {
    if (!email) return 'user';
    var at = email.indexOf('@');
    return at > 0 ? email.slice(0, at) : email;
  }

  function applyUserToProfile(user) {
    if (!user) return;
    var nameEl = document.getElementById('profName') || document.querySelector('.prof-name');
    var handleEl = document.getElementById('profHandle') || document.querySelector('.prof-handle');
    var avatarEl = document.getElementById('profAvatar') || document.querySelector('.prof-avatar');
    var editName = document.getElementById('editName');
    var editHandle = document.getElementById('editHandle');

    var handle = handleFromEmail(user.email);
    if (nameEl) nameEl.textContent = user.name || handle;
    if (handleEl) {
      handleEl.textContent = '@' + handle + ' · Since ' + formatMemberSince(user.memberSince);
    }
    if (avatarEl) {
      if (user.picture) {
        avatarEl.innerHTML = '<img src="' + user.picture + '" alt="" referrerpolicy="no-referrer" width="72" height="72">';
        avatarEl.dataset.googlePhoto = '1';
      } else {
        avatarEl.textContent = '🏋️';
        delete avatarEl.dataset.googlePhoto;
      }
    }
    if (editName) editName.value = user.name || handle;
    if (editHandle) editHandle.value = handle;

    if (typeof window.profName !== 'undefined') window.profName = user.name || handle;
    if (typeof window.profHandle !== 'undefined') window.profHandle = handle;
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();

    document.dispatchEvent(new CustomEvent('workout:auth', { detail: { user: user } }));
  }

  function showGate(message) {
    var gate = document.getElementById('authGate');
    var err = document.getElementById('authError');
    var setup = document.getElementById('authSetup');
    var hint = document.getElementById('authHint');
    if (gate) gate.classList.add('open');
    document.body.classList.add('auth-locked');
    var needsSetup = !getClientId();
    if (setup) setup.hidden = !needsSetup;
    if (hint) hint.hidden = needsSetup;
    if (err && message) {
      err.textContent = message;
      err.hidden = false;
    } else if (err) {
      err.hidden = true;
    }
  }

  function hideGate() {
    var gate = document.getElementById('authGate');
    if (gate) gate.classList.remove('open');
    document.body.classList.remove('auth-locked');
    var err = document.getElementById('authError');
    if (err) err.hidden = true;
  }

  function onCredential(response) {
    if (!response || !response.credential) {
      showGate('Sign-in was cancelled. Try again.');
      return;
    }
    var user = userFromCredential(response.credential);
    if (!user) {
      showGate('Could not verify your Google account. Try again.');
      return;
    }
    currentUser = user;
    saveUser(user);
    applyUserToProfile(user);
    hideGate();
    if (typeof showToast === 'function') showToast('Welcome, ' + (user.name || 'back') + '!');
  }

  function loadGisScript() {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        resolve();
        return;
      }
      var existing = document.querySelector('script[src="' + GIS_SRC + '"]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('GIS load failed')); });
        return;
      }
      var script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('GIS load failed')); };
      document.head.appendChild(script);
    });
  }

  function renderGoogleButton() {
    var mount = document.getElementById('googleSignInMount');
    if (!mount || !window.google || !window.google.accounts || !window.google.accounts.id) return;
    mount.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: getClientId(),
      callback: onCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    window.google.accounts.id.renderButton(mount, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: Math.min(320, Math.max(240, mount.offsetWidth || 280))
    });
  }

  function signOut() {
    currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    var avatarEl = document.getElementById('profAvatar') || document.querySelector('.prof-avatar');
    if (avatarEl) {
      avatarEl.textContent = '🏋️';
      delete avatarEl.dataset.googlePhoto;
    }
    showGate();
    if (typeof showToast === 'function') showToast('Signed out');
  }

  function init() {
    var clientId = getClientId();
    var gate = document.getElementById('authGate');
    if (!gate) return;

    currentUser = loadStoredUser();
    if (currentUser) {
      applyUserToProfile(currentUser);
      hideGate();
      return;
    }

    showGate();
    if (!clientId) return;

    loadGisScript()
      .then(function () {
        renderGoogleButton();
      })
      .catch(function () {
        showGate('Could not load Google Sign-In. Check your connection and try again.');
      });
  }

  window.WorkoutAuth = {
    getUser: function () { return currentUser || loadStoredUser(); },
    isSignedIn: function () { return !!window.WorkoutAuth.getUser(); },
    signOut: signOut,
    applyUserToProfile: applyUserToProfile
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
