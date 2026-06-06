(function () {
  'use strict';

  var TABLE = 'user_sync_data';
  var pushTimer = null;
  var pushing = false;

  function canSync() {
    return window.WorkoutSupabase && window.WorkoutSupabase.isConfigured() && window.WorkoutSupabase.getClient();
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

    if (typeof loadSavedWorkoutData === 'function') loadSavedWorkoutData();
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
      try { localStorage.setItem('workout_app_hist_v1', JSON.stringify(data.hist)); } catch (e) {}
    }

    if (data.exercises && Array.isArray(data.exercises) && typeof exercises !== 'undefined' && exercises) {
      data.exercises.forEach(function (row) {
        var i = exercises.findIndex(function (e) { return e.name === row.name; });
        if (i !== -1 && row.history) exercises[i].history = row.history;
      });
      try { localStorage.setItem('workout_app_exercises_v1', JSON.stringify(data.exercises)); } catch (e) {}
    }

    if (data.profile) applyProfile(data.profile);

    if (typeof renderAll === 'function') renderAll();
    if (typeof initHistory === 'function') initHistory();
    if (typeof initLibrary === 'function') initLibrary();
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
          if (rowRes.data && rowRes.data.payload) {
            applyAppState(rowRes.data.payload);
            return true;
          }
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
        return true;
      });
    }).catch(function (err) {
      if (typeof showToast === 'function') showToast('Sync failed — check connection');
      console.warn('Workout sync push failed', err);
      return false;
    }).finally(function () {
      pushing = false;
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

  window.WorkoutSync = {
    collectAppState: collectAppState,
    applyAppState: applyAppState,
    pull: pullSync,
    push: pushSync,
    schedulePush: schedulePush,
    isEnabled: canSync
  };
})();
