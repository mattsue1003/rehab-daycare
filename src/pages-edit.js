/* ================================================================
   編輯頁：評估（初評/再評）與復能處方（開立/修正）
   ================================================================ */
const allExercises = () => [...EXERCISES, ...Store.all('library')];
const findEx = id => allExercises().find(e => e.id === id);
const isPrescriber = id => PRESCRIBER_ROLES.includes(staffRole(id));

/* ---------------- 評估 ---------------- */
function newAssessment(cid, type){
  const prev = Logic.lastAssessment(cid), plan = Logic.activePlan(cid);
  type = type || (prev ? '再評' : '初評');
  const a = { clientId:cid, date:todayISO(), type, assessorId:App.currentUserId(),
    adl:{}, iadl:{}, spmsq:{ items:Array(10).fill(''), edu:prev?.spmsq?.edu || '' }, gds:Array(15).fill(''), mna:{}, pain:{},
    phy:{ height:prev?.phy?.height || '' },
    physio:prev?.physio || '', psycho:prev?.psycho || '', social:prev?.social || '', lifeEvents:prev?.lifeEvents || '', expect:prev?.expect || '',
    copm:prev?.copm?.length ? prev.copm.filter(x => x.activity).map(x => ({ activity:x.activity, imp:x.imp, perf:'', sat:'' })) : [{}, {}, {}],
    problemSel:{}, customProblems:'', summary:'', carried:!!prev };
  if (plan && type !== '初評') a.goalReview = (plan.goals || []).map(g => ({ goalId:g.id, planId:plan.id, text:g.text, measure:g.measure, baseline:g.baseline, target:g.target, current:'', gas:'', note:'' }));
  return a;
}
function pageAssessEdit(id, cid, type){
  const a = id ? clone(Store.get('assessments', id) || {}) : newAssessment(cid, type);
  if (!a.clientId) { App.go('#/clients'); return ''; }
  const c = Store.get('clients', a.clientId);
  if (!c) { App.go('#/clients'); return ''; }
  S.edit = a;
  const prev = Logic.assessmentsOf(a.clientId).filter(x => x.id !== a.id && x.date <= a.date).at(-1) || null;
  setTitle((id ? '' : '新增') + (a.type || '') + '評估', c.name);
  S.onEdit = p => { liveSummary(c); if (/^(adl|iadl|phy|spmsq|gds|mna|pain|copm)/.test(p)) { clearTimeout(S._sg); S._sg = setTimeout(() => { const el = $('#sugg'); if (el) el.innerHTML = suggestionsHTML(c); }, 250); } };
  setTimeout(() => liveSummary(c), 0);
  const pv = (v) => prev ? `<span class="prev">前次：${v ?? '—'}</span>` : '';
  const sec = (k, t, body, note = '') => `<section class="card" id="s-${k}"><h2>${t}${note ? ` <small>${note}</small>` : ''}</h2>${body}</section>`;

  const adl = BARTHEL.map(it => `<div class="q"><div class="qh"><b>${it.n}</b>${pv(prev?.adl?.[it.k])}</div>${F.radios('adl.' + it.k, it.opts.map(([s, d]) => [s, `${s} 分｜${d}`]), { t:'num', cls:'vert' })}</div>`).join('');
  const iadl = IADL.map(it => `<div class="q"><div class="qh"><b>${it.n}</b>${pv(prev?.iadl?.[it.k] != null && prev.iadl[it.k] !== '' ? it.opts[prev.iadl[it.k]][0] : null)}</div>${F.radios('iadl.' + it.k, it.opts.map(([d, s], i) => [i, `${d}（${s}）`]), { t:'num', cls:'vert' })}</div>`).join('');
  const spm = `${F.field('教育程度', F.radios('spmsq.edu', EDU_OPTS))}<table class="tbl qa"><tbody>${SPMSQ.map((q, i) => `<tr><td>${i + 1}. ${q}</td><td>${F.radios('spmsq.items.' + i, [['c', '正確'], ['x', '錯誤']])}</td></tr>`).join('')}</tbody></table>`;
  const phyRow = (k, label, unit, hint) => F.field(label + (unit ? `（${unit}）` : ''), F.num('phy.' + k, { min:0 }) + pv(prev?.phy?.[k]), { hint });
  const phy = `<div class="form-grid g3">
    ${phyRow('height', '身高', '公分')}${phyRow('weight', '體重', '公斤')}
    ${F.field('BMI', `<div class="calc" id="bmi">—</div>`)}
    ${phyRow('tug', 'TUG 起身行走', '秒', '≥13.5 秒為跌倒高風險')}
    ${F.field('TUG 使用輔具', F.input('phy.tugAid', { ph:'例：四腳拐' }))}
    ${phyRow('oneLeg', '單腳站立', '秒', '<5 秒為跌倒風險')}
    ${phyRow('cs30', '30秒坐站', '次', c.birth ? `同齡平均下限：${cs30Cut(ageAt(c.birth, a.date), c.gender)} 次` : '請填寫出生日期以比對常模')}
    ${phyRow('cs5', '5次坐站', '秒', '≥12 秒表示下肢功能下降（AWGS）')}
    ${phyRow('grip', '握力（慣用手最佳值）', '公斤', `AWGS 切點：男 <28、女 <18`)}
    ${phyRow('gait4', '4公尺步行時間', '秒', '系統自動換算步速；<1.0 m/s 為慢')}
    ${F.field('步行速度', `<div class="calc" id="gait">—</div>`)}
    ${F.field('無法施測說明', F.input('phy.note', { ph:'例：無法站立，未施測 TUG' }))}
  </div>`;
  const gds = `<p class="hint">中、重度失智者可不施測。依長輩「過去一週」的感受回答。</p><table class="tbl qa"><tbody>${GDS15.map(([q], i) => `<tr><td>${i + 1}. ${q}</td><td>${F.radios('gds.' + i, [['y', '是'], ['n', '否']])}</td></tr>`).join('')}</tbody></table>`;
  const mna = MNASF.map(it => `<div class="q"><div class="qh"><b>${it.k}. ${it.n}</b></div>${F.radios('mna.' + it.k, it.opts.map(([s, d]) => [s, `${d}（${s}）`]), { t:'num' })}</div>`).join('') +
    `<div class="q"><div class="qh"><b>F. BMI 或小腿圍</b></div><p class="hint">已填身高體重會自動以 BMI 計分；無法量體重時填小腿圍。</p>${F.field('小腿圍（公分）', F.num('mna.calf'))}</div>`;
  const pain = `<div class="form-grid">${F.field('疼痛程度 NRS（0 不痛～10 最痛）', F.radios('pain.nrs', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => [n, String(n)]), { t:'num' }), { cls:'span2' })}${F.field('疼痛部位/影響', F.input('pain.site'), { cls:'span2' })}</div>`;
  const psy = `${a.carried && !id ? '<div class="notice">已帶入前次內容，請依現況更新。</div>' : ''}<div class="form-grid">
    ${F.field('生理狀況', F.text('physio', { ph:'疾病、用藥、視力聽力、睡眠、排泄、皮膚、吞嚥…' }), { cls:'span2' })}
    ${F.field('心理、認知與情緒', F.text('psycho', { ph:'情緒狀態、認知表現、行為問題、適應情形…' }), { cls:'span2', req:true, hint:'B1 需求評估必備' })}
    ${F.field('家庭及社會支持', F.text('social', { ph:'同住者、主要照顧者負荷、經濟、社區資源、社交參與…' }), { cls:'span2', req:true, hint:'B1 需求評估必備' })}
    ${F.field('重大生命事件', F.text('lifeEvents', { rows:2, ph:'近一年喪偶、搬遷、住院、跌倒…；若無請填「無」' }), { cls:'span2', req:true, hint:'B1 需求評估必備' })}
    ${F.field('個案與家屬對服務的期待', F.text('expect', { rows:2 }), { cls:'span2' })}</div>`;
  const copm = `<p class="hint">請長輩說出「最想再做到的日常活動」，以 1–10 分自評重要性、目前表現、滿意度（參考 COPM）。這是處方目標的核心。</p>
    <table class="tbl"><thead><tr><th>想做到的活動</th><th>重要性</th><th>表現</th><th>滿意度</th><th></th></tr></thead><tbody>${(a.copm || []).map((x, i) => `<tr><td>${F.input(`copm.${i}.activity`, { ph:'例：自己走去市場買菜' })}</td><td>${F.num(`copm.${i}.imp`, { min:1, max:10 })}</td><td>${F.num(`copm.${i}.perf`, { min:1, max:10 })}</td><td>${F.num(`copm.${i}.sat`, { min:1, max:10 })}</td><td>${btn('✕', `S.edit.copm.splice(${i},1);rerender(()=>pageAssessBody())`, { k:'sm ghost', title:'刪除' })}</td></tr>`).join('')}</tbody></table>
    ${btn('新增活動', 'S.edit.copm.push({});rerender(()=>pageAssessBody())', { k:'sm', i:'plus' })}`;
  const gr = (a.goalReview || []).length ? sec('gr', '前次處方目標達成評值', `<table class="tbl"><thead><tr><th>短期目標</th><th>基準 → 目標</th><th>本次現值</th><th>GAS 達成度</th><th>說明</th></tr></thead><tbody>${a.goalReview.map((g, i) => `<tr><td>${esc(g.text)}<br><small class="muted">${esc(g.measure || '')}</small></td><td>${esc(g.baseline || '')} → ${esc(g.target || '')}</td><td>${F.input(`goalReview.${i}.current`)}</td><td>${F.select(`goalReview.${i}.gas`, GAS.map(([v, l]) => [v, l]), { t:'num' })}</td><td>${F.input(`goalReview.${i}.note`)}</td></tr>`).join('')}</tbody></table>`, '再評估時必填，作為修正處方依據') : '';

  const nav = [['basic', '基本'], ['adl', 'ADL'], ['iadl', 'IADL'], ['cog', '認知'], ['phy', '體能'], ['gds', '情緒'], ['mna', '營養'], ['pain', '疼痛'], ['psy', '身心社會'], ['copm', '有意義活動'], ...(gr ? [['gr', '目標評值']] : []), ['sum', '問題與摘要']];
  S._assessBody = () => `
  <div class="toolbar sticky-bar">
    <a class="btn" href="#/client/${c.id}/assess">${icon('back', 16)}${esc(c.name)}</a>
    <div class="jump">${nav.map(([k, l]) => `<a href="javascript:document.getElementById('s-${k}').scrollIntoView({behavior:'smooth'})">${l}</a>`).join('')}</div>
    <span class="sp"></span>
    ${id ? btn('刪除', `deleteAssessment('${id}')`, { k:'danger ghost', i:'trash' }) : ''}
    ${btn('儲存', 'saveAssessment(false)', { k:'' })}${btn(Logic.activePlan(c.id) ? '儲存並修正處方' : '儲存並開立處方', 'saveAssessment(true)', { k:'primary', i:'rx' })}
  </div>
  <div class="edit-layout"><div class="edit-main">
    ${sec('basic', '基本資料', `<div class="form-grid g3">${F.field('評估日期', F.date('date'), { req:true })}${F.field('評估類別', F.select('type', ['初評', '再評', '結案評估', '不定期評估'], { blank:false }))}${F.field('評估人員', F.select('assessorId', staffOpts()), { req:true })}</div>`)}
    ${sec('adl', '日常生活活動 ADL｜巴氏量表', adl)}
    ${sec('iadl', '工具性日常生活 IADL｜Lawton', iadl, '括號內為計分')}
    ${sec('cog', '認知｜簡易心智狀態問卷 SPMSQ', spm)}
    ${sec('phy', '體能與跌倒風險', phy)}
    ${sec('gds', '情緒｜老人憂鬱量表 GDS-15', gds, '≥5 分疑似憂鬱')}
    ${sec('mna', '營養｜迷你營養評估簡表 MNA-SF', mna)}
    ${sec('pain', '疼痛', pain)}
    ${sec('psy', '身心社會需求評估', psy, '評鑑 B1：生理、心理認知、家庭社會支持、重大生命事件')}
    ${sec('copm', '個案有意義活動目標', copm)}
    ${gr}
    ${sec('sum', '問題確立與評估摘要', `<p class="hint">系統依評估結果建議下列問題，勾選後會帶入處方，並附上建議處方項目與轉介。</p><div id="sugg">${suggestionsHTML(c)}</div>
      ${F.field('其他問題（每行一項）', F.text('customProblems', { rows:3 }))}${F.field('評估摘要', F.text('summary', { rows:3, ph:'整體功能、優勢、限制與建議' }))}`)}
  </div><aside class="edit-side"><div class="card sticky" id="live"></div></aside></div>`;
  return S._assessBody();
}
function pageAssessBody(){ const h = S._assessBody(); setTimeout(() => liveSummary(Store.get('clients', S.edit.clientId)), 0); return h; }
function suggestionsHTML(c){
  const sg = suggestFromAssessment(S.edit, c);
  if (!sg.length) return '<p class="muted">（填寫量表後顯示建議問題）</p>';
  S.edit.problemSel ||= {}; sg.forEach(s => { if (!(s.code in S.edit.problemSel)) S.edit.problemSel[s.code] = true; });
  return `<ul class="sugg">${sg.map(s => `<li>${F.check('problemSel.' + s.code, `<b>${esc(s.text)}</b>${s.ex.length ? `<small>建議處方：${s.ex.map(e => esc(findEx(e)?.name || e)).join('、')}</small>` : ''}${s.referral ? `<small class="ref">建議轉介：${esc(s.referral)}</small>` : ''}`)}</li>`).join('')}</ul>`;
}
function liveSummary(c){
  const a = S.edit, el = $('#live'); if (!el || !a) return;
  const b = scoreBarthel(a), i = scoreIADL(a), s = scoreSPMSQ(a), g = scoreGDS(a), m = scoreMNA(a), bmi = calcBMI(a), gs = gaitSpeed(a), p = a.phy || {};
  const ag = ageAt(c.birth, a.date);
  const row = (k, v, flag) => `<div class="ls ${flag ? 'flag' : ''}"><span>${k}</span><b>${v}</b></div>`;
  el.innerHTML = `<h3>即時計分</h3>
    ${row('巴氏 ADL', b ? `${b.total}　<small>${b.level}</small>` : '—', b && !b.partial && b.total < 91)}
    ${row('IADL', i ? `${i.total}/8${i.partial ? '<small>（未完成）</small>' : ''}` : '—')}
    ${row('SPMSQ', s ? (s.partial ? `錯 ${s.errors}<small>（未完成）</small>` : `錯 ${s.errors}　<small>${spmsqLevel(s.adj)}</small>`) : '—', s && s.adj >= 3)}
    ${row('TUG', p.tug ? p.tug + ' 秒' : '—', +p.tug >= PHY_CUT.tug)}
    ${row('30秒坐站', p.cs30 !== '' && p.cs30 != null ? p.cs30 + ' 次' + (ag ? ` <small>/${cs30Cut(ag, c.gender)}</small>` : '') : '—', ag && p.cs30 !== '' && p.cs30 != null && +p.cs30 < cs30Cut(ag, c.gender))}
    ${row('握力', p.grip ? p.grip + ' kg' : '—', p.grip && +p.grip < (c.gender === '男' ? PHY_CUT.gripM : PHY_CUT.gripF))}
    ${row('步速', gs != null ? gs + ' m/s' : '—', gs != null && gs < PHY_CUT.gait)}
    ${row('BMI', bmi ?? '—', bmi != null && (bmi < 18.5 || bmi >= 27))}
    ${row('GDS-15', g ? g.total + (g.partial ? '<small>（未完成）</small>' : '') : '—', g && !g.partial && g.total >= 5)}
    ${row('MNA-SF', m ? `${m.total}　<small>${mnaLevel(m.total)}</small>` : '—', m && m.total <= 11)}
    ${row('疼痛 NRS', a.pain?.nrs ?? '—', +a.pain?.nrs >= 4)}
    <p class="hint">紅色＝需注意。系統建議為參考，最終判斷由專業人員決定。</p>`;
  const bm = $('#bmi'); if (bm) bm.textContent = bmi ?? '—';
  const ga = $('#gait'); if (ga) ga.textContent = gs != null ? gs + ' m/s' : '—';
}
function saveAssessment(toPlan){
  const a = S.edit, c = Store.get('clients', a.clientId);
  if (!a.date) return toast('請填寫評估日期', 'err');
  if (!a.assessorId) return toast('請選擇評估人員', 'err');
  const miss = [];
  if (!scoreBarthel(a) || scoreBarthel(a).partial) miss.push('巴氏量表未完成');
  if (!a.social?.trim()) miss.push('家庭及社會支持');
  if (!a.lifeEvents?.trim()) miss.push('重大生命事件');
  if (!a.psycho?.trim() && !scoreSPMSQ(a) && !scoreGDS(a)) miss.push('心理認知');
  if ((a.goalReview || []).some(g => g.gas === '' || g.gas == null)) miss.push('前次目標 GAS 達成度');
  if (miss.length && !askConfirm('以下評鑑必要內容尚未完成：\n・' + miss.join('\n・') + '\n\n仍要儲存嗎？')) return;
  const sg = suggestFromAssessment(a, c);
  a.problems = [...sg.filter(s => a.problemSel?.[s.code]), ...(a.customProblems || '').split('\n').map(t => t.trim()).filter(Boolean).map(t => ({ code:'custom', text:t, ex:[], referral:'' }))];
  delete a.carried;
  const saved = Store.upsert('assessments', a); S.dirty = false;
  toast('評估已儲存');
  const plan = Logic.activePlan(a.clientId);
  if (toPlan) App.go(`#/plan/new/${a.clientId}?from=${saved.id}${plan ? '&revise=' + plan.id : ''}`);
  else App.go(`#/client/${a.clientId}/assess`);
}
function deleteAssessment(id){ if (!askConfirm('確定刪除此評估紀錄？')) return; const a = Store.get('assessments', id); Store.remove('assessments', id); S.dirty = false; toast('已刪除'); App.go('#/client/' + a.clientId + '/assess'); }

