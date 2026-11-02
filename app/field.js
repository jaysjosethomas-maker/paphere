'use strict';
/* Field surfaces: guard mode (web app), public-lot attendant app, pay-at-lot web flow, WhatsApp booking. */
(function(){
/* ================= GUARD MODE (ACS-02, ACS-04, WEB-04, VEH-03) ================= */
const G={};
const gf=()=>fac(F_('g_fac','f3'));
const arrivals=()=>DB.bookings.filter(b=>b.fid===gf().id&&dayIdx(b.start)<=dayIdx(now())&&b.end>=dayIdx(now())*DAY&&['confirmed','checked_in','overstaying','completed'].includes(b.state)&&b.type!=='monthly').sort((a,b)=>a.start-b.start);
G.pin=()=>{const f=gf(),p=F_('g_pin','');return `<div class="pad" style="flex:1;justify-content:center;gap:22px">
  ${notice('info','Add guard mode to your home screen to open it like an app. <button class="badge b-sign" data-act="toast" data-msg="Added to home screen">Install</button>')}
  <div style="text-align:center"><div class="pmark" style="margin:0 auto 10px;width:44px;height:44px;font-size:26px">P</div><p class="h-l">Guard mode</p><p class="sub">${esc(f.name)}<br>Enter the 4-digit PIN from the host. Demo PIN: <b class="mono">${f.guardPin||'none set'}</b></p></div>
  <div class="dots">${[0,1,2,3].map(i=>`<i class="${p.length>i?'on':''}"></i>`).join('')}</div>
  ${F_('g_bad',false)?notice('bad','Wrong PIN. Ask the host for the current PIN; it changes when they rotate the link.'):''}
  ${keypad('g_pin',4,'g_pindone')}
  <div class="chips" style="justify-content:center">${DB.facilities.filter(x=>x.guardPin).map(x=>`<button class="chip" aria-pressed="${x.id===f.id}" data-set="g_fac" data-v="${x.id}">${esc(x.name)}</button>`).join('')}</div></div>`};
G.arrivals=()=>{const f=gf(),list=arrivals();return `${topbar('Today · '+esc(f.name),{noBack:true,right:badge(S.offline?'Offline · cached list':'List saved offline','b-ok')})}<div class="pad">
  <div class="row"><button class="btn primary" data-act="g_scan">${ic('qr')} Scan pass</button><button class="btn ghost" data-act="g_enter">${ic('key')} Type code</button></div>
  <div class="card list" style="padding:0 14px">${list.map(b=>`<button class="li" data-go="gverify" data-id="${b.id}"><div class="grow"><b style="font-size:14.5px">${tm(b.start)} – ${tm(b.end)}</b><div class="sub">${esc(user(b.driver).name.split(' ')[0])} · ${stateBadge(b.state)}</div></div>${plate(veh(b.veh).plate)}</button>`).join('')||'<p class="sub" style="padding:14px 0">No arrivals today.</p>'}</div>
  <p class="sub">Check-ins you record offline are queued and synced when the signal returns.</p>
  ${F_('g_queue',0)?notice('warn',`${F_('g_queue')} check-in${F_('g_queue')>1?'s':''} waiting to sync.`):''}
  <button class="btn ghost" data-act="g_lock">Lock</button></div>`};
G.genter=()=>{const c=F_('g_code','');return `${topbar('Type pass code')}<div class="pad" style="gap:20px"><div class="codebox">${[0,1,2,3,4,5].map(i=>`<span>${c[i]||''}</span>`).join('')}</div>${keypad('g_code',6,'g_codedone')}<p class="sub" style="text-align:center">Codes for today: ${arrivals().filter(b=>b.state==='confirmed').map(b=>b.code.replace(' ','')).join(', ')||'none'}</p></div>`};
G.gverify=(p)=>{const b=bk(p.id);if(!b)return `${topbar('Code not found')}<div class="pad">${notice('bad','<b>No booking with that code today.</b> Check the code again, or call PAPHere support.')}<button class="btn primary" data-back>Try again</button></div>`;
  const v=veh(b.veh),mism=b.platePresented&&b.platePresented!==v.plate&&!b.plateOk,inWin=now()>=b.start-30&&now()<=b.end;
  return `${topbar('Check pass')}<div class="pad">
  <div class="card stack" style="text-align:center;gap:12px;${mism||!inWin?'':'background:var(--ok-soft);border-color:transparent'}">
    <span style="align-self:center">${mism?badge('⚠ Plate differs','b-warn'):!inWin?badge(now()<b.start?'Too early':'Window ended','b-warn'):badge('✓ Valid now','b-ok')}</span>
    <div><p class="lbl">Booked plate</p><div style="margin-top:6px">${plate(v.plate,true)}</div></div>
    ${mism?`<div><p class="lbl">Vehicle at the gate</p><div style="margin-top:6px">${plate(b.platePresented,true)}</div></div><p class="sub">Two digits are swapped. The host decides whether to let them in.</p>`:''}
    <div><p class="lbl">Window</p><b style="font-size:20px">${tm(b.start)} – ${tm(b.end)}</b></div><p class="sub">${esc(user(b.driver).name.split(' ')[0])} · code ${b.code} · ${STATE_TXT[b.state]}</p></div>
  ${mism?`<button class="btn warm" data-act="g_askhost" data-id="${b.id}">Ask host to approve</button>`:''}
  ${b.state==='confirmed'?`<button class="btn primary" data-act="g_in" data-id="${b.id}" ${mism?'disabled':''}>Check in</button>`:''}
  ${['checked_in','overstaying'].includes(b.state)?`<button class="btn primary" data-act="g_out" data-id="${b.id}">Check out</button>`:''}
  <button class="btn ghost" data-act="toast" data-msg="Calling PAPHere support on a masked line…">${ic('phone')} Call support</button></div>`};
Object.assign(ACT,{
  g_pindone:()=>{if(F_('g_pin')===gf().guardPin){S.f.g_bad=false;reset('arrivals')}else{S.f.g_bad=true;S.f.g_pin='';render()}},
  g_enter:()=>{S.f.g_code='';go('genter')},
  g_scan:()=>{const b=arrivals().find(x=>x.state==='confirmed');if(!b){toast('No pass waiting to be scanned');return}toast('Pass scanned · signature valid');go('gverify',{id:b.id})},
  g_codedone:()=>{const b=arrivals().find(x=>x.code.replace(' ','')===F_('g_code'));S.stacks.guard.pop();go('gverify',{id:b?b.id:'none'})},
  g_askhost:(t,d)=>{const b=bk(d.id);notify(fac(b.fid).host,'plate',`Guard reports a different plate (${b.platePresented}) for booking ${b.ref}. Approve?`,['push','sms']);toast('Asked the host. Approving for the demo…');setTimeout(()=>{b.plateOk=true;b.events.push({t:now(),to:b.state,actor:'host',note:'Host approved plate mismatch at gate'});render()},1500)},
  g_in:(t,d)=>{const b=bk(d.id);if(transition(b,'checked_in','guard',S.offline?'Guard check-in (queued offline)':'Guard check-in')){b.checkin={t:now(),method:'guard',offline:S.offline};if(S.offline)S.f.g_queue=F_('g_queue',0)+1;reset('arrivals');toast(veh(b.veh).plate+' checked in')}},
  g_out:(t,d)=>{const b=bk(d.id);b.left=true;if(transition(b,'completed','guard','Guard check-out')){b.checkout={t:now(),method:'guard'};reset('arrivals');toast(veh(b.veh).plate+' checked out')}},
  g_lock:()=>{S.f.g_pin='';reset('pin')}
});
SURF.guard={name:'Guard mode',who:'Gate staff · no account',kind:'phone',start:'pin',screens:G,
  lead:'A web link the guard opens with a PIN. No account, no install, works offline for the day\'s list.',
  journeys:[['Unlock with PIN','ACS-02',()=>{S.f.g_pin='';S.f.g_fac='f3';setSurface('guard','pin')}],['Today\'s arrivals','ACS-02',()=>{S.f.g_fac='f3';setSurface('guard','arrivals')}],
    ['Plate mismatch at the gate','8.9',()=>{S.f.g_fac='f3';const b=DB.bookings.find(x=>x.platePresented);setSurface('guard','arrivals');if(b)go('gverify',{id:b.id})}],
    ['Offline check-in, synced later','11.6',()=>{S.offline=true;S.f.g_fac='f3';setSurface('guard','arrivals')}]]};

/* ================= ATTENDANT APP (GOV-04, GOV-05, 8.16) ================= */
const A={};
const lot=()=>fac(F_('a_lot','p1'));
const sh=()=>DB.shifts.find(s=>s.lot===lot().id&&!s.end);
const inLot=()=>DB.tickets.filter(t=>t.lot===lot().id&&t.state==='issued');
A.shift=()=>{const s=sh(),l=lot();const tk=DB.tickets.filter(t=>s&&t.shift===s.id);const cash=tk.filter(t=>t.by==='cash').reduce((a,t)=>a+t.amt,0),dig=tk.filter(t=>t.by==='digital').reduce((a,t)=>a+t.amt,0);
  const cars=inLot().filter(t=>t.cls==='car').length,tws=inLot().filter(t=>t.cls==='tw').length;
  return `<div class="pad" style="background:var(--night);color:#fff"><p class="lbl" style="color:inherit;opacity:.8">${esc(l.authority)} · ${esc(l.operator)}</p><p class="h-l">${esc(l.name)}</p><p style="margin:0;opacity:.85;font-size:13.5px">${s?`Shift started ${tm(s.start)} · ${esc(s.attendant)}`:'No shift open'}</p></div>
  <div class="pad">
    <div class="grid" style="grid-template-columns:1fr 1fr">${stat(cars+' / '+l.capacity.car,'Cars inside')}${stat(tws+' / '+l.capacity.tw,'Two-wheelers inside')}${stat(rs(dig),'Digital this shift')}${stat(rs(cash),'Cash this shift')}</div>
    <button class="btn primary" data-go="aentry">${ic('car')} Record entry</button>
    <p class="lbl">Inside now</p>
    <div class="card list" style="padding:0 14px">${inLot().slice(-8).reverse().map(t=>`<button class="li" data-go="aexit" data-id="${t.id}"><div class="grow"><b class="mono" style="font-size:14px">${esc(t.plate)}</b><div class="sub">${t.cls==='tw'?'Two-wheeler':'Car'} · in since ${tm(t.entry)} · ${dur(now()-t.entry)}</div></div>${badge('Exit','b-night')}</button>`).join('')||'<p class="sub" style="padding:12px 0">No vehicles inside.</p>'}</div>
    <button class="btn ghost" data-go="aclose">Close shift</button>
    <div class="chips">${['p1','p2'].map(id=>`<button class="chip" aria-pressed="${lot().id===id}" data-set="a_lot" data-v="${id}">${esc(fac(id).name)}</button>`).join('')}</div></div>`};
A.aentry=()=>`${topbar('Record entry')}<div class="pad">${field('a_plate','Plate',F_('a_plate','KA 01 MJ 2290'),{attrs:'class="mono" style="text-transform:uppercase"'})}<div><p class="flabel">Vehicle</p>${chips('a_cls',[['car','Car'],['tw','Two-wheeler']],F_('a_cls','car'))}</div>
  <p class="sub">Every vehicle gets a ticket, whether the driver pays digitally or in cash.</p><button class="btn primary" data-act="a_entry">Issue ticket</button></div>`;
A.aexit=(p)=>{const t=DB.tickets.find(x=>x.id===p.id),l=lot();const mins=now()-t.entry,amt=lotTariff(l,t.cls,mins);return `${topbar('Exit · '+esc(t.plate))}<div class="pad">
  <div class="card stack">${kv([['Parked',dur(mins)],['Official tariff',rs(amt)],['PAPHere fee (digital only)','₹1'],['Total if paid digitally',rs(amt+1)]])}</div>
  <div class="card stack" style="text-align:center"><p class="lbl">Driver pays by UPI</p><div class="qrbox"><canvas class="qr" data-seed="${t.entry+7}" aria-label="UPI QR"></canvas></div><button class="btn primary" data-act="a_pay" data-id="${t.id}" data-by="digital">Paid by UPI · ${rs(amt+1)}</button></div>
  <button class="btn ghost" data-act="a_pay" data-id="${t.id}" data-by="cash">Paid in cash · ${rs(amt)}</button>
  <p class="sub">How the ₹1 applies to cash tickets is still being decided (OD-18). For now it isn't charged.</p></div>`};
A.aclose=()=>{const s=sh();if(!s)return `${topbar('Close shift')}<div class="pad">No open shift.<button class="btn primary" data-act="a_open">Open a new shift</button></div>`;
  const tk=DB.tickets.filter(t=>t.shift===s.id);const cashExp=tk.filter(t=>t.by==='cash').reduce((a,t)=>a+t.amt,0),dig=tk.filter(t=>t.by==='digital').reduce((a,t)=>a+t.amt,0);const dec=+F_('a_cash',cashExp-40);
  return `${topbar('Close shift')}<div class="pad"><div class="card stack">${kv([['Tickets recorded',tk.length],['Paid digitally',rs(dig)],['Expected cash',rs(cashExp)],['Still inside',tk.filter(t=>t.state==='issued').length]])}</div>
  ${field('a_cash','Cash you\'re handing over',String(dec),{attrs:'inputmode="numeric"'})}
  ${notice(dec<cashExp?'warn':'ok',`Variance ${rs(dec-cashExp)}. ${dec<cashExp?'The authority sees this in the shift variance report.':'Matches recorded cash tickets.'}`)}
  <button class="btn primary" data-act="a_close">Declare cash and close shift</button></div>`};
Object.assign(ACT,{
  a_entry:()=>{const s=sh();if(!s){toast('Open a shift first');return}const t={id:'T'+(++DB.seq),lot:lot().id,cls:F_('a_cls','car'),plate:String(F_('a_plate','KA 01 MJ 2290')).toUpperCase(),entry:now(),exit:null,amt:0,by:null,state:'issued',shift:s.id};DB.tickets.push(t);
    lot().occ[t.cls]=Math.min(1,(lot().occ[t.cls]||0)+1/lot().capacity[t.cls]);back();toast('Ticket '+t.id+' issued')},
  a_pay:(t,d)=>{const k=DB.tickets.find(x=>x.id===d.id),l=lot();k.exit=now();k.amt=lotTariff(l,k.cls,k.exit-k.entry);k.by=d.by;k.state='paid';l.occ[k.cls]=Math.max(0,(l.occ[k.cls]||0)-1/l.capacity[k.cls]);
    if(d.by==='digital')post(DB,'Public lot ticket',k.id,[['Payment aggregator clearing',k.amt+1],['Authority payable',-k.amt],['Platform fee revenue',-1]]);back();toast(d.by==='digital'?'Paid by UPI. Receipt in the City Corporation\'s name.':'Cash ticket recorded')},
  a_close:()=>{const s=sh();s.end=now();s.declared=+F_('a_cash',0);audit(s.attendant,'Shift closed',s.id,'open','closed','Declared '+rs(s.declared));reset('shift');toast('Shift closed. Variance shared with the authority.')},
  a_open:()=>{DB.shifts.push({id:'SH-'+(++DB.seq),lot:lot().id,attendant:'Manjunath',start:now(),end:null,declared:null});reset('shift')}
});
SURF.attendant={name:'Attendant app',who:'Public lot staff · R2',kind:'phone',start:'shift',screens:A,
  lead:'For attendants at government pay-and-park lots: a ticket for every vehicle, UPI or cash, and a reconciled shift close.',
  journeys:[['Record an entry','GOV-04',()=>setSurface('attendant','aentry')],['Vehicle exits, pays by UPI','GOV-05',()=>{setSurface('attendant','shift')}],['Close shift with cash count','8.16',()=>setSurface('attendant','aclose')]]};

/* ================= PAY AT LOT (GOV-03, GOV-05, GOV-08, 10.18) ================= */
const P={};
const pl=p=>fac((p&&p.lot)||F_('pl_lot','p1'));
P.board=(p)=>{const l=pl(p);return `<div class="pad" style="background:var(--night);color:#fff;gap:6px"><p class="lbl" style="color:inherit;opacity:.8">Scanned QR board · paphere.in/lot/${l.id}</p><p class="h-l">${esc(l.name)}</p><p style="margin:0;opacity:.85;font-size:13.5px">Official public parking · ${esc(l.authority)}</p></div>
  <div class="pad"><p class="sub">No app needed. Enter your plate once; the attendant has recorded your entry.</p>
  ${field('pl_plate','Your vehicle number',F_('pl_plate','KA 05 MN 4821'),{attrs:'class="mono" style="text-transform:uppercase"'})}
  ${field('pl_phone','Mobile for the receipt',F_('pl_phone','98450 12321'),{pre:'+91',attrs:'inputmode="numeric"'})}
  <div><p class="flabel">Vehicle</p>${chips('pl_cls',[['car','Car'],['tw','Two-wheeler']],F_('pl_cls','car'))}</div>
  <button class="btn primary" data-act="pl_find" data-lot="${l.id}">Find my ticket</button>
  <div class="card"><p class="lbl" style="margin-bottom:6px">Official tariff</p>${kv(l.tariff[F_('pl_cls','car')].map(s=>['Up to '+dur(s.upto),rs(s.amt)]))}</div></div>`};
P.ticket=(p)=>{const l=pl(p);const cls=F_('pl_cls','car');let t=DB.tickets.find(x=>x.id===F_('pl_tk'));
  if(!t){t={id:'T'+(++DB.seq),lot:l.id,cls,plate:String(F_('pl_plate','KA 05 MN 4821')).toUpperCase(),entry:now()-72,exit:null,amt:0,by:null,state:'issued',shift:(DB.shifts.find(s=>s.lot===l.id&&!s.end)||{}).id};DB.tickets.push(t);S.f.pl_tk=t.id}
  const mins=now()-t.entry,amt=lotTariff(l,t.cls,mins);
  if(t.state==='paid')return `${topbar('Receipt',{noBack:true})}<div class="pad"><div class="card stack"><p class="lbl">Issued by ${esc(l.authority)}</p><b>${esc(l.name)}</b>${kv([['Ticket',t.id],['Vehicle',esc(t.plate)],['Time',`${tm(t.entry)} – ${tm(t.exit)}`],['Official tariff',rs(t.amt)],['PAPHere fee (separate line)','₹1'],['Total paid',rs(t.amt+1)]])}</div>${notice('ok','The attendant sees "paid" against your plate. Show this if asked.')}<p class="sub">Complaints about lot operations go to the City Corporation within 1 business day.</p></div>`;
  return `${topbar('Your ticket')}<div class="pad"><div class="card stack">${kv([['Ticket',t.id],['Vehicle',plate(t.plate)],['Entered',tm(t.entry)+' (recorded by attendant)'],['Parked',dur(mins)]])}</div>
  <div class="card kv"><div><span>Official tariff · ${dur(mins)}</span><b>${rs(amt)}</b></div><div><span>PAPHere fee</span><b>₹1</b></div><div class="total"><span>Total</span><b>${rs(amt+1)}</b></div></div>
  <p class="sub">One total, shown before you pay. The City Corporation keeps 100% of its tariff.</p>
  <div class="row"><button class="btn primary" data-act="pl_pay" data-by="upi">Pay ${rs(amt+1)} by UPI</button><button class="btn ghost" data-act="pl_pay" data-by="wallet">Wallet</button></div></div>`};
Object.assign(ACT,{
  pl_find:(t,d)=>{const l=fac(d.lot);if(lotState(l,F_('pl_cls','car')).full){sheet('This lot is full',`<p class="sub">Nearby options:</p><div class="stack">${DB.facilities.filter(f=>f.id!==l.id&&f.status==='active'&&meters(f,l)<700).slice(0,3).map(f=>`<div class="card between"><b>${esc(f.name)}</b>${f.kind==='public'?badge('Public lot','b-night'):badge('Neighbourhood space','b-sign')}</div>`).join('')}</div><button class="btn primary" data-act="pl_alt">Open in the driver app</button>`);return}S.f.pl_tk=null;go('ticket',{lot:d.lot})},
  pl_alt:()=>{S.f.d_dest='metro';S.f.d_parknow=true;setSurface('driver','results')},
  pl_pay:(t,d)=>{const k=DB.tickets.find(x=>x.id===F_('pl_tk')),l=fac(k.lot);k.exit=now();k.amt=lotTariff(l,k.cls,k.exit-k.entry);k.by='digital';k.state='paid';
    if(d.by==='wallet'){const w=user('u1').wallet;if(w.bal<k.amt+1){toast('Wallet balance too low');return}w.bal-=k.amt+1}
    post(DB,'Public lot ticket',k.id,[[d.by==='wallet'?'Wallet issuer (driver)':'Payment aggregator clearing',k.amt+1],['Authority payable',-k.amt],['Platform fee revenue',-1]]);notify('u1','lot',`Paid ${rs(k.amt+1)} at ${l.name}. Receipt from ${l.authority}.`,['push','email']);render()}
});
SURF.paylot={name:'Pay at lot (web)',who:'Any driver · no install · R2',kind:'phone',start:'board',screens:P,noOffline:true,
  lead:'What a driver sees after scanning the QR board at a government pay-and-park lot.',
  journeys:[['Scan QR board and pay on exit','GOV-03',()=>{S.f.pl_tk=null;setSurface('paylot','board',{lot:'p1'})}],['Lot full → alternatives','GOV-08',()=>{S.f.pl_tk=null;setSurface('paylot','board',{lot:'p2'})}]]};

/* ================= WHATSAPP BOOKING (UTL-05) ================= */
const WA={};
const log=()=>S.f.wa_log||(S.f.wa_log=[{me:false,t:'Namaskara! I\'m PAPHere on WhatsApp. Send a destination to book parking, or type "pass" to see your current pass.',q:['City Care Hospital','Indiranagar Metro','My pass','ಕನ್ನಡ']}]);
WA.chat=()=>{const L=log();const last=L[L.length-1];return `<div class="top" style="background:var(--wa);color:#fff;border:0"><div class="pmark" style="background:#fff;color:var(--wa)">P</div><h3 style="color:#fff">PAPHere<br><span style="font-size:12px;font-weight:500;opacity:.85">Verified business account</span></h3></div>
  <div class="wa">${L.map(m=>`<div class="bub${m.me?' me':''}">${esc(m.t).replace(/\*(.+?)\*/g,'<b>$1</b>')}<small>${m.at!=null?tm(m.at):tm(now())}${m.me?' ✓✓':''}</small></div>${m.qr?`<div class="bub"><div class="qrbox" style="width:150px;padding:8px"><canvas class="qr" data-seed="${m.qr}" style="width:134px;height:134px"></canvas></div></div>`:''}`).join('')}
  ${last&&!last.me&&last.q?`<div class="waq">${last.q.map(q=>`<button data-act="wa_say" data-t="${esc(q)}">${esc(q)}</button>`).join('')}</div>`:''}</div>`};
Object.assign(ACT,{
  wa_say:(t,d)=>{const L=log(),x=d.t;L.push({me:true,t:x,at:now()});const kn=x==='ಕನ್ನಡ'||F_('wa_kn',false);if(x==='ಕನ್ನಡ')S.f.wa_kn=true;
    const reply=(t,q,extra)=>L.push(Object.assign({me:false,t,q,at:now()},extra||{}));
    if(x==='ಕನ್ನಡ')reply('ಸರಿ! ಇನ್ನು ಮುಂದೆ ಕನ್ನಡದಲ್ಲಿ. ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ?',['City Care Hospital','Indiranagar Metro']);
    else if(x==='City Care Hospital'||x==='Indiranagar Metro'){S.f.wa_dest=x==='City Care Hospital'?'hosp':'metro';reply(kn?'ಯಾವಾಗ ತಲುಪುತ್ತೀರಿ?':'When will you arrive, and for how long?',['Now · 2 h','Today 6:30 pm · 2 h','Tomorrow 10 am · 3 h'])}
    else if(/· \d h$/.test(x)){const [w,h]=x.split(' · ');const hrs=parseInt(h);const s=w==='Now'?Math.ceil(now()/15)*15:w.startsWith('Today')?1110:DAY+600;S.f.wa_s=s;S.f.wa_e=s+hrs*60;
      const R=search({dest:S.f.wa_dest,veh:'v1',start:s,end:s+hrs*60,filters:{},type:'prebook'});S.f.wa_opts=R.results.filter(r=>!r.public).slice(0,3).map(r=>r.f.id);
      reply(R.results.length?`${R.results.filter(r=>!r.public).slice(0,3).map((r,i)=>`${i+1}. *${r.f.name}* · ${r.w} min walk · ${rs(r.q.total)} total`).join('\n')}\n\nReply with a number to book. Your car KA 05 MN 4821 is selected.`:'Nothing free then. Try another time.',S.f.wa_opts.map((_,i)=>'Book '+(i+1)))}
    else if(/^Book \d/.test(x)){const f=fac(S.f.wa_opts[+x.slice(5)-1]);const u=freeUnit(f,veh('v1'),S.f.wa_s,S.f.wa_e);const b=mkBooking(DB,{type:'prebook',fid:f.id,unit:u.id,driver:'u1',veh:'v1',start:S.f.wa_s,end:S.f.wa_e,state:'held',pay:'upi'});b.events=[{t:now(),to:'held',actor:'whatsapp',note:'Hold placed from WhatsApp'}];b.holdExp=now()+7;DB.bookings.push(b);S.f.wa_b=b.id;
      reply(`Holding *${f.name}* until ${tm(now()+7)}.\nTotal *${rs(b.q.total)}*, one price, nothing added later.\n\nPay with this UPI link: upi://pay?pa=paphere@hdfc&am=${b.q.total}`,['I\'ve paid'])}
    else if(x==='I\'ve paid'){const b=bk(S.f.wa_b);transition(b,'pending','driver','UPI link paid');transition(b,'confirmed','system','Payment captured via WhatsApp');postBooking(DB,b);reply(`Booked ✅ *${fac(b.fid).name}*\n${win(b.start,b.end)}\nCode *${b.code}* · KA 05 MN 4821\n\n${fac(b.fid).access.join('\n')}`,['Extend 30 min','My pass','Cancel'],{qr:parseInt(b.code.replace(' ',''))})}
    else if(x==='Extend 30 min'){const b=bk(S.f.wa_b)||DB.bookings.filter(x=>x.driver==='u1'&&x.state==='confirmed').pop();if(!b){reply('You have no booking to extend.',['City Care Hospital']);}else{const r=(fac(b.fid).price[b.cls]||{}).later||30;b.end+=30;b.q.total+=Math.round(r/2);reply(`Extended to ${tm(b.end)} for ${rs(Math.round(r/2))}. Pay: upi://pay?pa=paphere@hdfc&am=${Math.round(r/2)}`,['My pass'])}}
    else if(x==='My pass'){const b=bk(S.f.wa_b)||DB.bookings.filter(x=>x.driver==='u1'&&['confirmed','checked_in'].includes(x.state)&&x.type!=='monthly').pop();reply(b?`*${fac(b.fid).name}* · ${win(b.start,b.end)}\nCode *${b.code}*`:'No active pass. Send a destination to book.',['City Care Hospital'],b?{qr:parseInt(b.code.replace(' ',''))}:{})}
    else if(x==='Cancel'){const b=bk(S.f.wa_b);if(b&&b.state==='confirmed'){const rc=driverRefundCalc(b);transition(b,'cancelled','driver','Cancelled on WhatsApp');refund(b,rc.amt,'Cancelled on WhatsApp');reply(`Cancelled. ${rs(rc.amt)} refund started (${rc.rule}).`,['City Care Hospital'])}}
    render();const w=$('.view');if(w)w.scrollTop=w.scrollHeight}
});
SURF.whatsapp={name:'WhatsApp booking',who:'Driver on WhatsApp · R2',kind:'phone',start:'chat',screens:WA,
  lead:'Book, pay by UPI link, get the pass and extend, all inside WhatsApp, in English or Kannada.',
  journeys:[['Book from a destination','UTL-05',()=>{S.f.wa_log=null;setSurface('whatsapp','chat')}]],after:()=>{const w=$('.view');if(w&&S.surface==='whatsapp')w.scrollTop=w.scrollHeight}};
})();
