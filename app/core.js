'use strict';
/* PAPHere core: data store, booking engine and UI framework shared by every surface.
   Everything runs in the browser; outside services (payments, SMS, maps, KYC) are simulated. */

/* ============ utilities ============ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rs=n=>(n<0?'−':'')+'₹'+Math.abs(Math.round(n)).toLocaleString('en-IN');
const rs2=n=>(n<0?'−':'')+'₹'+Math.abs(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const dur=m=>{m=Math.round(m);const h=Math.floor(m/60),mm=m%60;return (h?h+' h':'')+(h&&mm?' ':'')+(mm||!h?mm+' min':'')};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const DAY=1440;
const DAY0=new Date(2026,9,29); // Thu 29 Oct 2026, the demo's day 0
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dateOf=m=>new Date(DAY0.getTime()+Math.floor(m/DAY)*86400000);
const dayIdx=m=>Math.floor(m/DAY);
const mod=m=>((m%DAY)+DAY)%DAY;
const dow=m=>dateOf(m).getDay();
function tm(m){m=mod(m);let h=Math.floor(m/60);const mi=m%60,ap=h>=12?'pm':'am';h=h%12||12;return h+(mi?':'+String(mi).padStart(2,'0'):'')+' '+ap}
const dayTxt=m=>{const d=dateOf(m);return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`};
const when=m=>`${dayTxt(m)}, ${tm(m)}`; // PRD 11.3: "Sat, 24 Oct, 6:30 pm"
function relDay(m){const d=dayIdx(m)-dayIdx(now());return d===0?'Today':d===1?'Tomorrow':d===-1?'Yesterday':dayTxt(m)}
const relWhen=m=>`${relDay(m)}, ${tm(m)}`;
const win=(a,b)=>`${relWhen(a)} – ${dayIdx(a)===dayIdx(b)?tm(b):relWhen(b)}`;
function rng(seed){let x=seed;return()=>{x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff}}
const pick=(r,a)=>a[Math.floor(r()*a.length)];

/* ============ policy (PRD section 10, snapshotted on each booking) ============ */
const POLICY={ver:'P-2026.10-r1',buffer:15,hold:7,grace:20,fee:.30,rtb:15,horizon:30,horizonMonthly:60,overstayFree:10,overstayMult:2,reaccomCap:300,credit:100,
  tds:.001,tdsNoPan:.05,minPayout:100,disputeH:24,parkNowMax:240,parkNowLapse:20,changeover:30,fallbackCap:4,flexLow:.2,
  zoneBand:{car:[30,60],tw:[8,20],night:[60,120]},lotFee:1,margin:.10,walletKyc:{min:10000,full:200000}};
const ACTIVE=['held','pending','requested','confirmed','checked_in','overstaying'];
const TRANS={held:['pending','expired'],pending:['confirmed','failed','requested'],requested:['confirmed','declined'],
  confirmed:['checked_in','cancelled','no_show'],checked_in:['completed','overstaying'],overstaying:['completed'],
  completed:['disputed'],cancelled:['disputed'],no_show:['disputed'],disputed:['completed','cancelled','no_show'],expired:[],failed:[],declined:[]};
const STATE_TXT={held:'Held',pending:'Payment pending',requested:'Requested',confirmed:'Confirmed',checked_in:'Checked in',overstaying:'Overstaying',completed:'Completed',cancelled:'Cancelled',no_show:'No-show',disputed:'Disputed',expired:'Expired',failed:'Failed',declined:'Declined'};
const STATE_CLS={confirmed:'b-sign',checked_in:'b-ok',completed:'b-mute',cancelled:'b-bad',no_show:'b-warn',overstaying:'b-bad',requested:'b-mari',held:'b-mari',pending:'b-mari',disputed:'b-night',expired:'b-mute',failed:'b-bad',declined:'b-bad'};
const SIZES=['tw','hatch','sedan','suv'], SIZE_TXT={tw:'Two-wheeler',hatch:'Hatchback',sedan:'Sedan',suv:'SUV / MUV'};
const ATTRS={lit:'Well lit',cctv:'CCTV',guard:'Guard',stepfree:'Step-free',covered:'Covered',floodsafe:'Flood-safe',night:'Night access'};

