const PAGES= {

  log: {

    main:'mainContent',nav:'nav-log',brand:'Workout',libMode:false

},
progress: {

  main:'progContent',nav:'nav-progress',brand:'Progress',libMode:true

},
history: {

  main:'histContent',nav:'nav-history',brand:'History',libMode:true

},
library: {

  main:'libContent',nav:'nav-library',brand:'Library',libMode:true

},
profile: {

  main:'profileContent',nav:'nav-profile',brand:'Profile',libMode:true

}

};

let currentPage='log';
const PAGE_STORAGE_KEY='workout_app_page_v1';

function genderSvgMarkup(gender, className) {
  var cls = className || 'gender-svg';
  if (gender === 'female') {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 14v7M9 18h6"/>' +
      '</svg>';
  }
  return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<circle cx="10" cy="14" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M15 9l6-6M16 3h5v5"/>' +
    '</svg>';
}

function getSavedPage() {
  try {
    var hash=(location.hash||'').replace(/^#/,'');
    if (hash&&PAGES[hash])return hash;
    var saved=sessionStorage.getItem(PAGE_STORAGE_KEY);
    if (saved&&PAGES[saved])return saved;
  } catch (e) {}
  return null;
}

function persistCurrentPage(page) {
  try {
    sessionStorage.setItem(PAGE_STORAGE_KEY,page);
    var base=location.pathname+location.search;
    if (page==='log')history.replaceState(null,'',base);
    else history.replaceState(null,'',base+'#'+page);
  } catch (e) {}
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function on(id, ev, handler, opts) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(ev, handler, opts);
}

function onActivate(id, fn) {
  on(id, 'click', fn);
  on(id, 'keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn(e);
    }
  });
}

function initDomBindings() {
  if (window._workoutDomBindingsDone) return;
  window._workoutDomBindingsDone = true;

  onActivate('startStopBtn', function () { toggleWorkout(); });
  onActivate('dotsBtn', function () { toggleDotsMenu(); });
  onActivate('timerDisplay', function () { openCustomInput(); });
  on('timerCustomInput', 'keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); commitCustomInput(); }
    if (e.key === 'Escape') cancelCustomInput();
  });
  onActivate('timerPlusBtn', function () { addRestTime(30); });
  onActivate('timerPlayBtn', function () { toggleRestTimer(); });
  onActivate('timerSkipBtn', function () { skipTimer(); });

  document.querySelector('.warmup-header')?.addEventListener('click', toggleWarmup);

  const warmupBody = document.getElementById('warmupBody');
  if (warmupBody) {
    warmupBody.addEventListener('click', function (e) {
      const check = e.target.closest('.wu-check');
      const timeEl = e.target.closest('.wu-time');
      const item = e.target.closest('.wu-item');
      if (!item) return;
      const m = item.id.match(/^wui-(\d+)$/);
      const idx = m ? parseInt(m[1], 10) : NaN;
      if (!Number.isFinite(idx)) return;
      if (check) {
        e.stopPropagation();
        checkWU(idx);
        return;
      }
      if (timeEl) {
        e.stopPropagation();
        const secs = parseInt(timeEl.getAttribute('data-wu-secs'), 10);
        const s = Number.isFinite(secs) && secs > 0 ? secs : 60;
        startRestTimer(s);
        showToast('Timer started');
        return;
      }
      checkWU(idx);
    });
    warmupBody.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const check = e.target.closest('.wu-check');
      if (!check) return;
      e.preventDefault();
      e.stopPropagation();
      const item = check.closest('.wu-item');
      const m = item && item.id.match(/^wui-(\d+)$/);
      if (m) checkWU(parseInt(m[1], 10));
    });
  }

  const wuSkip = document.querySelector('.wu-skip');
  if (wuSkip) {
    wuSkip.addEventListener('click', skipWarmup);
    wuSkip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skipWarmup(); }
    });
  }
  const wuAll = document.querySelector('.wu-complete-all');
  if (wuAll) {
    wuAll.addEventListener('click', completeAllWU);
    wuAll.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); completeAllWU(); }
    });
  }

  document.querySelector('.finish-btn')?.addEventListener('click', showConfirm);

  on('libSearch', 'input', function () { onLibSearch(this.value); });
  onActivate('libSearchX', clearLibSearch);
  onActivate('libFilterBtn', openFilterSheet);
  document.querySelector('.lib-banner-clear')?.addEventListener('click', clearAllLibFilters);
  document.querySelector('.lib-banner-clear')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearAllLibFilters(); }
  });
  document.querySelector('.lib-sort-btn')?.addEventListener('click', function () { showToast('Sort coming soon'); });

  [['nav-log', 'log'], ['nav-progress', 'progress'], ['nav-history', 'history'], ['nav-library', 'library'], ['nav-profile', 'profile']].forEach(function (pair) {
    on(pair[0], 'click', function () { switchPage(pair[1]); });
  });

  on('confirmOverlay', 'click', dismissConfirm);
  const confirmDialog = document.getElementById('confirmDialog');
  if (confirmDialog) {
    confirmDialog.querySelector('.confirm-btn.accent')?.addEventListener('click', confirmFinish);
    confirmDialog.querySelector('.confirm-btn.neutral')?.addEventListener('click', function () { dismissConfirm(); });
    confirmDialog.querySelector('.confirm-btn.danger')?.addEventListener('click', confirmDiscard);
  }

  on('filterSheetOverlay', 'click', closeFilterSheet);
  document.querySelector('#filterDialog .filter-sheet-reset')?.addEventListener('click', clearSheetFilters);
  document.querySelector('.filter-sheet-apply')?.addEventListener('click', applyFilterSheet);

  on('dotsOverlay', 'click', closeDotsMenu);
  const dotsActions = ['edit', 'add-ex', 'note', 'share', 'duplicate', 'settings', 'discard'];
  document.querySelectorAll('#dotsMenu .dots-item[role="menuitem"]').forEach(function (el, i) {
    const act = dotsActions[i];
    if (!act) return;
    el.addEventListener('click', function () { dotsAction(act); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dotsAction(act);
      }
    });
  });

  const progIds = ['strength', 'volume', 'records', 'activity'];
  document.querySelectorAll('#progTabs .prog-tab').forEach(function (el, i) {
    const pid = progIds[i];
    if (!pid) return;
    el.addEventListener('click', function () { switchProgTab(pid, el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchProgTab(pid, el);
      }
    });
  });

  document.querySelector('.prof-avatar')?.addEventListener('click', changeAvatar);
  document.querySelector('.prof-edit-btn')?.addEventListener('click', function () { openPicker('editProfile'); });
  document.querySelector('.prof-edit-btn')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker('editProfile'); }
  });

  on('row-units', 'click', function () { toggleInline('units'); });
  on('row-timer', 'click', function () { toggleInline('timer'); });
  on('iunit-kg', 'click', function (e) { e.stopPropagation(); selectUnit('kg'); });
  on('iunit-lbs', 'click', function (e) { e.stopPropagation(); selectUnit('lbs'); });
  [60, 90, 120, 150, 180, 300].forEach(function (secs) {
    on('itimer-' + secs, 'click', function (e) { e.stopPropagation(); selectRestTimer(secs); });
  });

  [['toggle-haptics', 'haptics'], ['toggle-sound', 'sound'], ['toggle-keepawake', 'keepawake'], ['toggle-cloud', 'cloud']].forEach(function (pair) {
    const t = document.getElementById(pair[0]);
    const row = t && t.closest('.settings-row');
    if (row) row.addEventListener('click', function () { toggleSetting(pair[1]); });
  });

  on('row-export', 'click', function () { toggleInline('export'); });
  on('row-import', 'click', function () { toggleInline('import'); });
  document.querySelectorAll('.iexport-row').forEach(function (row, i) {
    const fmt = ['csv', 'json', 'txt'][i];
    if (!fmt) return;
    row.addEventListener('click', function (e) { e.stopPropagation(); doExport(fmt); });
  });
  document.querySelector('.iimport-zone')?.addEventListener('click', function (e) {
    e.stopPropagation();
    document.getElementById('importFileInputInline')?.click();
  });
  document.querySelectorAll('.iimport-option').forEach(function (opt) {
    opt.addEventListener('click', function (e) {
      e.stopPropagation();
      showToast('Connect coming soon');
    });
  });

  on('row-privacy', 'click', function () { toggleInline('privacy'); });
  on('row-review', 'click', function () { toggleInline('review'); });
  document.querySelectorAll('#starRow .star-btn').forEach(function (btn, i) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); setRating(i + 1); });
  });
  document.querySelector('.review-submit')?.addEventListener('click', function (e) {
    e.stopPropagation();
    submitReview();
  });

  document.querySelector('#profileContent .settings-row.danger')?.addEventListener('click', function () { showToast('Signed out'); });

  [['units', 'unitsSheetOverlay'], ['timer', 'timerSheetOverlay'], ['export', 'exportSheetOverlay'], ['import', 'importSheetOverlay'], ['editProfile', 'editProfileSheetOverlay']].forEach(function (pair) {
    const overlay = document.getElementById(pair[1]);
    if (overlay) {
      overlay.addEventListener('click', function (e) { closePicker(pair[0], e); });
    }
  });

  document.querySelector('#unitsDialog .picker-sheet-close')?.addEventListener('click', function () { closePicker('units'); });
  document.querySelector('#timerDialog .picker-sheet-close')?.addEventListener('click', function () { closePicker('timer'); });
  document.querySelector('#exportDialog .picker-sheet-close')?.addEventListener('click', function () { closePicker('export'); });
  document.querySelector('#importDialog .picker-sheet-close')?.addEventListener('click', function () { closePicker('import'); });
  document.querySelector('#editProfileDialog .picker-sheet-close')?.addEventListener('click', function () { closePicker('editProfile'); });

  onActivate('unit-kg', function () { selectUnit('kg'); });
  onActivate('unit-lbs', function () { selectUnit('lbs'); });

  document.querySelectorAll('#timerPresets .timer-preset-wrap').forEach(function (wrap) {
    const preset = wrap.querySelector('.timer-preset');
    const secs = preset ? parseInt(preset.getAttribute('data-secs'), 10) : NaN;
    if (!Number.isFinite(secs)) return;
    wrap.addEventListener('click', function () { selectRestTimer(secs); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectRestTimer(secs);
      }
    });
  });

  document.querySelectorAll('#exportDialog .export-row').forEach(function (row, i) {
    const fmt = ['csv', 'json', 'txt'][i];
    if (!fmt) return;
    row.addEventListener('click', function () { doExport(fmt); });
    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        doExport(fmt);
      }
    });
  });

  const importZoneMain = document.querySelector('#importDialog .import-zone');
  if (importZoneMain) {
    importZoneMain.addEventListener('click', function () { document.getElementById('importFileInput')?.click(); });
    importZoneMain.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        document.getElementById('importFileInput')?.click();
      }
    });
  }
  document.querySelectorAll('#importDialog .picker-option[role="button"]').forEach(function (opt) {
    opt.addEventListener('click', function () { showToast('Connect coming soon'); });
    opt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') showToast('Connect coming soon');
    });
  });

  on('importFileInput', 'change', function () { handleImport(this); });
  on('importFileInputInline', 'change', function () { handleImport(this); });

  on('editGenderMale', 'click', function () { selectEditGender('male'); });
  on('editGenderFemale', 'click', function () { selectEditGender('female'); });
  document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
}

/** Set notes: max 6 lines, capped length, no angle brackets / null bytes (never inject into HTML). */
var SET_NOTE_MAX_LINES = 6;
var SET_NOTE_MAX_CHARS = 360;

function sanitizeSetNote(raw) {
  if (raw == null) return '';
  var s = String(raw)
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/</g, '')
    .replace(/>/g, '');
  var lines = s.split('\n');
  s = lines.slice(0, SET_NOTE_MAX_LINES).join('\n');
  if (s.length > SET_NOTE_MAX_CHARS) s = s.slice(0, SET_NOTE_MAX_CHARS);
  return s;
}

function persistWorkoutHistory() {
  try {
    localStorage.setItem('workout_app_hist_v1', JSON.stringify(HIST_DATA));
  } catch (e) {}
}

function persistExerciseHistories() {
  try {
    if (typeof exercises === 'undefined' || !exercises) return;
    localStorage.setItem('workout_app_exercises_v1', JSON.stringify(exercises.map(function (e) {
      return { name: e.name, history: e.history || [] };
    })));
  } catch (e) {}
}

function loadSavedWorkoutData() {
  try {
    var h = localStorage.getItem('workout_app_hist_v1');
    if (h) {
      var p = JSON.parse(h);
      if (Array.isArray(p) && p.length) window.HIST_DATA = p;
    }
    var exs = localStorage.getItem('workout_app_exercises_v1');
    if (exs && typeof exercises !== 'undefined' && exercises && exercises.length) {
      var rows = JSON.parse(exs);
      if (Array.isArray(rows)) {
        rows.forEach(function (row) {
          var i = exercises.findIndex(function (e) { return e.name === row.name; });
          if (i !== -1 && row.history) exercises[i].history = row.history;
        });
      }
    }
  } catch (err) {}
}

// ── A11Y: Focus trap for dialogs ──

function trapFocus(dialogEl) {

  const focusable=dialogEl.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"]),[role="radio"],[role="button"]');
if (!focusable.length)return;
const first=focusable[0],last=focusable[focusable.length-1];

function handler(e) {

  if (e.key!=='Tab')return;
if (e.shiftKey) {

  if (document.activeElement===first) {

    e.preventDefault();
    last.focus();

  }

}else {

  if (document.activeElement===last) {

    e.preventDefault();
    first.focus();

  }

}

}

dialogEl._trapHandler=handler;
document.addEventListener('keydown',handler);
requestAnimationFrame(()=>first.focus());

}

function releaseFocus(dialogEl,returnEl) {

  if (dialogEl._trapHandler) {

    document.removeEventListener('keydown',dialogEl._trapHandler);
delete dialogEl._trapHandler;

}

if (returnEl)returnEl.focus();

}


// ── A11Y: ESC key closes any open overlay ──
document.addEventListener('keydown',function(e) {

  if (e.key!=='Escape')return;

// Cancel custom timer input if active
const inp=document.getElementById('timerCustomInput');
if (inp&&inp.style.display!=='none'){cancelCustomInput();return;}

const openOverlay=document.querySelector('.picker-sheet-overlay.open');
if (openOverlay) {

  const id=openOverlay.id.replace('SheetOverlay','').replace('Overlay','');
closePicker(id);
return;

}

const filterSheet=document.getElementById('filterSheetOverlay');
if (filterSheet&&filterSheet.classList.contains('open')) {

  closeFilterSheet();
  return;

}

const confirmOv=document.getElementById('confirmOverlay');
if (confirmOv&&confirmOv.classList.contains('show')) {

  dismissConfirm();
  return;

}

const dots=document.getElementById('dotsMenu');
if (dots&&dots.classList.contains('open')) {

  closeDotsMenu();
  return;

}

});


// ── DOTS MENU ──

function toggleDotsMenu() {

  const m=document.getElementById('dotsMenu'),o=document.getElementById('dotsOverlay'),btn=document.getElementById('dotsBtn');
if (!m||!o||!btn)return;
const isOpen=m.classList.contains('open');
if (isOpen) {

  m.classList.remove('open');
o.classList.remove('open');
btn.setAttribute('aria-expanded','false');

} else {

  m.classList.add('open');
o.classList.add('open');
btn.setAttribute('aria-expanded','true');
requestAnimationFrame(()=> {

  const first=m.querySelector('.dots-item');
if (first)first.focus();

});

}

}

function closeDotsMenu() {

  const m = document.getElementById('dotsMenu'), o = document.getElementById('dotsOverlay'), btn = document.getElementById('dotsBtn');
  if (!m || !o || !btn) return;
  m.classList.remove('open');
  o.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');

}

function dotsAction(act) {

  closeDotsMenu();
  if (act==='discard') {

  if (workoutActive)showConfirm();
  else showToast('No active session');

}else if (act==='settings') {

  switchPage('profile');

}else {

  const dotsToastMap={edit:'Edit mode coming soon','add-ex':'Add exercise coming soon',note:'Workout note coming soon',share:'Share coming soon',duplicate:'Workout duplicated'};
  showToast(dotsToastMap[act]||'Coming soon');

}

}

// ── HISTORY PAGE (sessions: window.HIST_DATA in js/workout-data.js) ──
function initHistory() {
  // ── DSA: Map grouping (insertion-order) + DocumentFragment — O(n) one-pass ──
  const container=document.getElementById('histList');
  const months=new Map();
  HIST_DATA.forEach(s=>{
    const yMatch = String(s.date || '').match(/\d{4}/);
    const year = yMatch ? yMatch[0] : String(new Date().getFullYear());
    const mon = String(s.date || '').split(/\s+/)[0] || '—';
    const key = mon + ' ' + year;
    if (!months.has(key))months.set(key,[]);
    months.get(key).push(s);
  });
  const outerFrag=document.createDocumentFragment();
  months.forEach((sessions,month)=>{
    const hdr=document.createElement('div');
    hdr.className='hist-month-header';
    hdr.innerHTML='<span class="hist-month-title">' + escapeHtml(month) + '</span><span class="hist-month-count">' + sessions.length + ' sessions</span>';
    outerFrag.appendChild(hdr);
    const grp=document.createElement('div');
    grp.className='hist-session-group';
    const grpFrag=document.createDocumentFragment();
    sessions.forEach(s=>{
      const row=document.createElement('div');
      row.className='hist-session';
      row.setAttribute('role','button');
      row.setAttribute('tabindex','0');
      row.setAttribute('aria-label', s.name + ', ' + s.date);
      row.onclick=()=>toggleHistSession(s.id);
      row.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleHistSession(s.id);}}
      row.innerHTML='<div class="hist-session-icon" style="background:rgba(200,241,53,.08);">' + s.emoji + '</div>\
        <div class="hist-session-info"><div class="hist-session-name">' + escapeHtml(s.name) + '</div><div class="hist-session-meta">' + escapeHtml(s.day) + ' · ' + escapeHtml(s.date) + ' · ' + s.exercises.length + ' exercises</div></div>\
        <div class="hist-session-right"><div class="hist-session-vol">' + (profUnit==='lbs'?Math.round(s.vol*2.20462).toLocaleString()+' lbs':(s.vol/1000).toFixed(1)+'t') + '</div><div class="hist-session-meta-row"><div class="hist-session-dur">' + escapeHtml(s.dur) + '</div>' + (s.hasPR?'<span class="hist-tag pr">PR</span>':'') + '</div></div>';
      grpFrag.appendChild(row);
      const detail=document.createElement('div');
      detail.className='hist-session-detail';
      detail.id=`hsd-${s.id}`;
      detail.innerHTML=s.bests.map(function(b){
        return '<div class="hist-ex-row"><div class="hist-ex-name">' + escapeHtml(b.n) + '</div><div class="hist-ex-sets">' + (b.w ? dispW(b.w) + ' ' + dispU() + ' × ' + escapeHtml(String(b.r)) : 'BW × ' + escapeHtml(String(b.r))) + '</div><div class="hist-ex-best">' + (b.isPR ? '🏆 PR' : '') + '</div></div>';
      }).join('');
      grpFrag.appendChild(detail);
    });
    grp.appendChild(grpFrag);
    outerFrag.appendChild(grp);
  });
  container.appendChild(outerFrag); // single insertion
}

function refreshHistory() {

  var container=document.getElementById('histList');
if (!container)return;
container.innerHTML='';
initHistory();

}

function toggleHistSession(id) {
  // Multi-open: each session toggles independently
  var detail = document.getElementById('hsd-' + id);
  if (detail) detail.classList.toggle('open');
}


// ── PROGRESS PAGE ──
let chartsStrengthInit=false;
let chartsVolumeInit=false;

function switchProgTab(tab,el) {

  document.querySelectorAll('.prog-tab').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-selected','false');});
if (el){el.classList.add('active');el.setAttribute('aria-selected','true');}
['strength','volume','records','activity'].forEach(t=>document.getElementById('prog'+t.charAt(0).toUpperCase()+t.slice(1)).style.display=t===tab?'':'none');
if (tab==='strength'&&!chartsStrengthInit){initStrengthCharts();chartsStrengthInit=true;}
if (tab==='volume'&&!chartsVolumeInit){initVolumeCharts();chartsVolumeInit=true;}

if (tab==='records')renderPRs();
if (tab==='activity')renderHeatmap();

}

