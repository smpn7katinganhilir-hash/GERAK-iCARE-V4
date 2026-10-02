/**
 * GERAK iCARE - Integrated Google Apps Script Backend
 * SMP Negeri 7 Katingan Hilir
 *
 * Database: Google Sheets
 * Frontend: HTML + CSS + JS / Fetch API
 *
 * This version keeps the existing data flow and adds the missing
 * analytics synchronization: participation, mood, wellbeing,
 * implementation of Pembelajaran Mendalam, EWS, recommendations,
 * follow-up and trend data.
 */

const CONFIG = {
  VERSION: 'GERAK-iCARE-INTEGRATED-2026-10',
  SHEETS: {
    SETTING:'SETTING', USERS:'USERS', DATA_GURU:'DATA_GURU', MOOD_CHECK:'MOOD_CHECK',
    REFLEKSI:'REFLEKSI_HARIAN', EVALUASI:'EVALUASI_MINGGUAN', EWS:'EWS',
    WELLBEING:'WELLBEING', IMPLEMENTASI_PM:'IMPLEMENTASI_PM', TINDAK_LANJUT:'TINDAK_LANJUT', LOG:'LOG'
  }
};

const HEADERS = {
  SETTING:['Key','Value'],
  USERS:['user_id','nama','email','role','status'],
  DATA_GURU:['user_id','nama','nip','mapel','kelas','status'],
  MOOD_CHECK:['id','user_id','nama_guru','tanggal','mood','mood_score','catatan','timestamp'],
  REFLEKSI_HARIAN:['id','user_id','nama_guru','tanggal','beban_kerja','kondisi_pembelajaran','dukungan','berkesadaran','bermakna','menyenangkan','memahami','mengaplikasi','merefleksi','reflection_score','catatan','timestamp'],
  EVALUASI_MINGGUAN:['id','user_id','nama_guru','minggu','beban_kerja','pembelajaran','kolaborasi','dukungan','kesiapan','total_score','timestamp'],
  EWS:['id','user_id','nama_guru','periode','ews_score','status','trigger','mood_status','refleksi_status','evaluasi_status','trend','last_update'],
  WELLBEING:['id','user_id','nama_guru','periode','mood_score','reflection_score','weekly_score','wellbeing_score','category','timestamp'],
  IMPLEMENTASI_PM:['id','user_id','nama_guru','tanggal','berkesadaran','bermakna','menyenangkan','memahami','mengaplikasi','merefleksi','total_score','percentage','category','timestamp'],
  TINDAK_LANJUT:['id','ews_id','user_id','nama_guru','tanggal','jenis','rekomendasi','catatan','status','tanggal_monitoring','timestamp'],
  LOG:['id','timestamp','user','aksi','detail']
};

function getSS(){
  const props=PropertiesService.getScriptProperties();
  const configuredId=String(props.getProperty('SS_ID')||'').trim();
  if(configuredId){
    try{return SpreadsheetApp.openById(configuredId);}
    catch(err){throw new Error('Spreadsheet tersimpan tidak dapat dibuka. Periksa SS_ID pada Script Properties.');}
  }
  const active=SpreadsheetApp.getActiveSpreadsheet();
  if(active){props.setProperty('SS_ID',active.getId());return active;}
  throw new Error('Database Google Sheets belum terhubung. Jalankan setupDatabase() sekali dari editor Apps Script pada project yang terhubung ke spreadsheet GERAK iCARE.');
}

function setSpreadsheetId(spreadsheetId){
  const id=String(spreadsheetId||'').trim();
  if(!id)throw new Error('Spreadsheet ID wajib diisi.');
  const ss=SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty('SS_ID',ss.getId());
  return {success:true,message:'Database Google Sheets berhasil dihubungkan.',spreadsheetId:ss.getId(),spreadsheetName:ss.getName()};
}

