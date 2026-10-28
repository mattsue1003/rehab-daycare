/* ================================================================
   業務邏輯：處方有效期、排程、執行率、再評提醒、評鑑檢核、成效指標
   ================================================================ */
const REASSESS_MONTHS = 6;      // B1-4 至少每6個月評估一次
const MEETING_MONTHS = 3;       // B1-6 每3個月至少1次跨專業個案討論會
const DEFAULT_CYCLE_DAYS = 84;  // 復能週期預設12週

const Logic = {
  assessmentsOf: cid => Store.all('assessments').filter(a => a.clientId === cid).sort(byDate('date')),
  lastAssessment(cid){ return this.assessmentsOf(cid).at(-1) || null; },
  plansOf: cid => Store.all('plans').filter(p => p.clientId === cid).sort((a, b) => (a.version || 0) - (b.version || 0)),
  activePlan(cid){ return this.plansOf(cid).filter(p => p.status === '執行中').at(-1) || null; },
  planOn(cid, iso){ return this.plansOf(cid).filter(p => p.startDate <= iso && (!p.endDate || p.endDate >= iso) && p.status !== '草稿').at(-1) || null; },
  itemsOn(plan, iso){ if (!plan) return []; const w = weekday(iso); return (plan.items || []).filter(it => (it.days || []).includes(w)); },

  index(){
    const ex = new Map(), vi = new Map(), exDay = new Set();
    for (const e of Store.all('execs')) { ex.set(e.clientId + '|' + e.itemId + '|' + e.date, e); exDay.add(e.clientId + '|' + e.date); }
    for (const v of Store.all('vitals')) vi.set(v.clientId + '|' + v.date, v);
    return { ex, vi, exDay };
  },
  /* 個案某日是否「應執行」：有出席紀錄=出席；無紀錄則看固定到班日 */
  expected(client, iso, idx){
    const v = idx.vi.get(client.id + '|' + iso);
    if (v && v.present === false) return false;
    if (v && v.present === true) return true;
    if (idx.exDay.has(client.id + '|' + iso)) return true;
    return (client.attendDays || []).includes(weekday(iso));
  },
  /* 執行統計：from~to（含），回傳整體與分項 */
  execStats(client, from, to, idx){
    idx = idx || this.index();
    const res = { expected:0, done:0, partial:0, skipped:0, missing:0, selfcare:0, byItem:{}, byCat:{} };
    const end = to > todayISO() ? todayISO() : to;
    if (client.admitDate && from < client.admitDate) from = client.admitDate;
    for (let d = from; d <= end; d = addDays(d, 1)) {
      const plan = this.planOn(client.id, d); if (!plan) continue;
      if (!this.expected(client, d, idx)) continue;
      for (const it of this.itemsOn(plan, d)) {
        res.expected++;
        const bi = res.byItem[it.id] ||= { name:it.name, cat:it.cat, expected:0, done:0, partial:0, skipped:0, missing:0 };
        const bc = res.byCat[it.cat || '其他'] ||= { expected:0, done:0, partial:0 };
        bi.expected++; bc.expected++;
        const e = idx.ex.get(client.id + '|' + it.id + '|' + d);
        if (!e) { res.missing++; bi.missing++; }
        else if (e.status === '完成') { res.done++; bi.done++; bc.done++; if (it.selfcare) res.selfcare++; }
        else if (e.status === '部分') { res.partial++; bi.partial++; bc.partial++; if (it.selfcare) res.selfcare++; }
        else { res.skipped++; bi.skipped++; }
      }
    }
    res.rate = res.expected ? Math.round((res.done + res.partial * 0.5) / res.expected * 100) : null;
    return res;
  },

  /* 再評估到期：取「上次評估+6個月」與「處方預定再評日」較早者 */
  reassessDue(cid){
    const last = this.lastAssessment(cid), plan = this.activePlan(cid);
    if (!last) return null;
    const six = addMonths(last.date, REASSESS_MONTHS);
    if (plan?.reviewDate && plan.reviewDate < six) return { date:plan.reviewDate, why:'處方預定再評日' };
    return { date:six, why:'距上次評估滿6個月' };
  },

  /* 單一個案的評鑑檢核 */
  clientChecks(c){
    const as = this.assessmentsOf(c.id), last = as.at(-1), plan = this.activePlan(c.id), today = todayISO();
    const first = as.find(a => a.type === '初評') || as[0];
    const due = this.reassessDue(c.id);
    const domains = a => !!(a && scoreBarthel(a) && !scoreBarthel(a).partial && (a.psycho || scoreSPMSQ(a) || scoreGDS(a)) && a.social && a.lifeEvents);
    const flagged = last ? suggestFromAssessment(last, c).filter(s => s.referral) : [];
    const refs = (plan?.referrals || []).filter(r => r.to);
    const idx = this.index();
    const st = plan ? this.execStats(c, addDays(today, -29), today, idx) : null;
    return {
      hasPlan: !!plan,
      domains: domains(first) || domains(last),
      planFromAssess: !!(plan && plan.assessmentId && (plan.goals || []).length && (plan.items || []).length),
      execRecorded: !!(st && st.expected && st.missing / st.expected < 0.2),
      reassessOK: !!(due && due.date >= today),
      reassessDue: due,
      referralOK: flagged.length === 0 || refs.length > 0,
      flagged, st, plan, last,
      lastContact: Store.all('contacts').filter(x => x.clientId === c.id).sort(byDate('date')).at(-1)?.date || null,
    };
  },

  meetings(){ return Store.all('meetings').sort(byDate('date')); },
  lastMeeting(){ return this.meetings().at(-1) || null; },
  openDecisions(){ const out = []; for (const m of this.meetings()) for (const d of (m.decisions || [])) if (d.status !== '已完成') out.push({ ...d, meetingId:m.id, meetingDate:m.date }); return out; },
  meetingDisciplines(m){ const set = new Set(); (m.attendees || []).forEach(id => { const r = staffRole(id); if (r) set.add(r); }); (m.external || []).forEach(x => x.discipline && set.add(x.discipline)); return [...set]; },

  /* 照服員回報警示（7天內不適停止、或標記需治療師注意且未處理） */
  alerts(){
    const since = addDays(todayISO(), -7);
    return Store.all('execs').filter(e => e.date >= since && (e.tolerance === '不適停止' || e.flag) && !e.ack).sort(byDate('date')).reverse();
  },
  /* 連續3次以上未執行之處方項目 */
  repeatedSkips(){
    const out = [];
    for (const c of Store.all('clients').filter(c => c.status === '服務中')) {
      const plan = this.activePlan(c.id); if (!plan) continue;
      for (const it of plan.items || []) {
        const es = Store.all('execs').filter(e => e.clientId === c.id && e.itemId === it.id).sort(byDate('date')).slice(-3);
        if (es.length === 3 && es.every(e => e.status === '未執行' && e.reason !== '個案請假/未到')) out.push({ client:c, item:it, reasons:[...new Set(es.map(e => e.reason))].join('、') });
      }
    }
    return out;
  },

  /* 成效指標 */
  outcomes(){
    const clients = Store.all('clients').filter(c => c.status !== '結案' || c.closeDate >= addMonths(todayISO(), -12));
    let pairs = 0, keep = 0, improve = 0, goals = 0, met = 0, copmN = 0, copmUp = 0;
    for (const c of clients) {
      const as = this.assessmentsOf(c.id).filter(a => scoreBarthel(a) && !scoreBarthel(a).partial);
      if (as.length >= 2) { const a0 = scoreBarthel(as.at(-2)).total, a1 = scoreBarthel(as.at(-1)).total; pairs++; if (a1 >= a0) keep++; if (a1 > a0) improve++; }
      for (const a of this.assessmentsOf(c.id)) for (const g of (a.goalReview || [])) if (g.gas !== '' && g.gas != null) { goals++; if (+g.gas >= 0) met++; }
      const cs = this.assessmentsOf(c.id).filter(a => (a.copm || []).some(x => x.activity && x.perf));
      if (cs.length >= 2) { const p = a => { const v = a.copm.filter(x => x.activity && x.perf).map(x => +x.perf); return v.reduce((s, x) => s + x, 0) / v.length; }; copmN++; if (p(cs.at(-1)) - p(cs[0]) >= 2) copmUp++; }
    }
    const today = todayISO(), from = addDays(today, -29), idx = this.index();
    let ex = 0, dn = 0, pa = 0, days = 0;
    for (const c of Store.all('clients').filter(c => c.status === '服務中')) { const s = this.execStats(c, from, today, idx); ex += s.expected; dn += s.done; pa += s.partial; }
    for (const v of Store.all('vitals')) if (v.present && v.date >= addMonths(today, -12)) days++;
    const falls = Store.all('incidents').filter(i => i.type === '跌倒' && i.datetime?.slice(0, 10) >= addMonths(today, -12)).length;
    return {
      adlKeep: pct(keep, pairs), adlImprove: pct(improve, pairs), pairs,
      goalMet: pct(met, goals), goals,
      copmUp: pct(copmUp, copmN), copmN,
      execRate: ex ? Math.round((dn + pa * 0.5) / ex * 100) : null, ex,
      fallRate: days ? Math.round(falls / days * 1000 * 100) / 100 : null, falls, days,
    };
  },
};