/* ============ seed data ============ */
const SEEDV='paphere-db-v5';
const DEST=[
  {id:'hosp',name:'City Care Hospital',addr:'100 Ft Road, Indiranagar',x:186,y:132},
  {id:'metro',name:'Indiranagar Metro Station',addr:'CMH Road',x:322,y:30},
  {id:'shops',name:'100 Ft Road shops',addr:'HAL 2nd Stage',x:150,y:170},
  {id:'office',name:'Embassy Golf Links',addr:'Off Intermediate Ring Road',x:330,y:236},
  {id:'home',name:'Home',addr:'HAL 2nd Stage',x:52,y:62},
  {id:'palace',name:'Palace Grounds concert',addr:'Sat 31 Oct · event day',x:40,y:236,event:true}
];
function seed(){
  const r=rng(7);
  const db={v:SEEDV,seq:500,now:17*60+30,
    users:[
      {id:'u1',name:'Priya Nair',phone:'98450 12321',email:'',roles:['driver'],lang:'en',verifiedDriver:false,standing:'good',joined:-120*DAY,
        wallet:{on:true,bal:420,kyc:'min',auto:null,frozen:false},credits:[{id:'cr1',amt:50,left:50,reason:'Introductory offer',exp:58*DAY}],referral:'PRIYA50',
        consents:[{p:'Privacy notice',ver:'v1.2',t:-120*DAY,ch:'app',on:true},{p:'Marketing messages',ver:'v1.2',t:-120*DAY,ch:'app',on:false},{p:'Routine suggestions',ver:'v1.2',t:-60*DAY,ch:'app',on:true}],
        devices:[{id:'dv1',name:'Pixel 7 · this phone',last:0,cur:true},{id:'dv2',name:'Chrome on Windows',last:-2*DAY}],
        prefs:{push:true,sms:true,wa:true,email:true,mktPush:false,mktSms:false,mktWa:false,quiet:true},
        saved:[{dest:'office',label:'Office',note:'Mon–Fri · you usually book 9:30 am'},{dest:'hosp',label:'Physio',note:'Tuesdays 6 pm'}],recent:['hosp','shops','metro'],
        alerts:['hosp','home'],findVehicle:{place:'Orion Mall basement B2',note:'Pillar C4 · near lift lobby 3',t:-8*60,sync:false},timer:null},
      {id:'u2',name:'Anand Raghavan',phone:'98800 11223',roles:['driver','host'],lang:'en',pan:'ABCPR1234K',panOk:true,bank:{label:'HDFC Bank ••• 2207',ifsc:'HDFC0001234',ok:true,changedAt:null},payoutHoldUntil:null,dailyCard:true,commute:{leave:525,back:1290},fallbackUsed:1},
      {id:'u3',name:'Lakshmi V.',phone:'99000 22110',roles:['host'],pan:'BXPPV5521L',panOk:true,bank:{label:'SBI ••• 8812',ok:true}},
      {id:'u4',name:'Green Leaf Pharmacy',phone:'80 4110 2200',roles:['host','bizadmin'],pan:'AAGFG2231Q',panOk:true,gstin:'29AAGFG2231Q1Z5',bank:{label:'ICICI ••• 4410',ok:true},org:'o1'},
      {id:'u5',name:'Meera Rao',phone:'99011 77800',roles:['host'],pan:null,panOk:false,bank:{label:'Canara ••• 1203',ok:true}},
      {id:'u6',name:'Rahul S.',phone:'90080 44332',roles:['driver']},
      {id:'u7',name:'Kiran M.',phone:'97400 55221',roles:['driver']},
      {id:'u8',name:'Imran K.',phone:'99860 33445',roles:['driver'],verifiedDriver:true},
      {id:'u9',name:'Sunrise Office Park',phone:'80 4022 1100',roles:['host'],pan:'AAJCS7788M',panOk:true,bank:{label:'Axis ••• 9921',ok:true}},
      {id:'u10',name:'Vikram Kumar',phone:'98451 66770',roles:['host','driver'],pan:'CKMPK4410H',panOk:true,bank:{label:'HDFC ••• 3390',ok:true}},
      {id:'u11',name:'Suresh Babu',phone:'90360 11290',roles:['host'],pan:'DLMPB9921R',panOk:true,bank:{label:'Kotak ••• 7781',ok:true}}
    ],
    vehicles:[
      {id:'v1',uid:'u1',type:'car',size:'hatch',plate:'KA 05 MN 4821',nick:'Hyundai i20',height:1.5,ev:null},
      {id:'v2',uid:'u1',type:'tw',size:'tw',plate:'KA 03 HX 1190',nick:'Ather 450X',height:1.2,ev:{conn:['LECCS'],kw:1.3,portable:true}},
      {id:'v3',uid:'u6',type:'car',size:'sedan',plate:'KA 01 AB 7720',nick:'Honda City'},
      {id:'v4',uid:'u7',type:'car',size:'hatch',plate:'KA 51 Z 3304',nick:'Swift'},
      {id:'v5',uid:'u8',type:'car',size:'suv',plate:'KA 02 MC 9981',nick:'XUV700'},
      {id:'v6',uid:'u10',type:'car',size:'sedan',plate:'KA 04 PK 2210',nick:'Verna'}
    ],
    facilities:[
      F('f1','u2',"Anand's driveway",'Driveway','residential','HAL 2nd Stage','No. 418, 12th Main, HAL 2nd Stage',118,92,
        {units:[U('f1u1','car','suv',2.4,true)],price:{car:{first:40,later:30,cap:300,month:3000},tw:{first:15,later:10,cap:100,month:800}},
         windows:[{days:[1,2,3,4,5],from:525,to:1260}],mode:'commute',out:true,checkin:'self',guardPin:null,
         access:['Black sliding gate, second house after the Ganesha temple.','Gate is left unlatched in your window.','Park nose-in on the left of the driveway.'],level:'Ground',bay:'Left half of driveway',
         attrs:{lit:'12 Aug 2026',covered:'12 Aug 2026',stepfree:'12 Aug 2026'},rating:4.9,trips:212,quality:84,flex:true,rtb:false,
         neighbour:{quiet:true,maxSize:'suv',verifiedOnly:false,twOnly:false}}),
      F('f2','u3',"Lakshmi's garage + charger",'Garage','residential','Indiranagar','No. 22, Double Road, Indiranagar',262,70,
        {units:[U('f2u1','car','sedan',2.2,true)],price:{car:{first:55,later:45,cap:400,month:3800}},windows:[{days:[0,1,2,3,4,5,6],from:540,to:1260}],
         checkin:'host',access:['Grey roller shutter beside the bakery.','Ring Lakshmi from the app on arrival.','Charger cable hangs on the right wall.'],level:'Ground',bay:'Garage, single bay',
         attrs:{lit:'3 Sep 2026',covered:'3 Sep 2026',cctv:'3 Sep 2026'},rating:4.7,trips:88,quality:76,rtb:true,flex:true,
         ev:{conn:['Type 2','15A socket'],kw:7.4,phase:'Single phase',acdc:'AC',cable:'Tethered Type 2 cable',hours:[600,1200],perHour:30,safety:{electrician:true,elcb:true,dedicated:true,noExt:true,photos:true},status:'ok'}}),
      F('f3','u4','Green Leaf Pharmacy bay','Shop bay','commercial','100 Ft Road','Green Leaf Pharmacy, 640 100 Ft Road',200,188,
        {units:[U('f3c1','car','suv',2.4,false),U('f3c2','car','suv',2.4,false),U('f3c3','car','sedan',2.4,false),U('f3c4','car','sedan',2.4,false,true),U('f3c5','car','sedan',2.4,false),U('f3c6','car','hatch',2.4,false),
                U('f3t1','tw','tw',2.4,true),U('f3t2','tw','tw',2.4,true),U('f3t3','tw','tw',2.4,true),U('f3t4','tw','tw',2.4,true),U('f3t5','tw','tw',2.4,true),U('f3t6','tw','tw',2.4,true)],
         pool:true,margin:.10,price:{car:{first:50,later:40,cap:350,month:3200},tw:{first:20,later:12,cap:120,month:900}},windows:[{days:[0,1,2,3,4,5,6],from:0,to:1440}],
         checkin:'guard',guardPin:'2468',guardName:'Ramesh',access:['Turn in at the green pharmacy sign.','Show your pass to Ramesh at the barrier.','Cars park in bays C1–C4; two-wheelers under the canopy.'],level:'Ground',bay:'C1–C4 · 2W canopy',
         attrs:{lit:'20 Jul 2026',cctv:'20 Jul 2026',guard:'20 Jul 2026',night:'22 Jul 2026',stepfree:'20 Jul 2026'},rating:4.8,trips:340,quality:91,flex:true,
         amenities:['Helmet lockers','Rain covers'],org:'o1'}),
      F('f4','u5','Covered 2W bay, Rao house','Two-wheeler bay','residential','HAL 2nd Stage','No. 7, 7th Cross, HAL 2nd Stage',70,178,
        {units:[U('f4t1','tw','tw',2.2,true),U('f4t2','tw','tw',2.2,true)],price:{tw:{first:12,later:8,cap:80,month:800}},windows:[{days:[0,1,2,3,4,5,6],from:420,to:1320}],
         checkin:'self',access:['Blue gate with the PAPHere bay marker.','Two-wheeler bay is under the stairs, left side.'],level:'Ground',bay:'Under stairs',
         attrs:{covered:'2 Aug 2026',lit:'2 Aug 2026',floodsafe:'2 Aug 2026'},rating:5.0,trips:61,quality:88,flex:true,amenities:['Helmet locker','Rain cover'],
         ev:{conn:['15A socket','LECCS'],kw:1.5,phase:'Single phase',acdc:'AC',cable:'Bring your own charger',hours:[420,1320],perHour:10,safety:{electrician:true,elcb:true,dedicated:true,noExt:true,photos:true},status:'ok'}}),
      F('f5','u9','Sunrise Office Park','Office bay','commercial','HAL 2nd Stage','Sunrise Office Park, 3rd Main',96,40,
        {units:Array.from({length:8},(_,i)=>U('f5c'+(i+1),'car','suv',2.3,true)),pool:true,margin:.10,price:{car:{first:45,later:35,cap:300,month:3000}},
         windows:[{days:[0,6],from:480,to:1200}],relay:{night:{from:1200,to:480,nightly:90,month:2000,access:'Guard on duty all night'},day:null},
         checkin:'guard',guardPin:'1357',guardName:'Shivu',access:['Gate 2 on 3rd Main.','Night guard checks your pass.','Basement B1, bays 1–8.'],level:'B1',bay:'Bays 1–8',
         attrs:{lit:'5 Sep 2026',cctv:'5 Sep 2026',guard:'5 Sep 2026',night:'6 Sep 2026',covered:'5 Sep 2026'},rating:4.6,trips:150,quality:80,flex:true}),
      F('f6','u10',"Vikram's allotted space",'Apartment allotted space','residential','Prestige Lakeview','Prestige Lakeview, Tower B',30,110,
        {units:[U('f6u1','car','sedan',2.1,true)],price:{car:{first:35,later:25,cap:250,month:2600}},windows:[{days:[1,2,3,4,5],from:540,to:1110}],relay:{day:{from:540,to:1110}},assoc:'a1',
         checkin:'guard',guardPin:'8642',guardName:'Society gate',access:['Main gate on Lake Road; give your pass to security.','Tower B basement, space B-14.'],level:'B1',bay:'B-14',
         attrs:{covered:'1 Oct 2026',cctv:'1 Oct 2026',guard:'1 Oct 2026'},rating:4.8,trips:34,quality:78,flex:true}),
      F('p1','gov','Pay & Park, CMH Road','Official public lot','public','City Corporation','CMH Road lot, near Metro pillar 64',300,200,
        {capacity:{car:60,tw:80},occ:{car:.62,tw:.48},tariff:{car:[{upto:120,amt:20},{upto:240,amt:40},{upto:1440,amt:80}],tw:[{upto:120,amt:10},{upto:240,amt:20},{upto:1440,amt:40}]},
         windows:[{days:[0,1,2,3,4,5,6],from:360,to:1380}],authority:'City Corporation',operator:'Departmental',reserved:4,attrs:{lit:'2 Oct 2026',guard:'2 Oct 2026'}}),
      F('p2','gov','Pay & Park, Metro Station','Official public lot','public','City Corporation','Indiranagar Metro forecourt',330,60,
        {capacity:{car:40,tw:120},occ:{car:1,tw:.9},tariff:{car:[{upto:120,amt:20},{upto:240,amt:40},{upto:1440,amt:80}],tw:[{upto:120,amt:10},{upto:240,amt:20},{upto:1440,amt:40}]},
         windows:[{days:[0,1,2,3,4,5,6],from:360,to:1380}],authority:'City Corporation',operator:'Contractor · Sri Balaji Parking',reserved:0,attrs:{lit:'2 Oct 2026'}})
    ],
    bookings:[],journal:[],payouts:[],cases:[],notifications:[],audit:[],verif:[],flags:[],tickets:[],shifts:[],civic:[],messages:[],
    passes:[],flex:[],reviews:[],ratings:[],signage:[],unmet:[],promos:[],referrals:[],policies:[],flags2:[],broadcasts:[],invoices:[],chargebacks:[],
    orgs:[{id:'o1',name:'Green Leaf Pharmacy',type:'business',sites:['f3'],staff:[{name:'Farhan (site manager)',role:'Site manager',sites:['f3']},{name:'Ramesh (attendant)',role:'Attendant',sites:['f3']}],apiKey:'pk_live_••••3f2a'},
          {id:'o2',name:'SwiftCabs',type:'fleet',vehicles:[{plate:'KA 53 C 1101',limit:3000,spent:1240},{plate:'KA 53 C 1102',limit:3000,spent:2810},{plate:'KA 53 C 1145',limit:2500,spent:610}],drivers:[{name:'Manju',phone:'98••• ••120',status:'Active'},{name:'Ravi',phone:'97••• ••331',status:'Active'},{name:'Salim',phone:'99••• ••870',status:'Invited'}],locations:['City Care Hospital','Indiranagar Metro Station'],credit:'30 days'},
          {id:'o3',name:'Embassy Tech',type:'corporate',budget:150000,used:96400,employees:84}],
    partners:[{id:'pt1',name:'City Care Hospital',type:'Hospital',dest:'hosp',links:[{id:'L-CCH-01',label:'Appointment SMS',clicks:1840,bookings:212},{id:'L-CCH-02',label:'Front desk QR',clicks:410,bookings:61}],widget:true,api:false,paid:{on:false,share:0}},
              {id:'pt2',name:'Palace Grounds Events',type:'Event organiser',dest:'palace',links:[{id:'L-PGE-01',label:'Ticket confirmation',clicks:620,bookings:88}],widget:true,api:true,paid:{on:false}},
              {id:'pt3',name:'Embassy Tech',type:'Employer',dest:'office',links:[{id:'L-EMB-01',label:'Commute benefit page',clicks:300,bookings:140}],widget:false,api:false,paid:{on:true,share:100}}],
    assocs:[{id:'a1',name:'Prestige Lakeview Residents Association',state:'active',consent:{date:-40*DAY,hours:'Weekdays 9 am – 6:30 pm',signed:'Secretary, R. Menon',doc:'consent_letter_2026.pdf'},share:.05,spaces:['f6'],payee:{label:'Canara ••• 5521',kyc:true}}],
    authority:{name:'City Corporation',mfa:true,officers:[{name:'K. Shetty',role:'Parking superintendent',zone:'East'},{name:'A. Pasha',role:'Revenue officer',zone:'East'}],baseline:{collPerBay:62,digital:.08,coverage:.81},
      polygons:['Indiranagar ward 80','HAL 2nd Stage ward 81'],tariffPending:null,settleAcct:'City Corporation Parking Revenue · SBI ••• 0042'},
    alertsFeed:[{id:'al1',type:'Waterlogging',zone:'100 Ft Road underpass',text:'Heavy rain expected after 7 pm. Basement spaces near the underpass may close.',t:-30},{id:'al2',type:'Event',zone:'Palace Grounds',text:'Concert on Sat 31 Oct: road closures from 4 pm. Event pricing applies nearby.',t:-200}],
    clockLog:[]
  };
  // policy versions (ADM-06)
  db.policies=[{ver:'P-2026.10-r1',state:'active',by:'Deepa (admin)',approver:'Arjun (finance)',t:-12*DAY,changes:'R1 starting values from PRD section 10'},
               {ver:'P-2026.11-r2',state:'pending',by:'Deepa (admin)',approver:null,t:-60,changes:'Raise re-accommodation credit from ₹100 to ₹150 (OD-09)'}];
  db.promos=[{code:'WELCOME50',rule:'New users · first booking',amt:50,uses:812,cap:2000,budget:100000,spent:40600,active:true},
             {code:'HOSP20',rule:'City Care Hospital zone · weekdays',amt:20,uses:240,cap:1000,budget:20000,spent:4800,active:true}];
  db.referrals=[{from:'u1',to:'Kavya',state:'credited',amt:50},{from:'u1',to:'Rohit',state:'pending · first booking not done',amt:50}];
  db.flags2=[{key:'arrival_mode_v2',state:'5%',metric:'Support contacts / 100'},{key:'flex_offer_after_4th',state:'A/B 50/50',metric:'Flex purchase rate',guard:'Dark-pattern review passed'}];
  // historical bookings for 56 days (feeds earnings, reliability, dashboards)
  const drivers=['u6','u7','u8','u10'], vehOf={u6:'v3',u7:'v4',u8:'v5',u10:'v6'};
  const hist=[['f1',1.3],['f2',.8],['f3',4],['f4',1],['f5',1.5],['f6',.7]];
  for(let d=-56;d<0;d++){
    hist.forEach(([fid,rate])=>{
      const f=db.facilities.find(x=>x.id===fid);
      let n=Math.floor(rate+r()); if(dow(d*DAY)===0&&fid!=='f5')n=Math.max(0,n-1);
      for(let i=0;i<n;i++){
        const u=f.units[Math.floor(r()*f.units.length)];
        const isTw=u.cls==='tw';
        const st=d*DAY+(isTw?480:540)+Math.floor(r()*16)*30, len=(isTw?240:90)+Math.floor(r()*8)*30;
        if(db.bookings.some(x=>x.unit===u.id&&x.start<st+len+15&&st<x.end+15))continue;
        const drv=isTw?'u1':pick(r,drivers);
        const b=mkBooking(db,{type:'prebook',fid,unit:u.id,driver:drv,veh:isTw?'v2':vehOf[drv],start:st,end:st+len,state:'completed',t:st-600});
        const x=r();
        if(x<.025){b.state='cancelled';b.cancelBy='host';b.events.push({t:st-200,to:'cancelled',actor:'host',note:'Host cancelled: family emergency'})}
        else if(x<.05){b.state='no_show';b.events.push({t:st+20,to:'no_show',actor:'system',note:'No check-in by start + 20 min'})}
        else { b.checkin={t:st+Math.floor(r()*15),method:f.checkin};b.checkout={t:st+len-Math.floor(r()*10),method:'auto'};
          const rate=4+(r()<.8?1:0)-(r()<.05?1:0); b.rating={driver:rate,tags:['Easy to find','As described']}; if(r()<.04)b.problem={cat:'occupied',cause:pick(r,['host','other driver','outside party'])};
          if(r()<.06)b.supportCase=true; }
        db.bookings.push(b);postBooking(db,b);
      }
    });
  }
  // today's live bookings
  const T=db.now;
  const add=o=>{const b=mkBooking(db,o);db.bookings.push(b);postBooking(db,b);return b};
  add({type:'prebook',fid:'f1',unit:'f1u1',driver:'u6',veh:'v3',start:570,end:810,state:'completed',t:-DAY,checkin:{t:575,method:'self'},checkout:{t:805,method:'driver'}});
  add({type:'prebook',fid:'f1',unit:'f1u1',driver:'u7',veh:'v4',start:840,end:1065,state:'checked_in',t:-600,checkin:{t:842,method:'self'}});
  add({type:'prebook',fid:'f3',unit:'f3c1',driver:'u6',veh:'v3',start:960,end:1140,state:'checked_in',t:-300,checkin:{t:962,method:'guard'}});
  add({type:'prebook',fid:'f3',unit:'f3c2',driver:'u8',veh:'v5',start:1110,end:1230,state:'confirmed',t:-200,platePresented:'KA 02 MC 9918'});
  add({type:'prebook',fid:'f3',unit:'f3c3',driver:'u10',veh:'v6',start:1140,end:1260,state:'confirmed',t:-100});
  add({type:'prebook',fid:'f2',unit:'f2u1',driver:'u8',veh:'v5',start:DAY+660,end:DAY+780,state:'requested',t:T-6,rtbAt:T-6});
  add({type:'prebook',fid:'f1',unit:'f1u1',driver:'u10',veh:'v6',start:DAY+540,end:DAY+780,state:'confirmed',t:-50});
  // Priya's passes
  const mp=add({type:'monthly',fid:'f4',unit:'f4t1',driver:'u1',veh:'v2',start:-26*DAY,end:4*DAY,state:'checked_in',t:-26*DAY,band:'Weekdays 8 am – 7 pm',renew:3*DAY,mandate:'UPI autopay · priya@okbank',second:null,pausedDays:0});
  mp.checkin={t:-26*DAY+480,method:'self'};
  db.flex.push({id:'fx1',uid:'u1',plan:'Car 40 h',cls:'car',hours:40*60,price:1400,left:28*60+15,rolled:4*60+30,rollExp:2*DAY,renew:3*DAY,state:'active',mandate:'UPI autopay'});
  // verification queue (ADM-01)
  db.facilities.push(F('f7','u11',"Suresh's garage",'Garage','residential','Indiranagar','No. 31, 9th Cross, Indiranagar',150,30,{status:'in_verification',units:[U('f7u1','car','sedan',2.1,true)],price:{car:{first:45,later:35,cap:300,month:3000}},windows:[{days:[1,2,3,4,5],from:540,to:1140}],rating:null,trips:0,quality:66}));
  db.verif=[{id:'VC-1041',fid:'f7',host:'u11',type:'Independent house, owner',docs:['Property tax receipt 2025 (name match 0.94)','PAN verified','Bank penny drop · name match'],visit:{when:DAY+600,agent:'Suresh K.',done:false},state:'in_verification',submitted:-DAY*1.2,checklist:null},
            {id:'VC-1038',fid:'f5',host:'u9',type:'Commercial building · night access re-verification',docs:['Letter of authority on letterhead','GSTIN 29AAJCS7788M1Z2'],visit:{when:-DAY,agent:'Nandini',done:true,night:true},state:'decision_due',submitted:-DAY*2.5,checklist:{photos:true,measure:true,access:true,guard:true,hazards:true}}];
  db.cases=[
    {id:'C-2291',cat:'Space problem',sub:'Space occupied',pri:'Active booking',by:'u7',booking:null,fid:'f1',state:'resolved',owner:'Asha (support)',opened:-3*DAY,first:2,resolution:'Re-accommodated to Green Leaf bay',csat:5,cause:'other driver'},
    {id:'C-2302',cat:'Payments',sub:'Refund not received',pri:'Payments',by:'u6',state:'open',owner:null,opened:-150,first:null},
    {id:'C-2304',cat:'Damage claim',sub:'Gate scraped while reversing',pri:'General',by:'u2',fid:'f1',state:'waiting',owner:'Nisha (T&S)',opened:-20*60,first:35,evidence:['gate_photo_1.jpg','gate_photo_2.jpg'],respDue:28*60},
    {id:'C-2307',cat:'Grievance',sub:'Charged after cancelling',pri:'General',by:'u8',state:'open',owner:null,opened:-30*60,first:null,grievance:true}];
  db.flags=[{id:'FF-77',type:'Promo abuse',signal:'3 new accounts on one device used WELCOME50',target:'Device a91f…',state:'open',score:82},
            {id:'FF-79',type:'Off-platform contact',signal:'Phone number typed in 2 messages (blocked by filter)',target:'u7 ↔ u2',state:'open',score:55},
            {id:'FF-80',type:'Overstay pattern',signal:'2 overstays affecting another driver in 30 days',target:'u8',state:'review',score:70}];
  db.chargebacks=[{id:'CB-12',booking:null,amt:180,reason:'Service not received',state:'evidence pack sent',hostFault:false}];
  db.audit=[{t:-2*DAY,actor:'Deepa (admin)',action:'Policy proposed',target:'P-2026.11-r2',before:'credit ₹100',after:'credit ₹150',reason:'OD-09 test'},
            {t:-DAY,actor:'Asha (support)',action:'Refund issued',target:'C-2291',before:'—',after:'₹100 credit',reason:'Space occupied, re-accommodated'}];
  // public lot tickets for today and attendant shift (GOV-04)
  for(let i=0;i<46;i++){const cls=r()<.55?'tw':'car';const st=420+Math.floor(r()*560);const ln=30+Math.floor(r()*200);const lot=r()<.7?'p1':'p2';const paidBy=r()<.64?'digital':'cash';
    const amt=lotTariff(db.facilities.find(f=>f.id===lot),cls,ln);db.tickets.push({id:'T'+(9000+i),lot,cls,plate:'KA '+String(1+Math.floor(r()*53)).padStart(2,'0')+' '+pick(r,['A','B','C','M','N','P'])+' '+(1000+Math.floor(r()*8999)),entry:st,exit:st+ln<T?st+ln:null,amt,by:st+ln<T?paidBy:null,state:st+ln<T?'paid':'issued',shift:lot==='p1'?'SH-p1-1':'SH-p2-1'})}
  db.shifts=[{id:'SH-p1-1',lot:'p1',attendant:'Manjunath',start:420,end:null,declared:null},{id:'SH-p2-1',lot:'p2',attendant:'Sri Balaji staff · Venkat',start:420,end:null,declared:null}];
  db.civic=[{id:'CR-301',cat:'Footpath parking',where:'100 Ft Road near Domino\'s',t:-130,state:'forwarded',blurred:true,acc:'±6 m',plate:'KA 01 •• 4410',dup:false},
            {id:'CR-302',cat:'Blocking a gate',where:'12th Main, HAL 2nd Stage',t:-90,state:'pre_screened',blurred:true,acc:'±9 m',plate:'KA 05 •• 1180',dup:false},
            {id:'CR-303',cat:'Footpath parking',where:'100 Ft Road near Domino\'s',t:-110,state:'rejected',reason:'Duplicate of CR-301 (same plate, 30 min)',blurred:true,acc:'±5 m',plate:'KA 01 •• 4410',dup:true}];
  db.notifications=[];
  notifyDb(db,'u1','renewal','Monthly pass renews Sun, 1 Nov: ₹800 by UPI autopay. Pause or cancel any time.',['push','sms'],-2*DAY);
  notifyDb(db,'u2','payout','Payout ₹1,912.40 sent to HDFC ••• 2207. Statement attached.',['push','email'],-3*DAY);
  notifyDb(db,'u2','rtb_none','',[],0);db.notifications.pop();
  // weekly payouts history
  runPayouts(db,true);
  return db;
}
function U(id,cls,size,height,covered,accessible){return {id,cls,size,height,covered:!!covered,accessible:!!accessible}}
function F(id,host,name,type,kind,area,addr,x,y,o){
  return Object.assign({id,host,name,type,kind,area,addr,x,y,status:'active',verifiedOn:-90*DAY,units:[],price:{},windows:[],blocks:[],mode:'fixed',out:true,checkin:'self',
    access:[],attrs:{},amenities:[],ev:null,relay:null,rating:4.7,trips:0,quality:75,flex:false,rtb:false,instant:true,autoCheckout:true,neighbour:{quiet:true,maxSize:'suv',verifiedOnly:false,twOnly:false},
    photos:['Street','Entrance','Space','Exit'],rules:'Park only the registered vehicle, only in the booked space.',guardPin:null},o||{});
}
function mkBooking(db,o){
  const f=db.facilities.find(x=>x.id===o.fid), v=db.vehicles.find(x=>x.id===o.veh);
  const cls=v?(v.type==='tw'?'tw':'car'):'car';
  const q=o.q||quoteFor(f,cls,o.start,o.end,{type:o.type,db});
  const id='B'+(++db.seq);
  return Object.assign({id,ref:'PH-'+(24000+db.seq),type:o.type,fid:o.fid,unit:o.unit,driver:o.driver,veh:o.veh,cls,start:o.start,end:o.end,state:o.state||'confirmed',
    q,policy:POLICY.ver,code:String(100000+Math.floor((db.seq*7919)%899999)).replace(/(\d{3})(\d{3})/,'$1 $2'),created:o.t??db.now,idem:'idk_'+(db.seq*2654435761>>>0).toString(16),
    pay:{method:o.pay||'upi',status:'captured'},events:[{t:o.t??db.now,to:'confirmed',actor:'system',note:'Booking confirmed'}],checkin:o.checkin||null,checkout:o.checkout||null,ext:0},o.extra||{},
    ['band','renew','mandate','second','pausedDays','platePresented','rtbAt','forName','forPhone','partner','recurringOf','flexMins'].reduce((a,k)=>(o[k]!==undefined&&(a[k]=o[k]),a),{}));
}

