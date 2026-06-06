(function () {
  'use strict';

  var client = null;

  function cfg() {
    return window.SUPABASE_CONFIG || {};
  }

  function isConfigured() {
    var c = cfg();
    return !!(c.url && c.anonKey && String(c.url).trim() && String(c.anonKey).trim());
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) return null;
    try {
      client = window.supabase.createClient(cfg().url.trim(), cfg().anonKey.trim());
    } catch (e) {
      console.warn('Supabase client could not be created', e);
      return null;
    }
    return client;
  }

  window.WorkoutSupabase = {
    isConfigured: isConfigured,
    getClient: getClient
  };
})();
