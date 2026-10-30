/* ================================================================
   頁面：個案討論會、意外事件、活動與訓練、評鑑與成效、設定
   ================================================================ */

/* ---------------- 跨專業個案討論會（B1-6） ---------------- */
function pageMeetings(){
  setTitle('跨專業個案討論會', '每3個月至少1次，至少3種專業參與');
  const ms = Logic.meetings().reverse(), lm = ms[0];
  const od = Logic.openDecisions();
  return `<div class="toolbar"><a class="btn primary" href="#/meeting/new">${icon('plus', 16)}新增會議紀錄</a><span class="sp"></span>
    ${lm ? `<span class="muted">上次：${rocDate(lm.date)}｜下次最遲：<b>${rocDate(addMonths(lm.date, MEETING_MONTHS))}</b></span>` : ''}</div>
  <section class="card"><h2>未完成決議 <small>${od.length} 項</small></h2>${od.length ? `<table class="tbl"><thead><tr><th>會議</th><th>個案</th><th>決議事項</th><th>負責人</th><th>期限</th><th>狀態</th></tr></thead><tbody>${od.map(d => `<tr><td>${rocDate(d.meetingDate)}</td><td>${esc(d.clientId ? clientName(d.clientId) : '—')}</td><td>${esc(d.text)}</td><td>${esc(staffName(d.owner))}</td><td>${rocDate(d.due)} ${d.due && d.due < todayISO() ? badge('逾期', 'red') : ''}</td><td>${badge(d.status || '待執行')}</td></tr>`).join('')}</tbody></table>` : empty('沒有未完成的決議')}</section>
  <section class="card flush"><table class="tbl"><thead><tr><th>日期</th><th>類型</th><th>參與專業</th><th>討論個案</th><th>決議數</th><th></th></tr></thead><tbody>
  ${ms.map(m => { const dis = Logic.meetingDisciplines(m); return `<tr class="click" onclick="App.go('#/meeting/${m.id}')"><td>${rocDate(m.date)}</td><td>${esc(m.type)}</td><td>${dis.length} 種 ${dis.length < 3 ? badge('未達3種', 'red') : ''}<br><small class="muted">${esc(dis.join('、'))}</small></td><td>${(m.cases || []).map(x => esc(clientName(x.clientId))).join('、')}</td><td>${(m.decisions || []).length}</td><td>${btn('列印', `event.stopPropagation();printMeeting('${m.id}')`, { k:'sm' })}</td></tr>`; }).join('') || `<tr><td colspan="6">${empty('尚無會議紀錄')}</td></tr>`}
  </tbody></table></section>`;
}
function pageMeetingEdit(id){
  let m;
  if (id === 'new') {
    m = { date:todayISO(), type:'定期跨專業個案討論會', hostId:App.currentUserId(), attendees:App.currentUserId() ? [App.currentUserId()] : [], external:[], cases:[], decisions:[], followups:[], content:'' };
    m.followups = Logic.openDecisions().map(d => ({ meetingId:d.meetingId, decisionId:d.id, text:d.text, clientId:d.clientId, owner:d.owner, status:d.status || '待執行', note:'' }));
    // 預設帶入需討論個案：再評逾期/即將到期、連續未執行、照服員警示
    const want = new Set();
    Store.all('clients').filter(c => c.status === '服務中').forEach(c => { const d = Logic.reassessDue(c.id); if (!d || diffDays(todayISO(), d.date) <= 30) want.add(c.id); });
    Logic.repeatedSkips().forEach(s => want.add(s.client.id)); Logic.alerts().forEach(e => want.add(e.clientId));
    m.cases = [...want].map(cid => ({ clientId:cid, discussion:'' }));
  } else m = clone(Store.get('meetings', id) || {});
  if (!m.date) { App.go('#/meetings'); return ''; }
  S.edit = m; setTitle(id === 'new' ? '新增個案討論會紀錄' : '個案討論會 ' + rocDate(m.date));
  S.onEdit = p => { if (p === 'attendees') { const el = $('#dis'); if (el) el.innerHTML = disHTML(); } };
  return meetingHTML();
}
function disHTML(){ const d = Logic.meetingDisciplines(S.edit); return `參與專業 <b>${d.length}</b> 種：${esc(d.join('、') || '—')} ${d.length >= 3 ? badge('符合 ≥3 種', 'green') : badge('未達3種專業', 'red')}`; }
function meetingHTML(){
  const m = S.edit;
  const staff = Store.all('staff').filter(s => s.active !== false || (m.attendees || []).includes(s.id));
  const caseInfo = cid => { const c = Store.get('clients', cid); if (!c) return ''; const ck = Logic.clientChecks(c); const b = scoreBarthel(ck.last); return `<small class="muted">巴氏 ${b ? b.total : '—'}｜處方 ${ck.plan ? 'v' + ck.plan.version : '無'}｜近30天執行率 ${ck.st?.rate ?? '—'}%｜再評 ${ck.reassessDue ? rocDate(ck.reassessDue.date) : '未評估'}</small>`; };
  return `<div class="toolbar sticky-bar"><a class="btn" href="#/meetings">${icon('back', 16)}會議列表</a><span class="sp"></span>
    ${m.id ? btn('刪除', `if(askConfirm('確定刪除此會議紀錄？')){Store.remove('meetings','${m.id}');S.dirty=false;App.go('#/meetings')}`, { k:'danger ghost', i:'trash' }) + btn('列印', `printMeeting('${m.id}')`, { i:'print' }) : ''}${btn('儲存', 'saveMeeting()', { k:'primary', i:'check' })}</div>
  <section class="card"><h2>會議資訊</h2><div class="form-grid g3">
    ${F.field('會議日期', F.date('date'), { req:true })}${F.field('類型', F.select('type', ['定期跨專業個案討論會', '臨時個案討論會', '出院/轉銜討論會'], { blank:false }))}${F.field('主席', F.select('hostId', staffOpts()))}</div>
    ${F.field('出席人員', `<div class="pills">${staff.map(s => F.checkArr('attendees', s.id, `${s.name}（${s.role}）`)).join('')}</div>`)}
    <h3>外部專業人員</h3>${(m.external || []).map((x, i) => `<div class="row-edit">${F.input(`external.${i}.name`, { ph:'姓名' })}${F.input(`external.${i}.discipline`, { ph:'專業，例：營養師（特約）', attrs:'onchange="setTimeout(()=>{const el=$(\'#dis\');if(el)el.innerHTML=disHTML()},0)"' })}${btn('✕', `S.edit.external.splice(${i},1);rerender(meetingHTML)`, { k:'sm ghost' })}</div>`).join('')}
    ${btn('新增外部人員', `S.edit.external.push({});rerender(meetingHTML)`, { k:'sm', i:'plus' })}
    <div class="notice" id="dis">${disHTML()}</div>
  </section>
  <section class="card"><h2>前次決議追蹤 <small>評鑑要求紀錄應包含前次決議之追蹤及檢討</small></h2>
    ${(m.followups || []).length ? `<table class="tbl"><thead><tr><th>決議事項</th><th>個案</th><th>負責人</th><th>執行狀態</th><th>追蹤說明</th></tr></thead><tbody>${m.followups.map((f, i) => `<tr><td>${esc(f.text)}</td><td>${esc(f.clientId ? clientName(f.clientId) : '')}</td><td>${esc(staffName(f.owner))}</td><td>${F.select(`followups.${i}.status`, ['待執行', '執行中', '已完成'], { blank:false })}</td><td>${F.input(`followups.${i}.note`)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">無前次未完成決議。</p>'}
  </section>
  <section class="card"><h2>個案討論</h2>
    ${(m.cases || []).map((x, i) => `<div class="case-b"><div class="ic-h"><b>${esc(clientName(x.clientId))}</b>${caseInfo(x.clientId)}<span class="sp"></span>${btn('移除', `S.edit.cases.splice(${i},1);rerender(meetingHTML)`, { k:'sm ghost' })}</div>${F.text(`cases.${i}.discussion`, { rows:3, ph:'各專業意見：功能變化、處方執行狀況、困難、建議調整…' })}</div>`).join('')}
    <div class="row-edit"><select class="inp" id="addcase"><option value="">— 加入討論個案 —</option>${clientOpts().filter(([v]) => !(m.cases || []).some(x => x.clientId === v)).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select>${btn('加入', `const v=$('#addcase').value;if(v){S.edit.cases.push({clientId:v,discussion:''});rerender(meetingHTML)}`, { k:'sm' })}</div>
    ${F.field('其他討論事項', F.text('content', { rows:3 }))}
  </section>
  <section class="card"><h2>本次決議</h2>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>決議事項</th><th>個案</th><th>負責人</th><th>期限</th><th></th></tr></thead><tbody>
    ${(m.decisions || []).map((d, i) => `<tr><td>${F.input(`decisions.${i}.text`)}</td><td>${F.select(`decisions.${i}.clientId`, clientOpts())}</td><td>${F.select(`decisions.${i}.owner`, staffOpts())}</td><td>${F.date(`decisions.${i}.due`)}</td><td>${btn('✕', `S.edit.decisions.splice(${i},1);rerender(meetingHTML)`, { k:'sm ghost' })}</td></tr>`).join('')}
    </tbody></table></div>${btn('新增決議', `S.edit.decisions.push({id:Store.newId(),status:'待執行',due:addMonths(S.edit.date,1)});rerender(meetingHTML)`, { k:'sm', i:'plus' })}
  </section>`;
}
function saveMeeting(){
  const m = S.edit;
  if (!m.date) return toast('請填寫會議日期', 'err');
  m.decisions = (m.decisions || []).filter(d => d.text?.trim());
  const dis = Logic.meetingDisciplines(m);
  if (dis.length < 3 && !askConfirm(`參與專業僅 ${dis.length} 種，評鑑要求至少3種不同專業。仍要儲存嗎？`)) return;
  for (const f of m.followups || []) { const src = Store.get('meetings', f.meetingId); const d = src?.decisions?.find(x => x.id === f.decisionId); if (d) { d.status = f.status; d.followNote = f.note; d.followedAt = m.date; Store.upsert('meetings', src); } }
  Store.upsert('meetings', m); S.dirty = false; toast('會議紀錄已儲存'); App.go('#/meetings');
}

/* ---------------- 意外事件（B5／B6） ---------------- */
const INC_TYPES = ['跌倒', '嗆噎', '走失', '外傷/瘀傷', '急症送醫', '用藥錯誤', '衝突/行為事件', '其他'];
function incidentTable(list){
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>時間</th><th>個案</th><th>類型</th><th>地點</th><th>送醫</th><th>家屬通知</th><th>分析/改善</th><th>狀態</th></tr></thead><tbody>${list.map(i => `<tr class="click" onclick="App.go('#/incident/${i.id}')"><td>${rocDate(i.datetime)} ${(i.datetime || '').slice(11, 16)}</td><td>${esc(clientName(i.clientId))}</td><td>${badge(i.type, i.type === '跌倒' ? 'amber' : '')}</td><td>${esc(i.place || '')}</td><td>${i.toHospital ? '是' : '否'}</td><td>${i.familyAt ? '✓' : badge('未記錄', 'red')}</td><td>${i.analysis && i.improvement ? '✓' : badge('待補', 'amber')}</td><td>${i.closed ? badge('結案', 'green') : badge('追蹤中')}</td></tr>`).join('')}</tbody></table></div>`;
}
function pageIncidents(){
  setTitle('意外事件', '紀錄、分析、改善與追蹤');
  const list = Store.all('incidents').sort(byDate('datetime')).reverse();
  const yr = todayISO().slice(0, 4), thisYear = list.filter(i => i.datetime?.startsWith(yr));
  const byType = {}; thisYear.forEach(i => byType[i.type] = (byType[i.type] || 0) + 1);
  return `<div class="toolbar"><a class="btn primary" href="#/incident/new">${icon('plus', 16)}登錄意外事件</a><span class="sp"></span>${btn('匯出年度事件分析 CSV', 'exportIncidents()', { i:'download' })}</div>
  <section class="card"><h2>${+yr - 1911}年度統計 <small>共 ${thisYear.length} 件</small></h2><div class="kpis sm">${Object.entries(byType).map(([k, v]) => `<div class="kpi"><div class="k-n">${v}</div><div class="k-l">${esc(k)}</div></div>`).join('') || '<p class="muted">本年度無事件</p>'}</div></section>
  <section class="card flush">${list.length ? incidentTable(list) : empty('尚無意外事件紀錄')}</section>`;
}
function pageIncidentEdit(id, params){
  const i = id === 'new' ? { datetime:new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16), clientId:params.get('client') || '', type:'跌倒', reporterId:App.currentUserId(), toHospital:false, closed:false } : clone(Store.get('incidents', id) || {});
  if (!i.datetime) { App.go('#/incidents'); return ''; }
  S.edit = i; setTitle(id === 'new' ? '登錄意外事件' : '意外事件紀錄');
  return `<div class="toolbar sticky-bar"><a class="btn" href="#/incidents">${icon('back', 16)}事件列表</a><span class="sp"></span>
    ${i.id ? btn('刪除', `if(askConfirm('確定刪除？')){Store.remove('incidents','${i.id}');S.dirty=false;App.go('#/incidents')}`, { k:'danger ghost', i:'trash' }) + btn('列印', `printIncident('${i.id}')`, { i:'print' }) : ''}${btn('儲存', 'saveIncident()', { k:'primary', i:'check' })}</div>
  <section class="card"><h2>事件經過</h2><div class="form-grid g3">
    ${F.field('發生時間', F.input('datetime', { type:'datetime-local' }), { req:true })}${F.field('個案', F.select('clientId', clientOpts(true)), { req:true })}${F.field('事件類型', F.select('type', INC_TYPES, { blank:false }))}
    ${F.field('地點', F.input('place', { ph:'例：廁所、活動區' }))}${F.field('發現/通報人', F.select('reporterId', staffOpts()))}${F.field('傷害程度', F.select('severity', ['無傷害', '輕度（瘀青擦傷）', '中度（需就醫處置）', '重度（骨折/住院）']))}
    ${F.field('事件經過', F.text('description', { rows:3 }), { cls:'span3' })}${F.field('立即處理', F.text('handling', { rows:2 }), { cls:'span3' })}</div></section>
  <section class="card"><h2>送醫與家屬聯繫（B6）</h2><div class="form-grid g3">
    ${F.field('是否送醫', F.check('toHospital', '已送醫'))}${F.field('就醫院所', F.input('hospital'))}${F.field('送醫前緊急處置', F.input('preCare'))}
    ${F.field('家屬通知時間', F.input('familyAt', { type:'datetime-local' }))}${F.field('通知對象/方式', F.input('familyWho'))}${F.field('家屬回應', F.input('familyNote'))}</div></section>
  <section class="card"><h2>分析與改善（B5）</h2><div class="form-grid">
    ${F.field('原因分析（個人/環境/照護流程）', F.text('analysis', { rows:3 }), { cls:'span2' })}${F.field('改善措施', F.text('improvement', { rows:3, ph:'例：調整處方加入平衡訓練、廁所增設扶手、如廁時改為近身監督' }), { cls:'span2' })}
    ${F.field('追蹤結果', F.text('followUp', { rows:2 }), { cls:'span2' })}${F.field('結案', F.check('closed', '已完成追蹤並結案'))}</div>
    ${i.type === '跌倒' && i.clientId ? `<div class="notice">跌倒事件建議同步檢討復能處方：<a href="#/client/${i.clientId}/plan">前往處方</a></div>` : ''}</section>`;
}
function saveIncident(){ const i = S.edit; if (!i.datetime || !i.clientId) return toast('請填寫發生時間與個案', 'err'); if (i.closed && (!i.analysis || !i.improvement) && !askConfirm('尚未填寫原因分析或改善措施，仍要結案嗎？')) return; Store.upsert('incidents', i); S.dirty = false; toast('已儲存'); App.go('#/incidents'); }
function exportIncidents(){ exportCSV('意外事件_' + todayISO() + '.csv', ['發生時間', '個案', '類型', '地點', '傷害程度', '經過', '立即處理', '送醫', '院所', '家屬通知', '原因分析', '改善措施', '追蹤', '結案'], Store.all('incidents').sort(byDate('datetime')).map(i => [i.datetime, clientName(i.clientId), i.type, i.place, i.severity, i.description, i.handling, i.toHospital ? '是' : '否', i.hospital, i.familyAt, i.analysis, i.improvement, i.followUp, i.closed ? '是' : '否'])); }

/* ---------------- 活動與訓練（B7／B8／B11） ---------------- */
const ACT_KINDS = ['團體活動', '社區活動', '照顧者支持活動', '員工教育訓練'];
let actFilter = '';
function pageActivities(){
  setTitle('活動與教育訓練', 'B7 團體/社區活動・B8 照顧者支持・B11 教育訓練');
  const list = Store.all('activities').filter(a => !actFilter || a.kind === actFilter).sort(byDate('date')).reverse();
  return `<div class="toolbar">${ACT_KINDS.map(k => btn('新增' + k, `editActivity(null,'${k}')`, { k:'sm', i:'plus' })).join('')}<span class="sp"></span>
    <select class="inp" onchange="actFilter=this.value;route()" aria-label="篩選">${['', ...ACT_KINDS].map(k => `<option value="${k}" ${actFilter === k ? 'selected' : ''}>${k || '全部類別'}</option>`).join('')}</select></div>
  <section class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>日期</th><th>類別</th><th>名稱</th><th>性質/時數</th><th>參與</th></tr></thead><tbody>
  ${list.map(a => `<tr class="click" onclick="editActivity('${a.id}')"><td>${rocDate(a.date)}</td><td>${badge(a.kind)}</td><td>${esc(a.title)}</td><td>${a.kind === '員工教育訓練' ? (a.hours || 0) + ' 小時' + (a.infection ? ' ' + badge('感管') : '') + (a.selfcareTopic ? ' ' + badge('自我照顧', 'green') : '') : esc(a.nature || '')}</td><td>${a.kind === '員工教育訓練' ? (a.staffIds || []).length + ' 位員工' : (a.clientIds || []).length + ' 位長輩' + (a.familyCount ? '、家屬 ' + a.familyCount + ' 人' : '')}</td></tr>`).join('') || `<tr><td colspan="5">${empty('尚無紀錄')}</td></tr>`}
  </tbody></table></div></section>`;
}
function editActivity(id, kind){
  S.edit = id ? clone(Store.get('activities', id)) : { date:todayISO(), kind, title:'', clientIds:[], staffIds:[], leaderId:App.currentUserId() };
  const a = S.edit, tr = a.kind === '員工教育訓練';
  const html = `<div class="form-grid">
    ${F.field('日期', F.date('date'), { req:true })}${F.field('類別', F.select('kind', ACT_KINDS, { blank:false }))}
    ${F.field('名稱/主題', F.input('title'), { req:true, cls:'span2' })}
    ${tr ? `${F.field('時數', F.num('hours', { min:0, step:0.5 }))}${F.field('辦理單位', F.input('org'))}
      ${F.field('課程屬性', F.check('infection', '感染管制課程') + F.check('selfcareTopic', '提升服務對象自我照顧能力（如肌力、移位、吞嚥訓練）'), { cls:'span2' })}
      ${F.field('參訓人員', `<div class="pills">${Store.all('staff').map(s => F.checkArr('staffIds', s.id, s.name)).join('')}</div>`, { cls:'span2' })}`
    : `${F.field('性質', F.select('nature', ['動態', '靜態', '輔療', '綜合']))}${F.field('帶領人', F.select('leaderId', staffOpts()))}
      ${F.field('參與長輩', `<div class="pills">${clientOpts().map(([v, l]) => F.checkArr('clientIds', v, l)).join('')}</div>`, { cls:'span2' })}
      ${F.field('家屬/社區參與人數', F.num('familyCount', { min:0 }))}${F.field('鼓勵參與策略', F.input('strategy', { ph:'例：邀請熟識長輩同組、擔任小老師' }))}`}
    ${F.field('內容與成效', F.text('content', { rows:3 }), { cls:'span2' })}</div>`;
  openModal((id ? '編輯' : '新增') + a.kind, html, { wide:true, extra:id ? btn('刪除', `if(askConfirm('確定刪除？')){Store.remove('activities','${id}');closeModal(true);route()}`, { k:'danger' }) : '',
    onSave:() => { if (!S.edit.title?.trim()) { toast('請填寫名稱', 'err'); return false; } Store.upsert('activities', S.edit); S.dirty = false; toast('已儲存'); route(); }, restore:() => { S.dirty = false; } });
}

/* ---------------- 評鑑與成效 ---------------- */
function scoreBy(n, total, table){ for (const [need, pts] of table) if (n >= need) return pts; return 0; }
function pageReports(){
  setTitle('評鑑自主檢核與成效指標', '依115年度社區式日間照顧評鑑基準');
  const today = todayISO(), active = Store.all('clients').filter(c => c.status === '服務中');
  const cks = active.map(c => ({ c, ...Logic.clientChecks(c) }));
  const fail = (f) => cks.filter(x => !f(x)).map(x => `<a href="#/client/${x.c.id}">${esc(x.c.name)}</a>`);
  const ms = Logic.meetings(), lm = ms.at(-1);
  const recentMs = ms.filter(m => m.date >= addMonths(today, -12));
  const gaps = []; const since = Store.all('clients').map(c => c.admitDate).filter(Boolean).sort()[0] || today; let prev = since > addMonths(today, -12) ? since : addMonths(today, -12);
  for (const m of recentMs) { if (diffDays(prev, m.date) > 92) gaps.push(`${rocDate(prev)}～${rocDate(m.date)}`); prev = m.date; }
  if (diffDays(prev, today) > 92) gaps.push(`${rocDate(prev)}～今`);
  const msOK = recentMs.length > 0 && gaps.length === 0 && recentMs.every(m => Logic.meetingDisciplines(m).length >= 3);
  const followOK = ms.length < 2 || ms.slice(1).every(m => (m.followups || []).length > 0 || !ms.slice(0, ms.indexOf(m)).some(p => (p.decisions || []).length));
  const b1 = [
    [cks.every(x => x.hasPlan), fail(x => x.hasPlan)],
    [cks.every(x => x.domains), fail(x => x.domains)],
    [cks.every(x => x.planFromAssess && x.execRecorded), fail(x => x.planFromAssess && x.execRecorded)],
    [cks.every(x => x.reassessOK), fail(x => x.reassessOK)],
    [cks.every(x => x.referralOK), fail(x => x.referralOK)],
    [msOK && followOK, [...(gaps.length ? ['間隔超過3個月：' + gaps.join('、')] : []), ...recentMs.filter(m => Logic.meetingDisciplines(m).length < 3).map(m => rocDate(m.date) + ' 專業不足3種'), ...(followOK ? [] : ['有會議未追蹤前次決議']), ...(recentMs.length ? [] : ['近一年無會議紀錄'])]],
  ];
  const b1n = b1.filter(x => x[0]).length;
  const b1pts = scoreBy(b1n, 6, [[6, 2.5], [5, 1.88], [4, 1.25], [3, 0.63]]);

  // B3 體溫
  const from30 = addDays(today, -29); let pd = 0, pt = 0;
  Store.all('vitals').filter(v => v.date >= from30 && v.present).forEach(v => { pd++; if (v.temp !== '' && v.temp != null) pt++; });
  // B5/B6
  const incs = Store.all('incidents').filter(i => i.datetime >= addMonths(today, -12));
  const incOK = incs.filter(i => i.analysis && i.improvement).length, hosp = incs.filter(i => i.toHospital), hospOK = hosp.filter(i => i.familyAt && i.hospital).length;
  // B7
  const months = []; for (let k = 11; k >= 0; k--) months.push(addMonths(today.slice(0, 7) + '-01', -k).slice(0, 7));
  const acts = Store.all('activities');
  const mOK = months.map(mo => acts.some(a => a.date?.startsWith(mo) && (a.kind === '團體活動' || a.kind === '社區活動')));
  // B8
  const contactOK = cks.filter(x => x.lastContact && diffDays(x.lastContact, today) <= 90).length;
  const yr = today.slice(0, 4), cgAct = acts.filter(a => a.kind === '照顧者支持活動' && a.date?.startsWith(yr)).length;
  // B9 輔具
  const aidsN = active.filter(c => c.aids).length;
  // B10
  const scPlans = cks.filter(x => x.plan?.items?.some(i => i.selfcare)).length, scExec = cks.reduce((s, x) => s + (x.st?.selfcare || 0), 0);
  // B11
  const staff = Store.all('staff').filter(s => s.active !== false);
  const trainings = acts.filter(a => a.kind === '員工教育訓練' && a.date?.startsWith(yr));
  const hrs = staff.map(s => { const t = trainings.filter(a => (a.staffIds || []).includes(s.id)); return { s, h:t.reduce((x, a) => x + (+a.hours || 0), 0), inf:t.some(a => a.infection), sc:t.some(a => a.selfcareTopic) }; });

  const card = (code, rows, extra = '') => `<section class="card ind"><h2><span class="code">${code}</span>${INDICATORS[code].name}${extra}</h2><ul class="checks">${rows.map(([ok, t, d]) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✕'} ${t}${d ? `<div class="det">${d}</div>` : ''}</li>`).join('')}</ul></section>`;
  const oc = Logic.outcomes();
  return `<div class="notice">以下為系統依登錄資料自動檢核的<b>自主檢核參考</b>，實際分數以評鑑委員文件檢閱與現場訪談為準。服務中個案 <b>${active.length}</b> 位。</div>
  <div class="toolbar">${btn('隨機抽3位個案列印評鑑資料', 'printSample()', { k:'primary', i:'print' })}${btn('列印本頁檢核表', 'printReport()', { i:'print' })}<span class="sp"></span>
    ${btn('個案名冊', 'csvClients()', { k:'sm', i:'download' })}${btn('評估總表', 'csvAssess()', { k:'sm', i:'download' })}${btn('處方總表', 'csvPlans()', { k:'sm', i:'download' })}${btn('執行紀錄', 'csvExecs()', { k:'sm', i:'download' })}${btn('體溫紀錄', 'csvVitals()', { k:'sm', i:'download' })}${btn('臂中圍/小腿圍', 'csvAnthro()', { k:'sm', i:'download' })}</div>
  <div id="report-body">
  ${card('B1', b1.map(([ok, d], i) => [ok, INDICATORS.B1.items[i], d.length ? '未符合：' + d.join('、') : '']), ` <small>符合 ${b1n}/6 項，預估 <b>${b1pts}</b>/2.5 分</small>`)}
  <div class="grid2">
  ${card('B3', [[pd > 0 && pt === pd, `近30天出席人次 ${pd}，已測體溫 ${pt}（${pct(pt, pd) ?? '—'}%）`]])}
  ${card('B5', [[incs.length === 0 || incOK === incs.length, `近一年事件 ${incs.length} 件，已完成分析與改善 ${incOK} 件`, incs.length ? '' : '無事件發生時，請備妥處理辦法與流程及演練紀錄']])}
  ${card('B6', [[hosp.length === 0 || hospOK === hosp.length, `近一年送醫 ${hosp.length} 件，就醫與家屬聯繫紀錄完整 ${hospOK} 件`]])}
  ${card('B7', [[mOK.every(Boolean), `近12個月每月團體/社區活動：${mOK.filter(Boolean).length}/12 個月`, months.filter((m, i) => !mOK[i]).map(m => `${+m.slice(0, 4) - 1911}/${m.slice(5)}`).join('、') ? '缺：' + months.filter((m, i) => !mOK[i]).map(m => `${+m.slice(0, 4) - 1911}/${m.slice(5)}`).join('、') : '']])}
  ${card('B8', [[contactOK === active.length && active.length > 0, `近3個月有家屬聯繫紀錄：${contactOK}/${active.length} 位`], [cgAct >= 1, `本年度照顧者支持性活動 ${cgAct} 場（每年≥1）`]])}
  ${card('B9', [[true, `已登錄使用輔具個案 ${aidsN} 位；處方中「進食、移位」等項目已附輔具使用說明`]])}
  ${card('B10', [[scPlans === active.length && active.length > 0, `處方含自立支援項目：${scPlans}/${active.length} 位`], [scExec > 0, `近30天自立支援執行紀錄 ${scExec} 筆`]])}
  ${card('B11', [[hrs.length > 0 && hrs.every(x => x.h >= 20 && x.inf), `本年度繼續教育≥20小時且含感管：${hrs.filter(x => x.h >= 20 && x.inf).length}/${hrs.length} 人`, hrs.filter(x => x.h < 20 || !x.inf).map(x => `${esc(x.s.name)} ${x.h}h${x.inf ? '' : '(缺感管)'}`).join('、')], [hrs.length > 0 && hrs.every(x => x.sc), `已參與提升自我照顧能力課程：${hrs.filter(x => x.sc).length}/${hrs.length} 人`]])}
  </div>
  <section class="card"><h2>復能成效指標 <small>可作為 A1 年度業務計畫目標與檢討依據</small></h2><div class="kpis">
    <div class="kpi"><div class="k-n">${oc.adlKeep ?? '—'}<small>%</small></div><div class="k-l">ADL 維持或進步率<br><small>${oc.pairs} 位有兩次以上巴氏評估</small></div></div>
    <div class="kpi"><div class="k-n">${oc.adlImprove ?? '—'}<small>%</small></div><div class="k-l">ADL 進步率</div></div>
    <div class="kpi"><div class="k-n">${oc.goalMet ?? '—'}<small>%</small></div><div class="k-l">短期目標達成率（GAS≥0）<br><small>${oc.goals} 項目標</small></div></div>
    <div class="kpi"><div class="k-n">${oc.copmUp ?? '—'}<small>%</small></div><div class="k-l">有意義活動表現進步≥2分<br><small>${oc.copmN} 位</small></div></div>
    <div class="kpi"><div class="k-n">${oc.execRate ?? '—'}<small>%</small></div><div class="k-l">近30天處方執行率</div></div>
    <div class="kpi"><div class="k-n">${oc.fallRate ?? '—'}</div><div class="k-l">跌倒發生率（‰ 服務人日）<br><small>近一年 ${oc.falls} 件／${oc.days} 人日</small></div></div>
  </div></section>
  <section class="card"><h2>各類處方執行率（近30天）</h2>${catTable()}</section>
  </div>`;
}
function catTable(){
  const today = todayISO(), from = addDays(today, -29), idx = Logic.index(), agg = {};
  Store.all('clients').filter(c => c.status === '服務中').forEach(c => { const s = Logic.execStats(c, from, today, idx); for (const [k, v] of Object.entries(s.byCat)) { const a = agg[k] ||= { expected:0, done:0, partial:0 }; a.expected += v.expected; a.done += v.done; a.partial += v.partial; } });
  const rows = Object.entries(agg); if (!rows.length) return empty('尚無資料');
  return `<table class="tbl"><thead><tr><th>類別</th><th>應執行</th><th>完成</th><th>部分</th><th>執行率</th></tr></thead><tbody>${rows.map(([k, v]) => { const r = Math.round((v.done + v.partial * 0.5) / v.expected * 100); return `<tr><td>${esc(k)}</td><td>${v.expected}</td><td>${v.done}</td><td>${v.partial}</td><td><div class="mini-bar"><i style="width:${r}%"></i></div>${r}%</td></tr>`; }).join('')}</tbody></table>`;
}
function csvClients(){ exportCSV('個案名冊_' + todayISO() + '.csv', ['姓名', '性別', '出生日期', '年齡', 'CMS', '收案日', '狀態', '結案日', '診斷', '失智', '飲食', '輔具', '主要照顧者', '關係', '電話'], Store.all('clients').map(c => [c.name, c.gender, c.birth, ageAt(c.birth), CMS_LEVELS[c.cmsLevel], c.admitDate, c.status, c.closeDate, c.diagnoses, c.dementia ? '是' : '', c.diet, c.aids, c.cgName, c.cgRel, c.cgPhone])); }
function csvAssess(){ exportCSV('評估總表_' + todayISO() + '.csv', ['個案', '日期', '類別', '評估者', '巴氏', 'IADL', 'SPMSQ錯題', 'TUG秒', '單腳站秒', '30秒坐站', '5次坐站秒', '握力kg', '步速m/s', 'BMI', 'GDS15', 'MNA-SF', '疼痛NRS', '問題'], Store.all('assessments').sort(byDate('date')).map(a => [clientName(a.clientId), a.date, a.type, staffName(a.assessorId), scoreBarthel(a)?.total, scoreIADL(a)?.total, scoreSPMSQ(a)?.errors, a.phy?.tug, a.phy?.oneLeg, a.phy?.cs30, a.phy?.cs5, a.phy?.grip, gaitSpeed(a), calcBMI(a), scoreGDS(a)?.total, scoreMNA(a)?.total, a.pain?.nrs, (a.problems || []).map(p => p.text).join('；')])); }
function csvPlans(){ const rows = []; Store.all('plans').forEach(p => (p.items || []).forEach(it => rows.push([clientName(p.clientId), 'v' + p.version, p.status, p.startDate, p.endDate || '', p.reviewDate, staffName(p.prescriberId), it.name, it.cat, it.dose, (it.days || []).map(w => WEEKDAYS[w]).join(''), it.assist, it.selfcare ? '是' : '', p.changeReason || '']))); exportCSV('處方總表_' + todayISO() + '.csv', ['個案', '版本', '狀態', '生效日', '結束日', '預定再評', '開立人', '項目', '類別', '劑量', '執行日', '目標協助', '自立支援', '修正理由'], rows); }
function csvExecs(){ exportCSV('執行紀錄_' + todayISO() + '.csv', ['日期', '個案', '項目', '類別', '狀態', '未執行原因', '協助程度', '耐受度', '實際量', '觀察', '執行人'], Store.all('execs').sort(byDate('date')).map(e => [e.date, clientName(e.clientId), e.itemName, e.cat, e.status, e.reason, e.assist, e.tolerance, e.amount, e.note, staffName(e.staffId || e.updatedBy)])); }
function csvAnthro(){ exportCSV('體位量測_' + todayISO() + '.csv', ['日期', '個案', '臂中圍cm', '小腿圍cm', '提醒', '量測人'], Store.all('anthro').sort(byDate('date')).map(r => [r.date, clientName(r.clientId), r.mac, r.calf, anthroFlags(Store.get('clients', r.clientId), r).join('；'), staffName(r.staffId)])); }
function csvVitals(){ exportCSV('出席體溫_' + todayISO() + '.csv', ['日期', '個案', '出席', '體溫'], Store.all('vitals').sort(byDate('date')).map(v => [v.date, clientName(v.clientId), v.present === true ? '出席' : v.present === false ? '請假' : '', v.temp])); }

/* ---------------- 設定與備份 ---------------- */
function pageSettings(){
  setTitle('設定與備份');
  const staff = Store.all('staff');
  const lastBk = Store.DB.meta.lastBackup;
  return `<div class="grid2">
  <section class="card"><h2>中心資料</h2>
    <div class="field"><label class="lbl">中心名稱</label><input class="inp" value="${esc(Store.DB.meta.center || '')}" onchange="Store.setMeta('center',this.value);renderShell();toast('已更新')" placeholder="例：○○日間照顧中心"></div>
    <div class="field"><label class="lbl">機構代碼（選填）</label><input class="inp" value="${esc(Store.DB.meta.code || '')}" onchange="Store.setMeta('code',this.value)"></div>
  </section>
  <section class="card"><h2>資料備份與還原</h2>
    <p>資料儲存在<b>這台電腦這個瀏覽器</b>中。清除瀏覽器資料或換電腦會遺失，請<b>每週至少匯出一次</b>備份到隨身碟或機構雲端。${lastBk ? `<br>上次備份：${rocDate(lastBk)} ${diffDays(lastBk.slice(0, 10), todayISO()) > 7 ? badge('超過7天', 'red') : ''}` : '<br>' + badge('尚未備份', 'red')}</p>
    <div class="btn-row">${btn('匯出備份', 'backup(false)', { k:'primary', i:'download' })}${btn('匯出加密備份', 'backup(true)', { i:'download' })}</div>
    <div class="btn-row">${btn('匯入／合併其他裝置資料', `$('#imp').click()`, { i:'upload' })}<input type="file" id="imp" accept=".json,application/json" hidden onchange="importFile(this.files[0],false);this.value=''">
    ${btn('以備份檔完全取代', `$('#imp2').click()`, { k:'danger ghost' })}<input type="file" id="imp2" accept=".json,application/json" hidden onchange="importFile(this.files[0],true);this.value=''"></div>
    <p class="hint">多台平板使用時：各台定期「匯出」，在主電腦以「匯入／合併」整合（同一筆資料保留較新的版本），再把合併後的檔案匯入回各台。</p>
  </section></div>
  <section class="card"><h2>工作人員 <small>評估者、處方開立者、照服員、討論會出席者</small></h2>
    <div class="toolbar">${btn('新增工作人員', 'editStaff()', { k:'primary', i:'plus' })}</div>
    <table class="tbl"><thead><tr><th>姓名</th><th>職類</th><th>狀態</th><th></th></tr></thead><tbody>${staff.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.role)}</td><td>${s.active === false ? badge('離職') : badge('在職', 'green')}</td><td>${btn('編輯', `editStaff('${s.id}')`, { k:'sm' })}</td></tr>`).join('') || `<tr><td colspan="4">${empty('請先建立工作人員')}</td></tr>`}</tbody></table>
  </section>
  <section class="card"><h2>自訂處方項目 <small>擴充內建 ${EXERCISES.length} 項處方庫</small></h2>
    <div class="toolbar">${btn('新增自訂處方', 'editLib()', { k:'primary', i:'plus' })}</div>
    <table class="tbl"><thead><tr><th>類別</th><th>名稱</th><th>預設劑量</th><th></th></tr></thead><tbody>${Store.all('library').map(e => `<tr><td>${esc(e.cat)}</td><td>${esc(e.name)}</td><td>${esc(e.dose)}</td><td>${btn('編輯', `editLib('${e.id}')`, { k:'sm' })}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">尚無自訂項目</td></tr>`}</tbody></table>
  </section>
  <section class="card"><h2>示範與重設</h2><div class="btn-row">${btn('載入示範資料', 'if(askConfirm(\'將加入示範個案與紀錄（不會刪除現有資料）。繼續？\'))loadDemo()')}${btn('清除示範資料', 'clearDemo()')}${btn('清除全部資料', 'wipeAll()', { k:'danger' })}</div></section>`;
}
function editStaff(id){
  S.edit = id ? clone(Store.get('staff', id)) : { role:'照顧服務員', active:true };
  openModal(id ? '編輯工作人員' : '新增工作人員', `<div class="form-grid">${F.field('姓名', F.input('name'), { req:true })}${F.field('職類', F.select('role', ROLES, { blank:false }))}${F.field('在職', F.check('active', '在職中'))}</div>`,
    { onSave:() => { if (!S.edit.name?.trim()) { toast('請填寫姓名', 'err'); return false; } const s = Store.upsert('staff', S.edit); S.dirty = false; if (!App.currentUserId()) App.setUser(s.id); else { renderShell(); route(); } }, restore:() => { S.dirty = false; } });
}
function editLib(id){
  S.edit = id ? clone(Store.get('library', id)) : { id:'', cat:'肌力', name:'', dose:'', how:'', caution:'', selfcare:false };
  openModal(id ? '編輯自訂處方' : '新增自訂處方', `<div class="form-grid">${F.field('名稱', F.input('name'), { req:true })}${F.field('類別', F.select('cat', EX_CATS, { blank:false }))}${F.field('預設劑量', F.input('dose'))}${F.field('自立支援', F.check('selfcare', '屬自我照顧能力訓練'))}${F.field('執行說明', F.text('how'), { cls:'span2' })}${F.field('注意事項', F.text('caution', { rows:2 }), { cls:'span2' })}</div>`,
    { wide:true, extra:id ? btn('刪除', `Store.remove('library','${id}');closeModal(true);route()`, { k:'danger' }) : '', onSave:() => { if (!S.edit.name?.trim()) { toast('請填寫名稱', 'err'); return false; } if (!S.edit.id) S.edit.id = 'lib_' + Store.newId(); Store.upsert('library', S.edit); S.dirty = false; route(); }, restore:() => { S.dirty = false; } });
}
async function backup(enc){
  const data = Store.exportAll(); let out = JSON.stringify(data), name = `復能系統備份_${todayISO()}.json`;
  if (enc) { const pw = prompt('請設定備份密碼（至少6碼，遺失無法復原）：'); if (!pw) return; if (pw.length < 6) return toast('密碼至少6碼', 'err'); if (prompt('請再輸入一次密碼：') !== pw) return toast('兩次密碼不一致', 'err'); out = await encryptJSON(data, pw); name = name.replace('.json', '_加密.json'); }
  download(name, out, 'application/json'); Store.setMeta('lastBackup', new Date().toISOString()); toast('備份已下載：' + name); route();
}
async function importFile(file, replace){
  if (!file) return;
  try {
    let data = JSON.parse(await file.text());
    if (data.enc) { const pw = prompt('此為加密備份，請輸入密碼：'); if (!pw) return; try { data = await decryptJSON(data, pw); } catch(e){ return toast('密碼錯誤或檔案損壞', 'err'); } }
    if (replace && !askConfirm('將以備份檔「完全取代」目前所有資料，無法復原。確定？')) return;
    const r = Store.mergeImport(data, replace); Store.flush();
    toast(replace ? `已還原 ${r.added} 筆資料` : `合併完成：新增 ${r.added} 筆、更新 ${r.updated} 筆`); renderShell(); route();
  } catch(e){ toast('匯入失敗：' + e.message, 'err'); }
}
function wipeAll(){ if (!askConfirm('將刪除本機所有資料，無法復原。建議先匯出備份。確定？')) return; if (prompt('請輸入「確認刪除」四個字：') !== '確認刪除') return; Store.clearAll(); Store.flush(); try { localStorage.removeItem('rehab:user'); } catch(e){} toast('已清除'); renderShell(); route(); }
function clearDemo(){ let n = 0; for (const c of COLLECTIONS) for (const r of Store.DB[c]) if (r.demo && !r.deleted) { Store.remove(c, r.id); n++; } try { if (Store.get('staff', App.currentUserId()) == null) localStorage.removeItem('rehab:user'); } catch(e){} toast(`已清除 ${n} 筆示範資料`); renderShell(); route(); }
