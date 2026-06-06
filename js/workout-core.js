/**
 * Shared workout logic: units (kg/lbs), exercise flags, library re-indexing.
 * Load before workout-data.js. App globals (profUnit, profBodyweight, etc.) stay in the page script.
 */
(function (global) {
  'use strict';

  var KG_TO_LBS = 2.20462;

  global.WorkoutCore = {
    KG_TO_LBS: KG_TO_LBS,

    /** Map a library row to a session exercise (barbell / bodyweight flags). */
    sessionExerciseFromLibrary: function (libEx) {
      var eq = libEx.equipment || '';
      return {
        name: libEx.name,
        isBarbell: eq === 'Barbell',
        isBodyweight: eq === 'Bodyweight',
        history: libEx.history || []
      };
    },

    dispW: function (kgVal, profUnit) {
      if (!kgVal && kgVal !== 0) return kgVal;
      if (profUnit === 'lbs') return Math.round(kgVal * KG_TO_LBS * 2) / 2;
      return kgVal;
    },

    storeW: function (displayVal, profUnit) {
      if (!displayVal && displayVal !== 0) return displayVal;
      if (profUnit === 'lbs') return Math.round((displayVal / KG_TO_LBS) * 4) / 4;
      return displayVal;
    },

    dispU: function (profUnit) {
      return profUnit;
    },

    dispVol_raw: function (kgVol, profUnit) {
      if (profUnit === 'lbs') return Math.round(kgVol * KG_TO_LBS);
      return kgVol;
    },

    dispVol: function (kgVol, profUnit) {
      if (profUnit === 'lbs') return Math.round(kgVol * KG_TO_LBS).toLocaleString();
      return kgVol.toLocaleString();
    },

    weightStep: function (profUnit) {
      return profUnit === 'lbs' ? 5 : 2.5;
    },

    /** Profile bodyweight in the unit used for strength tables (display lbs rounded to 0.5). */
    profileBwInUnit: function (bodyweightKg, profUnit) {
      if (!bodyweightKg || bodyweightKg <= 0) return 0;
      if (profUnit === 'lbs') return Math.round(bodyweightKg * KG_TO_LBS * 2) / 2;
      return bodyweightKg;
    },

    /**
     * Look up standards for one exercise (reads globals from workout-data.js).
     * @returns {{ kg: object|null, lbs: object|null, hasAny: boolean }}
     */
    strengthStandardsFor: function (exerciseName) {
      var kg = typeof STRENGTH_STANDARDS !== 'undefined' ? STRENGTH_STANDARDS[exerciseName] : null;
      var lbs = typeof STRENGTH_STANDARDS_LBS !== 'undefined' ? STRENGTH_STANDARDS_LBS[exerciseName] : null;
      return { kg: kg, lbs: lbs, hasAny: !!(kg || lbs) };
    },

    rebuildLibraryIndex: function () {
      var LIB = global.LIBRARY;
      if (!LIB || !LIB.forEach) return new Map();
      var idx = new Map();
      LIB.forEach(function (ex) {
        [ex.name, ex.muscle, ex.equipment, ex.pattern].join(' ')
          .toLowerCase().split(/\s+/)
          .forEach(function (tok) {
            if (!idx.has(tok)) idx.set(tok, new Set());
            idx.get(tok).add(ex.id);
          });
      });
      return idx;
    },

    /** Call after replacing window.LIBRARY (e.g. hot-load JSON) to refresh filters + maps. */
    applyLibraryUpdate: function () {
      global.MUSCLES = [...new Set(global.LIBRARY.map(function (e) { return e.muscle; }))].sort();
      global.EQUIPS = [...new Set(global.LIBRARY.map(function (e) { return e.equipment; }))].sort();
      global.PATTERNS = [...new Set(global.LIBRARY.map(function (e) { return e.pattern; }))].sort();
      global.LIBRARY_MAP = new Map(global.LIBRARY.map(function (ex) { return [ex.name, ex]; }));
      global.LIBRARY_BY_ID = new Map(global.LIBRARY.map(function (ex) { return [ex.id, ex]; }));
      global.LIBRARY_INDEX = global.WorkoutCore.rebuildLibraryIndex();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