function doGet(){return json_({success:true,service:'GERAK iCARE API',version:CONFIG.VERSION});}
function doPost(e){
  try{
    const body=JSON.parse(e?.postData?.contents||'{}');
    const action=String(body.action||'');
    const p=normalizePayload_(body.payload||{});
    let result;
    switch(action){
      case 'setupDatabase': result=setupDatabase();break;
      case 'setSpreadsheetId': result=setSpreadsheetId(p.spreadsheetId);break;
      case 'getInitialData': result=getInitialData(p);break;
      case 'getDashboardData': result=getDashboardData(p);break;
      case 'getParticipationData': result=getParticipationData(p);break;
      case 'getMoodDistribution': result=getMoodDistribution(p);break;
      case 'getWellbeingData': result=getWellbeingData(p);break;
      case 'getDeepLearningImplementation': result=getDeepLearningImplementation(p);break;
      case 'getEWSData': case 'getEWS': result=getEWSData(p);break;
      case 'getTeacherDetail': case 'getGuruDetail': result=getTeacherDetail(p);break;
      case 'getRecommendations': result=getRecommendations(p);break;
      case 'getTrendData': result=getTrendData(p);break;
      case 'verifyAdminPin': result=verifyAdminPin(p.pin);break;
      case 'saveGuru': result=saveGuru(p);break;
      case 'deleteGuru': result=deleteGuru(p.id);break;
      case 'saveMood': case 'saveMoodCheck': result=saveMood(p);break;
      case 'saveRefleksi': case 'saveDailyReflection': result=saveRefleksi(p);break;
      case 'saveEvaluasi': case 'saveWeeklyEvaluation': result=saveEvaluasi(p);break;
      case 'saveTindakLanjut': case 'saveFollowUp': result=saveTindakLanjut(p);break;
      case 'saveSettings': result=saveSettings(p);break;
      default: result={success:false,error:'Action tidak dikenali: '+action};
    }
    return json_(result);
  }catch(err){return json_({success:false,error:String(err&&err.message||err)});}
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function normalizePayload_(p){if(!p.userId&&p.guruId)p.userId=p.guruId;if(!p.guruNama&&p.guruName)p.guruNama=p.guruName;if(!p.tanggal&&p.date)p.tanggal=p.date;return p;}

function setupDatabase(){
  const ss=getSS();
  Object.keys(HEADERS).forEach(name=>ensureSheetSchema_(ss,name,HEADERS[name]));
  const setting=ss.getSheetByName(CONFIG.SHEETS.SETTING);
  const current=readSettings(ss);
  if(!current.instansi)setKey_(setting,'instansi','SMP Negeri 7 Katingan Hilir');
  if(!current.tagline)setKey_(setting,'tagline','Deteksi Dini, Dukungan, dan Tindak Lanjut Guru');
  if(!current.adminPin)setKey_(setting,'adminPin','1234');
  syncUsers_();
  writeLog_('SYSTEM','SETUP','Database GERAK iCARE terintegrasi siap digunakan.');
  return{success:true,message:'Database GERAK iCARE terintegrasi siap digunakan.',version:CONFIG.VERSION};
}
function ensureSheetSchema_(ss,name,headers){
  let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);return sh;}
  const existing=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getValues()[0].map(String);
  const missing=headers.filter(h=>existing.indexOf(h)<0);
  if(missing.length)sh.getRange(1,existing.length+1,1,missing.length).setValues([missing]);
  sh.setFrozenRows(1);return sh;
}
function setKey_(sh,key,value){const vals=sh.getDataRange().getValues();const i=vals.findIndex(r=>String(r[0])===String(key));if(i>0)sh.getRange(i+1,2).setValue(value);else sh.appendRow([key,value]);}

function readSettings(ss){const sh=ss.getSheetByName(CONFIG.SHEETS.SETTING),out={};if(!sh||sh.getLastRow()<2)return out;sh.getDataRange().getValues().slice(1).forEach(r=>{if(r[0]!==''&&r[0]!=null)out[String(r[0])]=r[1];});return out;}
function readRows(ss,name){const sh=ss.getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];const values=sh.getDataRange().getValues(),heads=values[0].map(String);return values.slice(1).map(row=>{const o={};heads.forEach((h,i)=>o[h]=row[i]);return o;});}
function readGuru(ss){return readRows(ss,CONFIG.SHEETS.DATA_GURU).map(r=>({id:String(r.user_id||r.ID||''),user_id:String(r.user_id||r.ID||''),nama:String(r.nama||r.Nama||r.name||''),nip:String(r.nip||r.NIP||''),mapel:String(r.mapel||r.Mapel||''),kelas:String(r.kelas||r.Kelas||''),status:String(r.status||r.Status||'Aktif')})).filter(g=>g.id&&g.nama);}
function activeGuru_(ss){return readGuru(ss).filter(g=>String(g.status).toLowerCase()!=='nonaktif');}
function appendObject_(ss,name,obj){const sh=ss.getSheetByName(name);const heads=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);sh.appendRow(heads.map(h=>obj[h]!==undefined?obj[h]:''));}
function findGuru_(ss,id){return readGuru(ss).find(g=>String(g.id)===String(id));}
function id_(prefix){return prefix+'-'+Date.now()+'-'+Math.floor(Math.random()*10000);}
function now_(){return new Date();}
function isoDate_(v){const d=new Date(v);return isNaN(d)?'':Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');}
function daysAgo_(n){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-n);return d;}
function moodScore_(v){return ({'Sangat Baik':4,'Baik':3,'Biasa Saja':2,'Biasa':2,'Kurang Baik':1,'Kurang':1,'Sangat Tidak Baik':0,'Sangat Kurang':0}[String(v)] ?? (Number(v)||0));}
function rankStatus_(s){return({'Aman':0,'Perlu Perhatian':1,'Waspada':2,'Prioritas Tindak Lanjut':3}[String(s)]??0);}
function statusLabel_(r){return r===3?'Prioritas Tindak Lanjut':r===2?'Waspada':r===1?'Perlu Perhatian':'Aman';}
function writeLog_(user,action,detail){try{getSS().getSheetByName(CONFIG.SHEETS.LOG).appendRow([id_('LOG'),now_(),user,action,detail]);}catch(e){}}