/* ============ pricing (PRC-01..05, 10.9) ============ */
function lotTariff(f,cls,mins){const slabs=f.tariff[cls]||f.tariff.car;for(const s of slabs)if(mins<=s.upto)return s.amt;return slabs[slabs.length-1].amt*Math.ceil(mins/1440)}
function parkPrice(f,cls,mins){
  const r=(f.price[cls]||f.price.car);if(!r)return null;
  const q=Math.ceil(mins/15)*15, days=Math.floor(q/DAY), rem=q%DAY;
  let p=days*r.cap;
  if(rem>0)p+=Math.min(r.cap,r.first+Math.max(0,rem-60)/60*r.later);
  return Math.round(p);
}
function quoteFor(f,cls,start,end,o){
  o=o||{};const mins=end-start,lines=[];
  if(f.kind==='public'){const t=lotTariff(f,cls,mins);return {lines:[{l:`Official tariff · ${dur(mins)}`,a:t},{l:'PAPHere fee',a:POLICY.lotFee}],total:t+POLICY.lotFee,host:t,fee:POLICY.lotFee,policy:POLICY.ver,official:true}}
  if(o.type==='monthly'){const m=(f.price[cls]||f.price.car).month;return {lines:[{l:'Monthly pass · first month',a:m}],total:m,host:Math.round(m*.7*100)/100,fee:Math.round(m*.3*100)/100,policy:POLICY.ver}}
  if(o.type==='night'){const m=f.relay.night.month;return {lines:[{l:'Night pass · first month',a:m}],total:m,host:m*.7,fee:m*.3,policy:POLICY.ver}}
  const r=f.price[cls]||f.price.car;let park=parkPrice(f,cls,mins);
  const ev=o.charge&&f.ev?Math.round(f.ev.perHour*Math.ceil(mins/60)):0;
  lines.push({l:`Parking · ${dur(mins)}`,a:park,d:`${rs(r.first)} first hour${mins>60?`, then ${rs(r.later)}/h`:''}${park>=r.cap?` · daily cap ${rs(r.cap)}`:''}`});
  if(o.event){const add=Math.round(park*.25);lines.push({l:'Event-day price (published band)',a:add});park+=add}
  if(ev)lines.push({l:'Charging · time connected',a:ev,d:'Price is for time connected, not energy delivered'});
  let total=park+ev;
  if(o.flexMins){lines.length=0;lines.push({l:`Flex Pass · ${dur(o.flexMins)}`,a:0,d:'Hours deducted on actual time, rounded up to 15 min'});if(ev)lines.push({l:'Charging · time connected',a:ev});total=ev}
  let disc=0;
  if(o.promo&&total>0){const p=(o.db||DB).promos.find(x=>x.code===o.promo&&x.active);if(p){const a=Math.min(p.amt,total);lines.push({l:`Promo ${p.code}`,a:-a,promo:true});disc+=a}}
  if(o.credits&&total-disc>0){const a=Math.min(o.credits,total-disc);lines.push({l:'PAPHere credit',a:-a,promo:true});disc+=a}
  const hostBase=o.flexMins?parkPrice(f,cls,Math.ceil(mins/15)*15)+ev:park+ev;
  return {lines,total:total-disc,gross:total,disc,host:Math.round(hostBase*.7*100)/100,fee:Math.round(hostBase*.3*100)/100,policy:POLICY.ver,taxNote:'Includes GST where applicable'};
}