/* ---------------- 復能處方 ---------------- */
function newPlan(cid, params){
  const from = params.get('from') ? Store.get('assessments', params.get('from')) : null;
  const base = params.get('revise') ? Store.get('plans', params.get('revise')) : null;
  const ver = Math.max(0, ...Logic.plansOf(cid).map(p => p.version || 0)) + 1;
  const uid = App.currentUserId();
  const p = { clientId:cid, assessmentId:from?.id || base?.assessmentId || '', version:ver, revisedFrom:base?.id || '', status:'草稿',
    startDate:todayISO(), reviewDate:addDays(todayISO(), DEFAULT_CYCLE_DAYS), prescriberId:isPrescriber(uid) ? uid : '',
    problems:from ? (from.problems || []).map(x => x.text) : base ? [...(base.problems || [])] : [],
    longGoal:base?.longGoal || '', goals:base ? clone(base.goals || []) : [], items:base ? clone(base.items || []) : [],
    referrals:base ? clone(base.referrals || []) : [], changeReason:'', consent:{ date:todayISO() }, note:'' };
  if (from) for (const pr of (from.problems || [])) if (pr.referral && !p.referrals.some(r => r.to === pr.referral)) p.referrals.push({ to:pr.referral, reason:pr.text, date:todayISO(), result:'' });
  // 依目標評值結果自動提示
  if (base && from?.goalReview?.length) p.changeReason = from.goalReview.map(g => `「${g.text}」GAS ${g.gas === '' ? '?' : g.gas}${g.note ? '（' + g.note + '）' : ''}`).join('；') + '。';
  if (!p.goals.length) p.goals.push({ id:Store.newId(), text:'', measure:'', baseline:'', target:'', due:p.reviewDate });
  p._suggest = from ? [...new Set((from.problems || []).flatMap(x => x.ex || []))] : [];
  return p;
}
function pagePlanEdit(id, cid, params){
  const p = id ? clone(Store.get('plans', id) || {}) : newPlan(cid, params);
  if (!p.clientId) { App.go('#/clients'); return ''; }
  const c = Store.get('clients', p.clientId);
  if (!c) { App.go('#/clients'); return ''; }
  if (id && p.status !== '執行中' && p.status !== '草稿') { setTitle('復能處方 v' + p.version, c.name); return `<div class="toolbar"><a class="btn" href="#/client/${c.id}/plan">${icon('back', 16)}${esc(c.name)}</a><span class="sp"></span>${btn('列印處方箋', `printPlan('${p.id}')`, { i:'print' })}</div><div class="notice">此版本狀態為「${esc(p.status)}」，僅供檢視。如需變更請於生效中的處方建立修正版本。</div><section class="card">${planSummary(p)}</section>`; }
  S.edit = p;
  setTitle((id ? '編輯' : p.revisedFrom ? '修正' : '開立') + '復能處方 v' + p.version, c.name);
  S.onEdit = (path) => { if (/^goals\.\d+\.text$/.test(path)) { clearTimeout(S._gt); S._gt = setTimeout(refreshGoalSelects, 400); } };
  return planEditorHTML();
}
function refreshGoalSelects(){ document.querySelectorAll('select[data-goalsel]').forEach(sel => { const i = +sel.dataset.goalsel, cur = S.edit.items[i]?.goalId || ''; sel.innerHTML = `<option value="">—</option>` + S.edit.goals.map((g, gi) => `<option value="${g.id}" ${g.id === cur ? 'selected' : ''}>目標${gi + 1}：${esc((g.text || '').slice(0, 18))}</option>`).join(''); }); }
function planEditorHTML(){
  const p = S.edit, c = Store.get('clients', p.clientId), a = p.assessmentId ? Store.get('assessments', p.assessmentId) : null;
  const sug = (p._suggest || []).filter(eid => !p.items.some(it => it.exId === eid));
  const aSum = a ? [['巴氏', scoreBarthel(a)?.total], ['IADL', scoreIADL(a)?.total], ['SPMSQ錯', scoreSPMSQ(a)?.errors], ['TUG', a.phy?.tug], ['30秒坐站', a.phy?.cs30], ['握力', a.phy?.grip], ['步速', gaitSpeed(a)], ['GDS', scoreGDS(a)?.total], ['MNA', scoreMNA(a)?.total]].filter(x => x[1] != null && x[1] !== '') : [];
  const lib = EX_CATS.map(cat => `<details><summary>${cat}</summary><div class="lib">${allExercises().filter(e => e.cat === cat).map(e => `<button type="button" class="chip" onclick="addPlanItem('${e.id}')" title="${esc(e.how)}">${icon('plus', 14)}${esc(e.name)}</button>`).join('')}</div></details>`).join('');
  return `
  <div class="toolbar sticky-bar">
    <a class="btn" href="#/client/${c.id}/plan">${icon('back', 16)}${esc(c.name)}</a><span class="sp"></span>
    ${p.id && p.status === '執行中' ? btn('結案此處方', 'closePlan()', { k:'danger ghost' }) : ''}
    ${btn(p.id ? '儲存' : '儲存並生效', 'savePlan()', { k:'primary', i:'check' })}
  </div>
  ${p.id ? '<div class="notice">直接編輯會覆蓋此版本。若處方內容有實質變更（目標、項目、劑量），建議使用「修正處方」建立新版本，以保留評鑑所需的修正歷程。</div>' : ''}
  <section class="card"><h2>處方資訊</h2>
    ${a ? `<div class="notice">依據 ${rocDate(a.date)} ${esc(a.type)}評估（${esc(staffName(a.assessorId))}）：${aSum.map(([k, v]) => `${k} <b>${v}</b>`).join('　')}</div>` : '<div class="notice warn">此處方未連結評估。評鑑 B1 要求「依評估結果確立問題及服務計畫」，建議先完成評估。</div>'}
    <div class="form-grid g3">
      ${F.field('生效日期', F.date('startDate'), { req:true })}${F.field('預定再評估日', F.date('reviewDate'), { req:true, hint:'復能週期建議 8–12 週；最遲不得超過上次評估後6個月' })}${F.field('開立人員', F.select('prescriberId', staffOpts(s => PRESCRIBER_ROLES.includes(s.role))), { req:true })}
    </div>
    ${p.version > 1 ? F.field('修正理由（必填）', F.text('changeReason', { rows:2, ph:'例：坐站目標已達成，提高劑量；新增步行訓練…' }), { req:true }) : ''}
  </section>
  <section class="card"><h2>問題確立</h2>
    ${p.problems.map((x, i) => `<div class="row-edit">${F.input('problems.' + i)}${btn('✕', `S.edit.problems.splice(${i},1);rerender(planEditorHTML)`, { k:'sm ghost' })}</div>`).join('')}
    ${btn('新增問題', `S.edit.problems.push('');rerender(planEditorHTML)`, { k:'sm', i:'plus' })}
  </section>
  <section class="card"><h2>復能目標</h2>
    ${F.field('長期目標（3–6個月）', F.text('longGoal', { rows:2, ph:'以長輩想做到的生活活動來描述，例：能自己拿四腳拐走到社區市場買菜' }))}
    <h3>短期目標（具體、可量測、有期限）</h3>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>短期目標</th><th>評量方式</th><th>基準值</th><th>目標值</th><th>預計達成日</th><th></th></tr></thead><tbody>
    ${p.goals.map((g, i) => `<tr><td>${i + 1}</td><td>${F.input(`goals.${i}.text`, { ph:'例：可在監督下獨立完成輪椅↔椅子移位' })}</td><td>${F.input(`goals.${i}.measure`, { ph:'例：30秒坐站' })}</td><td>${F.input(`goals.${i}.baseline`, { cls:'w6' })}</td><td>${F.input(`goals.${i}.target`, { cls:'w6' })}</td><td>${F.date(`goals.${i}.due`)}</td><td>${btn('✕', `S.edit.goals.splice(${i},1);rerender(planEditorHTML)`, { k:'sm ghost' })}</td></tr>`).join('')}
    </tbody></table></div>${btn('新增短期目標', `S.edit.goals.push({id:Store.newId(),due:S.edit.reviewDate});rerender(planEditorHTML)`, { k:'sm', i:'plus' })}
  </section>
  <section class="card"><h2>處方項目 <small>照服員每日依此執行並記錄</small></h2>
    ${sug.length ? `<div class="notice">評估建議項目：${sug.map(eid => `<button type="button" class="chip hl" onclick="addPlanItem('${eid}')">${icon('plus', 14)}${esc(findEx(eid)?.name || eid)}</button>`).join('')} <button type="button" class="chip" onclick="sugAll()">全部加入</button></div>` : ''}
    <div class="items-edit">${p.items.map((it, i) => `<div class="item-card">
      <div class="ic-h"><b>${i + 1}.</b>${F.input(`items.${i}.name`, { cls:'grow' })}${F.select(`items.${i}.cat`, EX_CATS, { blank:false })}${btn('✕', `S.edit.items.splice(${i},1);rerender(planEditorHTML)`, { k:'sm ghost', title:'移除' })}</div>
      <div class="form-grid g3">
        ${F.field('劑量', F.input(`items.${i}.dose`))}
        ${F.field('對應目標', `<select class="inp" data-bind="items.${i}.goalId" data-goalsel="${i}"><option value="">—</option>${p.goals.map((g, gi) => `<option value="${g.id}" ${g.id === it.goalId ? 'selected' : ''}>目標${gi + 1}：${esc((g.text || '').slice(0, 18))}</option>`).join('')}</select>`)}
        ${F.field('目標協助程度', F.select(`items.${i}.assist`, ASSIST_LEVELS))}
        ${F.field('執行日', `<div class="pills">${[1, 2, 3, 4, 5, 6].map(w => F.checkArr(`items.${i}.days`, w, WEEKDAYS[w], true)).join('')}</div>`, { cls:'span2' })}
        ${F.field('自立支援', F.check(`items.${i}.selfcare`, '屬自我照顧能力訓練（B10）'))}
        ${F.field('照服員執行說明', F.text(`items.${i}.how`, { rows:2 }), { cls:'span2' })}
        ${F.field('注意事項／停止條件', F.text(`items.${i}.caution`, { rows:2 }))}
      </div></div>`).join('') || '<p class="muted">尚未加入處方項目，請從下方處方庫選擇或新增自訂項目。</p>'}</div>
    <h3>處方庫</h3><div class="libs">${lib}</div>${btn('新增自訂項目', 'addPlanItem()', { k:'sm', i:'plus' })}
  </section>
  <section class="card"><h2>轉介（B1-5）</h2>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>轉介對象</th><th>原因</th><th>轉介日期</th><th>結果/回覆</th><th></th></tr></thead><tbody>
    ${p.referrals.map((r, i) => `<tr><td>${F.input(`referrals.${i}.to`, { list:'ref-list' })}</td><td>${F.input(`referrals.${i}.reason`)}</td><td>${F.date(`referrals.${i}.date`)}</td><td>${F.input(`referrals.${i}.result`)}</td><td>${btn('✕', `S.edit.referrals.splice(${i},1);rerender(planEditorHTML)`, { k:'sm ghost' })}</td></tr>`).join('')}
    </tbody></table></div><datalist id="ref-list">${['營養師', '語言治療師', '社工', '護理師', '物理治療師', '職能治療師', '神經內科', '精神科/身心科', '復健科', '家醫科', '牙科', '輔具資源中心', '居家無障礙改善（CC01）'].map(x => `<option value="${x}">`).join('')}</datalist>
    ${btn('新增轉介', `S.edit.referrals.push({date:todayISO()});rerender(planEditorHTML)`, { k:'sm', i:'plus' })}
  </section>
  <section class="card"><h2>個案／家屬說明與同意</h2><div class="form-grid g3">
    ${F.field('已向個案/家屬說明處方內容', F.check('consent.explained', '已說明並取得同意'))}${F.field('說明對象', F.input('consent.by', { ph:'例：個案本人、女兒' }))}${F.field('日期', F.date('consent.date'))}
    ${F.field('居家延續建議（給家屬）', F.text('note', { rows:2, ph:'例：在家每天飯後做坐站10下，家屬在旁陪同' }), { cls:'span3' })}</div>
  </section>`;
}
function addPlanItem(exId){
  const e = exId ? findEx(exId) : null;
  S.edit.items.push({ id:Store.newId(), exId:exId || '', name:e?.name || '', cat:e?.cat || '肌力', dose:e?.dose || '', days:[1, 2, 3, 4, 5].filter(w => (Store.get('clients', S.edit.clientId).attendDays || [1, 2, 3, 4, 5]).includes(w)), assist:'', how:e?.how || '', caution:e?.caution || '', selfcare:!!e?.selfcare, goalId:S.edit.goals[0]?.id || '' });
  S.dirty = true; rerender(planEditorHTML); toast('已加入：' + (e?.name || '自訂項目'));
}
function sugAll(){ (S.edit._suggest || []).filter(eid => !S.edit.items.some(it => it.exId === eid)).forEach(eid => { const e = findEx(eid); if (e) S.edit.items.push({ id:Store.newId(), exId:eid, name:e.name, cat:e.cat, dose:e.dose, days:[1, 2, 3, 4, 5], assist:'', how:e.how, caution:e.caution, selfcare:!!e.selfcare, goalId:S.edit.goals[0]?.id || '' }); }); S.dirty = true; rerender(planEditorHTML); }
function savePlan(){
  const p = S.edit;
  const err = [];
  if (!p.prescriberId) err.push('請選擇開立人員');
  if (!p.startDate || !p.reviewDate) err.push('請填寫生效日期與預定再評估日');
  if (p.reviewDate <= p.startDate) err.push('再評估日需晚於生效日期');
  p.goals = p.goals.filter(g => g.text?.trim()); p.problems = p.problems.filter(x => x?.trim()); p.referrals = p.referrals.filter(r => r.to?.trim());
  if (!p.goals.length) err.push('至少需要一項短期目標');
  if (!p.items.length) err.push('至少需要一項處方項目');
  p.items.forEach((it, i) => { if (!it.name?.trim()) err.push(`第${i + 1}項處方未填名稱`); if (!(it.days || []).length) err.push(`「${it.name || i + 1}」未勾選執行日`); });
  if (p.version > 1 && !p.id && !p.changeReason?.trim()) err.push('請填寫修正理由');
  if (err.length) { if (!p.goals.length) p.goals.push({ id:Store.newId(), due:p.reviewDate }); rerender(planEditorHTML); return toast(err.join('；'), 'err'); }
  const isNew = !p.id; delete p._suggest;
  if (isNew) {
    for (const old of Logic.plansOf(p.clientId).filter(x => x.status === '執行中')) { old.status = '已修正'; old.endDate = addDays(p.startDate, -1); old.supersededBy = 'pending'; Store.upsert('plans', old); }
    p.status = '執行中';
  }
  const saved = Store.upsert('plans', p);
  if (isNew) Logic.plansOf(p.clientId).filter(x => x.supersededBy === 'pending').forEach(x => { x.supersededBy = saved.id; Store.upsert('plans', x); });
  S.dirty = false; toast(isNew ? `處方 v${saved.version} 已生效，照服員今日起可於「今日執行」看到` : '處方已更新');
  App.go('#/client/' + p.clientId + '/plan');
  if (isNew && askConfirm('是否列印處方箋（供個案/家屬簽名與照服員參考）？')) printPlan(saved.id);
}
function closePlan(){ if (!askConfirm('確定結案此處方？結案後照服員將不再看到此處方項目。')) return; const p = Store.get('plans', S.edit.id); p.status = '結案'; p.endDate = todayISO(); Store.upsert('plans', p); S.dirty = false; toast('處方已結案'); App.go('#/client/' + p.clientId + '/plan'); }