// ---------- INITIAL DATA ----------
function getInitialData(p){
  const ss=getSS(),role=String(p.role||'public'),uid=String(p.userId||'');
  const data={settings:readSettings(ss),guruList:readGuru(ss),moodList:[],refleksiList:[],evaluasiList:[],ewsList:[],wellbeingList:[],implementasiPMList:[],tindakLanjutList:[]};
  if(role==='admin'){
    data.moodList=readRows(ss,CONFIG.SHEETS.MOOD_CHECK);data.refleksiList=readRows(ss,CONFIG.SHEETS.REFLEKSI);data.evaluasiList=readRows(ss,CONFIG.SHEETS.EVALUASI);data.ewsList=readRows(ss,CONFIG.SHEETS.EWS);data.wellbeingList=readRows(ss,CONFIG.SHEETS.WELLBEING);data.implementasiPMList=readRows(ss,CONFIG.SHEETS.IMPLEMENTASI_PM);data.tindakLanjutList=readRows(ss,CONFIG.SHEETS.TINDAK_LANJUT);
  }else if(role==='guru'&&uid){
    data.moodList=readRows(ss,CONFIG.SHEETS.MOOD_CHECK).filter(r=>String(r.user_id)===uid);data.refleksiList=readRows(ss,CONFIG.SHEETS.REFLEKSI).filter(r=>String(r.user_id)===uid);data.evaluasiList=readRows(ss,CONFIG.SHEETS.EVALUASI).filter(r=>String(r.user_id)===uid);data.ewsList=readRows(ss,CONFIG.SHEETS.EWS).filter(r=>String(r.user_id)===uid);data.wellbeingList=readRows(ss,CONFIG.SHEETS.WELLBEING).filter(r=>String(r.user_id)===uid);data.implementasiPMList=readRows(ss,CONFIG.SHEETS.IMPLEMENTASI_PM).filter(r=>String(r.user_id)===uid);data.tindakLanjutList=readRows(ss,CONFIG.SHEETS.TINDAK_LANJUT).filter(r=>String(r.user_id)===uid);
  }
  return{success:true,data};
}

