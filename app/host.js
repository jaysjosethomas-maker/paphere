'use strict';
/* Host app: listing wizard, verification, today, calendar and relay, listing, earnings, performance, account. */
(function(){
const H={};
const hu=()=>user(S.hostId);
const myFacs=()=>DB.facilities.filter(f=>f.host===S.hostId&&f.kind!=='public');
const hf=()=>myFacs().find(f=>f.id===F_('h_fac'))||myFacs()[0];
const kn=()=>S.hostLang==='kn';
const tr=(en,k)=>kn()&&k?k:en;
const W=()=>S.f.h_w||(S.f.h_w={type:null,owner:'owner',pin:{x:46,y:38},addr:'',fits:['hatch','sedan'],cap:1,covered:true,commute:true,photos:{},proof:null,uploaded:false,pan:'ABCPN1234K',bankOk:false,attest:false,price:40,slot:null,ev:false});
const SLOTS=[DAY*2+600,DAY*2+960,DAY*3+600];
const EVID={'Driveway':{owner:'Property tax receipt or title extract in your name, or a utility bill in your name with ID match',tenant:'Rent agreement that permits this use, or the owner\'s signed consent with the owner\'s ID'},
  'Garage':{owner:'Property tax receipt or title extract in your name, or a utility bill in your name with ID match',tenant:'Rent agreement that permits this use, or the owner\'s signed consent with the owner\'s ID'},
  'Front yard':{owner:'Property tax receipt or title extract in your name, or a utility bill in your name with ID match',tenant:'Rent agreement that permits this use, or the owner\'s signed consent with the owner\'s ID'},
  'Shop bay':{owner:'Owner or management authorisation on letterhead; GSTIN if registered',tenant:'Owner or management authorisation on letterhead; GSTIN if registered'},
  'Apartment allotted space':{owner:'Allotment letter plus the association\'s written consent naming the space and permitted hours',tenant:'Allotment letter plus the association\'s written consent naming the space and permitted hours'}};
Object.assign(NEED,{
  h_w1:()=>!!W().type, h_w2:()=>String(W().addr).trim().length>5, h_w3:()=>W().fits.length>0, h_w4:()=>Object.keys(W().photos).length===4,
  h_w5:()=>!!(W().proof&&W().uploaded&&/^[A-Z]{5}\d{4}[A-Z]$/.test(String(W().pan).toUpperCase())&&W().bankOk&&W().attest), h_w6:()=>!!W().slot
});
const wneed=k=>`data-need="${k}" ${NEED[k]()?'':'disabled'}`;
function wizTop(n,title){return `${topbar(tr('List your space','ನಿಮ್ಮ ಜಾಗ ಪಟ್ಟಿ ಮಾಡಿ'))}<div class="pad" style="padding-bottom:0;gap:8px"><div class="between"><p class="lbl">Step ${n} of 6</p><p class="lbl">${['Type','Location','Space and hours','Photos','Proof and payouts','Price and visit'][n-1]}</p></div><div class="progress"><span style="width:${n/6*100}%"></span></div><p class="h-l" style="margin-top:8px">${title}</p></div>`}

/* ---------- onboarding wizard (8.4, LST-01..05, VER-01..02, 10.6, 10.7) ---------- */
H.wiz1=()=>{const w=W();return `${wizTop(1,'What kind of space is it?')}<div class="pad"><div class="stack" role="radiogroup">
  ${[['Driveway','In front of or beside your house'],['Garage','Closed or covered garage'],['Front yard','Open yard inside your gate'],['Shop bay','Spaces at your shop or office'],['Apartment allotted space','Needs your association\'s written consent · R2']].map(([k,d])=>`<button class="opt" role="radio" aria-checked="${w.type===k}" data-act="h_wset" data-k="type" data-v="${k}"><div class="grow"><b>${k}</b><div class="sub">${d}</div></div>${radio(w.type===k)}</button>`).join('')}</div>
  <div><p class="flabel">You are the</p>${chips('h_owner',[['owner','Owner'],['tenant','Tenant']],F_('h_owner','owner'))}</div>
  ${notice('warn','Not allowed: public road or footpath, a space you don\'t control, anything blocking a fire exit, hydrant or someone else\'s gate, or a space under dispute. Tandem spaces, height below 2.0 m and entry through your home get extra review.')}</div>
  <div class="sticky-foot"><button class="btn primary" data-act="h_wnext" ${wneed('h_w1')}>Next</button></div>`};
H.wiz2=()=>{const w=W();if(!w.addr)w.addr='No. 418, 12th Main, HAL 2nd Stage';return `${wizTop(2,'Where is it?')}<div class="pad">
  <div class="field">${ic('pin',20)}<input data-bind="h_addr" value="${esc(F_('h_addr',w.addr))}" aria-label="Address"></div>
  <div><div style="border-radius:14px;overflow:hidden">${mapSVG({pick:true,extra:`<span class="dropin" style="left:${w.pin.x}%;top:${w.pin.y}%"></span>`})}</div><p class="sub" style="margin-top:6px">Tap the map to put the pin on your gate. A pin on a road segment gets flagged. Drivers see only an area of about 200 m until they book.</p></div></div>
  <div class="sticky-foot"><button class="btn primary" data-act="h_wnext">Next</button></div>`};
H.wiz3=()=>{const w=W();return `${wizTop(3,'Tell drivers what fits')}<div class="pad">
  <div><p class="flabel">Vehicles that fit</p><div class="chips">${SIZES.map(k=>`<button class="chip" aria-pressed="${w.fits.includes(k)}" data-act="h_wfit" data-v="${k}">${SIZE_TXT[k]}</button>`).join('')}</div></div>
  <div class="card between"><div><b>How many vehicles at once?</b><div class="sub">More than one becomes a pool</div></div><div class="stepper"><button data-act="h_wcap" data-v="-1" aria-label="Fewer">−</button><b class="num" style="font-size:20px">${w.cap}</b><button data-act="h_wcap" data-v="1" aria-label="More">+</button></div></div>
  <div class="card between"><div><b>Covered</b><div class="sub">Roof or carport</div></div><button class="sw" role="switch" aria-checked="${w.covered}" data-act="h_wtog" data-k="covered" aria-label="Covered"></button></div>
  <div class="card between"><div><b>Height clearance</b><div class="sub">Below 2.0 m gets extra review</div></div>${chips('h_height',[[1.9,'1.9 m'],[2.1,'2.1 m'],[2.4,'2.4 m+']],F_('h_height',2.4),1)}</div>
  <div><p class="flabel">When is it free?</p><div class="stack" role="radiogroup">
    <button class="opt" role="radio" aria-checked="${w.commute}" data-act="h_wset" data-k="commute" data-v="1"><div class="grow"><b>When I drive to work</b><div class="sub">Tap "I'm out" when you leave. Usually 8:45 am – 9 pm.</div></div>${radio(w.commute)}</button>
    <button class="opt" role="radio" aria-checked="${!w.commute}" data-act="h_wset" data-k="commute" data-v="0"><div class="grow"><b>Fixed weekly hours</b><div class="sub">Weekdays 9 am – 6 pm. Change any time in Calendar.</div></div>${radio(!w.commute)}</button></div></div>
  <div class="card between"><div><b>Has a charger or socket ${relTag('R2')}</b><div class="sub">You'll declare safety details later</div></div><button class="sw" role="switch" aria-checked="${w.ev}" data-act="h_wtog" data-k="ev" aria-label="Charger"></button></div></div>
  <div class="sticky-foot"><button class="btn primary" data-act="h_wnext" ${wneed('h_w3')}>Next</button></div>`};
H.wiz4=()=>{const w=W();return `${wizTop(4,'Add 4 photos')}<div class="pad"><p class="sub">Street, entrance, space and exit. We strip location data before drivers see them. The field agent retakes them on the visit.</p>
  <div class="tiles">${['Street','Entrance','Space','Exit'].map(k=>`<button class="tile ${w.photos[k]?'done':''}" data-act="h_wphoto" data-v="${k}" aria-label="${k} photo">${w.photos[k]?photo({type:k==='Space'?'Garage':'Driveway',name:k},90,k+' photo')+`<span class="cap">✓ ${k}</span>`:`${ic('cam',24)}<span>${k}</span><span style="font-weight:500;font-size:12px">Tap to add</span>`}</button>`).join('')}</div>
  <p class="sub">${Object.keys(w.photos).length} of 4 added. You can't submit without all four.</p></div>
  <div class="sticky-foot"><button class="btn primary" data-act="h_wnext" ${wneed('h_w4')}>Next</button></div>`};
H.wiz5=()=>{const w=W();const t=w.type||'Driveway';const ev=EVID[t][F_('h_owner','owner')];const panOk=/^[A-Z]{5}\d{4}[A-Z]$/.test(String(w.pan).toUpperCase());
  const opts=t==='Shop bay'?['Authorisation letter on letterhead','GSTIN certificate']:F_('h_owner','owner')==='owner'?['Property tax receipt','Title extract','Electricity bill in your name']:['Rent agreement allowing this use','Owner\'s signed consent with ID'];
  return `${wizTop(5,'Show you can rent it, and get paid')}<div class="pad">
  <div class="card stack"><p class="lbl">Proof you can rent this space</p><p class="sub">For a ${esc(t.toLowerCase())} (${F_('h_owner','owner')}): ${esc(ev)}.</p>
    <div class="chips">${opts.map(p=>`<button class="chip" aria-pressed="${w.proof===p}" data-act="h_wset" data-k="proof" data-v="${esc(p)}">${p}</button>`).join('')}</div>
    <button class="tile ${w.uploaded?'done':''}" style="aspect-ratio:auto;padding:14px" data-act="h_wupload" ${w.proof?'':'disabled'}>${w.uploaded?`<b style="color:var(--ink)">✓ ${esc(w.proof)} uploaded</b><span>Malware-scanned · restricted storage · every access logged</span>`:w.proof?'Tap to upload a photo or PDF':'Pick a document type first'}</button></div>
  <div class="card stack"><p class="lbl">PAN</p><div class="field"><input id="in_h_pan" class="mono" data-bind="h_pan" value="${esc(w.pan)}" style="text-transform:uppercase" aria-label="PAN"></div>
    <p class="sub" id="h_panmsg" style="color:${panOk?'var(--ok)':'var(--bad)'}">${panOk?'✓ Format looks right. We match the name on PAN.':'PAN has 10 characters, like ABCPN1234K'}</p><p class="sub">Without PAN, tax deducted on payouts is 5% instead of 0.1%.</p></div>
  <div class="card stack"><p class="lbl">Payout bank account</p><div class="between"><div><b>HDFC Bank ••• 2207</b><div class="sub">IFSC HDFC0001234</div></div>${w.bankOk?badge('Verified','b-ok'):`<button class="btn primary sm" data-act="h_wpenny">Verify with ₹1</button>`}</div>
    <p class="sub">${w.bankOk?`₹1 deposited. Name matched: ${esc(hu().name)}. You're onboarded as a seller with our payment partner.`:'We send ₹1 to check the account is in your name.'}</p></div>
  ${`<button class="cbx" role="checkbox" aria-checked="${w.attest}" data-act="h_wtog" data-k="attest"><span class="box">${w.attest?ic('check',16):''}</span><span>I have the right to rent this space. It isn't a public road or footpath, isn't under dispute, and doesn't block a fire exit, hydrant or anyone's gate.</span></button>`}
  <p class="sub">We never store your Aadhaar number.</p></div>
  <div class="sticky-foot"><button class="btn primary" data-act="h_wnext" ${wneed('h_w5')}>Next</button></div>`};
H.wiz6=()=>{const w=W();return `${wizTop(6,'Set your price and book a visit')}<div class="pad">
  <div class="card stack"><div class="between"><p class="lbl">Hourly price</p>${badge('Suggested ₹40','b-sign')}</div>
    <div class="between"><div class="h-xl num" id="h_wp">${rs(w.price)}/h</div><div style="text-align:right"><div class="sub">You receive</div><b class="num" id="h_wr" style="font-size:18px;color:var(--ok)">${rs2(w.price*.7)}/h</b></div></div>
    <input type="range" min="30" max="60" step="5" value="${w.price}" data-bind="h_wprice" aria-label="Hourly price"><div class="between sub"><span>Zone band ₹30</span><span>₹60</span></div>
    <p class="sub">Suggested from 41 bookings within 500 m in the last 30 days. PAPHere keeps 30%. No platform fee for your first 30 days.</p></div>
  <div class="card stack"><p class="lbl">Set-and-forget defaults</p>${kv([['Booking','Instant'],['Availability','Repeats every week'],['Check-in','Driver self check-in'],['Check-out','Automatic at end time'],['Payouts','Weekly, every Monday'],['Driver issues','Handled by PAPHere support']])}<p class="sub">You don't need to do anything per booking. Change any of these later.</p></div>
  <div><p class="lbl" style="margin-bottom:6px">Verification visit</p><p class="sub" style="margin-bottom:8px">A field agent measures the space, photographs the entrance, briefs your guard and does a test entry. About 20 minutes.</p>
    <div class="stack" role="radiogroup">${SLOTS.map(s=>`<button class="opt" role="radio" aria-checked="${w.slot===s}" data-act="h_wset" data-k="slot" data-v="${s}" data-num><b class="grow">${dayTxt(s)}, ${tm(s)} – ${tm(s+120)}</b>${radio(w.slot===s)}</button>`).join('')}</div></div></div>
  <div class="sticky-foot"><button class="btn primary" data-act="h_wsubmit" ${wneed('h_w6')}>Submit for verification</button></div>`};
H.vstatus=()=>{const f=hf();const vc=f&&DB.verif.find(v=>v.fid===f.id);if(!f||!vc)return `${topbar('Verification')}<div class="pad">No listing in verification.</div>`;
  const st=vc.state;const steps=[['Submitted',true,relWhen(vc.submitted)],['PAN and bank verified',true,'Name matched'],['Proof of authority reviewed',st!=='in_verification'||vc.docsOk,vc.docs[0]],['Site visit',vc.visit.done,`${relWhen(vc.visit.when)} · ${vc.visit.agent}`],['Decision',st==='approved'||st==='rejected',st==='rejected'?'Not approved: '+vc.reason:'Within 72 hours of a complete submission']];
  return `${topbar('Verification',{noBack:true})}<div class="pad">
  <div class="card between"><div><b>${esc(f.name)}</b><div class="sub">${esc(f.addr)}</div></div>${badge(f.status==='active'?'Active':'In verification',f.status==='active'?'b-ok':'b-warn')}</div>
  <ol class="tl card">${steps.map(([t,ok,s])=>`<li><span class="dot ${ok?'d-ok':'d-todo'}">${ok?'✓':''}</span><div><b>${t}</b><div class="sub">${esc(s)}</div></div></li>`).join('')}</ol>
  <p class="sub">Listing status: draft → submitted → in verification → active. Nothing is bookable until the visit passes. Ops decides in the Operations console.</p>
  ${f.status==='active'?`<button class="btn primary" data-tab="today">Go to Today</button>`:`<button class="btn ghost" data-act="toast" data-msg="Visit moved to ${dayTxt(SLOTS[2])}, 10 am">Reschedule visit</button><button class="btn primary" data-act="h_simpass">Simulate: visit passed, approve</button>`}</div>`};

/* ---------- today (HST-01, HAC-01..03, HAC-06, BKG-08, SPP-04) ---------- */
H.today=()=>{
  const f=hf();if(!f)return H.empty();if(f.status!=='active')return H.vstatus();
  const bs=DB.bookings.filter(b=>b.fid===f.id&&dayIdx(b.start)===dayIdx(now())&&b.type!=='monthly'&&!['held','expired','failed'].includes(b.state)).sort((a,b)=>a.start-b.start);
  const reqs=DB.bookings.filter(b=>myFacs().some(x=>x.id===b.fid)&&b.state==='requested');
  const todayEarn=bs.filter(b=>['completed','checked_in','confirmed','overstaying'].includes(b.state)).reduce((a,b)=>a+b.q.host,0);
  const parked=bs.find(b=>['checked_in','overstaying'].includes(b.state));
  const out=f.out,u=hu();
  return `<div class="pad" style="background:var(--surface);border-bottom:1px solid var(--line)"><div class="between"><p class="lbl">${dayTxt(now())} · ${tr('Host mode','ಹೋಸ್ಟ್ ಮೋಡ್')}</p><button class="badge b-sign" data-act="h_todriver">${tr('Switch to driver','ಡ್ರೈವರ್‌ಗೆ ಬದಲಿಸಿ')}</button></div>
    <p class="h-xl">${esc(f.name)}</p><div class="row wrap">${badge('Verified · Live','b-ok')}${myFacs().length>1?`<select class="chip" data-bindc="h_fac" aria-label="Listing">${myFacs().map(x=>`<option value="${x.id}" ${x.id===f.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`:''}</div></div>
  <div class="pad">
    ${reqs.map(b=>`<div class="card stack" style="border-color:var(--marigold)"><div class="between"><b>${tr('Booking request','ಬುಕ್ಕಿಂಗ್ ವಿನಂತಿ')}</b>${badge(`${Math.max(0,b.rtbAt+15-now())} min to respond`,'b-mari')}</div><p class="sub">${esc(user(b.driver).name.split(' ')[0])} ${user(b.driver).verifiedDriver?'· Verified driver':''} · ${win(b.start,b.end)} · ${plate(veh(b.veh).plate)}</p><b>You receive ${rs2(b.q.host)}</b><div class="row"><button class="btn ok sm" data-act="h_accept" data-id="${b.id}">Accept</button><button class="btn ghost sm" data-act="h_decline" data-id="${b.id}">Decline</button></div></div>`).join('')}
    ${f.mode==='commute'?`<div class="relay ${out?'out':'home'}"><div class="between"><b style="font-size:17px">${out?tr('Your space is open','ನಿಮ್ಮ ಜಾಗ ತೆರೆದಿದೆ'):tr('You\'re home. Space is closed.','ನೀವು ಮನೆಯಲ್ಲಿದ್ದೀರಿ')}</b>${badge(F_('h_auto',false)?'Automatic':'Manual','b-mute')}</div>
      <p class="sub">${out?`Open until ${tm(u.commute.back-30)}, keeping 30 min clear before your usual ${tm(u.commute.back)} return.`:'Tap I\'m out when you leave. We open the space until your usual return time, minus a buffer.'}</p>
      <div class="bigtoggle" role="group" aria-label="Out or back"><button aria-pressed="${!out}" data-act="h_back">${tr('I\'m back','ನಾನು ಬಂದೆ')}</button><button aria-pressed="${out}" data-act="h_out">${tr('I\'m out','ನಾನು ಹೊರಗೆ')}</button></div>
      ${F_('h_undo',0)>now()?`<button class="btn ghost sm" data-act="h_undo">Undo automatic opening (${F_('h_undo')-now()} min left)</button>`:''}</div>`:''}
    <div class="card between" style="background:var(--marigold-soft);border-color:transparent;color:var(--marigold-ink)"><div><p class="lbl" style="color:inherit">${tr('Today you earn','ಇಂದಿನ ಗಳಿಕೆ')}</p><div class="h-xl num">${rs(todayEarn)}</div><div class="sub" style="color:inherit">${bs.length} bookings · payout Monday</div></div><div style="text-align:right"><div class="sub" style="color:inherit">Forecast this month</div><b class="num" style="font-size:18px">${rs(hostEarnings(DB,S.hostId).available+todayEarn*14)}</b></div></div>
    <div class="card"><div class="between"><p class="lbl">${tr('Today\'s arrivals','ಇಂದಿನ ಆಗಮನಗಳು')}</p><span class="sub">${{self:'Self check-in',guard:'Guard checks passes',host:'You confirm arrivals'}[f.checkin]}</span></div>
      <div class="list">${bs.map(b=>`<div class="li"><div class="grow"><b style="font-size:14.5px">${tm(b.start)} – ${tm(b.end)}</b><div class="row wrap" style="gap:5px;margin-top:3px">${stateBadge(b.state)}<span class="sub">${esc(user(b.driver).name.split(' ')[0])}${user(b.driver).verifiedDriver?' · verified':''}</span></div></div><div class="stack" style="align-items:flex-end;gap:6px">${plate(veh(b.veh).plate)}${b.state==='confirmed'&&f.checkin==='host'?`<button class="btn primary sm" data-act="h_confirm" data-id="${b.id}">Confirm arrival</button>`:''}</div></div>`).join('')||'<p class="sub">No bookings today.</p>'}</div></div>
    ${parked&&!out&&f.mode==='commute'?notice('info',`A driver is parked until ${tm(parked.end)}. We never ask them to leave early. <button class="badge b-sign" data-act="h_fallback">Get a free nearby space</button>`):''}
    <div class="card between"><div><b>Automatic availability ${relTag('R2')}</b><div class="sub">Opens when your car leaves, using your phone's location and car Bluetooth. Only "out" and "back" reach us. Undo within 2 min.</div></div>${sw('h_auto',F_('h_auto',false),'Automatic availability')}</div>
    ${F_('h_auto',false)?`<button class="btn ghost sm" data-act="h_autodetect">Simulate: car left home</button>`:''}
    <div class="row"><button class="btn ghost" data-act="h_reportveh">Report a vehicle</button><button class="btn ghost" data-tab="cal">${tr('Block a date','ದಿನಾಂಕ ತಡೆ')}</button></div></div>`;
};
H.empty=()=>`<div class="pad" style="flex:1;justify-content:center;text-align:center"><p class="h-l">Earn from your space</p><p class="sub">List a driveway, garage or shop bay in 6 short steps. We verify it, then bookings come in with nothing to do per booking.</p><button class="btn primary" data-act="h_startwiz">List my space</button></div>`;

/* ---------- calendar (HST-02, INV-01, INV-04, INV-06, PAS-05..06, CHG-05, 10.4, 10.14) ---------- */
H.cal=()=>{const f=hf();if(!f)return H.empty();const days=[0,1,2,3,4,5,6].map(i=>dayIdx(now())*DAY+i*DAY);
  const pos=(a,b)=>`left:${a/1440*100}%;width:${Math.max(1,(b-a)/1440*100)}%`;
  return `${topbar(tr('Calendar','ಕ್ಯಾಲೆಂಡರ್'))}<div class="pad">
  <div class="legend"><span><i style="background:var(--sign-soft)"></i>Open</span><span><i style="background:var(--marigold)"></i>Booked</span><span><i style="background:var(--night-soft)"></i>Night window</span><span><i style="background:var(--bad-soft)"></i>Blocked</span></div>
  <div class="card"><div class="cal"><span></span><div class="between sub" style="font-size:10px"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div>
  ${days.map(d=>{const w=f.windows.filter(x=>x.days.includes(dow(d)));const bks=DB.bookings.filter(b=>b.fid===f.id&&ACTIVE.concat('completed').includes(b.state)&&b.type!=='monthly'&&b.type!=='night'&&dayIdx(b.start)===dayIdx(d));const bl=f.blocks.filter(b=>b.start<d+DAY&&b.end>d);
    return `<button style="border:0;background:transparent;text-align:left;padding:0;font-weight:700" data-act="h_block" data-d="${d}" aria-label="Block ${dayTxt(d)}">${DOW[dow(d)]}<br><span class="sub" style="font-size:10px">${dateOf(d).getDate()}</span></button><div class="bar">${w.map(x=>`<span class="seg-b" style="${pos(x.from,x.to)};background:var(--sign-soft)"></span>`).join('')}${f.relay&&f.relay.night?`<span class="seg-b" style="${pos(f.relay.night.from,1440)};background:var(--night-soft)"></span><span class="seg-b" style="${pos(0,f.relay.night.to)};background:var(--night-soft)"></span>`:''}${bks.map(b=>`<span class="seg-b" style="${pos(mod(b.start),Math.min(1440,mod(b.start)+(b.end-b.start)))};background:var(--marigold);color:#2a1c00"></span>`).join('')}${bl.map(()=>`<span class="seg-b" style="left:0;width:100%;background:var(--bad-soft);color:var(--bad)">Blocked</span>`).join('')}</div>`}).join('')}</div></div>
  <p class="sub">Tap a day to block it. Blocking over a booking takes you to the host-cancellation rules; we never cancel a driver silently.</p>
  <div class="card stack"><p class="lbl">Weekly hours</p>${f.windows.map(w=>`<div class="between"><span>${w.days.map(x=>DOW[x]).join(' ')}</span><b>${tm(w.from)} – ${w.to===1440?'midnight':tm(w.to)}</b></div>`).join('')}
    ${kv([['Buffer between bookings',POLICY.buffer+' min'],['Minimum notice','30 min'],['Booking horizon','30 days (monthly 60)'],['Length','1 h to 12 h']])}</div>
  <div class="card stack" style="background:var(--night-soft);border-color:transparent"><div class="between"><b style="color:var(--night)">Day–night relay ${relTag('R2')}</b>${sw('h_relay',F_('h_relay',!!(f.relay&&f.relay.night)),'Night window')}</div>
    <p class="sub">Sell a night window to nearby residents as well as your day window. Changeover buffer at least 30 min; each window at least 4 h; night passes go to verified drivers only.</p>
    ${F_('h_relay',!!(f.relay&&f.relay.night))?kv([['Night window','8 pm – 8 am'],['Estimated demand','3 residents within 300 m searching'],['Estimated earnings','₹1,400 / month after fee']]):''}
    <p class="sub">To withdraw a window, give pass holders 7 days' notice. Withdrawing at once counts as a host cancellation.</p></div>
  <button class="btn ghost" data-act="toast" data-msg="Calendar link copied: webcal://paphere.in/cal/${f.id}.ics">Export calendar</button></div>`};

/* ---------- listing (LST-03, LST-04, LST-06, PRC-01, PRC-06, HAC-03..05, HST-04, HST-05, EVC-01, EVC-07, SUI) ---------- */
H.listing=()=>{const f=hf();if(!f)return H.empty();const cls=f.price.car?'car':'tw';const r=f.price[cls];const band=POLICY.zoneBand[cls];const p=F_('h_price',r.first);
  return `${topbar(tr('Listing','ಪಟ್ಟಿ'))}<div style="height:150px;flex:none">${photo(f,150)}</div><div class="pad">
  <div class="between"><div><h4 class="h-l">${esc(f.name)}</h4><p class="sub">${esc(f.type)} · ${f.units.length} ${f.units.length>1?'units (pool)':'space'} · ${f.attrs.covered?'covered':'open'}</p></div>${badge(f.status==='active'?'Active':f.status==='paused'?'Paused':f.status,f.status==='active'?'b-ok':'b-warn')}</div>
  <div class="card stack"><div class="between"><p class="lbl">Price · first hour</p><button class="badge b-sign" data-act="h_sugg">Suggested ₹40</button></div>
    <div class="between"><div class="h-xl num" id="h_pp">${rs(p)}/h</div><div style="text-align:right"><div class="sub">You receive</div><b class="num" id="h_pr" style="font-size:18px;color:var(--ok)">${rs2(p*.7)}/h</b></div></div>
    <input type="range" min="${band[0]}" max="${band[1]}" step="5" value="${p}" data-bind="h_price" aria-label="Hourly price"><div class="between sub"><span>Zone band ${rs(band[0])}</span><span>${rs(band[1])}</span></div>
    ${kv([['Later hours',rs(r.later)+'/h · you receive '+rs2(r.later*.7)],['Daily cap',rs(r.cap)+' · max 10 h at hourly rate'],['Monthly',rs(r.month)+' · you receive '+rs2(r.month*.7)]])}
    <button class="btn primary sm" data-act="h_saveprice">Save price</button><p class="sub">Price and hours changes apply at once. Existing bookings keep their price.</p></div>
  <div class="card stack"><div class="between"><p class="lbl">Listing quality</p><b>${f.quality}/100</b></div><div class="meter"><span style="width:${f.quality}%"></span></div><ul class="steps"><li>Add a night photo of the entrance (+6)</li><li>Write the last-50-metre walk from gate to bay (+4)</li></ul></div>
  <div class="card list" style="padding:0 14px">
    <button class="li" data-act="h_guard"><span class="ic">${ic('key')}</span><div class="grow"><b style="font-size:14.5px">Guard mode</b><div class="sub">${f.guardPin?'Link active · PIN set':'Not set up'}</div></div>${ic('chev',18)}</button>
    <button class="li" data-go="neighbour"><span class="ic">${ic('home')}</span><div class="grow"><b style="font-size:14.5px">Neighbour-friendly controls</b><div class="sub">${f.neighbour.quiet?'Quiet hours 10 pm – 7 am':'No quiet hours'}${f.neighbour.verifiedOnly?' · verified drivers only':''}</div></div>${ic('chev',18)}</button>
    <button class="li" data-go="charger"><span class="ic">${ic('bolt')}</span><div class="grow"><b style="font-size:14.5px">Charger ${relTag('R2')}</b><div class="sub">${f.ev?f.ev.kw+' kW · '+f.ev.conn.join(', ')+(f.ev.status==='suspended'?' · suspended':''):'Add a charger or socket'}</div></div>${ic('chev',18)}</button>
    <button class="li" data-go="settings"><span class="ic">${ic('list')}</span><div class="grow"><b style="font-size:14.5px">Booking settings</b><div class="sub">${f.rtb?'Request to book':'Instant'} · ${{self:'self check-in',guard:'guard mode',host:'you confirm'}[f.checkin]} · ${f.flex?'Flex on':'Flex off'}</div></div>${ic('chev',18)}</button>
    <button class="li" data-act="h_signage"><span class="ic">${ic('flag')}</span><div class="grow"><b style="font-size:14.5px">Request a signage kit</b><div class="sub">${DB.signage.find(s=>s.fid===f.id)?'Requested · dispatch within 5 days':'Free bay marker and QR board'}</div></div>${ic('chev',18)}</button>
    <button class="li" data-act="h_material"><span class="ic">${ic('pin')}</span><div class="grow"><b style="font-size:14.5px">Change location, capacity or entrance</b><div class="sub">These go back to verification</div></div>${ic('chev',18)}</button></div>
  <div class="card stack"><p class="lbl">Verified attributes</p><div class="row wrap" style="gap:6px">${Object.entries(f.attrs).map(([k,v])=>badge(`${ATTRS[k]} · ${v}`,'b-ok')).join('')}</div><p class="sub">Added only after a site visit; well lit and night access need a visit after dark. They expire after 12 months.</p>
    ${f.amenities.length?`<p class="sub">Amenities: ${f.amenities.join(', ')}</p>`:`<button class="btn ghost sm" data-act="h_amen">Add helmet locker and rain cover ${relTag('R2')}</button>`}</div>
  <button class="btn ghost" data-act="h_pause">${f.status==='paused'?'Resume listing':'Pause listing'}</button></div>`};
H.neighbour=()=>{const f=hf(),n=f.neighbour;return `${topbar('Neighbour-friendly controls')}<div class="pad">
  ${[['quiet','Quiet hours','No arrivals or departures 10 pm – 7 am'],['verifiedOnly','Verified drivers only','Only drivers with a licence check can book'],['twOnly','Two-wheelers only','Hide your space from cars']].map(([k,t,d])=>`<div class="card between"><div><b>${t}</b><div class="sub">${d}</div></div><button class="sw" role="switch" aria-checked="${!!n[k]}" data-act="h_nb" data-k="${k}" aria-label="${t}"></button></div>`).join('')}
  <div class="card stack"><b>Largest vehicle</b>${`<div class="chips">${SIZES.slice(1).map(s=>`<button class="chip" aria-pressed="${n.maxSize===s}" data-act="h_nbsize" data-v="${s}">${SIZE_TXT[s]}</button>`).join('')}</div>`}</div></div>`};
H.settings=()=>{const f=hf();return `${topbar('Booking settings')}<div class="pad">
  <div class="card between"><div><b>Request to book</b><div class="sub">For residential hosts only. You have 15 minutes to accept; otherwise it's declined. Instant booking gets more bookings.</div></div><button class="sw" role="switch" aria-checked="${f.rtb}" data-act="h_set" data-k="rtb" aria-label="Request to book" ${f.kind!=='residential'?'disabled':''}></button></div>
  <div class="card stack"><b>Check-in method</b><div class="chips">${[['self','Driver self check-in'],['guard','Guard mode'],['host','I confirm']].map(([k,l])=>`<button class="chip" aria-pressed="${f.checkin===k}" data-act="h_checkin" data-v="${k}">${l}</button>`).join('')}</div></div>
  <div class="card between"><div><b>Accept Flex Pass drivers</b><div class="sub">You're paid your listed price less 30% for Flex hours</div></div><button class="sw" role="switch" aria-checked="${f.flex}" data-act="h_set" data-k="flex" aria-label="Flex"></button></div>
  <div class="card between"><div><b>Release no-show spaces</b><div class="sub">After 20 min grace; the driver is told 5 min before</div></div><button class="sw" role="switch" aria-checked="${!!f.release}" data-act="h_set" data-k="release" aria-label="Release no-shows"></button></div>
  <div class="card between"><div><b>Automatic check-out</b><div class="sub">At the end time</div></div>${badge('On','b-ok')}</div></div>`};
H.charger=()=>{const f=hf();const e=f.ev||{conn:['15A socket'],kw:3.3,phase:'Single phase',acdc:'AC',cable:'Bring your own charger',hours:[540,1200],perHour:20,safety:{},status:'draft'};const s=e.safety;
  return `${topbar('Charger')}<div class="pad">
  ${f.ev&&f.ev.status==='suspended'?notice('bad','Suspended after a safety report. Ops will contact you before it goes live again.'):''}
  ${f.ev&&f.ev.status==='reported'?notice('warn','A driver reported a charging fault. Check the breaker; ops may follow up.'):''}
  <div class="card stack">${kv([['Connectors',e.conn.join(', ')],['Rated output',e.kw+' kW '+e.acdc+' · '+e.phase],['Cable',e.cable],['Charging hours',tm(e.hours[0])+' – '+tm(e.hours[1])],['Price',rs(e.perHour)+'/h connected · you receive '+rs2(e.perHour*.7)]])}<p class="sub">Charging is priced by time, never by an unmeasured kWh figure. Metered billing needs a certified meter (R4).</p></div>
  <div class="card stack"><p class="lbl">Safety declarations</p>${[['electrician','Installed by a licensed electrician'],['elcb','Earth-leakage protection (RCCB/ELCB)'],['dedicated','Dedicated circuit'],['noExt','No extension leads'],['photos','Photos of socket, breaker and wiring']].map(([k,l])=>`<button class="cbx" role="checkbox" aria-checked="${!!s[k]}" data-act="h_evs" data-k="${k}"><span class="box">${s[k]?ic('check',16):''}</span><span>${l}</span></button>`).join('')}
  <p class="sub">Covered spaces without ventilation can't offer charging. Any safety report suspends the charger at once.</p></div>
  ${notice('info','Charging fees on a domestic connection depend on state tariff rules (OD-05). We prefer hosts with a separate EV connection.')}
  <button class="btn primary" data-act="h_evsave" ${Object.values(s).filter(Boolean).length===5?'':'disabled'}>${f.ev?'Save charger':'Add charger'}</button></div>`};

/* ---------- earnings (HST-03, PAY-03, PAY-05, PAY-06, HAC-03) ---------- */
H.earn=()=>{const e=hostEarnings(DB,S.hostId),u=hu();const pays=DB.payouts.filter(p=>p.uid===S.hostId).sort((a,b)=>b.t-a.t);
  const fids=myFacs().map(f=>f.id);const recent=DB.bookings.filter(b=>fids.includes(b.fid)&&['completed','checked_in'].includes(b.state)).sort((a,b)=>b.start-a.start).slice(0,6);
  const wk=[];for(let i=7;i>=0;i--){const a=now()-(i+1)*7*DAY,b=now()-i*7*DAY;wk.push(DB.bookings.filter(x=>fids.includes(x.fid)&&x.state==='completed'&&x.start>=a&&x.start<b).reduce((s,x)=>s+x.q.host,0))}const mx=Math.max(...wk,1);
  return `${topbar(tr('Earnings','ಗಳಿಕೆ'))}<div class="pad">
  <div class="grid" style="grid-template-columns:1fr 1fr">${stat(rs2(e.available),'Available','paid Monday')}${stat(rs2(e.pending),'Pending','24 h dispute window')}</div>
  ${u.payoutHoldUntil&&now()<u.payoutHoldUntil?notice('warn',`Payouts on hold until ${relWhen(u.payoutHoldUntil)} because your bank account changed.`):''}
  <div class="card"><p class="lbl" style="margin-bottom:6px">Last 8 weeks · you receive</p><div class="bars">${wk.map((v,i)=>`<div class="${i===7?'hi':''}" style="height:${v/mx*100}%" title="${rs(v)}"><span>W${i+1}</span></div>`).join('')}</div><p class="sub" style="margin-top:22px">Bars show what you received after PAPHere's 30% fee.</p></div>
  <div class="card"><p class="lbl" style="margin-bottom:6px">Recent bookings</p>${recent.map(b=>`<div class="between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span style="font-size:14px">${relWhen(b.start)}<br><span class="sub">${rs(b.q.gross||b.q.total)} booking · fee ${rs2(b.q.fee)}</span></span><b class="num">${rs2(b.q.host)}</b></div>`).join('')}</div>
  <div class="card"><p class="lbl" style="margin-bottom:6px">Payouts</p>${pays.slice(0,5).map(p=>`<div class="between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span style="font-size:14px">${relWhen(p.t)} · ${esc(p.bank)}<br><span class="sub">${rs2(p.gross)} − TDS ${rs2(p.tds)} (194-O${u.panOk?' at 0.1%':' at 5%, no PAN'})</span></span><b class="num">${rs2(p.net)}</b></div>`).join('')||'<p class="sub">No payouts yet. Minimum payout ₹100; smaller balances carry forward.</p>'}</div>
  <div class="row"><button class="btn ghost" data-act="toast" data-msg="Statement for October downloaded">Monthly statement</button><button class="btn ghost" data-act="toast" data-msg="Form 16A for Q2 FY 2026-27 downloaded">TDS certificate</button></div>
  <div class="card between"><div><b>Daily earnings card</b><div class="sub">An evening note with what your space earned</div></div>${sw('h_daily',F_('h_daily',true),'Daily earnings card')}</div></div>`};

/* ---------- performance & ratings (HST-06, RAT-01, RAT-03, 10.5) ---------- */
H.perf=()=>{const r=reliability(S.hostId);const p=r.parts;const fids=myFacs().map(f=>f.id);
  const toRate=DB.bookings.filter(b=>fids.includes(b.fid)&&b.state==='completed'&&!b.hostRating&&b.start>now()-3*DAY).slice(0,2);
  return `${topbar('Performance')}<div class="pad">
  <div class="card stack" style="text-align:center"><p class="lbl">Reliability score · last 60 days</p><div class="h-xl num" style="font-size:44px">${r.score==null?'New':r.score}</div>${badge(r.label,r.score>=90?'b-sign':r.score>=70?'b-ok':'b-warn')}<p class="sub">${r.score==null?`Shown after 5 completed sessions (${r.n} so far).`:'90+ earns "Highly reliable" and a ranking boost. Below 70 lowers ranking and we call you to help. Below 50 pauses the listing for review.'}</p></div>
  ${p?`<div class="card stack">${[['Arrival success · 50%',p.arrival],['No host cancellations · 25%',1-Math.min(1,p.hc*10)],['Ratings · 15%',p.avg/5],['Responsiveness · 10%',p.resp]].map(([l,v])=>`<div><div class="between"><span>${l}</span><b>${Math.round(v*100)}%</b></div><div class="meter"><span style="width:${v*100}%"></span></div></div>`).join('')}</div>`:''}
  <div class="card stack"><p class="lbl">Tips</p><ul class="steps"><li>Keep the gate unlatched in your window so drivers don't wait.</li><li>Three host cancellations in 30 days pause the listing for review.</li></ul></div>
  ${toRate.map(b=>`<div class="card stack"><b>Rate ${esc(user(b.driver).name.split(' ')[0])} · ${relWhen(b.start)}</b><div class="chips">${['On time','Left on time','Respectful'].map(t=>`<button class="chip" data-act="h_rate" data-id="${b.id}" data-t="${t}">${t}</button>`).join('')}</div></div>`).join('')}
  <p class="sub">Ratings are private in R1. Public reviews (R2) come only from completed stays, double-blind; you can reply once.</p></div>`};

/* ---------- account (ACC-06, HST-05, HST-07, SUP-05, MSG) ---------- */
H.hacct=()=>{const u=hu();return `${topbar('Account')}<div class="pad">
  <div class="card row"><div class="pmark" style="width:44px;height:44px;font-size:24px">${esc(u.name[0])}</div><div class="grow"><b style="font-size:16px">${esc(u.name)}</b><div class="sub">PAN ${u.panOk?'verified':'missing'} · seller onboarded with payment partner</div></div></div>
  <div class="card stack"><p class="lbl">Payout account</p><div class="between"><b>${esc(u.bank?u.bank.label:'—')}</b>${badge('Verified','b-ok')}</div><button class="btn ghost sm" data-act="h_bank">Change bank account</button><p class="sub">Changing it needs a fresh OTP, alerts your old contact and holds payouts for 24 hours.</p></div>
  <div class="card stack"><p class="lbl">Language</p>${chips('$hostLang',[['en','English'],['kn','ಕನ್ನಡ']],S.hostLang)}<p class="sub">The host app is available in Kannada from R1.</p></div>
  <div class="card list" style="padding:0 14px">
    <button class="li" data-go="perf"><span class="ic">${ic('shield')}</span><div class="grow"><b style="font-size:14.5px">Performance</b><div class="sub">Reliability score, ratings and tips</div></div>${ic('chev',18)}</button>
    <button class="li" data-act="h_claim"><span class="ic">${ic('alert')}</span><div class="grow"><b style="font-size:14.5px">Report damage to my property</b><div class="sub">Within 24 h of the session, with photos</div></div>${ic('chev',18)}</button>
    <button class="li" data-act="h_terms"><span class="ic">${ic('shield')}</span><div class="grow"><b style="font-size:14.5px">Host protection terms</b><div class="sub">What's covered and what isn't</div></div>${ic('chev',18)}</button>
    <button class="li" data-act="h_startwiz"><span class="ic">${ic('home')}</span><div class="grow"><b style="font-size:14.5px">List another space</b></div>${ic('chev',18)}</button>
    <button class="li" data-act="h_switch"><span class="ic">${ic('user')}</span><div class="grow"><b style="font-size:14.5px">View as another host</b><div class="sub">Demo: Anand, Lakshmi, Meera, Vikram</div></div>${ic('chev',18)}</button></div></div>`};

/* ---------- actions ---------- */
Object.assign(ACT,{
  h_startwiz:()=>{S.f.h_w=null;W();reset('wiz1')},
  h_wset:(t,d)=>{const w=W();w[d.k]=d.num!==undefined?+d.v:d.k==='commute'?d.v==='1':d.v;render()},
  h_wtog:(t,d)=>{W()[d.k]=!W()[d.k];render()},
  h_wfit:(t,d)=>{const w=W();w.fits=w.fits.includes(d.v)?w.fits.filter(x=>x!==d.v):w.fits.concat(d.v);render()},
  h_wcap:(t,d)=>{const w=W();w.cap=clamp(w.cap+(+d.v),1,10);render()},
  h_wphoto:(t,d)=>{W().photos[d.v]=true;render()},
  h_wupload:()=>{W().uploaded=true;render();toast('Uploaded. Only verification staff can open it.')},
  h_wpenny:()=>{toast('Sending ₹1 to HDFC ••• 2207…');setTimeout(()=>{W().bankOk=true;render()},900)},
  h_wnext:()=>{const n=+cur().s.slice(3);if(n===2)W().addr=F_('h_addr',W().addr);go('wiz'+(n+1))},
  h_wsubmit:()=>{
    const w=W(),u=hu(),id='f'+(++DB.seq);const first=u.name.split(' ')[0];
    const units=Array.from({length:w.cap},(_,i)=>U(id+'u'+(i+1),w.fits.includes('tw')&&w.fits.length===1?'tw':'car',w.fits.reduce((a,s)=>sizeRank(s)>sizeRank(a)?s:a,'tw'),+F_('h_height',2.4),w.covered));
    const f=F(id,S.hostId,`${first}'s ${w.type.toLowerCase()}`,w.type,w.type==='Shop bay'?'commercial':'residential','HAL 2nd Stage',w.addr,40+w.pin.x*2.8,w.pin.y*2.6,
      {status:'in_verification',units,price:{car:{first:w.price,later:Math.round(w.price*.75),cap:w.price*8,month:w.price*75},tw:{first:15,later:10,cap:100,month:800}},windows:[{days:[1,2,3,4,5],from:540,to:w.commute?1260:1080}],
       mode:w.commute?'commute':'fixed',out:false,checkin:'self',attrs:{},rating:null,trips:0,quality:62,flex:true,access:['Gate details are added after the site visit.'],level:'Ground',bay:'Driveway'});
    DB.facilities.push(f);u.roles=Array.from(new Set(u.roles.concat('host')));if(!u.pan){u.pan=w.pan;u.panOk=true}if(!u.bank)u.bank={label:'HDFC Bank ••• 2207',ok:true};
    DB.verif.unshift({id:'VC-'+(++DB.seq),fid:id,host:S.hostId,type:(w.type==='Shop bay'?'Commercial building':'Independent house, '+F_('h_owner','owner')),docs:[w.proof+' (uploaded)','PAN verified · name match 0.97','Bank penny drop · name match'],visit:{when:w.slot,agent:'Suresh K.',done:false},state:'in_verification',submitted:now(),checklist:null,attest:true});
    S.f.h_fac=id;notify(S.hostId,'verification','Listing submitted. Site visit booked for '+when(w.slot)+'.',['push','whatsapp']);reset('vstatus');toast('Submitted. We\'ll confirm the visit by SMS.')},
  h_simpass:()=>{const f=hf();const vc=DB.verif.find(v=>v.fid===f.id);vc.visit.done=true;vc.docsOk=true;vc.state='approved';vc.checklist={photos:true,measure:true,access:true,guard:true,hazards:true};f.status='active';f.verifiedOn=now();f.out=true;f.attrs={covered:dayTxt(now()),stepfree:dayTxt(now())};
    audit('Nandini (verification)','Listing approved',f.id,'in_verification','active','Site visit passed · reason code V-OK');notify(S.hostId,'verification',`${f.name} is live. Share the guard-mode link if you have a guard.`,['push','whatsapp']);reset('today');toast('Your space is live')},
  h_out:()=>{const f=hf();f.out=true;audit(hu().name,'Host presence: out',f.id,'back','out','Manual toggle');render();toast(`Space open until ${tm(hu().commute.back-30)}`)},
  h_back:()=>{const f=hf();f.out=false;audit(hu().name,'Host presence: back',f.id,'out','back','Manual toggle');render();toast('Closed to new bookings. Existing bookings run to their end.')},
  h_autodetect:()=>{const f=hf();f.out=true;S.f.h_undo=now()+2;notify(S.hostId,'auto','Your car left home, so your space opened. Undo within 2 minutes.',['push']);render()},
  h_undo:()=>{const f=hf();const has=DB.bookings.some(b=>b.fid===f.id&&b.state==='confirmed'&&b.created>=now()-2);f.out=false;S.f.h_undo=0;render();toast(has?'Undone. A booking already existed, so it counts as a host cancellation.':'Undone. Space closed.')},
  h_fallback:()=>{const u=hu();if(u.fallbackUsed>=POLICY.fallbackCap){toast('You\'ve used 4 fallback spaces this month. Your return buffer widens automatically.');return}u.fallbackUsed++;notify(S.hostId,'fallback','Free space for you at Green Leaf Pharmacy bay until 9 pm. Pass 551 203.',['push']);toast(`Free fallback space at Green Leaf Pharmacy bay (${u.fallbackUsed} of 4 this month)`)},
  h_accept:(t,d)=>{const b=bk(d.id);transition(b,'confirmed','host','Host accepted');b.pay.status='captured';postBooking(DB,b);notify(b.driver,'confirm',`${hu().name.split(' ')[0]} accepted. Your pass ${b.code} is ready.`,['push','whatsapp']);render();toast('Accepted. Payment captured.')},
  h_decline:(t,d)=>{const b=bk(d.id);transition(b,'declined','host','Host declined');notify(b.driver,'cancel','Your request was declined and the authorisation released.',['push','sms']);render();toast('Declined. Authorisation released.')},
  h_confirm:(t,d)=>{const b=bk(d.id);if(transition(b,'checked_in','host','Host confirmed arrival')){b.checkin={t:now(),method:'host'};render();toast('Arrival confirmed')}},
  h_todriver:()=>setSurface('driver','home'),
  h_reportveh:()=>sheet('Report a vehicle',`<div class="stack"><button class="opt" data-act="h_rep" data-k="pap"><div class="grow"><b>A PAPHere driver is overstaying or blocking</b><div class="sub">Starts the overstay process; support contacts the driver</div></div></button><button class="opt" data-act="h_rep" data-k="out"><div class="grow"><b>A vehicle not on PAPHere</b><div class="sub">We'll point you to the local authority</div></div></button></div><p class="sub">PAPHere never tows or clamps, and the host must not move a vehicle.</p>`),
  h_rep:(t,d)=>{S.sheet=null;if(d.k==='pap'){openCase({cat:'Space problem',sub:'Host reports overstay',pri:'Active booking',by:S.hostId,fid:hf().id});toast('Overstay process started. Support is calling the driver.')}else toast('For vehicles not on PAPHere, call the traffic police on 112 or use their app.')},
  h_block:(t,d)=>{const f=hf(),s=+d.d,e=s+DAY;const hit=DB.bookings.filter(b=>b.fid===f.id&&['confirmed','requested'].includes(b.state)&&b.start<e&&b.end>s);
    if(!hit.length){sheet('Block '+dayTxt(s),`<p class="sub" style="font-size:14.5px">No bookings that day. Drivers won't be able to book it.</p><button class="btn primary" data-act="h_doblock" data-d="${s}">Block ${dayTxt(s)}</button>`);return}
    const b=hit[0],pen=hostPenalty(b);sheet('This day has a booking',`${notice('warn',`${esc(user(b.driver).name.split(' ')[0])} has booked ${win(b.start,b.end)}. Blocking means cancelling it.`)}<div class="card stack">${kv([['Driver gets','Full refund'+(pen.credit?' + '+rs(pen.credit)+' credit':'')+' and alternatives'],['Your fee',pen.fee?rs(pen.fee)+' from payouts':'None'],['Rule',pen.rule]])}</div>
      <div>${chips('h_creason',['Family emergency','Space unusable','Personal use','Other'],F_('h_creason','Personal use'))}</div><p class="sub">Documented emergencies and safety issues waive the fee but still count toward your score. Three host cancellations in 30 days pause the listing.</p><button class="btn danger" data-act="h_hostcancel" data-id="${b.id}" data-d="${s}">Cancel booking and block</button><button class="btn ghost" data-act="closesheet">Keep the booking</button>`)},
  h_doblock:(t,d)=>{hf().blocks.push({start:+d.d,end:+d.d+DAY});S.sheet=null;render();toast('Blocked')},
  h_hostcancel:(t,d)=>{const b=bk(d.id),pen=hostPenalty(b),f=fac(b.fid);if(!transition(b,'cancelled','host','Host cancelled: '+F_('h_creason','Personal use')))return;b.cancelBy='host';refund(b,b.q.total,'Host cancelled');
    if(pen.credit)user(b.driver).credits&&user(b.driver).credits.push({id:'cr'+(++DB.seq),amt:pen.credit,left:pen.credit,reason:'Host cancelled your booking',exp:now()+90*DAY});
    if(pen.fee)post(DB,'Host cancellation fee',b.ref,[['Host payable:'+f.host,pen.fee],['Host penalty income',-pen.fee]]);
    notify(b.driver,'cancel',`Your host cancelled ${win(b.start,b.end)}. Full refund${pen.credit?' plus ₹100 credit':''}. We've found 2 spaces nearby.`,['push','whatsapp','sms']);
    f.blocks.push({start:+d.d,end:+d.d+DAY});const hc=DB.bookings.filter(x=>x.fid===f.id&&x.cancelBy==='host'&&x.events.some(e=>e.to==='cancelled'&&e.t>now()-30*DAY)).length;if(hc>=3){f.status='paused';toast('Third host cancellation in 30 days: listing paused for review')}else{S.sheet=null;render();toast('Cancelled and blocked. Driver refunded'+(pen.fee?`; ${rs(pen.fee)} fee from your payouts`:''))}},
  h_saveprice:()=>{const f=hf(),cls=f.price.car?'car':'tw',p=+F_('h_price',f.price[cls].first),band=POLICY.zoneBand[cls];if(p<band[0]||p>band[1]){toast(`Price must be within ${rs(band[0])}–${rs(band[1])}`);return}
    const before=f.price[cls].first;f.price[cls].first=p;f.price[cls].cap=Math.min(f.price[cls].cap,p*10);audit(hu().name,'Price changed',f.id,rs(before),rs(p),'Host edit within band');toast('Saved. Existing bookings keep their price.')},
  h_sugg:()=>{S.f.h_price=40;render()},
  h_guard:()=>{const f=hf();sheet('Guard mode',`<p class="sub" style="font-size:14.5px">Your guard opens this link and types the PIN. No account or install needed. It works offline with today's list.</p><div class="card stack" style="text-align:center"><b class="mono">paphere.in/g/${f.id}</b><div class="code6" style="font-size:24px">PIN ${f.guardPin||'—'}</div></div><button class="btn primary" data-act="h_rotate">${f.guardPin?'Rotate link and PIN':'Create link and PIN'}</button><button class="btn ghost" data-act="h_openguard">Open guard mode</button>`)},
  h_rotate:()=>{const f=hf();f.guardPin=String(1000+Math.floor(Math.random()*8999));audit(hu().name,'Guard PIN rotated',f.id,'••••','••••','Host action');ACT.h_guard()},
  h_openguard:()=>{S.f.g_fac=hf().id;S.f.g_pin='';setSurface('guard','pin')},
  h_nb:(t,d)=>{const n=hf().neighbour;n[d.k]=!n[d.k];render()},
  h_nbsize:(t,d)=>{hf().neighbour.maxSize=d.v;render()},
  h_set:(t,d)=>{const f=hf();f[d.k]=!f[d.k];render()},
  h_checkin:(t,d)=>{const f=hf();f.checkin=d.v;if(d.v==='guard'&&!f.guardPin)f.guardPin=String(1000+Math.floor(Math.random()*8999));render()},
  h_signage:()=>{const f=hf();if(!DB.signage.find(s=>s.fid===f.id))DB.signage.push({id:'SK-'+(++DB.seq),fid:f.id,t:now(),state:'requested'});render();toast('Signage kit requested. Ops dispatches it within 5 days.')},
  h_material:()=>sheet('Material change',`<p class="sub" style="font-size:14.5px">Changing the location, adding capacity, changing how drivers get in, or new entrance photos sends the listing back to verification. Existing bookings stay valid.</p><button class="btn primary" data-act="h_matgo">Add a second space (capacity 2)</button>`),
  h_matgo:()=>{const f=hf();f.units.push(U(f.id+'u'+(f.units.length+1),'car','hatch',2.2,f.attrs.covered));f.status='in_verification';DB.verif.unshift({id:'VC-'+(++DB.seq),fid:f.id,host:S.hostId,type:'Material edit · capacity increase',docs:['Existing evidence on file'],visit:{when:now()+DAY,agent:'Suresh K.',done:false},state:'in_verification',submitted:now()});S.sheet=null;audit(hu().name,'Material edit',f.id,'capacity '+(f.units.length-1),'capacity '+f.units.length,'Back to verification');reset('vstatus')},
  h_pause:()=>{const f=hf();f.status=f.status==='paused'?'active':'paused';audit(hu().name,f.status==='paused'?'Paused by host':'Resumed by host',f.id);render()},
  h_amen:()=>{hf().amenities=['Helmet locker','Rain cover'];render()},
  h_evs:(t,d)=>{const f=hf();f.ev=f.ev||{conn:['15A socket'],kw:3.3,phase:'Single phase',acdc:'AC',cable:'Bring your own charger',hours:[540,1200],perHour:20,safety:{},status:'draft'};f.ev.safety[d.k]=!f.ev.safety[d.k];render()},
  h_evsave:()=>{const f=hf();f.ev.status='ok';audit(hu().name,'Charger declared',f.id,'—',f.ev.kw+' kW','Safety declarations complete');back();toast('Charger saved. Ops reviews the photos.')},
  h_rate:(t,d)=>{bk(d.id).hostRating={tags:[d.t],score:5};render();toast('Rating saved')},
  h_bank:()=>sheet('Change bank account',`${field('h_newbank','New account number',F_('h_newbank','50100 2231 8890'),{attrs:'class="mono"'})}${field('h_bankotp','OTP sent to +91 98800 •••23',F_('h_bankotp',''),{attrs:'inputmode="numeric" placeholder="123456"'})}<button class="btn primary" data-act="h_bankdo">Verify and change</button>`),
  h_bankdo:()=>{if(F_('h_bankotp','')!=='123456'){toast('Enter the OTP (demo: 123456)');return}const u=hu();const before=u.bank.label;u.bank={label:'HDFC Bank ••• 8890',ok:true,changedAt:now()};u.payoutHoldUntil=now()+24*60;
    notify(S.hostId,'security','Your payout bank account was changed. If this wasn\'t you, call support now. Payouts are held for 24 hours.',['sms','push']);audit(u.name,'Bank account changed',S.hostId,before,u.bank.label,'Fresh OTP · 24 h payout hold');DB.flags.push({id:'FF-'+(++DB.seq),type:'Account takeover check',signal:'Bank change on a known device',target:S.hostId,state:'review',score:30});S.sheet=null;render();toast('Changed. Payouts held for 24 hours.')},
  h_claim:()=>sheet('Report damage',`<p class="sub" style="font-size:14.5px">Covered: physical damage to your property caused by the booked vehicle during the session. Not covered: pre-existing damage, wear and tear, your own negligence, anything outside the booked space.</p><button class="btn ghost" data-tog="h_dmg">${F_('h_dmg',false)?'✓ 3 photos added':'Add photos'}</button><button class="btn primary" data-act="h_claimgo">Submit claim</button>`),
  h_claimgo:()=>{openCase({cat:'Damage claim',sub:'Host property damaged',pri:'General',by:S.hostId,fid:hf().id,evidence:['photo_1.jpg','photo_2.jpg','photo_3.jpg'],respDue:now()+48*60});S.sheet=null;toast('Claim opened. The driver has 48 hours to respond.')},
  h_terms:()=>sheet('Host protection',`<p style="margin:0;font-size:14.5px">Claims within 24 hours of the session ending, with photos. Covered: physical damage to your property caused by the booked vehicle during the session. Excluded: pre-existing damage, wear and tear, your own negligence and anything outside the booked space. Until our insurer partner is signed, a goodwill fund pays with a per-incident cap set by trust and safety.</p>`),
  h_switch:()=>sheet('View as host',`<div class="stack">${['u2','u3','u5','u10','u9'].map(id=>`<button class="opt" data-act="h_as" data-id="${id}"><b class="grow">${esc(user(id).name)}</b><span class="sub">${DB.facilities.filter(f=>f.host===id).map(f=>f.name).join(', ')}</span></button>`).join('')}</div>`),
  h_as:(t,d)=>{S.hostId=d.id;S.f.h_fac=null;S.sheet=null;reset('today')}
});

SURF.host={name:'Host app',who:'Anand · host',kind:'phone',start:'today',screens:H,
  lead:'Earn from a space with nothing to do per booking. Signed in as Anand, whose driveway opens when he drives to work.',
  tabs:[{s:'today',l:'Today',i:'home'},{s:'cal',l:'Calendar',i:'cal'},{s:'listing',l:'Listing',i:'list'},{s:'earn',l:'Earnings',i:'rupee'},{s:'hacct',l:'More',i:'user'}],
  tabOf:{neighbour:'listing',settings:'listing',charger:'listing',perf:'hacct',vstatus:'today'},
  noTabs:['wiz1','wiz2','wiz3','wiz4','wiz5','wiz6'],
  hideTabs:()=>!hf()||hf().status!=='active',
  onPick:(x,y)=>{W().pin={x,y};render()},
  onInput:(k,el)=>{
    if(k==='h_pan'){W().pan=el.value;const ok=/^[A-Z]{5}\d{4}[A-Z]$/.test(el.value.toUpperCase()),m=$('#h_panmsg');if(m){m.textContent=ok?'✓ Format looks right. We match the name on PAN.':'PAN has 10 characters, like ABCPN1234K';m.style.color=ok?'var(--ok)':'var(--bad)'}}
    if(k==='h_addr'){W().addr=el.value}
    if(k==='h_wprice'){W().price=+el.value;$('#h_wp').textContent=rs(W().price)+'/h';$('#h_wr').textContent=rs2(W().price*.7)+'/h'}
    if(k==='h_price'){$('#h_pp').textContent=rs(+el.value)+'/h';$('#h_pr').textContent=rs2(+el.value*.7)+'/h'}},
  ctxExtra:()=>`<div class="trow"><span>Host app in ಕನ್ನಡ</span>${sw('h_lang_t',S.hostLang==='kn','Kannada')}</div>`,
  journeys:[
    {g:'Get listed'},['List a space (6 steps)','8.4',()=>{S.hostId='u2';S.f.h_w=null;setSurface('host','wiz1')}],
    ['Verification status','VER-04',()=>{S.hostId='u11';S.f.h_fac='f7';setSurface('host','vstatus')}],
    {g:'Every day'},['I\'m out / I\'m back','8.11',()=>{S.hostId='u2';S.f.h_fac='f1';setSurface('host','today')}],
    ['Accept a booking request','BKG-08',()=>{S.hostId='u3';S.f.h_fac='f2';setSurface('host','today')}],
    ['Confirm an arrival','HST-01',()=>{S.hostId='u3';S.f.h_fac='f2';const f=fac('f2');if(!DB.bookings.some(b=>b.fid==='f2'&&b.state==='confirmed'&&dayIdx(b.start)===dayIdx(now()))){const s=now()+5;const b=mkBooking(DB,{type:'prebook',fid:'f2',unit:'f2u1',driver:'u6',veh:'v3',start:s,end:s+90,state:'confirmed'});DB.bookings.push(b);postBooking(DB,b)}setSurface('host','today')}],
    ['Automatic availability','HAC-02',()=>{S.hostId='u2';S.f.h_fac='f1';S.f.h_auto=true;fac('f1').out=false;setSurface('host','today')}],
    ['Block a day with a booking','INV-04',()=>{S.hostId='u2';S.f.h_fac='f1';setSurface('host','cal')}],
    {g:'Listing and money'},['Price within band, you receive','HAC-03',()=>{S.hostId='u2';S.f.h_fac='f1';setSurface('host','listing')}],
    ['Charger safety declarations','EVC-07',()=>{S.hostId='u3';S.f.h_fac='f2';setSurface('host','charger')}],
    ['Night window (relay)','PAS-05',()=>{S.hostId='u9';S.f.h_fac='f5';setSurface('host','cal')}],
    ['Earnings, TDS, payouts','PAY-05/06',()=>{S.hostId='u2';setSurface('host','earn')}],
    ['Reliability score','10.5',()=>{S.hostId='u2';setSurface('host','perf')}],
    ['Bank change with 24 h hold','ACC-06',()=>{S.hostId='u2';setSurface('host','hacct')}]
  ]};
// Kannada toggle lives in the panel
const _tog=ACT.h_lang_t;document.addEventListener('click',e=>{const t=e.target.closest('[data-tog="h_lang_t"]');if(t){S.hostLang=S.hostLang==='kn'?'en':'kn';S.f.h_lang_t=S.hostLang==='kn';}},true);
// host language chips use the "$hostLang" key
document.addEventListener('click',e=>{const t=e.target.closest('[data-set="$hostLang"]');if(t){e.stopPropagation();S.hostLang=t.dataset.v;render()}},true);
SURF.host.screens.perf=H.perf;
})();