function initStrengthCharts() {

  if (typeof Chart==='undefined')return;
Chart.defaults.color='#5a5b68';
Chart.defaults.borderColor='rgba(255,255,255,0.07)';
Chart.defaults.animation=false;
const aLabels=['17-02','20-02','24-02','27-02','03-03','06-03','10-03','13-03','17-03','20-03'];

function makeGrad(ctx,c1,c2) {

  const g=ctx.createLinearGradient(0,0,0,140);
  g.addColorStop(0,c1);
  g.addColorStop(1,c2);
  return g;

}

function lineChart(id,labels,data,color) {

  const ctx=document.getElementById(id);
  if (!ctx)return;
  new Chart(ctx, {

    type:'line',data: {

  labels,datasets:[{

      data,borderColor:color,borderWidth:2.5,fill:true,backgroundColor:(c=>makeGrad(c.getContext('2d'),color.replace(')',',0.18)').replace('rgb','rgba'),color.replace(')',',0)').replace('rgb','rgba')))(ctx),tension:.4,pointRadius:3,pointBackgroundColor:color,pointBorderWidth:0

}]

},
options: {

  responsive:true,maintainAspectRatio:false,plugins: {

    legend: {

      display:false

    }

  },
  scales: {

    x: {

      ticks: {

        font: {

          size:9

        },
        maxRotation:0

      },
      grid: {

        display:false

      }

    },
    y: {

      ticks: {

        font: {

          size:9

        },
        callback:function(v) {

          return v+' '+dispU();

}

},
grid: {

  color:'rgba(255,255,255,0.05)'

}

}

}

}

});
ctx.closest('.prog-canvas-wrap')?.classList.add('loaded');

}

lineChart('chart-bench',aLabels,[107,109,110,110,113,113,116,116,119,120].map(dispW),'rgb(200,241,53)');
lineChart('chart-fly',aLabels,[18,18,20,20,22,22,24,24,26,26].map(dispW),'rgb(99,102,241)');
lineChart('chart-tri',aLabels,[56,57,58,58,59,60,62,63,64,64].map(dispW),'rgb(249,115,22)');

}

function initVolumeCharts() {

  if (typeof Chart==='undefined')return;
Chart.defaults.color='#5a5b68';
Chart.defaults.borderColor='rgba(255,255,255,0.07)';
Chart.defaults.animation=false;
const wLabels=['W10','W11','W12','W13','W14','W15','W16','W17'];
const ctx2=document.getElementById('chart-vol');
if (ctx2)new Chart(ctx2, {

  type:'bar',data: {

  labels:wLabels,datasets:[{

      data:[4200,4800,5100,4700,5300,5600,5800,6100].map(v=>Math.round(dispVol_raw(v))),backgroundColor:'rgba(200,241,53,0.25)',borderColor:'rgba(200,241,53,0.7)',borderWidth:1.5,borderRadius:4

}]

},
options: {

  responsive:true,maintainAspectRatio:false,plugins: {

    legend: {

      display:false

    }

  },
  scales: {

    x: {

      ticks: {

        font: {

          size:9

        }

      },
      grid: {

        display:false

      }

    },
    y: {

      ticks: {

        font: {

          size:9

        },
        callback:function(v) {

          return v+' '+dispU();

}

},
grid: {

  color:'rgba(255,255,255,0.05)'

}

}

}

}

});
ctx2.closest('.prog-canvas-wrap')?.classList.add('loaded');
const ctx3=document.getElementById('chart-sets');
if (ctx3)new Chart(ctx3, {

  type:'bar',data: {

  labels:wLabels,datasets:[{

      data:[21,21,24,21,24,24,27,27],backgroundColor:'rgba(165,180,252,0.25)',borderColor:'rgba(165,180,252,0.7)',borderWidth:1.5,borderRadius:4

}]

},
options: {

  responsive:true,maintainAspectRatio:false,plugins: {

    legend: {

      display:false

    }

  },
  scales: {

    x: {

      ticks: {

        font: {

          size:9

        }

      },
      grid: {

        display:false

      }

    },
    y: {

      ticks: {

        font: {

          size:9

        },
        stepSize:3

      },
      grid: {

        color:'rgba(255,255,255,0.05)'

}

}

}

}

});
ctx3.closest('.prog-canvas-wrap')?.classList.add('loaded');

}

function renderPRs() {

  const c=document.getElementById('prList');
if (!c)return;
c.innerHTML='';
const prs=[{

    name:'Bench Press',emoji:'🏋️',val:Math.round(dispW(120))+' '+dispU(),sub:'Est. 1RM · Epley',date:'Mar 20, 2025',color:'rgba(200,241,53,.1)'

}, {

  name:'Deadlift',emoji:'💀',val:Math.round(dispW(162))+' '+dispU(),sub:'Est. 1RM · Epley',date:'Mar 18, 2025',color:'rgba(165,180,252,.1)'

}, {

  name:'Squat',emoji:'🦵',val:Math.round(dispW(138))+' '+dispU(),sub:'Est. 1RM · Epley',date:'Mar 16, 2025',color:'rgba(251,146,60,.1)'

}, {

  name:'Shoulder Press',emoji:'🎯',val:Math.round(dispW(85))+' '+dispU(),sub:'Est. 1RM · Epley',date:'Mar 14, 2025',color:'rgba(74,222,128,.1)'

}, {

  name:'Romanian Deadlift',emoji:'🔁',val:Math.round(dispW(119))+' '+dispU(),sub:'Est. 1RM · Epley',date:'Mar 16, 2025',color:'rgba(251,191,36,.1)'

}, {

  name:'Tricep Pushdown',emoji:'⚡',val:Math.round(dispW(64))+' '+dispU(),sub:'Top set',date:'Mar 20, 2025',color:'rgba(248,113,113,.1)'

}];
c.innerHTML=prs.map(p=>{
  // PR values are stored in kg internally (the prs array uses dispW already for display)
  // We need the raw kg 1RM to feed getStrengthTier
  const rawKgMap={'Bench Press':120,'Deadlift':162,'Squat':138,'Shoulder Press':85,'Romanian Deadlift':119,'Tricep Pushdown':64};
  const rawKg=rawKgMap[p.name];
  const tier=rawKg?getStrengthTier(p.name,rawKg):null;
  const tierBadge=tier
    ?`<span class="tier-badge tier-${tier.key}" style="display:inline-flex;margin-top:4px;font-size:9px;padding:2px 5px;">${tier.name} ${tier.stars}</span>`
    :'';
  return `<div class="pr-row"><div class="pr-icon" style="background:${p.color};">${p.emoji}</div><div class="pr-info"><div class="pr-name">${p.name}</div><div class="pr-date">${p.date}</div></div><div style="text-align:right;"><div class="pr-val">${p.val}</div><div class="pr-sublabel">${p.sub}</div>${tierBadge}</div></div>`;
}).join('');

}

function renderHeatmap() {

  const c=document.getElementById('activityHeatmap');
if (!c)return;
const levels=[0,0,1,0,2,0,1,0,3,0,2,0,1,0,0,2,0,1,0,3,0,2,0,1,0,0,2,0,1,0,3,0,2,0,1,0,0,2,0,1,0,4,0,2,0,1,0,0,2,0,1,0,3,0,2,0,1,0,0,2,0,1,0,3,0,2,0,0,0,0,0,2,0,0,0,0,0,3,0,2,0,1,0,0,2,0,1,0,3,0,2,0];
c.innerHTML=levels.map(l=>`<div class="hm-cell${l?' l'+l:''}"></div>`).join('');

}


// ── INLINE ACCORDION TOGGLE ──
let currentInline = null;
let reviewRating = 0;

function toggleInline(id) {
  const panel = document.getElementById('inline-' + id);
  const row = document.getElementById('row-' + id);
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  // Multi-open: toggle only this panel independently
  panel.classList.toggle('open', !isOpen);
  if (row) row.classList.toggle('inline-open', !isOpen);
  currentInline = !isOpen ? id : null;
}

function setRating(n) {

  reviewRating = n;
  document.querySelectorAll('.star-btn').forEach(function(s, i) {

  s.classList.toggle('lit', i < n);

});

}

function submitReview() {

  if (reviewRating === 0) {

    showToast('Please select a rating first');
return;

}

showToast('Thanks for your '+ reviewRating +'-star review! ⭐');
reviewRating = 0;
document.querySelectorAll('.star-btn').forEach(function(s) {

  s.classList.remove('lit');

});
toggleInline('review');

}


// ── SETTINGS TOGGLES ──

function toggleSetting(id) {

  const el=document.getElementById('toggle-'+id);
if (el) {

  el.classList.toggle('on');
showToast(el.classList.contains('on')?'Enabled':'Disabled');

}

}


// ══════════════════════════════════════════
// PROFILE SETTINGS — FULLY IMPLEMENTED


// ══════════════════════════════════════════

// State
let profUnit ='kg';// 'kg' | 'lbs'
let profBodyweight = 80; // kg — used for strength tier calculation
let profGender = 'male';   // 'male' | 'female'
let profAge = 30;          // years — used when comparing standards by age
/** 'bw' = bodyweight brackets, 'age' = Strength Level age tables */
let profStrengthBasis = 'bw';

function strengthTableKey(exerciseName) {
  var K = typeof STRENGTH_STANDARD_KEYS !== 'undefined' ? STRENGTH_STANDARD_KEYS : {};
  return K[exerciseName] || exerciseName;
}
function strengthHasAny(exerciseName) {
  var k = strengthTableKey(exerciseName);
  return !!(typeof STRENGTH_STANDARDS !== 'undefined' && STRENGTH_STANDARDS[k])
    || !!(typeof STRENGTH_STANDARDS_LBS !== 'undefined' && STRENGTH_STANDARDS_LBS[k]);
}
/** Last index i with rows[i][0] <= v (Strength Level discrete tables). */
function rowIdxLastLeq(rows, v) {
  if (v == null || !Number.isFinite(v) || v <= 0 || !rows || !rows.length) return -1;
  var best = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] <= v) best = i;
  }
  // Below first bracket: use lightest row (same as legacy clamp-to-row-0 behavior).
  if (best === -1) return 0;
  return best;
}

function updateProfileDisplay() {
  const bwEl = document.getElementById('profBwDisplay');
  const gEl  = document.getElementById('profGenderDisplay');
  const ageEl = document.getElementById('profAgeDisplay');
  if (bwEl) {
    const bwDisplay = profUnit === 'lbs'
      ? Math.round(profBodyweight * 2.20462 * 2) / 2 + ' lbs'
      : profBodyweight + ' kg';
    bwEl.textContent = bwDisplay;
  }
  if (gEl) {
    gEl.innerHTML = '<span class="prof-gender-text">' + (profGender === 'female' ? 'Female' : 'Male') + '</span>' +
      genderSvgMarkup(profGender, 'prof-gender-svg');
  }
  if (ageEl) ageEl.textContent = 'Age ' + profAge;
}

function selectEditGender(g) {
  const mBtn = document.getElementById('editGenderMale');
  const fBtn = document.getElementById('editGenderFemale');
  if (mBtn) { mBtn.classList.toggle('iunit-opt-selected', g === 'male'); mBtn.dataset.selected = g === 'male' ? '1' : ''; }
  if (fBtn) { fBtn.classList.toggle('iunit-opt-selected', g === 'female'); fBtn.dataset.selected = g === 'female' ? '1' : ''; }
}
let profRestSecs = 120;// default rest timer
let profName ='Alex Lifter';
let profHandle ='alexlifts';


// ── Picker sheet open/close ──

function openPicker(id) {

  var overlay=document.getElementById(id +'SheetOverlay');
if (overlay) {

  overlay.classList.add('open');

}

var dialog=document.getElementById(id+'Dialog');
if (dialog) {

  trapFocus(dialog);

}

// Sync bodyweight display unit when opening profile editor
if (id === 'editProfile') {
  var bwEl = document.getElementById('editBodyweight');
  var bwUnit = document.getElementById('editBwUnit');
  if (bwEl) {
    bwEl.value = profUnit === 'lbs'
      ? Math.round(profBodyweight * 2.20462 * 2) / 2
      : profBodyweight;
    bwEl.placeholder = profUnit === 'lbs' ? 'e.g. 175' : 'e.g. 80';
    bwEl.step = profUnit === 'lbs' ? '1' : '0.5';
  }
  if (bwUnit) bwUnit.textContent = profUnit;
  var bwHint = document.getElementById('editBwHint');
  var ageInput = document.getElementById('editAge');
  if (ageInput) ageInput.value = String(profAge);
  if (bwHint) bwHint.textContent = profUnit === 'lbs'
    ? 'Enter in pounds — e.g. 175 lbs'
    : 'Enter in kilograms — e.g. 80 kg';
  selectEditGender(profGender);
}

}

function closePicker(id, e) {

  if (e && e.target !== document.getElementById(id +'SheetOverlay')) return;
var el = document.getElementById(id +'SheetOverlay');
if (el) el.classList.remove('open');
var dialog=document.getElementById(id+'Dialog');
if (dialog) {

  releaseFocus(dialog,document.activeElement);

}

}


// ── Weight units ──

function selectUnit(unit) {

  profUnit = unit;
// Update picker check marks
var kgOpt = document.getElementById('unit-kg');
var lbsOpt = document.getElementById('unit-lbs');
if (kgOpt) { kgOpt.classList.toggle('selected', unit ==='kg'); kgOpt.setAttribute('aria-checked', unit === 'kg' ? 'true' : 'false'); }
if (lbsOpt) { lbsOpt.classList.toggle('selected', unit ==='lbs'); lbsOpt.setAttribute('aria-checked', unit === 'lbs' ? 'true' : 'false'); }
// Sync inline chips
var ikgOpt = document.getElementById('iunit-kg');
var ilbsOpt = document.getElementById('iunit-lbs');
if (ikgOpt) ikgOpt.classList.toggle('selected', unit ==='kg');
if (ilbsOpt) ilbsOpt.classList.toggle('selected', unit ==='lbs');
// Update profile display row
var profEl = document.getElementById('profUnitVal');
if (profEl) profEl.textContent = unit;
// Close picker first
var overlay = document.getElementById('unitsSheetOverlay');
if (overlay) overlay.classList.remove('open');
// Re-render the log page — this updates all input labels and displayed values
renderAll();
markStatsDirty();
updateHistStatVol();
updateGainBadges();
renderPRs();
if (chartsStrengthInit||chartsVolumeInit) {

  chartsStrengthInit=false;
  chartsVolumeInit=false;
  document.querySelectorAll('.prog-canvas-wrap canvas').forEach(function(el) {

  var inst=Chart.getChart(el);
  if (inst)inst.destroy();
  el.closest('.prog-canvas-wrap')?.classList.remove('loaded');

});
if (currentPage==='progress') {

  initStrengthCharts();
  chartsStrengthInit=true;

}

}

refreshHistory();
renderLibrary();
updateProfileDisplay();
const volTitle = document.getElementById('volSectionTitle');
if (volTitle) volTitle.textContent = 'Weekly Volume (' + unit + ')';
showToast('Units switched to '+ unit);

}


// ── Unit conversion (delegates to js/workout-core.js — single place for kg/lbs rules) ──
var KG_TO_LBS = WorkoutCore.KG_TO_LBS;

function dispW(kgVal) {
  return WorkoutCore.dispW(kgVal, profUnit);
}

function storeW(displayVal) {
  return WorkoutCore.storeW(displayVal, profUnit);
}

function dispU() {
  return WorkoutCore.dispU(profUnit);
}

function dispVol_raw(kgVol) {
  return WorkoutCore.dispVol_raw(kgVol, profUnit);
}

function dispVol(kgVol) {
  return WorkoutCore.dispVol(kgVol, profUnit);
}

function weightStep() {
  return WorkoutCore.weightStep(profUnit);
}


// ── Rest timer presets ──

function selectRestTimer(secs) {

  profRestSecs = secs;
  customTimerSecs = secs;
// Update visual selection in the picker (sheet)
document.querySelectorAll('.timer-preset').forEach(function(el) {
  el.classList.toggle('selected', parseInt(el.dataset.secs) === secs);
});
document.querySelectorAll('.timer-preset-wrap[role="radio"]').forEach(function(el) {
  var secs = parseInt(el.querySelector('.timer-preset')?.dataset.secs || '0', 10);
  el.setAttribute('aria-checked', secs === profRestSecs ? 'true' : 'false');
});
// Update inline chips
document.querySelectorAll('[id^="itimer-"]').forEach(function(el) {

  el.classList.remove('selected');

});
var iChip = document.getElementById('itimer-'+ secs);
if (iChip) iChip.classList.add('selected');
// Format display string
var m = Math.floor(secs / 60), s = secs % 60;
var display = m +':'+ String(s).padStart(2,'0');
// Update profile row
var profEl = document.getElementById('profRestVal');
if (profEl) profEl.textContent = display;
// Update the nav timer display to show new default
var timerDisp = document.getElementById('timerDisplay');
if (timerDisp && !timerInterval && timerRemaining === 0) {

  timerDisp.textContent = display;

}

// Close picker then show toast
var overlay = document.getElementById('timerSheetOverlay');
if (overlay) overlay.classList.remove('open');
showToast('Rest timer set to '+ display);

}


// ── Export data ──

function doExport(format) {

  closePicker('export');
const histData = HIST_DATA.map(s => ({

  date: s.date, workout: s.name, duration: s.dur,
  volume_kg: s.vol,
  exercises: s.bests.map(b => b.n +': '+ (b.w ? dispW(b.w) :'BW') + dispU() +' × '+ b.r).join('; ')

}));

let content ='', mime ='', filename ='';

if (format ==='csv') {

  const headers = ['Date','Workout','Duration','Volume ('+ dispU() +')','Exercises'];
const rows = histData.map(r => [r.date, r.workout, r.duration, Math.round(dispVol_raw(r.volume_kg)),'"'+ r.exercises +'"'].join(','));
content = [headers.join(',')].concat(rows).join('\n');
mime ='text/csv';
filename ='workout_log.csv';

}else if (format ==='json') {

  content = JSON.stringify({

    exported: new Date().toISOString(), sessions: histData

  },
  null, 2);
  mime ='application/json';
filename ='workout_log.json';

}else if (format ==='txt') {

  content = histData.map(function(r) {

    return'======================='+'\n'+
r.date +' - '+ r.workout +'\n'+
'Duration: '+ r.duration +' | Volume: '+ (profUnit==='lbs'?Math.round(r.volume_kg*2.20462)+' lbs':r.volume_kg+'kg') +'\n'+
r.exercises.split('; ').map(function(e) {

  return'  - '+ e;

}).join('\n');

}).join('\n\n');
mime ='text/plain';
filename ='workout_log.txt';

}

const blob = new Blob([content], {

  type: mime

});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
showToast(filename +' downloaded');

}


// ── Import data ──

var IMPORT_MAX_BYTES = 2 * 1024 * 1024;
var IMPORT_MAX_SESSIONS = 5000;