/* ============ ledger (PAY-04, 12.2: every entry sums to zero, paise integers) ============ */
function post(db,memo,ref,lines,t){
  const L=lines.map(([acct,amt])=>({acct,p:Math.round(amt*100)}));
  const sum=L.reduce((a,b)=>a+b.p,0);if(sum!==0)L.push({acct:'Rounding',p:-sum});
  db.journal.push({id:'J'+(db.journal.length+1),t:t??db.now,memo,ref,lines:L});
}
function postBooking(db,b){
  if(['cancelled','no_show'].includes(b.state)&&b.cancelBy==='host')return;
  const f=db.facilities.find(x=>x.id===b.fid),hostAcc=f.kind==='public'?'Authority payable':'Host payable:'+f.host;
  const paidT=b.created;
  if(b.flexMins){post(db,'Flex hours redeemed',b.ref,[['Flex pass liability',b.q.host+b.q.fee],[hostAcc,-b.q.host],['Platform fee revenue',-b.q.fee]],paidT);return}
  if(b.q.total<=0&&!b.q.disc)return;
  post(db,'Booking payment',b.ref,[[b.pay&&b.pay.method==='wallet'?'Wallet issuer (driver)':'Payment aggregator clearing',b.q.total],[hostAcc,-b.q.host],['Platform fee revenue',-b.q.fee],...(b.q.disc?[['Promotions expense',b.q.disc]]:[])],paidT);
}
function balance(db,acct){return db.journal.reduce((a,j)=>a+j.lines.filter(l=>l.acct===acct).reduce((x,l)=>x+l.p,0),0)/100}
function hostEarnings(db,uid){
  const acct='Host payable:'+uid;let earned=0,pending=0,paid=0,deduct=0;const nowT=db.now;
  db.journal.forEach(j=>j.lines.forEach(l=>{if(l.acct!==acct)return;const v=-l.p/100;
    if(v>0){if(nowT-j.t>=POLICY.disputeH*60)earned+=v;else pending+=v}else paid+=-v}));
  db.payouts.filter(p=>p.uid===uid).forEach(p=>deduct+=p.tds);
  return {available:Math.round((earned-paid)*100)/100,pending:Math.round(pending*100)/100,paidOut:Math.round((paid-deduct)*100)/100,tds:deduct};
}
function runPayouts(db,silent){
  const hosts=db.users.filter(u=>u.roles.includes('host'));const out=[];
  hosts.forEach(u=>{
    if(u.payoutHoldUntil&&db.now<u.payoutHoldUntil)return;
    // historical: weekly payouts at each past Monday 10 am
    const weeks=silent?[-52,-45,-38,-31,-24,-17,-10,-3].map(d=>d*DAY+600):[db.now];
    weeks.forEach(t=>{
      const acct='Host payable:'+u.id;let avail=0;
      db.journal.forEach(j=>{if(j.t>t-POLICY.disputeH*60)return;j.lines.forEach(l=>{if(l.acct===acct)avail+=-l.p/100})});
      if(avail<POLICY.minPayout)return;
      const tds=Math.round(avail*(u.panOk?POLICY.tds:POLICY.tdsNoPan)*100)/100, net=Math.round((avail-tds)*100)/100;
      const p={id:'PO-'+(3000+db.payouts.length),uid:u.id,t,gross:Math.round(avail*100)/100,tds,net,state:'paid',bank:u.bank?u.bank.label:'—'};
      db.payouts.push(p);post(db,'Weekly payout',p.id,[[acct,avail],['TDS payable 194-O',-tds],['Bank (payout)',-net]],t);out.push(p);
      if(!silent)notifyDb(db,u.id,'payout',`Payout ${rs2(net)} sent to ${p.bank}. TDS ${rs2(tds)} deducted under section 194-O.`,['push','email']);
    });
  });
  return out;
}