// ---------- SAVE ----------
function requireGuru_(uid,name){const g=findGuru_(getSS(),uid);if(!g)throw new Error('Guru tidak ditemukan pada DATA_GURU.');if(name&&g.nama!==name)throw new Error('Nama guru tidak sesuai dengan DATA_GURU.');return g;}
function saveMood(p){
  const ss=getSS(),g=requireGuru_(p.userId,p.guruNama),ts=now_();
  appendObject_(ss,CONFIG.SHEETS.MOOD_CHECK,{id:id_('MOOD'),user_id:g.id,nama_guru:g.nama,tanggal:p.tanggal||isoDate_(ts),mood:p.mood,mood_score:moodScore_(p.mood),catatan:p.catatan||'',timestamp:ts});
  recalculateAll_(g.id);writeLog_(g.nama,'MOOD_CHECK','Mood '+p.mood);return{success:true,message:'Mood Check tersimpan dan seluruh indikator diperbarui.'};
}
function saveRefleksi(p){
  const ss=getSS(),g=requireGuru_(p.userId,p.guruNama),ts=now_();
  const pm={berkesadaran:Number(p.berkesadaran||0),bermakna:Number(p.bermakna||0),menyenangkan:Number(p.menyenangkan||p.menggembirakan||0),memahami:Number(p.memahami||0),mengaplikasi:Number(p.mengaplikasi||0),merefleksi:Number(p.merefleksi||0)};
  const reflectionScore=(p.bebanKerja==='Ringan'?3:p.bebanKerja==='Sedang'?2:1)+(p.kondisiPembelajaran==='Sangat Lancar'?3:p.kondisiPembelajaran==='Cukup Lancar'?2:1)+(p.dukungan==='Tidak membutuhkan bantuan'?3:p.dukungan==='Perlu diskusi'?2:p.dukungan==='Perlu dukungan Kepala Sekolah'?1:0);
  appendObject_(ss,CONFIG.SHEETS.REFLEKSI,{id:id_('REFL'),user_id:g.id,nama_guru:g.nama,tanggal:p.tanggal||isoDate_(ts),beban_kerja:p.bebanKerja||'',kondisi_pembelajaran:p.kondisiPembelajaran||'',dukungan:p.dukungan||'',berkesadaran:pm.berkesadaran,bermakna:pm.bermakna,menyenangkan:pm.menyenangkan,memahami:pm.memahami,mengaplikasi:pm.mengaplikasi,merefleksi:pm.merefleksi,reflection_score:reflectionScore,catatan:p.catatan||'',timestamp:ts});
  recalculateAll_(g.id);writeLog_(g.nama,'REFLEKSI_HARIAN','Refleksi + indikator PM');return{success:true,message:'Refleksi tersimpan dan seluruh indikator diperbarui.'};
}
function saveEvaluasi(p){
  const ss=getSS(),g=requireGuru_(p.userId,p.guruNama),ts=now_(),vals=[p.bebanKerja,p.pembelajaran,p.kolaborasi,p.dukungan,p.kesiapan].map(Number),total=Number(p.totalScore||vals.reduce((a,b)=>a+b,0));
  if(vals.some(v=>v<1||v>4)||total<5||total>20)throw new Error('Evaluasi mingguan harus memiliki 5 skor antara 1–4.');
  appendObject_(ss,CONFIG.SHEETS.EVALUASI,{id:id_('EVAL'),user_id:g.id,nama_guru:g.nama,minggu:p.minggu||isoDate_(ts),beban_kerja:vals[0],pembelajaran:vals[1],kolaborasi:vals[2],dukungan:vals[3],kesiapan:vals[4],total_score:total,timestamp:ts});
  recalculateAll_(g.id);writeLog_(g.nama,'EVALUASI_MINGGUAN','Evaluasi total '+total);return{success:true,message:'Evaluasi mingguan tersimpan dan seluruh indikator diperbarui.'};
}
function saveTindakLanjut(p){
  const ss=getSS(),g=requireGuru_(p.userId,p.namaGuru),ts=now_();
  appendObject_(ss,CONFIG.SHEETS.TINDAK_LANJUT,{id:id_('TL'),ews_id:p.ewsId||'',user_id:g.id,nama_guru:g.nama,tanggal:p.tanggal||isoDate_(ts),jenis:p.jenisTindakLanjut||p.jenis||'',rekomendasi:p.rekomendasi||'',catatan:p.catatan||'',status:p.status||'Belum ditindaklanjuti',tanggal_monitoring:p.tanggalMonitoring||'',timestamp:ts});
  writeLog_('ADMIN','TINDAK_LANJUT',g.nama+' - '+(p.jenisTindakLanjut||p.jenis||''));return{success:true,message:'Tindak lanjut tersimpan.'};
}

function recalculateAll_(uid){calculateEWS_(uid);calculateWellbeing_(uid);calculatePM_(uid);}