function handleImport(input) {

  const file = input.files[0];
  if (!file) return;
  if (file.size > IMPORT_MAX_BYTES) {
    showToast('File too large (max 2 MB)');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {

    try {

      if (file.name.endsWith('.csv')) {
        const lines = e.target.result.trim().split('\n');
        // ── DSA: O(n) batch splice replaces O(n²) repeated unshift calls ──
        // CSV split: quoted fields, doubled quotes as escape
        function splitCSVLine(line) {
          const fields = []; let cur = '', inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
              else { inQ = !inQ; }
            } else if (ch === ',' && !inQ) { fields.push(cur); cur = ''; }
            else { cur += ch; }
          }
          fields.push(cur);
          return fields;
        }
        const newItems = lines.slice(1).reduce((acc, line, i) => {
          const [date, workout, duration, volume] = splitCSVLine(line);
          if (date && workout) acc.push({
            id: Date.now() + i, name: workout.trim(), emoji:'📋',
            date: date.trim(), day:'', exercises:[], sets:[], bests:[],
            vol: parseFloat(volume) || 0, dur: (duration||'').trim(), hasPR: false
          });
          return acc;
        }, []);
        const slice = newItems.slice(0, IMPORT_MAX_SESSIONS);
        HIST_DATA.splice(0, 0, ...slice);
        persistWorkoutHistory();
        refreshHistory();
        closePicker('import');
        showToast(slice.length + ' sessions imported');
      } else {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') throw new Error('invalid');
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        const capped = sessions.slice(0, IMPORT_MAX_SESSIONS);
        // ── DSA: O(n) batch splice replaces O(n²) repeated unshift calls ──
        const newItems = capped.map((s, i) => ({
          id: Date.now() + i, name: (s && s.workout) ? String(s.workout) : 'Workout', emoji:'📋',
          date: (s && s.date) ? String(s.date) : '', day:'', exercises:[], sets:[], bests:[],
          vol: parseFloat(s && s.volume_kg) || 0, dur: (s && s.duration) ? String(s.duration) : '', hasPR: false
        }));
        HIST_DATA.splice(0, 0, ...newItems);
        persistWorkoutHistory();
        refreshHistory();
        closePicker('import');
        showToast(newItems.length + ' sessions imported');
      }

}
catch {

  showToast('Could not read file - use JSON or CSV export');

}

};

reader.readAsText(file);
input.value ='';

}


// ── Edit profile ──

function saveProfile() {

  const name = document.getElementById('editName').value.trim();
const handle = document.getElementById('editHandle').value.trim();
if (!name) {

  showToast('Name cannot be empty');
return;

}

profName = name;
profHandle = handle;

// Save bodyweight
const bwInput = document.getElementById('editBodyweight');
if (bwInput) {
  const rawBw = bwInput.value.trim();
  if (rawBw !== '') {
    const bwVal = parseFloat(rawBw);
    if (!Number.isFinite(bwVal) || bwVal <= 0) {
      showToast('Enter a valid bodyweight');
      return;
    }
    profBodyweight = profUnit === 'lbs'
      ? Math.round((bwVal / 2.20462) * 4) / 4
      : bwVal;
  }
}

// Save gender — read whichever button is marked selected
const mBtn = document.getElementById('editGenderMale');
const fBtn = document.getElementById('editGenderFemale');
if (fBtn && mBtn) {
  if (fBtn.dataset.selected === '1') profGender = 'female';
  else if (mBtn.dataset.selected === '1') profGender = 'male';
  // else: no change (keep existing profGender)
}

const ageInput = document.getElementById('editAge');
if (ageInput) {
  const rawAge = ageInput.value.trim();
  if (rawAge !== '') {
    const a = parseInt(ageInput.value, 10);
    if (!Number.isFinite(a) || a < 10 || a > 100) {
      showToast('Age must be between 10 and 100');
      return;
    }
    profAge = a;
  }
}

// Update profile display cards
updateProfileDisplay();

// Update profile UI
const nameEl = document.querySelector('.prof-name');
const handleEl = document.querySelector('.prof-handle');
if (nameEl) nameEl.textContent = name;
if (handleEl) handleEl.textContent ='@'+ handle +' · Since Jan 2024';

// Refresh set rows so tier badges update immediately
_best1RMCache.clear();
exercises.forEach((_, ei) => renderSets(ei));

closePicker('editProfile');
showToast('Profile updated');

}


// ── Change avatar emoji ──
const AVATARS = ['🏋️','💪','⚡','🔥','🎯','🧗','🦾','🏃','🤸','🥊'];
let avatarIdx = 0;

function changeAvatar() {

  avatarIdx = (avatarIdx + 1) % AVATARS.length;
  const el = document.querySelector('.prof-avatar');
if (el) {

  el.style.transform ='scale(1.2)';
el.textContent = AVATARS[avatarIdx];
setTimeout(() => el.style.transform ='', 200);

}

showToast('Avatar updated');

}

function switchPage(page) {

  if (currentPage===page)return;
  if (page !== 'library') closeAllLibraryRows();
  if (page !== 'history') closeAllHistorySessions();
  currentPage=page;
  persistCurrentPage(page);
  const cfg=PAGES[page];
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
if (cfg.main)document.getElementById(cfg.main)?.classList.add('active');
document.querySelectorAll('.nav-item').forEach(n=> {

  n.classList.remove('active');
n.setAttribute('aria-selected','false');

});
const activeNav=document.getElementById(cfg.nav);
if (activeNav) {

  activeNav.classList.add('active');
activeNav.setAttribute('aria-selected','true');

}
document.getElementById('navBrand').textContent=cfg.brand;
const nt=document.getElementById('navTop');
if (cfg.libMode)nt.classList.add('lib-mode');
else nt.classList.remove('lib-mode');
document.getElementById('startStopBtn').style.display=cfg.libMode?'none':'';
document.getElementById('dotsBtn').style.display=cfg.libMode?'none':'';
closeDotsMenu();if (page==='progress'&&!chartsStrengthInit) {

  setTimeout(()=> {

    if (!chartsStrengthInit) {

      initStrengthCharts();
      chartsStrengthInit=true;

    }

  },
  100);

}

}

let libQuery='',libFilters= {

  muscle:new Set(),equipment:new Set(),pattern:new Set()

},
libOpenIds=new Set();

function closeAllLibraryRows() {
  if (!libOpenIds.size) return;
  libOpenIds.forEach(function (id) {
    const row = document.getElementById('lib-row-' + id);
    const detail = document.getElementById('lib-detail-' + id);
    if (row) {
      row.classList.remove('lib-open');
      const ch = row.querySelector('.lib-chevron');
      if (ch) ch.classList.remove('open');
    }
    if (detail) detail.classList.remove('open');
  });
  libOpenIds.clear();
}

function closeAllHistorySessions() {
  document.querySelectorAll('.hist-session-detail.open').forEach(function (el) {
    el.classList.remove('open');
  });
}

// Library: window.LIBRARY in js/workout-library.js — strength tables in js/workout-strength-data.js
function initLibrary() {

  const qw=document.getElementById('libQuickFilters');
[{

    val:'All',label:'All'

},...MUSCLES.map(m=>({

  val:m,label:m

}))].forEach(item=> {

const c=document.createElement('div');
c.className='qf-chip'+(item.val==='All'?' active':'');
c.dataset.val=item.val;
c.textContent=item.label;
c.onclick=()=>toggleQF(item.val,c);
qw.appendChild(c);

});
EQUIPS.forEach(e=> {

  const t=document.createElement('div');
t.className='ftoggle';
t.dataset.type='equipment';
t.dataset.val=e;
t.textContent=e;
t.onclick=()=>toggleSF('equipment',e,t);
document.getElementById('sheetEquip').appendChild(t);

});
PATTERNS.forEach(p=> {

  const t=document.createElement('div');
t.className='ftoggle';
t.dataset.type='pattern';
t.dataset.val=p;
t.textContent=p;
t.onclick=()=>toggleSF('pattern',p,t);
document.getElementById('sheetPattern').appendChild(t);

});
renderLibrary();

}

function toggleQF(val,chip) {

  if (val==='All') {

  libFilters.muscle.clear();
  document.querySelectorAll('.qf-chip').forEach(c=>c.classList.remove('active'));
chip.classList.add('active');

} else {

  if (libFilters.muscle.has(val)) {

    libFilters.muscle.delete(val);
    chip.classList.remove('active');

}else {

  libFilters.muscle.add(val);
  chip.classList.add('active');

}
const ac=document.querySelector('.qf-chip[data-val="All"]');
if (libFilters.muscle.size>0)ac?.classList.remove('active');
else ac?.classList.add('active');

}

updateFUI();
renderLibrary();

}

function toggleSF(type,val,el) {

  const s=libFilters[type];
  if (s.has(val)) {

    s.delete(val);
    el.classList.remove('active');

}else {

  s.add(val);
  el.classList.add('active');

}

}

function clearSheetFilters() {

  ['equipment','pattern'].forEach(t=> {

  libFilters[t].clear();document.querySelectorAll(`.ftoggle[data-type="${t}"]`).forEach(el=>el.classList.remove('active'));

});

}

function applyFilterSheet() {

  closeFilterSheet();
  updateFUI();
  renderLibrary();

}

function clearAllLibFilters() {

  libFilters.muscle.clear();
  libFilters.equipment.clear();
  libFilters.pattern.clear();
  document.querySelectorAll('.qf-chip').forEach(c => c.classList.remove('active'));
document.querySelector('.qf-chip[data-val="All"]')?.classList.add('active');
document.querySelectorAll('.ftoggle').forEach(el => el.classList.remove('active'));
updateFUI();
renderLibrary();

}

function updateFUI() {

  const tot = libFilters.muscle.size + libFilters.equipment.size + libFilters.pattern.size;
  const b = document.getElementById('filterBadge'), btn = document.getElementById('libFilterBtn');
b.textContent = tot;
b.classList.toggle('visible', tot > 0);
btn.classList.toggle('has-filters', tot > 0);
const ban = document.getElementById('libActiveBanner');
if (tot>0) {

  const p = [];
  if (libFilters.muscle.size) p.push([...libFilters.muscle].join(', '));
if (libFilters.equipment.size) p.push([...libFilters.equipment].join(', '));
if (libFilters.pattern.size) p.push([...libFilters.pattern].join(', '));
document.getElementById('libBannerText').textContent = p.join(' · ');
ban.classList.add('visible');

}else ban.classList.remove('visible');

}

function openFilterSheet() {

  document.getElementById('filterSheetOverlay').classList.add('open');

}

function closeFilterSheet(e) {

  if (e&&e.target!==document.getElementById('filterSheetOverlay'))return;
document.getElementById('filterSheetOverlay').classList.remove('open');

}

// ── DSA: rAF-debounced search — coalesces rapid keystrokes into one render ──
// Without debounce, every keystroke triggers getFiltered() + full DOM rebuild.
// With rAF: intermediate keystrokes are cancelled; only the final state renders.
let _libSearchRAF = 0;
function onLibSearch(val) {
  libQuery = val.trim().toLowerCase();
  document.getElementById('libSearchX').classList.toggle('visible', val.length > 0);
  if (_libSearchRAF) cancelAnimationFrame(_libSearchRAF);
  _libSearchRAF = requestAnimationFrame(() => { _libSearchRAF = 0; renderLibrary(); });
}

function clearLibSearch() {
  document.getElementById('libSearch').value='';
  libQuery='';
  document.getElementById('libSearchX').classList.remove('visible');
  renderLibrary();
}

// ── Library search: token-wise fuzzy match (Levenshtein + substring) on precomputed haystacks ──
// Fixes: typos ("dumbell"), inflections ("inclined" vs "incline"), and multi-word queries where
// the full phrase is not a contiguous substring of the exercise text.
let _libSearchHaystack = null;
let _libSearchWords = null;
function ensureLibSearchHaystack() {
  if (_libSearchHaystack) return;
  _libSearchHaystack = [];
  for (let i = 0; i < LIBRARY.length; i++) {
    const ex = LIBRARY[i];
    _libSearchHaystack[ex.id] = (ex.name + ' ' + ex.muscle + ' ' + ex.equipment + ' ' + ex.pattern).toLowerCase();
  }
}
function ensureLibSearchWords() {
  if (_libSearchWords) return;
  ensureLibSearchHaystack();
  _libSearchWords = [];
  for (let i = 0; i < LIBRARY.length; i++) {
    const ex = LIBRARY[i];
    const s = _libSearchHaystack[ex.id];
    _libSearchWords[ex.id] = s.match(/[a-z0-9]+/g) || [];
  }
}
/** Levenshtein distance (iterative single row). */
function _libLevenshtein(a, b) {
  if (a === b) return 0;
  const n = b.length;
  const m = a.length;
  if (n === 0) return m;
  if (m === 0) return n;
  let v0 = new Array(n + 1);
  let v1 = new Array(n + 1);
  for (let j = 0; j <= n; j++) v0[j] = j;
  for (let i = 0; i < m; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < n; j++) {
      const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    const t = v0; v0 = v1; v1 = t;
  }
  return v0[n];
}
function _libEditBudget(tokenLen, wordLen) {
  const L = Math.max(tokenLen, wordLen);
  if (L <= 5) return 1;
  if (L <= 12) return 2;
  return 2;
}
/** One query token matches an exercise if it aligns with the haystack or any tokenized word. */
function libTokenMatches(token, words, haystack) {
  if (!token) return false;
  if (haystack.indexOf(token) !== -1) return true;
  if (token.length === 1) return words.indexOf(token) !== -1;
  if (token.length === 2) {
    for (let i = 0; i < words.length; i++) if (words[i] === token) return true;
    return haystack.indexOf(token) !== -1;
  }
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === token) return true;
    if (token.length >= 3 && w.length >= token.length && w.indexOf(token) === 0) return true;
    if (token.length >= 3 && w.length >= 3 && token.indexOf(w) === 0) return true;
    if (token.length >= 3 && w.length >= 3) {
      if (w.indexOf(token) !== -1 || token.indexOf(w) !== -1) return true;
      const maxd = _libEditBudget(token.length, w.length);
      if (Math.abs(token.length - w.length) > maxd) continue;
      if (_libLevenshtein(token, w) <= maxd) return true;
    }
  }
  return false;
}
function libExerciseMatchesTokens(exId, tokens) {
  const hay = _libSearchHaystack[exId];
  const words = _libSearchWords[exId];
  for (let t = 0; t < tokens.length; t++) {
    if (!libTokenMatches(tokens[t], words, hay)) return false;
  }
  return true;
}
function getFiltered() {
  const fm = libFilters.muscle, fe = libFilters.equipment, fp = libFilters.pattern;
  const needM = fm.size > 0, needE = fe.size > 0, needP = fp.size > 0;
  function passesFilters(ex) {
    if (needM && !fm.has(ex.muscle)) return false;
    if (needE && !fe.has(ex.equipment)) return false;
    if (needP && !fp.has(ex.pattern)) return false;
    return true;
  }
  if (!libQuery) {
    if (!needM && !needE && !needP) return LIBRARY;
    const out = [];
    for (let i = 0; i < LIBRARY.length; i++) {
      const ex = LIBRARY[i];
      if (passesFilters(ex)) out.push(ex);
    }
    return out;
  }
  const tokens = libQuery.split(/\s+/).filter(Boolean);
  ensureLibSearchWords();
  let idsExact = null;
  const firstHit = LIBRARY_INDEX.get(tokens[0]);
  if (firstHit) {
    idsExact = new Set(firstHit);
    for (let t = 1; t < tokens.length; t++) {
      const hit = LIBRARY_INDEX.get(tokens[t]);
      if (!hit) { idsExact = new Set(); break; }
      if (idsExact.size <= hit.size) {
        for (const id of idsExact) {
          if (!hit.has(id)) idsExact.delete(id);
        }
      } else {
        const next = new Set();
        hit.forEach(function (id) { if (idsExact.has(id)) next.add(id); });
        idsExact = next;
      }
    }
  }
  const ids = new Set();
  if (idsExact !== null && idsExact.size > 0) {
    idsExact.forEach(function (id) { ids.add(id); });
  } else {
    for (let i = 0; i < LIBRARY.length; i++) {
      const ex = LIBRARY[i];
      if (libExerciseMatchesTokens(ex.id, tokens)) ids.add(ex.id);
    }
  }
  const out = [];
  for (let i = 0; i < LIBRARY.length; i++) {
    const ex = LIBRARY[i];
    if (!ids.has(ex.id)) continue;
    if (passesFilters(ex)) out.push(ex);
  }
  return out;
}