/* ============ notifications (NTF-01..05, Appendix C) ============ */
function notifyDb(db,uid,key,text,ch,t){db.notifications.unshift({id:'N'+(++db.seq),uid,key,text,ch:ch||['push'],t:t??db.now,read:false})}

/* ============ store ============ */
let DB;
function save(){try{localStorage.setItem(SEEDV,JSON.stringify(DB))}catch(e){}}
function load(){try{const s=localStorage.getItem(SEEDV);if(s){const d=JSON.parse(s);if(d&&d.v===SEEDV)return d}}catch(e){}return null}
function resetDB(){DB=seed();save()}
const now=()=>DB.now;
const user=id=>DB.users.find(u=>u.id===id)||{name:'Guest',roles:[]};
const veh=id=>DB.vehicles.find(v=>v.id===id);
const fac=id=>DB.facilities.find(f=>f.id===id);
const bk=id=>DB.bookings.find(b=>b.id===id);
const destOf=id=>DEST.find(d=>d.id===id)||DEST[0];
const meters=(a,b)=>Math.round(Math.hypot(a.x-b.x,a.y-b.y)*6);
const walkMin=(a,b)=>Math.max(1,Math.round(meters(a,b)/80));
function audit(actor,action,target,before,after,reason){DB.audit.unshift({t:now(),actor,action,target,before:before||'—',after:after||'—',reason:reason||'—'})}
function notify(uid,key,text,ch){
  const u=user(uid);let channels=ch||['push'];
  // NTF-03: time-critical messages fall back to SMS if push isn't delivered in 60 s
  if(S&&S.offline&&channels.includes('push')&&['overstay','reaccom','safety','problem'].includes(key)&&!channels.includes('sms'))channels=channels.concat('sms (fallback)');
  notifyDb(DB,uid,key,text,channels);
}

/* ============ inventory & availability (INV-01..05) ============ */
const sizeRank=s=>SIZES.indexOf(s);
const overlaps=(b,s,e)=>b.start<e+POLICY.buffer&&s<b.end+POLICY.buffer;
function unitBusy(u,s,e,except){return DB.bookings.some(b=>b.unit===u.id&&b.id!==except&&ACTIVE.includes(b.state)&&b.type!=='monthly'&&overlaps(b,s,e))
  ||DB.bookings.some(b=>b.unit===u.id&&b.type==='monthly'&&ACTIVE.includes(b.state)&&!b.paused&&b.id!==except&&dow(s)>=1&&dow(s)<=5&&mod(s)<1140&&mod(e)>480&&s<b.end)}
function fitsUnit(u,v){if(!v)return true;const cls=v.type==='tw'?'tw':'car';return u.cls===cls&&sizeRank(v.size)<=sizeRank(u.size)&&(v.height||1.6)<=u.height}
function inWindows(f,s,e){
  if(f.kind==='public')return f.windows.some(w=>w.days.includes(dow(s))&&mod(s)>=w.from&&mod(s)<w.to);
  if(e-s>=DAY)return true;
  const ok=w=>{if(!w.days.includes(dow(s)))return false;const a=mod(s),b=a+(e-s);return a>=w.from&&b<=w.to};
  return f.windows.some(ok);
}
function nightOk(f,s,e){if(!f.relay||!f.relay.night)return false;const n=f.relay.night;const a=mod(s);return a>=n.from||a<n.to}
function isOpen(f,s,e,o){
  o=o||{};
  if(f.status!=='active')return {ok:false,why:'Listing not active'};
  if(f.mode==='commute'&&!f.out&&dayIdx(s)===dayIdx(now())&&s<now()+12*60)return {ok:false,why:'Host is home'};
  if(f.blocks.some(b=>s<b.end&&b.start<e))return {ok:false,why:'Blocked by host'};
  if(s-now()>POLICY.horizon*DAY&&o.type!=='monthly')return {ok:false,why:'Beyond 30-day horizon'};
  if(o.type==='night')return nightOk(f,s,e)?{ok:true}:{ok:false,why:'No night window'};
  if(!inWindows(f,s,e))return {ok:false,why:'Outside open hours'};
  if(f.neighbour&&f.neighbour.quiet&&f.kind==='residential'&&(mod(s)>=1320||mod(s)<420))return {ok:false,why:'Quiet hours'};
  return {ok:true};
}
function freeUnit(f,v,s,e,except){
  const units=f.units.filter(u=>fitsUnit(u,v));
  const free=units.filter(u=>!unitBusy(u,s,e,except));
  // INV-05: commercial pools hold back a walk-in safety margin
  if(f.pool&&f.margin){const keep=Math.ceil(units.length*f.margin);if(free.length<=keep&&units.length>2)return null}
  return free[0]||null;
}
function lotState(f,cls){const cap=f.capacity[cls]||0,occ=Math.round(cap*(f.occ[cls]||0));return {cap,occ,free:Math.max(0,cap-occ),full:occ>=cap}}

/* ============ search (SRC-01..07, SUI-02, GOV-02, GOV-08) ============ */
function search(o){
  const d=destOf(o.dest), v=veh(o.veh), cls=v&&v.type==='tw'?'tw':'car', s=o.start, e=o.end;
  const out=[];
  DB.facilities.forEach(f=>{
    if(f.status!=='active')return;
    const m=meters(f,d), w=walkMin(f,d);
    if(f.kind==='public'){if(!f.capacity[cls])return;const ls=lotState(f,cls);const q=quoteFor(f,cls,s,e);out.push({f,m,w,q,lot:ls,unit:null,open:isOpen(f,s,e),public:true});return}
    if(!f.units.some(u=>fitsUnit(u,v)))return;
    if(o.ev&&!(f.ev&&evCompat(f,v).ok))return;
    const fl=o.filters||{};
    if(fl.covered&&!f.attrs.covered)return; if(fl.h24&&!f.windows.some(x=>x.from===0&&x.to===1440))return; if(fl.guard&&!f.attrs.guard)return;
    if(fl.access&&!f.units.some(u=>u.accessible))return; if(fl.monthly&&!(f.price[cls]&&f.price[cls].month))return;
    if(fl.lateSafe&&!(f.attrs.lit&&(f.attrs.guard||f.attrs.cctv)&&f.attrs.night))return;
    if(f.neighbour.twOnly&&cls!=='tw')return; if(f.neighbour.verifiedOnly&&!user('u1').verifiedDriver&&o.who==='u1')return;
    if(sizeRank(v?v.size:'hatch')>sizeRank(f.neighbour.maxSize||'suv'))return;
    if(f.floodPaused)return;
    const op=isOpen(f,s,e,{type:o.type});
    const unit=op.ok?freeUnit(f,v,s,e):null;
    const q=quoteFor(f,cls,s,e,{charge:o.ev,event:d.event});
    if(fl.maxPrice&&q.total>fl.maxPrice)return;
    out.push({f,m,w,q,unit,open:op,rel:reliability(f.host).score});
  });
  const near=out.filter(x=>x.m<=600), bookable=near.filter(x=>x.public?!x.lot.full&&x.open.ok:x.unit);
  // SRC-04: best match = walking time, total price, reliability, rating; no paid placement exists
  const score=x=>x.w*3+x.q.total/10-(x.rel||70)/10-(x.f.rating||4.5)*2+(x.public?4:0);
  const sort=o.sort||'best';
  bookable.sort((a,b)=>sort==='price'?a.q.total-b.q.total:sort==='walk'?a.w-b.w:score(a)-score(b));
  const full=near.filter(x=>x.public&&x.lot.full);
  const outside=out.filter(x=>x.m>600&&(x.public?!x.lot.full:x.unit)).sort((a,b)=>a.m-b.m).slice(0,2);
  return {results:bookable,full,outside,dest:d,cls};
}
function evCompat(f,v){
  if(!f.ev||!v||!v.ev)return {ok:false,txt:'No EV profile'};
  const hit=v.ev.conn.find(c=>f.ev.conn.includes(c));
  if(hit)return {ok:true,txt:'Compatible · '+hit};
  if(v.ev.portable&&f.ev.conn.includes('15A socket'))return {ok:true,txt:'Compatible with your portable charger'};
  return {ok:false,txt:'Check compatibility'};
}
function estRange(f,v,mins){if(!f.ev||!v||!v.ev)return null;const kw=Math.min(f.ev.kw,v.ev.kw||7.4);const kwh=kw*mins/60*.88;return {kwh:Math.round(kwh*10)/10,km:Math.round(kwh*(v.type==='tw'?32:6.5))}}

/* ============ host reliability (10.5) ============ */
function reliability(uid){
  const fids=DB.facilities.filter(f=>f.host===uid).map(f=>f.id);
  const bs=DB.bookings.filter(b=>fids.includes(b.fid)&&b.start>now()-60*DAY&&b.start<now()&&b.type!=='monthly');
  const done=bs.filter(b=>b.state==='completed');
  if(done.length<5)return {score:null,label:'New host',n:done.length,parts:null};
  const arrival=done.filter(b=>!(b.problem&&b.problem.cause==='host')).length/done.length;
  const hc=bs.filter(b=>b.cancelBy==='host').length/bs.length;
  const rated=done.filter(b=>b.rating);const avg=rated.reduce((a,b)=>a+b.rating.driver,0)/(rated.length||1);
  const resp=uid==='u3'?.8:.95;
  const score=Math.round(arrival*50+(1-Math.min(1,hc*10))*25+(avg/5)*15+resp*10);
  return {score,label:score>=90?'Highly reliable':score>=70?'Reliable':score>=50?'Needs coaching':'Paused for review',n:done.length,parts:{arrival,hc,avg,resp}};
}

