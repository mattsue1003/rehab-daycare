/* ================================================================
   App：外框、使用者切換、路由
   ================================================================ */
const APP_TITLE = '日照復能管理系統';
const NAV = [
  ['#/', 'home', '總覽'],
  ['#/today', 'check', '今日執行'],
  ['#/clients', 'users', '個案與處方'],
  ['#/meetings', 'meet', '個案討論會'],
  ['#/incidents', 'alert', '意外事件'],
  ['#/activities', 'star', '活動與訓練'],
  ['#/reports', 'chart', '評鑑與成效'],
  ['#/settings', 'gear', '設定與備份'],
];

const App = {
  currentUserId(){ try { return localStorage.getItem('rehab:user') || ''; } catch(e){ return ''; } },
  setUser(id){ try { localStorage.setItem('rehab:user', id); } catch(e){} renderShell(); route(); },
  toast,
  isCareWorker(){ return staffRole(this.currentUserId()) === '照顧服務員'; },
  go(h){ location.hash = h; },
};

function renderShell(){
  const uid = App.currentUserId(), cur = location.hash || '#/';
  const center = Store.DB.meta.center || '（請至設定填寫中心名稱）';
  const nav = (App.isCareWorker() ? [NAV[1], NAV[0], ...NAV.slice(2)] : NAV);
  $('#side').innerHTML = `
    <div class="brand"><div class="logo">${icon('heart', 22)}</div><div><div class="b1">${APP_TITLE}</div><div class="b2">${esc(center)}</div></div></div>
    <nav>${nav.map(([h, i, l]) => `<a href="${h}" class="${(cur === h || (h !== '#/' && cur.startsWith(h.replace(/s$/, '')))) ? 'on' : ''}">${icon(i)}<span>${l}</span></a>`).join('')}</nav>
    <div class="side-foot">資料僅儲存於本機瀏覽器<br>請定期至「設定與備份」匯出</div>`;
  const staff = Store.all('staff').filter(s => s.active !== false);
  $('#top').innerHTML = `
    <button class="icon-btn only-m" onclick="document.body.classList.toggle('nav-open')" aria-label="選單">${icon('menu')}</button>
    <div class="top-title" id="top-title"></div><span class="sp"></span>
    <label class="who">目前使用者
      <select onchange="App.setUser(this.value)" class="inp sm">
        <option value="">— 選擇 —</option>${staff.map(s => `<option value="${s.id}" ${s.id === uid ? 'selected' : ''}>${esc(s.name)}（${esc(s.role)}）</option>`).join('')}
      </select></label>`;
}
function setTitle(t, sub = ''){ $('#top-title').innerHTML = `<b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`; document.title = t + '｜' + APP_TITLE; }

const ROUTES = [
  [/^#?\/?$/, () => pageDashboard()],
  [/^#\/today$/, () => pageToday()],
  [/^#\/clients$/, () => pageClients()],
  [/^#\/client\/([^/]+)(?:\/(\w+))?$/, m => pageClient(m[1], m[2] || 'overview')],
  [/^#\/assess\/new\/([^/]+)(?:\/([^/?]+))?$/, m => pageAssessEdit(null, m[1], m[2])],
  [/^#\/assess\/([^/]+)$/, m => pageAssessEdit(m[1])],
  [/^#\/plan\/new\/([^/?]+)(?:\?(.*))?$/, m => pagePlanEdit(null, m[1], new URLSearchParams(m[2] || ''))],
  [/^#\/plan\/([^/]+)$/, m => pagePlanEdit(m[1])],
  [/^#\/meetings$/, () => pageMeetings()],
  [/^#\/meeting\/([^/]+)$/, m => pageMeetingEdit(m[1])],
  [/^#\/incidents$/, () => pageIncidents()],
  [/^#\/incident\/([^/?]+)(?:\?(.*))?$/, m => pageIncidentEdit(m[1], new URLSearchParams(m[2] || ''))],
  [/^#\/activities$/, () => pageActivities()],
  [/^#\/reports$/, () => pageReports()],
  [/^#\/settings$/, () => pageSettings()],
];
let ignoreHash = false;
function route(){
  let h = location.hash || '#/'; try { h = decodeURIComponent(h); } catch(e){}
  for (const [re, fn] of ROUTES) {
    const m = h.match(re);
    if (m) { S.edit = null; S.onEdit = null; S.dirty = false; const html = fn(m); if (html != null) { $('#main').innerHTML = html; } $('#main').scrollTop = 0; window.scrollTo(0, 0); S.lastHash = h; renderShellNav(); return; }
  }
  location.hash = '#/';
}
function renderShellNav(){ let cur = location.hash || '#/'; if (/^#\/(assess|plan)\//.test(cur)) cur = '#/client/'; document.querySelectorAll('#side nav a').forEach(a => { const h = a.getAttribute('href'); a.classList.toggle('on', cur === h || (h !== '#/' && cur.startsWith(h.replace(/s$/, '')))); }); document.body.classList.remove('nav-open'); }
window.addEventListener('hashchange', () => {
  if (ignoreHash) { ignoreHash = false; return; }
  if (S.dirty && !askConfirm('目前編輯的內容尚未儲存，確定要離開嗎？')) { ignoreHash = true; location.hash = S.lastHash; return; }
  route();
});
window.addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
/* 重新繪製目前頁面但保留編輯狀態 */
function rerender(fn){ const y = window.scrollY; $('#main').innerHTML = fn(); window.scrollTo(0, y); }

async function init(){
  await Store.load();
  renderShell();
  if (!Store.all('staff').length) { location.hash = '#/settings'; }
  route();
  if (!Store.all('staff').length) setTimeout(() => openWelcome(), 200);
}
function openWelcome(){
  openModal('歡迎使用日照復能管理系統', `
    <p>本系統協助日間照顧中心完成 <b>評估 → 開立復能處方 → 照服員執行紀錄 → 再評估 → 修正處方</b> 的完整循環，並依《社區式日間照顧長照機構評鑑基準》自動檢核 B1、B3、B5–B11 等指標。</p>
    <ul class="list">
      <li>所有資料只存在<b>這台電腦的瀏覽器</b>，不會上傳到網路。</li>
      <li>請先到「設定與備份」建立中心名稱與工作人員，再於右上角選擇「目前使用者」。</li>
      <li>想先看看操作方式，可以載入示範資料（之後可一鍵清除）。</li>
    </ul>`, { saveLabel:'載入示範資料', onSave:() => { loadDemo(); } });
}
document.addEventListener('DOMContentLoaded', init);