function libCarouselSyncHeight(rail) {
  var idx = Math.round(rail.scrollLeft / Math.max(rail.clientWidth, 1));
  var slides = rail.querySelectorAll('.lib-carousel-slide');
  if (slides[idx]) rail.style.height = slides[idx].scrollHeight + 'px';
}
function libCarouselGo(exId, idx) {
  var rail = document.getElementById('lc-'+exId);
  if (!rail) return;
  rail.scrollTo({left: rail.clientWidth * idx, behavior:'smooth'});
  setTimeout(function(){ libCarouselSyncHeight(rail); }, 320);
}
function libCarouselScroll(exId, rail) {
  var idx = Math.round(rail.scrollLeft / Math.max(rail.clientWidth, 1));
  var dots = document.getElementById('lcd-'+exId);
  if (!dots) return;
  dots.querySelectorAll('.lib-carousel-dot').forEach(function(d,i){
    d.classList.toggle('active', i === idx);
  });
  libCarouselSyncHeight(rail);
}
function libCarouselAddDrag(rail) {
  // Mouse/pointer drag for desktop; on iOS native touch handles scroll-snap natively
  var startX = 0, startScroll = 0, dragging = false, moved = false;
  rail.addEventListener('pointerdown', function(e) {
    if (e.button !== 0) return;
    if (e.pointerType === 'touch') return; // Let native iOS touch handle it
    if (e.target.closest('button, a, input, select, [role="button"]')) return;
    dragging = true; moved = false;
    startX = e.clientX;
    startScroll = rail.scrollLeft;
    rail.classList.add('dragging');
    // No setPointerCapture — was blocking button clicks and causing iOS jank
  });
  rail.addEventListener('pointermove', function(e) {
    if (!dragging || e.pointerType === 'touch') return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    if (moved) {
      e.preventDefault();
      rail.scrollLeft = startScroll - dx;
    }
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    rail.classList.remove('dragging');
    if (moved) {
      // Snap to nearest with smooth iOS-style ease-out
      var idx = Math.round(rail.scrollLeft / Math.max(rail.clientWidth, 1));
      idx = Math.max(0, Math.min(idx, rail.querySelectorAll('.lib-carousel-slide').length - 1));
      rail.scrollTo({ left: rail.clientWidth * idx, behavior: 'smooth' });
      setTimeout(function() { libCarouselSyncHeight(rail); }, 320);
    }
  }
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('mouseleave', function() { if (dragging) endDrag(); });
}
function libRowAnimDelay(indexInGroup, groupBaseDelay, totalResults) {
  if (totalResults > 64) return 0;
  return groupBaseDelay + indexInGroup * 35;
}
/** Re-attach expanded detail panels after a full library re-render (search/filter). */
function restoreOpenLibraryDetails() {
  if (!libOpenIds.size) return;
  libOpenIds.forEach(function (id) {
    const row = document.getElementById('lib-row-' + id);
    if (!row || document.getElementById('lib-detail-' + id)) return;
    const ex = typeof LIBRARY_BY_ID !== 'undefined' ? LIBRARY_BY_ID.get(id) : null;
    if (!ex) return;
    const d = buildDetail(ex);
    d.classList.add('open');
    row.classList.add('lib-open');
    const ch = row.querySelector('.lib-chevron');
    if (ch) ch.classList.add('open');
    row.after(d);
    requestAnimationFrame(function () {
      const rail = d.querySelector('.lib-carousel');
      if (rail) {
        libCarouselSyncHeight(rail);
        if (!rail._dragInit) { rail._dragInit = true; libCarouselAddDrag(rail); }
        setTimeout(function () { libCarouselSyncHeight(rail); }, 380);
      }
    });
  });
}
function renderLibrary() {
  // Rows only on first paint — detail panels (carousels, standards tables) mount lazily on expand.
  const results=getFiltered(),container=document.getElementById('libResults'),empty=document.getElementById('libEmpty');
  const libSub = document.getElementById('libSubtitle');
  if (libSub && typeof LIBRARY !== 'undefined' && LIBRARY.length) {
    libSub.textContent = LIBRARY.length + ' exercises · tap to explore';
  }
  container.innerHTML='';
  empty.classList.remove('visible');
  document.getElementById('libResultsCount').textContent=results.length+' exercise'+(results.length!==1?'s':'');
  if (!results.length){empty.classList.add('visible');return;}
  const outerFrag=document.createDocumentFragment();
  const nTot = results.length;
  if (libQuery.length>0) {
    const g=document.createElement('div');
    g.className='lib-group';
    g.style.margin='8px 16px 0';
    const gFrag=document.createDocumentFragment();
    results.forEach((ex,i)=>{gFrag.appendChild(buildRow(ex,libRowAnimDelay(i,0,nTot)));});
    g.appendChild(gFrag);
    outerFrag.appendChild(g);
  } else {
    const groups=new Map();
    results.forEach(ex=>{
      if (!groups.has(ex.muscle))groups.set(ex.muscle,[]);
      groups.get(ex.muscle).push(ex);
    });
    let delay=0;
    groups.forEach((exs,muscle)=>{
      const s=document.createElement('div');
      s.className='lib-section-header';
      s.innerHTML='<span class="lib-section-title">'+muscle+'</span><span class="lib-section-count">'+exs.length+'</span>';
      outerFrag.appendChild(s);
      const g=document.createElement('div');
      g.className='lib-group';
      const gFrag=document.createDocumentFragment();
      exs.forEach((ex,i)=>{gFrag.appendChild(buildRow(ex,libRowAnimDelay(i,delay,nTot)));});
      g.appendChild(gFrag);
      outerFrag.appendChild(g);
      delay+=exs.length*35;
    });
  }
  container.appendChild(outerFrag);
  restoreOpenLibraryDetails();
}

/** Session log uses `exercises`; LIBRARY rows ship with empty `history` — merge for library stats & standards tier. */
function libEffectiveHistoryForName(exName) {
  if (!exName) return [];
  if (typeof exercises !== 'undefined' && exercises && exercises.length) {
    for (var i = 0; i < exercises.length; i++) {
      var s = exercises[i];
      if (s.name === exName && s.history && s.history.length) return s.history;
    }
  }
  var libEx = typeof LIBRARY_MAP !== 'undefined' ? LIBRARY_MAP.get(exName) : null;
  return libEx && libEx.history && libEx.history.length ? libEx.history : [];
}
function libEffectiveHistory(ex) {
  return libEffectiveHistoryForName(ex && ex.name);
}

function buildRow(ex,animDelay) {

  const hist = libEffectiveHistory(ex);
  const isOpen=libOpenIds.has(ex.id),hasPR=hist.some(h=>h[3]);
  const best1RM=hist.length?Math.max(...hist.map(h=>epley1RM(h[1],h[2]))):null;
  const color=MC[ex.muscle]||'#c8f135',bg=MB[ex.muscle]||'var(--surface3)';
const row=document.createElement('div');
row.className='lib-row'+(isOpen?' lib-open':'');
row.id='lib-row-'+ex.id;
row.style.animationDelay=animDelay+'ms';
row.onclick=()=>toggleLibRow(ex.id);
const prDot=hasPR?'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+color+';margin-left:5px;vertical-align:middle;"></span>':'';
const pill=best1RM?'<span class="lib-1rm-pill" style="color:'+color+';background:'+bg+';border:1px solid '+color+'33;">'+Math.round(dispW(best1RM))+' '+dispU()+'</span>':'';
row.innerHTML='<div class="lib-row-icon" style="background:'+bg+'">'+ex.emoji+'</div>'
+'<div class="lib-row-info"><div class="lib-row-name">'+escapeHtml(ex.name)+prDot+'</div>'
+'<div class="lib-row-sub">'+escapeHtml(ex.equipment)+' &middot; '+escapeHtml(ex.pattern)+'</div></div>'
+'<div class="lib-row-right">'+pill+'<span class="material-symbols-outlined lib-chevron'+(isOpen?' open':'')+'">expand_more</span></div>';
return row;

}

function buildDetail(ex) {

  const hist = libEffectiveHistory(ex);
  const isOpen=libOpenIds.has(ex.id);
  const best1RM=hist.length?Math.max(...hist.map(h=>epley1RM(h[1],h[2]))):null;
  const last=hist[0],color=MC[ex.muscle]||'#c8f135';
const panel=document.createElement('div');
panel.className='lib-detail'+(isOpen?' open':'');
panel.id='lib-detail-'+ex.id;
const v1=best1RM?'<div class="lib-ds-val">'+Math.round(dispW(best1RM))+' '+dispU()+'</div>':'<div class="lib-ds-val muted">-</div>';
const v2=last?'<div class="lib-ds-val">'+dispW(last[1])+' '+dispU()+'</div>':'<div class="lib-ds-val muted">-</div>';
const v3=last?'<div class="lib-ds-val">'+last[2]+' reps</div>':'<div class="lib-ds-val muted">-</div>';
const steps=ex.steps.map((s,i)=>'<div class="lib-step"><div class="lib-step-num">'+(i+1)+'</div><div class="lib-step-text">'+s+'</div></div>').join('');
const cues=ex.cues.map(c=>'<div class="lib-cue"><span class="material-symbols-outlined">bolt</span><div class="lib-cue-text">'+c+'</div></div>').join('');
const hasStd=strengthHasAny(ex.name);
const dotsHtml=hasStd
  ?'<div class="lib-carousel-dots" id="lcd-'+ex.id+'">'
    +'<div class="lib-carousel-dot active" onclick="libCarouselGo('+ex.id+',0)" title="Technique"></div>'
    +'<div class="lib-carousel-dot" onclick="libCarouselGo('+ex.id+',1)" title="Standards"></div>'
    +'</div>'
  :'';
panel.innerHTML='<div class="lib-detail-stats"><div class="lib-ds">'+v1+'<div class="lib-ds-lbl">Best 1RM</div></div><div class="lib-ds">'+v2+'<div class="lib-ds-lbl">Last Weight</div></div><div class="lib-ds">'+v3+'<div class="lib-ds-lbl">Last Reps</div></div></div>'
+'<div class="lib-carousel-wrap">'
+'<div class="lib-carousel" id="lc-'+ex.id+'" onscroll="libCarouselScroll('+ex.id+',this)">'
+'<div class="lib-carousel-slide">'
+'<div class="lib-slide-label"><div class="lib-slide-label-l"><span class="material-symbols-outlined">format_list_numbered</span>Technique</div><span style="font-size:11px;color:var(--text3);">'+(hasStd?'1 of 2':'')+'</span></div>'
+'<div class="lib-muscles"><div class="lib-muscle-fig">'+muscleSVG(ex.muscle,color)+'</div><div class="lib-muscle-text"><div class="lib-muscle-primary">'+ex.primary+'</div><div class="lib-muscle-secondary">Secondary: '+ex.secondary+'</div></div></div>'
+'<div class="lib-how"><div class="lib-how-title">How to perform</div><div class="lib-steps">'+steps+'</div></div>'
+'<div class="lib-cues">'+cues+'</div>'
+'</div>'
+(hasStd
  ?'<div class="lib-carousel-slide">'
    +'<div class="lib-slide-label"><div class="lib-slide-label-l"><span class="material-symbols-outlined">bar_chart</span>Strength Standards</div><span style="font-size:11px;color:var(--text3);">2 of 2</span></div>'
    +buildStdTableSection(ex.name,true)
    +'</div>'
  :'')
+'</div>'
+dotsHtml
+'</div>'
+'<div class="lib-detail-footer"><button class="lib-add-btn" data-exname="'+escapeHtml(ex.name)+'" onclick="addExToWorkout(this.getAttribute(\'data-exname\'))"><span class="material-symbols-outlined">add</span>Add to Workout</button><button class="lib-hist-btn" onclick="showToast(\'History coming soon\')"><span class="material-symbols-outlined">show_chart</span>History</button></div>';
  return panel;
}

// ── Strength Standards Table Section for library detail ──
// Apple HIG: horizontal scroll table (Health/Fitness app pattern) with
// highlighted row for the user's current bodyweight bracket or age row.
function buildStdTableSection(exName, inCarousel) {
  var canon = strengthTableKey(exName);
  var stdKg  = typeof STRENGTH_STANDARDS !== 'undefined' ? STRENGTH_STANDARDS[canon] : null;
  var stdLbs = typeof STRENGTH_STANDARDS_LBS !== 'undefined' ? STRENGTH_STANDARDS_LBS[canon] : null;
  if (!stdKg && !stdLbs) return '';
  var uid = exName.replace(/[^a-z0-9]/gi, '_');
  var mBtn = '<button type="button" class="std-gender-btn'+(profGender==="male"?" active":"")+'" onclick="stdToggleGender(\''+uid+'\',\'male\')">Male</button>';
  var fBtn = '<button type="button" class="std-gender-btn'+(profGender==="female"?" active":"")+'" onclick="stdToggleGender(\''+uid+'\',\'female\')">Female</button>';
  var bBtn = '<button type="button" class="std-gender-btn'+(profStrengthBasis==="bw"?" active":"")+'" onclick="stdSetBasis(\''+uid+'\',\'bw\')">By bodyweight</button>';
  var aBtn = '<button type="button" class="std-gender-btn'+(profStrengthBasis==="age"?" active":"")+'" onclick="stdSetBasis(\''+uid+'\',\'age\')">By age</button>';
  var hdr = inCarousel
    ? '<div class="std-header"><div class="std-gender-toggle std-sex-toggle">'+mBtn+fBtn+'</div></div>'
      + '<div class="std-header" style="margin-top:6px;"><div class="std-gender-toggle std-basis-toggle">'+bBtn+aBtn+'</div></div>'
    : '<div class="std-header"><span class="std-title">Strength Standards</span><div class="std-gender-toggle std-sex-toggle">'+mBtn+fBtn+'</div></div>'
      + '<div class="std-header" style="margin-top:6px;"><div class="std-gender-toggle std-basis-toggle">'+bBtn+aBtn+'</div></div>';
  return '<div class="std-section'+(inCarousel?' in-carousel':'')+'" id="std-'+uid+'" data-std-exname="'+exName.replace(/"/g,'&quot;')+'">'
    + hdr
    + renderStdTable(exName, uid, profGender)
    + '</div>';
}

function renderStdTable(exName, uid, gender) {
  var useLbs  = profUnit === 'lbs';
  var basis = profStrengthBasis || 'bw';
  var canon = strengthTableKey(exName);
  var stdData, ageK, ageL;
  if (basis === 'age') {
    ageK = typeof STRENGTH_STANDARDS_AGE !== 'undefined' ? STRENGTH_STANDARDS_AGE[canon] : null;
    ageL = typeof STRENGTH_STANDARDS_AGE_LBS !== 'undefined' ? STRENGTH_STANDARDS_AGE_LBS[canon] : null;
    stdData = useLbs ? ageL : ageK;
  } else {
    stdData = useLbs ? STRENGTH_STANDARDS_LBS[canon] : STRENGTH_STANDARDS[canon];
  }
  if (!stdData) return '<div class="std-no-data">Standards not available for this view</div>';
  var rows = gender === 'female' ? stdData.female : stdData.male;
  if (!rows || !rows.length) return '<div class="std-no-data">Standards not available for this view</div>';
  var unit = dispU();
  var isAge = basis === 'age';
  var userRowIdx = -1;
  if (isAge) {
    userRowIdx = profAge > 0 ? rowIdxLastLeq(rows, profAge) : -1;
  } else {
    var userBw = WorkoutCore.profileBwInUnit(profBodyweight, profUnit);
    userRowIdx = profBodyweight > 0 ? rowIdxLastLeq(rows, userBw) : -1;
  }

  var userTierCol = -1;
  if (userRowIdx >= 0) {
    var userRow = rows[userRowIdx];
    var ormHist = libEffectiveHistoryForName(exName);
    var userOrm = ormHist.length
      ? Math.max.apply(null, ormHist.map(function(h){ return epley1RM(h[1], h[2]); }))
      : 0;
    if (userOrm > 0) {
      var userOrmDisplay = useLbs ? Math.round(userOrm * KG_TO_LBS * 2) / 2 : userOrm;
      userTierCol = bsearchTierLevel(userRow.slice(1), userOrmDisplay);
    }
  }

  var colClasses = ['std-td-beg','std-td-nov','std-td-int','std-td-adv','std-td-elt'];
  var thClasses  = ['std-th-beg','std-th-nov','std-th-int','std-th-adv','std-th-elt'];
  var colNames   = ['Beg','Nov','Int','Adv','Elite'];

  var note;
  if (isAge) {
    note = profAge > 0
      ? 'Your age row highlighted — ' + profAge + ' yrs (Strength Level)'
      : 'Set age in Profile to highlight your row';
  } else {
    var userBw2 = WorkoutCore.profileBwInUnit(profBodyweight, profUnit);
    note = profBodyweight > 0
      ? 'Your bracket highlighted — ~' + Math.round(userBw2) + ' ' + unit + ' (Strength Level)'
      : 'Set bodyweight in Profile to highlight your row';
  }

  var firstTh = isAge ? 'Age (yrs)' : 'BW (' + unit + ')';
  var thead = '<thead><tr>'
    + '<th class="std-th-bw">' + firstTh + '</th>'
    + thClasses.map(function(cls, ci) {
        var isTier = ci === userTierCol;
        return '<th class="'+cls+(isTier?' std-th-tier':'')+'">' + colNames[ci] + (isTier ? ' ◆' : '') + '</th>';
      }).join('')
    + '</tr></thead>';

  var tbody = '<tbody>' + rows.map(function(row, ri) {
    var lastBw = rows[rows.length - 1][0];
    var keyLabel = String(row[0]);
    if (!isAge && ri === rows.length - 1 && profBodyweight > 0) {
      var ub = WorkoutCore.profileBwInUnit(profBodyweight, profUnit);
      if (ub > row[0]) keyLabel = row[0] + '+';
    }
    if (isAge && ri === rows.length - 1 && profAge > lastBw) keyLabel = lastBw + '+';
    var isUser = ri === userRowIdx;
    return '<tr'+(isUser?' class="std-user-row"':'')+'>'
      + '<td class="std-td-bw">'+(isUser?'▶ ':'')+keyLabel+'</td>'
      + colClasses.map(function(cls, ci) {
          var isTier = ci === userTierCol;
          var extra = isTier ? ' std-td-tier' : '';
          var isUserTierCell = isTier && isUser;
          if (isUserTierCell) extra += ' std-td-tier-active';
          return '<td class="'+cls+extra+'">' + row[ci + 1] + '</td>';
        }).join('')
      + '</tr>';
  }).join('') + '</tbody>';

  return '<div class="std-bw-note">'+note+'</div>'
    + '<div class="std-scroll" id="std-wrap-'+uid+'">'
    + '<table class="std-table">'+thead+tbody+'</table>'
    + '</div>';
}

function stdRefreshTable(uid) {
  var section = document.getElementById('std-'+uid);
  if (!section) return;
  var exName = section.getAttribute('data-std-exname');
  if (!exName) return;
  var gender = section.querySelector('.std-gender-btn.active');
  var g = gender && gender.textContent.toLowerCase().trim() === 'female' ? 'female' : 'male';
  var oldNote = section.querySelector('.std-bw-note');
  var oldWrap = document.getElementById('std-wrap-'+uid);
  var newHtml = renderStdTable(exName, uid, g);
  var tmp = document.createElement('div');
  tmp.innerHTML = newHtml;
  if (oldNote) oldNote.replaceWith(tmp.querySelector('.std-bw-note'));
  if (oldWrap) oldWrap.replaceWith(tmp.querySelector('.std-scroll'));
}

function stdToggleGender(uid, gender) {
  var section = document.getElementById('std-'+uid);
  if (!section) return;
  section.querySelectorAll('.std-sex-toggle .std-gender-btn').forEach(function(b) {
    b.classList.toggle('active', b.textContent.toLowerCase().trim() === gender);
  });
  var exName = section.getAttribute('data-std-exname');
  if (!exName) return;
  var oldNote = section.querySelector('.std-bw-note');
  var oldWrap = document.getElementById('std-wrap-'+uid);
  var newHtml = renderStdTable(exName, uid, gender);
  var tmp = document.createElement('div');
  tmp.innerHTML = newHtml;
  if (oldNote) oldNote.replaceWith(tmp.querySelector('.std-bw-note'));
  if (oldWrap) oldWrap.replaceWith(tmp.querySelector('.std-scroll'));
}

function stdSetBasis(uid, basis) {
  profStrengthBasis = basis;
  var section = document.getElementById('std-'+uid);
  if (!section) return;
  section.querySelectorAll('.std-basis-toggle .std-gender-btn').forEach(function(b) {
    var t = b.textContent.toLowerCase();
    var isAgeBtn = t.indexOf('age') !== -1;
    b.classList.toggle('active', (basis === 'age' && isAgeBtn) || (basis === 'bw' && !isAgeBtn));
  });
  stdRefreshTable(uid);
}

function toggleLibRow(id) {
  const row = document.getElementById('lib-row-' + id);
  if (!row) return;
  let detail = document.getElementById('lib-detail-' + id);
  if (!detail) {
    const ex = typeof LIBRARY_BY_ID !== 'undefined' ? LIBRARY_BY_ID.get(id) : null;
    if (!ex) return;
    detail = buildDetail(ex);
    row.after(detail);
  }

  const wasOpen = detail.classList.contains('open');

  // Save the row's top position relative to viewport before any layout change
  const rowTopBefore = row.getBoundingClientRect().top;

  if (wasOpen) {
    libOpenIds.delete(id);
    // Close this card
    row.classList.remove('lib-open');
    const ch = row.querySelector('.lib-chevron');
    if (ch) ch.classList.remove('open');
    detail.classList.remove('open');
  } else {
    libOpenIds.add(id);
    // Open this card (leave others open — user can have multiple)
    row.classList.add('lib-open');
    const ch = row.querySelector('.lib-chevron');
    if (ch) ch.classList.add('open');
    detail.classList.add('open');
    // Init carousel height + drag on open
    requestAnimationFrame(function() {
      var rail = detail.querySelector('.lib-carousel');
      if (rail) {
        libCarouselSyncHeight(rail);
        if (!rail._dragInit) { rail._dragInit = true; libCarouselAddDrag(rail); }
        setTimeout(function() { libCarouselSyncHeight(rail); }, 380);
      }
    });
  }

  // Prevent position jump: restore the row to its pre-expand viewport position instantly
  requestAnimationFrame(function() {
    const rowTopAfter = row.getBoundingClientRect().top;
    const diff = rowTopAfter - rowTopBefore;
    if (Math.abs(diff) > 1) {
      window.scrollBy({ top: diff, behavior: 'instant' });
    }
  });
}

function muscleSVG(muscle,color){return '<svg viewBox="0 0 48 68" xmlns="http://www.w3.org/2000/svg"><ellipse cx="24"cy="9"rx="6.5"ry="7.5"fill="#252630"/><rect x="15"y="17"width="18"height="22"rx="4"fill="#252630"/><rect x="8"y="19"width="7"height="17"rx="3"fill="#252630"/><rect x="33"y="19"width="7"height="17"rx="3"fill="#252630"/><rect x="15"y="39"width="8"height="22"rx="3"fill="#252630"/><rect x="25"y="39"width="8"height="22"rx="3"fill="#252630"/>'+muscleHL(muscle,color)+'</svg>';}

function muscleHL(m,c){const h=(d,o='.75')=>'<path d="'+d+'"fill="'+c+'"opacity="'+o+'"/>';switch(m){case 'Chest':return h('M17 18 Q24 27 31 18 L31 28 Q24 35 17 28 Z');case 'Back':return h('M17 18 Q24 22 31 18 L31 37 Q24 41 17 37 Z');case 'Shoulders':return'<ellipse cx="9"cy="21"rx="5"ry="5.5"fill="'+c+'"opacity=".75"/><ellipse cx="39"cy="21"rx="5"ry="5.5"fill="'+c+'"opacity=".75"/>';case 'Triceps':return'<rect x="8"y="24"width="7"height="9"rx="2"fill="'+c+'"opacity=".75"/><rect x="33"y="24"width="7"height="9"rx="2"fill="'+c+'"opacity=".75"/>';case 'Quads':return h('M15 39 L23 39 L22 61 L15 61 Z')+h('M25 39 L33 39 L32 61 L25 61 Z');case 'Hamstrings':return h('M15 46 L23 46 L22 61 L15 61 Z')+h('M25 46 L33 46 L32 61 L25 61 Z');case 'Glutes':return h('M15 36 Q24 45 33 36 L33 42 Q24 50 15 42 Z');case 'Core':return h('M17 24 L31 24 L31 38 L17 38 Z','.45');case 'Forearms':return'<rect x="7"y="26"width="6"height="10"rx="2"fill="'+c+'"opacity=".75"/><rect x="35"y="26"width="6"height="10"rx="2"fill="'+c+'"opacity=".75"/>';default:return h('M17 18 Q24 27 31 18 L31 28 Q24 35 17 28 Z');}}

function addExToWorkout(name){
  // ── DSA: O(1) HashMap lookup replaces O(n) LIBRARY.find() ──
  const libEx=LIBRARY_MAP.get(name);
  if (!libEx){showToast('Exercise not found');return;}
  const newEx=WorkoutCore.sessionExerciseFromLibrary(libEx);
  exercises.push(newEx);
  const lw=newEx.history[0]?.[1]??'',lr=newEx.history[0]?.[2]??'';
  allSets.push(Array.from({length:3},()=>({type:'working',weight:lw,reps:lr,completed:false,note:'',completedAt:null,restTaken:null})));
  exOpen.push(true);exStartedAt.push(null);exFinishedAt.push(null);editMode.push(false);
  _best1RMCache.delete(exercises.length-1); // invalidate for new exercise slot
  renderAll();showToast(name+' added to workout');switchPage('log');
  setTimeout(()=>{const block=document.getElementById('ex-block-'+(exercises.length-1));if (block)block.scrollIntoView({behavior:'smooth',block:'nearest'});},200);
}


// ── DSA: Memoised Epley 1RM — Map cache, capped at 512 entries ──
// Called on every keystroke; caching eliminates redundant floating-point work.
const _1rmCache = new Map();
const _1rmCacheMax = 512;
function epley1RM(w, r) {
  if (r === 1) return w;
  const k = w + ':' + r;
  const cached = _1rmCache.get(k);
  if (cached !== undefined) return cached;
  const v = w * (1 + r / 30);
  if (_1rmCache.size >= _1rmCacheMax) _1rmCache.clear(); // simple eviction
  _1rmCache.set(k, v);
  return v;
}


const TIER_NAMES  = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
const TIER_STARS  = ['★', '★★', '★★★', '★★★★', '★★★★★'];
const TIER_KEYS   = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];

// ── DSA: Binary search utilities ──
// bsLowerBound: find leftmost index where pred(arr[i]) is true — O(log n)
function bsLowerBound(arr, pred) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (pred(arr[mid])) hi = mid; else lo = mid + 1; }
  return lo < arr.length ? lo : arr.length - 1;
}
// bsearchTierLevel: rightmost index where thresholds[i] <= orm — O(log n)
// Replaces the O(n) for-loop tier scan (5 tiers, but now correct by design).
function bsearchTierLevel(thresholds, orm) {
  let lo = 0, hi = thresholds.length - 1, level = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (thresholds[mid] <= orm) { level = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return level;
}

// Strength label = compare estimated 1RM to standards tables (lift-specific, sex, BW or age from Profile).
// 1RM estimate: Epley formula weight_kg × (1 + reps/30), same as set rows and PRs.
// Threshold rows are normative strength standards (e.g. by bodyweight); tier is the highest band your e1RM meets.
// Returns { level:0-4, name, stars, key } or null
function getStrengthTier(exerciseName, orm1RM_kg) {
  if (!orm1RM_kg || orm1RM_kg <= 0) return null;
  var exKey = strengthTableKey(exerciseName);
  var basis = profStrengthBasis || 'bw';
  var useLbs = profUnit === 'lbs';

  if (basis === 'age') {
    if (!profAge || profAge <= 0) return null;
    var exAge = useLbs
      ? (typeof STRENGTH_STANDARDS_AGE_LBS !== 'undefined' ? STRENGTH_STANDARDS_AGE_LBS[exKey] : null)
      : (typeof STRENGTH_STANDARDS_AGE !== 'undefined' ? STRENGTH_STANDARDS_AGE[exKey] : null);
    if (!exAge) return null;
    var tableA = profGender === 'female' ? exAge.female : exAge.male;
    if (!tableA || !tableA.length) return null;
    var idxA = rowIdxLastLeq(tableA, profAge);
    var rowA = tableA[idxA];
    var ormDispA = useLbs ? Math.round(orm1RM_kg * KG_TO_LBS * 2) / 2 : orm1RM_kg;
    var levelA = bsearchTierLevel(rowA.slice(1), ormDispA);
    if (levelA < 0) return null;
    return { level: levelA, name: TIER_NAMES[levelA], stars: TIER_STARS[levelA], key: TIER_KEYS[levelA] };
  }

  if (!profBodyweight || profBodyweight <= 0) return null;

  if (useLbs) {
    var exLbs = STRENGTH_STANDARDS_LBS[exKey];
    if (!exLbs) return null;
    var tableL = profGender === 'female' ? exLbs.female : exLbs.male;
    var bwLbs = WorkoutCore.profileBwInUnit(profBodyweight, 'lbs');
    var orm1RM_lbs = Math.round(orm1RM_kg * KG_TO_LBS * 2) / 2;
    var rowL = tableL[rowIdxLastLeq(tableL, bwLbs)];
    if (!rowL) return null;
    var levelL = bsearchTierLevel(rowL.slice(1), orm1RM_lbs);
    if (levelL < 0) return null;
    return { level: levelL, name: TIER_NAMES[levelL], stars: TIER_STARS[levelL], key: TIER_KEYS[levelL] };
  }

  var ex = STRENGTH_STANDARDS[exKey];
  if (!ex) return null;
  var table = profGender === 'female' ? ex.female : ex.male;
  var row = table[rowIdxLastLeq(table, profBodyweight)];
  if (!row) return null;
  var level = bsearchTierLevel(row.slice(1), orm1RM_kg);
  if (level < 0) return null;
  return { level: level, name: TIER_NAMES[level], stars: TIER_STARS[level], key: TIER_KEYS[level] };
}
const WU_SUBLABEL_BASE='~10 min \u00B7 science-backed protocol';
const WU_ITEMS=7;
let exercises=JSON.parse(JSON.stringify(EXERCISES_TEMPLATE));

function freshSets(){return exercises.map(ex=>{const lw=ex.history[0]?.[1]??(ex.isBodyweight?0:60),lr=ex.history[0]?.[2]??5;return Array.from({length:3},()=>({type:'working',weight:lw,reps:lr,completed:false,note:'',completedAt:null,restTaken:null}));});}
let allSets=freshSets();
let wuItemDoneAt=new Array(WU_ITEMS).fill(null),wuLiveInterval=null,lastSetCompletedAt=null,liveRestInterval=null,wuStartedAt=null;
let exStartedAt=new Array(exercises.length).fill(null),exFinishedAt=new Array(exercises.length).fill(null);
let wuState=new Array(WU_ITEMS).fill(false);
let exOpen=Array.from({length:exercises.length},(_,i)=>i===0),editMode=new Array(exercises.length).fill(false);
let sectionTimerInterval=null,activeSectionType=null;

function startSectionTimer(type){stopSectionTimer();activeSectionType=type;sectionTimerInterval=setInterval(tickSectionTimer,1000);tickSectionTimer();}

function stopSectionTimer(){clearInterval(sectionTimerInterval);sectionTimerInterval=null;activeSectionType=null;}

function tickSectionTimer(){if (activeSectionType==='wu'){if (!wuStartedAt)return;const el=document.getElementById('wuSubLabel');if (!el)return;const secs=Math.round((Date.now()-wuStartedAt)/1000);el.innerHTML=WU_SUBLABEL_BASE+'<span style="font-family:DM Mono,monospace;color:var(--text3);">'+formatRest(secs)+'</span>';}}

function formatRest(secs){return secs>=60?Math.floor(secs/60)+'m'+String(secs%60).padStart(2,'0')+'s':secs+'s';}
let activeCounterKey=null;

function startLiveRestCounter(ei, i) {
  stopLiveRestCounter();
  if (ei < 0 || !allSets[ei] || !allSets[ei][i] || allSets[ei][i].completed) return;
  activeCounterKey = ei + '-' + i;
  liveRestInterval = setInterval(() => {
    const el = document.getElementById('live-rest-counter-' + activeCounterKey);
    if (!el) { stopLiveRestCounter(); return; }
    if (lastSetCompletedAt === null) return;
    el.textContent = 'rest ' + formatRest(Math.round((Date.now() - lastSetCompletedAt) / 1000));
  }, 1000);
}

function stopLiveRestCounter(){clearInterval(liveRestInterval);liveRestInterval=null;activeCounterKey=null;}

function stopWuLiveCounter(){clearInterval(wuLiveInterval);wuLiveInterval=null;}

function startWuLiveCounter(nextIdx, refTimeOverride) {
  stopWuLiveCounter();
  if (nextIdx >= wuState.length) return;
  const refTime = refTimeOverride !== undefined
    ? refTimeOverride
    : wuItemDoneAt.reduce((best, t) => (t && (!best || t > best)) ? t : best, null);
  if (refTime === null) return;
  const pill = document.getElementById('wu-pill-' + nextIdx);
  if (!pill) return;
  pill.style.display = '';
  pill.textContent = '0s';
  wuLiveInterval = setInterval(() => {
    const p = document.getElementById('wu-pill-' + nextIdx);
    if (!p) { stopWuLiveCounter(); return; }
    p.textContent = formatRest(Math.round((Date.now() - refTime) / 1000));
  }, 1000);
}

function isSectionUnlocked(ei) {
  if (ei === 0) return wuState.every(Boolean);
  const prevWorking = allSets[ei - 1].filter(function (s) { return s.type === 'working'; });
  if (!prevWorking.length) return false;
  return prevWorking.every(function (s) { return s.completed; });
}
const PLATE_CSS={45:'pc-45',35:'pc-35',25:'pc-25',20:'pc-20',15:'pc-15',10:'pc-10',5:'pc-5',2.5:'pc-2-5',1.25:'pc-1-25'};

function workWeightKg(ei,w){
  const ex=exercises[ei];
  if (!ex)return 0;
  const wf=parseFloat(w);
  if (ex.isBodyweight){
    const extra=Number.isFinite(wf)?wf:0;
    return profBodyweight>0?profBodyweight+extra:0;
  }
  return Number.isFinite(wf)&&wf>0?wf:0;
}
function setVolumeKg(ei,s){
  const r=parseFloat(s.reps);
  if (!Number.isFinite(r)||r<=0)return 0;
  const ww=workWeightKg(ei,s.weight);
  return ww>0?ww*r:0;
}

// ── DSA: Memoised getBest1RM — Map cache invalidated per-exercise on set change ──
// Without caching, every renderSets row calls getBest1RM which maps over full history.
// Now O(1) after first call per exercise; invalidated only when sets change.
const _best1RMCache = new Map(); // ei → best1RM or null

function invalidateBest1RM(ei) { _best1RMCache.delete(ei); }

function getBest1RM(ei) {
  if (_best1RMCache.has(ei)) return _best1RMCache.get(ei);
  const h = exercises[ei].history;
  if (!h.length) { _best1RMCache.set(ei, null); return null; }
  const vals = h.map(entry => {
    const ww = workWeightKg(ei, entry[1]);
    const rf = parseFloat(entry[2]);
    if (!ww || !Number.isFinite(rf) || rf <= 0) return null;
    return epley1RM(ww, rf);
  }).filter(v => v != null && Number.isFinite(v));
  const val = vals.length ? Math.max(...vals) : null;
  _best1RMCache.set(ei, val);
  return val;
}

/** Max 1RM (kg) from history + other completed working sets in this session, excluding set index `excludeIdx`. */
function getEffectivePriorBest1RM(ei, excludeIdx) {
  var best = null;
  var h = exercises[ei] && exercises[ei].history;
  if (h && h.length) {
    for (var j = 0; j < h.length; j++) {
      var ww = workWeightKg(ei, h[j][1]);
      var rf = parseFloat(h[j][2]);
      if (!ww || !Number.isFinite(rf) || rf <= 0) continue;
      var e = epley1RM(ww, rf);
      if (best == null || e > best) best = e;
    }
  }
  var sets = allSets[ei];
  if (!sets) return best;
  for (var i = 0; i < sets.length; i++) {
    if (i === excludeIdx) continue;
    var s = sets[i];
    if (!s.completed || s.type !== 'working') continue;
    var o = calc1RM(s.weight, s.reps, ei);
    if (o != null && Number.isFinite(o) && (best == null || o > best)) best = o;
  }
  return best;
}
const PCT_RPE=[[1,10],[.978,9.5],[.955,9],[.932,8.5],[.909,8],[.886,7.5],[.863,7],[.840,6.5],[.818,6],[.795,5.5],[.770,5]];

// DSA: Binary search on PCT_RPE table — O(log n) vs O(n) linear scan
// Table is sorted descending by pct. We find the interval [p1,p2] containing pct
// then interpolate. bsLowerBound finds first index where pct >= PCT_RPE[i][0].
function pctToRPE(pct) {
  if (pct >= 1) return 10;
  if (pct <= 0.770) return 5;
  // Find rightmost entry where entry[0] >= pct (table is descending)
  let lo = 0, hi = PCT_RPE.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (PCT_RPE[mid][0] >= pct) lo = mid; else hi = mid - 1;
  }
  const [p1, r1] = PCT_RPE[lo], [p2, r2] = PCT_RPE[lo + 1];
  return Math.round((r1 + (p1 - pct) / (p1 - p2) * (r2 - r1)) * 2) / 2;
}

