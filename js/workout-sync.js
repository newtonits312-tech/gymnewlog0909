(function () {
  'use strict';

  var TABLE = 'user_sync_data';
  var pushTimer = null;
  var pushing = false;
  var lastSyncedAt = null;
  var activeStorageId = null;
  var demoSeed = null;
  var LEGACY_HIST_KEY = 'workout_app_hist_v1';
  var LEGACY_EX_KEY = 'workout_app_exercises_v1';

  function canSync() {
    return window.WorkoutSupabase && window.WorkoutSupabase.isConfigured() && window.WorkoutSupabase.getClient();
  }

  function captureDemoSeed() {
    if (demoSeed) return;
    demoSeed = { hist: [], exerciseRows: [] };
    if (typeof window.HIST_DATA !== 'undefined' && Array.isArray(window.HIST_DATA)) {
      demoSeed.hist = JSON.parse(JSON.stringify(window.HIST_DATA));
    }
    if (typeof window.EXERCISES_TEMPLATE !== 'undefined' && Array.isArray(window.EXERCISES_TEMPLATE)) {
      demoSeed.exerciseRows = window.EXERCISES_TEMPLATE.map(function (e) {
        return { name: e.name, history: (e.history || []).slice() };
      });
    }
  }
  captureDemoSeed();

  function userStorageId(user) {
    if (!user) return null;
    return user.id || user.email || null;
  }

  function setActiveUser(user) {
    activeStorageId = userStorageId(user);
  }

  function getHistKey() {
    return activeStorageId ? LEGACY_HIST_KEY + '_' + activeStorageId : LEGACY_HIST_KEY;
  }

  function getExKey() {
    return activeStorageId ? LEGACY_EX_KEY + '_' + activeStorageId : LEGACY_EX_KEY;
  }

  function isAdminUser(user) {
    if (!user) return false;
    var email = String(user.email || '').toLowerCase();
    if (email === 'admin@workout.app') return true;
    if (user.role === 'admin') return true;
    return false;
  }

  function saveLocalState() {
    try {
      if (typeof HIST_DATA !== 'undefined') {
        localStorage.setItem(getHistKey(), JSON.stringify(HIST_DATA));
      }
      if (typeof exercises !== 'undefined' && exercises) {
        localStorage.setItem(getExKey(), JSON.stringify(exercises.map(function (e) {
          return { name: e.name, history: e.history || [] };
        })));
      }
    } catch (e) {}
  }

  function applyExerciseRows(rows) {
    if (!rows || !Array.isArray(rows) || typeof exercises === 'undefined' || !exercises) return;
    rows.forEach(function (row) {
      var i = exercises.findIndex(function (e) { return e.name === row.name; });
      if (i !== -1) exercises[i].history = row.history ? row.history.slice() : [];
    });
  }

  function hasLocalWorkoutData() {
    try {
      var h = localStorage.getItem(getHistKey());
      if (h) {
        var hist = JSON.parse(h);
        if (Array.isArray(hist) && hist.length > 0) return true;
      }
      var ex = localStorage.getItem(getExKey());
      if (ex) {
        var rows = JSON.parse(ex);
        if (Array.isArray(rows) && rows.some(function (r) { return r.history && r.history.length; })) return true;
      }
    } catch (e) {}
    return false;
  }

  function loadLocalState() {
    try {
      var h = localStorage.getItem(getHistKey());
      if (h) {
        var p = JSON.parse(h);
        if (Array.isArray(p)) window.HIST_DATA = p;
      }
      var exs = localStorage.getItem(getExKey());
      if (exs) {
        var rows = JSON.parse(exs);
        if (Array.isArray(rows)) applyExerciseRows(rows);
      }
    } catch (e) {}
    refreshUI();
  }

  function migrateLegacyLocalStorage() {
    var migrated = false;
    try {
      var h = localStorage.getItem(LEGACY_HIST_KEY);
      if (h) {
        var hist = JSON.parse(h);
        if (Array.isArray(hist) && hist.length) {
          window.HIST_DATA = hist;
          migrated = true;
        }
      }
      var ex = localStorage.getItem(LEGACY_EX_KEY);
      if (ex) {
        var rows = JSON.parse(ex);
        if (Array.isArray(rows) && rows.length) {
          applyExerciseRows(rows);
          migrated = true;
        }
      }
      if (migrated) saveLocalState();
    } catch (e) {}
    return migrated;
  }

  function loadDemoSeed() {
    captureDemoSeed();
    window.HIST_DATA = JSON.parse(JSON.stringify(demoSeed.hist || []));
    if (demoSeed.exerciseRows && demoSeed.exerciseRows.length) {
      applyExerciseRows(demoSeed.exerciseRows);
    }
    saveLocalState();
    refreshUI();
  }

  function resetToFreshAccount() {
    window.HIST_DATA = [];
    if (typeof exercises !== 'undefined' && exercises) {
      exercises.forEach(function (e) { e.history = []; });
    }
    if (typeof profUnit !== 'undefined') profUnit = 'kg';
    if (typeof profBodyweight !== 'undefined') profBodyweight = 80;
    if (typeof profGender !== 'undefined') profGender = 'male';
    if (typeof profAge !== 'undefined') profAge = 30;
    if (typeof profRestSecs !== 'undefined') profRestSecs = 120;
    saveLocalState();
    refreshUI();
  }

  function refreshUI() {
    if (typeof renderAll === 'function') renderAll();
    if (typeof initHistory === 'function') initHistory();
    if (typeof initLibrary === 'function') initLibrary();
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();
    if (typeof updateProfileStats === 'function') updateProfileStats();
  }

  function payloadHasData(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (payload.hist && Array.isArray(payload.hist) && payload.hist.length > 0) return true;
    if (payload.exercises && Array.isArray(payload.exercises)) {
      return payload.exercises.some(function (row) { return row.history && row.history.length > 0; });
    }
    return false;
  }

  function collectAppState() {
    var state = { v: 1 };
    if (typeof HIST_DATA !== 'undefined') state.hist = HIST_DATA;
    if (typeof exercises !== 'undefined' && exercises) {
      state.exercises = exercises.map(function (e) {
        return { name: e.name, history: e.history || [] };
      });
    }
    state.profile = {
      profUnit: typeof profUnit !== 'undefined' ? profUnit : 'kg',
      profBodyweight: typeof profBodyweight !== 'undefined' ? profBodyweight : 80,
      profGender: typeof profGender !== 'undefined' ? profGender : 'male',
      profAge: typeof profAge !== 'undefined' ? profAge : 30,
      profName: typeof profName !== 'undefined' ? profName : '',
      profHandle: typeof profHandle !== 'undefined' ? profHandle : '',
      profRestSecs: typeof profRestSecs !== 'undefined' ? profRestSecs : 120
    };
    return state;
  }

  function applyProfile(p) {
    if (!p) return;
    if (p.profUnit) profUnit = p.profUnit;
    if (typeof p.profBodyweight === 'number') profBodyweight = p.profBodyweight;
    if (p.profGender) profGender = p.profGender;
    if (typeof p.profAge === 'number') profAge = p.profAge;
    if (p.profName) profName = p.profName;
    if (p.profHandle) profHandle = p.profHandle;
    if (typeof p.profRestSecs === 'number') profRestSecs = p.profRestSecs;
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();

    var nameEl = document.getElementById('profName') || document.querySelector('.prof-name');
    var handleEl = document.getElementById('profHandle') || document.querySelector('.prof-handle');
    if (nameEl && profName) nameEl.textContent = profName;
    if (handleEl && profHandle) {
      handleEl.textContent = '@' + profHandle + ' · Synced';
    }
  }

  function applyAppState(data) {
    if (!data || typeof data !== 'object') return;

    if (data.hist && Array.isArray(data.hist)) {
      window.HIST_DATA = data.hist;
    }

    if (data.exercises && Array.isArray(data.exercises)) {
      applyExerciseRows(data.exercises);
    }

    if (data.profile) applyProfile(data.profile);

    saveLocalState();
    refreshUI();
  }

  function pullSync() {
    if (!canSync()) return Promise.resolve(false);
    var sb = window.WorkoutSupabase.getClient();
    return sb.auth.getUser().then(function (res) {
      var user = res.data && res.data.user;
      if (!user) return false;
      return sb.from(TABLE).select('payload, updated_at').eq('user_id', user.id).maybeSingle()
        .then(function (rowRes) {
          if (rowRes.error) throw rowRes.error;
          if (rowRes.data && payloadHasData(rowRes.data.payload)) {
            applyAppState(rowRes.data.payload);
            if (rowRes.data.updated_at) lastSyncedAt = rowRes.data.updated_at;
            updateSyncStatusUI();
            return true;
          }
          updateSyncStatusUI();
          return false;
        });
    });
  }

  function pushSync() {
    if (!canSync() || pushing) return Promise.resolve(false);
    pushing = true;
    var sb = window.WorkoutSupabase.getClient();
    var payload = collectAppState();

    return sb.auth.getUser().then(function (res) {
      var user = res.data && res.data.user;
      if (!user) return false;
      return sb.from(TABLE).upsert({
        user_id: user.id,
        payload: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(function (upsertRes) {
        if (upsertRes.error) throw upsertRes.error;
        lastSyncedAt = new Date().toISOString();
        updateSyncStatusUI();
        return true;
      });
    }).catch(function (err) {
      if (typeof showToast === 'function') showToast('Sync failed — check connection');
      console.warn('Workout sync push failed', err);
      return false;
    }).finally(function () {
      pushing = false;
      updateSyncStatusUI();
    });
  }

  function schedulePush() {
    if (!canSync()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      pushSync();
    }, 1500);
  }

  function formatSyncTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var diffMs = now - d;
    if (diffMs < 60000) return 'just now';
    if (diffMs < 3600000) return Math.floor(diffMs / 60000) + 'm ago';
    if (diffMs < 86400000) return Math.floor(diffMs / 3600000) + 'h ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function updateSyncStatusUI() {
    var sub = document.getElementById('cloudSyncSub');
    var badge = document.getElementById('cloudSyncBadge');
    if (!sub || !badge) return;

    if (!canSync()) {
      sub.textContent = 'Not configured — add Supabase keys in Vercel';
      badge.textContent = 'Off';
      badge.style.color = 'var(--text3)';
      return;
    }

    if (!(window.WorkoutAuth && window.WorkoutAuth.isSignedIn && window.WorkoutAuth.isSignedIn())) {
      sub.textContent = 'Sign in to sync across devices';
      badge.textContent = 'Ready';
      badge.style.color = 'var(--text3)';
      return;
    }

    if (pushing) {
      sub.textContent = 'Saving your workouts…';
      badge.textContent = 'Syncing';
      badge.style.color = 'var(--accent)';
      return;
    }

    if (lastSyncedAt) {
      sub.textContent = 'Last synced ' + formatSyncTime(lastSyncedAt);
      badge.textContent = 'On';
      badge.style.color = 'var(--done)';
      return;
    }

    sub.textContent = 'Connected — tap to sync now';
    badge.textContent = 'On';
    badge.style.color = 'var(--done)';
  }

  function bindSyncUI() {
    var row = document.getElementById('row-cloud-sync');
    if (!row) return;
    var trigger = function () {
      if (!canSync()) {
        if (typeof showToast === 'function') showToast('Cloud sync needs Supabase keys');
        return;
      }
      if (!(window.WorkoutAuth && window.WorkoutAuth.isSignedIn && window.WorkoutAuth.isSignedIn())) {
        if (typeof showToast === 'function') showToast('Sign in to sync');
        return;
      }
      pushing = true;
      updateSyncStatusUI();
      pushSync().then(function (ok) {
        if (ok && typeof showToast === 'function') showToast('Workouts synced to cloud');
      }).finally(function () {
        pushing = false;
        updateSyncStatusUI();
      });
    };
    row.addEventListener('click', trigger);
    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger();
      }
    });
    document.addEventListener('workout:auth', function () { updateSyncStatusUI(); });
    updateSyncStatusUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSyncUI);
  } else {
    bindSyncUI();
  }

  window.WorkoutSync = {
    collectAppState: collectAppState,
    applyAppState: applyAppState,
    pull: pullSync,
    push: pushSync,
    schedulePush: schedulePush,
    isEnabled: canSync,
    updateStatusUI: updateSyncStatusUI,
    getLastSyncedAt: function () { return lastSyncedAt; },
    setActiveUser: setActiveUser,
    getHistKey: getHistKey,
    getExKey: getExKey,
    saveLocalState: saveLocalState,
    loadLocalState: loadLocalState,
    resetToFreshAccount: resetToFreshAccount,
    loadDemoSeed: loadDemoSeed,
    migrateLegacyLocalStorage: migrateLegacyLocalStorage,
    hasLocalWorkoutData: hasLocalWorkoutData,
    isAdminUser: isAdminUser
  };
})();
