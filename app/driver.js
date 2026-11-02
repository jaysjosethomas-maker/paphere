'use strict';
/* Driver app: accounts, search, booking, pass, session, passes, tools, wallet, account. */
(function(){
const ME='u1';
const me=()=>user(ME);
const myVehs=()=>DB.vehicles.filter(v=>v.uid===ME);
const selVeh=()=>veh(F_('d_veh',myVehs()[0]&&myVehs()[0].id))||myVehs()[0];
const myBk=()=>DB.bookings.filter(b=>b.driver===ME);
const myFlex=()=>DB.flex.find(x=>x.uid===ME&&['active','cancelling'].includes(x.state));
const credits=()=>me().credits.filter(c=>c.left>0&&c.exp>now()).reduce((a,c)=>a+c.left,0);
function times(){
  if(F_('d_parknow',false)){const s=Math.ceil(now()/5)*5;return {s,e:s+POLICY.parkNowMax}}
  const s=F_('d_day',0)*DAY+F_('d_time',1110);return {s,e:s+F_('d_dur',120)};
}
const unread=()=>DB.notifications.filter(n=>n.uid===ME&&!n.read).length;
const isWin=b=>now()>=b.created&&now()<=b.end+120; // ACS-05 access window

/* ---------- onboarding (ACC-01..04, ACC-07, VEH-01, VEH-06) ---------- */
const PLATE_RE=/^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/;
const normPlate=p=>String(p||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const fmtPlate=p=>{const n=normPlate(p);const m=n.match(/^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/)||n.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{4})$/);return m?m.slice(1).filter(Boolean).join(' '):String(p||'').toUpperCase()};
Object.assign(NEED,{
  d_phone:()=>String(F_('d_phone','98450 12321')).replace(/\D/g,'').length===10,
  d_profile:()=>String(F_('d_name',me().name)).trim().length>1&&F_('d_adult',false),
  d_role:()=>!!F_('d_role',null),
  d_veh:()=>PLATE_RE.test(normPlate(F_('d_plate','KA 05 MN 4821'))),
  d_msg:()=>String(F_('d_msgtxt','')).trim().length>0
});
const D={};
D.welcome=()=>`<div class="pad" style="flex:1;justify-content:space-between;background:var(--sign);color:var(--sign-ink);padding:28px 22px">
  <div class="stack" style="gap:14px;padding-top:20px"><div class="pmark" style="background:var(--sign-ink);color:var(--sign);width:56px;height:56px;font-size:34px;border-radius:13px">P</div>
  <p class="h-xl" style="font-size:34px">A guaranteed space, booked before you leave.</p>
  <p style="margin:0;font-size:16px;opacity:.9">Park at verified driveways and garages near where you're going. Or earn from the space you already have.</p></div>
  <div style="border-radius:16px;overflow:hidden">${mapSVG({dest:DEST[0],items:DB.facilities.filter(f=>f.kind!=='public'&&f.status==='active').slice(0,4).map(f=>({id:f.id,x:f.x,y:f.y,label:rs((f.price.car||f.price.tw).first)+'/h'}))})}</div>
  <div class="stack"><button class="btn" style="background:var(--sign-ink);color:var(--sign)" data-go="phone">Continue with mobile number</button>
  <p style="margin:0;font-size:12.5px;text-align:center;opacity:.85">Drivers and space owners use the same app.</p></div></div>`;
D.phone=()=>`${topbar('Sign in')}<div class="pad"><p class="h-l">What's your mobile number?</p>
  ${field('d_phone','',F_('d_phone','98450 12321'),{pre:'<b class="mono">+91</b>',attrs:'inputmode="numeric" autocomplete="tel"'})}
  <p class="sub">We'll send a 6-digit code by SMS. If SMS is down, we send it on WhatsApp.</p></div>
  <div class="sticky-foot"><button class="btn primary" data-act="d_sendotp" ${need('d_phone')}>Send code</button></div>`;
D.otp=()=>{const o=F_('d_otp','');const wrong=F_('d_otpwrong',0);return `${topbar('Verify your number')}<div class="pad" style="gap:18px">
  <div><p class="h-l">Enter the 6-digit code</p><p class="sub">Sent to +91 ${esc(F_('d_phone','98450 12321'))}. It expires in 5 minutes.</p></div>
  <div class="codebox">${[0,1,2,3,4,5].map(i=>`<span>${o[i]||''}</span>`).join('')}</div>
  ${wrong?notice('bad',`That code didn't match. ${5-wrong} attempts left before this number is locked for 30 minutes.`):''}
  ${keypad('d_otp',6,'d_otpdone')}
  <p class="sub" style="text-align:center">Demo: 123456 works. Any other code counts as wrong. <button class="badge b-sign" data-act="toast" data-msg="New code sent. You can resend again in 30 seconds.">Resend</button></p></div>`};
D.profile=()=>`${topbar('About you')}<div class="pad"><p class="h-l">What should we call you?</p>
  ${field('d_name','Full name',F_('d_name',me().name),{attrs:'autocomplete="name"'})}
  ${field('d_email','Email (optional, for receipts)',F_('d_email',''),{attrs:'type="email" autocomplete="email"'})}
  <div><p class="flabel">Language</p>${chips('d_lang',[['en','English'],['kn','ಕನ್ನಡ (R2)']],F_('d_lang','en'))}</div>
  <div class="card stack">${check('d_adult',F_('d_adult',false),'I am 18 or older')}${check('d_mkt',F_('d_mkt',false),'Send me offers and news (optional, you can stop any time)')}
  <p class="sub">We use your number to sign you in and connect you, masked, with the other side of a booking. <button class="badge b-sign" data-act="legal" data-doc="privacy">Read the privacy notice v1.2</button></p></div></div>
  <div class="sticky-foot"><button class="btn primary" data-act="d_profiledone" ${need('d_profile')}>Continue</button></div>`;
D.role=()=>{const r=F_('d_role',null);return `${topbar('Welcome, '+esc(String(F_('d_name',me().name)).split(' ')[0]))}<div class="pad">
  <div><p class="h-l">How will you use PAPHere?</p><p class="sub">One account can do both. Switch any time from Account.</p></div>
  <div class="stack" role="radiogroup">${[['driver','car','Park my vehicle','Book verified spaces near where you\'re going.'],['host','home','Rent out my space','Earn from a driveway, garage or shop bay. We verify it first.'],['both','key','Both','Park when you go out, earn while you\'re away.']].map(([k,i,t,d])=>`<button class="opt" role="radio" aria-checked="${r===k}" data-set="d_role" data-v="${k}"><span class="ic">${ic(i)}</span><div class="grow"><b>${t}</b><div class="sub">${d}</div></div>${radio(r===k)}</button>`).join('')}</div></div>
  <div class="sticky-foot"><button class="btn primary" data-act="d_roledone" ${need('d_role')}>Continue</button></div>`};
D.addveh=(p)=>{const ok=NEED.d_veh();const t=F_('d_vtype','hatch');const ev=F_('d_vev',false);return `${topbar(p.edit?'Add another vehicle':'Add your vehicle')}<div class="pad">
  <div><p class="h-l">Add it once</p><p class="sub">We preselect it for every booking, pass and public-lot payment.</p></div>
  <div><p class="flabel">Type</p>${chips('d_vtype',SIZES.map(s=>[s,SIZE_TXT[s]]),t)}</div>
  ${field('d_plate','Registration number',F_('d_plate',p.edit?'':'KA 05 MN 4821'),{attrs:'class="mono" style="text-transform:uppercase"',help:`<span id="platemsg" style="color:${ok?'var(--ok)':'var(--bad)'}">${ok?'✓ Valid Indian plate':'Use a format like KA 05 MN 4821 or 22 BH 1234 AB'}</span>`})}
  <div style="text-align:center"><span class="plate big" id="plateprev">${esc(fmtPlate(F_('d_plate',p.edit?'':'KA 05 MN 4821'))||'—')}</span></div>
  ${field('d_nick','Nickname (optional)',F_('d_nick',p.edit?'':'Hyundai i20'))}
  <div class="card stack"><div class="between"><div><b>Electric vehicle</b><div class="sub">Shows chargers that fit your vehicle ${relTag('R2')}</div></div>${sw('d_vev',ev,'Electric vehicle')}</div>
  ${ev?`<div><p class="flabel">Connectors</p>${chips('d_vconn',['Type 2','CCS2','LECCS','Bharat AC-001','15A socket'],F_('d_vconn',t==='tw'?'LECCS':'Type 2'))}</div><div><p class="flabel">Max AC rate</p>${chips('d_vkw',[[3.3,'3.3 kW'],[7.4,'7.4 kW'],[11,'11 kW']],F_('d_vkw',7.4),1)}</div>${check('d_vport',F_('d_vport',false),'I carry a portable charger (15 A socket)')}`:''}</div>
  <p class="sub">Registration certificate check is optional, by consented fetch from DigiLocker. We never scrape government systems.</p></div>
  <div class="sticky-foot"><button class="btn primary" data-act="d_saveveh" data-edit="${p.edit?1:''}" ${need('d_veh')}>Save vehicle</button></div>`};

/* ---------- home & search (SRC-01, SRC-08, PAS-01, UTL-03, UTL-04) ---------- */
D.home=()=>{
  const v=selVeh(),fx=myFlex(),t=times(),dest=destOf(F_('d_dest','hosp')),q=String(F_('d_q','')).toLowerCase();
  const sugg=q?DEST.filter(d=>(d.name+' '+d.addr).toLowerCase().includes(q)):[];
  const active=myBk().find(b=>['checked_in','overstaying'].includes(b.state)&&b.type!=='monthly');
  const upcoming=myBk().filter(b=>['confirmed','requested'].includes(b.state)&&b.type!=='monthly').sort((a,b)=>a.start-b.start)[0];
  const alerts=DB.alertsFeed.slice(0,1);
  return `<div class="pad" style="background:var(--surface);border-bottom:1px solid var(--line);padding-bottom:16px">
    <div class="between"><div><p class="lbl">Good evening, ${esc(me().name.split(' ')[0])}</p><p class="h-xl" style="margin-top:4px">Where are you going?</p></div><button class="iconbtn" data-go="inbox" aria-label="Notifications">${ic('bell')}${unread()?`<span class="dotn" style="left:auto;right:-2px">${unread()}</span>`:''}</button></div>
    <div class="field">${ic('search',20)}<input id="in_d_q" data-bind="d_q" value="${esc(F_('d_q',''))}" placeholder="${esc(dest.name)}" aria-label="Destination" autocomplete="off"><button class="badge b-sign" data-act="d_nearme">Near me</button></div>
    ${sugg.length?`<div class="card list" style="padding:0 12px">${sugg.map(d=>`<button class="li" data-set="d_dest" data-v="${d.id}" data-then="d_pickdest">${ic('pin',18)}<div class="grow"><b style="font-size:14.5px">${esc(d.name)}</b><div class="sub">${esc(d.addr)}</div></div></button>`).join('')}</div>`:`<div class="row wrap">${badge(ic('pin')+' '+esc(dest.name),'b-sign')}${dest.event?badge('Event day','b-mari'):''}</div>`}
    <div class="chips"><button class="chip" aria-pressed="${!F_('d_parknow',false)}" data-set="d_parknow" data-v="false">Pre-book</button><button class="chip" aria-pressed="${F_('d_parknow',false)}" data-set="d_parknow" data-v="true">Park now</button></div>
    ${F_('d_parknow',false)?`<p class="sub">Spaces free right now and open for at least an hour. You pay for actual time, up to 4 hours. ${relTag('R1')}</p>`:
    `<div class="row wrap" style="gap:8px"><div class="field" style="padding:6px 10px"><select data-bindc="d_day" aria-label="Day">${[0,1,2,3].map(i=>`<option value="${i}" ${+F_('d_day',0)===i?'selected':''}>${i===0?'Today':i===1?'Tomorrow':dayTxt(i*DAY)}</option>`).join('')}</select></div>
     <div class="field" style="padding:6px 10px"><select data-bindc="d_time" aria-label="Arrive">${Array.from({length:34},(_,i)=>420+i*30).map(m=>`<option value="${m}" ${+F_('d_time',1110)===m?'selected':''}>${tm(m)}</option>`).join('')}</select></div></div>
    <div>${chips('d_dur',[[60,'1 h'],[120,'2 h'],[180,'3 h'],[240,'4 h'],[480,'8 h']],F_('d_dur',120),1)}</div>`}
    <button class="card between" style="padding:10px 12px;background:var(--surface-2);text-align:left;color:var(--ink)" data-act="d_pickveh"><div class="row">${ic(v&&v.type==='tw'?'bolt':'car',20)}<div><b style="font-size:14px">${esc(v?v.nick:'Add a vehicle')}</b><div class="sub">${v?SIZE_TXT[v.size]+(v.ev?' · electric':''):''}</div></div></div>${v?plate(v.plate):''}</button>
    <button class="btn primary" data-act="d_find">Find parking</button></div>
  <div class="pad">
    ${active?`<button class="card row" style="text-align:left;background:var(--ok-soft);border-color:transparent;color:var(--ink)" data-go="active" data-id="${active.id}"><span class="ic" style="background:var(--ok);color:#fff">${ic('clock')}</span><div class="grow"><b>Parked at ${esc(fac(active.fid).name)}</b><div class="sub">${dur(Math.max(0,active.end-now()))} left · ends ${tm(active.end)}</div></div>${ic('chev',18)}</button>`:''}
    ${upcoming?`<button class="card row" style="text-align:left;color:var(--ink)" data-go="${upcoming.state==='requested'?'requested':'pass'}" data-id="${upcoming.id}"><span class="ic">${ic('ticket')}</span><div class="grow"><b>${esc(fac(upcoming.fid).name)}</b><div class="sub">${win(upcoming.start,upcoming.end)} · ${STATE_TXT[upcoming.state]}</div></div>${ic('chev',18)}</button>`:''}
    ${fx?`<button class="card between" style="text-align:left;color:var(--ink)" data-tab="passes"><div><p class="lbl">Flex Pass</p><b>${dur(fx.left)} left</b><div class="sub">${dur(fx.rolled)} rolled over expire ${dayTxt(fx.rollExp)}</div></div>${badge('Renews '+dayTxt(fx.renew),'b-sign')}</button>`:''}
    ${me().consents.find(c=>c.p==='Routine suggestions'&&c.on)&&!F_('d_routineX',false)?`<div class="card stack"><div class="between"><p class="lbl">Routine suggestion ${relTag('R2')}</p><button class="badge b-mute" data-set="d_routineX" data-v="true">Dismiss</button></div><b>You park near City Care Hospital most Tuesdays at 6 pm.</b><p class="sub">Hold Anand's driveway for Tue, 3 Nov, 6 pm – 8 pm?</p><button class="btn ghost sm" data-act="d_routine">Show that booking</button></div>`:''}
    ${alerts.map(a=>notice('warn',`<b>${esc(a.type)} · ${esc(a.zone)}</b><br>${esc(a.text)}`)).join('')}
    <p class="lbl">Saved places</p>
    <div class="list card" style="padding:0 14px">${me().saved.map(s=>`<button class="li" data-set="d_dest" data-v="${s.dest}" data-then="d_find"><span class="ic">${ic(s.dest==='office'?'home':'flag')}</span><div class="grow"><b style="font-size:14.5px">${esc(s.label)} · ${esc(destOf(s.dest).name)}</b><div class="sub">${esc(s.note)}</div></div>${ic('chev',18)}</button>`).join('')}</div>
    <p class="lbl">Recent searches</p><div class="chips">${me().recent.map(id=>`<button class="chip" data-set="d_dest" data-v="${id}" data-then="d_find">${esc(destOf(id).name)}</button>`).join('')}</div>
    <button class="card row" style="text-align:left;color:var(--ink)" data-act="explain" data-k="guarantee"><span class="ic" style="background:var(--ok-soft);color:var(--ok)">${ic('shield')}</span><div class="grow"><b>Every booking has the Space Guarantee</b><div class="sub">A comparable space in 10 min, or a full refund plus credit.</div></div></button>
  </div>`;
};
D.results=()=>{
  const t=times(),v=selVeh(),fl=F_('d_filters',{}),sort=F_('d_sort','best');
  if(S.offline&&!F_('d_lastres',null))return `${topbar('Results')}<div class="pad">${notice('warn','No connection, and no earlier results to show. Booking needs a connection.')}</div>`;
  const R=search({dest:F_('d_dest','hosp'),veh:v&&v.id,start:t.s,end:t.e,filters:fl,sort,ev:F_('d_ev',false),type:'prebook',who:ME});
  const sel=F_('d_sel',R.results[0]&&R.results[0].f.id);
  const items=R.results.map(x=>({id:x.f.id,x:x.f.x,y:x.f.y,label:x.public?'P '+rs(x.q.total):rs(x.q.total),approx:x.f.kind==='residential',official:x.public,ev:!!x.f.ev})).concat(R.full.map(x=>({id:x.f.id,x:x.f.x,y:x.f.y,label:'Full',full:true,official:true})));
  const nf=Object.values(fl).filter(Boolean).length;
  return `${topbar(esc(R.dest.name),{right:`<span class="sub" style="white-space:nowrap">${F_('d_parknow',false)?'Now':tm(t.s)} · ${F_('d_parknow',false)?'up to 4 h':dur(t.e-t.s)}</span>`})}
  ${S.offline?`<div class="offline-bar" style="background:var(--surface-2);color:var(--muted)">Results from ${tm(now()-12)}. They may be out of date. Booking is blocked until you're online.</div>`:''}
  ${mapSVG({dest:R.dest,items,sel,route:true,radius:true})}
  <div class="pad" style="padding-top:12px">
    <div class="between"><p class="lbl">${R.results.length} ${R.results.length===1?'space':'spaces'} within 600 m</p><div class="row" style="gap:6px"><button class="chip" data-act="d_filters">Filters${nf?' · '+nf:''}</button><button class="chip" data-act="d_sortsheet">${{best:'Best match',price:'Price',walk:'Walk'}[sort]}</button></div></div>
    ${R.dest.event?notice('warn','Event day near Palace Grounds. Event prices are labelled and stay within the published event band.'):''}
    ${R.results.map(x=>resultCard(x,sel)).join('')}
    ${R.full.map(x=>`<div class="card stack" style="border-style:dashed">${badge('Official public parking','b-night')}<b>${esc(x.f.name)} is full right now</b><p class="sub">Estimated from attendant records. Nearby alternatives are listed above.</p></div>`).join('')}
    ${!R.results.length?`<div class="card stack"><b>Nothing free near ${esc(R.dest.name)} for this time.</b><p class="sub">We've noted it so we can add spaces here.</p>${R.outside.map(x=>`<button class="sp" data-act="d_open" data-id="${x.f.id}"><div class="grow"><b>${esc(x.f.name)}</b><div class="sub">${x.w} min walk · outside the usual radius</div></div><span class="price">${rs(x.q.total)}</span></button>`).join('')}<button class="btn ghost sm" data-act="d_notifyme">Notify me if a space opens</button></div>`:''}
    <button class="badge b-sign" style="align-self:center" data-act="explain" data-k="rank">How we rank results</button>
  </div>`;
};
function resultCard(x,sel){
  const f=x.f,q=x.q,cancel=x.public?'Pay on exit':'Free cancellation up to 1 h before';
  const fx=myFlex(),useFlex=fx&&f.flex&&!x.public&&fx.cls===(selVeh()||{}).type;
  return `<button class="sp" data-act="d_open" data-id="${f.id}" aria-current="${f.id===sel}">
    <div class="thumb">${photo(f,72)}</div>
    <div class="grow stack" style="gap:4px"><div class="between" style="align-items:flex-start"><b style="font-size:15px;line-height:1.25">${esc(f.name)}</b>
      <div style="text-align:right">${useFlex?`<div class="price" style="font-size:15px">Uses ${dur(times().e-times().s)}</div><div class="sub" style="font-size:11px">Flex</div>`:`<div class="price">${rs(q.total)}</div><div class="sub" style="font-size:11px">total</div>`}</div></div>
      <div class="sub">${x.w} min walk · ${f.attrs.covered?'Covered':'Open'} · ${esc(f.type)}</div>
      <div class="sub" style="font-size:12px">${cancel}${x.public?` · ~${x.lot.free} bays free`:''}</div>
      <div class="row wrap" style="gap:5px">${x.public?badge('Official public parking','b-night'):badge(ic('shield')+' Verified space','b-ok')}${x.rel>=90?badge('Highly reliable','b-sign'):''}${f.ev?badge(ic('bolt')+' '+f.ev.kw+' kW','b-mari'):''}${f.relay&&f.relay.night?badge('Night pass','b-night'):''}</div></div></button>`;
}
D.detail=(p)=>{
  const f=fac(p.id),v=selVeh(),t=times(),cls=v&&v.type==='tw'?'tw':'car',d=destOf(F_('d_dest','hosp'));
  if(f.kind==='public')return lotPage(f);
  const charge=F_('d_charge',!!(f.ev&&v&&v.ev&&evCompat(f,v).ok));
  const q=quoteFor(f,cls,t.s,t.e,{charge,event:d.event}),rel=reliability(f.host),ec=evCompat(f,v),rg=estRange(f,v,t.e-t.s);
  const reviews=DB.bookings.filter(b=>b.fid===f.id&&b.rating).slice(-3);
  return `${topbar(esc(f.name))}<div style="height:180px;flex:none">${photo(f,180)}</div><div class="pad">
    <div><h4 class="h-l">${esc(f.name)}</h4><p class="sub">${f.kind==='residential'?esc(f.area)+' · exact address after booking':esc(f.addr)} · hosted by ${esc(user(f.host).name.split(' ')[0])}</p></div>
    <div class="row wrap" style="gap:6px"><button class="badge b-ok" data-act="explain" data-k="verified">${ic('shield')} Verified space</button>${rel.score>=90?`<button class="badge b-sign" data-act="explain" data-k="reliable">Highly reliable · ${rel.score}</button>`:badge(rel.label+(rel.score?' · '+rel.score:''),'b-mute')}${badge('★ '+f.rating+' · '+f.trips+' stays','b-mute')}${f.flex?badge('Flex','b-sign'):''}${f.rtb?badge('Request to book','b-mari'):badge('Instant booking','b-ok')}</div>
    <div class="card kv">${[['Walk to '+esc(d.name),walkMin(f,d)+' min'],['Space',`${f.attrs.covered?'Covered':'Open'} ${esc(f.type.toLowerCase())}`],['Fits',`Up to ${SIZE_TXT[f.units.reduce((a,u)=>sizeRank(u.size)>sizeRank(a)?u.size:a,'tw')]} · ${Math.min(...f.units.map(u=>u.height))} m clearance`],['Open',f.windows.map(w=>`${w.days.length===7?'Daily':w.days.length===5&&!w.days.includes(0)?'Weekdays':'Weekends'} ${tm(w.from)}–${w.to===1440?'midnight':tm(w.to)}`).join(', ')],['Check-in',{self:'Self check-in with photo',guard:'Guard checks your pass',host:'Host confirms'}[f.checkin]],['Cancellation','Free up to 1 h before'],['Overstay','10 min free, then extended if free; 2× rate if the next driver is affected']].map(r=>r)}</div>
    <div class="card stack"><p class="lbl">Verified on site visits</p><div class="row wrap" style="gap:6px">${Object.entries(f.attrs).map(([k,v])=>`<button class="badge b-ok" data-act="explain" data-k="attr" data-a="${k}" data-d="${esc(v)}">${ATTRS[k]} · ${esc(v)}</button>`).join('')}</div>${f.amenities.length?`<p class="sub">Amenities: ${f.amenities.join(', ')} ${relTag('R2')}</p>`:''}</div>
    ${f.ev?`<div class="card stack"><div class="between"><p class="lbl">Charger ${relTag('R2')}</p>${badge(ec.txt,ec.ok?'b-ok':'b-warn')}</div>${kv([['Connectors',f.ev.conn.join(', ')],['Output',`${f.ev.kw} kW ${f.ev.acdc} · ${f.ev.phase}`],['Cable',f.ev.cable],['Charging hours',`${tm(f.ev.hours[0])} – ${tm(f.ev.hours[1])}`],['Price',rs(f.ev.perHour)+'/h connected']])}
      ${rg?`<p class="sub">Estimated about ${rg.kwh} kWh, roughly +${rg.km} km in ${dur(t.e-t.s)}. This is an estimate, not a measurement.</p>`:''}
      ${ec.ok?`<div class="between"><span>Park and charge</span>${sw('d_charge',charge,'Add charging')}</div>`:''}<p class="sub">Price is for time connected, not energy delivered.</p></div>`:''}
    ${mapSVG({dest:d,items:[{id:f.id,x:f.x,y:f.y,label:'P',approx:f.kind==='residential'}],sel:f.id,route:true})}
    <div class="card stack"><p class="lbl">Recent ratings</p>${reviews.map(b=>`<div class="between"><span class="sub">${dayTxt(b.start)}</span><span>${'★'.repeat(b.rating.driver)}<span style="color:var(--line)">${'★'.repeat(5-b.rating.driver)}</span></span></div>`).join('')}<p class="sub">Public written reviews arrive in R2, only from completed stays and published double-blind.</p></div>
    <div class="card"><p class="lbl" style="margin-bottom:6px">House rules</p><p style="margin:0;font-size:14.5px">${esc(f.rules)} No sleeping in vehicles, servicing or washing.</p></div>
  </div>
  <div class="sticky-foot"><div class="between"><div><div class="price" style="font-size:22px">${rs(q.total)} total</div><div class="sub">${F_('d_parknow',false)?'Billed on actual time, up to 4 h':win(t.s,t.e)}</div></div></div>
  <button class="btn primary" data-act="d_book" data-id="${f.id}" ${S.offline?'disabled':''}>${S.offline?'Connect to book':f.rtb?'Request to book':'Book this space'}</button></div>`;
};
function lotPage(f){
  const v=selVeh(),cls=v&&v.type==='tw'?'tw':'car',ls=lotState(f,cls);
  return `${topbar(esc(f.name))}<div style="height:150px;flex:none">${photo(f,150)}</div><div class="pad">
    <div class="row wrap">${badge('Official public parking','b-night')}<span class="sub">${esc(f.authority)} · ${esc(f.operator)}</span></div>
    <div class="card stack"><div class="between"><p class="lbl">Live occupancy estimate</p>${badge(ls.full?'Full':`~${ls.free} of ${ls.cap} free`,ls.full?'b-bad':'b-ok')}</div><div class="meter"><span style="width:${ls.occ/ls.cap*100}%"></span></div></div>
    <div class="card"><p class="lbl" style="margin-bottom:8px">Official tariff · ${cls==='tw'?'two-wheeler':'car'}</p>${kv(f.tariff[cls].map(s=>[`Up to ${dur(s.upto)}`,rs(s.amt)]))}<p class="sub" style="margin-top:8px">Plus PAPHere's ₹1 per paid ticket, shown in your total before you pay. Receipts are issued by ${esc(f.authority)}.</p></div>
    ${f.reserved?notice('info',`${f.reserved} reserved bays can be pre-booked with the Space Guarantee from R3. Walk-in bays are first come, first served.`):''}
    ${ls.full?notice('warn','This lot is full. Nearby public lots and neighbourhood spaces are in your results.'):''}
    <button class="btn primary" data-act="d_lotenter" data-id="${f.id}" ${ls.full?'disabled':''}>I'm parking here now</button>
    <p class="sub">The attendant records your plate at entry. You pay on exit from the app, the wallet or UPI, with no install needed for others.</p></div>`;
}

/* ---------- checkout & payment (BKG-01..10, PRC-03..05, PAY-01, WAL-03, INV-03) ---------- */
D.checkout=(p)=>{
  const b=bk(p.id);if(!b)return topbar('Checkout')+'<div class="pad">Booking not found.</div>';
  const f=fac(b.fid),v=veh(b.veh),fx=myFlex();
  const flexOk=fx&&f.flex&&fx.cls===b.cls&&b.type!=='parknow';
  const useFlex=flexOk&&F_('d_useflex',true);const mins=Math.ceil((b.end-b.start)/15)*15;
  const flexShort=useFlex&&fx.left<mins;
  const q=quoteFor(f,b.cls,b.start,b.end,{charge:b.charge,promo:F_('d_promoOk',null),credits:F_('d_usecredit',true)?credits():0,flexMins:useFlex&&!flexShort?mins:0,event:destOf(F_('d_dest','hosp')).event});
  S.f.d_q_cache=q;
  const pay=F_('d_pay','wallet'),wal=me().wallet,low=pay==='wallet'&&wal.bal<q.total;
  const expired=b.state!=='held';
  return `${topbar(f.rtb?'Request to book':'Review and pay')}<div class="pad">
    ${expired?notice('bad','This hold expired. Go back and book again.'):notice('info',`We're holding this space for you until <b>${tm(b.holdExp)}</b> (7 minutes).`,'clock')}
    <div class="card row"><div class="thumb" style="width:56px;height:56px">${photo(f,56)}</div><div class="grow"><b>${esc(f.name)}</b><div class="sub">${b.type==='parknow'?'Starts at check-in · up to 4 h':win(b.start,b.end)}</div></div></div>
    <div class="card stack"><div class="between"><div><p class="lbl">Vehicle</p><b style="font-size:15px">${esc(v.nick)}</b></div>${plate(v.plate)}</div>
      ${check('d_forother',F_('d_forother',false),'I\'m booking for someone else (the pass goes to them)')}
      ${F_('d_forother',false)?`${field('d_forname','Driver\'s name',F_('d_forname','Appa'))}${field('d_forphone','Driver\'s mobile',F_('d_forphone','98440 22110'),{pre:'+91',attrs:'inputmode="numeric"'})}`:''}</div>
    ${b.type==='prebook'?`<div class="card stack">${check('d_recur',F_('d_recur',false),'Repeat every week on this day, for up to 4 weeks')}${F_('d_recur',false)?`<div>${chips('d_recurn',[[2,'2 weeks'],[3,'3 weeks'],[4,'4 weeks']],F_('d_recurn',4),1)}</div><p class="sub">Each date is its own booking you can cancel alone. Dates that aren't free are skipped.</p>`:''}</div>`:''}
    ${flexOk?`<div class="card between"><div><b>Use Flex hours</b><div class="sub">${flexShort?`You have ${dur(fx.left)}, this needs ${dur(mins)}. Pay in rupees instead?`:`Uses ${dur(mins)} of ${dur(fx.left)}`}</div></div>${sw('d_useflex',useFlex,'Use Flex hours')}</div>`:''}
    <details class="card" open><summary class="between" style="cursor:pointer;list-style:none"><span class="h-m">${rs(q.total)} total</span><span class="sub">Breakdown</span></summary>
      <div class="kv" style="margin-top:10px">${q.lines.map(l=>`<div class="${l.a<0?'neg':''}"><span>${esc(l.l)}${l.d?`<br><span class="sub" style="font-size:12px">${esc(l.d)}</span>`:''}</span><span class="num">${rs(l.a)}</span></div>`).join('')}<div class="total"><span>You pay</span><span class="num">${rs(q.total)}</span></div></div>
      <p class="sub" style="margin-top:8px">${q.taxNote||''}. One price: nothing is added after this screen.</p></details>
    <div class="card stack"><div class="between"><b>Promo code</b>${F_('d_promoOk',null)?badge(F_('d_promoOk')+' applied','b-ok'):''}</div><div class="row">${field('d_promo','',F_('d_promo',''),{attrs:'placeholder="WELCOME50" style="text-transform:uppercase"'})}<button class="btn ghost sm" data-act="d_applypromo">Apply</button></div>
      ${credits()?`<div class="between"><span>Use ${rs(credits())} PAPHere credit</span>${sw('d_usecredit',F_('d_usecredit',true),'Use credit')}</div>`:''}</div>
    <div><p class="lbl" style="margin-bottom:8px">Pay with</p><div class="list card" style="padding:0 14px" role="radiogroup">
      ${[['wallet','wallet','PAPHere wallet',`Balance ${rs(wal.bal)} · held by partner bank`],['upi','rupee','UPI','priya@okbank'],['card','pass','Card','Visa ending 6411'],['netbanking','globe','Netbanking','HDFC Bank']].map(([k,i,t,d])=>`<button class="li" role="radio" aria-checked="${pay===k}" data-set="d_pay" data-v="${k}"><span class="ic">${ic(i)}</span><div class="grow"><b style="font-size:14.5px">${t}</b><div class="sub">${d}</div></div>${radio(pay===k)}</button>`).join('')}</div>
      ${low?`<p class="sub" style="color:var(--bad);margin-top:6px">Wallet balance is too low. <button class="badge b-sign" data-act="d_topup" data-amt="500">Top up ₹500</button> or pick UPI.</p>`:''}</div>
    ${f.rtb?notice('info','This host reviews requests. Your payment is authorised now and captured only if they accept within 15 minutes. Otherwise it\'s released.'):''}
    <p class="sub">Cancel free until ${tm(b.start-60)}. After that, everything except the first hour is refunded. Overstay past 10 min is extended at your rate if the space is free. Covered by the <button class="badge b-ok" data-act="explain" data-k="guarantee">Space Guarantee</button></p>
  </div>
  <div class="sticky-foot"><button class="btn primary" data-act="d_pay" data-id="${b.id}" ${S.offline||expired||(low&&q.total>0)?'disabled':''}>${S.offline?'Connect to pay':q.total>0?(f.rtb?'Authorise ':'Pay ')+rs(q.total):'Confirm booking'}</button></div>`;
};
D.paying=(p)=>`<div class="pad" style="flex:1;justify-content:center;align-items:center;text-align:center"><div class="spinner"></div><p class="h-l">Confirming payment</p><p class="sub">This can take up to 2 minutes. Your space stays held while we wait.</p>${p.late?notice('warn','The payment provider is slow. We\'ll check the status again automatically.'):''}</div>`;
D.payfail=(p)=>{const b=bk(p.id);return `${topbar('Payment didn\'t go through',{noBack:true})}<div class="pad">${notice('bad','<b>Your bank declined the payment.</b> No money was taken. Your space is still held until '+tm(b.holdExp)+'.')}<button class="btn primary" data-go="checkout" data-id="${b.id}">Try another method</button><button class="btn ghost" data-act="d_home">Cancel</button></div>`};
D.requested=(p)=>{const b=bk(p.id),f=fac(b.fid);return `${topbar('Request sent',{noBack:true,right:`<button class="iconbtn" data-act="d_home" aria-label="Close">${ic('x')}</button>`})}<div class="pad">
  <div class="card stack" style="text-align:center"><div class="spinner" style="margin:6px auto"></div><b style="font-size:17px">${b.state==='requested'?`Waiting for ${esc(user(f.host).name.split(' ')[0])}`:STATE_TXT[b.state]}</b><p class="sub">${b.state==='requested'?`They have until ${tm(b.rtbAt+15)} to accept. ${rs(b.q.total)} is authorised, not charged.`:b.state==='declined'?'Your authorisation was released.':'Your booking is confirmed.'}</p></div>
  ${b.state==='confirmed'?`<button class="btn primary" data-go="pass" data-id="${b.id}">View pass</button>`:''}
  ${b.state==='declined'?`<button class="btn primary" data-act="d_find">See other spaces</button>`:''}
  ${b.state==='requested'?`<button class="btn ghost" data-act="d_cancel" data-id="${b.id}">Cancel request</button><p class="sub">Tip: switch to the Host app to accept it, or move the clock 15 min to see the auto-decline.</p>`:''}</div>`};

/* ---------- pass, arrival, session (ACS-01..06, UTL-07, CHG-01, CHG-03, SPP, SUP-07, MSG) ---------- */
D.pass=(p)=>{
  const b=bk(p.id);if(!b)return topbar('Pass')+'<div class="pad">Not found.</div>';
  const f=fac(b.fid),v=veh(b.veh),open=isWin(b)||S.offline;
  const fresh=p.fresh;
  return `${topbar('Your pass',{noBack:!!fresh,right:`<button class="iconbtn" data-act="d_home" aria-label="Close">${ic('x')}</button>`})}<div class="pad">
    ${fresh?notice('ok',`<b>Booked. ${b.q.total>0?rs(b.q.total)+' paid.':'Paid with Flex hours.'}</b> Pass saved for offline use${b.forName?` and sent to ${esc(b.forName)} on WhatsApp`:' and sent on WhatsApp'}.`):''}
    ${b.recurringOf||(fresh&&p.series)?notice('info',`Repeats weekly: ${p.series||''} bookings created. Each can be cancelled alone.`):''}
    <div class="pass"><div class="pass-head"><div><div style="font-size:12px;opacity:.85">${b.ref} · ${STATE_TXT[b.state]}</div><b style="font-size:16px">${esc(f.name)}</b></div>${badge('Saved offline','b-mute')}</div>
    <div class="pad" style="gap:12px">
      <div class="qrbox"><canvas class="qr" data-seed="${parseInt(b.code.replace(' ',''))}" aria-label="Signed pass QR code"></canvas></div>
      <div class="code6" aria-label="Six-digit code">${b.code}</div>
      <div style="text-align:center">${plate(v.plate,true)}${b.forName?`<div class="sub" style="margin-top:6px">Driver: ${esc(b.forName)}</div>`:''}</div>
      <div class="between" style="font-size:15px"><div><p class="lbl">Window</p><b>${dayTxt(b.start)}, ${tm(b.start)} – ${tm(b.end)}</b></div><div style="text-align:right"><p class="lbl">Arrive by</p><b>${tm(b.start+POLICY.grace)}</b></div></div>
      <div class="tear"></div>
      ${open?`<div><p class="lbl" style="margin-bottom:4px">Exact address</p><b>${esc(f.addr)}</b></div>
      <div style="height:120px;border-radius:12px;overflow:hidden">${photo(f,120,'Entrance photo')}</div>
      <ol class="steps">${f.access.map(a=>`<li>${esc(a)}</li>`).join('')}</ol>
      <p class="sub">Level ${esc(f.level)} · ${esc(f.bay)}</p>`:notice('info','The exact address and access steps were visible until 2 hours after your end time.')}
    </div></div>
    ${['confirmed'].includes(b.state)?`<button class="btn primary" data-act="d_arrive" data-id="${b.id}">I'm near the space</button>`:''}
    ${['checked_in','overstaying'].includes(b.state)?`<button class="btn primary" data-go="active" data-id="${b.id}">Back to session</button>`:''}
    <div class="row"><button class="btn ghost" data-act="toast" data-msg="Opening directions in your maps app">Directions</button><button class="btn ghost" data-go="thread" data-id="${b.id}">${ic('chat')} Message</button></div>
    ${b.state==='confirmed'?`<div class="row"><button class="btn ghost" data-act="d_editplate" data-id="${b.id}">Change vehicle</button><button class="btn ghost" data-go="bkdetail" data-id="${b.id}">Change or cancel</button></div>`:''}
  </div>`;
};
D.arrive=(p)=>{const b=bk(p.id),f=fac(b.fid);const m=f.checkin;return `${topbar('Arrival mode')}<div class="pad">
  <div class="row">${badge('Within 200 m','b-ok')}<span class="sub">${esc(f.name)}</span></div>
  <div style="height:160px;border-radius:14px;overflow:hidden">${photo(f,160,'Entrance photo')}</div>
  <div class="card stack"><p class="lbl">Last 50 metres</p><ol class="steps">${f.access.map(a=>`<li>${esc(a)}</li>`).join('')}</ol><p class="sub">Level ${esc(f.level)} · ${esc(f.bay)}</p></div>
  <div class="card stack" style="text-align:center"><div class="code6" style="font-size:26px">${b.code}</div>${plate(veh(b.veh).plate,true)}</div>
  ${m==='guard'?`<p class="sub">Show your pass to ${esc(f.guardName||'the guard')}. They scan it in guard mode.</p><button class="btn primary" data-act="d_checkin" data-id="${b.id}" data-m="guard">Guard scanned my pass</button><button class="btn ghost" data-act="d_guardrefuse" data-id="${b.id}">Guard won't let me in</button>`:
    m==='host'?`<p class="sub">${esc(user(f.host).name.split(' ')[0])} confirms your arrival from their app.</p><button class="btn primary" data-act="d_checkin" data-id="${b.id}" data-m="host">${esc(user(f.host).name.split(' ')[0])} confirmed I'm here</button>`:
    `<p class="sub">Self check-in: we check you're inside 200 m and take a photo of your parked vehicle.</p><button class="btn primary" data-act="d_checkin" data-id="${b.id}" data-m="self">${ic('cam')} Take photo and check in</button>`}
  <button class="btn danger" data-act="d_problem" data-id="${b.id}">${ic('alert')} Problem with my space</button></div>`};
D.active=(p)=>{
  const b=bk(p.id),f=fac(b.fid),left=b.end-now(),total=b.end-b.start,C=2*Math.PI*82,pct=clamp(left/total,0,1);
  const over=b.state==='overstaying';
  return `${topbar(over?'Overstaying':'Parked',{noBack:true,right:badge('Checked in '+tm(b.checkin?b.checkin.t:b.start),'b-ok')})}<div class="pad">
    <div class="card" style="padding:18px 12px">
      <div class="ring"><svg viewBox="0 0 190 190"><circle cx="95" cy="95" r="82" fill="none" stroke="var(--surface-2)" stroke-width="14"/><circle cx="95" cy="95" r="82" fill="none" stroke="${over||left<15?'var(--bad)':left<30?'var(--marigold)':'var(--sign)'}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct)}"/></svg>
      <div class="in"><div><div class="t num">${left>0?dur(left):'+'+dur(-left)}</div><div class="sub">${left>0?'left · ends '+tm(b.end):'past end time'}</div></div></div></div>
      <div class="between" style="margin-top:12px"><div><b>${esc(f.name)}</b><div class="sub">${b.type==='parknow'?'Park now · billed on actual time':win(b.start,b.end)}</div></div>${plate(veh(b.veh).plate)}</div></div>
    ${over?notice('bad',`You're past your end time and the next driver is due. Overstay is ${rs(2*(b.overstay?b.overstay.rate:30))} per 15 min plus up to ₹300 to re-accommodate them.`):left<=15&&left>0?notice('warn','15 minutes left. Extend now or leave by '+tm(b.end)+'.'):''}
    ${b.charge?`<div class="card stack"><div class="between"><p class="lbl">Charging ${relTag('R2')}</p>${badge(b.charging||'Not started',b.charging==='Charging'?'b-ok':b.charging==='Fault'?'b-bad':'b-mute')}</div>
      <div class="row">${b.charging==='Charging'?`<button class="btn ghost sm" data-act="d_ev" data-id="${b.id}" data-e="Stopped">Stop</button>`:`<button class="btn ghost sm" data-act="d_ev" data-id="${b.id}" data-e="Charging">Plugged in · start</button>`}<button class="btn danger sm" data-act="d_ev" data-id="${b.id}" data-e="Fault">Charging failed</button></div><p class="sub">Price is by time connected. If charging fails, we convert this to parking only and refund the charging part.</p></div>`:''}
    <div class="row"><button class="btn ghost" data-act="d_extend" data-id="${b.id}" ${S.offline||b.type==='parknow'?'disabled':''}>${ic('clock')} Extend</button><button class="btn ghost" data-go="pass" data-id="${b.id}">${ic('pass')} Pass</button></div>
    ${S.offline?`<p class="sub" style="text-align:center">Extend needs a connection. We'll keep it ready to retry.</p>`:''}
    <div class="row"><button class="btn ghost" data-go="thread" data-id="${b.id}">${ic('chat')} Message</button><button class="btn ghost" data-act="d_call" data-id="${b.id}">${ic('phone')} Call host</button></div>
    <button class="btn danger" data-act="d_problem" data-id="${b.id}">${ic('alert')} Problem with my space</button>
    <button class="btn ghost" data-act="d_safety" data-id="${b.id}">${ic('shield')} Safety</button>
    <button class="btn primary" data-act="d_end" data-id="${b.id}">End session and leave</button>
    <button class="btn ghost" data-act="d_help" data-id="${b.id}">${ic('help')} Get help</button></div>`;
};
D.problem=(p)=>{const k=F_('d_prob',null);return `${topbar('Problem with my space')}<div class="pad">
  <p class="sub">Host and support are alerted together. We fix it or move you within 10 minutes.</p>
  <div class="stack" role="radiogroup">${[['occupied','Someone is in my space'],['blocked','The entrance is blocked'],['gate','Gate closed or guard refuses entry'],['fit','My vehicle doesn\'t fit'],['unsafe','The space feels unsafe']].map(([v,t])=>`<button class="opt" role="radio" aria-checked="${k===v}" data-set="d_prob" data-v="${v}"><b class="grow">${t}</b>${radio(k===v)}</button>`).join('')}</div>
  <button class="card row" style="border-style:dashed;text-align:left;color:var(--ink)" data-tog="d_probphoto"><span class="ic">${ic('cam')}</span><div class="grow"><b>${F_('d_probphoto',false)?'Photo taken in the app':'Take a photo'}</b><div class="sub">${F_('d_probphoto',false)?`${tm(now())} · location ±8 m · faces and other plates are blurred before anyone sees it`:'In-app camera only, with time and location'}</div></div>${F_('d_probphoto',false)?badge('Attached','b-ok'):''}</button></div>
  <div class="sticky-foot"><button class="btn primary" data-act="d_sendprob" data-id="${p.id}" ${k&&F_('d_probphoto',false)?'':'disabled'}>Alert host and support</button></div>`};
D.probwait=(p)=>{const b=bk(p.id),c=DB.cases.find(x=>x.id===p.c);const mins=Math.max(0,10-(now()-c.opened));return `${topbar('We\'re on it',{noBack:true})}<div class="pad">
  <div class="card" style="text-align:center;padding:20px"><p class="lbl">Fix or new space within</p><div class="h-xl num" style="font-size:42px;margin:6px 0">${mins} min</div><p class="sub">${esc(user(fac(b.fid).host).name.split(' ')[0])} and PAPHere support have your photo. Support is calling them on a masked line. Case ${c.id}.</p></div>
  <ol class="tl card"><li><span class="dot d-ok">✓</span><div><b>Report received</b><div class="sub">${tm(c.opened)}</div></div></li><li><span class="dot d-ok">✓</span><div><b>Host alerted by call and app</b></div></li><li><span class="dot d-now">…</span><div><b>Support calling the host</b></div></li></ol>
  <button class="btn ghost" data-act="toast" data-msg="Calling PAPHere support on a masked line…">Call support</button>
  <button class="btn ok" data-act="d_probfixed" data-id="${b.id}">It's fixed, I've parked</button>
  <button class="btn primary" data-act="d_reaccom" data-id="${b.id}">Not fixed: show me options</button></div>`};
D.reaccom=(p)=>{
  const b=bk(p.id),f=fac(b.fid),v=veh(b.veh);
  const alts=DB.facilities.filter(x=>x.id!==f.id&&x.kind!=='public'&&x.status==='active'&&meters(x,f)<=500&&freeUnit(x,v,now(),b.end)).slice(0,3);
  return `${topbar('Choose how to make it right',{noBack:true})}<div class="pad"><p class="sub">Sorry about this. Pick one. Neither costs you anything extra; PAPHere pays any difference.</p>
  ${alts.map(x=>`<button class="sp" data-act="d_reacpick" data-id="${b.id}" data-to="${x.id}"><div class="thumb">${photo(x,72)}</div><div class="grow stack" style="gap:4px"><b>${esc(x.name)}</b><div class="sub">${walkMin(x,destOf(F_('d_dest','hosp')))} min walk · ${meters(x,f)} m from your space</div><div class="row wrap" style="gap:5px">${badge('No extra charge','b-ok')}${badge('Free now','b-sign')}</div></div></button>`).join('')||notice('warn','No comparable space is free within 500 m right now.')}
  <button class="card" style="text-align:left;color:var(--ink)" data-act="d_refundcredit" data-id="${b.id}"><div class="between"><b>Full refund + ${rs(POLICY.credit)} credit</b><span class="price">${rs(b.q.total+POLICY.credit)}</span></div><div class="sub">Refund to your ${b.pay.method==='wallet'?'wallet now':'original payment method'}. Credit works on any booking for 90 days.</div></button></div>`;
};
D.receipt=(p)=>{const b=bk(p.id),f=fac(b.fid);const rt=F_('d_rt'+b.id,0),tags=F_('d_tags'+b.id,'');return `${topbar('Receipt',{noBack:true,right:`<button class="iconbtn" data-act="d_home" aria-label="Close">${ic('x')}</button>`})}<div class="pad">
  <div style="text-align:center"><p class="lbl">Session ended ${tm(b.checkout?b.checkout.t:b.end)}</p><p class="h-xl" style="margin-top:4px">${rs(b.q.total)} total</p><p class="sub">${esc(f.name)} · ${dur((b.checkout?b.checkout.t:b.end)-(b.checkin?b.checkin.t:b.start))} parked</p></div>
  <div class="card kv">${b.q.lines.map(l=>`<div class="${l.a<0?'neg':''}"><span>${esc(l.l)}</span><span class="num">${rs(l.a)}</span></div>`).join('')}<div class="total"><span>Paid by ${b.pay.method}</span><span class="num">${rs(b.q.total)}</span></div></div>
  ${(b.refunds||[]).map(r=>notice('ok',`Refund ${rs2(r.amt)} · ${r.state} · ${r.eta}`)).join('')}
  <button class="btn ghost" data-act="d_invoice" data-id="${b.id}">Tax invoice</button>
  ${b.rating?notice('ok','Thanks for rating. Your rating is private in R1 and helps the host\'s reliability score.'):`<div class="card stack" style="text-align:center"><b>How was ${esc(f.name)}?</b><div class="stars">${[1,2,3,4,5].map(n=>`<button class="${rt>=n?'on':''}" data-set="d_rt${b.id}" data-v="${n}" data-num aria-label="${n} star">★</button>`).join('')}</div>
    <div class="chips" style="justify-content:center">${['Easy to find','As described','Safe','Smooth access'].map(t=>`<button class="chip" aria-pressed="${tags.includes(t)}" data-act="d_tag" data-b="${b.id}" data-t="${t}">${t}</button>`).join('')}</div>
    <button class="btn primary sm" style="align-self:center" data-act="d_rate" data-id="${b.id}" ${rt?'':'disabled'}>Submit rating</button></div>`}
  <button class="btn ghost" data-act="d_damage" data-id="${b.id}">Report damage (within 24 h)</button>
  <button class="btn primary" data-act="d_rebook" data-id="${b.id}">Book the same space again</button></div>`};
D.thread=(p)=>{const b=bk(p.id),f=fac(b.fid);const msgs=DB.messages.filter(m=>m.b===b.id);return `${topbar('Message '+esc(user(f.host).name.split(' ')[0]))}
  <div class="pad" style="flex:1">${notice('info','Numbers, UPI IDs and links are hidden. Messages are kept 90 days and support can read them if there\'s a dispute.')}
  ${msgs.map(m=>`<div class="bub${m.from===ME?' me':''}" style="align-self:${m.from===ME?'flex-end':'flex-start'}">${esc(m.text)}<small>${tm(m.t)}</small></div>`).join('')||'<p class="sub">No messages yet.</p>'}</div>
  <div class="sticky-foot"><div class="chips">${['Running 10 minutes late','At the gate','Space is blocked'].map(t=>`<button class="chip" data-act="d_send" data-id="${b.id}" data-t="${t}">${t}</button>`).join('')}</div>
  <div class="row">${field('d_msgtxt','',F_('d_msgtxt',''),{attrs:'placeholder="Write a message"'})}<button class="btn primary sm" data-act="d_send" data-id="${b.id}" ${need('d_msg')}>Send</button></div></div>`};

/* ---------- bookings (CHG-02, CHG-04, CHG-07, BKG-09) ---------- */
D.bookings=()=>{
  const up=myBk().filter(b=>['confirmed','requested','checked_in','overstaying','held'].includes(b.state)&&b.type!=='monthly').sort((a,b)=>a.start-b.start);
  const past=myBk().filter(b=>!up.includes(b)&&b.type!=='monthly'&&b.state!=='held').sort((a,b)=>b.start-a.start).slice(0,8);
  const row=b=>{const f=fac(b.fid);return `<button class="sp" data-go="bkdetail" data-id="${b.id}"><div class="thumb">${photo(f,72)}</div><div class="grow stack" style="gap:4px"><b style="font-size:15px">${esc(f.name)}</b><div class="sub">${win(b.start,b.end)}</div><div class="row wrap" style="gap:6px">${stateBadge(b.state)}${b.recurringOf?badge('Weekly','b-sign'):''}${b.forName?badge('For '+esc(b.forName),'b-mute'):''}</div></div><span class="num" style="font-weight:700">${rs(b.q.total)}</span></button>`};
  return `${topbar('Bookings')}<div class="pad"><p class="lbl">Upcoming and active</p>${up.map(row).join('')||`<div class="card" style="text-align:center"><b>No upcoming bookings</b><p class="sub">Book a space and your pass appears here, ready offline.</p></div>`}<p class="lbl">Past</p>${past.map(row).join('')}</div>`;
};
D.bkdetail=(p)=>{const b=bk(p.id),f=fac(b.fid),rc=driverRefundCalc(b);const can=['confirmed','requested'].includes(b.state);return `${topbar(b.ref)}<div class="pad">
  <div class="card stack"><div class="between"><b>${esc(f.name)}</b>${stateBadge(b.state)}</div><div class="sub">${win(b.start,b.end)} · ${plate(veh(b.veh).plate)}</div>${kv([['Total',rs(b.q.total)],['Paid by',b.pay.method],['Policy',b.policy]])}</div>
  ${['confirmed','checked_in'].includes(b.state)?`<button class="btn primary" data-go="${b.state==='checked_in'?'active':'pass'}" data-id="${b.id}">${b.state==='checked_in'?'Open session':'View pass'}</button>`:''}
  ${can&&b.type==='prebook'?`<div class="card stack"><p class="lbl">Change time</p><p class="sub">Changing is a cancel and rebook under the same rules. Only the difference is charged or refunded.</p>${chips('d_shift',[[-60,'1 h earlier'],[-30,'30 min earlier'],[30,'30 min later'],[60,'1 h later']],F_('d_shift',30),1)}<button class="btn ghost sm" data-act="d_change" data-id="${b.id}">Check and change</button></div>`:''}
  ${can?`<div class="card stack"><p class="lbl">Cancel</p><p class="sub">${esc(rc.rule)}.</p><b>You get back ${rs(rc.amt)}</b><div>${chips('d_creason',['Plans changed','Found parking elsewhere','Booked by mistake','Other'],F_('d_creason','Plans changed'))}</div><button class="btn danger" data-act="d_cancel" data-id="${b.id}">Cancel booking</button><p class="sub">Two taps from the booking, as easy as booking it.</p></div>`:''}
  ${(b.refunds||[]).length?`<div class="card stack"><p class="lbl">Refunds</p>${b.refunds.map(r=>`<div class="between"><span>${rs2(r.amt)} to ${r.to}<br><span class="sub">${esc(r.why)}</span></span>${badge(r.state+' · '+r.eta,r.state==='succeeded'?'b-ok':'b-mari')}</div>`).join('')}</div>`:''}
  <div class="card"><p class="lbl" style="margin-bottom:8px">Timeline</p><ol class="tl">${b.events.map(e=>`<li><span class="dot d-ok">✓</span><div><b>${STATE_TXT[e.to]||e.to}</b><div class="sub">${relWhen(e.t)} · ${esc(e.actor)}${e.note?' · '+esc(e.note):''}</div></div></li>`).join('')}</ol></div>
  <button class="btn ghost" data-act="d_help" data-id="${b.id}">${ic('help')} Help with this booking</button></div>`};

/* ---------- passes (BKG-05, PAS-01..04, PAS-07, PAY-12, VER-06) ---------- */
D.passes=()=>{
  const fx=myFlex(),mp=myBk().filter(b=>b.type==='monthly'&&!['cancelled','completed'].includes(b.state)),np=myBk().filter(b=>b.type==='night'&&!['cancelled','completed'].includes(b.state));
  return `${topbar('Passes')}<div class="pad">
  ${fx?`<div class="card stack" style="gap:10px"><div class="between"><div><p class="lbl">Flex Pass · ${esc(fx.plan)} ${relTag('R2')}</p><p class="h-l" style="margin-top:4px">${dur(fx.left)} left</p></div>${badge(fx.state==='cancelling'?'Ends '+dayTxt(fx.renew):'Renews '+dayTxt(fx.renew),'b-sign')}</div>
    <div class="progress"><span style="width:${fx.left/fx.hours*100}%"></span></div><div class="between sub"><span>${dur(fx.rolled)} rolled over</span><span>expire ${dayTxt(fx.rollExp)}</span></div>
    <div class="row"><button class="badge b-sign" data-act="explain" data-k="flex">How hours work</button>${fx.state==='active'?`<button class="badge b-mute" data-act="d_flexcancel">Cancel at month end</button>`:''}</div></div>`:
    `<button class="card stack" style="text-align:left;color:var(--ink)" data-go="flexbuy"><p class="lbl">Flex Pass ${relTag('R2')}</p><b>One bundle of hours for any Flex space</b><p class="sub">From ₹700 for 20 car hours. Unused hours roll over one month.</p></button>`}
  ${mp.map(b=>{const f=fac(b.fid);return `<div class="card stack"><div class="between"><div><p class="lbl">Monthly pass</p><b>${esc(f.name)}</b></div>${badge(b.paused?'Paused':'Active',b.paused?'b-warn':'b-ok')}</div>
    <div class="sub">${esc(b.band)} · ${plate(veh(b.veh).plate)}${b.second?' + '+plate(veh(b.second).plate):''}</div>
    ${kv([[rs(b.q.total)+' / month · '+esc(b.mandate),'next '+dayTxt(b.renew)],['Pause used this quarter',(b.pausedDays||0)+' of 14 days']])}
    <p class="sub">Pre-debit notice is sent 5 days and 24 hours before each charge.</p>
    <div class="row wrap"><button class="btn ghost sm" data-act="d_pause" data-id="${b.id}" ${b.paused||(b.pausedDays||0)>=14?'disabled':''}>Pause 7 days</button><button class="btn ghost sm" data-act="d_second" data-id="${b.id}" ${b.second?'disabled':''}>Add second vehicle</button><button class="btn ghost sm" data-act="d_mcancel" data-id="${b.id}">Cancel (7 days' notice)</button></div></div>`}).join('')}
  ${np.map(b=>`<div class="card stack" style="background:var(--night-soft);border-color:transparent"><div class="between"><p class="lbl" style="color:var(--night)">Night pass</p>${badge('20:00 – 08:00','b-night')}</div><b>${esc(fac(b.fid).name)}</b><p class="sub">${rs(b.q.total)}/month · renews ${dayTxt(b.renew)}</p></div>`).join('')}
  <button class="btn ghost" data-go="monthlybuy">Buy a monthly pass</button>
  <button class="card stack" style="text-align:left;background:var(--night-soft);border-color:transparent;color:var(--ink)" data-go="nightbuy"><div class="between"><p class="lbl" style="color:var(--night)">Night pass ${relTag('R2')}</p>${badge('Near home','b-night')}</div><b>Park near home every night from ₹2,000/month</b><p class="sub">Office bays within 300 m of home that sit empty at night. Verified drivers only.</p></button></div>`;
};
D.monthlybuy=()=>{const v=selVeh(),cls=v&&v.type==='tw'?'tw':'car';const list=DB.facilities.filter(f=>f.status==='active'&&f.kind!=='public'&&f.price[cls]&&f.price[cls].month&&f.units.some(u=>fitsUnit(u,v)));const sel=F_('d_mfac',list[0]&&list[0].id);const f=fac(sel);
  return `${topbar('Monthly pass')}<div class="pad"><p class="sub">A space for the same hours every month, with a receipt and someone to call.</p>
  <div><p class="flabel">Hours</p>${chips('d_mband',[['Weekdays 8 am – 7 pm','Weekday daytime'],['All day','All day'],['Night 8 pm – 8 am','Night']],F_('d_mband','Weekdays 8 am – 7 pm'))}</div>
  <div class="stack">${list.map(x=>`<button class="opt" role="radio" aria-checked="${x.id===sel}" data-set="d_mfac" data-v="${x.id}"><div class="grow"><b>${esc(x.name)}</b><div class="sub">${walkMin(x,destOf(F_('d_dest','hosp')))} min walk · ${rs(x.price[cls].month)}/month</div></div>${radio(x.id===sel)}</button>`).join('')}</div>
  <div><p class="flabel">Starts</p>${chips('d_mstart',[[1,'Tomorrow'],[3,'Sun, 1 Nov'],[10,'Sun, 8 Nov']],F_('d_mstart',3),1)}</div>
  <div class="card between"><div><b>${esc(v.nick)}</b><div class="sub">One vehicle swap a month allowed</div></div>${plate(v.plate)}</div>
  ${me().verifiedDriver?notice('ok','Verified driver badge on file.'):notice('warn','Monthly passes need the verified-driver badge (a driving licence check you consent to). <button class="badge b-sign" data-go="dlcheck">Verify now</button>')}
  <div class="card stack">${kv([['First month',rs(f?f.price[cls].month:0)],['Renews','Every month by UPI autopay'],['Cancel','7 days\' notice, unused whole weeks refunded']])}<p class="sub">We send a pre-debit notice at least 24 hours before each charge.</p></div></div>
  <div class="sticky-foot"><button class="btn primary" data-act="d_mbuy" ${me().verifiedDriver&&f?'':'disabled'}>Set up UPI autopay and pay ${f?rs(f.price[cls].month):''}</button></div>`};
D.flexbuy=()=>{const cls=(selVeh()||{}).type==='tw'?'tw':'car';const plans=cls==='car'?[[20,700],[40,1400],[80,2700]]:[[30,450],[60,850],[120,1600]];const h=F_('d_fplan',plans[1][0]);const pr=(plans.find(x=>x[0]===+h)||plans[1])[1];
  return `${topbar('Flex Pass')}<div class="pad"><p class="sub">One monthly bundle of hours for any Flex space in the city. ${cls==='car'?'Car':'Two-wheeler'} plans.</p>
  <div class="stack">${plans.map(([hh,p])=>`<button class="opt" role="radio" aria-checked="${+h===hh}" data-set="d_fplan" data-v="${hh}" data-num><div class="grow"><b>${hh} hours a month</b><div class="sub">${rs(p)} · ${rs(p/hh)} per hour</div></div>${radio(+h===hh)}</button>`).join('')}</div>
  <div class="card stack"><p class="lbl">Before you buy</p><ul class="steps"><li>Hours are deducted on actual time, rounded up to 15 minutes.</li><li>Unused hours roll over for one month, then expire. Hours have no cash value.</li><li>Overstay fees are charged in rupees, never in hours.</li><li>Cancel any time; it ends with the paid month.</li><li>One pass per account, up to two vehicles, one parked at a time.</li></ul></div>
  <p class="sub">Last month you spent ₹1,640 on 31 hours of parking.</p></div>
  <div class="sticky-foot"><button class="btn primary" data-act="d_fbuy" data-h="${h}" data-p="${pr}">Buy for ${rs(pr)}/month by UPI autopay</button></div>`};
D.nightbuy=()=>{const home=destOf('home');const list=DB.facilities.filter(f=>f.relay&&f.relay.night&&f.status==='active').map(f=>({f,m:meters(f,home)})).sort((a,b)=>a.m-b.m);
  return `${topbar('Night pass')}<div class="pad"><p class="sub">Relay spaces near home with a night window. The changeover buffer protects the day driver.</p>
  ${list.map(({f,m})=>`<div class="card stack"><div class="between"><b>${esc(f.name)}</b>${badge(m+' m from home','b-night')}</div>${kv([['Window',tm(f.relay.night.from)+' – '+tm(f.relay.night.to)],['Monthly price',rs(f.relay.night.month)],['Night access',esc(f.relay.night.access)]])}
  <button class="btn primary sm" data-act="d_nbuy" data-id="${f.id}" ${me().verifiedDriver?'':'disabled'}>Buy night pass</button></div>`).join('')}
  ${me().verifiedDriver?'':notice('warn','Night passes need the verified-driver badge. <button class="badge b-sign" data-go="dlcheck">Verify now</button>')}
  <p class="sub">A late morning departure is an overstay: the day driver is re-accommodated first and the overstay fee covers it.</p></div>`};
D.dlcheck=()=>`${topbar('Verified driver')}<div class="pad"><p class="h-l">Check your driving licence</p><p class="sub">We fetch it from DigiLocker with your consent, store only the result and a reference, and show "Verified driver" to hosts.</p>
  ${field('d_dl','Driving licence number',F_('d_dl','KA05 20190012345'),{attrs:'class="mono"'})}
  ${check('d_dlok',F_('d_dlok',false),'I consent to PAPHere fetching my driving licence from DigiLocker for this check')}
  <button class="btn primary" data-act="d_dl" ${F_('d_dlok',false)?'':'disabled'}>Verify with DigiLocker</button><p class="sub">If DigiLocker is down, you can upload a photo for manual review.</p></div>`;

/* ---------- tools (UTL-01..07, CIV-01..08) ---------- */
D.tools=()=>{const fv=me().findVehicle,tmr=me().timer;return `${topbar('Tools')}<div class="pad">
  <div class="card stack"><div class="between"><p class="lbl">Find my vehicle</p><span class="sub">saved ${relWhen(fv.t)}</span></div>
    <div style="height:120px;border-radius:12px;overflow:hidden">${mapSVG({me:{x:60,y:235}})}</div>
    <div class="row"><span class="ic">${ic('car')}</span><div><b>${esc(fv.place)}</b><div class="sub">${esc(fv.note)} · photo saved</div></div></div>
    <div class="between"><span class="sub">Stored on this phone only</span>${sw('d_fvsync',F_('d_fvsync',false),'Sync to account')}</div>
    <button class="btn ghost sm" data-act="d_savefv">Save where I parked now</button></div>
  <div class="card stack"><p class="lbl">Parking timer</p>${tmr?`<div class="between"><div><b class="h-l num">${dur(Math.max(0,tmr.end-now()))}</b><div class="sub">${esc(tmr.where)} · until ${tm(tmr.end)}</div></div><button class="btn ghost sm" data-act="d_timerstop">Stop</button></div>`:
    `<div>${chips('d_tdur',[[30,'30 min'],[60,'1 h'],[120,'2 h']],F_('d_tdur',60),1)}</div><button class="btn ghost sm" data-act="d_timer">Start timer for street parking</button>`}<p class="sub">Works for any paid or time-limited parking. We remind you 10 minutes before.</p></div>
  <div class="card stack"><p class="lbl">Local parking alerts ${relTag('R2')}</p>${DB.alertsFeed.map(a=>`<div><b>${esc(a.type)} · ${esc(a.zone)}</b><div class="sub">${esc(a.text)}</div></div>`).join('')}<p class="sub">For your saved areas: ${me().alerts.map(id=>destOf(id).name).join(', ')}.</p></div>
  <button class="card row" style="text-align:left;color:var(--ink)" data-go="canpark"><span class="ic">${ic('pin')}</span><div class="grow"><b>Can I park here?</b><div class="sub">Known no-parking zones where official data exists ${relTag('R4')}</div></div>${ic('chev',18)}</button>
  <button class="card row" style="text-align:left;color:var(--ink)" data-go="civic"><span class="ic" style="background:var(--warn-soft);color:var(--warn)">${ic('flag')}</span><div class="grow"><b>Report a public parking violation</b><div class="sub">${S.agreement?'Sent to the traffic police under the city agreement':'We take you to the official channel'}</div></div>${ic('chev',18)}</button>
  <div class="card between"><div><b>Routine suggestions</b><div class="sub">From your own repeat bookings. Opt-in; delete history any time.</div></div>${sw('d_routine_on',!!me().consents.find(c=>c.p==='Routine suggestions'&&c.on),'Routine suggestions')}</div></div>`};
D.canpark=()=>`${topbar('Can I park here?')}<div class="pad">${mapSVG({me:{x:150,y:150},dest:{x:150,y:150,name:'You'}})}
  ${S.agreement?notice('bad','<b>No parking: 8 am – 8 pm.</b> 100 Ft Road service lane, from the City Corporation notification. Nearest PAPHere space: Green Leaf Pharmacy bay, 2 min walk.'):notice('info','We don\'t have official no-parking data for this street yet. It arrives when the city shares it (R4). Nearest PAPHere space: Green Leaf Pharmacy bay, 2 min walk.')}
  <button class="btn primary" data-act="d_open" data-id="f3">See Green Leaf Pharmacy bay</button></div>`;
D.civic=()=>S.agreement?`${topbar('Report a violation')}<div class="pad">${notice('info','Reports go to the traffic police queue. They decide; we never do. You see only: received, under review, closed.')}
  <div><p class="flabel">What's happening</p>${chips('d_civcat',['Footpath parking','Blocking a gate','Double parking','No-parking zone'],F_('d_civcat','Footpath parking'))}</div>
  <button class="card row" style="border-style:dashed;text-align:left;color:var(--ink)" data-tog="d_civphoto"><span class="ic">${ic('cam')}</span><div class="grow"><b>${F_('d_civphoto',false)?'Photo captured in the app':'Capture photo (in-app only)'}</b><div class="sub">${F_('d_civphoto',false)?`${tm(now())} · ±7 m · faces and other plates blurred automatically`:'Gallery uploads aren\'t accepted'}</div></div></button>
  ${field('d_civnote','Note (optional)',F_('d_civnote',''))}
  <p class="sub">Limits: verified accounts only, 5 reports a day. No rewards. Your identity is never shown to the reported person.</p>
  <button class="btn primary" data-act="d_civsend" ${F_('d_civphoto',false)?'':'disabled'}>Submit report</button>
  <p class="lbl">Your reports</p>${DB.civic.filter(c=>c.mine).map(c=>`<div class="card between"><span>${esc(c.cat)}<br><span class="sub">${relWhen(c.t)}</span></span>${badge(c.state==='closed'?'Closed':c.state==='submitted'?'Received':'Under review','b-sign')}</div>`).join('')||'<p class="sub">None yet.</p>'}</div>`
  :`${topbar('Report a violation')}<div class="pad"><div class="card stack"><b>PAPHere doesn't forward these reports in Bengaluru yet</b><p class="sub" style="font-size:14.5px">Vehicles parked on public roads are handled by the traffic police. We'll open their official app (ASTraM). We don't store anything you report there.</p><p class="sub" style="font-size:14.5px">If someone is in a space you booked, use <b>Problem with my space</b> on your booking. We can fix that one.</p></div><button class="btn primary" data-act="toast" data-msg="Opening the city traffic police app">Open official channel</button><p class="sub">Turn on "City has an authority agreement" in the panel to see the R4 flow.</p></div>`;

/* ---------- account (ACC-05..08, WAL-01..07, NTF-04, GRO-01, PAY-11, SUP) ---------- */
D.account=()=>{const u=me();return `${topbar('Account')}<div class="pad">
  <div class="card row"><div class="pmark" style="background:var(--marigold);color:#2a1c00;width:44px;height:44px;font-size:24px">${esc(u.name[0])}</div><div class="grow"><b style="font-size:16px">${esc(u.name)}</b><div class="sub">+91 ${esc(u.phone.slice(0,5))} •••${esc(u.phone.slice(-2))}</div><div class="row wrap" style="gap:5px;margin-top:4px">${u.verifiedDriver?badge('Verified driver','b-ok'):`<button class="badge b-sign" data-go="dlcheck">Get verified-driver badge</button>`}${u.standing!=='good'?badge('Restricted: prepayment required','b-warn'):''}</div></div></div>
  <button class="card between" style="text-align:left;color:var(--ink)" data-go="wallet"><div><p class="lbl">PAPHere wallet</p><div class="h-l num" style="margin-top:4px">${rs(u.wallet.bal)}</div><div class="sub">${u.wallet.kyc==='full'?'Full KYC · limit ₹2,00,000':'Minimum KYC · limit ₹10,000'}</div></div>${ic('chev',18)}</button>
  <button class="card row" style="text-align:left;color:var(--ink)" data-act="d_tohost"><span class="ic" style="background:var(--marigold-soft);color:var(--marigold-ink)">${ic('home')}</span><div class="grow"><b>${u.roles.includes('host')?'Switch to host mode':'Rent out your space'}</b><div class="sub">${u.roles.includes('host')?'Your listing':'List a driveway, garage or shop bay'}</div></div>${ic('chev',18)}</button>
  <div class="card list" style="padding:0 14px">
    ${[['vehicles','car','Vehicles',myVehs().length+' saved'],['credits','rupee','Credits and referrals',rs(credits())+' credit · code '+u.referral],['prefs','bell','Notifications','Service messages always on'],['devices','phone','Signed-in devices',u.devices.length+' devices'],['privacy','shield','Privacy and consent','Notice v1.2'],['help','help','Help and cases','Help centre, cases, grievance officer']].map(([s,i,t,d])=>`<button class="li" data-go="${s}"><span class="ic">${ic(i)}</span><div class="grow"><b style="font-size:14.5px">${t}</b><div class="sub">${d}</div></div>${ic('chev',18)}</button>`).join('')}
    <div class="li"><span class="ic">${ic('globe')}</span><div class="grow"><b style="font-size:14.5px">Language</b><div class="sub">Messages use your language when a template exists</div></div>${chips('d_applang',[['en','EN'],['kn','ಕ']],F_('d_applang','en'))}</div>
    <button class="li" data-act="d_signout"><span class="ic" style="background:var(--bad-soft);color:var(--bad)">${ic('back')}</span><div class="grow"><b style="font-size:14.5px">Sign out</b></div></button></div>
  <div class="row wrap" style="justify-content:center;gap:6px">${[['terms','Terms'],['privacy','Privacy'],['refund','Cancellation and refunds'],['rank','How we rank'],['grievance','Grievance officer']].map(([k,l])=>`<button class="badge b-mute" data-act="legal" data-doc="${k}">${l}</button>`).join('')}</div></div>`};
D.wallet=()=>{const w=me().wallet;const tx=[];DB.bookings.filter(b=>b.driver===ME&&b.pay.method==='wallet').forEach(b=>{tx.push({t:b.created,l:'Paid · '+fac(b.fid).name,a:-b.q.total,ref:b.ref});(b.refunds||[]).filter(r=>r.to==='wallet').forEach(r=>tx.push({t:r.t,l:'Refund · '+r.why,a:r.amt,ref:b.ref}))});(w.topups||[]).forEach(x=>tx.push({t:x.t,l:'Top-up by UPI',a:x.amt,ref:x.id}));tx.sort((a,b)=>b.t-a.t);
  return `${topbar('Wallet')}<div class="pad">
  <div class="card stack"><p class="lbl">Balance</p><div class="h-xl num">${rs(w.bal)}</div><p class="sub">Issued by our RBI-authorised partner bank, which holds the money. PAPHere never holds wallet funds. Pays any booking, pass or public-lot ticket; it can't send money to people or withdraw cash.</p>
    ${w.frozen?notice('bad','Wallet frozen. Unfreeze when you\'re sure your phone is safe.'):''}
    <div>${chips('d_tamt',[[200,'₹200'],[500,'₹500'],[1000,'₹1,000']],F_('d_tamt',500),1)}</div><button class="btn primary" data-act="d_topup" ${w.frozen?'disabled':''}>Top up by UPI</button></div>
  <div class="card stack"><div class="between"><div><b>${w.kyc==='full'?'Full KYC':'Minimum KYC'}</b><div class="sub">Limit ${rs(w.kyc==='full'?POLICY.walletKyc.full:POLICY.walletKyc.min)}</div></div>${w.kyc==='full'?badge('Done','b-ok'):`<button class="btn ghost sm" data-act="d_kyc">Upgrade KYC</button>`}</div><p class="sub">KYC runs in the issuer's own flow. PAPHere stores no Aadhaar data.</p></div>
  <div class="card between"><div><b>Auto top-up ${relTag('R2')}</b><div class="sub">Add ₹500 when balance falls below ₹100, by mandate with pre-debit notice</div></div>${sw('d_autotop',F_('d_autotop',!!w.auto),'Auto top-up')}</div>
  <div class="card"><p class="lbl" style="margin-bottom:6px">Statement</p>${tx.slice(0,8).map(x=>`<div class="between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span style="font-size:14px">${esc(x.l)}<br><span class="sub">${relWhen(x.t)} · ${x.ref}</span></span><b class="num" style="color:${x.a>0?'var(--ok)':'inherit'}">${x.a>0?'+':''}${rs(x.a)}</b></div>`).join('')||'<p class="sub">No transactions yet.</p>'}</div>
  <div class="row"><button class="btn ghost sm" data-act="d_freeze">${w.frozen?'Unfreeze':'Freeze wallet'}</button><button class="btn ghost sm" data-act="d_closewallet">Close wallet</button></div></div>`};
D.vehicles=()=>`${topbar('Vehicles')}<div class="pad">${myVehs().map(v=>`<div class="card stack"><div class="between"><div><b>${esc(v.nick)}</b><div class="sub">${SIZE_TXT[v.size]}${v.ev?' · '+v.ev.conn.join(', ')+' · '+v.ev.kw+' kW'+(v.ev.portable?' · portable charger':''):''}</div></div>${plate(v.plate)}</div></div>`).join('')}
  <button class="btn ghost" data-act="d_addveh2" ${myVehs().length>=5?'disabled':''}>Add a vehicle (up to 5)</button><p class="sub">You can change the plate on a booking until check-in. After that, edits are refused.</p></div>`;
D.credits=()=>{const u=me();return `${topbar('Credits and referrals')}<div class="pad">
  <div class="card stack"><p class="lbl">Credits</p>${u.credits.map(c=>`<div class="between"><span>${esc(c.reason)}<br><span class="sub">Expires ${dayTxt(c.exp)}</span></span><b>${rs(c.left)}</b></div>`).join('')}<p class="sub">Credits are funded by PAPHere, never reduce the host's share, can't be bought or cashed out, and expire after 90 days.</p></div>
  <div class="card stack"><p class="lbl">Invite friends</p><div class="between"><b class="mono" style="font-size:20px">${u.referral}</b><button class="btn ghost sm" data-act="d_copyref">Copy</button></div><p class="sub">You both get ₹50 after their first completed booking.</p>${DB.referrals.filter(r=>r.from===ME).map(r=>`<div class="between"><span>${esc(r.to)}</span>${badge(r.state,r.state==='credited'?'b-ok':'b-mute')}</div>`).join('')}</div></div>`};
D.prefs=()=>{const p=me().prefs;return `${topbar('Notifications')}<div class="pad">
  <div class="card stack"><p class="lbl">Service messages</p><p class="sub">Confirmations, reminders, overstay, refunds and safety always reach you. Overstay, re-accommodation and safety fall back to SMS if push isn't delivered in 60 s.</p>${['push','sms','wa','email'].map(k=>`<div class="between"><span>${{push:'Push',sms:'SMS',wa:'WhatsApp',email:'Email (receipts)'}[k]}</span>${badge('On','b-ok')}</div>`).join('')}</div>
  <div class="card stack"><p class="lbl">Offers and news (opt-in per channel)</p>${[['mktPush','Push'],['mktSms','SMS'],['mktWa','WhatsApp']].map(([k,l])=>`<div class="between"><span>${l}</span>${sw('d_p_'+k,F_('d_p_'+k,p[k]),l+' offers')}</div>`).join('')}</div>
  <div class="card between"><div><b>Quiet hours</b><div class="sub">10 pm – 7 am for non-urgent messages</div></div>${sw('d_p_quiet',F_('d_p_quiet',p.quiet),'Quiet hours')}</div></div>`};
D.devices=()=>`${topbar('Signed-in devices')}<div class="pad">${me().devices.map(d=>`<div class="card between"><div><b>${esc(d.name)}</b><div class="sub">${d.cur?'This device':'Last active '+relWhen(d.last)}</div></div>${d.cur?badge('Current','b-ok'):''}</div>`).join('')}
  <button class="btn danger" data-act="d_signoutall">Sign out everywhere else</button><p class="sub">We alert you by SMS and push when a new device signs in. Revoked sessions stop working within 60 seconds.</p></div>`;
D.privacy=()=>{const u=me();return `${topbar('Privacy and consent')}<div class="pad">
  <div class="card stack"><p class="lbl">Your consents</p>${u.consents.map((c,i)=>`<div class="between"><span>${esc(c.p)}<br><span class="sub">${c.ver} · ${dayTxt(c.t)} · ${c.ch}</span></span>${c.p==='Privacy notice'?badge('Required','b-mute'):`<button class="sw" role="switch" aria-checked="${c.on}" data-act="d_consent" data-i="${i}" aria-label="${esc(c.p)}"></button>`}</div>`).join('')}<p class="sub">Withdrawals take effect within 24 hours.</p></div>
  <div class="card stack"><p class="lbl">Location features</p><p class="sub">Find my vehicle, routine suggestions and automatic availability are opt-in. Detection runs on your phone; we never keep a location history.</p><button class="btn ghost sm" data-act="toast" data-msg="Routine suggestion history deleted">Delete routine history</button></div>
  <button class="btn ghost" data-act="toast" data-msg="Your data export will be ready within 30 days">Download my data</button>
  <button class="btn danger" data-act="d_delete">Delete account</button></div>`};
D.help=()=>{const mine=DB.cases.filter(c=>c.by===ME);return `${topbar('Help')}<div class="pad">
  <div class="field">${ic('search',18)}<input data-bind="d_hq" placeholder="Search help (English, ಕನ್ನಡ)" aria-label="Search help" value="${esc(F_('d_hq',''))}"></div>
  <div class="card list" style="padding:0 14px">${['How do refunds work?','What if someone is in my space?','How do I extend?','How does the Flex Pass deduct hours?','How do I pay at a public lot?'].map(q=>`<button class="li" data-act="toast" data-msg="${esc(q)} · article opened"><div class="grow">${q}</div>${ic('chev',16)}</button>`).join('')}</div>
  <div class="row"><button class="btn ghost" data-act="d_chat">${ic('chat')} Chat</button><button class="btn ghost" data-act="toast" data-msg="Support will call you back within 5 minutes for an active booking">${ic('phone')} Call me back</button></div>
  <button class="btn ghost" data-act="toast" data-msg="WhatsApp support: +91 80 4718 0000">WhatsApp support line</button>
  <p class="lbl">Your cases</p>${mine.map(c=>`<div class="card between"><span><b>${c.id}</b> · ${esc(c.sub)}<br><span class="sub">${relWhen(c.opened)}</span></span>${badge(c.state,c.state==='resolved'?'b-ok':'b-mari')}</div>`).join('')||'<p class="sub">No cases.</p>'}
  <div class="card stack"><p class="lbl">Grievance officer</p><b>Meenakshi Iyer</b><p class="sub">grievance@paphere.in · +91 80 4718 0099<br>PAPHere Mobility Pvt Ltd, 2nd floor, 80 Feet Road, Indiranagar, Bengaluru 560038</p><p class="sub">We acknowledge complaints within 48 hours and resolve them within one month.</p><button class="btn ghost sm" data-act="d_grievance">Raise a grievance</button></div></div>`};
D.inbox=()=>{const ns=DB.notifications.filter(n=>n.uid===ME);ns.forEach(n=>n.read=true);return `${topbar('Notifications')}<div class="pad">${ns.map(n=>`<div class="card stack" style="gap:4px"><div class="between"><span class="sub">${relWhen(n.t)}</span><div class="row" style="gap:4px">${n.ch.map(c=>badge(c,'b-mute')).join('')}</div></div><span>${esc(n.text)}</span></div>`).join('')||'<p class="sub">Nothing yet.</p>'}</div>`};
D.partner=()=>{const pt=DB.partners[0];return `<div class="pad" style="background:var(--surface);border-bottom:1px solid var(--line)"><div class="row">${badge('Via '+esc(pt.name),'b-sign')}${relTag('PTN-01')}</div><p class="h-l">Parking for your appointment</p><p class="sub">City Care Hospital · Tue, 3 Nov, 10:30 am. Pick a space and book in two taps.</p></div>${D.results()}`};

function keypad(key,len,done){return `<div class="keypad">${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>k===''?'<span></span>':`<button data-act="kp" data-k="${key}" data-l="${len}" data-done="${done}" data-v="${k}">${k}</button>`).join('')}</div>`}
window.keypad=keypad;

/* ---------- actions ---------- */
function holdFor(f,v,s,e,type){
  myBk().filter(b=>b.state==='held').forEach(b=>transition(b,'expired','driver','Released when starting a new checkout'));
  const u=freeUnit(f,v,s,e);if(!u)return null;
  const b=mkBooking(DB,{type,fid:f.id,unit:u.id,driver:ME,veh:v.id,start:s,end:e,state:'held',t:now()});
  b.events=[{t:now(),to:'held',actor:'driver',note:`Hold placed on ${u.id} for 7 min`}];b.holdExp=now()+POLICY.hold;b.charge=!!F_('d_charge',false)&&!!f.ev;b.partner=F_('d_partner',null);
  b.q=quoteFor(f,b.cls,s,e,{charge:b.charge});DB.bookings.push(b);return b;
}
function confirmBooking(b){
  const f=fac(b.fid),q=S.f.d_q_cache||b.q;b.q=q;b.pay={method:F_('d_pay','wallet'),status:'captured'};
  if(q.lines.find(l=>l.l==='PAPHere credit')){let need=-q.lines.find(l=>l.l==='PAPHere credit').a;me().credits.forEach(c=>{const u=Math.min(c.left,need);c.left-=u;need-=u})}
  if(F_('d_promoOk',null)){const p=DB.promos.find(x=>x.code===F_('d_promoOk'));if(p){p.uses++;p.spent+=-(q.lines.find(l=>l.promo&&l.l.startsWith('Promo'))||{a:0}).a}}
  const fx=myFlex();if(q.lines[0]&&q.lines[0].l.startsWith('Flex')){const m=Math.ceil((b.end-b.start)/15)*15;fx.left-=m;b.flexMins=m}
  if(b.pay.method==='wallet')me().wallet.bal-=q.total;
  if(F_('d_forother',false)){b.forName=F_('d_forname','Appa');b.forPhone=F_('d_forphone','98440 22110')}
  if(f.rtb){transition(b,'pending','driver','Payment authorised');transition(b,'requested','system','Sent to host · 15 min to respond');b.rtbAt=now();b.pay.status='authorised';
    notify(f.host,'rtb',`Booking request: ${user(ME).name.split(' ')[0]} · ${win(b.start,b.end)}. Accept within 15 minutes.`,['push','sms']);return}
  transition(b,'pending','driver','Payment started · key '+b.idem);transition(b,'confirmed','system','Payment captured; server re-checked availability, price and policy');
  postBooking(DB,b);
  notify(ME,'confirm',`Booked ${f.name}, ${win(b.start,b.end)}. Pass ${b.code} is saved offline.`,['push','whatsapp']);
  if(b.forName)notify(ME,'confirm',`Pass sent to ${b.forName} (+91 ${b.forPhone}) on WhatsApp.`,['whatsapp']);
  notify(f.host,'newbooking',`New booking: ${win(b.start,b.end)} · ${veh(b.veh).plate}. You receive ${rs2(b.q.host)}.`,['push','whatsapp']);
}
Object.assign(ACT,{
  kp:(t,d)=>{let v=String(F_(d.k,''));v=d.v==='⌫'?v.slice(0,-1):(v+d.v).slice(0,+d.l);S.f[d.k]=v;render();if(v.length===+d.l&&ACT[d.done])setTimeout(()=>ACT[d.done](),250)},
  d_sendotp:()=>{S.f.d_otp='';S.f.d_otpwrong=0;go('otp');toast('Code sent by SMS')},
  d_otpdone:()=>{if(S.f.d_otp==='123456'){go('profile')}else{S.f.d_otpwrong=(S.f.d_otpwrong||0)+1;S.f.d_otp='';render()}},
  d_profiledone:()=>{const u=me();u.name=String(F_('d_name',u.name)).trim();u.email=F_('d_email','');u.consents=[{p:'Privacy notice',ver:'v1.2',t:now(),ch:'app',on:true},{p:'Marketing messages',ver:'v1.2',t:now(),ch:'app',on:!!F_('d_mkt',false)},{p:'Routine suggestions',ver:'v1.2',t:now(),ch:'app',on:false}];go('role')},
  d_roledone:()=>{const r=F_('d_role');if(r==='host'){me().roles=['driver','host'];startWizard()}else{if(r==='both')me().roles=['driver','host'];go('addveh')}},
  d_saveveh:(t,d)=>{const type=F_('d_vtype','hatch'),isTw=type==='tw';const v={id:'v'+(++DB.seq),uid:ME,type:isTw?'tw':'car',size:type,plate:fmtPlate(F_('d_plate','KA 05 MN 4821')),nick:F_('d_nick','')||SIZE_TXT[type],height:isTw?1.2:type==='suv'?1.8:1.5,
    ev:F_('d_vev',false)?{conn:[F_('d_vconn',isTw?'LECCS':'Type 2')],kw:F_('d_vkw',7.4),portable:F_('d_vport',false)}:null};
    if(!d.edit){DB.vehicles=DB.vehicles.filter(x=>x.uid!==ME||x.type!==v.type)}DB.vehicles.push(v);S.f.d_veh=v.id;
    if(d.edit){back();toast('Vehicle added');return}
    reset('home');toast(`Welcome, ${me().name.split(' ')[0]}. Your vehicle is saved.`);if(F_('d_role')==='both')setTimeout(()=>toast('Finish listing your space from Account'),2900)},
  d_addveh2:()=>{S.f.d_plate='';S.f.d_nick='';go('addveh',{edit:1})},
  d_pickdest:()=>{S.f.d_q='';const r=me().recent;const id=F_('d_dest');me().recent=[id].concat(r.filter(x=>x!==id)).slice(0,4);render()},
  d_nearme:()=>{S.f.d_dest='shops';S.f.d_parknow=true;S.f.d_q='';ACT.d_find()},
  d_find:()=>{if(!S.offline)S.f.d_lastres=true;S.f.d_sel=null;go('results')},
  d_pickveh:()=>sheet('Vehicle',`<div class="stack">${myVehs().map(v=>`<button class="opt" role="radio" aria-checked="${v.id===(selVeh()||{}).id}" data-set="d_veh" data-v="${v.id}" data-then="closesheet"><div class="grow"><b>${esc(v.nick)}</b><div class="sub">${SIZE_TXT[v.size]}</div></div>${plate(v.plate)}</button>`).join('')}</div><button class="btn ghost" data-act="d_addveh2">Add a vehicle</button>`),
  d_filters:()=>{const fl=F_('d_filters',{});const opt=[['covered','Covered'],['h24','Open 24×7'],['guard','Guard present'],['access','Accessible space'],['monthly','Monthly available'],['lateSafe','Late-night safe']];
    sheet('Filters',`<div class="chips">${opt.map(([k,l])=>`<button class="chip" aria-pressed="${!!fl[k]}" data-act="d_flt" data-k="${k}">${l}</button>`).join('')}</div><p class="sub">Late-night safe means well lit, a guard or CCTV, and night access, each verified on a site visit.</p>
    <div class="between"><span>Only spaces with a charger that fits ${relTag('R2')}</span>${sw('d_ev',F_('d_ev',false),'EV')}</div><div><p class="flabel">Maximum total</p>${chips('d_maxp',[[0,'Any'],[80,'₹80'],[120,'₹120'],[200,'₹200']],fl.maxPrice||0,1)}</div><button class="btn primary" data-act="d_fltapply">Show results</button>`)},
  d_flt:(t,d)=>{const fl=Object.assign({},F_('d_filters',{}));fl[d.k]=!fl[d.k];S.f.d_filters=fl;ACT.d_filters()},
  d_fltapply:()=>{const fl=Object.assign({},F_('d_filters',{}));fl.maxPrice=+F_('d_maxp',0)||null;S.f.d_filters=fl;S.sheet=null;render()},
  d_sortsheet:()=>sheet('Sort',`${chips('d_sort',[['best','Best match'],['price','Lowest price'],['walk','Shortest walk']],F_('d_sort','best'))}<p class="sub">Best match combines walking time, total price, host reliability and rating. No space pays to rank higher.</p><button class="btn primary" data-act="closesheet">Done</button>`),
  d_open:(t,d)=>{S.f.d_sel=d.id;S.f.d_charge=undefined;go('detail',{id:d.id})},
  d_notifyme:()=>{const t=times();DB.unmet.push({t:now(),zone:destOf(F_('d_dest')).name,win:[t.s,t.e],cls:(selVeh()||{}).type});toast('We\'ll tell you if a space opens. Demand logged.')},
  d_book:(t,d)=>{const f=fac(d.id),v=selVeh(),tt=times();const b=holdFor(f,v,tt.s,tt.e,F_('d_parknow',false)?'parknow':'prebook');if(!b){toast('That space was just taken. Pick another.');back();return}
    S.f.d_promoOk=null;S.f.d_promo='';go('checkout',{id:b.id})},
  d_applypromo:()=>{const c=String(F_('d_promo','')).toUpperCase().trim();const p=DB.promos.find(x=>x.code===c&&x.active);if(!p){toast('That code isn\'t valid');return}if(p.code==='WELCOME50'&&myBk().some(b=>b.state==='completed')){toast('WELCOME50 is for a first booking only');return}S.f.d_promoOk=c;render()},
  d_topup:(t,d)=>{const w=me().wallet,a=+(d.amt||F_('d_tamt',500)),lim=w.kyc==='full'?POLICY.walletKyc.full:POLICY.walletKyc.min;if(w.bal+a>lim){toast(`That would pass your ${rs(lim)} limit. Upgrade KYC to add more.`);return}
    w.bal+=a;(w.topups=w.topups||[]).push({id:'TU'+(++DB.seq),t:now(),amt:a});notify(ME,'wallet',`Wallet topped up with ${rs(a)} by UPI.`,['push']);toast(`${rs(a)} added by UPI`)},
  d_pay:(t,d)=>{const b=bk(d.id);if(b.state!=='held'){render();return}
    const series=F_('d_recur',false)&&b.type==='prebook'?+F_('d_recurn',4):1;
    go('paying',{late:!!F_('d_sim_late',false)});
    setTimeout(()=>{
      if(F_('d_sim_fail',false)){S.f.d_sim_fail=false;b.events.push({t:now(),to:'held',actor:'provider',note:'Payment failed · bank declined'});S.stacks.driver.pop();go('payfail',{id:b.id});return}
      confirmBooking(b);
      let made=1;
      if(series>1){for(let i=1;i<series;i++){const f=fac(b.fid),s=b.start+7*i*DAY,e=b.end+7*i*DAY;const u=freeUnit(f,veh(b.veh),s,e);if(!u||!isOpen(f,s,e).ok)continue;
        const nb=mkBooking(DB,{type:'prebook',fid:b.fid,unit:u.id,driver:ME,veh:b.veh,start:s,end:e,state:'confirmed',pay:b.pay.method,recurringOf:b.id});DB.bookings.push(nb);postBooking(DB,nb);made++}b.recurringOf=b.id}
      S.stacks.driver=[{s:'bookings'},{s:b.state==='requested'?'requested':'pass',id:b.id,fresh:1,series:made>1?made:0}];save();render(true);
    },F_('d_sim_late',false)?3500:1300)},
  d_home:()=>{reset('home')},
  d_arrive:(t,d)=>go('arrive',{id:d.id}),
  d_checkin:(t,d)=>{const b=bk(d.id);if(now()<b.start-30){toast(`Check-in opens at ${tm(b.start-30)}. Use the clock to move ahead.`);return}if(!transition(b,'checked_in',d.m==='self'?'driver':d.m,d.m==='self'?'Self check-in inside 200 m geofence, photo attached':'Checked in by '+d.m))return;
    b.checkin={t:now(),method:d.m};S.stacks.driver=[{s:'bookings'},{s:'active',id:b.id}];notify(fac(b.fid).host,'arrival',`${veh(b.veh).plate} checked in at ${tm(now())}.`,['push']);render(true);toast('Checked in at '+tm(now()))},
  d_guardrefuse:(t,d)=>sheet('Guard won\'t let you in',`<p class="sub" style="font-size:14.5px">Show the guard this link: <b class="mono">paphere.in/g/${fac(bk(d.id).fid).id}</b>. Support is calling the guard and host on a masked line now.</p>${notice('info','If it isn\'t sorted in 5 minutes, we move you to another space.')}<button class="btn primary" data-act="d_reaccom" data-id="${d.id}">Show other spaces now</button>`),
  d_extend:(t,d)=>{const b=bk(d.id),f=fac(b.fid);const next=DB.bookings.filter(x=>x.unit===b.unit&&x.id!==b.id&&['confirmed','requested'].includes(x.state)&&x.start>=b.end).sort((a,c)=>a.start-c.start)[0];
    const w=f.windows.find(x=>x.days.includes(dow(b.start)));const lim=Math.min(next?next.start-POLICY.buffer:Infinity,w?dayIdx(b.start)*DAY+w.to:Infinity,b.end+240);const max=Math.max(0,Math.floor((lim-b.end)/15)*15);
    const r=(f.price[b.cls]||{}).later||30;const opts=[30,60,120].filter(m=>m<=max);
    sheet('Extend your stay',max?`<p class="sub" style="font-size:14.5px">You can extend by up to <b>${dur(max)}</b>${next?`. The next booking here starts at ${tm(next.start)}`:''}.</p><div class="chips">${opts.map(m=>`<button class="chip" data-act="d_doext" data-id="${b.id}" data-m="${m}">+${dur(m)} · ${rs(Math.round(r*m/60))}</button>`).join('')}${max%30?`<button class="chip" data-act="d_doext" data-id="${b.id}" data-m="${max}">+${dur(max)}</button>`:''}</div><p class="sub">Charged at once at this booking's rate.</p>`:
      `${notice('warn','This space is booked right after you, so it can\'t be extended.')}<button class="btn ghost" data-act="d_open" data-id="f3">Green Leaf Pharmacy bay is free · 2 min walk</button>`)},
  d_doext:(t,d)=>{const b=bk(d.id),f=fac(b.fid),m=+d.m,r=(f.price[b.cls]||{}).later||30,a=Math.round(r*m/60);b.end+=m;b.ext+=m;b.q.lines.push({l:`Extension · ${dur(m)}`,a});b.q.total+=a;b.n15=0;
    if(b.pay.method==='wallet')me().wallet.bal-=a;post(DB,'Extension',b.ref,[['Payment aggregator clearing',a],['Host payable:'+f.host,-a*.7],['Platform fee revenue',-a*.3]]);b.events.push({t:now(),to:b.state,actor:'driver',note:'Extended by '+dur(m)});S.sheet=null;render();toast(`Extended to ${tm(b.end)} · ${rs(a)} charged`)},
  d_problem:(t,d)=>{S.f.d_prob=null;S.f.d_probphoto=false;go('problem',{id:d.id})},
  d_sendprob:(t,d)=>{const b=bk(d.id),f=fac(b.fid);const c=openCase({cat:'Space problem',sub:{occupied:'Space occupied',blocked:'Entrance blocked',gate:'Gate closed / guard refused',fit:'Vehicle does not fit',unsafe:'Space unsafe'}[F_('d_prob')],pri:F_('d_prob')==='unsafe'?'Safety':'Active booking',by:ME,booking:b.id,fid:f.id,evidence:['in_app_photo.jpg (blurred)']});
    b.problem={cat:F_('d_prob'),case:c.id};notify(f.host,'problem',`Problem reported at your space: ${c.sub}. Support is calling you.`,['push','sms']);S.stacks.driver.pop();go('probwait',{id:b.id,c:c.id})},
  d_probfixed:(t,d)=>{const b=bk(d.id);const c=DB.cases.find(x=>x.booking===b.id&&x.state==='open');if(c){c.state='resolved';c.resolution='Fixed on site';c.cause='outside party'}if(b.state==='confirmed'){transition(b,'checked_in','driver','Checked in after the problem was fixed');b.checkin={t:now(),method:'self'}}S.stacks.driver=[{s:'bookings'},{s:'active',id:b.id}];render(true)},
  d_reaccom:(t,d)=>{S.sheet=null;go('reaccom',{id:d.id})},
  d_reacpick:(t,d)=>{const b=bk(d.id),to=fac(d.to),v=veh(b.veh);const u=freeUnit(to,v,now(),b.end);const c=DB.cases.find(x=>x.booking===b.id&&x.state==='open');
    const nb=mkBooking(DB,{type:'prebook',fid:to.id,unit:u.id,driver:ME,veh:b.veh,start:now(),end:b.end,state:'confirmed',pay:b.pay.method});nb.q=Object.assign({},b.q,{lines:[{l:'Re-accommodated · PAPHere paid any difference',a:b.q.total}]});nb.reaccomFrom=b.id;DB.bookings.push(nb);
    const diff=Math.max(0,quoteFor(to,b.cls,now(),b.end).total-b.q.total);post(DB,'Re-accommodation',nb.ref,[['Re-accommodation expense',quoteFor(to,b.cls,now(),b.end).total],['Host payable:'+to.host,-quoteFor(to,b.cls,now(),b.end).host],['Platform fee revenue',-quoteFor(to,b.cls,now(),b.end).fee]]);
    if(b.state==='checked_in'){transition(b,'completed','system','Moved by re-accommodation')}else{transition(b,'cancelled','system','Unusable on arrival · re-accommodated')}b.cancelBy='host';
    if(c){c.state='resolved';c.resolution=`Re-accommodated to ${to.name} in ${now()-c.opened} min · PAPHere paid ${rs(diff)} difference`;c.cause='host'}
    notify(ME,'reaccom',`Moved to ${to.name} at no extra cost. New pass ${nb.code}.`,['push','sms']);S.stacks.driver=[{s:'bookings'},{s:'pass',id:nb.id}];render(true);toast('Moved at no extra cost. New pass ready.')},
  d_refundcredit:(t,d)=>{const b=bk(d.id);refund(b,b.q.total,'Space unusable · Space Guarantee');me().credits.push({id:'cr'+(++DB.seq),amt:POLICY.credit,left:POLICY.credit,reason:'Space Guarantee credit',exp:now()+90*DAY});
    if(b.state==='checked_in')transition(b,'completed','system','Ended: space unusable');else transition(b,'cancelled','system','Space unusable · refund plus credit');b.cancelBy='host';
    const c=DB.cases.find(x=>x.booking===b.id&&x.state==='open');if(c){c.state='resolved';c.resolution='Full refund plus ₹100 credit';c.cause='host'}reset('bookings');toast('Refunded in full plus ₹100 credit. Host reliability updated.')},
  d_safety:(t,d)=>sheet('Safety',`${notice('bad','<b>Emergency: call 112.</b> Dial it from your phone.')}<button class="btn ghost" data-act="d_share">Share live location with a contact</button><button class="btn danger" data-act="d_safetycase" data-id="${d.id}">Open a priority safety case</button><p class="sub">If you feel unsafe, we cancel this booking with a full refund and page the on-call lead.</p>`),
  d_share:()=>{S.sheet=null;toast('Live location shared with Appa for 1 hour')},
  d_safetycase:(t,d)=>{const b=bk(d.id);openCase({cat:'Safety',sub:'Driver feels unsafe',pri:'Safety',by:ME,booking:b.id,fid:b.fid,owner:'On-call lead (paged)',first:1});notify(ME,'safety','Safety case opened. Support is calling you now.',['call','push']);S.sheet=null;toast('Priority case opened. Support is calling you.')},
  d_call:(t,d)=>sheet('Call the host',`<p class="sub" style="font-size:14.5px">Call this temporary number. It connects you to ${esc(user(fac(bk(d.id).fid).host).name.split(' ')[0])} without sharing either number, and stops working 2 hours after your booking ends.</p><div class="card" style="text-align:center"><b class="mono" style="font-size:22px">+91 80 4718 2231</b></div><button class="btn ghost" data-act="closesheet">Done</button>`),
  d_ev:(t,d)=>{const b=bk(d.id);b.charging=d.e;(b.evEvents=b.evEvents||[]).push({t:now(),e:d.e,actor:'driver'});
    if(d.e==='Fault'){const ch=b.q.lines.find(l=>l.l.startsWith('Charging'));if(ch){refund(b,ch.a,'Charging failed · converted to parking only');b.q.lines=b.q.lines.filter(l=>l!==ch);b.q.total-=ch.a}b.charge=false;fac(b.fid).ev.status='reported';openCase({cat:'Charging fault',sub:'Charging failed',pri:'Active booking',by:ME,booking:b.id,fid:b.fid});toast('Converted to parking only. Charging refunded.')}else render()},
  d_end:(t,d)=>{const b=bk(d.id);const f=fac(b.fid);
    if(b.type==='parknow'){const used=Math.max(15,Math.ceil((now()-(b.checkin?b.checkin.t:b.start))/15)*15);const q=quoteFor(f,b.cls,b.start,b.start+used);const diff=b.q.total-q.total;b.end=b.start+used;b.q=q;if(diff>0){b.events.push({t:now(),to:b.state,actor:'system',note:'Unused hold released: '+rs(diff)})}}
    if(b.state==='overstaying'){const steps=Math.ceil((now()-b.end)/15);const fee=steps*2*b.overstay.rate/4*4/4;const a=Math.round(steps*(b.overstay.rate*2)/4)+Math.min(POLICY.reaccomCap,120);b.q.lines.push({l:`Overstay · ${steps*15} min at 2× rate + next driver re-accommodation`,a});b.q.total+=a;
      post(DB,'Overstay fee',b.ref,[['Payment aggregator clearing',a],['Host payable:'+f.host,-a*.7],['Platform fee revenue',-a*.3]]);DB.flags.push({id:'FF-'+(++DB.seq),type:'Overstay',signal:'Overstay affected the next driver',target:ME,state:'open',score:40})}
    b.left=true;transition(b,'completed','driver','Driver ended session');b.checkout={t:now(),method:'driver'};S.stacks.driver=[{s:'bookings'},{s:'receipt',id:b.id}];render(true)},
  d_tag:(t,d)=>{const k='d_tags'+d.b;let s=String(F_(k,''));s=s.includes(d.t)?s.replace(d.t,''):s+'|'+d.t;S.f[k]=s;render()},
  d_rate:(t,d)=>{const b=bk(d.id);b.rating={driver:+F_('d_rt'+b.id,5),tags:String(F_('d_tags'+b.id,'')).split('|').filter(Boolean)};render();toast('Rating saved')},
  d_invoice:(t,d)=>{const b=bk(d.id),f=fac(b.fid);sheet('Tax invoice',`<div class="kv">${[['Invoice','PH-INV-'+b.ref.slice(3)],['Supplier of parking',f.kind==='commercial'?esc(user(f.host).name)+(user(f.host).gstin?' · GSTIN '+user(f.host).gstin:''):esc(user(f.host).name)+' (unregistered)'],['Platform fee invoiced by','PAPHere Mobility Pvt Ltd · GSTIN 29AAJCP1234K1Z9'],['Booking value',rs2(b.q.gross||b.q.total)],['Paid',rs2(b.q.total)]].map(r=>`<div><span class="sub">${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div><p class="sub">GST treatment follows OD-06 once tax counsel confirms it. A copy is emailed if you added an email.</p>`)},
  d_damage:(t,d)=>sheet('Report damage',`<p class="sub" style="font-size:14.5px">Claims must be made within 24 hours of the session ending, with photos. The other side responds within 48 hours and trust and safety decides with reasons.</p><button class="btn ghost" data-tog="d_dmgph">${F_('d_dmgph',false)?'✓ 2 photos added':'Add photos'}</button><button class="btn primary" data-act="d_damagesend" data-id="${d.id}">Submit claim</button>`),
  d_damagesend:(t,d)=>{openCase({cat:'Damage claim',sub:'Damage to my vehicle',pri:'General',by:ME,booking:d.id,fid:bk(d.id).fid,evidence:['photo_1.jpg','photo_2.jpg'],respDue:now()+48*60});S.sheet=null;toast('Claim opened. The host has 48 hours to respond.')},
  d_rebook:(t,d)=>{const b=bk(d.id);S.f.d_dest=F_('d_dest','hosp');S.f.d_day=Math.min(3,Math.max(0,dayIdx(now())+5-dayIdx(now())));reset('home');go('detail',{id:b.fid})},
  d_send:(t,d)=>{let txt=d.t||String(F_('d_msgtxt',''));const masked=txt.replace(/(\+?\d[\d\s-]{7,}\d)/g,'[number hidden]').replace(/[\w.-]+@[\w]+/g,'[UPI ID hidden]').replace(/https?:\/\/\S+|www\.\S+/g,'[link hidden]');
    DB.messages.push({b:d.id,from:ME,text:masked,t:now()});if(masked!==txt)DB.flags.push({id:'FF-'+(++DB.seq),type:'Off-platform contact',signal:'Contact details typed in a message (hidden)',target:ME,state:'open',score:45});
    S.f.d_msgtxt='';if(!d.t||d.t==='At the gate')setTimeout(()=>{DB.messages.push({b:d.id,from:'host',text:'Thanks, the gate is open. Park on the left.',t:now()});render()},1200);render()},
  d_change:(t,d)=>{const b=bk(d.id),f=fac(b.fid),sh=+F_('d_shift',30),s=b.start+sh,e=b.end+sh;if(s<now()+30){toast('That time has already passed');return}
    if(!isOpen(f,s,e).ok||unitBusy({id:b.unit},s,e,b.id)){toast('That time isn\'t free here. Try another.');return}
    const nq=quoteFor(f,b.cls,s,e),diff=nq.total-b.q.total;b.start=s;b.end=e;b.events.push({t:now(),to:'confirmed',actor:'driver',note:`Changed to ${win(s,e)} · ${diff>=0?'charged '+rs(diff):'refunded '+rs(-diff)}`});
    if(diff<0)refund(b,-diff,'Booking changed');b.q=Object.assign(nq,{total:b.q.total+diff});render();toast('Changed. '+(diff>0?rs(diff)+' charged':diff<0?rs(-diff)+' refunded':'Same price'))},
  d_cancel:(t,d)=>{const b=bk(d.id),f=fac(b.fid),rc=driverRefundCalc(b);
    if(b.type==='monthly'){b.cancelAt=rc.ends;b.events.push({t:now(),to:b.state,actor:'driver',note:'Cancellation with 7 days\' notice'});if(rc.amt)refund(b,rc.amt,'Monthly pass · unused whole weeks');toast(`Pass ends ${dayTxt(rc.ends)}. ${rs(rc.amt)} refunded.`);render();return}
    if(b.state==='requested'){transition(b,'declined','driver','Driver withdrew request');toast('Request withdrawn. Authorisation released.');reset('bookings');return}
    if(!transition(b,'cancelled','driver','Reason: '+F_('d_creason','Plans changed')))return;b.cancelBy='driver';
    if(rc.amt>0)refund(b,rc.amt,'Driver cancellation · '+rc.rule);notify(f.host,'cancel',`Booking ${b.ref} on ${win(b.start,b.end)} was cancelled by the driver.`,['push','whatsapp']);
    reset('bookings');toast(rc.amt?`Cancelled. ${rs(rc.amt)} refund started.`:'Cancelled.')},
  d_editplate:(t,d)=>{const b=bk(d.id);sheet('Change vehicle',`<p class="sub">You can change the vehicle until check-in. Every change is logged and the guard's list updates.</p><div class="stack">${myVehs().filter(v=>(v.type==='tw')===(b.cls==='tw')).map(v=>`<button class="opt" role="radio" aria-checked="${v.id===b.veh}" data-act="d_setplate" data-id="${b.id}" data-v="${v.id}"><b class="grow">${esc(v.nick)}</b>${plate(v.plate)}</button>`).join('')}</div>`)},
  d_setplate:(t,d)=>{const b=bk(d.id);if(b.checkin){toast('Edits after check-in are refused');return}b.events.push({t:now(),to:b.state,actor:'driver',note:`Vehicle changed ${veh(b.veh).plate} → ${veh(d.v).plate}`});b.veh=d.v;S.sheet=null;render();toast('Vehicle changed')},
  d_help:(t,d)=>sheet('Help with this booking',`<button class="btn ghost" data-act="d_chat">${ic('chat')} Live chat (replies within 2 min)</button><button class="btn ghost" data-act="toast" data-msg="Support will call you within 5 minutes">${ic('phone')} Call me back</button><button class="btn ghost" data-act="toast" data-msg="WhatsApp support: +91 80 4718 0000">WhatsApp support</button>`),
  d_chat:()=>{const c=openCase({cat:'Chat',sub:'Live chat',pri:'Active booking',by:ME});S.sheet=null;toast(`Chat started · case ${c.id}. Asha from support has joined.`)},
  d_pause:(t,d)=>{const b=bk(d.id);b.paused=true;b.pausedDays=(b.pausedDays||0)+7;b.pauseUntil=now()+7*DAY;me().credits.push({id:'cr'+(++DB.seq),amt:Math.round(b.q.total/30*7),left:Math.round(b.q.total/30*7),reason:'Monthly pass pause credit',exp:now()+90*DAY});render();toast(`Paused 7 days. ${rs(Math.round(b.q.total/30*7))} credit added.`)},
  d_second:(t,d)=>{const b=bk(d.id);const other=myVehs().find(v=>v.id!==b.veh);if(!other){toast('Add a second vehicle first');return}b.second=other.id;render();toast('Second vehicle added. One can park at a time.')},
  d_mcancel:(t,d)=>ACT.d_cancel(t,d),
  d_mbuy:()=>{const v=selVeh(),f=fac(F_('d_mfac')),s=+F_('d_mstart',3)*DAY;const u=f.units.find(x=>fitsUnit(x,v));
    const b=mkBooking(DB,{type:'monthly',fid:f.id,unit:u.id,driver:ME,veh:v.id,start:s,end:s+30*DAY,state:'confirmed',band:F_('d_mband','Weekdays 8 am – 7 pm'),renew:s+30*DAY,mandate:'UPI autopay · priya@okbank',pay:'upi'});DB.bookings.push(b);postBooking(DB,b);
    notify(ME,'confirm',`Monthly pass at ${f.name} starts ${dayTxt(s)}. Renews by UPI autopay with notice 5 days and 24 hours before.`,['push','sms']);reset('passes');toast('Monthly pass set up')},
  d_fbuy:(t,d)=>{const cls=(selVeh()||{}).type==='tw'?'tw':'car';DB.flex=DB.flex.filter(x=>x.uid!==ME);DB.flex.push({id:'fx'+(++DB.seq),uid:ME,plan:(cls==='car'?'Car ':'Two-wheeler ')+d.h+' h',cls,hours:+d.h*60,price:+d.p,left:+d.h*60,rolled:0,rollExp:now()+30*DAY,renew:now()+30*DAY,state:'active',mandate:'UPI autopay'});
    post(DB,'Flex Pass sale',ME,[['Payment aggregator clearing',+d.p],['Flex pass liability',-d.p]]);reset('passes');toast('Flex Pass active')},
  d_flexcancel:()=>{myFlex().state='cancelling';render();toast('Flex Pass ends with the paid month')},
  d_nbuy:(t,d)=>{const f=fac(d.id),v=myVehs().find(x=>x.type==='car');const s=dayIdx(now())*DAY+f.relay.night.from;
    const b=mkBooking(DB,{type:'night',fid:f.id,unit:f.units[f.units.length-1].id,driver:ME,veh:v.id,start:s,end:s+30*DAY,state:'confirmed',renew:now()+30*DAY,mandate:'UPI autopay',pay:'upi'});DB.bookings.push(b);postBooking(DB,b);reset('passes');toast('Night pass active from tonight, 8 pm')},
  d_dl:()=>{me().verifiedDriver=true;back();toast('Verified-driver badge added. We kept only the result and a reference.')},
  d_savefv:()=>{me().findVehicle={place:'Green Leaf Pharmacy bay',note:'Bay C2 · ground level',t:now(),sync:F_('d_fvsync',false)};render();toast('Saved on this phone')},
  d_timer:()=>{me().timer={where:'Street parking, CMH Road',end:now()+F_('d_tdur',60)};render()},
  d_timerstop:()=>{me().timer=null;render()},
  d_civsend:()=>{const today=DB.civic.filter(c=>c.mine&&dayIdx(c.t)===dayIdx(now())).length;if(today>=5){toast('Limit reached: 5 reports a day');return}
    DB.civic.unshift({id:'CR-'+(++DB.seq),cat:F_('d_civcat','Footpath parking'),where:'100 Ft Road service lane',t:now(),state:'submitted',blurred:true,acc:'±7 m',plate:'KA 03 •• 7781',mine:true,note:F_('d_civnote','')});S.f.d_civphoto=false;render();toast('Report received')},
  d_routine:()=>{S.f.d_dest='hosp';S.f.d_day=3;S.f.d_time=1080;S.f.d_dur=120;go('detail',{id:'f1'})},
  d_tohost:()=>{if(me().roles.includes('host')&&DB.facilities.some(f=>f.host===ME)){S.hostId=ME;setSurface('host','today')}else{me().roles=Array.from(new Set(me().roles.concat('host')));startWizard()}},
  d_signout:()=>{reset('welcome');toast('Signed out')},
  d_signoutall:()=>{me().devices=me().devices.filter(d=>d.cur);render();toast('Signed out everywhere else')},
  d_consent:(t,d)=>{const c=me().consents[+d.i];c.on=!c.on;c.t=now();render();toast(c.on?'Consent given':'Withdrawn · takes effect within 24 h')},
  d_delete:()=>{const active=myBk().some(b=>['confirmed','checked_in','overstaying','requested'].includes(b.state)&&b.type!=='monthly');
    sheet('Delete account',active?notice('warn','You have an active or upcoming booking. Finish or cancel it first, then delete your account.'):`<p class="sub" style="font-size:14.5px">We delete your account within 30 days. Records the law requires (tax invoices, payments) are kept in restricted storage; everything else is erased or anonymised.</p><button class="btn danger" data-act="toast" data-msg="Deletion scheduled. You can undo it within 7 days.">Delete my account</button>`)},
  d_kyc:()=>{me().wallet.kyc='full';render();toast('Full KYC done in the issuer\'s flow. Limit ₹2,00,000.')},
  d_freeze:()=>{me().wallet.frozen=!me().wallet.frozen;render()},
  d_closewallet:()=>sheet('Close wallet',`<p class="sub" style="font-size:14.5px">Your ${rs(me().wallet.bal)} balance goes back to the bank account you topped up from. Promotional credits stay separate and don't move.</p><button class="btn danger" data-act="toast" data-msg="Wallet closed. Balance is on its way to your bank.">Close and refund balance</button>`),
  d_copyref:()=>{try{navigator.clipboard.writeText(me().referral).then(()=>toast('Code copied'),()=>toast('Code: '+me().referral))}catch(e){toast('Code: '+me().referral)}},
  d_grievance:()=>{const c=openCase({cat:'Grievance',sub:'Raised to grievance officer',pri:'General',by:ME,grievance:true});toast(`Grievance ${c.id} acknowledged. Resolution within one month.`)},
  d_lotenter:(t,d)=>{setSurface('paylot','ticket',{lot:d.id})},
  explain:(t,d)=>{const X={
    guarantee:['Space Guarantee','If your space can\'t be used when you arrive, we offer a comparable space within 500 m in 10 minutes at no extra cost. If we can\'t, you get a full refund plus ₹100 credit automatically. You don\'t have to ask.'],
    verified:['Verified space','A field agent visited, measured the space, photographed the entrance, briefed any guard and did a test entry. We checked the host\'s proof that they can rent it. We didn\'t check other drivers\' insurance.'],
    reliable:['Highly reliable','Score 90 or more over the last 60 days: arrival success 50%, host cancellations 25%, ratings 15%, responsiveness 10%. Recalculated every night.'],
    rank:['How we rank results','Best match combines walking time to your destination, total price, the host\'s reliability score and rating. Hosts can\'t pay to rank higher; if paid placement ever exists it will be labelled.'],
    flex:['How Flex Pass hours work','Flex spaces show hours instead of rupees. Each booking deducts actual time, rounded up to 15 minutes. Unused hours roll over one month, then expire. If a booking needs more hours than you have, we ask before charging rupees.'],
    attr:['Verified attribute',`${ATTRS[d.a]||''}: confirmed on a site visit on ${d.d}. It loses its verified mark after 12 months or two upheld complaints. Well lit and night access need a visit after dark.`]}[d.k];sheet(X[0],`<p style="margin:0;font-size:15px">${X[1]}</p><button class="btn ghost" data-act="closesheet">Got it</button>`)},
  legal:(t,d)=>{const L={privacy:['Privacy notice v1.2','We collect your phone number, name, vehicle plates and booking history to run bookings. Phone numbers and plates are encrypted. No contacts, call logs or background location. Data stays in India. You can access, correct or erase your data from Account. Data protection lead: dpo@paphere.in.'],
    terms:['Driver terms','Park only the registered vehicle, only in the booked space, and only for parking (and charging where booked). No sleeping in vehicles, servicing, washing, hazardous goods or sub-letting. Breaches lead to warnings, restrictions or removal, with an appeal route.'],
    refund:['Cancellation and refunds','Pre-book: full refund 60 min or more before start; less than 60 min, everything except the first hour. Park-now: free within 20 min if not checked in. Monthly: 7 days\' notice, unused whole weeks refunded. Refunds start within 1 hour.'],
    rank:['How we rank','Walking time, total price, host reliability score and rating. No paid placement.'],
    grievance:['Grievance officer','Meenakshi Iyer · grievance@paphere.in · +91 80 4718 0099. Acknowledged in 48 hours, resolved within one month.']}[d.doc];sheet(L[0],`<p style="margin:0;font-size:14.5px">${L[1]}</p>`)}
});
function startWizard(){S.hostId=ME;setSurface('host','wiz1')}

SURF.driver={name:'Driver app',who:'Priya · driver',kind:'phone',start:'home',screens:D,
  lead:'Find, book and use a guaranteed space. Signed in as Priya, who has a car, an electric scooter, a monthly pass and a Flex Pass.',
  tabs:[{s:'home',l:'Search',i:'search'},{s:'bookings',l:'Bookings',i:'ticket'},{s:'passes',l:'Passes',i:'pass'},{s:'tools',l:'Tools',i:'pin'},{s:'account',l:'Account',i:'user',n:()=>0}],
  tabOf:{results:'home',detail:'home',checkout:'home',inbox:'home',partner:'home',bkdetail:'bookings',pass:'bookings',active:'bookings',receipt:'bookings',monthlybuy:'passes',flexbuy:'passes',nightbuy:'passes',dlcheck:'account',canpark:'tools',civic:'tools',wallet:'account',vehicles:'account',credits:'account',prefs:'account',devices:'account',privacy:'account',help:'account',addveh:'account'},
  noTabs:['welcome','phone','otp','profile','role','paying','payfail','checkout','arrive','active','problem','probwait','reaccom','receipt','requested','thread'],
  onPin:id=>{S.f.d_sel=id;render()},
  onInput:(k,el)=>{if(k==='d_plate'){const ok=NEED.d_veh(),m=$('#platemsg');if(m){m.textContent=ok?'✓ Valid Indian plate':'Use a format like KA 05 MN 4821 or 22 BH 1234 AB';m.style.color=ok?'var(--ok)':'var(--bad)'}const pv=$('#plateprev');if(pv)pv.textContent=fmtPlate(F_('d_plate',''))||'—'}
    if(k==='d_q'){clearTimeout(window.__qT);window.__qT=setTimeout(()=>{render();const i=$('#in_d_q');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)}},
  ctxExtra:()=>`<div class="trow"><span>Next payment fails</span>${sw('d_sim_fail',F_('d_sim_fail',false),'Next payment fails')}</div><div class="trow"><span>Payment confirms late</span>${sw('d_sim_late',F_('d_sim_late',false),'Payment confirms late')}</div><div class="trow"><span>City has an authority agreement (R4)</span>${sw('$agreement',S.agreement,'Authority agreement')}</div>`,
  journeys:[
    {g:'Sign in'},['Sign in with mobile + OTP','ACC-01',()=>{S.f.d_adult=false;S.f.d_role=null;setSurface('driver','welcome')}],
    ['Add a vehicle (EV profile)','VEH-01/04',()=>{S.f.d_plate='';S.f.d_nick='';S.f.d_vev=true;S.f.d_vtype='hatch';setSurface('driver','vehicles');go('addveh',{edit:1})}],
    {g:'Book'},['Pre-book at a destination','8.1',()=>{S.f.d_parknow=false;S.f.d_dest='hosp';S.f.d_veh='v1';setSurface('driver','home')}],
    ['Park now near me','8.2',()=>{S.f.d_parknow=true;S.f.d_dest='shops';S.f.d_veh='v1';setSurface('driver','results')}],
    ['Request to book (residential)','BKG-08',()=>{S.f.d_parknow=false;S.f.d_dest='metro';S.f.d_veh='v1';S.f.d_day=1;S.f.d_time=660;setSurface('driver','detail',{id:'f2'})}],
    ['Park and charge (EV scooter)','8.6',()=>{S.f.d_veh='v2';S.f.d_parknow=false;S.f.d_dest='shops';S.f.d_day=0;S.f.d_time=1140;setSurface('driver','detail',{id:'f4'})}],
    ['Booking from a partner link','8.13',()=>{S.f.d_partner='pt1';S.f.d_dest='hosp';S.f.d_day=3;S.f.d_time=630;S.f.d_dur=120;S.f.d_parknow=false;S.f.d_veh='v1';setSurface('driver','partner')}],
    ['Event-day parking','SRC-09',()=>{S.f.d_dest='palace';S.f.d_day=2;S.f.d_time=1020;S.f.d_parknow=false;S.f.d_veh='v1';setSurface('driver','results')}],
    ['Lot full → alternatives','GOV-08',()=>{S.f.d_dest='metro';S.f.d_parknow=true;S.f.d_veh='v1';setSurface('driver','results')}],
    ['Nothing free → notify me','SRC-06',()=>{S.f.d_dest='office';S.f.d_parknow=false;S.f.d_day=0;S.f.d_time=1110;S.f.d_veh='v1';setSurface('driver','results')}],
    {g:'Use'},['Arrive and park','ACS-03',()=>{const b=demoBooking(0);setSurface('driver','pass',{id:b.id})}],
    ['Space taken → re-accommodate','8.7',()=>{const b=demoBooking(0);setSurface('driver','arrive',{id:b.id})}],
    ['Extend, overstay warnings','CHG-01/03',()=>{const b=demoBooking(1);setSurface('driver','active',{id:b.id})}],
    ['Cancel or change a booking','CHG-02/04',()=>{const b=demoBooking(2);setSurface('driver','bkdetail',{id:b.id})}],
    {g:'Passes and money'},['Monthly pass: pause, 2nd vehicle','PAS-07',()=>setSurface('driver','passes')],
    ['Buy a Flex Pass','8.12',()=>{DB.flex=DB.flex.filter(x=>x.uid!==ME);setSurface('driver','flexbuy')}],
    ['Night pass near home','8.10',()=>setSurface('driver','nightbuy')],
    ['Wallet: top up, KYC, statement','WAL',()=>setSurface('driver','wallet')],
    ['Pay at a public lot','8.15',()=>{S.f.d_veh='v1';setSurface('driver','detail',{id:'p1'})}],
    {g:'Everyday'},['Find my vehicle, timer, alerts','UTL',()=>setSurface('driver','tools')],
    ['Report a public violation','CIV',()=>setSurface('driver','civic')],
    ['Privacy, devices, delete account','ACC-05..08',()=>setSurface('driver','privacy')],
    ['Help, cases, grievance','SUP',()=>setSurface('driver','help')],
    ['Notifications inbox','NTF',()=>setSurface('driver','inbox')]
  ]};
// creates a ready-made booking for journeys: 0 = upcoming today, 1 = active, 2 = tomorrow
function demoBooking(kind){
  const f=fac(kind===0?'f3':kind===1?'f3':'f1'),v=veh('v1');
  const s=kind===0?Math.ceil((now()+20)/15)*15:kind===1?now()-45:DAY+600, e=s+(kind===1?75:120);
  const u=freeUnit(f,v,s,e)||f.units[0];
  const b=mkBooking(DB,{type:'prebook',fid:f.id,unit:u.id,driver:ME,veh:v.id,start:s,end:e,state:kind===1?'checked_in':'confirmed',pay:'wallet'});
  if(kind===1)b.checkin={t:s+3,method:'guard'};DB.bookings.push(b);postBooking(DB,b);return b;
}
})();