function calcRPE(w,r,ei){const rf=parseFloat(r);if (!Number.isFinite(rf)||rf<=0)return null;const ww=workWeightKg(ei,w);if (!ww)return null;const b=getBest1RM(ei);if (!b)return null;return pctToRPE(epley1RM(ww,rf)/b);}

function calc1RM(w,r,ei){const rf=parseFloat(r);if (!Number.isFinite(rf)||rf<=0)return null;const ww=workWeightKg(ei,w);if (!ww)return null;return Math.round(epley1RM(ww,rf)*10)/10;}

function rpeClass(rpe){if (rpe===null)return 'rpe-none';return rpe>=9.5?'rpe-max':rpe>=8?'rpe-high':rpe>=6.5?'rpe-mid':'rpe-low';}

function rpeColor(rpe){if (!rpe)return 'var(--text3)';return rpe>=9.5?'#f87171':rpe>=8?'#fb923c':rpe>=6.5?'#fbbf24':'#4ade80';}
let timerInterval=null,timerRemaining=0,timerTotal=0;
const REST_TIME=120;
let startTime=null,durationInterval=null,workoutActive=false;

function toggleWorkout(){if (!workoutActive)startWorkout();else showConfirm();}

function startWorkout(){if (workoutActive)return;workoutActive=true;startTime=Date.now();const btn=document.getElementById('startStopBtn'),icon=document.getElementById('startStopIcon');btn.classList.add('active');icon.textContent='stop_circle';btn.setAttribute('aria-label','End workout');const badge=document.getElementById('elapsedBadge');badge.classList.add('visible');if (durationInterval){clearInterval(durationInterval);durationInterval=null;}durationInterval=setInterval(()=>{if (!workoutActive||!startTime)return;const s=Math.floor((Date.now()-startTime)/1000),m=Math.floor(s/60),ss=s%60;const txt=m+':'+String(ss).padStart(2,'0');document.getElementById('durationStat').textContent=txt;badge.textContent=txt;},1000);if (!wuStartedAt){wuStartedAt=startTime;startSectionTimer('wu');startWuLiveCounter(0,startTime);}}

function showConfirm() {
  let n = 0, vol = 0;
  exercises.forEach((_, ei) => {
    const d = allSets[ei].filter(s => s.completed && s.type === 'working');
    n += d.length;
    vol += d.reduce((sum, s) => sum + setVolumeKg(ei, s), 0);
  });
  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const mm = Math.floor(elapsed / 60), ss = elapsed % 60;
  const timeStr = startTime ? mm + 'm' + String(ss).padStart(2, '0') + 's · ' : '';
  document.getElementById('confirmSub').textContent = timeStr + n + ' sets · ' + dispVol(vol) + ' ' + dispU();
  document.getElementById('confirmOverlay').classList.add('show');
  trapFocus(document.getElementById('confirmDialog'));
}

function dismissConfirm(e){if (e&&e.target&&e.target!==document.getElementById('confirmOverlay'))return;document.getElementById('confirmOverlay').classList.remove('show');releaseFocus(document.getElementById('confirmDialog'),document.getElementById('startStopBtn'));}

function confirmFinish(){document.getElementById('confirmOverlay').classList.remove('show');finishWorkout();}

function confirmDiscard(){document.getElementById('confirmOverlay').classList.remove('show');discardWorkout();}

function discardWorkout(){workoutActive=false;clearInterval(durationInterval);durationInterval=null;stopTimer();stopLiveRestCounter();stopSectionTimer();stopWuLiveCounter();resetAllState();showToast('Session discarded');renderAll();window.scrollTo({top:0,behavior:'smooth'});}
let customTimerSecs=REST_TIME;

function _startCountdown(){timerInterval=setInterval(()=>{timerRemaining--;updateTimerUI();if (timerRemaining<=0){stopTimer();showToast('Rest complete - next set!');if (navigator.vibrate)navigator.vibrate([100,50,100]);}},1000);}

function startRestTimer(secs){stopTimer();timerRemaining=secs;timerTotal=secs;_activateTimer();updateTimerUI();_startCountdown();}

function toggleRestTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('navTop').classList.remove('timer-active');
    document.getElementById('timerPlayIcon').textContent = 'play_arrow';
    const pb = document.getElementById('timerPlayBtn');
    pb.classList.remove('active');
    pb.setAttribute('aria-pressed', 'false');
    pb.setAttribute('aria-label', 'Start rest timer');
    document.getElementById('timerPlusBtn').style.display = 'none';
    document.getElementById('timerSkipBtn').style.display = 'none';
  } else if (timerRemaining > 0) {
    _activateTimer();
    _startCountdown();
  } else {
    startRestTimer(customTimerSecs);
  }
}

function _activateTimer(){document.getElementById('navTop').classList.add('timer-active');
    const pb = document.getElementById('timerPlayBtn');
    pb.classList.add('active');
    pb.setAttribute('aria-pressed', 'true');
    pb.setAttribute('aria-label', 'Pause rest timer');
    document.getElementById('timerPlayIcon').textContent = 'pause';
    document.getElementById('timerPlusBtn').style.display = '';
    document.getElementById('timerSkipBtn').style.display = '';}

function stopTimer(){clearInterval(timerInterval);
    timerInterval = null;
    timerRemaining = 0;
    document.getElementById('navTop').classList.remove('timer-active');
    const pb = document.getElementById('timerPlayBtn');
    pb.classList.remove('active');
    pb.setAttribute('aria-pressed', 'false');
    pb.setAttribute('aria-label', 'Start rest timer');
    document.getElementById('timerPlayIcon').textContent = 'play_arrow';
    document.getElementById('timerPlusBtn').style.display = 'none';
    document.getElementById('timerSkipBtn').style.display = 'none';
    const d = document.getElementById('timerDisplay');if (d){d.textContent='--:--';d.className='nav-timer-display';}const bar=document.getElementById('timerBar');if (bar){bar.classList.add('no-transition');bar.style.width='0%';requestAnimationFrame(()=>bar.classList.remove('no-transition'));}}
// Announce timer every 30s and at final 10s countdown to screen readers
let _lastAnnounced=0;

