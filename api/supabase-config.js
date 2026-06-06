if (typeof module !== 'undefined' && module.exports) {
  module.exports = function handler(req, res) {
    var config = {
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    };

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(
      '(function () {\n' +
      '  var envConfig = ' + JSON.stringify(config) + ';\n' +
      '  if (envConfig.url && envConfig.anonKey) {\n' +
      '    window.SUPABASE_CONFIG = envConfig;\n' +
      '  } else {\n' +
      '    window.SUPABASE_CONFIG = window.SUPABASE_CONFIG || envConfig;\n' +
      '    console.warn("Supabase env vars are not configured in Vercel.");\n' +
      '  }\n' +
      '}());\n'
    );
  };
} else {
  window.SUPABASE_CONFIG = window.SUPABASE_CONFIG || { url: '', anonKey: '' };
}
