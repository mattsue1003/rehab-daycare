/* ================================================================
   頁面：總覽、今日執行（照服員）、個案列表、個案詳細
   ================================================================ */

/* ---------------- 總覽 ---------------- */
function pageDashboard(){
  setTitle('總覽', rocDate(todayISO()) + '（星期' + WEEKDAYS[weekday(todayISO())] + '）');
  const today = todayISO(), active = Store.all('clients').filter(c => c.status === '服務中');
  const idx = Logic.index();
  let tExp = 0, tDone = 0;
  active.forEach(c => { const s = Logic.execStats(c, today, today, idx); tExp += s.expected; tDone += s.done + s.partial; });
  const oc = Logic.outcomes();
  const todo = [];
  for (const c of active) {
    const ck = Logic.clientChecks(c), link = `#/client/${c.id}`;
    if (!ck.last) todo.push({ lv:'high', t:`${c.name}：尚未完成初評`, a:`<a class="btn sm primary" href="#/assess/new/${c.id}/初評">開始初評</a>` });
    else if (!ck.hasPlan) todo.push({ lv:'high', t:`${c.name}：已評估但尚未開立復能處方`, a:`<a class="btn sm primary" href="#/plan/new/${c.id}?from=${ck.last.id}">開立處方</a>` });
    if (ck.reassessDue) {
      const d = diffDays(today, ck.reassessDue.date);
      if (d < 0) todo.push({ lv:'high', t:`${c.name}：再評估已逾期 ${-d} 天（${ck.reassessDue.why} ${rocDate(ck.reassessDue.date)}）`, a:`<a class="btn sm primary" href="#/assess/new/${c.id}/再評">進行再評</a>` });
      else if (d <= 21) todo.push({ lv:'mid', t:`${c.name}：${d} 天後需再評估（${rocDate(ck.reassessDue.date)}）`, a:`<a class="btn sm" href="#/assess/new/${c.id}/再評">進行再評</a>` });
    }
    if (ck.last && !ck.referralOK) todo.push({ lv:'mid', t:`${c.name}：評估顯示需轉介（${ck.flagged.map(f => f.referral).join('；')}），處方尚無轉介紀錄`, a:`<a class="btn sm" href="#/plan/${ck.plan?.id || ''}">補轉介</a>` });
    if ((ck.lastContact ? diffDays(ck.lastContact, today) : diffDays(c.admitDate || today, today)) > 90) todo.push({ lv:'low', t:`${c.name}：超過3個月未有家屬聯繫紀錄（B8）`, a:`<a class="btn sm" href="${link}/contacts">新增聯繫</a>` });
  }
  const lm = Logic.lastMeeting();
  const mDue = lm ? addMonths(lm.date, MEETING_MONTHS) : null;
  if (!lm) todo.push({ lv:'high', t:'尚無跨專業個案討論會紀錄（每3個月至少1次）', a:`<a class="btn sm primary" href="#/meeting/new">建立會議</a>` });
  else if (diffDays(today, mDue) < 0) todo.push({ lv:'high', t:`跨專業個案討論會已逾期（上次 ${rocDate(lm.date)}）`, a:`<a class="btn sm primary" href="#/meeting/new">建立會議</a>` });
  else if (diffDays(today, mDue) <= 21) todo.push({ lv:'mid', t:`下次跨專業個案討論會請於 ${rocDate(mDue)} 前召開`, a:`<a class="btn sm" href="#/meeting/new">建立會議</a>` });
  const od = Logic.openDecisions().filter(d => d.due && d.due < today);
  od.forEach(d => todo.push({ lv:'mid', t:`討論會決議逾期未完成：${d.text}（${d.clientId ? clientName(d.clientId) + '，' : ''}負責：${staffName(d.owner) || '未指定'}）`, a:`<a class="btn sm" href="#/meeting/${d.meetingId}">查看</a>` }));
  Store.all('incidents').filter(i => !i.closed && (!i.analysis || !i.improvement)).forEach(i => todo.push({ lv:'mid', t:`意外事件待完成分析與改善：${clientName(i.clientId)} ${i.type}（${rocDate(i.datetime)}）`, a:`<a class="btn sm" href="#/incident/${i.id}">補寫</a>` }));
  const ym = today.slice(0, 7);
  if (!Store.all('activities').some(a => a.date?.startsWith(ym) && (a.kind === '團體活動' || a.kind === '社區活動'))) todo.push({ lv:'low', t:'本月尚未登錄團體或社區活動（B7 每月至少1次）', a:`<a class="btn sm" href="#/activities">登錄活動</a>` });
  const order = { high:0, mid:1, low:2 }; todo.sort((a, b) => order[a.lv] - order[b.lv]);

  const alerts = Logic.alerts(), skips = Logic.repeatedSkips();
  return `
  <div class="kpis">
    <div class="kpi"><div class="k-n">${active.length}</div><div class="k-l">服務中個案</div></div>
    <div class="kpi"><div class="k-n">${tExp ? tDone + '/' + tExp : '—'}</div><div class="k-l">今日處方已記錄</div><div class="bar"><i style="width:${pct(tDone, tExp) || 0}%"></i></div></div>
    <div class="kpi"><div class="k-n">${oc.execRate ?? '—'}<small>%</small></div><div class="k-l">近30天處方執行率</div></div>
    <div class="kpi"><div class="k-n">${oc.adlKeep ?? '—'}<small>%</small></div><div class="k-l">ADL 維持或進步率（${oc.pairs} 人）</div></div>
    <div class="kpi"><div class="k-n">${oc.goalMet ?? '—'}<small>%</small></div><div class="k-l">復能目標達成率（${oc.goals} 項）</div></div>
  </div>
  <div class="grid2">
    <section class="card"><h2>待辦與評鑑提醒 <small>${todo.length} 項</small></h2>
      ${todo.length ? `<ul class="todo">${todo.map(t => `<li class="lv-${t.lv}"><span class="dot"></span><span class="tt">${esc(t.t)}</span>${t.a}</li>`).join('')}</ul>` : empty('目前沒有待辦事項 👍')}
    </section>
    <section class="card"><h2>照服員回報 <small>需治療師/護理師注意</small></h2>
      ${alerts.length ? `<ul class="todo">${alerts.map(e => `<li class="lv-high"><span class="dot"></span><span class="tt"><b>${esc(clientName(e.clientId))}</b> ${rocDate(e.date)}｜${esc(e.itemName || '')}｜${esc(e.tolerance || '')}${e.note ? '：' + esc(e.note) : ''}<br><small>回報：${esc(staffName(e.staffId || e.updatedBy))}</small></span>${btn('已處理', `ackAlert('${e.id}')`, { k:'sm' })}</li>`).join('')}</ul>` : empty('近7天沒有不適或異常回報')}
      ${skips.length ? `<h3>連續3次未執行</h3><ul class="todo">${skips.map(s => `<li class="lv-mid"><span class="dot"></span><span class="tt">${esc(s.client.name)}：${esc(s.item.name)}（${esc(s.reasons)}）→ 建議檢討處方</span><a class="btn sm" href="#/client/${s.client.id}/plan">檢視</a></li>`).join('')}</ul>` : ''}
    </section>
  </div>
  <section class="card"><h2>復能循環</h2>
    <div class="cycle">${[['評估','巴氏、IADL、SPMSQ、體能、GDS、MNA-SF、身心社會'],['開立處方','問題→目標→處方項目→頻率'],['照服員執行','每日勾選完成度、協助程度、耐受度'],['再評估','≤6個月或處方再評日、目標達成 GAS'],['修正處方','保留版本與修正理由']].map(([a, b], i) => `<div class="step"><div class="sn">${i + 1}</div><b>${a}</b><small>${b}</small></div>`).join('<div class="arrow">→</div>')}</div>
  </section>`;
}
function ackAlert(id){ const e = Store.get('execs', id); if (!e) return; e.ack = { by:App.currentUserId(), at:new Date().toISOString() }; Store.upsert('execs', e); route(); }