function updateTimerUI(){const m = Math.floor(timerRemaining / 60), s = timerRemaining % 60;
    const d = document.getElementById('timerDisplay');if (d){d.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');d.className='nav-timer-display'+(timerRemaining<=10&&timerRemaining>0?' warn':'');}const bar=document.getElementById('timerBar');if (bar&&timerTotal>0)bar.style.width=(timerRemaining/timerTotal*100)+'%';const announce=document.getElementById('timerAnnounce');if (announce){const shouldAnnounce=(timerRemaining<=10&&timerRemaining!==_lastAnnounced)||(timerRemaining>0&&timerRemaining%30===0&&timerRemaining!==_lastAnnounced);if (shouldAnnounce){_lastAnnounced=timerRemaining;announce.textContent=timerRemaining<=0?'Rest complete':timerRemaining+' seconds remaining';}}}

function addRestTime(secs) {
  if (timerInterval) {
    timerRemaining += secs;
    if (timerRemaining > timerTotal) timerTotal = timerRemaining;
    updateTimerUI();
  } else if (timerRemaining > 0) {
    timerRemaining += secs;
    if (timerRemaining > timerTotal) timerTotal = timerRemaining;
    updateTimerUI();
    _activateTimer();
    _startCountdown();
  } else {
    startRestTimer(secs);
  }
}

function skipTimer(){stopTimer();showToast('Timer reset');}

function openCustomInput(){if (timerInterval||timerRemaining>0)return;const d=document.getElementById('timerDisplay'),inp=document.getElementById('timerCustomInput');if (!d||!inp)return;d.style.display='none';inp.style.display='block';inp.value='';inp.focus();}

function commitCustomInput(){const d=document.getElementById('timerDisplay'),inp=document.getElementById('timerCustomInput');if (!d||!inp)return;const raw=parseInt(inp.value,10);const val=Math.min(3600,Math.max(1,Number.isFinite(raw)?raw:0));inp.style.display='none';d.style.display='';if (val>0){customTimerSecs=val;profRestSecs=val;startRestTimer(val);}}

function cancelCustomInput(){const d=document.getElementById('timerDisplay'),inp=document.getElementById('timerCustomInput');if (!d||!inp)return;inp.style.display='none';d.style.display='';}
const GYM={
  barKg:20,      // kg bar weight
  barLbs:45,     // lbs bar weight (men's Olympic = 45 lbs)
// kg plate denominations
available: {

  25:true,20:true,15:true,10:true,5:true,2.5:true,1.25:true

},

// lbs plate denominations (native US system)
availableLbs: {

  45:true,35:true,25:true,10:true,5:true,2.5:true,1.25:true

}

};

/** Per-exercise bar weight (kg). Display uses gymBarForExercise(ei). */
var exerciseBarKgByEi = {};

// Helpers to get current unit's bar/plates

function gymBar() {

  return profUnit==='lbs'?GYM.barLbs:GYM.barKg;

}

function gymBarForExercise(ei) {
  if (ei !== undefined && exerciseBarKgByEi[ei] != null && Number.isFinite(exerciseBarKgByEi[ei])) {
    var bk = exerciseBarKgByEi[ei];
    return profUnit === 'lbs' ? Math.round(bk * KG_TO_LBS * 2) / 2 : bk;
  }
  return gymBar();
}

function gymPlates() {

  return profUnit==='lbs'?[45,35,25,10,5,2.5,1.25]:([25,20,15,10,5,2.5,1.25]);

}

function gymAvail() {

  return profUnit==='lbs'?GYM.availableLbs:GYM.available;

}

function calcPlates(totalKg, ei) {

// Convert to display unit for plate calculation
var totalDisplay = profUnit==='lbs'? Math.round(dispW(totalKg)*2)/2 : totalKg;
var bar = gymBarForExercise(ei);
if (totalDisplay < bar) return {

  error:true, bar:bar

};

var per = (totalDisplay - bar) / 2;
var denoms = gymPlates().filter(function(d) {

  return gymAvail()[d];

});
var rem = per;
var result = [];
for (var i=0;i<denoms.length;i++) {

  var d=denoms[i];
  var cnt = Math.floor(rem/d + 0.001);
  if (cnt>0) {

    result.push({

      d:d,c:cnt

    });
    rem-=cnt*d;
    rem=+rem.toFixed(3);

  }

}

return {

  result:result, rem:rem, bar:bar, per:per, inexact:Math.abs(rem)>0.01

};

}

function buildBarbellSVG(plates,gradId) {

  const W=340,H=110,cy=H/2,shaftThick=8,sleeveThick=14,sleeveLen=190,collarW=10;
  const collarThick=sleeveThick+12,shaftEndX=W-sleeveLen-collarW;// Maps support both kg (25,20,15...) and lbs (45,35...) plates
const phMap= {

  45:90,35:80,25:86,20:76,15:66,10:56,5:44,2.5:32,1.25:22

};

const pwMap= {

  45:18,35:15,25:15,20:13,15:12,10:10,5:8,2.5:6,1.25:4

};

const fillMap= {

  45:'#8b0000',35:'#1a3a8a',25:'#cc0022',20:'#1a56c4',15:'#c8940a',10:'#1a7a1a',5:'#d4d4d4',2.5:'#1a1a1a',1.25:'#888'

};
const strokeMap= {

  45:'#cc2222',35:'#4a6abf',25:'#ff4466',20:'#60a5fa',15:'#fcd34d',10:'#4ade80',5:'#aaa',2.5:'#555',1.25:'#bbb'

};
const labelMap= {

  45:'45',35:'35',25:'25',20:'20',15:'15',10:'10',5:'5',2.5:'2.5',1.25:'1.25'

};
const flat=[];
(plates||[]).forEach(p=> {

  for (let i=0;i<p.c;i++)flat.push(p.d);

});
let px=shaftEndX;
const plateDefs=flat.map(kg=> {

  const w=pwMap[kg]||6,x=px;px+=w+1.5;return {

    kg,x,w

  };

});
let s='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">';
s+='<defs><linearGradient id="'+gradId+'" x1="0" x2="1"><stop offset="0%" stop-color="#0e0f13"/><stop offset="100%" stop-color="transparent"/></linearGradient></defs>';
s+='<rect x="0" y="'+(cy-shaftThick/2)+'" width="'+(shaftEndX+sleeveThick)+'" height="'+shaftThick+'" rx="3" fill="#5a6070"/>';
for (let kx=10;kx<shaftEndX-10;kx+=8)s+='<line x1="'+kx+'" y1="'+(cy-shaftThick/2+1.5)+'" x2="'+kx+'" y2="'+(cy+shaftThick/2-1.5)+'" stroke="#3a404e" stroke-width="1.5"/>';
s+='<rect x="0" y="'+(cy-shaftThick/2)+'" width="24" height="'+shaftThick+'" rx="3" fill="url(#'+gradId+')"/>';
s+='<rect x="'+shaftEndX+'" y="'+(cy-sleeveThick/2)+'" width="'+sleeveLen+'" height="'+sleeveThick+'" rx="3" fill="#7a8494"/>';
plateDefs.forEach(({

  kg,x,w

})=> {

  const h=phMap[kg]||24,y=cy-h/2;s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2" fill="'+(fillMap[kg]||'#555')+'" stroke="'+(strokeMap[kg]||'#777')+'" stroke-width="1.5"/>';
s+='<rect x="'+(x+1.5)+'" y="'+(cy-2.5)+'" width="'+(w-3)+'" height="5" rx="1.5" fill="rgba(0,0,0,0.4)"/>';
if (w>=10)s+='<text x="'+(x+w/2)+'" y="'+(cy-h/2+10)+'" text-anchor="middle" font-size="7" font-weight="700" fill="rgba(255,255,255,0.7)" font-family="monospace">'+(labelMap[kg])+'</text>';

});
s+='<rect x="'+(W-collarW)+'" y="'+(cy-collarThick/2)+'" width="'+collarW+'" height="'+collarThick+'" rx="3" fill="#c8d0dc" stroke="#9aa0ac" stroke-width="1"/>';
s+='<line x1="'+(W-collarW+3)+'" y1="'+(cy-collarThick/2+4)+'" x2="'+(W-collarW+3)+'" y2="'+(cy+collarThick/2-4)+'" stroke="#9aa0ac" stroke-width="1.5"/>';
s+='</svg>';
return s;

}

function refreshSetPlateViz(ei,si) {

  const body=document.getElementById('spviz-body-'+ei+'-'+si);
if (!body||!body.classList.contains('open'))return;
const set=allSets[ei][si];
const w=parseFloat(set?.weight)||0,r=parseFloat(set?.reps)||0;
const best1RM=getBest1RM(ei);
const cur1RM=w&&r?Math.round(epley1RM(w,r)):null;
const pct=best1RM&&cur1RM?Math.round(cur1RM/best1RM*100):null;
const {

  result,bar,error,inexact

}
=calcPlates(w, ei);
const isBarbell=exercises[ei].isBarbell;
const lbl=document.getElementById('spviz-label-'+ei+'-'+si);
if (lbl)lbl.textContent=w?dispW(w)+' '+dispU()+' (±'+gymBarForExercise(ei)+' '+dispU()+' bar)':'';
const barbDiv=document.getElementById('spviz-bar-'+ei+'-'+si);
if (barbDiv) {

  if (!isBarbell)barbDiv.innerHTML='<div style="text-align:center;padding:14px 0;color:var(--text3);font-size:11px;">Plate calculator is for barbell exercises only</div>';
else if (!w)barbDiv.innerHTML='<div style="text-align:center;padding:14px 0;color:var(--text3);font-size:11px;">Enter weight above to see plate setup</div>';
else if (error)barbDiv.innerHTML='<div style="text-align:center;padding:14px 0;color:var(--warn);font-size:11px;">Weight below '+gymBarForExercise(ei)+' '+dispU()+' bar</div>';
else barbDiv.innerHTML=buildBarbellSVG(result||[],'bgrad-'+ei+'-'+si);

}
const sumDiv=document.getElementById('spviz-sum-'+ei+'-'+si);
if (sumDiv) {

  if (!isBarbell||!w||error) {

    sumDiv.innerHTML='';

}else {

  let h='<div style="font-size:11px;color:var(--text3);font-weight:500;align-self:center;margin-right:4px;white-space:nowrap;">Per side:</div>';
if (!(result||[]).length)h+='<span style="font-size:11px;color:var(--text2);">Just the bar</span>';
else(result||[]).forEach(p=> {

  const cls=PLATE_CSS[p.d]||'pc-2-5';
h+='<div class="plate-chip"><div class="plate-circle '+cls+'">'+p.d+'</div><div class="plate-chip-label">x'+p.c+'</div></div>';

});
if (inexact)h+='<span style="font-size:11px;color:var(--warn);align-self:center;margin-left:4px;">inexact</span>';
sumDiv.innerHTML=h;

}

}
const barSel=document.getElementById('spviz-bar-sel-'+ei+'-'+si);
if (barSel) {

  if (!isBarbell) {

    barSel.innerHTML='';

}else barSel.innerHTML=(profUnit==='lbs'?[33,45]:[10,15,20]).map(b=>'<div onclick="setBarWeightS('+b+','+ei+','+si+')" style="padding:4px 10px;border-radius:7px;cursor:pointer;font-size:11px;font-weight:500;font-family:DM Mono,monospace;transition:all .15s;background:'+(gymBarForExercise(ei)===b?'var(--accent)':'var(--surface3)')+';color:'+(gymBarForExercise(ei)===b?'#000':'var(--text2)')+';border:1px solid '+(gymBarForExercise(ei)===b?'transparent':'var(--border)')+';">'+b+' '+dispU()+'</div>').join('');

}
const ptDiv=document.getElementById('spviz-plate-toggles-'+ei+'-'+si);
if (ptDiv) {

  if (!isBarbell) {

    ptDiv.innerHTML='';

}else {

  const clsMap= {

    25:'pc-25',20:'pc-20',15:'pc-15',10:'pc-10',5:'pc-5',2.5:'pc-2-5',1.25:'pc-1-25'

};
ptDiv.innerHTML=gymPlates().map(kg=> {

  const on=gymAvail()[kg];return'<div onclick="togglePlateS('+kg+','+ei+','+si+')" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;opacity:'+(on?1:0.3)+';transition:opacity .15s;"><div class="plate-circle '+(clsMap[kg]||'pc-2-5')+'" style="width:28px;height:28px;font-size:11px;">'+kg+'</div><div style="font-size:11px;color:'+(on?'var(--accent)':'var(--text3)')+';font-weight:500;">'+(on?'on':'off')+'</div></div>';

}).join('');

}

}
const ormDiv=document.getElementById('spviz-orm-'+ei+'-'+si);
if (ormDiv)ormDiv.innerHTML=best1RM?'<div class="orm-chip"><div class="orm-label">Best 1RM</div><div class="orm-val">'+Math.round(dispW(best1RM))+' '+dispU()+'</div></div><div class="orm-chip"><div class="orm-label">Est. 1RM</div><div class="orm-val">'+(cur1RM?Math.round(dispW(cur1RM))+' '+dispU():'-')+'</div></div><div class="orm-chip"><div class="orm-label">% of 1RM</div><div class="orm-val">'+(pct?pct+'%':'-')+'</div></div>':'';

}

function toggleSetPlateViz(ei,si) {

  const body=document.getElementById('spviz-body-'+ei+'-'+si),chev=document.getElementById('spviz-chev-'+ei+'-'+si);
if (!body)return;
body.classList.toggle('open');
chev.textContent=body.classList.contains('open')?'expand_less':'expand_more';
if (body.classList.contains('open'))refreshSetPlateViz(ei,si);

}

function setBarWeightS(val,ei,si) {

  exerciseBarKgByEi[ei] = profUnit === 'lbs' ? val / KG_TO_LBS : val;
allSets[ei].forEach(function(_,i) {

  refreshSetPlateViz(ei,i);

});

}

function togglePlateS(kg,ei,si) {

  var avail=gymAvail();
  avail[kg]=!avail[kg];
  allSets[ei].forEach(function(_,i) {

    refreshSetPlateViz(ei,i);

  });

}

function toggleEditMode(ei) {

  editMode[ei]=!editMode[ei];
  if (editMode[ei])allSets[ei].forEach((s,i)=> {

    s._origIdx=i;

  });
  else allSets[ei].forEach(s=> {

    delete s._origIdx;

  });
  renderSets(ei);

}

function moveSetUp(ei,idx) {

  if (idx===0)return;
  const s=allSets[ei];
  [s[idx-1],s[idx]]=[s[idx],s[idx-1]];
  renderSets(ei);

}

function moveSetDown(ei,idx) {

  const s=allSets[ei];
  if (idx>=s.length-1)return;
  [s[idx],s[idx+1]]=[s[idx+1],s[idx]];
  renderSets(ei);

}

function deleteSet(ei,idx) {

  const cur = allSets[ei][idx];
  const remainingWorking = allSets[ei].filter(function (s, i) {
    return i !== idx && s.type === 'working';
  });
  if (cur && cur.type === 'working' && remainingWorking.length === 0) {
    showToast('Keep at least one working set');
    return;
  }
  allSets[ei].splice(idx,1);
  renderSets(ei);
  refreshExerciseHeaderSummary(ei);
  markStatsDirty();

}

let dragSrc=null;

// Tier for an exercise once every working set is logged (session best e1RM vs standards).
function tierForFullyLoggedExercise(ei) {
  var working = allSets[ei].filter(function (s) { return s.type === 'working'; });
  if (!working.length) return null;
  if (!working.every(function (s) { return s.completed; })) return null;
  var ormVals = working.filter(function (s) {
    return Number.isFinite(parseFloat(s.reps)) && parseFloat(s.reps) > 0 && workWeightKg(ei, s.weight) > 0;
  }).map(function (s) { return calc1RM(s.weight, s.reps, ei); }).filter(function (v) { return v != null && Number.isFinite(v); });
  var bestOrm = ormVals.length ? Math.max.apply(null, ormVals) : 0;
  return bestOrm > 0 ? getStrengthTier(exercises[ei].name, bestOrm) : null;
}

var TIER_MIX_ABBREV = ['Beg', 'Nov', 'Int', 'Adv', 'Elt'];

function refreshExerciseHeaderSummary(ei) {
  var meta = document.getElementById('ex-meta-' + ei);
  var tierSlot = document.getElementById('ex-header-tier-' + ei);
  if (!meta) return;
  var staticPart = meta.getAttribute('data-static') || '';
  var working = allSets[ei].filter(function (s) { return s.type === 'working'; });
  var done = working.filter(function (s) { return s.completed; });
  var base = done.length + '/' + working.length + ' sets · ' + staticPart;
  var allDone = working.length > 0 && done.length === working.length;
  var tierExplain = 'Tier from your best working set: estimated 1RM (Epley) compared to strength standards for your profile (sex, body weight, lift).';

  if (allDone && exStartedAt[ei] !== null && exFinishedAt[ei] !== null) {
    var elapsed = Math.round((exFinishedAt[ei] - exStartedAt[ei]) / 1000);
    meta.innerHTML = base + ' <span class="ex-meta-duration">' + formatRest(elapsed) + '</span>';
    var tier = tierForFullyLoggedExercise(ei);
    if (tierSlot) {
      tierSlot.innerHTML = tier
        ? '<span class="tier-badge tier-' + tier.key + ' tier-badge--ex-header" title="' + escapeHtml(tierExplain) + '">' + escapeHtml(tier.name) + '</span>'
        : '';
    }
  } else {
    meta.textContent = base;
    if (tierSlot) tierSlot.innerHTML = '';
  }
}

function renderAll() {
  // ── DSA: DocumentFragment — build all blocks off-screen, one DOM insertion ──
  const list=document.getElementById('exercisesList');
  const frag=document.createDocumentFragment();
  exercises.forEach((ex,ei)=> {
    const sets=allSets[ei],working=sets.filter(s=>s.type==='working'),done=working.filter(s=>s.completed);
    const allDone=working.length>0&&done.length===working.length,isOpen=exOpen[ei];
    const block=document.createElement('div');
    block.className='ex-block'+(allDone?' done-ex':isOpen?' active-ex':'');
    block.id='ex-block-'+ei;
    const bCls=allDone?'ex-sets-badge done-badge':'ex-sets-badge';
    const nCls=allDone?'ex-num done-num':isOpen?'ex-num active-num':'ex-num';
    const lastWeight=ex.history[0]?.[1]??null,lastReps=ex.history[0]?.[2]??'-';
    const staticMeta='last: '+(lastWeight!=null?dispW(lastWeight)+' '+dispU():'--')+' × '+lastReps,baseMeta=done.length+'/'+working.length+' sets · '+staticMeta;
    block.innerHTML='<div class="ex-header" role="button" tabindex="0" aria-expanded="'+(isOpen?'true':'false')+'" onclick="toggleEx('+ei+')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toggleEx('+ei+');}">'+'<div class="ex-header-left"><div class="'+nCls+'">'+(ei+1)+'</div><div class="ex-header-text"><div class="ex-name">'+escapeHtml(ex.name)+'</div><div class="ex-meta" id="ex-meta-'+ei+'" data-static="'+escapeHtml(staticMeta)+'">'+escapeHtml(baseMeta)+'</div><div class="ex-header-tier" id="ex-header-tier-'+ei+'"></div></div></div>'+'<div class="ex-header-right"><span class="'+bCls+'">'+done.length+'/'+working.length+'</span><span class="material-symbols-outlined ex-chevron'+(isOpen?' open':'')+'">expand_more</span></div></div>'+'<div class="ex-body'+(isOpen?' open':'')+'" id="ex-body-'+ei+'">'+'<div class="panel" id="panel-'+ei+'">'+'<div class="panel-head"><div class="col-hd">#</div><div class="col-hd center">'+(dispU())+'</div><div class="col-hd center">Reps</div><div class="col-hd center" style="flex-direction:column;gap:2px;line-height:1.1;"><span style="display:flex;align-items:center;gap:3px;font-size:11px;">RPE <span style="background:var(--accent-dim);color:var(--accent);padding:1px 4px;border-radius:3px;font-size:10px;font-weight:500;">AI</span></span><span style="font-size:11px;color:var(--text3);font-weight:500;letter-spacing:.02em;margin-top:1px;">Lvl / 1RM</span></div><div class="col-hd"></div></div>'+'<div id="set-rows-'+ei+'"></div>'+'<div class="edit-toolbar"><div style="display:flex;align-items:center;gap:6px;"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent);">tune</span><span class="edit-hint">Drag to reorder - tap minus to remove</span></div><div class="edit-done-btn" onclick="toggleEditMode('+ei+')">Done</div></div>'+'<div class="panel-footer"><button class="footer-btn" id="edit-btn-'+ei+'" onclick="toggleEditMode('+ei+')"><span class="material-symbols-outlined">tune</span>Manage Sets</button><button class="footer-btn" onclick="addSet('+ei+',\'warmup\')"><span class="material-symbols-outlined">whatshot</span>Warm-up</button><button class="footer-btn" onclick="addSet('+ei+',\'working\')"><span class="material-symbols-outlined">add</span>Set</button></div></div><div style="height:10px"></div></div>';
    frag.appendChild(block);
  });
  list.innerHTML='';        // single clear
  list.appendChild(frag);  // single insertion — 1 reflow vs n
  exercises.forEach(function (_, ei) { refreshExerciseHeaderSummary(ei); });
  exercises.forEach((_,ei)=>renderSets(ei));
  markStatsDirty();
}

function toggleEx(ei) {

  exOpen[ei]=!exOpen[ei];
  const body=document.getElementById('ex-body-'+ei),block=document.getElementById('ex-block-'+ei);
if (body)body.classList.toggle('open',exOpen[ei]);
if (block) {

  const hdr=block.querySelector('.ex-header');
  if (hdr) hdr.setAttribute('aria-expanded', exOpen[ei] ? 'true' : 'false');
  const chev=block.querySelector('.ex-chevron');
if (chev)chev.classList.toggle('open',exOpen[ei]);
const working=allSets[ei].filter(s=>s.type==='working'),done=working.filter(s=>s.completed),allDone=working.length>0&&done.length===working.length;
block.className='ex-block'+(allDone?' done-ex':exOpen[ei]?' active-ex':'');
block.querySelectorAll('.ex-num').forEach(n=>n.className=allDone?'ex-num done-num':exOpen[ei]?'ex-num active-num':'ex-num');

}

}

function openNextSection(completedEi) {

  if (completedEi+1>=exercises.length)setTimeout(()=>showConfirm(),300);

}

// ── Strength tier cell HTML helper ──
// Three-line cell: RPE badge (top) · 1RM weight (middle) · tier abbreviation (bottom)
// Kept as a named function to avoid quoting conflicts in template string concatenation.
const TIER_ABBREV = ['BEG','NOV','INT','ADV','ELT'];

function tierCell(exName, orm, ei, idx) {
  // Tier (bottom line)
  var tier = getStrengthTier(exName, orm);
  var tierCls  = tier ? 'tier-' + tier.key : 'tier-none';
  var tierLbl  = tier ? TIER_ABBREV[tier.level] : '-';

  // RPE (top line) — need rpe from current set state
  var set = allSets[ei] && allSets[ei][idx];
  var rf = set && parseFloat(set.reps);
  var canRpe = set && Number.isFinite(rf) && rf > 0 && workWeightKg(ei, set.weight) > 0;
  var rpe = canRpe ? calcRPE(set.weight, set.reps, ei) : null;
  var rpeCls = rpeClass(rpe);
  var rpeLbl = rpe !== null ? rpe : '-';

  // 1RM (middle line)
  var ormTxt = (orm !== null && orm !== undefined)
    ? Math.round(dispW(orm)) + ' ' + dispU()
    : '-';
  var ormCls = (orm === null || orm === undefined) ? 'orm-mini empty' : 'orm-mini';

  return '<div class="rpe-1rm-cell">'
    + '<div class="rpe-badge ' + rpeCls + '" id="rpe-badge-' + ei + '-' + idx + '">' + rpeLbl + '</div>'
    + '<div class="' + ormCls + '" id="orm-mini-' + ei + '-' + idx + '">' + ormTxt + '</div>'
    + '<div class="tier-badge ' + tierCls + '" data-tier-key="' + (tier ? tier.key : 'none') + '" id="tier-badge-' + ei + '-' + idx + '">' + tierLbl + '</div>'
    + '</div>';
}

function renderSets(ei) {
  const container=document.getElementById('set-rows-'+ei);
  if (!container)return;
  // ── DSA: DocumentFragment — batch all set rows, single DOM insertion ──
  const frag=document.createDocumentFragment();
  const sets=allSets[ei],nextUndone=sets.findIndex(s=>!s.completed),hist=exercises[ei].history.slice(0,10),em=editMode[ei];
  const panelEl=document.getElementById('panel-'+ei);
  if (panelEl)panelEl.classList.toggle('edit-mode',em);
  const eb=document.getElementById('edit-btn-'+ei);
  if (eb)eb.classList.toggle('active-edit',em);
  sets.forEach((set,i)=> {
    const isWarmup=set.type==='warmup',done=set.completed,isActive=!done&&i===nextUndone;
    const numCls=done?'set-num done-n':isWarmup?'set-num warmup-n':isActive?'set-num active-n':'set-num';
    const rpe=calcRPE(set.weight,set.reps,ei),orm=calc1RM(set.weight,set.reps,ei);
    const row=document.createElement('div');
    row.className='set-row'+(done?' completed':'');
    row.draggable=em;
    row.dataset.idx=i;
    if (em) {
      const origNum=set._origIdx!==undefined?(isWarmup?'W':set._origIdx+1):(isWarmup?'W':i+1);
      const typeTag=isWarmup?'<span style="font-size:11px;font-weight:500;padding:1px 5px;border-radius:4px;background:rgba(249,115,22,.12);color:var(--warn);letter-spacing:.03em;">WARM-UP</span>':done?'<span style="font-size:11px;font-weight:500;padding:1px 5px;border-radius:4px;background:var(--done-dim);color:var(--done);letter-spacing:.03em;">DONE</span>':'';
      row.innerHTML='<div style="display:flex;align-items:center;padding:10px 14px;gap:10px;"><div style="cursor:grab;color:var(--text3);display:flex;align-items:center;flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:18px;">drag_indicator</span></div><div style="display:flex;align-items:center;justify-content:center;width:20px;flex-shrink:0;"><span style="font-size:12px;font-weight:500;color:var(--text3);font-family:DM Mono,monospace;">'+origNum+'</span></div><div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;"><span style="font-size:13px;font-weight:500;color:var(--text);font-family:DM Mono,monospace;">'+(set.weight!==''&&set.weight!==null?dispW(set.weight):'-')+' '+dispU()+' × '+(set.reps||'-')+'</span>'+typeTag+'</div><div style="display:flex;align-items:center;gap:4px;flex-shrink:0;"><button onclick="moveSetUp('+ei+','+i+')" style="width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:var(--surface3);color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:14px;">arrow_upward</span></button><button onclick="moveSetDown('+ei+','+i+')" style="width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:var(--surface3);color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:14px;">arrow_downward</span></button><button onclick="deleteSet('+ei+','+i+')" style="width:28px;height:28px;border-radius:7px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:#f87171;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-left:2px;"><span class="material-symbols-outlined" style="font-size:14px;">remove</span></button></div></div>';
    }else {
      const histHTML=hist.map(h=> {
        const hR=calcRPE(h[1],h[2],ei),h1RM=calc1RM(h[1],h[2],ei);
        return'<div class="hist-row"><span class="hist-date">'+h[0]+'</span><div class="hist-dot" style="background:'+rpeColor(hR)+'"></div><span class="hist-val">'+dispW(h[1])+' '+dispU()+' × '+h[2]+'</span><span class="hist-rpe">RPE '+(hR!==null?hR:'-')+'</span><span class="hist-1rm">~'+(h1RM?Math.round(dispW(h1RM))+' '+dispU():'-')+'</span>'+(h[3]?'<span class="hist-badge pr">PR</span>':'')+'</div>';
      }).join('');
      const restPill=done&&set.restTaken!==null?'<span style="margin-left:auto;font-family:DM Mono,monospace;font-size:11px;font-weight:500;color:var(--text3);">'+formatRest(set.restTaken)+' rest</span>':'';
      const livePill=!done&&isActive&&lastSetCompletedAt!==null?'<span id="live-rest-counter-'+ei+'-'+i+'" style="margin-left:auto;font-family:DM Mono,monospace;font-size:11px;font-weight:500;color:var(--text3);">rest '+formatRest(Math.round((Date.now()-lastSetCompletedAt)/1000))+'</span>':'';
      const histBlock=hist.length?'<div class="history-toggle" role="button" tabindex="0" aria-expanded="false" onclick="toggleHistory(\''+ei+'-'+i+'\',this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toggleHistory(\''+ei+'-'+i+'\',this);}"><span class="material-symbols-outlined hist-chevron" id="hc-'+ei+'-'+i+'">expand_more</span><span class="history-toggle-label">Last '+hist.length+' sessions</span>'+restPill+livePill+'</div><div class="history-rows" id="hr-'+ei+'-'+i+'">'+histHTML+'</div>':(restPill||livePill)?'<div style="display:flex;padding:6px 16px 8px;border-top:1px solid var(--border);">'+restPill+livePill+'</div>':'';
      const unlocked=isSectionUnlocked(ei);
      const onclick=unlocked||done?'completeSet('+ei+','+i+')':'showToast(\'Complete previous section first\')';
      const style=!unlocked&&!done?'opacity:0.25;cursor:not-allowed;':'';
      row.innerHTML='<div class="set-main"><div class="set-num-wrap"><div class="drag-handle"><span class="material-symbols-outlined">drag_indicator</span></div><div class="'+numCls+'">'+(isWarmup?'W':i+1)+'</div></div><div class="input-col"><div class="vstep-arrows"><button class="vstep" onclick="stepSet('+ei+','+i+',\'weight\',weightStep())"><span class="material-symbols-outlined">expand_less</span></button><button class="vstep" onclick="stepSet('+ei+','+i+',\'weight\',-weightStep())"><span class="material-symbols-outlined">expand_more</span></button></div><div class="vstep-val"><input class="set-input" id="inp-w-'+ei+'-'+i+'" type="number" step="0.5" inputmode="decimal" value="'+(set.weight!==''&&set.weight!==null?dispW(set.weight):'')+'" placeholder="-" oninput="liveUpdate('+ei+','+i+',\'weight\',this.value)"><div class="input-unit">'+dispU()+'</div></div></div><div class="input-col"><div class="vstep-arrows"><button class="vstep" onclick="stepSet('+ei+','+i+',\'reps\',1)"><span class="material-symbols-outlined">expand_less</span></button><button class="vstep" onclick="stepSet('+ei+','+i+',\'reps\',-1)"><span class="material-symbols-outlined">expand_more</span></button></div><div class="vstep-val"><input class="set-input" id="inp-r-'+ei+'-'+i+'" type="number" step="1" inputmode="numeric" value="'+(set.reps||'')+'" placeholder="-" oninput="liveUpdate('+ei+','+i+',\'reps\',this.value)"><div class="input-unit">reps</div></div></div>'+tierCell(exercises[ei].name,orm,ei,i)+'<button class="check-btn '+(done?'completed':'')+'" onclick="'+onclick+'" style="'+style+'"><span class="material-symbols-outlined">'+(done?'check_circle':'radio_button_unchecked')+'</span></button></div>'+histBlock+'<div class="set-plate-viz" id="spviz-'+ei+'-'+i+'"><div class="set-plate-head" role="button" tabindex="0" aria-expanded="false" onclick="toggleSetPlateViz('+ei+','+i+')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toggleSetPlateViz('+ei+','+i+');}"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent);">fitness_center</span><span style="font-size:11px;font-weight:500;color:var(--text2);">Plate Calculator</span><span style="font-size:11px;color:var(--text3);margin-left:auto;font-family:DM Mono,monospace;" id="spviz-label-'+ei+'-'+i+'">'+(set.weight?dispW(set.weight)+' '+dispU():'')+'</span><span class="material-symbols-outlined" style="font-size:14px;color:var(--text3);" id="spviz-chev-'+ei+'-'+i+'">expand_more</span></div><div class="set-plate-body" id="spviz-body-'+ei+'-'+i+'"><div class="barbell-wrap" id="spviz-bar-'+ei+'-'+i+'"></div><div class="plate-summary" id="spviz-sum-'+ei+'-'+i+'" style="margin:6px 0 2px;"></div><div style="margin:8px 0 4px;"><div style="font-size:11px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px;">Bar weight</div><div style="display:flex;gap:5px;" id="spviz-bar-sel-'+ei+'-'+i+'"></div></div><div style="margin:8px 0 4px;"><div style="font-size:11px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px;">Available plates</div><div style="display:flex;gap:8px;flex-wrap:wrap;" id="spviz-plate-toggles-'+ei+'-'+i+'"></div></div><div class="orm-row" id="spviz-orm-'+ei+'-'+i+'"></div></div></div><div class="note-row" id="note-'+ei+'-'+i+'"><textarea class="note-input" id="note-inp-'+ei+'-'+i+'" rows="2" maxlength="'+SET_NOTE_MAX_CHARS+'" autocomplete="off" spellcheck="true" placeholder="Note — Shift+Enter new line, Enter saves"></textarea></div>';
      const noteInp=row.querySelector('#note-inp-'+ei+'-'+i);
      if (noteInp) {
        var noteSan = sanitizeSetNote(set.note || '');
        noteInp.value = noteSan;
        if (allSets[ei][i].note !== noteSan) allSets[ei][i].note = noteSan;
        noteInp.addEventListener('input', function () {
          liveUpdate(ei, i, 'note', noteInp.value);
        });
        noteInp.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' && !ev.shiftKey) {
            ev.preventDefault();
            liveUpdate(ei, i, 'note', noteInp.value);
            noteInp.blur();
            showToast('Note saved');
          }
        });
        noteInp.addEventListener('blur', function () {
          liveUpdate(ei, i, 'note', noteInp.value);
        });
      }
    }
    row.addEventListener('dragstart',e=> {
      if (!em){e.preventDefault();return;}
      dragSrc={ei,idx:i};
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
    });
    row.addEventListener('dragend',()=>{row.classList.remove('dragging');dragSrc=null;});
    row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('drag-over');});
    row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));
    row.addEventListener('drop',e=>{
      e.preventDefault();row.classList.remove('drag-over');
      if (!dragSrc||dragSrc.ei!==ei||dragSrc.idx===i)return;
      const s=allSets[ei],from=dragSrc.idx,to=i;
      const[moved]=s.splice(from,1);s.splice(to,0,moved);
      dragSrc=null;renderSets(ei);
    });
    frag.appendChild(row);
  });
  container.innerHTML='';     // single clear
  container.appendChild(frag); // single insertion
  allSets[ei].forEach((_,i)=>refreshSetPlateViz(ei,i));
}