// ---------- EWS ----------
function calculateEWS_(uid){
  const ss=getSS(),g=findGuru_(ss,uid);if(!g)return null;
  const moods=readRows(ss,CONFIG.SHEETS.MOOD_CHECK).filter(x=>String(x.user_id)===String(uid)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const refs=readRows(ss,CONFIG.SHEETS.REFLEKSI).filter(x=>String(x.user_id)===String(uid)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const evals=readRows(ss,CONFIG.SHEETS.EVALUASI).filter(x=>String(x.user_id)===String(uid)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const low=moods.filter(x=>new Date(x.timestamp)>=daysAgo_(4)&&moodScore_(x.mood)<=1);let consecutive=0;for(let i=0;i<5;i++){const d=new Date();d.setDate(d.getDate()-i);const k=isoDate_(d);if(moods.some(x=>isoDate_(x.timestamp)===k&&moodScore_(x.mood)<=1))consecutive++;else break;}
  const recentRefs=refs.filter(x=>new Date(x.timestamp)>=daysAgo_(6));const problems=recentRefs.filter(x=>x.beban_kerja==='Berat'||x.kondisi_pembelajaran==='Mengalami Kendala'||['Perlu diskusi','Perlu dukungan Kepala Sekolah','Perlu bantuan segera'].indexOf(x.dukungan)>=0);const urgent=recentRefs.some(x=>x.dukungan==='Perlu bantuan segera'),discussion=recentRefs.some(x=>x.dukungan==='Perlu diskusi');const ev=evals[0],evTotal=ev?Number(ev.total_score):null;
  const moodNorm=moods.length?moods.slice(0,5).reduce((s,x)=>s+moodScore_(x.mood),0)/Math.min(5,moods.length)/4*100:null;const refNorm=refs.length?refs.slice(0,5).reduce((s,x)=>s+Number(x.reflection_score||0),0)/Math.min(5,refs.length)/9*100:null;const evalNorm=evTotal!==null?evTotal/20*100:null;let weighted=0,w=0;if(moodNorm!==null){weighted+=moodNorm*.4;w+=.4;}if(refNorm!==null){weighted+=refNorm*.3;w+=.3;}if(evalNorm!==null){weighted+=evalNorm*.3;w+=.3;}const score=w?Math.round(weighted/w):0;
  let risk=0,tr=[];if(low.length>=3){risk=3;tr.push('Mood rendah ≥3 kali dalam 5 hari');}if(consecutive>=2){risk=3;tr.push('Mood rendah ≥2 hari berturut-turut');}if(urgent){risk=3;tr.push('Guru memilih Perlu bantuan segera');}if(evTotal!==null&&evTotal<=8){risk=3;tr.push('Evaluasi mingguan ≤8');}
  if(risk<3){if(low.length>=2){risk=2;tr.push('Mood rendah 2 kali dalam 5 hari');}if(problems.length>=2){risk=2;tr.push('Refleksi bermasalah ≥2 kali');}if(evTotal!==null&&evTotal>=9&&evTotal<=12){risk=2;tr.push('Evaluasi mingguan 9–12');}if(discussion){risk=2;tr.push('Guru meminta diskusi dengan Kepala Sekolah');}}
  if(risk<2){if(moods.some(x=>moodScore_(x.mood)===2)){risk=1;tr.push('Mood Biasa Saja muncul pada periode pengamatan');}if(recentRefs.some(x=>x.kondisi_pembelajaran==='Mengalami Kendala'||x.beban_kerja==='Berat')){risk=1;tr.push('Terdapat kendala pembelajaran/beban kerja');}if(evTotal!==null&&evTotal>=13&&evTotal<=16){risk=1;tr.push('Evaluasi mingguan 13–16');}}
  const status=statusLabel_(risk),rows=readRows(ss,CONFIG.SHEETS.EWS).filter(x=>String(x.user_id)===String(uid)).sort((a,b)=>new Date(a.last_update)-new Date(b.last_update));const prev=rows.length?rankStatus_(rows[rows.length-1].status):risk;const trend=risk>prev?'Memburuk':risk<prev?'Membaik':'Stabil';if(!tr.length)tr.push(status==='Aman'?'Tidak ada pemicu warning':'Data belum cukup');
  const row={id:id_('EWS'),user_id:g.id,nama_guru:g.nama,periode:isoDate_(new Date()),ews_score:score,status:status,trigger:tr.join('; '),mood_status:low.length?'Perlu Perhatian':'Aman',refleksi_status:problems.length?'Perlu Perhatian':'Aman',evaluasi_status:evTotal===null?'Belum Ada':evTotal<=8?'Prioritas Tindak Lanjut':evTotal<=12?'Waspada':evTotal<=16?'Perlu Perhatian':'Aman',trend:trend,last_update:now_()};appendObject_(ss,CONFIG.SHEETS.EWS,row);return row;
}

// ---------- WELLBEING ----------
function calculateWellbeing_(uid){
  const ss=getSS(),g=findGuru_(ss,uid);if(!g)return null;const moods=readRows(ss,CONFIG.SHEETS.MOOD_CHECK).filter(x=>String(x.user_id)===String(uid)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,5);const refs=readRows(ss,CONFIG.SHEETS.REFLEKSI).filter(x=>String(x.user_id)===String(uid)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,5);const ev=readRows(ss,CONFIG.SHEETS.EVALUASI).filter(x=>String(x.user_id)===String(uid)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0];const m=moods.length?moods.reduce((s,x)=>s+moodScore_(x.mood),0)/moods.length/4*100:null;const r=refs.length?refs.reduce((s,x)=>s+Number(x.reflection_score||0),0)/refs.length/9*100:null;const w=ev?Number(ev.total_score||0)/20*100:null;let score=0,weight=0;if(m!==null){score+=m*.4;weight+=.4;}if(r!==null){score+=r*.3;weight+=.3;}if(w!==null){score+=w*.3;weight+=.3;}score=weight?Math.round(score/weight*10)/10:null;const cat=score===null?'Belum ada data':score>=80?'Sangat Baik':score>=70?'Baik':score>=60?'Perlu Perhatian':score>=50?'Waspada':'Prioritas Tindak Lanjut';const row={id:id_('WB'),user_id:g.id,nama_guru:g.nama,periode:isoDate_(new Date()),mood_score:m===null?'':Math.round(m*10)/10,reflection_score:r===null?'':Math.round(r*10)/10,weekly_score:w===null?'':Math.round(w*10)/10,wellbeing_score:score===null?'':score,category:cat,timestamp:now_()};appendObject_(ss,CONFIG.SHEETS.WELLBEING,row);return row;
}

// ---------- PM ----------
function calculatePM_(uid){
  const ss=getSS(),g=findGuru_(ss,uid);if(!g)return null;const refs=readRows(ss,CONFIG.SHEETS.REFLEKSI).filter(x=>String(x.user_id)===String(uid)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));const r=refs.find(x=>Number(x.berkesadaran)>0&&Number(x.bermakna)>0&&Number(x.menyenangkan)>0&&Number(x.memahami)>0&&Number(x.mengaplikasi)>0&&Number(x.merefleksi)>0);if(!r)return null;const vals=[r.berkesadaran,r.bermakna,r.menyenangkan,r.memahami,r.mengaplikasi,r.merefleksi].map(Number),total=vals.reduce((a,b)=>a+b,0),pct=total/24*100,cat=pct>=85?'Sangat Baik':pct>=70?'Baik':pct>=55?'Mulai Berkembang':pct>=40?'Perlu Penguatan':'Prioritas Pendampingan';const row={id:id_('PM'),user_id:g.id,nama_guru:g.nama,tanggal:r.tanggal,berkesadaran:vals[0],bermakna:vals[1],menyenangkan:vals[2],memahami:vals[3],mengaplikasi:vals[4],merefleksi:vals[5],total_score:total,percentage:Math.round(pct*10)/10,category:cat,timestamp:now_()};appendObject_(ss,CONFIG.SHEETS.IMPLEMENTASI_PM,row);return row;}

// ---------- ANALYTICS API ----------
function getDashboardData(p){const ss=getSS(),period=Number(p.period||7);return{success:true,data:{participation:getParticipationData({period}).data,mood:getMoodDistribution({period}).data,wellbeing:getWellbeingData({period}).data,pm:getDeepLearningImplementation({period}).data,ews:getEWSData({}).data,recommendations:getRecommendations({}).data,trend:getTrendData({period}).data}};}
function getParticipationData(p){const ss=getSS(),period=Number(p.period||7),gurus=activeGuru_(ss),out=[];for(let i=period-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=isoDate_(d),ids={};readRows(ss,CONFIG.SHEETS.MOOD_CHECK).filter(x=>isoDate_(x.tanggal||x.timestamp)===k).forEach(x=>ids[x.user_id]=1);readRows(ss,CONFIG.SHEETS.REFLEKSI).filter(x=>isoDate_(x.tanggal||x.timestamp)===k).forEach(x=>ids[x.user_id]=1);readRows(ss,CONFIG.SHEETS.EVALUASI).filter(x=>isoDate_(x.timestamp||x.minggu)===k).forEach(x=>ids[x.user_id]=1);const count=Object.keys(ids).length;out.push({date:k,filled:count,total:gurus.length,percentage:gurus.length?count/gurus.length*100:0});}return{success:true,data:out};}
function getMoodDistribution(p){const ss=getSS(),period=Number(p.period||7),rows=readRows(ss,CONFIG.SHEETS.MOOD_CHECK).filter(x=>new Date(x.timestamp)>=daysAgo_(period-1));const c={'Sangat Baik':0,'Baik':0,'Biasa Saja':0,'Kurang Baik':0,'Sangat Tidak Baik':0};rows.forEach(x=>{const s=moodScore_(x.mood);const k=s>=4?'Sangat Baik':s===3?'Baik':s===2?'Biasa Saja':s===1?'Kurang Baik':'Sangat Tidak Baik';c[k]++;});const total=rows.length,positive=total?(c['Sangat Baik']+c['Baik'])/total*100:0;return{success:true,data:{total,counts:c,positive,neutral:total?c['Biasa Saja']/total*100:0,negative:total?(c['Kurang Baik']+c['Sangat Tidak Baik'])/total*100:0}};}
function getWellbeingData(p){const ss=getSS(),rows=readRows(ss,CONFIG.SHEETS.WELLBEING),latest={};rows.forEach(x=>{if(!latest[x.user_id]||new Date(x.timestamp)>new Date(latest[x.user_id].timestamp))latest[x.user_id]=x;});const list=Object.keys(latest).map(k=>latest[k]);const avg=list.length?list.reduce((s,x)=>s+Number(x.wellbeing_score||0),0)/list.length:0;return{success:true,data:{average:avg,rows:list,distribution:{'Sangat Baik':list.filter(x=>x.category==='Sangat Baik').length,'Baik':list.filter(x=>x.category==='Baik').length,'Perlu Perhatian':list.filter(x=>x.category==='Perlu Perhatian').length,'Waspada':list.filter(x=>x.category==='Waspada').length,'Prioritas Tindak Lanjut':list.filter(x=>x.category==='Prioritas Tindak Lanjut').length}}};}
function getDeepLearningImplementation(p){const ss=getSS(),rows=readRows(ss,CONFIG.SHEETS.IMPLEMENTASI_PM),latest={};rows.forEach(x=>{if(!latest[x.user_id]||new Date(x.timestamp)>new Date(latest[x.user_id].timestamp))latest[x.user_id]=x;});const list=Object.keys(latest).map(k=>latest[k]);const avg=list.length?list.reduce((s,x)=>s+Number(x.percentage||0),0)/list.length:0;const indicators={};['berkesadaran','bermakna','menyenangkan','memahami','mengaplikasi','merefleksi'].forEach(k=>{const a=list.map(x=>Number(x[k])/4*100).filter(v=>v>0);indicators[k]=a.length?a.reduce((s,v)=>s+v,0)/a.length:0;});return{success:true,data:{average:avg,rows:list,indicators}};}
function getEWSData(){const ss=getSS(),gurus=activeGuru_(ss),rows=readRows(ss,CONFIG.SHEETS.EWS),latest={};rows.forEach(x=>{if(!latest[x.user_id]||new Date(x.last_update)>new Date(latest[x.user_id].last_update))latest[x.user_id]=x;});return{success:true,data:gurus.map(g=>latest[g.id]||{user_id:g.id,nama_guru:g.nama,status:'Belum Mengisi',ews_score:0,trigger:'Belum ada pengisian'})};}
function getTeacherDetail(p){const ss=getSS(),g=findGuru_(ss,p.userId);if(!g)throw new Error('Guru tidak ditemukan.');return{success:true,data:{guru:g,mood:readRows(ss,CONFIG.SHEETS.MOOD_CHECK).filter(x=>String(x.user_id)===String(g.id)),refleksi:readRows(ss,CONFIG.SHEETS.REFLEKSI).filter(x=>String(x.user_id)===String(g.id)),evaluasi:readRows(ss,CONFIG.SHEETS.EVALUASI).filter(x=>String(x.user_id)===String(g.id)),ews:readRows(ss,CONFIG.SHEETS.EWS).filter(x=>String(x.user_id)===String(g.id)),wellbeing:readRows(ss,CONFIG.SHEETS.WELLBEING).filter(x=>String(x.user_id)===String(g.id)),pm:readRows(ss,CONFIG.SHEETS.IMPLEMENTASI_PM).filter(x=>String(x.user_id)===String(g.id)),tindakLanjut:readRows(ss,CONFIG.SHEETS.TINDAK_LANJUT).filter(x=>String(x.user_id)===String(g.id))}};}
function getRecommendations(){const ss=getSS(),out=[];activeGuru_(ss).forEach(g=>{const e=getLatest_(readRows(ss,CONFIG.SHEETS.EWS),g.id,'last_update'),w=getLatest_(readRows(ss,CONFIG.SHEETS.WELLBEING),g.id,'timestamp'),pm=getLatest_(readRows(ss,CONFIG.SHEETS.IMPLEMENTASI_PM),g.id,'timestamp');let priority=4,recs=[];if(e&&e.status==='Prioritas Tindak Lanjut'||w&&Number(w.wellbeing_score)<50){priority=1;recs.push('Segera lakukan komunikasi individual.');}else if(e&&e.status==='Waspada'||w&&Number(w.wellbeing_score)<60||pm&&Number(pm.percentage)<55){priority=2;recs.push('Jadwalkan coaching atau pendampingan.');}else if(e&&e.status==='Perlu Perhatian'||w&&Number(w.wellbeing_score)<70||pm&&Number(pm.percentage)<70){priority=3;recs.push('Monitoring dan dukungan ringan.');}else recs.push('Pertahankan praktik baik dan berikan apresiasi.');out.push({user_id:g.id,nama_guru:g.nama,priority,recommendations:recs});});return{success:true,data:out.sort((a,b)=>a.priority-b.priority)};}
function getLatest_(rows,uid,dateKey){const a=rows.filter(x=>String(x.user_id)===String(uid)).sort((x,y)=>new Date(y[dateKey])-new Date(x[dateKey]));return a[0]||null;}
function getTrendData(p){const period=Number(p.period||7),ss=getSS();return{success:true,data:{participation:getParticipationData({period}).data,wellbeing:readRows(ss,CONFIG.SHEETS.WELLBEING).filter(x=>new Date(x.timestamp)>=daysAgo_(period-1)),ews:readRows(ss,CONFIG.SHEETS.EWS).filter(x=>new Date(x.last_update)>=daysAgo_(period-1))}};}

// ---------- CRUD / SETTINGS ----------
function saveGuru(p){
  const ss=getSS(),sh=ensureSheetSchema_(ss,CONFIG.SHEETS.DATA_GURU,HEADERS.DATA_GURU);
  const vals=sh.getDataRange().getValues(),heads=vals[0].map(String);
  const idCol=heads.indexOf('user_id')>=0?heads.indexOf('user_id'):heads.indexOf('ID');
  const nameCol=heads.indexOf('nama')>=0?heads.indexOf('nama'):heads.indexOf('Nama');
  if(idCol<0||nameCol<0)throw new Error('Header DATA_GURU tidak dapat dikenali.');
  const incomingId=String(p.id||'').trim();
  const existingIndex=incomingId?vals.findIndex((r,i)=>i>0&&String(r[idCol]).trim()===incomingId):-1;
  let id=incomingId;
  if(!id){
    const used=readGuru(ss).map(g=>String(g.id));
    let n=1; do{id='GURU-'+String(n++).padStart(3,'0');}while(used.includes(id));
  }
  const row={user_id:id,nama:String(p.nama||'').trim(),nip:p.nip||'',mapel:p.mapel||'',kelas:p.kelas||'',status:p.status||'Aktif'};
  if(!row.nama)throw new Error('Nama guru wajib diisi.');
  if(existingIndex>0){
    const range=sh.getRange(existingIndex+1,1,1,sh.getLastColumn()),existing=range.getValues()[0];
    heads.forEach((h,j)=>{if(h==='user_id'||h==='ID')existing[j]=row.user_id;if(h==='nama'||h==='Nama')existing[j]=row.nama;if(h==='nip'||h==='NIP')existing[j]=row.nip;if(h==='mapel'||h==='Mapel')existing[j]=row.mapel;if(h==='kelas'||h==='Kelas')existing[j]=row.kelas;if(h==='status'||h==='Status')existing[j]=row.status;});
    range.setValues([existing]);
  }else{
    appendObject_(ss,CONFIG.SHEETS.DATA_GURU,row);
  }
  syncUsers_();
  writeLog_('ADMIN','DATA_GURU',incomingId?'Edit guru '+row.nama:'Tambah guru '+row.nama);
  return{success:true,message:'Data guru berhasil disimpan.',id};
}
function syncUsers_(){
  const ss=getSS(),sh=ensureSheetSchema_(ss,CONFIG.SHEETS.USERS,HEADERS.USERS);
  if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  activeGuru_(ss).forEach(g=>appendObject_(ss,CONFIG.SHEETS.USERS,{user_id:g.id,nama:g.nama,email:'',role:'guru',status:g.status}));
}
function deleteGuru(id){
  const ss=getSS(),sh=ss.getSheetByName(CONFIG.SHEETS.DATA_GURU);
  if(!sh)throw new Error('Sheet DATA_GURU belum tersedia.');
  const vals=sh.getDataRange().getValues(),heads=vals[0].map(String);
  const idCol=heads.indexOf('user_id')>=0?heads.indexOf('user_id'):heads.indexOf('ID');
  const i=vals.findIndex((r,rowIndex)=>rowIndex>0&&String(r[idCol]).trim()===String(id).trim());
  if(i<1)throw new Error('Guru tidak ditemukan.');
  sh.deleteRow(i+1);
  syncUsers_();
  writeLog_('ADMIN','DATA_GURU','Hapus guru '+id);
  return{success:true,message:'Data guru dihapus.'};
}
function saveSettings(p){const sh=getSS().getSheetByName(CONFIG.SHEETS.SETTING);setKey_(sh,'tagline',p.tagline||'');setKey_(sh,'instansi',p.instansi||'');return{success:true,message:'Pengaturan disimpan.'};}
function verifyAdminPin(pin){const saved=readSettings(getSS()).adminPin||'1234';if(String(pin)===String(saved))return{success:true,message:'Verifikasi berhasil.'};return{success:false,error:'Password Kepala Sekolah salah.'};}