/* ============ booking lifecycle (BKG, CHG, ACS, 12.3) ============ */
function transition(b,to,actor,note){
  if(!(TRANS[b.state]||[]).includes(to)){toast(`Refused: ${STATE_TXT[b.state]} → ${STATE_TXT[to]} isn't allowed`);return false}
  b.events.push({t:now(),from:b.state,to,actor,note:note||''});b.state=to;return true;
}
function refund(b,amt,why,to){
  amt=Math.round(amt*100)/100;if(amt<=0)return null;
  const u=user(b.driver),dest=to||(b.pay.method==='wallet'?'wallet':'source');
  const r={id:'RF-'+(++DB.seq),amt,why,to:dest,state:dest==='wallet'?'succeeded':'processing',t:now(),eta:dest==='wallet'?'Instant':b.pay.method==='upi'?'Within 1–3 working days':'5–7 working days'};
  (b.refunds=b.refunds||[]).push(r);
  if(dest==='wallet'&&u.wallet)u.wallet.bal+=amt;
  const f=fac(b.fid),hs=Math.min(amt,b.q.total)*(b.q.host/(b.q.gross||b.q.total||1));
  post(DB,'Refund · '+why,b.ref,[[dest==='wallet'?'Wallet issuer (driver)':'Payment aggregator clearing',-amt],['Host payable:'+f.host,hs],['Platform fee revenue',amt-hs]]);
  notify(b.driver,'refund',`Refund ${rs2(amt)} ${dest==='wallet'?'added to your wallet':'initiated to your '+b.pay.method.toUpperCase()}. ${r.eta}.`,['push','email']);
  return r;
}
function driverRefundCalc(b){
  // 10.1 driver cancellation matrix
  const mins=b.start-now(),r=fac(b.fid).price[b.cls]||{};
  if(b.state==='requested')return {amt:b.q.total,rule:'Before the host accepts: full refund, authorisation released'};
  if(b.type==='parknow')return now()-b.created<=POLICY.parkNowLapse&&!b.checkin?{amt:b.q.total,rule:'Within 20 min, not checked in: full refund'}:{amt:0,rule:'Session started'};
  if(b.type==='monthly'){const weeks=Math.max(0,Math.floor((b.end-now()-7*DAY)/(7*DAY)));const amt=Math.round(b.q.total/4.3*weeks);return {amt,rule:`7 days' notice; ${weeks} whole week${weeks===1?'':'s'} refunded pro rata`,ends:now()+7*DAY}}
  if(mins>=60)return {amt:b.q.total,rule:'60 min or more before start: full refund'};
  if(mins>0){const keep=r.first?Math.min(b.q.total,r.first):Math.round(b.q.total*.25);return {amt:Math.max(0,b.q.total-keep),rule:`Less than 60 min before start: everything except the first hour (${rs(keep)})`}}
  return {amt:0,rule:'After start without check-in: no-show rules apply'};
}
function hostPenalty(b){
  // 10.4 host cancellation
  const h=(b.start-now())/60, v=b.q.gross||b.q.total;
  if(h>=24)return {fee:0,credit:0,rule:'24 h or more before start: no fee, counts toward reliability score'};
  if(h>=2)return {fee:Math.max(50,Math.round(v*.25)),credit:POLICY.credit,rule:'Less than 24 h before start: 25% of booking value, minimum ₹50'};
  return {fee:Math.round(v*.5),credit:POLICY.credit,reaccom:true,rule:'Less than 2 h before start: 50% of booking value plus re-accommodation cost up to ₹300'};
}
function openCase(o){const c=Object.assign({id:'C-'+(2300+(++DB.seq)%700),state:'open',owner:null,opened:now(),first:null},o);DB.cases.unshift(c);return c}
function tick(mins){
  for(let i=0;i<mins;i+=5){DB.now+=Math.min(5,mins-i);step()}
  save();
}
function step(){
  const T=now();
  DB.bookings.forEach(b=>{
    const f=fac(b.fid);
    if(b.state==='held'&&T>b.holdExp){transition(b,'expired','system','Hold expired after 7 min');}
    if(b.state==='requested'&&T>b.rtbAt+POLICY.rtb){transition(b,'declined','system','No response in 15 min: auto-declined');notify(b.driver,'cancel','Lakshmi didn\'t respond in 15 minutes, so your request was declined and the authorisation released.',['push','sms'])}
    if(b.state==='confirmed'&&!b.n60&&b.start-T<=60&&b.start>T){b.n60=1;if(b.driver==='u1')notify('u1','reminder',`Leave by ${tm(b.start-20)} for ${f.name}. About 18 min by road.`,['push'])}
    if(b.state==='confirmed'&&b.type!=='monthly'&&T>b.start+POLICY.grace&&!b.checkin){
      if(b.type==='parknow'){transition(b,'cancelled','system','Hold lapsed at 20 min: no charge');refund(b,b.q.total,'Park-now hold lapsed')}
      else{transition(b,'no_show','system','No check-in by start + 20 min grace');if(b.driver==='u1')notify('u1','cancel',`Your booking at ${f.name} became a no-show. If the host re-sells the hours, they're refunded.`,['push','sms'])}
    }
    if(b.state==='checked_in'&&b.type!=='monthly'){
      if(!b.n15&&b.end-T<=15&&b.end>T){b.n15=1;if(b.driver==='u1')notify('u1','overstay',`15 minutes left at ${f.name}. Extend now or leave by ${tm(b.end)}.`,['push'])}
      if(T>=b.end){
        if(b.driver!=='u1'||b.left){transition(b,'completed','system','Automatic check-out at end time');b.checkout={t:b.end,method:'auto'}}
        else if(T>b.end+POLICY.overstayFree){
          const next=DB.bookings.find(x=>x.unit===b.unit&&x.id!==b.id&&['confirmed'].includes(x.state)&&x.start<T+60&&x.start>b.start);
          if(next){transition(b,'overstaying','system','Next booking affected');b.overstay={since:b.end,rate:(f.price[b.cls]||{}).later||30};notify('u1','overstay',`You're past your end time and the next driver is due. Overstay is charged at 2× the hourly rate per 15 min.`,['push','sms'])}
          else{const steps=Math.ceil((T-b.end)/15);const r=(f.price[b.cls]||{}).later||30;const amt=Math.round(r/4*steps);b.end+=steps*15;b.ext+=steps*15;b.q.total+=amt;b.q.lines.push({l:`Auto-extension · ${steps*15} min`,a:amt});
            post(DB,'Auto-extension',b.ref,[['Payment aggregator clearing',amt],['Host payable:'+f.host,-amt*.7],['Platform fee revenue',-amt*.3]]);
            notify('u1','overstay',`We extended you by ${steps*15} min at ${rs(r)}/h because the space is free. Leave any time.`,['push'])}
        }
      }
    }
  });
  // R2: 30 min before night window ends
  DB.flex.forEach(x=>{if(x.state==='active'&&x.left<=x.hours*POLICY.flexLow&&!x.n20){x.n20=1;notify(x.uid,'flex','Flex balance is at 20%. Bookings beyond it are paid in rupees only if you agree.',['push'])}});
}

/* ============ UI framework ============ */
const S={surface:'driver',menu:false,stacks:{},f:{},sheet:null,toast:null,offline:false,agreement:false,hostId:'u2',staffRole:'admin',hostLang:'en'};
const SURF={};const ACT={};const NEED={};
const cur=()=>{const st=S.stacks[S.surface]||(S.stacks[S.surface]=[{s:SURF[S.surface].start}]);return st[st.length-1]};
function go(s,p){S.stacks[S.surface].push(Object.assign({s},p||{}));S.sheet=null;render(true)}
function reset(s,p){S.stacks[S.surface]=[Object.assign({s},p||{})];S.sheet=null;render(true)}
function back(){const st=S.stacks[S.surface];if(st.length>1)st.pop();S.sheet=null;render(true)}
function setSurface(id,s,p){S.surface=id;S.menu=false;if(s)S.stacks[id]=[Object.assign({s},p||{})];else if(!S.stacks[id])S.stacks[id]=[{s:SURF[id].start}];S.sheet=null;render(true);window.scrollTo(0,0)}
let toastT;function toast(m){S.toast=m;render();clearTimeout(toastT);toastT=setTimeout(()=>{S.toast=null;render()},2800)}
function sheet(title,body){S.sheet={title,body};render()}
const F_=(k,d)=>S.f[k]===undefined?d:S.f[k];