function liveUpdate(ei,idx,field,val) {

  if (field==='reps') {

  const parsed=parseInt(val,10);
  allSets[ei][idx][field]=isNaN(parsed)?'':Math.max(1,parsed);
const inputEl=document.getElementById('inp-r-'+ei+'-'+idx);
if (inputEl&&allSets[ei][idx][field]!=='')inputEl.value=allSets[ei][idx][field];

}else if (field==='weight') {

  const p=parseFloat(val);
  allSets[ei][idx][field]=isNaN(p)?'':storeW(Math.max(0,p));

}else if (field === 'note') {

  const sanitized = sanitizeSetNote(val);
  allSets[ei][idx].note = sanitized;
  const noteEl = document.getElementById('note-inp-' + ei + '-' + idx);
  if (noteEl && noteEl.value !== sanitized) noteEl.value = sanitized;

}else allSets[ei][idx][field]=val;
if (field==='weight'||field==='reps') {

  const rpe=calcRPE(allSets[ei][idx].weight,allSets[ei][idx].reps,ei),orm=calc1RM(allSets[ei][idx].weight,allSets[ei][idx].reps,ei);
  const rb=document.getElementById('rpe-badge-'+ei+'-'+idx);
  const tb=document.getElementById('tier-badge-'+ei+'-'+idx);
  const ob=document.getElementById('orm-mini-'+ei+'-'+idx);
if (rb) { rb.className='rpe-badge '+rpeClass(rpe); rb.textContent=rpe!==null?rpe:'-'; }
if (tb) {
  const tier=getStrengthTier(exercises[ei].name,orm);
  const prevKey=tb.dataset.tierKey||'none';
  const newKey=tier?tier.key:'none';
  tb.className='tier-badge tier-'+newKey+(prevKey!==newKey?' tier-changed':'');
  tb.textContent=tier?TIER_ABBREV[tier.level]:'-';
  tb.dataset.tierKey=newKey;
  if(prevKey!==newKey) setTimeout(()=>tb.classList.remove('tier-changed'),300);
}
if (ob) {
  ob.className='orm-mini'+(orm===null?' empty':'');
  ob.textContent=orm!==null?Math.round(dispW(orm))+' '+dispU():'-';
}
markStatsDirty();
refreshSetPlateViz(ei,idx);
const block=document.getElementById('ex-block-'+ei);
if (block) {

  const w=allSets[ei].filter(s=>s.type==='working'),d=w.filter(s=>s.completed);
block.querySelectorAll('.ex-sets-badge').forEach(b=>b.textContent=d.length+'/'+w.length);

}

}

}

function stepSet(ei,idx,field,delta) {

  var rawCur = parseFloat(allSets[ei][idx][field]) || 0;
  var cur = (field ==='weight') ? dispW(rawCur) : rawCur;
let next = cur + delta;
if (field ==='reps') next = Math.max(1, Math.round(next));
else next = Math.max(0, +(next.toFixed(2)));
allSets[ei][idx][field] = (field ==='weight') ? storeW(next) : next;
const inputEl=document.getElementById(field==='weight'?'inp-w-'+ei+'-'+idx:'inp-r-'+ei+'-'+idx);
if (inputEl)inputEl.value=(field==='weight')?dispW(allSets[ei][idx][field]):allSets[ei][idx][field];
const rpe=calcRPE(allSets[ei][idx].weight,allSets[ei][idx].reps,ei),orm=calc1RM(allSets[ei][idx].weight,allSets[ei][idx].reps,ei);
const rb2=document.getElementById('rpe-badge-'+ei+'-'+idx);
const tb=document.getElementById('tier-badge-'+ei+'-'+idx);
const ob=document.getElementById('orm-mini-'+ei+'-'+idx);
if (rb2) { rb2.className='rpe-badge '+rpeClass(rpe); rb2.textContent=rpe!==null?rpe:'-'; }
if (tb) {
  const tier=getStrengthTier(exercises[ei].name,orm);
  const prevKey=tb.dataset.tierKey||'none';
  const newKey=tier?tier.key:'none';
  tb.className='tier-badge tier-'+newKey+(prevKey!==newKey?' tier-changed':'');
  tb.textContent=tier?TIER_ABBREV[tier.level]:'-';
  tb.dataset.tierKey=newKey;
  if(prevKey!==newKey) setTimeout(()=>tb.classList.remove('tier-changed'),300);
}
if (ob) {
  ob.className='orm-mini'+(orm===null?' empty':'');
  ob.textContent=orm!==null?Math.round(dispW(orm))+' '+dispU():'-';
}
refreshSetPlateViz(ei,idx);
markStatsDirty();
const block=document.getElementById('ex-block-'+ei);
if (block) {

  const w=allSets[ei].filter(s=>s.type==='working'),d=w.filter(s=>s.completed);
block.querySelectorAll('.ex-sets-badge').forEach(b=>b.textContent=d.length+'/'+w.length);

}

}

