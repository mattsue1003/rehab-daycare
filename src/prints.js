/* ================================================================
   列印：復能處方箋、評估報告、個案復能歷程、討論會、意外事件
   ================================================================ */
function pClientHead(c){ return `<table class="p-t"><tr><th>姓名</th><td>${esc(c.name)}</td><th>性別/年齡</th><td>${esc(c.gender || '')} ${ageAt(c.birth) ?? ''}歲</td><th>CMS</th><td>${esc(CMS_LEVELS[c.cmsLevel] || '')}</td></tr>
  <tr><th>診斷</th><td colspan="3">${esc(c.diagnoses || '')}</td><th>收案日</th><td>${rocDate(c.admitDate)}</td></tr>
  <tr><th>輔具</th><td>${esc(c.aids || '')}</td><th>飲食</th><td>${esc(c.diet || '')}</td><th>過敏/注意</th><td>${esc(c.allergy || '')}</td></tr></table>`; }
const sign = list => `<div class="p-sign">${list.map(x => `<div>${x}：<span></span></div>`).join('')}</div>`;

function planPrintHTML(p){
  const c = Store.get('clients', p.clientId), a = p.assessmentId ? Store.get('assessments', p.assessmentId) : null;
  return `${pClientHead(c)}
  <h4>處方資訊</h4><table class="p-t"><tr><th>版本</th><td>v${p.version}（${esc(p.status)}）</td><th>生效日</th><td>${rocDate(p.startDate)}</td><th>預定再評</th><td>${rocDate(p.reviewDate)}</td></tr>
  <tr><th>開立人員</th><td>${esc(staffName(p.prescriberId))}（${esc(staffRole(p.prescriberId))}）</td><th>依據評估</th><td colspan="3">${a ? `${rocDate(a.date)} ${esc(a.type)}｜巴氏 ${scoreBarthel(a)?.total ?? '—'}、IADL ${scoreIADL(a)?.total ?? '—'}、TUG ${a.phy?.tug || '—'}秒、30秒坐站 ${a.phy?.cs30 || '—'}次` : '—'}</td></tr>
  ${p.changeReason ? `<tr><th>修正理由</th><td colspan="5">${esc(p.changeReason)}</td></tr>` : ''}</table>
  <h4>問題確立</h4><ol>${(p.problems || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
  <h4>目標</h4><p><b>長期目標：</b>${esc(p.longGoal || '')}</p>
  <table class="p-t"><thead><tr><th>#</th><th>短期目標</th><th>評量方式</th><th>基準</th><th>目標</th><th>預計達成</th></tr></thead><tbody>${(p.goals || []).map((g, i) => `<tr><td>${i + 1}</td><td>${esc(g.text)}</td><td>${esc(g.measure || '')}</td><td>${esc(g.baseline || '')}</td><td>${esc(g.target || '')}</td><td>${rocDate(g.due)}</td></tr>`).join('')}</tbody></table>
  <h4>復能處方項目</h4><table class="p-t"><thead><tr><th>#</th><th>項目</th><th>劑量</th><th>執行日</th><th>目標協助</th><th>執行說明／注意事項</th></tr></thead><tbody>${(p.items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.name)}${it.selfcare ? '<br>（自立支援）' : ''}${it.goalId ? `<br><small>對應目標${(p.goals || []).findIndex(g => g.id === it.goalId) + 1}</small>` : ''}</td><td>${esc(it.dose)}</td><td>週${(it.days || []).map(w => WEEKDAYS[w]).join('、')}</td><td>${esc(it.assist || '')}</td><td>${esc(it.how || '')}${it.caution ? `<br><b>注意：</b>${esc(it.caution)}` : ''}</td></tr>`).join('')}</tbody></table>
  ${(p.referrals || []).length ? `<h4>轉介</h4><table class="p-t"><thead><tr><th>對象</th><th>原因</th><th>日期</th><th>結果</th></tr></thead><tbody>${p.referrals.map(r => `<tr><td>${esc(r.to)}</td><td>${esc(r.reason || '')}</td><td>${rocDate(r.date)}</td><td>${esc(r.result || '')}</td></tr>`).join('')}</tbody></table>` : ''}
  ${p.note ? `<h4>居家延續建議</h4><p>${esc(p.note)}</p>` : ''}
  <p>${p.consent?.explained ? `☑ 已於 ${rocDate(p.consent.date)} 向 ${esc(p.consent.by || '')} 說明處方內容並取得同意` : '☐ 已向個案/家屬說明處方內容並取得同意'}</p>
  ${sign(['開立人員', '督導/主任', '個案/家屬', '照顧服務員'])}`;
}
function printPlan(id){ const p = Store.get('plans', id); printHTML('復能處方箋（個別化服務計畫）', planPrintHTML(p)); }

function assessPrintHTML(a){
  const c = Store.get('clients', a.clientId), b = scoreBarthel(a), i = scoreIADL(a), s = scoreSPMSQ(a), g = scoreGDS(a), m = scoreMNA(a), p = a.phy || {};
  return `${pClientHead(c)}
  <table class="p-t"><tr><th>評估日期</th><td>${rocDate(a.date)}</td><th>類別</th><td>${esc(a.type)}</td><th>評估人員</th><td>${esc(staffName(a.assessorId))}（${esc(staffRole(a.assessorId))}）</td></tr></table>
  <h4>量表結果</h4><table class="p-t"><tbody>
    <tr><th>巴氏量表</th><td>${b ? b.total + '分（' + b.level + '）' : '—'}</td><th>IADL</th><td>${i ? i.total + '/8' : '—'}</td></tr>
    <tr><th>SPMSQ</th><td>${s ? `錯 ${s.errors} 題（${spmsqLevel(s.adj)}）` : '—'}</td><th>GDS-15</th><td>${g ? g.total + '分' + (g.total >= 5 ? '（疑似憂鬱）' : '') : '—'}</td></tr>
    <tr><th>MNA-SF</th><td>${m ? m.total + '分（' + mnaLevel(m.total) + '）' : '—'}</td><th>疼痛 NRS</th><td>${a.pain?.nrs ?? '—'} ${esc(a.pain?.site || '')}</td></tr>
    <tr><th>TUG</th><td>${p.tug || '—'} 秒 ${esc(p.tugAid || '')}</td><th>單腳站</th><td>${p.oneLeg || '—'} 秒</td></tr>
    <tr><th>30秒坐站</th><td>${p.cs30 ?? '—'} 次</td><th>5次坐站</th><td>${p.cs5 || '—'} 秒</td></tr>
    <tr><th>握力</th><td>${p.grip || '—'} kg</td><th>步速</th><td>${gaitSpeed(a) ?? '—'} m/s</td></tr>
    <tr><th>身高/體重</th><td>${p.height || '—'} cm / ${p.weight || '—'} kg</td><th>BMI</th><td>${calcBMI(a) ?? '—'}</td></tr></tbody></table>
  <h4>巴氏量表明細</h4><table class="p-t"><tbody>${BARTHEL.map(it => `<tr><th>${it.n}</th><td>${a.adl?.[it.k] ?? '—'} 分</td><td>${esc(it.opts.find(o => o[0] === +a.adl?.[it.k])?.[1] || '')}</td></tr>`).join('')}</tbody></table>
  <h4>身心社會評估</h4><table class="p-t"><tbody><tr><th>生理狀況</th><td>${esc(a.physio || '')}</td></tr><tr><th>心理認知情緒</th><td>${esc(a.psycho || '')}</td></tr><tr><th>家庭社會支持</th><td>${esc(a.social || '')}</td></tr><tr><th>重大生命事件</th><td>${esc(a.lifeEvents || '')}</td></tr><tr><th>期待</th><td>${esc(a.expect || '')}</td></tr></tbody></table>
  ${(a.copm || []).some(x => x.activity) ? `<h4>有意義活動目標</h4><table class="p-t"><thead><tr><th>活動</th><th>重要性</th><th>表現</th><th>滿意度</th></tr></thead><tbody>${a.copm.filter(x => x.activity).map(x => `<tr><td>${esc(x.activity)}</td><td>${x.imp ?? ''}</td><td>${x.perf ?? ''}</td><td>${x.sat ?? ''}</td></tr>`).join('')}</tbody></table>` : ''}
  ${(a.goalReview || []).length ? `<h4>前次目標達成評值</h4><table class="p-t"><thead><tr><th>目標</th><th>基準→目標</th><th>現值</th><th>GAS</th><th>說明</th></tr></thead><tbody>${a.goalReview.map(g => `<tr><td>${esc(g.text)}</td><td>${esc(g.baseline || '')}→${esc(g.target || '')}</td><td>${esc(g.current || '')}</td><td>${(GAS.find(x => x[0] === +g.gas) || ['', ''])[1]}</td><td>${esc(g.note || '')}</td></tr>`).join('')}</tbody></table>` : ''}
  <h4>問題確立</h4><ol>${(a.problems || []).map(x => `<li>${esc(x.text)}${x.referral ? `（轉介：${esc(x.referral)}）` : ''}</li>`).join('')}</ol>
  <h4>評估摘要</h4><p>${esc(a.summary || '')}</p>${sign(['評估人員', '督導/主任'])}`;
}
function printAssessment(id){ printHTML('個案評估紀錄', assessPrintHTML(Store.get('assessments', id))); }

function dossierHTML(c){
  const as = Logic.assessmentsOf(c.id), ps = Logic.plansOf(c.id), today = todayISO();
  const st = Logic.execStats(c, addDays(today, -89), today);
  const pts = f => as.map(a => ({ x:a.date, y:f(a) }));
  const contacts = Store.all('contacts').filter(x => x.clientId === c.id).sort(byDate('date')).slice(-8);
  const meets = Logic.meetings().filter(m => (m.cases || []).some(x => x.clientId === c.id));
  return `${pClientHead(c)}
  <h4>評估歷程</h4><table class="p-t"><thead><tr><th>日期</th><th>類別</th><th>評估者</th><th>巴氏</th><th>IADL</th><th>SPMSQ錯</th><th>TUG</th><th>30秒坐站</th><th>握力</th><th>步速</th><th>GDS</th><th>MNA</th></tr></thead><tbody>${as.map(a => `<tr><td>${rocDate(a.date)}</td><td>${esc(a.type)}</td><td>${esc(staffName(a.assessorId))}</td><td>${scoreBarthel(a)?.total ?? ''}</td><td>${scoreIADL(a)?.total ?? ''}</td><td>${scoreSPMSQ(a)?.errors ?? ''}</td><td>${a.phy?.tug || ''}</td><td>${a.phy?.cs30 ?? ''}</td><td>${a.phy?.grip || ''}</td><td>${gaitSpeed(a) ?? ''}</td><td>${scoreGDS(a)?.total ?? ''}</td><td>${scoreMNA(a)?.total ?? ''}</td></tr>`).join('')}</tbody></table>
  <div class="p-charts"><div><b>巴氏量表</b>${lineChart(pts(a => scoreBarthel(a)?.partial ? null : scoreBarthel(a)?.total), { min:0, max:100 })}</div><div><b>30秒坐站</b>${lineChart(pts(a => a.phy?.cs30), { min:0 })}</div><div><b>TUG（秒）</b>${lineChart(pts(a => a.phy?.tug), { cut:13.5 })}</div></div>
  ${anthroOf(c.id).length ? `<h4>每月體位量測（臂中圍／小腿圍）</h4><table class="p-t"><thead><tr><th>日期</th><th>臂中圍 cm</th><th>小腿圍 cm</th><th>提醒</th></tr></thead><tbody>${anthroOf(c.id).slice(-12).map(r => `<tr><td>${rocDate(r.date)}</td><td>${r.mac ?? ''}</td><td>${r.calf ?? ''}</td><td>${esc(anthroFlags(c, r).join('；'))}</td></tr>`).join('')}</tbody></table>` : ''}
  <h4>處方版本歷程</h4><table class="p-t"><thead><tr><th>版本</th><th>期間</th><th>開立</th><th>項目</th><th>修正理由</th></tr></thead><tbody>${ps.map(p => `<tr><td>v${p.version}<br>${esc(p.status)}</td><td>${rocDate(p.startDate)}～${p.endDate ? rocDate(p.endDate) : ''}</td><td>${esc(staffName(p.prescriberId))}</td><td>${(p.items || []).map(i => esc(i.name)).join('、')}</td><td>${esc(p.changeReason || '')}</td></tr>`).join('')}</tbody></table>
  <h4>近90天執行狀況</h4><p>應執行 ${st.expected} 次｜完成 ${st.done}｜部分 ${st.partial}｜未執行 ${st.skipped}｜未記錄 ${st.missing}｜執行率 <b>${st.rate ?? '—'}%</b>｜自立支援執行 ${st.selfcare} 次</p>
  <table class="p-t"><thead><tr><th>項目</th><th>應執行</th><th>完成</th><th>部分</th><th>未執行</th><th>未記錄</th></tr></thead><tbody>${Object.values(st.byItem).map(b => `<tr><td>${esc(b.name)}</td><td>${b.expected}</td><td>${b.done}</td><td>${b.partial}</td><td>${b.skipped}</td><td>${b.missing}</td></tr>`).join('')}</tbody></table>
  ${meets.length ? `<h4>個案討論會</h4><table class="p-t"><tbody>${meets.map(m => `<tr><th>${rocDate(m.date)}</th><td>${esc((m.cases.find(x => x.clientId === c.id) || {}).discussion || '')}${(m.decisions || []).filter(d => d.clientId === c.id).map(d => `<br>決議：${esc(d.text)}（${esc(d.status || '')}）`).join('')}</td></tr>`).join('')}</tbody></table>` : ''}
  ${contacts.length ? `<h4>家屬聯繫（近期）</h4><table class="p-t"><tbody>${contacts.map(x => `<tr><th>${rocDate(x.date)}</th><td>${esc(x.method)}｜${esc(x.person || '')}：${esc(x.content || '')}</td></tr>`).join('')}</tbody></table>` : ''}`;
}
function printClientDossier(id){ printHTML('個案復能歷程報告', dossierHTML(Store.get('clients', id))); }
function printSample(){
  const act = Store.all('clients').filter(c => c.status === '服務中'); if (!act.length) return toast('沒有服務中個案', 'err');
  const pick = [...act].sort(() => Math.random() - 0.5).slice(0, 3);
  const html = pick.map((c, i) => { const p = Logic.activePlan(c.id), a = Logic.lastAssessment(c.id); return `<div class="${i ? 'p-break' : ''}"><h3>抽閱個案 ${i + 1}：${esc(c.name)}</h3>${dossierHTML(c)}${a ? `<div class="p-break"><h3>${esc(c.name)}｜最近一次評估</h3>${assessPrintHTML(a)}</div>` : ''}${p ? `<div class="p-break"><h3>${esc(c.name)}｜生效中復能處方</h3>${planPrintHTML(p)}</div>` : ''}</div>`; }).join('');
  printHTML('評鑑抽閱資料（B1 隨機抽閱三位服務對象）', html);
}
function printMeeting(id){
  const m = Store.get('meetings', id), dis = Logic.meetingDisciplines(m);
  printHTML('跨專業個案討論會紀錄', `<table class="p-t"><tr><th>日期</th><td>${rocDate(m.date)}</td><th>類型</th><td>${esc(m.type)}</td><th>主席</th><td>${esc(staffName(m.hostId))}</td></tr>
    <tr><th>出席</th><td colspan="5">${(m.attendees || []).map(id => `${esc(staffName(id))}（${esc(staffRole(id))}）`).join('、')}${(m.external || []).filter(x => x.name).map(x => `、${esc(x.name)}（${esc(x.discipline || '')}）`).join('')}</td></tr>
    <tr><th>參與專業</th><td colspan="5">${dis.length} 種：${esc(dis.join('、'))}</td></tr></table>
    <h4>前次決議追蹤</h4>${(m.followups || []).length ? `<table class="p-t"><thead><tr><th>決議</th><th>個案</th><th>負責人</th><th>狀態</th><th>追蹤說明</th></tr></thead><tbody>${m.followups.map(f => `<tr><td>${esc(f.text)}</td><td>${esc(f.clientId ? clientName(f.clientId) : '')}</td><td>${esc(staffName(f.owner))}</td><td>${esc(f.status)}</td><td>${esc(f.note || '')}</td></tr>`).join('')}</tbody></table>` : '<p>無</p>'}
    <h4>個案討論</h4><table class="p-t"><tbody>${(m.cases || []).map(x => `<tr><th>${esc(clientName(x.clientId))}</th><td>${esc(x.discussion || '')}</td></tr>`).join('')}</tbody></table>
    ${m.content ? `<h4>其他討論</h4><p>${esc(m.content)}</p>` : ''}
    <h4>本次決議</h4><table class="p-t"><thead><tr><th>#</th><th>決議事項</th><th>個案</th><th>負責人</th><th>期限</th></tr></thead><tbody>${(m.decisions || []).map((d, i) => `<tr><td>${i + 1}</td><td>${esc(d.text)}</td><td>${esc(d.clientId ? clientName(d.clientId) : '')}</td><td>${esc(staffName(d.owner))}</td><td>${rocDate(d.due)}</td></tr>`).join('')}</tbody></table>
    ${sign(['紀錄', '主席', '業務負責人'])}`);
}
function printIncident(id){
  const i = Store.get('incidents', id);
  printHTML('意外事件處理紀錄', `<table class="p-t"><tr><th>發生時間</th><td>${rocDate(i.datetime)} ${(i.datetime || '').slice(11, 16)}</td><th>個案</th><td>${esc(clientName(i.clientId))}</td><th>類型</th><td>${esc(i.type)}</td></tr>
    <tr><th>地點</th><td>${esc(i.place || '')}</td><th>通報人</th><td>${esc(staffName(i.reporterId))}</td><th>傷害程度</th><td>${esc(i.severity || '')}</td></tr>
    <tr><th>事件經過</th><td colspan="5">${esc(i.description || '')}</td></tr><tr><th>立即處理</th><td colspan="5">${esc(i.handling || '')}</td></tr>
    <tr><th>送醫</th><td>${i.toHospital ? '是' : '否'} ${esc(i.hospital || '')}</td><th>送醫前處置</th><td colspan="3">${esc(i.preCare || '')}</td></tr>
    <tr><th>家屬通知</th><td>${esc((i.familyAt || '').replace('T', ' '))}</td><th>對象/方式</th><td>${esc(i.familyWho || '')}</td><th>家屬回應</th><td>${esc(i.familyNote || '')}</td></tr>
    <tr><th>原因分析</th><td colspan="5">${esc(i.analysis || '')}</td></tr><tr><th>改善措施</th><td colspan="5">${esc(i.improvement || '')}</td></tr><tr><th>追蹤結果</th><td colspan="5">${esc(i.followUp || '')}</td></tr></table>
    ${sign(['通報人', '護理師', '業務負責人'])}`);
}
function printReport(){ printHTML('評鑑自主檢核表', $('#report-body').innerHTML); }