/* components */
const I={
  search:'<path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.3-4.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  ticket:'<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4Z M10 7v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  pass:'<rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  pin:'<path d="M12 3a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6Zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="none" stroke="currentColor" stroke-width="2"/>',
  user:'<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  home:'<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  cal:'<rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  list:'<path d="M5 5h14v6H5zM5 15h14v4H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  rupee:'<path d="M7 5h10M7 9h10M7 5c6 0 6 8 0 8l7 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  back:'<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  x:'<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  bolt:'<path d="M13 3 5 14h6l-1 7 8-11h-6Z" fill="currentColor"/>',
  shield:'<path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  alert:'<path d="M12 4 3 20h18Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 12.5h2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6 6V5h11v1" fill="none" stroke="currentColor" stroke-width="2"/>',
  car:'<path d="M5 16v-4l2-5h10l2 5v4M5 16h14M5 16v2M19 16v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="13" r="1" fill="currentColor"/><circle cx="15.5" cy="13" r="1" fill="currentColor"/>',
  clock:'<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  globe:'<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  flag:'<path d="M6 21V4h11l-2 4 2 4H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  key:'<circle cx="8" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12h8M17 12v3M20 12v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  chev:'<path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z M10 20h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  chat:'<path d="M4 5h16v11H9l-5 4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  phone:'<path d="M6 3h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  help:'<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  qr:'<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" fill="none" stroke="currentColor" stroke-width="2"/>',
  check:'<path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/>'
};
const ic=(n,w)=>`<svg viewBox="0 0 24 24" aria-hidden="true"${w?` width="${w}" height="${w}"`:''}>${I[n]||''}</svg>`;
const topbar=(title,o)=>{o=o||{};const st=S.stacks[S.surface];return `<div class="top">${st&&st.length>1&&!o.noBack?`<button class="iconbtn" data-back aria-label="Back">${ic('back')}</button>`:''}<h3>${title}</h3>${o.right||''}</div>`};
const badge=(t,c)=>`<span class="badge ${c||'b-mute'}">${t}</span>`;
const relTag=r=>`<span class="rel" title="Release">${r}</span>`;
const plate=(p,big)=>`<span class="plate${big?' big':''}">${esc(p)}</span>`;
const kv=rows=>`<div class="kv">${rows.filter(Boolean).map(r=>`<div class="${r[2]||''}"><span class="sub" style="color:inherit">${r[0]}</span><b class="num">${r[1]}</b></div>`).join('')}</div>`;
const notice=(t,h,i)=>`<div class="notice n-${t}">${ic(i||(t==='ok'?'shield':t==='info'?'help':'alert'))}<div>${h}</div></div>`;
const sw=(key,on,label)=>`<button class="sw" role="switch" aria-checked="${!!on}" data-tog="${key}" aria-label="${esc(label)}"></button>`;
const check=(key,on,label)=>`<button class="cbx" role="checkbox" aria-checked="${!!on}" data-tog="${key}"><span class="box">${on?ic('check',16):''}</span><span>${label}</span></button>`;
const radio=on=>`<span class="radio${on?' on':''}"></span>`;
const chips=(key,opts,curv,num)=>`<div class="chips">${opts.map(o=>{const [v,l,dis]=Array.isArray(o)?o:[o,o];return `<button class="chip" aria-pressed="${String(curv)===String(v)}" data-set="${key}" data-v="${esc(v)}"${num?' data-num':''}${dis?' disabled':''}>${l}</button>`}).join('')}</div>`;
const field=(key,label,val,o)=>{o=o||{};return `<div>${label?`<p class="flabel">${label}</p>`:''}<div class="field">${o.pre||''}<input id="in_${key}" data-bind="${key}" value="${esc(val)}" ${o.attrs||''} aria-label="${esc(label||key)}">${o.post||''}</div>${o.help?`<p class="sub" id="help_${key}" style="margin-top:5px">${o.help}</p>`:''}</div>`};
const need=k=>`data-need="${k}" ${NEED[k]&&NEED[k]()?'':'disabled'}`;
const stat=(v,t,sub,cls)=>`<div class="stat"><span class="t">${t}</span><span class="v ${cls||''}">${v}</span>${sub?`<span class="t">${sub}</span>`:''}</div>`;
function table(cols,rows,o){o=o||{};return `<div class="tablewrap"><table><thead><tr>${cols.map(c=>`<th class="${c[1]||''}">${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr${r.click?` class="click" ${r.click}`:''}>${r.cells.map((c,i)=>`<td class="${cols[i][1]||''}">${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}" class="sub" style="text-align:center;padding:22px">${o.empty||'Nothing here yet.'}</td></tr>`}</tbody></table></div>`}
const stateBadge=s=>badge(STATE_TXT[s]||s,STATE_CLS[s]||'b-mute');
const phead=(t,p,right)=>`<div class="phead"><div><h1>${t}</h1>${p?`<p>${p}</p>`:''}</div>${right||''}</div>`;

/* map, photo, qr */
function mapSVG(o){
  o=o||{};const W=360,H=260;
  const blocks=[[10,10,80,55],[100,10,95,55],[215,10,60,40],[295,10,60,40],[10,96,80,48],[100,150,70,30],[215,94,140,56],[10,200,80,55],[100,200,80,55],[215,168,60,32],[318,226,40,30]];
  let g=`<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'Illustrative map')}"><rect width="${W}" height="${H}" fill="var(--map-ground)"/>`;
  g+=`<rect x="215" y="50" width="140" height="34" rx="4" fill="var(--map-park)"/><text x="285" y="71" text-anchor="middle" font-size="9" fill="var(--map-label)">Defence Colony Park</text>`;
  blocks.forEach(b=>g+=`<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" rx="4" fill="var(--map-block)"/>`);
  g+=`<path d="M0 78H360 M95 0V260 M200 0V260 M0 190H360 M290 160V260" stroke="var(--map-road)" stroke-width="9" fill="none"/><path d="M0 162 C120 168 240 150 360 160" stroke="var(--map-main)" stroke-width="15" fill="none"/>`;
  g+=`<text x="34" y="165" font-size="9" font-weight="700" fill="var(--map-label)">100 FT ROAD</text><text x="300" y="187" font-size="8.5" fill="var(--map-label)">CMH Rd</text><text x="104" y="74" font-size="8.5" fill="var(--map-label)">12th Main</text>`;
  if(o.heat){o.heat.forEach(h=>g+=`<circle cx="${h.x}" cy="${h.y}" r="${h.r}" fill="var(--bad)" fill-opacity="${h.a}"/>`)}
  const d=o.dest;
  if(d&&o.radius)g+=`<circle cx="${d.x}" cy="${d.y}" r="100" fill="var(--sign)" fill-opacity=".06" stroke="var(--sign)" stroke-opacity=".35" stroke-dasharray="4 4"/>`;
  const sel=(o.items||[]).find(x=>x.id===o.sel);
  if(sel&&d&&o.route){g+=`<path d="M${sel.x} ${sel.y} L${sel.x} ${d.y+14} L${d.x} ${d.y+14} L${d.x} ${d.y}" fill="none" stroke="var(--sign)" stroke-width="3" stroke-dasharray="2 5" stroke-linecap="round"/>`;
    const mx=(sel.x+d.x)/2;g+=`<rect x="${mx-26}" y="${d.y+20}" width="52" height="17" rx="8.5" fill="var(--surface)" stroke="var(--line)"/><text x="${mx}" y="${d.y+32}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--ink)">${walkMin(sel,d)} min walk</text>`}
  if(d)g+=`<g><circle cx="${d.x}" cy="${d.y}" r="12" fill="var(--bad)"/><path d="M${d.x-5} ${d.y}h10M${d.x} ${d.y-5}v10" stroke="#fff" stroke-width="3" stroke-linecap="round"/><text x="${d.x}" y="${d.y-17}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--ink)">${esc(d.name)}</text></g>`;
  (o.items||[]).forEach(x=>{
    const on=x.id===o.sel, w=Math.max(28,String(x.label).length*6.2+14), fill=x.official?'var(--night)':x.full?'var(--muted)':on?'var(--ink)':'var(--sign)';
    // SRC-07: residential spaces show an approximate circle, not a pin, before booking
    if(x.approx)g+=`<circle cx="${x.x}" cy="${x.y}" r="22" fill="var(--sign)" fill-opacity=".10" stroke="var(--sign)" stroke-opacity=".4" stroke-dasharray="3 3"/>`;
    g+=`<g data-pin="${x.id}" style="cursor:pointer"><rect x="${x.x-w/2}" y="${x.y-12}" width="${w}" height="22" rx="7" fill="${fill}" ${on?'stroke="var(--marigold)" stroke-width="2.5"':''}/><path d="M${x.x-5} ${x.y+9}l5 6 5-6" fill="${fill}"/><text x="${x.x}" y="${x.y+3}" text-anchor="middle" font-size="10.5" font-weight="700" style="fill:#fff">${esc(x.label)}</text>${x.ev?`<circle cx="${x.x+w/2-1}" cy="${x.y-12}" r="6" fill="var(--ok)"/><path d="M${x.x+w/2} ${x.y-16}l-3 4.5h2.5l-1 3.5 3.5-5h-2.5Z" fill="#fff"/>`:''}</g>`;
  });
  if(o.entrance){const e=o.entrance;g+=`<g><circle cx="${e.x+22}" cy="${e.y+20}" r="9" fill="var(--marigold)" stroke="var(--surface)" stroke-width="2"/><text x="${e.x+22}" y="${e.y+23.5}" text-anchor="middle" font-size="9" font-weight="800" fill="#2a1c00">E</text><text x="${e.x+34}" y="${e.y+24}" font-size="9" font-weight="700" fill="var(--ink)">Entrance</text></g>`}
  if(o.me)g+=`<circle cx="${o.me.x}" cy="${o.me.y}" r="12" fill="var(--sign)" fill-opacity=".2"/><circle cx="${o.me.x}" cy="${o.me.y}" r="6" fill="var(--sign)" stroke="#fff" stroke-width="2"/>`;
  g+='</svg>';
  return `<div class="mapwrap"${o.pick?' data-pick':''}>${g}${o.extra||''}<span class="maptag">Illustrative map</span></div>`;
}
function photo(f,h,label){
  h=h||80;const hue=f.kind==='public'?'var(--night)':f.type==='Garage'?'var(--warn)':f.kind==='commercial'?'var(--ok)':'var(--sign)';
  return `<svg viewBox="0 0 120 ${h}" preserveAspectRatio="xMidYMid slice" style="display:block;width:100%;height:100%" role="img" aria-label="${esc(label||'Photo of '+f.name)}"><rect width="120" height="${h}" fill="var(--map-block)"/><rect y="${h*.62}" width="120" height="${h*.38}" fill="var(--map-road)"/><rect x="18" y="14" width="84" height="${h*.5}" rx="3" fill="${hue}" fill-opacity=".22"/>${[0,1,2,3,4,5,6].map(i=>`<rect x="${22+i*11.5}" y="16" width="3" height="${h*.47}" fill="${hue}" fill-opacity=".55"/>`).join('')}<rect x="34" y="${h*.5}" width="52" height="16" rx="5" fill="var(--muted)" fill-opacity=".55"/><circle cx="44" cy="${h*.5+16}" r="4" fill="var(--ink)" fill-opacity=".7"/><circle cx="76" cy="${h*.5+16}" r="4" fill="var(--ink)" fill-opacity=".7"/></svg>`;
}
function drawQR(cv,seed){const n=25,c=cv.getContext('2d');cv.width=n;cv.height=n;const r=rng(seed);c.fillStyle='#fff';c.fillRect(0,0,n,n);c.fillStyle='#0b0e14';
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(r()>.52)c.fillRect(i,j,1,1);
  [[0,0],[n-7,0],[0,n-7]].forEach(([a,b])=>{c.fillStyle='#fff';c.fillRect(Math.max(0,a-1),Math.max(0,b-1),8,8);c.fillStyle='#0b0e14';c.fillRect(a,b,7,7);c.fillStyle='#fff';c.fillRect(a+1,b+1,5,5);c.fillStyle='#0b0e14';c.fillRect(a+2,b+2,3,3)})}

