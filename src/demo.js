/* ================================================================
   示範資料（所有紀錄標記 demo:true，可於設定一鍵清除）
   ================================================================ */
function loadDemo(){
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const T = todayISO(), ago = n => addDays(T, -n);
  const put = (c, o) => Store.upsert(c, { ...o, demo:true });
  const staff = [['demo_pt', '林○君', '物理治療師'], ['demo_ot', '陳○宏', '職能治療師'], ['demo_rn', '張○玲', '護理師'], ['demo_sw', '李○穎', '社工'], ['demo_cw1', '黃○英', '照顧服務員'], ['demo_cw2', '吳○明', '照顧服務員'], ['demo_dir', '周○○（主任）', '主任/業務負責人']];
  staff.forEach(([id, name, role]) => { if (!Store.get('staff', id)) put('staff', { id, name, role, active:true }); });
  if (!Store.DB.meta.center) Store.setMeta('center', '示範日間照顧中心（資料皆為虛構）');

  const C = {
    wang:{ id:'demo_c1', name:'王○蘭', gender:'女', birth:'1942-03-15', cmsLevel:4, admitDate:ago(135), status:'服務中', attendDays:[1, 2, 3, 4, 5], diagnoses:'腦中風（右側偏癱）、高血壓', diet:'軟質', aids:'四腳拐', cgName:'王○惠', cgRel:'女兒', cgPhone:'09xx-xxx-111' },
    chen:{ id:'demo_c2', name:'陳○水', gender:'男', birth:'1938-08-02', cmsLevel:5, admitDate:ago(175), status:'服務中', attendDays:[1, 3, 5], diagnoses:'輕度失智症、高血壓、攝護腺肥大', dementia:true, diet:'一般', aids:'助行器', cgName:'陳○豪', cgRel:'兒子', cgPhone:'09xx-xxx-222' },
    chang:{ id:'demo_c3', name:'張○雄', gender:'男', birth:'1950-11-20', cmsLevel:6, admitDate:ago(65), status:'服務中', attendDays:[1, 2, 3, 4, 5], diagnoses:'巴金森氏症、姿勢性低血壓', diet:'細碎', aids:'輪椅（短距離助行器）', noWeight:true, cgName:'林○芬', cgRel:'配偶', cgPhone:'09xx-xxx-333' },
    lin:{ id:'demo_c4', name:'林○玉', gender:'女', birth:'1945-05-09', cmsLevel:3, admitDate:ago(4), status:'服務中', attendDays:[2, 4], diagnoses:'雙膝退化性關節炎、第二型糖尿病', diet:'一般', aids:'', cgName:'林○國', cgRel:'兒子', cgPhone:'09xx-xxx-444' },
  };
  Object.values(C).forEach(c => put('clients', c));

  const gdsAns = n => GDS15.map((q, i) => i < n ? q[1] : (q[1] === 'y' ? 'n' : 'y'));
  const spm = e => SPMSQ.map((q, i) => i >= 10 - e ? 'x' : 'c');
  function mkA(c, d, type, by, adl, iadl, err, edu, phy, gds, mna, txt, copm, extra = {}){
    const keys = BARTHEL.map(x => x.k), ik = IADL.map(x => x.k);
    const a = { clientId:c.id, date:ago(d), type, assessorId:by, adl:Object.fromEntries(keys.map((k, i) => [k, adl[i]])), iadl:Object.fromEntries(ik.map((k, i) => [k, iadl[i]])),
      spmsq:{ items:spm(err), edu }, gds:gds == null ? Array(15).fill('') : gdsAns(gds), mna:{ A:mna[0], B:mna[1], C:mna[2], D:mna[3], E:mna[4] }, phy, pain:{ nrs:txt.pain || 0, site:txt.site || '' },
      physio:txt.physio, psycho:txt.psycho, social:txt.social, lifeEvents:txt.life, expect:txt.expect, copm, summary:txt.summary, ...extra };
    const sg = suggestFromAssessment(a, c); a.problemSel = Object.fromEntries(sg.map(s => [s.code, true])); a.problems = sg; a.customProblems = '';
    return put('assessments', a);
  }
  const item = (id, exId, dose, days, assist, goalId) => { const e = findEx(exId); return { id, exId, name:e.name, cat:e.cat, dose:dose || e.dose, days:days || [1, 2, 3, 4, 5], assist:assist || '', how:e.how, caution:e.caution, selfcare:!!e.selfcare, goalId }; };

  /* 王○蘭：初評 → v1 → 再評 → v2 */
  const wTxt = { physio:'右側偏癱，右手精細動作差；血壓控制穩定；睡眠可；偶有便秘。', psycho:'意識清楚，情緒穩定，對復健積極；偶因無法自己如廁感到沮喪。', social:'與女兒同住，女兒白天上班；週末由女兒照顧；經濟穩定；過去常參加社區廟宇活動。', life:'一年前中風住院；先生三年前過世。', expect:'希望可以自己上廁所，再去市場買菜。', summary:'右側偏癱，移位與如廁需少量協助，下肢肌力與平衡不足，跌倒風險高。個案動機強，以如廁自立與社區步行為目標。', pain:2, site:'右肩' };
  const wa1 = mkA(C.wang, 130, '初評', 'demo_pt', [10, 10, 5, 5, 0, 10, 5, 5, 10, 10], [1, 3, 3, 1, 1, 3, 1, 1], 1, 'low', { height:152, weight:55, tug:22.4, tugAid:'四腳拐', oneLeg:1.5, cs30:5, cs5:19, grip:12.5, gait4:8.2 }, 3, [1, 2, 1, 2, 2], wTxt, [{ activity:'自己上廁所', imp:10, perf:3, sat:2 }, { activity:'自己走去市場買菜', imp:8, perf:1, sat:1 }]);
  const g = ['demo_g1', 'demo_g2', 'demo_g3'];
  const wGoals = [{ id:g[0], text:'30秒坐站由5次進步至8次', measure:'30秒坐站', baseline:'5次', target:'8次', due:ago(46) }, { id:g[1], text:'在監督下自行完成如廁（含穿脫褲）', measure:'巴氏如廁', baseline:'5分', target:'10分', due:ago(46) }, { id:g[2], text:'使用四腳拐於走廊步行50公尺不需休息', measure:'步行距離', baseline:'20公尺', target:'50公尺', due:ago(46) }];
  const wItems1 = [item('demo_i1', 'str_sitstand', '8下 × 2組', null, '少量協助(<25%)', g[0]), item('demo_i2', 'bal_chair_oneleg', '每側5秒 × 3次', null, '少量協助(<25%)', g[0]), item('demo_i3', 'adl_toilet', null, null, '監督/口頭提示', g[1]), item('demo_i4', 'end_walk', '20公尺 × 2趟', null, '監督/口頭提示', g[2]), item('demo_i5', 'adl_dress', null, [1, 3, 5], '少量協助(<25%)', g[1])];
  const wp1 = put('plans', { clientId:C.wang.id, assessmentId:wa1.id, version:1, status:'已修正', startDate:ago(128), endDate:ago(39), reviewDate:ago(44), prescriberId:'demo_pt', problems:wa1.problems.map(p => p.text), longGoal:'能自己拿四腳拐走到社區市場買菜，並能自行如廁。', goals:wGoals, items:wItems1, referrals:[], consent:{ explained:true, by:'個案及女兒', date:ago(128) }, note:'在家每天晚飯後做坐站10下，女兒在旁陪同。' });
  const wa2 = mkA(C.wang, 40, '再評', 'demo_pt', [10, 10, 5, 10, 0, 10, 5, 10, 10, 10], [1, 3, 3, 1, 1, 3, 1, 1], 1, 'low', { height:152, weight:55.5, tug:17.8, tugAid:'四腳拐', oneLeg:3.2, cs30:7, cs5:15.5, grip:13.5, gait4:6.4 }, 2, [2, 3, 1, 2, 2], { ...wTxt, psycho:'情緒穩定，能自己如廁後自信提升，主動參與團體活動。', summary:'如廁已能在監督下自行完成（目標達成），坐站與步行距離進步但未達標。維持肌力訓練並提高劑量，增加平衡訓練。' }, [{ activity:'自己上廁所', imp:10, perf:7, sat:7 }, { activity:'自己走去市場買菜', imp:8, perf:3, sat:3 }],
    { goalReview:[{ goalId:g[0], planId:wp1.id, text:wGoals[0].text, measure:'30秒坐站', baseline:'5次', target:'8次', current:'7次', gas:-1, note:'進步2次，接近目標' }, { goalId:g[1], planId:wp1.id, text:wGoals[1].text, measure:'巴氏如廁', baseline:'5分', target:'10分', current:'10分', gas:0, note:'已能監督下自行如廁' }, { goalId:g[2], planId:wp1.id, text:wGoals[2].text, measure:'步行距離', baseline:'20公尺', target:'50公尺', current:'40公尺', gas:-1, note:'中途休息1次' }] });
  put('plans', { clientId:C.wang.id, assessmentId:wa2.id, version:2, revisedFrom:wp1.id, status:'執行中', startDate:ago(38), reviewDate:addDays(ago(38), DEFAULT_CYCLE_DAYS), prescriberId:'demo_pt', problems:wa2.problems.map(p => p.text), longGoal:'能自己拿四腳拐走到社區市場買菜。',
    goals:[{ id:g[0], text:'30秒坐站達9次', measure:'30秒坐站', baseline:'7次', target:'9次', due:addDays(ago(38), 84) }, { id:g[2], text:'使用四腳拐步行100公尺不需休息', measure:'步行距離', baseline:'40公尺', target:'100公尺', due:addDays(ago(38), 84) }, { id:'demo_g4', text:'TUG 降至 15 秒以下', measure:'TUG', baseline:'17.8秒', target:'<15秒', due:addDays(ago(38), 84) }],
    items:[item('demo_i1', 'str_sitstand', '10下 × 3組', null, '監督/口頭提示', g[0]), item('demo_i2', 'bal_chair_oneleg', '每側10秒 × 3次', null, '監督/口頭提示', 'demo_g4'), item('demo_i6', 'bal_tandem', null, [2, 4], '少量協助(<25%)', 'demo_g4'), item('demo_i4', 'end_walk', '40公尺 × 3趟', null, '監督/口頭提示', g[2]), item('demo_i3', 'adl_toilet', null, null, '監督/口頭提示', '')],
    referrals:[{ to:'營養師評估蛋白質攝取', reason:'握力不足（AWGS 肌少症切點以下）', date:ago(38), result:'建議每餐增加豆魚蛋肉一份，已衛教女兒' }], changeReason:'如廁目標已達成，改為維持；坐站與步行未達標，提高劑量；TUG 仍>13.5秒，新增前後腳站平衡訓練。', consent:{ explained:true, by:'個案及女兒', date:ago(38) }, note:'居家坐站增加為每天2次，每次10下。' });

  /* 陳○水：初評 → v1（再評即將到期） */
  const ca = mkA(C.chen, 170, '初評', 'demo_ot', [10, 15, 5, 10, 0, 10, 5, 10, 10, 5], [1, 2, 3, 1, 1, 2, 1, 1], 4, 'low', { height:165, weight:60, tug:15.2, tugAid:'助行器', oneLeg:4, cs30:9, cs5:14, grip:24, gait4:5.8 }, null, [2, 3, 2, 2, 1],
    { physio:'高血壓服藥中；夜尿2–3次；聽力稍差。', psycho:'輕度失智，短期記憶差，易重複問話；午後偶有焦躁。', social:'與兒子媳婦同住，白天獨居；兒子為主要照顧者，照顧壓力中等。', life:'去年由南部搬來與兒子同住。', expect:'家屬希望維持現有能力、減少走失風險；個案喜歡下象棋。', summary:'輕度失智合併下肢肌力下降，服藥與金錢管理需協助。以維持行走能力及認知刺激為主。' }, [{ activity:'跟朋友下象棋', imp:9, perf:5, sat:4 }]);
  put('plans', { clientId:C.chen.id, assessmentId:ca.id, version:1, status:'執行中', startDate:ago(168), reviewDate:ago(-12), prescriberId:'demo_ot', problems:ca.problems.map(p => p.text), longGoal:'維持獨立行走能力，能參與中心象棋社團。',
    goals:[{ id:'demo_g5', text:'30秒坐站維持9次以上', measure:'30秒坐站', baseline:'9次', target:'≥9次', due:ago(-12) }, { id:'demo_g6', text:'每週參與2次以上認知活動並完成任務', measure:'參與次數', baseline:'0次', target:'2次/週', due:ago(-12) }],
    items:[item('demo_i7', 'str_sitstand', '10下 × 2組', [1, 3, 5], '監督/口頭提示', 'demo_g5'), item('demo_i8', 'str_kneeext', null, [1, 3, 5], '監督/口頭提示', 'demo_g5'), item('demo_i9', 'cog_ro', null, [1, 3, 5], '監督/口頭提示', 'demo_g6'), item('demo_i10', 'cog_game', '象棋/配對 20分鐘', [1, 5], '監督/口頭提示', 'demo_g6'), item('demo_i11', 'iadl_meds', null, [3], '少量協助(<25%)', '')],
    referrals:[{ to:'護理師評估排泄問題', reason:'夜尿、偶有尿失禁', date:ago(167), result:'建議白天定時如廁，傍晚後減少水分' }, { to:'營養師評估蛋白質攝取', reason:'握力不足', date:ago(167), result:'' }], consent:{ explained:true, by:'兒子', date:ago(168) } });

  /* 張○雄：初評（GDS 偏高，需轉介） → v1 */
  const za = mkA(C.chang, 60, '初評', 'demo_pt', [5, 5, 0, 5, 0, 5, 0, 5, 10, 10], [1, 3, 3, 3, 2, 3, 2, 1], 2, 'high', { height:170, weight:58, tug:28, tugAid:'助行器', oneLeg:0, cs30:4, cs5:'', grip:20, gait4:11, note:'5次坐站無法完成' }, 7, [1, 2, 1, 2, 2],
    { physio:'巴金森氏症，步態小碎步、起步困難；姿勢性低血壓，站起易頭暈；吞嚥偶嗆咳。', psycho:'認知尚可，情緒低落，常說「拖累家人」，對活動興趣低。', social:'與太太同住，太太72歲為唯一照顧者，負荷重；兒子住外縣市。', life:'半年前因跌倒髖部挫傷住院。', expect:'太太希望他能自己移位，減輕照顧負擔。', summary:'巴金森氏症合併姿勢性低血壓，移位與行走需中度協助，跌倒風險極高，疑似憂鬱。需轉介社工與營養評估。', pain:3, site:'下背' }, [{ activity:'自己從輪椅移到椅子', imp:9, perf:3, sat:2 }]);
  put('plans', { clientId:C.chang.id, assessmentId:za.id, version:1, status:'執行中', startDate:ago(58), reviewDate:addDays(ago(58), 84), prescriberId:'demo_pt', problems:za.problems.map(p => p.text), longGoal:'能在監督下自行完成輪椅與椅子間移位，減輕太太照顧負擔。',
    goals:[{ id:'demo_g7', text:'輪椅↔椅子移位由中度協助進步至少量協助', measure:'移位協助程度', baseline:'中度協助', target:'少量協助', due:addDays(ago(58), 84) }, { id:'demo_g8', text:'30秒坐站由4次進步至7次', measure:'30秒坐站', baseline:'4次', target:'7次', due:addDays(ago(58), 84) }],
    items:[item('demo_i12', 'adl_transfer', null, null, '中度協助(25–50%)', 'demo_g7'), item('demo_i13', 'str_sitstand', '5下 × 2組', null, '中度協助(25–50%)', 'demo_g8'), item('demo_i14', 'oral_exercise', null, null, '監督/口頭提示', ''), item('demo_i15', 'psy_role', '每日發點心', [1, 3, 5], '監督/口頭提示', '')],
    referrals:[{ to:'社工', reason:'疑似憂鬱情緒（GDS-15＝7）、照顧者負荷', date:ago(57), result:'社工每週關懷1次，已連結家庭照顧者支持服務' }, { to:'語言治療師', reason:'吞嚥偶嗆咳', date:ago(57), result:'' }], consent:{ explained:true, by:'太太', date:ago(58) }, note:'起身前先坐在床邊30秒再站起，預防頭暈。' });

  /* 執行紀錄與出席體溫 */
  const notes = ['今天精神很好，主動要求多做一組', '動作較慢，需多次提示', '做完說腳有點痠', '願意自己嘗試，進步明顯', '午睡後執行，配合度佳'];
  for (const c of [C.wang, C.chen, C.chang]) {
    for (let d = Logic.plansOf(c.id)[0].startDate; d <= T; d = addDays(d, 1)) {
      if (!c.attendDays.includes(weekday(d))) continue;
      const present = rnd() > 0.08;
      put('vitals', { clientId:c.id, date:d, present, temp:present && (d < T || rnd() > 0.5) ? Math.round((36 + rnd() * 1.1) * 10) / 10 : '' });
      if (!present || d === T) continue;
      const plan = Logic.planOn(c.id, d);
      for (const it of Logic.itemsOn(plan, d)) {
        if (rnd() < 0.04) continue; // 少量漏記
        const r = rnd(), st = r < 0.76 ? '完成' : r < 0.9 ? '部分' : '未執行';
        const e = { clientId:c.id, itemId:it.id, date:d, status:st, planId:plan.id, itemName:it.name, cat:it.cat, staffId:rnd() > 0.5 ? 'demo_cw1' : 'demo_cw2', assist:it.assist, tolerance:st === '完成' ? (rnd() > 0.2 ? '良好' : '尚可') : '疲累', amount:st === '完成' ? it.dose : '', ack:{ by:'demo_pt', at:d } };
        if (st === '未執行') e.reason = SKIP_REASONS[Math.floor(rnd() * 4) + 1];
        if (rnd() < 0.08) e.note = notes[Math.floor(rnd() * notes.length)];
        put('execs', e);
      }
    }
  }
  const yd = (() => { let d = addDays(T, -1); while (!C.chang.attendDays.includes(weekday(d))) d = addDays(d, -1); return d; })();
  const ex = Store.all('execs').find(e => e.clientId === C.chang.id && e.itemId === 'demo_i13' && e.date === yd);
  if (ex) { ex.status = '部分'; ex.tolerance = '不適停止'; ex.flag = true; ex.note = '第2組站起時頭暈、臉色蒼白，量血壓 92/58，已坐下休息並通知護理師'; delete ex.ack; Store.upsert('execs', ex); }

  /* 討論會 */
  const m1 = put('meetings', { date:ago(165), type:'定期跨專業個案討論會', hostId:'demo_dir', attendees:['demo_dir', 'demo_pt', 'demo_ot', 'demo_rn', 'demo_sw', 'demo_cw1'], external:[], followups:[], content:'',
    cases:[{ clientId:C.chen.id, discussion:'OT：新收案，輕度失智，午後焦躁。RN：夜尿多影響睡眠。SW：兒子照顧壓力中等。' }, { clientId:C.wang.id, discussion:'PT：坐站進步中，如廁仍需協助穿褲。照服員：長輩很配合。' }],
    decisions:[{ id:'demo_d1', clientId:C.chen.id, text:'午後安排象棋活動，觀察焦躁是否改善', owner:'demo_ot', due:ago(135), status:'已完成', followNote:'焦躁次數減少' }, { id:'demo_d2', clientId:C.wang.id, text:'如廁時改為口頭提示，讓長輩自行穿脫褲', owner:'demo_cw1', due:ago(135), status:'已完成' }] });
  put('meetings', { date:ago(75), type:'定期跨專業個案討論會', hostId:'demo_dir', attendees:['demo_dir', 'demo_pt', 'demo_ot', 'demo_rn', 'demo_sw', 'demo_cw2'], external:[{ name:'吳○○（特約營養師）', discipline:'營養師' }],
    followups:[{ meetingId:m1.id, decisionId:'demo_d1', text:'午後安排象棋活動，觀察焦躁是否改善', clientId:C.chen.id, owner:'demo_ot', status:'已完成', note:'焦躁次數由每週3次降為1次' }, { meetingId:m1.id, decisionId:'demo_d2', text:'如廁時改為口頭提示，讓長輩自行穿脫褲', clientId:C.wang.id, owner:'demo_cw1', status:'已完成', note:'已可監督下自行完成' }],
    cases:[{ clientId:C.wang.id, discussion:'PT：如廁目標接近達成，預計下月再評。' }, { clientId:C.chen.id, discussion:'RN：血壓穩定。SW：兒子表示希望學習居家練習方式。' }],
    decisions:[{ id:'demo_d3', clientId:C.chen.id, text:'提供兒子居家坐站與現實導向練習衛教單張', owner:'demo_sw', due:ago(45), status:'待執行' }, { id:'demo_d4', clientId:C.wang.id, text:'安排再評估並修正處方', owner:'demo_pt', due:ago(35), status:'已完成' }] });

  /* 每月臂中圍／小腿圍（張○雄無法站立量體重；本月留給使用者試填） */
  put('anthro', { clientId:C.chang.id, date:addDays(addMonths(T.slice(0, 7) + '-01', -2), 4), mac:23.0, calf:31.5, staffId:'demo_rn' });
  put('anthro', { clientId:C.chang.id, date:addDays(addMonths(T.slice(0, 7) + '-01', -1), 4), mac:22.4, calf:30.8, staffId:'demo_rn' });

  /* 意外事件 */
  put('incidents', { datetime:ago(50) + 'T10:20', clientId:C.chang.id, type:'跌倒', place:'廁所', reporterId:'demo_cw2', severity:'輕度（瘀青擦傷）', description:'如廁後自行起身時頭暈，滑坐於地，左手肘擦傷。', handling:'協助坐回輪椅，測量血壓 90/56，護理師清潔傷口。', toHospital:false, familyAt:ago(50) + 'T10:45', familyWho:'太太／電話', familyNote:'了解，同意觀察', analysis:'姿勢性低血壓＋起身過快；廁所扶手位置偏遠。', improvement:'處方加入「起身前坐30秒」提示；廁所加裝L型扶手；如廁改為近身監督。', followUp:'兩週內無再發生。', closed:true });
  put('incidents', { datetime:ago(20) + 'T14:05', clientId:C.chen.id, type:'外傷/瘀傷', place:'活動區', reporterId:'demo_cw1', severity:'輕度（瘀青擦傷）', description:'推助行器轉彎時右小腿撞到桌腳，有瘀青。', handling:'冰敷15分鐘，護理師評估無腫脹。', toHospital:false, familyAt:ago(20) + 'T15:00', familyWho:'兒子／LINE', closed:false });

  /* 活動與訓練 */
  const acts = ['懷舊老歌合唱', '手作香包', '社區公園散步', '園藝療育', '節慶包粽子', '桌遊大賽', '律動健身操', '中秋同樂會', '社區國小交流', '寫春聯', '端午香包', '母親節卡片'];
  for (let k = 11; k >= 0; k--) { if (k === 4) continue; const d = addDays(addMonths(T.slice(0, 7) + '-10', -k), 0); if (d > T) continue; put('activities', { date:d, kind:k % 3 === 0 ? '社區活動' : '團體活動', title:acts[k], nature:['動態', '靜態', '輔療'][k % 3], leaderId:'demo_sw', clientIds:[C.wang.id, C.chen.id].concat(d >= C.chang.admitDate ? [C.chang.id] : []), content:'長輩參與踴躍。', strategy:'邀請熟識長輩同組' }); }
  put('activities', { date:ago(100), kind:'照顧者支持活動', title:'家屬座談：居家復能小撇步', leaderId:'demo_pt', clientIds:[], familyCount:8, content:'PT 示範居家坐站與移位技巧，家屬實際演練。' });
  const allS = ['demo_pt', 'demo_ot', 'demo_rn', 'demo_sw', 'demo_cw1', 'demo_cw2', 'demo_dir'];
  const yr = T.slice(0, 4);
  [['感染管制與手部衛生', 2, true, false, allS], ['失智症照護實務', 8, false, false, allS], ['安全移位與下肢肌力訓練', 6, false, true, allS], ['CPR＋AED 急救訓練', 4, false, false, allS.filter(x => x !== 'demo_cw2')]].forEach(([title, hours, inf, sc, ids], i) => put('activities', { date:`${yr}-0${i + 3}-15`, kind:'員工教育訓練', title, hours, infection:inf, selfcareTopic:sc, staffIds:ids, org:'縣市長照管理中心' }));

  /* 家屬聯繫 */
  put('contacts', { clientId:C.wang.id, date:ago(20), method:'LINE/通訊軟體', person:'女兒 王○惠', content:'告知 v2 處方調整，請家中每天2次坐站練習；女兒回饋媽媽在家已能自己上廁所。', staffId:'demo_pt' });
  put('contacts', { clientId:C.chen.id, date:ago(100), method:'電話', person:'兒子 陳○豪', content:'說明父親午後焦躁改善情形。', staffId:'demo_sw' });
  put('contacts', { clientId:C.chang.id, date:ago(30), method:'面談', person:'太太 林○芬', content:'說明移位訓練進度，教導起身前先坐30秒。太太表示照顧壓力大，已轉介照顧者支持服務。', staffId:'demo_sw' });

  if (!App.currentUserId()) try { localStorage.setItem('rehab:user', 'demo_pt'); } catch(e){}
  Store.flush(); toast('已載入示範資料'); renderShell(); App.go('#/'); route();
}