/* ---------------- 今日執行（照服員） ---------------- */
function pageToday(){
  const d = S.todayDate, w = weekday(d);
  setTitle('今日執行紀錄', rocDate(d) + '（星期' + WEEKDAYS[w] + '）');
  const idx = Logic.index();
  let list = Store.all('clients').filter(c => c.status === '服務中').sort(byDate('name'));
  const scheduled = list.filter(c => (c.attendDays || []).includes(w) || idx.vi.has(c.id + '|' + d));
  if (!S.showAllToday) list = scheduled;
  let exp = 0, rec = 0;
  const cards = list.map(c => {
    const plan = Logic.planOn(c.id, d), items = Logic.itemsOn(plan, d), v = idx.vi.get(c.id + '|' + d);
    const absent = v?.present === false;
    if (!absent) { exp += items.length; rec += items.filter(it => idx.ex.has(c.id + '|' + it.id + '|' + d)).length; }
    const done = items.filter(it => idx.ex.has(c.id + '|' + it.id + '|' + d)).length;
    const tempWarn = v?.temp && (+v.temp >= 37.5 || +v.temp < 35.5);
    return `<article class="tcard ${absent ? 'absent' : ''}" id="tc-${c.id}">
      <header>
        <div class="av">${esc(c.name.slice(0, 1))}</div>
        <div class="tn"><b>${esc(c.name)}</b><small>${esc([c.gender, ageAt(c.birth) ? ageAt(c.birth) + '歲' : '', c.aids, c.diet].filter(Boolean).join('・'))}</small></div>
        <div class="att">
          <button class="seg ${v?.present === true ? 'on' : ''}" onclick="setPresent('${c.id}',true)">出席</button><button class="seg ${absent ? 'on warn' : ''}" onclick="setPresent('${c.id}',false)">請假</button>
          <label class="temp ${tempWarn ? 'warn' : ''}">體溫<input type="number" step="0.1" min="34" max="42" inputmode="decimal" value="${esc(v?.temp ?? '')}" onchange="setTemp('${c.id}',this.value)" aria-label="${esc(c.name)} 體溫">°C</label>
        </div>
      </header>
      ${absent ? '<div class="muted pad">今日請假，不需執行處方。</div>' : !plan ? '<div class="muted pad">尚無生效中的復能處方。</div>' : !items.length ? '<div class="muted pad">今日（星期' + WEEKDAYS[w] + '）沒有排定的處方項目。</div>' : `
      <div class="tprog"><span>${done}/${items.length} 已記錄</span><div class="bar"><i style="width:${pct(done, items.length)}%"></i></div></div>
      <ul class="items">${items.map(it => execRow(c, it, plan, d, idx)).join('')}</ul>`}
    </article>`;
  }).join('');
  return `
  <div class="toolbar">
    <button class="btn" onclick="S.todayDate=addDays(S.todayDate,-1);route()">${icon('back', 16)}前一天</button>
    <input type="date" class="inp" value="${d}" onchange="S.todayDate=this.value||todayISO();route()" aria-label="日期">
    <button class="btn" onclick="S.todayDate=addDays(S.todayDate,1);route()">後一天</button>
    ${d !== todayISO() ? `<button class="btn" onclick="S.todayDate=todayISO();route()">回到今天</button>` : ''}
    <span class="sp"></span>
    <label class="chk"><input type="checkbox" ${S.showAllToday ? 'checked' : ''} onchange="S.showAllToday=this.checked;route()"><span>顯示非到班日個案</span></label>
  </div>
  ${!App.currentUserId() ? `<div class="notice warn">請先於右上角選擇「目前使用者」，紀錄才會留下執行人員姓名。</div>` : ''}
  <div class="notice">今日共 <b>${list.length}</b> 位個案，處方項目已記錄 <b>${rec}/${exp}</b>。執行時請掌握「<b>最少必要協助</b>」：讓長輩自己做得到的部分自己做（自立支援，B10）。</div>
  <div class="tgrid">${cards || empty('今天沒有排定到班的個案。', `<button class="btn" onclick="S.showAllToday=true;route()">顯示全部個案</button>`)}</div>`;
}
function execRow(c, it, plan, d, idx){
  const e = idx.ex.get(c.id + '|' + it.id + '|' + d), key = c.id + '|' + it.id;
  const open = S.openExec === key;
  const st = e?.status;
  return `<li class="it ${st ? 'st-' + ({ 完成:'ok', 部分:'part', 未執行:'skip' })[st] : ''}">
    <div class="it-main">
      <div class="it-t"><b>${esc(it.name)}</b>${it.selfcare ? badge('自立支援', 'green') : ''}<small>${esc(it.dose || '')}${it.assist ? '｜目標：' + esc(it.assist) : ''}</small></div>
      <div class="it-b">
        <button class="sbtn ok ${st === '完成' ? 'on' : ''}" onclick="markExec('${c.id}','${it.id}','完成')" aria-label="完成">✓<span>完成</span></button>
        <button class="sbtn part ${st === '部分' ? 'on' : ''}" onclick="markExec('${c.id}','${it.id}','部分')" aria-label="部分完成">△<span>部分</span></button>
        <button class="sbtn skip ${st === '未執行' ? 'on' : ''}" onclick="markExec('${c.id}','${it.id}','未執行')" aria-label="未執行">✕<span>未執行</span></button>
        <button class="sbtn more" onclick="S.openExec=S.openExec==='${key}'?null:'${key}';refreshTodayCard('${c.id}')" aria-label="詳細">${open ? '收合' : '詳細'}</button>
      </div>
    </div>
    ${open ? `<div class="it-detail">
      <div class="how"><b>執行方式：</b>${esc(it.how || '')}${it.caution ? `<br><b class="warn-t">注意：</b>${esc(it.caution)}` : ''}</div>
      <div class="row3">
        <label class="field"><span class="lbl">實際協助程度</span><select class="inp" onchange="patchExec('${c.id}','${it.id}','assist',this.value)"><option value="">—</option>${ASSIST_LEVELS.map(a => `<option ${e?.assist === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        <label class="field"><span class="lbl">耐受度/反應</span><select class="inp" onchange="patchExec('${c.id}','${it.id}','tolerance',this.value)"><option value="">—</option>${TOLERANCE.map(a => `<option ${e?.tolerance === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        <label class="field"><span class="lbl">實際量（次數/時間/距離）</span><input class="inp" value="${esc(e?.amount || '')}" placeholder="例：10下×2組" onchange="patchExec('${c.id}','${it.id}','amount',this.value)"></label>
      </div>
      ${st === '未執行' ? `<label class="field"><span class="lbl">未執行原因</span><div class="pills">${SKIP_REASONS.map(r => `<label class="pill"><input type="radio" name="rs-${key}" ${e?.reason === r ? 'checked' : ''} onchange="patchExec('${c.id}','${it.id}','reason','${r}')"><span>${r}</span></label>`).join('')}</div></label>` : ''}
      <label class="field"><span class="lbl">觀察紀錄</span><textarea class="inp" rows="2" placeholder="長輩今天的表現、進步或困難…" onchange="patchExec('${c.id}','${it.id}','note',this.value)">${esc(e?.note || '')}</textarea></label>
      <label class="chk"><input type="checkbox" ${e?.flag ? 'checked' : ''} onchange="patchExec('${c.id}','${it.id}','flag',this.checked)"><span>需治療師/護理師注意（會出現在總覽提醒）</span></label>
    </div>` : ''}
  </li>`;
}
function findExec(cid, iid, d){ return Store.all('execs').find(e => e.clientId === cid && e.itemId === iid && e.date === d); }
function markExec(cid, iid, status){
  const d = S.todayDate, plan = Logic.planOn(cid, d), it = plan?.items.find(x => x.id === iid); if (!it) return;
  let e = findExec(cid, iid, d);
  if (e && e.status === status) { Store.remove('execs', e.id); refreshTodayCard(cid); return; } // 再按一次取消
  e = e || { clientId:cid, itemId:iid, date:d };
  Object.assign(e, { status, planId:plan.id, itemName:it.name, cat:it.cat, staffId:App.currentUserId() });
  if (status !== '未執行') delete e.reason;
  if (status === '完成' && !e.amount) e.amount = it.dose;
  Store.upsert('execs', e);
  if (status === '未執行') S.openExec = cid + '|' + iid;
  ensurePresent(cid, d);
  refreshTodayCard(cid);
}
function patchExec(cid, iid, k, v){
  const d = S.todayDate; let e = findExec(cid, iid, d);
  if (!e) { const plan = Logic.planOn(cid, d), it = plan?.items.find(x => x.id === iid); e = { clientId:cid, itemId:iid, date:d, status:'部分', planId:plan?.id, itemName:it?.name, cat:it?.cat, staffId:App.currentUserId() }; }
  e[k] = v; if (k === 'tolerance' && v === '不適停止') e.flag = true;
  Store.upsert('execs', e); if (k === 'tolerance' || k === 'flag') refreshTodayCard(cid);
}
function ensurePresent(cid, d){ let v = Store.all('vitals').find(x => x.clientId === cid && x.date === d); if (!v) Store.upsert('vitals', { clientId:cid, date:d, present:true }); }
function setPresent(cid, p){ const d = S.todayDate; let v = Store.all('vitals').find(x => x.clientId === cid && x.date === d) || { clientId:cid, date:d }; v.present = v.present === p ? null : p; Store.upsert('vitals', v); refreshTodayCard(cid); }
function setTemp(cid, t){ const d = S.todayDate; let v = Store.all('vitals').find(x => x.clientId === cid && x.date === d) || { clientId:cid, date:d }; v.temp = t === '' ? '' : +t; if (t !== '' && v.present == null) v.present = true; Store.upsert('vitals', v); if (t && (+t >= 37.5 || +t < 35.5)) toast(`${clientName(cid)} 體溫 ${t}°C 異常，請通知護理師`, 'err'); refreshTodayCard(cid); }
function refreshTodayCard(cid){
  const html = pageToday(); const tmp = document.createElement('div'); tmp.innerHTML = html;
  const n = tmp.querySelector('#tc-' + cid), o = document.getElementById('tc-' + cid);
  if (n && o) o.replaceWith(n); else rerender(() => html);
  const nt = tmp.querySelector('.notice:not(.warn)'), ot = document.querySelector('#main .notice:not(.warn)'); if (nt && ot) ot.replaceWith(nt);
}

/* ---------------- 個案列表 ---------------- */
let clientFilter = { q:'', status:'服務中' };
function pageClients(){
  setTitle('個案與復能處方');
  const today = todayISO(), idx = Logic.index();
  const list = Store.all('clients').filter(c => (!clientFilter.status || c.status === clientFilter.status) && (!clientFilter.q || c.name.includes(clientFilter.q))).sort(byDate('name'));
  const rows = list.map(c => {
    const last = Logic.lastAssessment(c.id), plan = Logic.activePlan(c.id), due = Logic.reassessDue(c.id), b = scoreBarthel(last);
    const st = plan ? Logic.execStats(c, addDays(today, -29), today, idx) : null;
    const dd = due ? diffDays(today, due.date) : null;
    return `<tr onclick="App.go('#/client/${c.id}')" class="click">
      <td><b>${esc(c.name)}</b>${c.dementia ? ' ' + badge('失智', 'purple') : ''}</td>
      <td>${esc(c.gender || '')} ${ageAt(c.birth) ?? ''}</td><td>${esc(CMS_LEVELS[c.cmsLevel] || '')}</td>
      <td>${last ? rocDate(last.date) + ' ' + badge(last.type) : badge('未評估', 'red')}</td>
      <td>${b ? b.total : '—'}</td>
      <td>${plan ? `v${plan.version}（${(plan.items || []).length}項）` : badge('無處方', 'red')}</td>
      <td>${due ? `${rocDate(due.date)} ${dd < 0 ? badge('逾期', 'red') : dd <= 21 ? badge(dd + '天', 'amber') : ''}` : '—'}</td>
      <td>${st && st.rate != null ? `<div class="mini-bar"><i style="width:${st.rate}%"></i></div>${st.rate}%` : '—'}</td></tr>`;
  }).join('');
  return `
  <div class="toolbar">
    <input class="inp" placeholder="搜尋姓名" value="${esc(clientFilter.q)}" oninput="clientFilter.q=this.value;rerenderClients()" aria-label="搜尋">
    <select class="inp" onchange="clientFilter.status=this.value;rerenderClients()" aria-label="狀態">${['服務中', '暫停', '結案', ''].map(s => `<option value="${s}" ${clientFilter.status === s ? 'selected' : ''}>${s || '全部'}</option>`).join('')}</select>
    <span class="sp"></span>${btn('新增個案', 'editClient()', { k:'primary', i:'plus' })}
  </div>
  <div class="card flush"><div class="tbl-wrap"><table class="tbl" id="client-table">
    <thead><tr><th>姓名</th><th>性別/年齡</th><th>CMS</th><th>最近評估</th><th>巴氏</th><th>生效處方</th><th>下次再評</th><th>近30天執行率</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="8">${empty('尚無個案資料')}</td></tr>`}</tbody></table></div></div>`;
}
function rerenderClients(){ const t = document.createElement('div'); t.innerHTML = pageClients(); $('#client-table').replaceWith(t.querySelector('#client-table')); }

function editClient(id){
  const c = id ? clone(Store.get('clients', id)) : { status:'服務中', attendDays:[1, 2, 3, 4, 5], admitDate:todayISO(), gender:'女' };
  S.edit = c;
  const html = `<div class="form-grid">
    ${F.field('姓名', F.input('name'), { req:true })}
    ${F.field('性別', F.radios('gender', ['女', '男']))}
    ${F.field('出生日期', F.date('birth'))}
    ${F.field('身分證字號（選填）', F.input('idno', { ph:'可留空以減少個資' }))}
    ${F.field('長照需要等級 CMS', F.select('cmsLevel', CMS_LEVELS.slice(1).map((l, i) => [i + 1, l]), { t:'num' }))}
    ${F.field('收案日期', F.date('admitDate'), { req:true })}
    ${F.field('服務狀態', F.select('status', ['服務中', '暫停', '結案'], { blank:false }))}
    ${F.field('結案日期', F.date('closeDate'))}
    ${F.field('固定到班日', `<div class="pills">${[1, 2, 3, 4, 5, 6, 7].map(w => F.checkArr('attendDays', w, '週' + WEEKDAYS[w], true)).join('')}</div>`, { cls:'span2' })}
    ${F.field('主要診斷／疾病史', F.text('diagnoses', { rows:2, ph:'例：腦中風（右側偏癱）、高血壓、糖尿病' }), { cls:'span2' })}
    ${F.field('失智症', F.check('dementia', '已確診失智症'))}
    ${F.field('飲食質地', F.select('diet', ['一般', '軟質', '細碎', '泥狀', '流質', '管灌']))}
    ${F.field('使用輔具', F.input('aids', { ph:'例：四腳拐、輪椅、助行器' }))}
    ${F.field('過敏／特殊注意', F.input('allergy'))}
    ${F.field('主要照顧者', F.input('cgName'))}
    ${F.field('關係', F.input('cgRel', { ph:'例：女兒' }))}
    ${F.field('聯絡電話', F.input('cgPhone', { type:'tel' }))}
    ${F.field('備註', F.input('note'))}
  </div>`;
  openModal(id ? '編輯個案資料' : '新增個案', html, { wide:true, onSave:() => {
    if (!S.edit.name?.trim()) { toast('請填寫姓名', 'err'); return false; }
    if (!S.edit.admitDate) { toast('請填寫收案日期', 'err'); return false; }
    if (S.edit.status === '結案' && !S.edit.closeDate) S.edit.closeDate = todayISO();
    const saved = Store.upsert('clients', S.edit); S.dirty = false;
    toast('已儲存個案資料');
    if (!id) App.go('#/client/' + saved.id); else route();
  }, restore:() => { S.dirty = false; } });
}

/* ---------------- 個案詳細 ---------------- */
const CLIENT_TABS = [['overview', '概要'], ['assess', '評估紀錄'], ['plan', '復能處方'], ['exec', '執行紀錄'], ['outcome', '成效歷程'], ['contacts', '家屬聯繫'], ['incidents', '意外事件']];
function pageClient(id, tab){
  const c = Store.get('clients', id); if (!c) { App.go('#/clients'); return ''; }
  setTitle(c.name, [c.gender, ageAt(c.birth) ? ageAt(c.birth) + '歲' : '', CMS_LEVELS[c.cmsLevel]].filter(Boolean).join('・'));
  const body = { overview:clientOverview, assess:clientAssess, plan:clientPlans, exec:clientExec, outcome:clientOutcome, contacts:clientContacts, incidents:clientIncidents }[tab] || clientOverview;
  return `
  <div class="toolbar">
    <a class="btn" href="#/clients">${icon('back', 16)}個案列表</a>
    <span class="sp"></span>
    ${btn('編輯基本資料', `editClient('${c.id}')`, { i:'edit' })}
    <a class="btn" href="#/assess/new/${c.id}/${Logic.lastAssessment(c.id) ? '再評' : '初評'}">${icon('clip', 16)}${Logic.lastAssessment(c.id) ? '進行再評估' : '進行初評'}</a>
    ${btn('列印復能歷程報告', `printClientDossier('${c.id}')`, { i:'print' })}
  </div>
  <div class="tabs" role="tablist">${CLIENT_TABS.map(([k, l]) => `<a role="tab" href="#/client/${c.id}/${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}</div>
  ${body(c)}`;
}
function infoGrid(pairs){ return `<dl class="info">${pairs.filter(p => p[1] !== undefined).map(([k, v]) => `<div><dt>${k}</dt><dd>${v || '—'}</dd></div>`).join('')}</dl>`; }

function clientOverview(c){
  const ck = Logic.clientChecks(c), plan = ck.plan, last = ck.last, today = todayISO();
  const chk = (ok, t, extra = '') => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✕'} ${t}${extra ? ' <small>' + extra + '</small>' : ''}</li>`;
  return `<div class="grid2">
    <section class="card"><h2>基本資料</h2>${infoGrid([
      ['收案日', rocDate(c.admitDate)], ['狀態', esc(c.status)], ['到班日', (c.attendDays || []).map(w => '週' + WEEKDAYS[w]).join('、')],
      ['診斷', esc(c.diagnoses)], ['失智症', c.dementia ? '是' : '否'], ['飲食質地', esc(c.diet)], ['輔具', esc(c.aids)], ['過敏/注意', esc(c.allergy)],
      ['主要照顧者', esc([c.cgName, c.cgRel].filter(Boolean).join('／'))], ['電話', esc(c.cgPhone)]])}</section>
    <section class="card"><h2>評鑑 B1 個案檢核</h2><ul class="checks">
      ${chk(!!last, '已完成需求評估', last ? rocDate(last.date) + ' ' + last.type : '')}
      ${chk(ck.domains, '評估涵蓋生理、心理認知、家庭社會支持、重大生命事件')}
      ${chk(ck.hasPlan, '訂有個別化復能處方（服務計畫）', plan ? 'v' + plan.version + '，' + rocDate(plan.startDate) + ' 起' : '')}
      ${chk(ck.planFromAssess, '處方依評估結果訂定問題、目標與項目')}
      ${chk(ck.execRecorded, '近30天執行紀錄完整（缺漏<20%）', ck.st ? `執行率 ${ck.st.rate ?? '—'}%，未記錄 ${ck.st.missing} 筆` : '')}
      ${chk(ck.reassessOK, '再評估未逾期（≤6個月）', ck.reassessDue ? '下次：' + rocDate(ck.reassessDue.date) : '')}
      ${chk(ck.referralOK, '依需求轉介', ck.flagged.length ? ck.flagged.map(f => f.referral).join('；') : '無轉介需求')}
      ${chk(ck.lastContact && diffDays(ck.lastContact, today) <= 90, '近3個月有家屬聯繫紀錄（B8）', ck.lastContact ? '最近：' + rocDate(ck.lastContact) : '')}
    </ul></section>
  </div>
  <section class="card"><h2>目前生效的復能處方 ${plan ? `<small>v${plan.version}｜開立：${esc(staffName(plan.prescriberId))}｜預定再評：${rocDate(plan.reviewDate)}</small>` : ''}</h2>
    ${plan ? planSummary(plan) : empty('尚未開立復能處方', last ? `<a class="btn primary" href="#/plan/new/${c.id}?from=${last.id}">依最新評估開立處方</a>` : `<a class="btn primary" href="#/assess/new/${c.id}/初評">先進行初評</a>`)}
  </section>`;
}
function planSummary(p){
  return `<div class="grid2 tight">
    <div><h3>問題</h3><ol class="list">${(p.problems || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li class="muted">—</li>'}</ol>
    <h3>長期目標</h3><p>${esc(p.longGoal || '—')}</p>
    <h3>短期目標</h3><ol class="list">${(p.goals || []).map(g => `<li>${esc(g.text)} <small class="muted">（${esc(g.measure || '')}：${esc(g.baseline || '?')} → ${esc(g.target || '?')}，${rocDate(g.due)}）</small></li>`).join('') || '<li class="muted">—</li>'}</ol></div>
    <div><h3>處方項目</h3><table class="tbl sm"><thead><tr><th>項目</th><th>劑量</th><th>頻率</th></tr></thead><tbody>${(p.items || []).map(it => `<tr><td>${esc(it.name)}${it.selfcare ? ' ' + badge('自立', 'green') : ''}</td><td>${esc(it.dose)}</td><td>${(it.days || []).map(w => WEEKDAYS[w]).join('')}</td></tr>`).join('')}</tbody></table>
    ${(p.referrals || []).filter(r => r.to).length ? `<h3>轉介</h3><ul class="list">${p.referrals.filter(r => r.to).map(r => `<li>${esc(r.to)}：${esc(r.reason || '')} ${r.result ? '→ ' + esc(r.result) : ''}</li>`).join('')}</ul>` : ''}</div>
  </div>`;
}

function clientAssess(c){
  const as = Logic.assessmentsOf(c.id).reverse();
  if (!as.length) return `<section class="card">${empty('尚無評估紀錄', `<a class="btn primary" href="#/assess/new/${c.id}/初評">進行初評</a>`)}</section>`;
  return `<section class="card flush"><div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>日期</th><th>類別</th><th>評估者</th><th>巴氏</th><th>IADL</th><th>SPMSQ錯</th><th>TUG秒</th><th>30秒坐站</th><th>握力</th><th>步速</th><th>GDS</th><th>MNA</th><th></th></tr></thead>
    <tbody>${as.map(a => { const b = scoreBarthel(a), i = scoreIADL(a), s = scoreSPMSQ(a), g = scoreGDS(a), m = scoreMNA(a), p = a.phy || {};
      return `<tr><td>${rocDate(a.date)}</td><td>${badge(a.type)}</td><td>${esc(staffName(a.assessorId))}</td><td>${b ? b.total : '—'}</td><td>${i ? i.total + '/8' : '—'}</td><td>${s ? s.errors : '—'}</td><td>${p.tug || '—'}</td><td>${p.cs30 || '—'}</td><td>${p.grip || '—'}</td><td>${gaitSpeed(a) ?? '—'}</td><td>${g ? g.total : '—'}</td><td>${m ? m.total : '—'}</td>
      <td class="nowrap"><a class="btn sm" href="#/assess/${a.id}">開啟</a> ${btn('列印', `printAssessment('${a.id}')`, { k:'sm' })}</td></tr>`; }).join('')}</tbody></table></div></section>`;
}

function clientPlans(c){
  const ps = Logic.plansOf(c.id).reverse(), active = Logic.activePlan(c.id), last = Logic.lastAssessment(c.id);
  return `<div class="toolbar">${last ? `<a class="btn primary" href="#/plan/new/${c.id}?from=${last.id}${active ? '&revise=' + active.id : ''}">${icon('rx', 16)}${active ? '依最新評估修正處方' : '依最新評估開立處方'}</a>` : ''}
    ${active ? `<a class="btn" href="#/plan/new/${c.id}?revise=${active.id}">小幅修正（不重新評估）</a>${btn('列印處方箋', `printPlan('${active.id}')`, { i:'print' })}` : ''}</div>
  ${ps.length ? ps.map(p => `<section class="card ${p.status === '執行中' ? 'hl' : 'dim'}"><h2>v${p.version}　${badge(p.status, p.status === '執行中' ? 'green' : '')}
    <small>${rocDate(p.startDate)} ～ ${p.endDate ? rocDate(p.endDate) : '（預定再評 ' + rocDate(p.reviewDate) + '）'}｜開立：${esc(staffName(p.prescriberId))}</small>
    <span class="sp"></span><a class="btn sm" href="#/plan/${p.id}">${p.status === '執行中' ? '編輯' : '檢視'}</a>${btn('列印', `printPlan('${p.id}')`, { k:'sm' })}</h2>
    ${p.changeReason ? `<div class="notice">修正理由：${esc(p.changeReason)}</div>` : ''}${planSummary(p)}</section>`).join('') : `<section class="card">${empty('尚無處方')}</section>`}`;
}

function clientExec(c){
  const today = todayISO(), from = addDays(today, -27), idx = Logic.index();
  const days = []; for (let d = from; d <= today; d = addDays(d, 1)) days.push(d);
  const plan = Logic.activePlan(c.id); const items = plan ? plan.items : [];
  const st = Logic.execStats(c, from, today, idx);
  const sym = { 完成:'✓', 部分:'△', 未執行:'✕' };
  const grid = items.map(it => `<tr><th class="sticky">${esc(it.name)}</th>${days.map(d => {
    const p = Logic.planOn(c.id, d), sched = Logic.itemsOn(p, d).some(x => x.id === it.id) && Logic.expected(c, d, idx);
    const e = idx.ex.get(c.id + '|' + it.id + '|' + d);
    return `<td class="g ${e ? 'g-' + ({ 完成:'ok', 部分:'part', 未執行:'skip' })[e.status] : sched && d <= today ? 'g-miss' : ''}" title="${rocDate(d)} ${e ? e.status + (e.reason ? '（' + e.reason + '）' : '') + (e.note ? '：' + e.note : '') : sched ? '未記錄' : ''}">${e ? sym[e.status] : sched ? '·' : ''}</td>`; }).join('')}<td>${st.byItem[it.id] ? Math.round((st.byItem[it.id].done + st.byItem[it.id].partial * 0.5) / st.byItem[it.id].expected * 100) + '%' : '—'}</td></tr>`).join('');
  const notes = Store.all('execs').filter(e => e.clientId === c.id && (e.note || e.tolerance === '疲累' || e.tolerance === '不適停止')).sort(byDate('date')).reverse().slice(0, 30);
  return `<section class="card"><h2>近4週執行狀況 <small>執行率 ${st.rate ?? '—'}%｜完成 ${st.done}｜部分 ${st.partial}｜未執行 ${st.skipped}｜未記錄 ${st.missing}</small></h2>
    ${items.length ? `<div class="tbl-wrap"><table class="grid-t"><thead><tr><th class="sticky">項目</th>${days.map(d => `<th class="${[6, 7].includes(weekday(d)) ? 'we' : ''}">${d.slice(8)}<br><small>${WEEKDAYS[weekday(d)]}</small></th>`).join('')}<th>執行率</th></tr></thead><tbody>${grid}</tbody></table></div>
    <p class="legend"><span class="g g-ok">✓</span>完成 <span class="g g-part">△</span>部分 <span class="g g-skip">✕</span>未執行 <span class="g g-miss">·</span>應執行未記錄</p>` : empty('目前沒有生效處方')}</section>
  <section class="card"><h2>照服員觀察紀錄</h2>${notes.length ? `<ul class="feed">${notes.map(e => `<li><time>${rocDate(e.date)}</time><b>${esc(e.itemName || '')}</b> ${e.tolerance ? badge(e.tolerance, e.tolerance === '不適停止' ? 'red' : e.tolerance === '疲累' ? 'amber' : '') : ''} ${e.assist ? badge(e.assist) : ''}<p>${esc(e.note || '')}</p><small>${esc(staffName(e.staffId || e.updatedBy))}</small></li>`).join('')}</ul>` : empty('尚無觀察紀錄')}</section>`;
}

function clientOutcome(c){
  const as = Logic.assessmentsOf(c.id);
  const pts = f => as.map(a => ({ x:a.date, y:f(a) }));
  const charts = [
    ['巴氏量表 ADL（0–100）', pts(a => scoreBarthel(a)?.partial ? null : scoreBarthel(a)?.total), { min:0, max:100 }],
    ['IADL（0–8）', pts(a => scoreIADL(a)?.total), { min:0, max:8 }],
    ['TUG 起身行走（秒，越低越好）', pts(a => a.phy?.tug), { cut:PHY_CUT.tug, cutLabel:'跌倒風險 13.5秒' }],
    ['30秒坐站（次）', pts(a => a.phy?.cs30), { min:0, cut:ageAt(c.birth) ? cs30Cut(ageAt(c.birth), c.gender) : null, cutLabel:'同齡平均下限' }],
    ['握力（公斤）', pts(a => a.phy?.grip), { min:0, cut:c.gender === '男' ? PHY_CUT.gripM : PHY_CUT.gripF, cutLabel:'AWGS 切點' }],
    ['步行速度（公尺/秒）', pts(a => gaitSpeed(a)), { min:0, cut:PHY_CUT.gait, cutLabel:'1.0 m/s' }],
  ];
  const reviews = as.flatMap(a => (a.goalReview || []).map(g => ({ ...g, date:a.date })));
  const copm = as.filter(a => (a.copm || []).some(x => x.activity));
  return `<div class="charts">${charts.map(([t, p, o]) => `<section class="card"><h3>${t}</h3>${lineChart(p, { ...o, title:t })}</section>`).join('')}</div>
  <section class="card"><h2>短期目標達成（GAS）</h2>${reviews.length ? `<table class="tbl"><thead><tr><th>再評日期</th><th>目標</th><th>現值</th><th>GAS</th><th>說明</th></tr></thead><tbody>${reviews.map(g => `<tr><td>${rocDate(g.date)}</td><td>${esc(g.text)}</td><td>${esc(g.current || '')}</td><td>${badge((GAS.find(x => x[0] === +g.gas) || ['', '—'])[1], +g.gas >= 0 ? 'green' : 'amber')}</td><td>${esc(g.note || '')}</td></tr>`).join('')}</tbody></table>` : empty('再評估時評定目標達成度後會顯示於此')}</section>
  <section class="card"><h2>個案有意義活動（自評表現/滿意度 1–10）</h2>${copm.length ? `<table class="tbl"><thead><tr><th>評估日期</th><th>活動</th><th>重要性</th><th>表現</th><th>滿意度</th></tr></thead><tbody>${copm.flatMap(a => a.copm.filter(x => x.activity).map(x => `<tr><td>${rocDate(a.date)}</td><td>${esc(x.activity)}</td><td>${x.imp ?? ''}</td><td>${x.perf ?? ''}</td><td>${x.sat ?? ''}</td></tr>`)).join('')}</tbody></table><p class="hint">表現或滿意度提升 ≥2 分具臨床意義。</p>` : empty('尚無資料')}</section>`;
}

function clientContacts(c){
  const list = Store.all('contacts').filter(x => x.clientId === c.id).sort(byDate('date')).reverse();
  return `<div class="toolbar">${btn('新增聯繫紀錄', `editContact(null,'${c.id}')`, { k:'primary', i:'plus' })}</div>
  <section class="card">${list.length ? `<ul class="feed">${list.map(x => `<li><time>${rocDate(x.date)}</time>${badge(x.method)} <b>${esc(x.person || '')}</b><p>${esc(x.content || '')}</p><small>${esc(staffName(x.staffId))}</small> <a href="javascript:editContact('${x.id}')">編輯</a></li>`).join('')}</ul>` : empty('尚無聯繫紀錄。評鑑 B8 要求與照顧者主動聯繫並留有紀錄（聯絡本、電話、LINE、座談會等）。')}</section>`;
}
function editContact(id, cid){
  S.edit = id ? clone(Store.get('contacts', id)) : { clientId:cid, date:todayISO(), method:'電話', staffId:App.currentUserId() };
  openModal(id ? '編輯聯繫紀錄' : '新增家屬聯繫紀錄', `<div class="form-grid">
    ${F.field('日期', F.date('date'), { req:true })}${F.field('方式', F.select('method', ['電話', 'LINE/通訊軟體', '聯絡簿', '面談', '家訪', '家屬座談會', '其他'], { blank:false }))}
    ${F.field('聯繫對象', F.input('person', { ph:'例：女兒 王小姐' }))}${F.field('紀錄人', F.select('staffId', staffOpts()))}
    ${F.field('內容（含復能處方說明、居家延續建議、家屬回饋）', F.text('content', { rows:4 }), { cls:'span2' })}</div>`,
    { wide:true, extra:id ? btn('刪除', `if(askConfirm('確定刪除？')){Store.remove('contacts','${id}');closeModal(true);route()}`, { k:'danger' }) : '', onSave:() => { Store.upsert('contacts', S.edit); S.dirty = false; toast('已儲存'); route(); }, restore:() => { S.dirty = false; } });
}
function clientIncidents(c){
  const list = Store.all('incidents').filter(x => x.clientId === c.id).sort(byDate('datetime')).reverse();
  return `<div class="toolbar"><a class="btn primary" href="#/incident/new?client=${c.id}">${icon('plus', 16)}登錄意外事件</a></div>
  <section class="card">${list.length ? incidentTable(list) : empty('無意外事件紀錄')}</section>`;
}