/* ============ shell render ============ */
const GROUPS=[['Mobile apps',['driver','host','guard','attendant','whatsapp','paylot']],['Web consoles',['business','ops','association','authority','fleet','partner']],['Public',['website','coverage']]];
function render(scrollTop){
  const sf=SURF[S.surface];const c=cur();
  const bar=`<header class="bar"><div class="brand"><span class="pmark">P</span>PAPHere</div>
    <div class="surfpick"><button class="surfbtn" data-act="menu" aria-expanded="${S.menu}">${esc(sf.name)} ${ic('chev',14)}</button>
    ${S.menu?`<div class="surfmenu" role="menu">${GROUPS.map(([g,ids])=>`<p>${g}</p>`+ids.map(id=>`<button role="menuitem" data-surf="${id}" aria-current="${id===S.surface}"><b>${SURF[id].name}</b><span>${SURF[id].who}</span></button>`).join('')).join('')}</div>`:''}</div>
    <div class="clock"><span class="now num" title="Demo clock">${relWhen(now()).replace('Today, ','Today ')}</span><button class="mini" data-act="clock" data-m="15">+15 min</button><button class="mini" data-act="clock" data-m="60">+1 h</button><button class="mini" data-act="resetdemo">Reset demo</button></div></header>`;
  let main;
  const screenFn=sf.screens[c.s];
  const view=screenFn?screenFn(c):`<div class="pad">Missing screen ${esc(c.s)}</div>`;
  if(sf.kind==='phone'){
    const t=sf.tabs?sf.tabs.filter(x=>!x.hide||!x.hide()):null;
    const showTabs=t&&!(sf.noTabs||[]).includes(c.s)&&!(sf.hideTabs&&sf.hideTabs());
    const active=(sf.tabOf&&sf.tabOf[c.s])||c.s;
    const tabs=showTabs?`<nav class="tabs" style="grid-template-columns:repeat(${t.length},1fr)">${t.map(x=>`<button data-tab="${x.s}" ${active===x.s?'aria-current="page"':''}>${ic(x.i)}<span>${x.l}</span>${x.n&&x.n()?`<span class="dotn">${x.n()}</span>`:''}</button>`).join('')}</nav>`:'';
    main=`<div class="stage"><aside class="ctx">${ctxPanel(sf)}</aside><div class="phone"><div class="screen" id="screen">
      <div class="status"><span class="num">${tm(now()).replace(/ [ap]m/,'')}</span><span class="isl"></span><span>${S.offline?'No signal':'4G ▮▮▮'}</span></div>
      ${S.offline&&!sf.noOffline?`<div class="offline-bar">No signal. Passes, codes and directions still work.</div>`:''}
      <div class="view">${view}</div>${tabs}
      ${S.sheet?`<div class="scrim" data-act="closesheet"><div class="sheet" role="dialog" aria-label="${esc(S.sheet.title)}"><div class="grab"></div><p class="h-l">${S.sheet.title}</p>${S.sheet.body}</div></div>`:''}
      ${S.toast?`<div class="toast" role="status">${S.toast}</div>`:''}</div></div></div>`;
  }else{
    const nav=sf.nav||[];const active=(sf.navOf&&sf.navOf[c.s])||c.s;
    main=(sf.bare?view:`<div class="desk"><nav class="side" aria-label="${esc(sf.name)}"><div class="who"><b>${esc(sf.org?sf.org():sf.name)}</b><span>${esc(sf.who)}</span></div>${nav.map(n=>n.g?`<div class="grp">${n.g}</div>`:`<button data-nav="${n.s}" ${active===n.s?'aria-current="page"':''}><span>${n.l}</span>${n.n&&n.n()?badge(n.n(),'b-bad'):''}</button>`).join('')}</nav><section class="content">${view}</section></div>`)
      +(S.sheet?`<div class="modal-scrim" data-act="closesheet"><div class="modal" role="dialog" aria-label="${esc(S.sheet.title)}"><div class="between"><p class="h-l">${S.sheet.title}</p><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x')}</button></div>${S.sheet.body}</div></div>`:'')
      +(S.toast?`<div class="toast fixed" role="status">${S.toast}</div>`:'');
  }
  const v=$('.view'),y=window.scrollY;const keep=v&&!scrollTop?v.scrollTop:0;
  $('#app').innerHTML=bar+main;
  const nv=$('.view');if(nv)nv.scrollTop=keep;if(!scrollTop&&sf.kind!=='phone')window.scrollTo(0,y);
  $$('canvas.qr').forEach(cv=>drawQR(cv,+cv.dataset.seed||1));
  if(sf.after)sf.after(c);
}
function ctxPanel(sf){
  return `<div><h2>${esc(sf.name)}</h2><p class="lead">${sf.lead||''}</p></div>
  ${(sf.journeys||[]).length?`<div><h3>Journeys</h3><div class="jlist">${sf.journeys.map((j,i)=>j.g?`<p class="lbl" style="margin:8px 0 2px 9px">${j.g}</p>`:`<button data-journey="${i}"><span>${j[0]}</span><span>${j[1]}</span></button>`).join('')}</div></div>`:''}
  <div><h3>Simulate</h3><div class="stack" style="gap:10px">
    <div class="trow"><span>No signal (basement)</span>${sw('$offline',S.offline,'Simulate offline')}</div>
    ${sf.ctxExtra?sf.ctxExtra():''}
  </div></div>
  <p class="sub" style="font-size:12.5px;border-top:1px solid var(--line);padding-top:10px">Use the clock in the top bar to move time forward: reminders, no-shows, overstay, hold expiry and payouts all follow it. Maps and people are sample data.</p>`;
}

/* ============ events ============ */
function gate(){$$('[data-need]').forEach(b=>{b.disabled=!(NEED[b.dataset.need]&&NEED[b.dataset.need]())})}
document.addEventListener('input',e=>{const k=e.target.dataset.bind;if(!k)return;S.f[k]=e.target.type==='range'?+e.target.value:e.target.value;gate();const sf=SURF[S.surface];if(sf.onInput)sf.onInput(k,e.target)});
document.addEventListener('change',e=>{const k=e.target.dataset.bindc;if(!k)return;S.f[k]=e.target.value;render()});
document.addEventListener('click',e=>{
  const pk=e.target.closest('[data-pick]');
  if(pk&&SURF[S.surface].onPick){const r=pk.getBoundingClientRect();SURF[S.surface].onPick(Math.round((e.clientX-r.left)/r.width*100),Math.round((e.clientY-r.top)/r.height*100));return}
  const t=e.target.closest('button,[data-act],[data-pin],tr[data-go],tr[data-act],a[data-go]');
  if(!t){if(S.menu&&!e.target.closest('.surfmenu')){S.menu=false;render()}return}
  if(t.disabled)return;
  if((t.classList.contains('scrim')||t.classList.contains('modal-scrim'))&&e.target!==t)return;
  const d=t.dataset;
  if(S.menu&&d.act!=='menu'&&!d.surf){S.menu=false}
  if(d.surf!==undefined){setSurface(d.surf);return}
  if(d.back!==undefined){back();return}
  if(d.tab){reset(d.tab);return}
  if(d.nav){reset(d.nav);window.scrollTo(0,0);return}
  if(d.journey!==undefined){const j=SURF[S.surface].journeys[+d.journey];S.sheet=null;j[2]();save();return}
  if(d.tog){if(d.tog==='$offline'){S.offline=!S.offline}else if(d.tog.startsWith('$')){S[d.tog.slice(1)]=!S[d.tog.slice(1)]}else S.f[d.tog]=!F_(d.tog,false);render();return}
  if(d.set){let v=d.v;if(d.num!==undefined)v=+v;else if(v==='true')v=true;else if(v==='false')v=false;S.f[d.set]=v;if(d.then&&ACT[d.then])ACT[d.then](t,d);else render();return}
  if(d.act&&ACT[d.act]){ACT[d.act](t,d);save();return}
  if(d.go){go(d.go,Object.assign({},d.id?{id:d.id}:{},d.p?JSON.parse(d.p):{}));return}
  if(d.pin&&SURF[S.surface].onPin){SURF[S.surface].onPin(d.pin);return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(S.sheet||S.menu)){S.sheet=null;S.menu=false;render()}});
Object.assign(ACT,{
  menu:()=>{S.menu=!S.menu;render()},
  closesheet:()=>{S.sheet=null;render()},
  toast:(t,d)=>{S.sheet=null;toast(d.msg)},
  clock:(t,d)=>{tick(+d.m);toast(`Clock moved to ${tm(now())}`)},
  resetdemo:()=>{resetDB();S.f={};S.stacks={};S.hostId='u2';toast('Demo data reset')}
});
function boot(){
  DB=load()||seed();save();
  const h=location.hash.slice(1);if(h&&SURF[h])S.surface=h;
  render(true);
}