function completeSet(ei,idx) {

  const set=allSets[ei][idx];
  const isBw=exercises[ei].isBodyweight;
  const wf=parseFloat(set.weight);
  const weightOk=isBw
    ? (set.weight===''||set.weight===null||set.weight===undefined||Number.isFinite(wf)&&wf>=0)&&profBodyweight>0
    : set.weight!==''&&set.weight!==null&&set.weight!==undefined&&Number.isFinite(wf)&&wf>0;
  const rf=parseFloat(set.reps);
  const repsOk=Number.isFinite(rf)&&rf>0;
if (!repsOk) {

  showToast('Enter reps first');
return;

}
if (!weightOk) {

  showToast(isBw&&!profBodyweight?'Set bodyweight in Profile first':'Enter weight first');
return;

}
if (!set.completed&&!isSectionUnlocked(ei)) {

  showToast('Complete previous section first');
return;

}
set.completed=!set.completed;
if (set.completed) {
  invalidateBest1RM(ei);
  const now=Date.now();
  if (lastSetCompletedAt!==null)set.restTaken=Math.round((now-lastSetCompletedAt)/1000);
  set.completedAt=now;
  lastSetCompletedAt=now;
  if (exStartedAt[ei]===null)exStartedAt[ei]=now;
  const working=allSets[ei].filter(s=>s.type==='working'),allWorkingDone=working.every(s=>s.completed);
if (allWorkingDone) {

  exFinishedAt[ei]=now;
  stopSectionTimer();
  const nextEiU=ei+1;
  if (nextEiU<exercises.length)renderSets(nextEiU);

}
let nextEi=ei,nextI=idx+1;
while (nextI<allSets[nextEi].length&&(allSets[nextEi][nextI].completed||allSets[nextEi][nextI].type!=='working'))nextI++;
if (nextI>=allSets[nextEi].length) {

  let found=false;
  for (let e=0;
  e<exercises.length;
  e++) {

    const ni=allSets[e].findIndex(s=>s.type==='working'&&!s.completed);
if (ni!==-1&&isSectionUnlocked(e)) {

  nextEi=e;
  nextI=ni;
  found=true;
  break;

}

}
if (!found) {

  stopLiveRestCounter();
  nextEi=-1;

}

}
if (nextEi!==-1&&nextEi!==ei&&!allWorkingDone)renderSets(nextEi);
if (nextEi!==-1)startLiveRestCounter(nextEi,nextI);
const next=allSets[ei][idx+1];
if (next&&!next.completed&&!next.weight) {

  next.weight=set.weight;
  next.reps=set.reps;

}
startRestTimer(set.type==='warmup'?Math.min(60,customTimerSecs):customTimerSecs);

// Check if this set produces a new tier milestone
(function() {
  const orm = calc1RM(set.weight, set.reps, ei);
  if (!orm) return;
  const tier = getStrengthTier(exercises[ei].name, orm);
  if (!tier) return;
  const priorBest = getEffectivePriorBest1RM(ei, idx);
  const prevTier = priorBest ? getStrengthTier(exercises[ei].name, priorBest) : null;
  const prevLevel = prevTier ? prevTier.level : -1;
  if (tier.level > prevLevel) {
    // New milestone! Show celebratory toast instead of plain "Set logged"
    const tierLabels = ['Beginner','Novice','Intermediate','Advanced','Elite'];
    const tierEmoji  = ['🌱','📈','⚡','🔥','🏆'];
    setTimeout(() => showToast(tierEmoji[tier.level] + ' ' + tierLabels[tier.level] + ' on ' + exercises[ei].name + '!'), 600);
    return;
  }
})();

showToast('Set '+(set.type==='warmup'?'W':idx+1)+' logged');
renderSets(ei);
const block=document.getElementById('ex-block-'+ei);
if (block) {

  block.className='ex-block'+(allWorkingDone?' done-ex':exOpen[ei]?' active-ex':'');
block.querySelectorAll('.ex-sets-badge').forEach(b=> {

  b.textContent=working.filter(s=>s.completed).length+'/'+working.length;
b.className=allWorkingDone?'ex-sets-badge done-badge':'ex-sets-badge';

});
block.querySelectorAll('.ex-num').forEach(n=>n.className=allWorkingDone?'ex-num done-num':exOpen[ei]?'ex-num active-num':'ex-num');

}
refreshExerciseHeaderSummary(ei);
allSets[ei].forEach((_,i)=>refreshSetPlateViz(ei,i));
markStatsDirty();
if (allWorkingDone)setTimeout(()=>openNextSection(ei),50);

}else {

  set.completedAt=null;
  set.restTaken=null;
  exFinishedAt[ei]=null;
  invalidateBest1RM(ei);
  const anyStillDone=allSets[ei].filter(s=>s.type==='working').some(s=>s.completed);
if (!anyStillDone)exStartedAt[ei]=null;
const nextEiU=ei+1;
if (nextEiU<exercises.length)renderSets(nextEiU);
let prev=null;
allSets.forEach(exSets=>exSets.forEach(s=> {

  if (s.completed&&s.completedAt&&(!prev||s.completedAt>prev))prev=s.completedAt;

}));
lastSetCompletedAt=prev;
stopLiveRestCounter();
if (prev!==null) {

  let nextEi=-1,nextI=-1;
  for (let e=0;e<exercises.length;e++) {

    const ni=allSets[e].findIndex(s=>s.type==='working'&&!s.completed);
if (ni!==-1&&isSectionUnlocked(e)) {

  nextEi=e;
  nextI=ni;
  break;

}

}
if (nextEi!==-1)startLiveRestCounter(nextEi,nextI);

}
renderSets(ei);
const block=document.getElementById('ex-block-'+ei);
if (block) {

  const working=allSets[ei].filter(s=>s.type==='working'),done=working.filter(s=>s.completed),allDone=working.length>0&&done.length===working.length;
block.className='ex-block'+(allDone?' done-ex':exOpen[ei]?' active-ex':'');
block.querySelectorAll('.ex-sets-badge').forEach(b=> {

  b.textContent=done.length+'/'+working.length;
b.className=allDone?'ex-sets-badge done-badge':'ex-sets-badge';

});
block.querySelectorAll('.ex-num').forEach(n=>n.className=allDone?'ex-num done-num':exOpen[ei]?'ex-num active-num':'ex-num');

}
refreshExerciseHeaderSummary(ei);
allSets[ei].forEach((_,i)=>refreshSetPlateViz(ei,i));
markStatsDirty();

}

}

function addSet(ei,type) {

  const last=[...allSets[ei]].filter(s=>s.type==='working').pop();
allSets[ei].push({

  type,weight:type==='warmup'?'':last?.weight||'',reps:type==='warmup'?'':last?.reps||'',completed:false,note:'',completedAt:null,restTaken:null

});
renderSets(ei);
refreshExerciseHeaderSummary(ei);
markStatsDirty();

}

function toggleHistory(key, btn) {

  const hr=document.getElementById('hr-'+key),hc=document.getElementById('hc-'+key);
if (hr) {

  hr.classList.toggle('visible');
hc.classList.toggle('open');
if (btn) btn.setAttribute('aria-expanded', hr.classList.contains('visible') ? 'true' : 'false');

}

}

function updateGainBadges() {

  var gains= {

    bench: {

      kg:7.5

    },
    fly: {

      kg:4

    },
    tri: {

      kg:6.5

    }

  };

  Object.entries(gains).forEach(function(entry) {

    var key=entry[0],val=entry[1];
    var el=document.getElementById('gain-'+key);
if (el) {

  var disp=profUnit==='lbs'?Math.round(val.kg*KG_TO_LBS):val.kg;
el.textContent='+'+disp+' '+dispU();

}

});

}

function updateHistStatVol() {

  var el=document.getElementById('histStatVol');
if (!el)return;
var rawVol=8400;
el.textContent=profUnit==='lbs'?Math.round(rawVol*KG_TO_LBS).toLocaleString()+' lbs':(rawVol/1000).toFixed(1)+'t';

}

// ── DSA: Stale-flag incremental stats — only recomputes when dirty ──
// Before: called after every keystroke/step/complete even when nothing changed.
// Now: callers set _statsDirty=true; updateStats() is a no-op if already clean.
let _statsDirty = true;
let _statsRAF = 0;

function markStatsDirty() {
  _statsDirty = true;
  if (!_statsRAF) _statsRAF = requestAnimationFrame(() => { _statsRAF = 0; updateStats(); });
}

function updateStats() {
  if (!_statsDirty) return;
  _statsDirty = false;
  let vol=0,done=0,working=0;
  exercises.forEach((_,ei)=> {
    const w=allSets[ei].filter(s=>s.type==='working'),d=w.filter(s=>s.completed);
    vol+=d.reduce((sum,s)=>sum+setVolumeKg(ei,s),0);
    done+=d.length;
    working+=w.length;
  });
  const tv = document.getElementById('totalVol'), sd = document.getElementById('setsDone');
  if (tv) tv.innerHTML = dispVol(vol) + '<span style="font-size:11px;font-weight:500;color:var(--text3)"> ' + dispU() + '</span>';
  if (sd) sd.innerHTML = done + '<span style="font-size:11px;font-weight:500;color:var(--text3)">' + '/' + working + '</span>';
  const exDone = exercises.filter((_, ei) =>
    allSets[ei].filter(s => s.type ==='working').every(s => s.completed) &&
    allSets[ei].filter(s => s.type ==='working').length > 0
  ).length;
  var tierCounts = [0, 0, 0, 0, 0];
  exercises.forEach(function (_, ei) {
    var t = tierForFullyLoggedExercise(ei);
    if (t) tierCounts[t.level]++;
  });
  var mixParts = [];
  for (var L = 4; L >= 0; L--) {
    if (tierCounts[L]) mixParts.push(tierCounts[L] + ' ' + TIER_MIX_ABBREV[L]);
  }
  const pill = document.getElementById('exProgress');
  if (pill) {
    var pillBase = exDone > 0 ? exDone + '/' + exercises.length + ' done' : exercises.length + ' exercises';
    pill.textContent = mixParts.length ? pillBase + ' \u00b7 ' + mixParts.join(', ') : pillBase;
    pill.title = mixParts.length
      ? 'Finished exercises only: count by strength tier (e1RM vs your profile standards).'
      : '';
  }
}

let toastTimer;

function showToast(msg) {

  const t=document.getElementById('toast');
t.textContent=msg;
t.classList.add('show');
clearTimeout(toastTimer);
toastTimer=setTimeout(()=>t.classList.remove('show'),2200);

}

function resetAllState() {

  exerciseBarKgByEi = {};
  lastSetCompletedAt=null;
  wuStartedAt=null;
  customTimerSecs=profRestSecs;
  exStartedAt=new Array(exercises.length).fill(null);
  exFinishedAt=new Array(exercises.length).fill(null);
  allSets=freshSets();
  wuState=new Array(WU_ITEMS).fill(false);
  wuItemDoneAt=new Array(WU_ITEMS).fill(null);
  exOpen=Array.from({

    length:exercises.length

  },
  (_,i)=>i===0);
  editMode=new Array(exercises.length).fill(false);
  const btn=document.getElementById('startStopBtn'),icon=document.getElementById('startStopIcon');
btn.classList.remove('active');
icon.textContent='play_arrow';
btn.setAttribute('aria-label','Start workout');
document.getElementById('durationStat').textContent='0:00';
const badge=document.getElementById('elapsedBadge');
badge.classList.remove('visible');
badge.textContent='';
for (let i=0;i<WU_ITEMS;i++) {

  const item=document.getElementById('wui-'+i),check=document.getElementById('wuc-'+i);
if (item)item.classList.remove('completed');
if (check) {

  check.className='wu-check';
check.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">radio_button_unchecked</span>';

}
const pill=document.getElementById('wu-pill-'+i);
if (pill) {

  pill.style.display='none';
pill.textContent='';

}

}
document.getElementById('wuProg').textContent='0/'+WU_ITEMS;
document.getElementById('wuProg').className='warmup-prog';
const wuIconReset=document.querySelector('.warmup-icon');
if (wuIconReset) wuIconReset.textContent='0';
const wuSubLabel=document.getElementById('wuSubLabel');
if (wuSubLabel)wuSubLabel.innerHTML=WU_SUBLABEL_BASE;
document.getElementById('warmupCard').style.opacity='1';
document.getElementById('warmupBody').classList.add('open');
document.getElementById('warmupBody').classList.remove('wu-locked');
document.getElementById('wuChev').style.transform='rotate(180deg)';

}

function histMaxEpleyKg(ei) {
  var h = exercises[ei].history;
  if (!h || !h.length) return 0;
  var m = 0;
  for (var j = 0; j < h.length; j++) {
    var ww = workWeightKg(ei, h[j][1]);
    var rf = parseFloat(h[j][2]);
    if (!ww || !Number.isFinite(rf) || rf <= 0) continue;
    m = Math.max(m, epley1RM(ww, rf));
  }
  return m;
}

function finishWorkout() {

  let n = 0, vol = 0;
  exercises.forEach(function (_, ei) {
    const d = allSets[ei].filter(function (s) { return s.completed && s.type === 'working'; });
    n += d.length;
    vol += d.reduce(function (sum, s) { return sum + setVolumeKg(ei, s); }, 0);
  });
  const elapsedSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const titleEl = document.querySelector('.workout-title');
  const sessionName = titleEl ? titleEl.textContent.trim() : 'Workout';
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayStr = days[now.getDay()];
  const pad2 = function (x) { return String(x).padStart(2, '0'); };
  const histTag = pad2(now.getDate()) + '-' + pad2(now.getMonth() + 1) + '-' + String(now.getFullYear()).slice(-2);
  const bests = [];
  let hasPR = false;
  exercises.forEach(function (ex, ei) {
    const workingDone = allSets[ei].filter(function (s) { return s.type === 'working' && s.completed; });
    if (!workingDone.length) return;
    var bestE = 0, bestSet = null;
    workingDone.forEach(function (set) {
      var wk = workWeightKg(ei, set.weight);
      var r = parseFloat(set.reps);
      if (!Number.isFinite(r) || r <= 0 || !wk) return;
      var e = epley1RM(wk, r);
      if (e > bestE) {
        bestE = e;
        bestSet = set;
      }
    });
    if (!bestSet) return;
    var prevMax = histMaxEpleyKg(ei);
    var isPR = bestE > prevMax + 0.001;
    if (isPR) hasPR = true;
    var wStore = ex.isBodyweight ? (parseFloat(bestSet.weight) || 0) : parseFloat(bestSet.weight);
    var rStore = parseFloat(bestSet.reps);
    bests.push({ n: ex.name, w: wStore, r: rStore, isPR: isPR });
    ex.history.unshift([histTag, wStore, rStore, isPR]);
  });
  var setCounts = exercises.map(function (_, ei) {
    return allSets[ei].filter(function (s) { return s.type === 'working' && s.completed; }).length;
  });
  var session = {
    id: Date.now(),
    name: sessionName,
    emoji: '💪',
    date: dateStr,
    day: dayStr,
    exercises: exercises.map(function (e) { return e.name; }),
    sets: setCounts,
    bests: bests,
    vol: vol,
    dur: Math.max(1, Math.floor(elapsedSec / 60)) + 'm',
    hasPR: hasPR
  };
  if (n > 0) {
    HIST_DATA.unshift(session);
    persistWorkoutHistory();
    persistExerciseHistories();
    refreshHistory();
  }
  _best1RMCache.clear();
  workoutActive = false;
  clearInterval(durationInterval);
  durationInterval = null;
  stopTimer();
  stopLiveRestCounter();
  stopSectionTimer();
  stopWuLiveCounter();
  resetAllState();
  showToast('Workout saved! ' + n + ' sets · ' + dispVol(vol) + ' ' + dispU());
  renderAll();
  renderLibrary();
  window.scrollTo({ top: 0, behavior: 'smooth' });

}

function checkWU(idx) {

  if (wuState.every(Boolean)) {

    showToast('Warm-up locked');
return;

}
wuState[idx]=!wuState[idx];
if (wuState[idx]) {

  const now=Date.now();
  wuItemDoneAt[idx]=now;
  if (!wuStartedAt) {

    wuStartedAt=now;
    startSectionTimer('wu');
if (!workoutActive)startWorkout();

}else if (!workoutActive)startWorkout();
const prevRef=(()=> {

  for (let j=idx-1;j>=0;j--) {

    if (wuItemDoneAt[j])return wuItemDoneAt[j];

  }
  return wuStartedAt;

})();
const pill=document.getElementById('wu-pill-'+idx);
if (pill&&prevRef) {

  pill.style.display='';
pill.textContent=formatRest(Math.round((now-prevRef)/1000));

}

}else {

  wuItemDoneAt[idx]=null;
  const pill=document.getElementById('wu-pill-'+idx);
if (pill) {

  pill.style.display='none';
pill.textContent='';

}
const nextPill=document.getElementById('wu-pill-'+(idx+1));
if (nextPill) {

  nextPill.style.display='none';
nextPill.textContent='';

}

}
const item=document.getElementById('wui-'+idx),check=document.getElementById('wuc-'+idx);
if (check) {

  check.className='wu-check'+(wuState[idx]?' done':'');
check.setAttribute('aria-checked',wuState[idx]?'true':'false');
check.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">'+(wuState[idx]?'check_circle':'radio_button_unchecked')+'</span><span class="sr-only">'+(wuState[idx]?'Completed':'Not completed')+'</span>';

}
item.classList.toggle('completed',wuState[idx]);
stopWuLiveCounter();
if (!wuState.every(Boolean)) {

  const nextIdx=wuState.findIndex(v=>!v);
if (nextIdx!==-1) {

  const refTime=wuItemDoneAt.reduce((best,t)=>(t&&(!best||t>best))?t:best,null)??wuStartedAt;
  if (refTime)startWuLiveCounter(nextIdx,refTime);

}

}
updateWUProg();

}

function updateWUProg() {

  const done=wuState.filter(Boolean).length,prog=document.getElementById('wuProg');
prog.textContent=done+'/'+wuState.length;
prog.className='warmup-prog'+(done===wuState.length?' done':'');
// Update the icon badge to reflect completed count
const icon=document.querySelector('.warmup-icon');
if (icon) icon.textContent=done===wuState.length?'✓':done;
if (done===wuState.length) {

  document.getElementById('warmupBody').classList.add('wu-locked');
stopWuLiveCounter();
stopSectionTimer();
showToast('Warm-up complete! Time to lift');
setTimeout(()=>document.getElementById('warmupCard').style.opacity='0.5',400);
const wuDoneNow=Date.now();
if (wuStartedAt) {

  const secs=Math.round((wuDoneNow-wuStartedAt)/1000);
  const el=document.getElementById('wuSubLabel');
if (el)el.innerHTML=WU_SUBLABEL_BASE+' <span style="font-family:DM Mono,monospace;color:var(--done);">'+formatRest(secs)+'</span>';

}
lastSetCompletedAt=wuDoneNow;
renderSets(0);
startLiveRestCounter(0,0);

}

}

function toggleWarmup() {

  const body=document.getElementById('warmupBody'),chev=document.getElementById('wuChev');
body.classList.toggle('open');
chev.style.transform=body.classList.contains('open')?'rotate(180deg)':'rotate(0deg)';

}

function skipWarmup() {

  stopWuLiveCounter();
  const now=Date.now();
  if (!wuStartedAt)wuStartedAt=now;
  if (!workoutActive)startWorkout();
  stopSectionTimer();
  wuState.fill(true);
  wuItemDoneAt=new Array(WU_ITEMS).fill(now);
  for (let i=0;i<wuState.length;i++) {

    const item=document.getElementById('wui-'+i),check=document.getElementById('wuc-'+i);
if (item)item.classList.add('completed');
if (check) {

  check.className='wu-check done';
check.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">check_circle</span><span class="sr-only">Completed</span>';

}
const pill=document.getElementById('wu-pill-'+i);
if (pill)pill.style.display='none';

}
updateWUProg();
document.getElementById('warmupBody').classList.remove('open');
document.getElementById('wuChev').style.transform='rotate(0deg)';

}

function completeAllWU() {

  skipWarmup();

}

// ── Pause rest timer when app goes to background, resume on return ──
let _timerPausedAt = null;
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    if (timerInterval) {
      _timerPausedAt = Date.now();
      clearInterval(timerInterval);
      timerInterval = null;
      document.getElementById('navTop').classList.remove('timer-active');
      document.getElementById('timerPlayIcon').textContent ='play_arrow';
      const pb = document.getElementById('timerPlayBtn');
      pb.classList.remove('active');
      pb.setAttribute('aria-pressed','false');
    }
  } else {
    if (timerRemaining > 0 && !timerInterval) {
      if (_timerPausedAt !== null) {
        const elapsed = Math.round((Date.now() - _timerPausedAt) / 1000);
        timerRemaining = Math.max(0, timerRemaining - elapsed);
        _timerPausedAt = null;
      }
      if (timerRemaining > 0) {
        _activateTimer();
        updateTimerUI();
        _startCountdown();
      } else {
        stopTimer();
        showToast('Rest complete - next set!');
        if (navigator.vibrate) navigator.vibrate([100,50,100]);
      }
    }
  }
});
initDomBindings();
loadSavedWorkoutData();
var restoredPage=getSavedPage();
if (restoredPage&&restoredPage!=='log')switchPage(restoredPage);
renderAll();
initLibrary();
initHistory();
updateProfileDisplay();
window.addEventListener('hashchange',function(){
  var p=getSavedPage()||'log';
  if (p!==currentPage)switchPage(p);
});
