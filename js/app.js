/* GERAK iCARE - integrated frontend
   UI stays on the existing Pinterest/lavender dashboard.
   This file only connects existing views to the shared data model and analytics.
*/
let appData = emptyData();
let currentUser = null;
let currentFilter = "ALL";
let refreshTimer = null;
let loginGuruCache = [];
let analyticsPeriod = 7;
let navigationReady = false;
let formsReady = false;
let teacherModalReady = false;
let profileReady = false;
let ewsReady = false;

const ADMIN = { role:"admin", username:"kepala", name:"Kepala Sekolah", roleLabel:"Administrator" };
const MOOD_SCORE = {"Sangat Baik":4,"Baik":3,"Biasa Saja":2,"Biasa":2,"Kurang Baik":1,"Kurang":1,"Sangat Tidak Baik":0,"Sangat Kurang":0};
const STATUS = {
  green:{key:"AMAN",label:"Aman",icon:"🟢",cls:"safe"},
  yellow:{key:"PERHATIAN",label:"Perlu Perhatian",icon:"🟡",cls:"attention"},
  orange:{key:"WASPADA",label:"Waspada",icon:"🟠",cls:"warning"},
  red:{key:"PRIORITAS",label:"Prioritas Tindak Lanjut",icon:"🔴",cls:"priority"},
  gray:{key:"BELUM",label:"Belum Mengisi",icon:"⚪",cls:"unknown"}
};
const PM_FIELDS = [
  ["berkesadaran","Berkesadaran"],["bermakna","Bermakna"],["menyenangkan","Menyenangkan"],
  ["memahami","Memahami"],["mengaplikasi","Mengaplikasi"],["merefleksi","Merefleksi"],
  ["praktik_pedagogis","Praktik Pedagogis"],["kemitraan","Kemitraan Pembelajaran"],
  ["lingkungan_pembelajaran","Lingkungan Pembelajaran"],["teknologi_digital","Pemanfaatan Teknologi Digital"]
];

const DAILY_MOTIVATIONS = [
  ["Setiap langkah kecil dalam belajar dapat memberi dampak besar.", "GERAK iCARE"],
  ["Guru yang terus belajar membuka lebih banyak peluang bagi MURID untuk bertumbuh.", "GERAK iCARE"],
  ["Pembelajaran yang bermakna dimulai dari guru yang hadir dengan penuh kesadaran.", "GERAK iCARE"],
  ["Tidak harus sempurna hari ini. Yang penting terus bergerak dan memperbaiki.", "GERAK iCARE"],
  ["Satu praktik baik yang dibagikan dapat menjadi inspirasi bagi guru lain.", "GERAK iCARE"],
  ["Refleksi hari ini adalah bekal untuk pembelajaran yang lebih baik esok hari.", "GERAK iCARE"],
  ["Kelas yang hangat tumbuh dari guru yang mau mendengar, mencoba, dan belajar.", "GERAK iCARE"],
  ["Ide sederhana yang diterapkan dengan konsisten dapat menjadi perubahan yang berarti.", "GERAK iCARE"],
  ["Setiap MURID berhak mengalami pembelajaran yang bermakna, aman, dan menyenangkan.", "GERAK iCARE"],
  ["Jadikan tantangan pembelajaran sebagai kesempatan untuk menemukan cara baru.", "GERAK iCARE"],
  ["Hari ini adalah kesempatan baru untuk menciptakan satu pengalaman belajar yang berkesan.", "GERAK iCARE"],
  ["Guru bertumbuh ketika berani merefleksi, mencoba, dan berbagi praktik baik.", "GERAK iCARE"]
];

function showDailyMotivation(forceNew=false){
  const textEl=document.getElementById("guruMotivationText");
  const sourceEl=document.getElementById("guruMotivationSource");
  if(!textEl)return;
  let history=[];
  try{history=JSON.parse(sessionStorage.getItem("gerakICareMotivationHistory")||"[]");}catch(e){history=[];}
  let available=DAILY_MOTIVATIONS.map((_,i)=>i).filter(i=>!history.includes(i));
  if(!available.length){history=[];available=DAILY_MOTIVATIONS.map((_,i)=>i);}
  let last=Number(sessionStorage.getItem("gerakICareMotivationLast"));
  if(available.length>1 && Number.isInteger(last))available=available.filter(i=>i!==last);
  const index=available[Math.floor(Math.random()*available.length)];
  const item=DAILY_MOTIVATIONS[index];
  history.push(index);
  sessionStorage.setItem("gerakICareMotivationHistory",JSON.stringify(history));
  sessionStorage.setItem("gerakICareMotivationLast",String(index));
  textEl.textContent=item[0];
  if(sourceEl)sourceEl.textContent=item[1];
}

function emptyData(){return{settings:{},guruList:[],moodList:[],refleksiList:[],evaluasiList:[],ewsList:[],wellbeingList:[],implementasiPMList:[],tindakLanjutList:[]};}
function isAdmin(){return currentUser?.role==="admin";}
function safe(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function val(id){return document.getElementById(id)?.value||"";}
function showToast(msg){const t=document.getElementById("toast");if(!t)return;t.textContent=msg;t.classList.add("show");clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.classList.remove("show"),3200);}
function findGuru(id){return appData.guruList.map(normalizeGuru).find(g=>String(g.id)===String(id));}
function normalizeGuru(g){return{id:g?.id??g?.user_id??g?.ID??"",nama:g?.nama??g?.Nama??g?.name??"",nip:g?.nip??g?.NIP??"",mapel:g?.mapel??g?.Mapel??g?.mataPelajaran??"",kelas:g?.kelas??g?.Kelas??"",status:g?.status??g?.Status??"Aktif"};}
function normalizeData(data){return{settings:data?.settings||{},guruList:Array.isArray(data?.guruList)?data.guruList:[],moodList:Array.isArray(data?.moodList)?data.moodList:[],refleksiList:Array.isArray(data?.refleksiList)?data.refleksiList:[],evaluasiList:Array.isArray(data?.evaluasiList)?data.evaluasiList:[],ewsList:Array.isArray(data?.ewsList)?data.ewsList:[],wellbeingList:Array.isArray(data?.wellbeingList)?data.wellbeingList:[],implementasiPMList:Array.isArray(data?.implementasiPMList)?data.implementasiPMList:[],tindakLanjutList:Array.isArray(data?.tindakLanjutList)?data.tindakLanjutList:[]};}
function dateObj(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
function localKey(v=new Date()){const d=dateObj(v)||new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function todayKey(v=new Date()){return localKey(v);}
function dateOf(x){return x?.tanggal||x?.date||x?.timestamp||x?.last_update||x?.lastUpdate||x?.periode||x?.minggu||"";}
function formatDate(v){const d=dateObj(v);return d?d.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"—";}
function formatDateTime(v){const d=dateObj(v);return d?d.toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"—";}
function daysBack(n){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-n);return d;}
function rowUserId(x){return x?.user_id??x?.userId??x?.guruId??x?.Guru_ID??"";}
function rowName(x){return x?.nama_guru??x?.guruNama??x?.nama??x?.Nama??"";}
function moodScore(v){return MOOD_SCORE[String(v)] ?? (Number(v) || 0);}
function moodIcon(v){const s=moodScore(v);return s===4?"😄":s===3?"🙂":s===2?"😐":s===1?"😟":"😞";}
function statusRank(v){const s=typeof v==="string"?v:v?.key;return({AMAN:0,PERHATIAN:1,WASPADA:2,PRIORITAS:3,BELUM:0}[String(s).toUpperCase()]??0);}
function statusFromKey(key){if(!key)return STATUS.gray;const k=String(key).toUpperCase();if(k.includes("PRIORITAS"))return STATUS.red;if(k.includes("WASPADA"))return STATUS.orange;if(k.includes("PERHATIAN"))return STATUS.yellow;if(k.includes("AMAN"))return STATUS.green;return STATUS.gray;}
function statusFromScore(score){if(score>=85)return STATUS.green;if(score>=70)return STATUS.green;if(score>=60)return STATUS.yellow;if(score>=50)return STATUS.orange;return STATUS.red;}
function categoryWellbeing(v){if(v>=80)return["Sangat Baik","safe"];if(v>=70)return["Baik","safe"];if(v>=60)return["Perlu Perhatian","attention"];if(v>=50)return["Waspada","warning"];return["Prioritas Tindak Lanjut","priority"];}
function categoryPM(v){if(v>=85)return["Sangat Baik","safe"];if(v>=70)return["Baik","safe"];if(v>=55)return["Mulai Berkembang","attention"];if(v>=40)return["Perlu Penguatan","warning"];return["Prioritas Pendampingan","priority"];}
function categoryParticipation(v){if(v>=90)return["Sangat Baik","safe"];if(v>=75)return["Baik","safe"];if(v>=60)return["Perlu Perhatian","warning"];return["Rendah","priority"];}

// ---------- START / LOGIN ----------
document.addEventListener("DOMContentLoaded",()=>{
  setupLogin();
  const saved=sessionStorage.getItem("gerakICareUser");
  if(saved){try{const u=JSON.parse(saved);if(u?.role){currentUser=u;enterApplication();return;}}catch(e){sessionStorage.removeItem("gerakICareUser");}}
  showLogin();
});

function setupLogin(){
  document.querySelectorAll("[data-login-role]").forEach(btn=>btn.addEventListener("click",()=>selectLoginRole(btn.dataset.loginRole)));
  document.getElementById("loginForm")?.addEventListener("submit",handleLogin);
  document.getElementById("logoutButton")?.addEventListener("click",logout);
  document.getElementById("refreshLoginGuru")?.addEventListener("click",()=>loadLoginGuru(true));
  setupLoginLamp();
  loadLoginGuru(false);
}
function setupLoginLamp(){
  const screen=document.getElementById("loginScreen");
  const bulb=document.getElementById("bulb");
  const swing=document.getElementById("swing");
  if(!screen||!bulb||bulb.dataset.ready==="1")return;
  bulb.dataset.ready="1";
  const toggle=()=>{
    const on=screen.classList.toggle("light-on");
    if(swing){swing.classList.remove("animate");void swing.offsetWidth;swing.classList.add("animate");}
    bulb.setAttribute("aria-label",on?"Matikan lampu":"Nyalakan lampu");
  };
  bulb.addEventListener("click",toggle);
  bulb.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle();}});
}
function selectLoginRole(role){
  document.querySelectorAll("[data-login-role]").forEach(b=>b.classList.toggle("active",b.dataset.loginRole===role));
  document.getElementById("loginRole").value=role;
  document.getElementById("loginError").textContent="";
  const admin=role==="admin";
  const adminBox=document.getElementById("adminCredentials");
  const guruBox=document.getElementById("guruCredentials");
  const adminUsername=document.getElementById("loginUsername");
  const adminPassword=document.getElementById("loginPassword");
  const guruSelect=document.getElementById("loginGuru");

  if(adminBox)adminBox.hidden=!admin;
  if(guruBox)guruBox.hidden=admin;

  // Input yang sedang tidak digunakan harus dinonaktifkan agar atribut
  // required pada form Kepala Sekolah tidak menghalangi login Guru.
  if(adminUsername)adminUsername.disabled=!admin;
  if(adminPassword)adminPassword.disabled=!admin;
  if(adminUsername)adminUsername.required=admin;
  if(adminPassword)adminPassword.required=admin;
  if(guruSelect)guruSelect.disabled=admin;
  if(guruSelect)guruSelect.required=!admin;

  const button=document.getElementById("loginButton");
  if(button)button.textContent=admin?"Masuk sebagai Kepala Sekolah →":"Masuk sebagai Guru →";
}
async function loadLoginGuru(force=false){
  const select=document.getElementById("loginGuru");if(!select)return;
  if(!force&&select.options.length>1)return;
  try{
    const result=await getInitialData("public","");
    const rawGuru=result.data?.guruList || result.data?.guru || [];
    loginGuruCache=rawGuru.map(normalizeGuru).filter(g=>g.nama&&String(g.status).toLowerCase()!=="nonaktif");
    select.innerHTML=`<option value="">Pilih nama guru</option>`+loginGuruCache.map(g=>`<option value="${safe(g.id)}">${safe(g.nama)}</option>`).join("");
    document.getElementById("loginGuruStatus").textContent=loginGuruCache.length?`${loginGuruCache.length} nama guru tersedia`:'Belum ada data guru aktif';
  }catch(e){
    loginGuruCache=[];
    select.innerHTML='<option value="">Data guru belum tersedia</option>';
    document.getElementById("loginGuruStatus").textContent="Gagal memuat data guru. Periksa koneksi API.";
  }
}
async function handleLogin(e){
  e.preventDefault();
  const role=val("loginRole");document.getElementById("loginError").textContent="";
  try{
    if(role==="admin"){
      if(val("loginUsername")!=="kepala")throw new Error("Username Kepala Sekolah tidak sesuai.");
      await verifyAdminPin(val("loginPassword"));
      currentUser={...ADMIN,userId:"ADMIN"};
    }else{
      const userId=val("loginGuru"),guru=loginGuruCache.find(g=>String(g.id)===String(userId));
      if(!userId||!guru)throw new Error("Silakan pilih nama guru.");
      currentUser={role:"guru",userId:guru.id,name:guru.nama,roleLabel:"Guru"};
    }
    sessionStorage.setItem("gerakICareUser",JSON.stringify(currentUser));
    enterApplication();
  }catch(err){document.getElementById("loginError").textContent=err.message||"Login gagal.";}
}
function showLogin(){
  const screen=document.getElementById("loginScreen");
  document.getElementById("loginScreen").hidden=false;
  document.getElementById("appShell").hidden=true;
  screen?.classList.remove("light-on");
  selectLoginRole("admin");
  loadLoginGuru(false);
}
function enterApplication(){
  document.getElementById("loginScreen").hidden=true;document.getElementById("appShell").hidden=false;
  updateRoleUI();setupNavigation();setupForms();setupTeacherModal();setupSearch();setupProfilePhoto();setupEWSFilters();setupAnalyticsPeriod();setDate();showDailyMotivation();document.getElementById("newMotivationButton")?.addEventListener("click",()=>showDailyMotivation(true));loadDashboard();
}
function logout(){clearTimeout(refreshTimer);sessionStorage.removeItem("gerakICareUser");currentUser=null;showLogin();}
function updateRoleUI(){
  const admin=isAdmin();
  document.querySelectorAll("[data-role='admin']").forEach(el=>el.hidden=!admin);
  document.querySelectorAll("[data-role='guru']").forEach(el=>el.hidden=admin);
  const name=currentUser?.name||"Pengguna";
  const initials=admin?"KS":name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"G";
  ["profileAvatar","sideProfileInitial","photoPreviewInitial"].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=initials;});
  document.getElementById("profileName").textContent=name;document.getElementById("profileRole").textContent=currentUser?.roleLabel||"";
  document.getElementById("sideProfileName").textContent=name;document.getElementById("sideProfileRole").textContent=currentUser?.roleLabel||"";
  document.getElementById("dashboardName").textContent=admin?"Kepala Sekolah":name.split(/\s+/)[0];
  document.getElementById("roleBadge").textContent=admin?"KEPALA SEKOLAH • EWS":"GURU • RUANG REFLEKSI";
  document.getElementById("tagline").textContent=admin?"Pantau kondisi guru dengan data yang hangat, sederhana, dan mudah ditindaklanjuti.":"Ruang pribadi untuk memantau kondisi, refleksi, dan kebutuhan dukungan Anda.";
  document.getElementById("globalSearch").placeholder=admin?"Cari guru atau status EWS...":"Cari menu...";
  loadProfilePhoto();
}
function setDate(){document.getElementById("currentDate").textContent=new Date().toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});const e=document.getElementById("refleksiTanggal");if(e&&!e.value)e.value=todayKey();}

// ---------- PROFILE PHOTO ----------
function profilePhotoKey(){return`gerakICareProfilePhoto:${currentUser?.role||"user"}:${currentUser?.userId||"unknown"}`;}
function loadProfilePhoto(){
  const photo=localStorage.getItem(profilePhotoKey())||"";
  ["profilePhoto","sideProfilePhoto","photoPreview"].forEach(id=>{const el=document.getElementById(id);if(!el)return;if(photo){el.src=photo;el.classList.add("has-photo");}else{el.removeAttribute("src");el.classList.remove("has-photo");}});
  const initials=document.getElementById("profileAvatar")?.textContent||"G";["sideProfileInitial","photoPreviewInitial"].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=initials;});
}
function openProfilePhotoModal(){if(currentUser?.role!=="guru")return;window._pendingProfilePhoto=null;loadProfilePhoto();document.getElementById("profilePhotoModal")?.classList.add("show");}
function closeProfilePhotoModal(){document.getElementById("profilePhotoModal")?.classList.remove("show");}
function setupProfilePhoto(){
  if(profileReady)return;profileReady=true;
  document.getElementById("topProfileButton")?.addEventListener("click",openProfilePhotoModal);
  document.getElementById("sideProfileButton")?.addEventListener("click",openProfilePhotoModal);
  document.getElementById("profilePhotoClose")?.addEventListener("click",closeProfilePhotoModal);
  document.getElementById("profilePhotoModal")?.addEventListener("click",e=>{if(e.target.id==="profilePhotoModal")closeProfilePhotoModal();});
  document.getElementById("profilePhotoInput")?.addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/"))return showToast("Pilih file gambar.");if(file.size>4*1024*1024)return showToast("Ukuran foto maksimal 4 MB.");const reader=new FileReader();reader.onload=()=>{const img=document.getElementById("photoPreview");img.src=reader.result;img.classList.add("has-photo");window._pendingProfilePhoto=reader.result;};reader.readAsDataURL(file);});
  document.getElementById("saveProfilePhoto")?.addEventListener("click",()=>{if(window._pendingProfilePhoto)localStorage.setItem(profilePhotoKey(),window._pendingProfilePhoto);window._pendingProfilePhoto=null;loadProfilePhoto();closeProfilePhotoModal();showToast("Foto profil berhasil diperbarui.");});
  document.getElementById("removeProfilePhoto")?.addEventListener("click",()=>{localStorage.removeItem(profilePhotoKey());window._pendingProfilePhoto=null;loadProfilePhoto();showToast("Foto profil dikembalikan ke inisial.");});
}

// ---------- NAVIGATION ----------
function setupNavigation(){
  if(navigationReady)return;navigationReady=true;
  document.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b&&b.dataset.page)showPage(b.dataset.page);});
  document.getElementById("themeButton")?.addEventListener("click",()=>document.body.classList.toggle("dark-mode"));
  document.getElementById("notificationButton")?.addEventListener("click",()=>showPage("warning"));
}
function showPage(page){
  const allowed=isAdmin()?["dashboard","guru","warning","pengaturan"]:["dashboard","mood","refleksi","evaluasi"];
  if(!allowed.includes(page))page="dashboard";
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(page+"Page")?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  if(page==="guru")renderGuruTable();if(page==="warning")renderEWSPage();if(page==="dashboard")renderDashboard();window.scrollTo({top:0,behavior:"smooth"});
}

// ---------- LOAD / SYNC ----------
async function loadDashboard(){
  setConnection("Menghubungkan...","Memuat");
  try{
    const result=await getInitialData(currentUser?.role||"public",currentUser?.userId||"");
    appData=normalizeData(result.data||{});setConnection("Terhubung","Normal");applySettings();renderDashboard();setupAutoRefresh();
  }catch(err){console.error(err);setConnection("Gagal terhubung","Periksa API");appData=emptyData();renderDashboard();showToast("Apps Script tidak dapat dihubungi. Periksa URL API dan deployment.");}
}
function setupAutoRefresh(){clearTimeout(refreshTimer);if(isAdmin())refreshTimer=setTimeout(loadDashboard,60000);}
function setConnection(a,b){const c=document.getElementById("connectionStatus"),p=document.getElementById("systemPill"),d=document.getElementById("connectionDot");if(c)c.textContent=a;if(p)p.textContent=b;if(d)d.style.background=a==="Terhubung"?"#56bf82":"#e6b24a";}
function applySettings(){const s=appData.settings||{};if(s.instansi)document.title=`GERAK iCARE — ${s.instansi}`;if(document.getElementById("settingsTagline"))document.getElementById("settingsTagline").value=s.tagline||"";if(document.getElementById("settingsInstansi"))document.getElementById("settingsInstansi").value=s.instansi||"";}
function renderDashboard(){isAdmin()?renderAdminDashboard():renderGuruDashboard();}

// ---------- EWS CLIENT FALLBACK ----------
function getEWS(userId){
  const rows=appData.ewsList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(b.last_update||b.timestamp)-new Date(a.last_update||a.timestamp));
  if(rows[0])return{...rows[0],status:statusFromKey(rows[0].status),score:Number(rows[0].ews_score||0)};
  const g=findGuru(userId);return computeEWSClient(userId,g?.nama||"");
}
function computeEWSClient(userId,name){
  const moods=appData.moodList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)));
  const refs=appData.refleksiList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)));
  const evals=appData.evaluasiList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)));
  const recent5=moods.filter(x=>new Date(dateOf(x))>=daysBack(4));const low=recent5.filter(x=>moodScore(x.mood)<=1);
  let consecutive=0;for(let i=0;i<5;i++){const d=new Date();d.setDate(d.getDate()-i);const k=todayKey(d);if(moods.some(x=>todayKey(dateOf(x))===k&&moodScore(x.mood)<=1))consecutive++;else break;}
  const recentRefs=refs.filter(x=>new Date(dateOf(x))>=daysBack(6));
  const problems=recentRefs.filter(x=>x.beban_kerja==="Berat"||x.kondisi_pembelajaran==="Mengalami Kendala"||["Perlu diskusi","Perlu dukungan Kepala Sekolah","Perlu bantuan segera"].includes(x.dukungan));
  const urgent=recentRefs.some(x=>x.dukungan==="Perlu bantuan segera");const discussion=recentRefs.some(x=>x.dukungan==="Perlu diskusi");
  const ev=evals[0];const evTotal=ev?Number(ev.total_score||0):null;
  let risk=0,triggers=[];
  if(low.length>=3){risk=3;triggers.push("Mood rendah ≥3 kali dalam 5 hari");}if(consecutive>=2){risk=3;triggers.push("Mood rendah ≥2 hari berturut-turut");}if(urgent){risk=3;triggers.push("Memilih Perlu bantuan segera");}if(evTotal!==null&&evTotal<=8){risk=3;triggers.push("Evaluasi mingguan ≤8");}
  if(risk<3){if(low.length>=2){risk=2;triggers.push("Mood rendah 2 kali dalam 5 hari");}if(problems.length>=2){risk=2;triggers.push("Refleksi bermasalah ≥2 kali");}if(evTotal!==null&&evTotal>=9&&evTotal<=12){risk=2;triggers.push("Evaluasi mingguan 9–12");}if(discussion){risk=2;triggers.push("Meminta diskusi dengan Kepala Sekolah");}}
  if(risk<2){if(moods.some(x=>moodScore(x.mood)===2)){risk=1;triggers.push("Mood Biasa Saja muncul pada periode pengamatan");}if(recentRefs.some(x=>x.kondisi_pembelajaran==="Mengalami Kendala"||x.beban_kerja==="Berat")){risk=1;triggers.push("Terdapat kendala pembelajaran/beban kerja");}if(evTotal!==null&&evTotal>=13&&evTotal<=16){risk=1;triggers.push("Evaluasi mingguan 13–16");}}
  const moodNorm=moods.length?moods.slice(0,5).reduce((s,x)=>s+moodScore(x.mood),0)/Math.min(moods.length,5)/4*100:null;
  const refNorm=refs.length?refs.slice(0,5).reduce((s,x)=>s+Number(x.reflection_score||0),0)/Math.min(refs.length,5)/9*100:null;
  const evalNorm=evTotal!==null?evTotal/20*100:null;let weighted=0,w=0;if(moodNorm!=null){weighted+=moodNorm*.4;w+=.4;}if(refNorm!=null){weighted+=refNorm*.3;w+=.3;}if(evalNorm!=null){weighted+=evalNorm*.3;w+=.3;}
  const score=w?Math.round(weighted/w):0;const st=risk===3?STATUS.red:risk===2?STATUS.orange:risk===1?STATUS.yellow:(!moods.length&&!refs.length&&!evals.length?STATUS.gray:STATUS.green);
  return{user_id:userId,nama_guru:name,ews_score:score,status:st,trigger:triggers.join("; ")||"Tidak ada pemicu warning",trend:"Stabil",last_update:dateOf(moods[0]||refs[0]||evals[0])||""};
}

// ---------- ADMIN DASHBOARD ----------
function renderAdminDashboard(){
  const gurus=activeGurus(),ew=gurus.map(g=>getEWS(g.id));const counts={AMAN:0,PERHATIAN:0,WASPADA:0,PRIORITAS:0,BELUM:0};ew.forEach(e=>counts[e.status.key]++);
  setText("totalGuru",gurus.length);setText("safeCount",counts.AMAN);setText("attentionCount",counts.PERHATIAN);setText("warningCount",counts.WASPADA);setText("priorityCount",counts.PRIORITAS);setText("notFilledCount",counts.BELUM);
  setText("ringSafe",counts.AMAN);setText("ringAttention",counts.PERHATIAN);setText("ringWarning",counts.WASPADA);setText("ringPriority",counts.PRIORITAS);setText("ewsStablePercent",gurus.length?Math.round(counts.AMAN/gurus.length*100)+"%":"0%");setText("notificationBadge",counts.PRIORITAS+counts.WASPADA);
  const priority=counts.PRIORITAS;setText("alertText",priority?`${priority} guru memerlukan tindak lanjut.`:"Tidak ada guru yang masuk Prioritas Tindak Lanjut.");document.getElementById("alertBox")?.classList.toggle("is-active",priority>0);
  renderAdminTrend();renderAdminRecent();renderGuruTable();renderEWSPage();renderAnalytics();
}
function activeGurus(){return appData.guruList.map(normalizeGuru).filter(g=>g.nama&&String(g.status).toLowerCase()!=="nonaktif");}
function setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function renderAdminRecent(){const list=document.getElementById("adminRecentList");if(!list)return;const rows=appData.ewsList.slice().sort((a,b)=>new Date(b.last_update||b.timestamp)-new Date(a.last_update||a.timestamp)).slice(0,6);list.innerHTML=rows.length?rows.map(x=>{const st=statusFromKey(x.status);return`<div class="recent-row"><div><strong>${safe(x.nama_guru)}</strong><small>${safe(x.trigger||"Tidak ada pemicu khusus")}</small></div><span class="status-badge ${st.cls}">${st.icon} ${st.label}</span><time>${formatDateTime(x.last_update)}</time></div>`}).join(""):`<div class="empty">Belum ada aktivitas EWS.</div>`;}
function renderAdminTrend(){const svg=document.getElementById("ewsTrendChart"),labels=document.getElementById("ewsTrendLabels");if(!svg||!labels)return;const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d);}const gurus=activeGurus();const values=days.map(d=>{let t=0,n=0;gurus.forEach(g=>{const h=appData.ewsList.filter(x=>String(rowUserId(x))===String(g.id)&&todayKey(x.periode||x.last_update)===todayKey(d)).sort((a,b)=>new Date(b.last_update)-new Date(a.last_update))[0];if(h){t+=statusRank(h.status);n++;}});return n?t/n:0;});const pts=values.map((v,i)=>`${i*116.6} ${190-v*48}`).join(" ");const d=pts?"M"+pts.split(" ").map((p,i)=>i?"L"+p:p).join(" "):"";svg.innerHTML=d?`<path d="M0 190 L700 190" stroke="#e8eef5" stroke-width="2"/><path d="${d}" fill="none" stroke="#8a5de8" stroke-width="4" stroke-linecap="round"/>${values.map((v,i)=>`<circle cx="${i*116.6}" cy="${190-v*48}" r="4" fill="#8a5de8"/>`).join("")}`:`<text x="350" y="110" text-anchor="middle" fill="#8ca5c1" font-size="12">Belum ada histori EWS</text>`;labels.innerHTML=days.map(d=>`<span>${d.toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</span>`).join("");}

// ---------- ANALYTICS ----------
function setupAnalyticsPeriod(){document.querySelectorAll("[data-analytics-period]").forEach(b=>b.addEventListener("click",()=>{analyticsPeriod=Number(b.dataset.analyticsPeriod);document.querySelectorAll("[data-analytics-period]").forEach(x=>x.classList.toggle("active",x===b));renderAnalytics();}));}
function withinPeriod(v,days=analyticsPeriod){const d=dateObj(v);return d&&d>=daysBack(days-1);}
function latestByUser(rows,userId){return rows.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)))[0];}
function participationData(days=analyticsPeriod){const gurus=activeGurus(),daily=[];for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=todayKey(d);const ids=new Set([...appData.moodList,...appData.refleksiList,...appData.evaluasiList].filter(x=>todayKey(dateOf(x))===k).map(rowUserId).filter(Boolean).map(String));daily.push({key:k,value:gurus.length?ids.size/gurus.length*100:0,count:ids.size});}return daily;}
function todayParticipation(){const gurus=activeGurus(),ids=new Set([...appData.moodList,...appData.refleksiList,...appData.evaluasiList].filter(x=>todayKey(dateOf(x))===todayKey()).map(rowUserId).filter(Boolean).map(String));return{total:gurus.length,filled:ids.size,notFilled:Math.max(gurus.length-ids.size,0),pct:gurus.length?ids.size/gurus.length*100:0};}
function wellbeingForGuru(userId){
  const moods=appData.moodList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a))).slice(0,5);
  const refs=appData.refleksiList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a))).slice(0,5);
  const evals=appData.evaluasiList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)));
  const ev=evals[0];const m=moods.length?moods.reduce((s,x)=>s+moodScore(x.mood),0)/moods.length/4*100:null;const r=refs.length?refs.reduce((s,x)=>s+Number(x.reflection_score||0),0)/refs.length/9*100:null;const w=ev?Number(ev.total_score||0)/20*100:null;let total=0,weight=0;if(m!=null){total+=m*.4;weight+=.4;}if(r!=null){total+=r*.3;weight+=.3;}if(w!=null){total+=w*.3;weight+=.3;}const score=weight?total/weight:null;const cat=score==null?["Belum ada data","unknown"]:categoryWellbeing(score);return{score,category:cat[0],cls:cat[1],mood:m,reflection:r,weekly:w};
}
function pmForGuru(userId){
  const rows=appData.implementasiPMList.filter(x=>String(rowUserId(x))===String(userId));
  const refs=appData.refleksiList.filter(x=>String(rowUserId(x))===String(userId)&&PM_FIELDS.every(([k])=>x[k]!==undefined&&x[k]!==""));
  const source=rows.length?rows:refs.map(x=>{const vals=PM_FIELDS.map(([k])=>Number(x[k]));const total=vals.reduce((a,b)=>a+b,0);return{...x,total_score:total,percentage:total/24*100};});
  const latest=source.sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)))[0];if(!latest)return{score:null,category:"Belum ada data",cls:"unknown",indicators:{}};const indicators={};PM_FIELDS.forEach(([k,label])=>indicators[label]=Number(latest[k]||0)/4*100);const score=Number(latest.percentage??(Number(latest.total_score||0)/24*100));const cat=categoryPM(score);return{score,category:cat[0],cls:cat[1],indicators};
}
function renderAnalytics(){if(!isAdmin())return;const p=todayParticipation();const pc=categoryParticipation(p.pct);setText("participationValue",Math.round(p.pct)+"%");setText("participationLabel",`${p.filled} dari ${p.total} guru mengisi`);setText("participationCategory",pc[0]);setText("filledToday",p.filled);setText("notFilledToday",p.notFilled);drawLine("participationChart","participationLabels",participationData(analyticsPeriod),"#8a5de8",100);
  const gurus=activeGurus(),wb=gurus.map(g=>wellbeingForGuru(g.id)).filter(x=>x.score!=null),pm=gurus.map(g=>pmForGuru(g.id)).filter(x=>x.score!=null);const wbAvg=wb.length?wb.reduce((s,x)=>s+x.score,0)/wb.length:0;const pmAvg=pm.length?pm.reduce((s,x)=>s+x.score,0)/pm.length:0;const wbCat=categoryWellbeing(wbAvg),pmCat=categoryPM(pmAvg);setText("wellbeingValue",wb.length?Math.round(wbAvg)+"%":"0%");setText("wellbeingLabel",wb.length?wbCat[0]:"Belum ada data");setText("wellbeingCategory",wb.length?wbCat[0]:"—");setText("pmValue",pm.length?Math.round(pmAvg)+"%":"0%");setText("pmLabel",pm.length?pmCat[0]:"Belum ada data");setText("pmCategory",pm.length?pmCat[0]:"—");setText("pmAverage",pm.length?Math.round(pmAvg)+"%":"0%");
  drawLine("wellbeingChart","wellbeingLabels",wellbeingTrend(analyticsPeriod),"#ef8f9d",100);renderWellbeingDistribution(wb);renderMoodDistribution();renderPMBars(pm);renderRecommendations(gurus);renderFollowUpSummary();
  const ews=gurus.map(g=>getEWS(g.id));const active=ews.filter(x=>x.status.key!=="AMAN"&&x.status.key!=="BELUM").length;setText("ewsValue",active);setText("ewsLabel",`${ews.filter(x=>x.status.key==="PRIORITAS").length} prioritas · ${ews.filter(x=>x.status.key==="WASPADA").length} waspada`);
}
function drawLine(svgId,labelId,data,stroke,max){const svg=document.getElementById(svgId),lab=document.getElementById(labelId);if(!svg||!lab)return;if(!data.length){svg.innerHTML="";lab.innerHTML="";return;}const pts=data.map((x,i)=>`${data.length===1?350:i*(700/(data.length-1))} ${175-(Math.max(0,Math.min(max,x.value))/max*145)}`).join(" ");const path="M"+pts.split(" ").map((p,i)=>i?"L"+p:p).join(" ");svg.innerHTML=`<path d="M0 175 L700 175" stroke="#e8eef5" stroke-width="2"/><path d="${path}" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${data.map((x,i)=>`<circle cx="${data.length===1?350:i*(700/(data.length-1))}" cy="${175-(Math.max(0,Math.min(max,x.value))/max*145)}" r="3.5" fill="${stroke}"/>`).join("")}`;lab.innerHTML=data.filter((_,i)=>data.length<=10||i%Math.ceil(data.length/7)===0).map(x=>`<span>${new Date(x.key).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</span>`).join("");}
function wellbeingTrend(days){const out=[];const gurus=activeGurus();for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=todayKey(d);const vals=gurus.map(g=>{const moods=appData.moodList.filter(x=>String(rowUserId(x))===String(g.id)&&todayKey(dateOf(x))<=k).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a))).slice(0,5);const refs=appData.refleksiList.filter(x=>String(rowUserId(x))===String(g.id)&&todayKey(dateOf(x))<=k).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a))).slice(0,5);const ev=appData.evaluasiList.filter(x=>String(rowUserId(x))===String(g.id)&&todayKey(dateOf(x))<=k).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)))[0];let s=0,w=0;if(moods.length){s+=moods.reduce((a,x)=>a+moodScore(x.mood),0)/moods.length/4*100*.4;w+=.4;}if(refs.length){s+=refs.reduce((a,x)=>a+Number(x.reflection_score||0),0)/refs.length/9*100*.3;w+=.3;}if(ev){s+=Number(ev.total_score||0)/20*100*.3;w+=.3;}return w?s/w:null;}).filter(v=>v!=null);out.push({key:k,value:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0});}return out;}
function renderMoodDistribution(){const rows=appData.moodList.filter(x=>withinPeriod(dateOf(x),analyticsPeriod));const counts={"Sangat Baik":0,"Baik":0,"Biasa Saja":0,"Kurang Baik":0,"Sangat Tidak Baik":0};rows.forEach(x=>{const k=counts[x.mood]!==undefined?x.mood:(moodScore(x.mood)>=4?"Sangat Baik":moodScore(x.mood)===3?"Baik":moodScore(x.mood)===2?"Biasa Saja":moodScore(x.mood)===1?"Kurang Baik":"Sangat Tidak Baik");counts[k]++;});const total=rows.length,positive=total?(counts["Sangat Baik"]+counts["Baik"])/total*100:0;setText("moodPositiveLabel",Math.round(positive)+"% positif");setText("moodDonutValue",Math.round(positive)+"%");const colors=["#7f62dc","#9a7bea","#f3bf64","#ef8f9d","#b8b4ea"];let start=0;const stops=Object.entries(counts).map(([k,v],i)=>{const pct=total?v/total*100:0;const a=start;start+=pct;return`${colors[i]} ${a}% ${start}%`;}).join(", ");const donut=document.getElementById("moodDonut");if(donut)donut.style.background=total?`conic-gradient(${stops})`:"#ece7f8";const legend=document.getElementById("moodLegend");if(legend)legend.innerHTML=Object.entries(counts).map(([k,v],i)=>`<div><i style="background:${colors[i]}"></i><span>${moodIcon(k)} ${safe(k)}</span><b>${total?Math.round(v/total*100):0}%</b></div>`).join("");}
function renderWellbeingDistribution(wb){const box=document.getElementById("wellbeingDistribution");if(!box)return;const cats={"Sangat Baik":0,"Baik":0,"Perlu Perhatian":0,"Waspada":0,"Prioritas Tindak Lanjut":0};wb.forEach(x=>cats[x.category]=(cats[x.category]||0)+1);const total=wb.length;box.innerHTML=Object.entries(cats).map(([k,v])=>`<div class="dist-item"><span>${safe(k)}</span><b>${total?Math.round(v/total*100):0}%</b><i><em style="width:${total?v/total*100:0}%"></em></i></div>`).join("");}
function renderPMBars(pm){const box=document.getElementById("pmBars");if(!box)return;const avg={};PM_FIELDS.forEach(([k,label])=>{const vals=pm.map(x=>x.indicators[label]).filter(v=>v!=null);avg[label]=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;});box.innerHTML=PM_FIELDS.map(([k,label])=>`<div class="pm-bar"><div><span>${safe(label)}</span><b>${Math.round(avg[label])}%</b></div><i><em style="width:${avg[label]}%"></em></i></div>`).join("");}
function buildRecommendation(g){const e=getEWS(g.id),w=wellbeingForGuru(g.id),pm=pmForGuru(g.id),parts=participationForGuru(g.id);const factors=[],recs=[],actions=[];if(e.status.key==="PRIORITAS"){factors.push(e.trigger||"EWS prioritas");recs.push("Segera lakukan komunikasi individual.");actions.push("Komunikasi");}else if(e.status.key==="WASPADA"){factors.push(e.trigger||"EWS waspada");recs.push("Jadwalkan coaching atau pendampingan.");actions.push("Coaching");}else if(e.status.key==="PERHATIAN"){factors.push(e.trigger||"EWS perlu perhatian");recs.push("Lakukan monitoring dan dukungan ringan.");actions.push("Monitoring");}if(w.score!=null&&w.score<60){factors.push(`Wellbeing ${Math.round(w.score)}%`);recs.push("Lakukan komunikasi suportif untuk memahami kebutuhan dukungan guru.");actions.push("Check-in");}if(pm.score!=null&&pm.score<55){factors.push(`Implementasi PM ${Math.round(pm.score)}%`);recs.push("Berikan penguatan pada aspek Pembelajaran Mendalam yang memiliki skor rendah.");actions.push("Coaching pembelajaran");}if(pm.indicators?.Merefleksi<60){factors.push("Aspek Merefleksi relatif rendah");recs.push("Perkuat strategi refleksi pembelajaran MURID.");actions.push("Coaching/refleksi bersama");}if(pm.indicators?.Mengaplikasi<60){factors.push("Aspek Mengaplikasi relatif rendah");recs.push("Perkuat aktivitas pembelajaran berbasis masalah atau konteks nyata.");actions.push("Pendampingan perencanaan");}if(parts.pct<60){factors.push("Partisipasi pengisian rendah");recs.push("Periksa hambatan pengisian dan lakukan komunikasi kepada guru yang belum berpartisipasi.");actions.push("Reminder/pemantauan");}if(!factors.length){factors.push("Tidak ada faktor prioritas yang terdeteksi.");recs.push("Pertahankan praktik baik dan berikan apresiasi.");actions.push("Rutin");}const priority=e.status.key==="PRIORITAS"||w.score<50||e.trigger?.includes("bantuan segera")?1:e.status.key==="WASPADA"||(w.score>=50&&w.score<60)||(pm.score!=null&&pm.score<55)?2:e.status.key==="PERHATIAN"||(w.score>=60&&w.score<70)||(pm.score!=null&&pm.score<70)?3:4;return{priority,factors,recs,actions,status:e.status};}
function participationForGuru(userId){const gurus=activeGurus();const rows=[...appData.moodList,...appData.refleksiList,...appData.evaluasiList].filter(x=>String(rowUserId(x))===String(userId)&&todayKey(dateOf(x))===todayKey());return{pct:rows.length?100:0};}
function renderRecommendations(gurus){const box=document.getElementById("recommendationList");if(!box)return;const recs=gurus.map(g=>({...buildRecommendation(g),g})).sort((a,b)=>a.priority-b.priority).filter(x=>x.priority<4).slice(0,5);box.innerHTML=recs.length?recs.map(x=>`<button class="recommendation-row-v4" data-ewsd="${safe(x.g.id)}"><span class="priority-dot p${x.priority}">${x.priority===1?"🔴":x.priority===2?"🟠":x.priority===3?"🟡":"🟢"}</span><div><strong>${safe(x.g.nama)}</strong><small>${safe(x.factors[0])}</small></div><span>→</span></button>`).join(""):`<div class="empty">Belum ada rekomendasi prioritas.</div>`;}
function renderFollowUpSummary(){const rows=appData.tindakLanjutList||[],open=rows.filter(x=>!String(x.status||"").toLowerCase().includes("selesai"));setText("followUpOpenCount",`${open.length} terbuka`);const box=document.getElementById("followUpSummary");if(!box)return;const order=["Belum ditindaklanjuti","Sudah dikomunikasikan","Coaching","Pendampingan","Perlu Pemantauan","Selesai"];const counts=Object.fromEntries(order.map(k=>[k,0]));rows.forEach(x=>{if(counts[x.status]!==undefined)counts[x.status]++;});box.innerHTML=order.map(k=>`<div><span>${safe(k)}</span><b>${counts[k]}</b></div>`).join("");}

// ---------- EWS PAGE / DETAIL ----------
function renderEWSPage(){
  if(!isAdmin())return;const body=document.getElementById("ewsTableBody");if(!body)return;const list=activeGurus().map(g=>({g,e:getEWS(g.id)})).filter(x=>currentFilter==="ALL"||x.e.status.key===currentFilter);body.innerHTML=list.length?list.map(x=>`<tr><td><button class="link-button" data-ewsd="${safe(x.g.id)}">${safe(x.g.nama)}</button></td><td><span class="status-badge ${x.e.status.cls}">${x.e.status.icon} ${x.e.status.label}</span></td><td>${safe(x.e.trigger||"—")}</td><td>${formatDateTime(x.e.last_update)}</td><td><button class="action-btn" data-ewsd="${safe(x.g.id)}">Detail / Tindak Lanjut</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty">Tidak ada data sesuai filter.</td></tr>`;document.querySelectorAll("[data-ewsf]").forEach(b=>b.classList.toggle("active",b.dataset.ewsf===currentFilter));}
function setupEWSFilters(){if(ewsReady)return;ewsReady=true;document.querySelectorAll("[data-ewsf]").forEach(b=>b.addEventListener("click",()=>{currentFilter=b.dataset.ewsf;renderEWSPage();}));document.getElementById("detailClose")?.addEventListener("click",closeDetail);document.getElementById("detailModal")?.addEventListener("click",e=>{if(e.target.id==="detailModal")closeDetail();});document.addEventListener("click",e=>{const d=e.target.closest("[data-ewsd]");if(d&&d.dataset.ewsd)openGuruDetail(d.dataset.ewsd);});}
function openGuruDetail(userId){if(!isAdmin())return;const g=findGuru(userId);if(!g)return;const e=getEWS(userId),w=wellbeingForGuru(userId),pm=pmForGuru(userId);const moods=appData.moodList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a))).slice(0,7);const refs=appData.refleksiList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a))).slice(0,5);const evals=appData.evaluasiList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a))).slice(0,3);const rec=buildRecommendation(g);const tl=appData.tindakLanjutList.filter(x=>String(rowUserId(x))===String(userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a))).slice(0,6);document.getElementById("detailContent").innerHTML=`<div class="detail-profile"><div class="detail-avatar">${safe(g.nama.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase())}</div><div><h3>${safe(g.nama)}</h3><p>${safe(g.mapel||"Guru")} · ${safe(g.kelas||"")}</p></div><span class="status-badge ${e.status.cls}">${e.status.icon} ${e.status.label}</span></div><div class="detail-kpis"><div><small>EWS</small><strong>${Math.round(e.score||0)}</strong><span>/100</span></div><div><small>Wellbeing</small><strong>${w.score==null?"—":Math.round(w.score)+"%"}</strong><span>${safe(w.category)}</span></div><div><small>Implementasi PM</small><strong>${pm.score==null?"—":Math.round(pm.score)+"%"}</strong><span>${safe(pm.category)}</span></div></div><div class="detail-section"><h4>Pemicu & Rekomendasi</h4><p>${safe(e.trigger||"Tidak ada pemicu khusus.")}</p><ul>${rec.recs.slice(0,4).map(x=>`<li>${safe(x)}</li>`).join("")}</ul></div><div class="detail-section"><h4>Implementasi Pembelajaran Mendalam</h4><div class="detail-bars">${PM_FIELDS.map(([k,label])=>`<div><span>${safe(label)}</span><b>${pm.indicators?.[label]!=null?Math.round(pm.indicators[label]):0}%</b><i><em style="width:${pm.indicators?.[label]||0}%"></em></i></div>`).join("")}</div></div><div class="detail-section"><h4>Riwayat Mood</h4><div class="detail-mood-history">${moods.map(x=>`<span>${moodIcon(x.mood)} ${safe(x.mood)} <small>${formatDate(x.tanggal)}</small></span>`).join("")||"Belum ada data."}</div></div><div class="detail-section"><h4>Ringkasan Refleksi</h4><div class="detail-reflections">${refs.map(x=>`<div><strong>${formatDate(x.tanggal)}</strong><span>Beban: ${safe(x.beban_kerja||"—")}</span><span>Pembelajaran: ${safe(x.kondisi_pembelajaran||"—")}</span><span>Dukungan: ${safe(x.dukungan||"—")}</span></div>`).join("")||"Belum ada data."}</div></div><div class="detail-section"><h4>Evaluasi Mingguan</h4><div class="detail-reflections">${evals.map(x=>`<div><strong>${safe(x.minggu||formatDate(x.timestamp))}</strong><span>Total: ${safe(x.total_score||0)}/20</span></div>`).join("")||"Belum ada data."}</div></div><div class="detail-section"><h4>Riwayat Tindak Lanjut</h4><div class="detail-reflections">${tl.map(x=>`<div><strong>${safe(x.status||"—")}</strong><span>${safe(x.jenis_tindak_lanjut||x.jenis||"—")}</span><small>${formatDate(x.tanggal)}</small></div>`).join("")||"Belum ada tindak lanjut."}</div></div><div class="detail-section follow-form-section"><h4>Tambah Tindak Lanjut</h4><form id="followForm"><input type="hidden" id="followGuruId" value="${safe(userId)}"><label>Jenis<select id="followJenis"><option>Sudah dikomunikasikan</option><option>Coaching</option><option>Pendampingan</option><option>Berbagi Praktik Baik</option><option>Monitoring</option><option>Lainnya</option></select></label><label>Status<select id="followStatus"><option>Belum ditindaklanjuti</option><option>Sudah dikomunikasikan</option><option>Coaching</option><option>Pendampingan</option><option>Selesai</option><option>Perlu Pemantauan</option></select></label><label>Catatan<textarea id="followCatatan" rows="4" placeholder="Catatan tindak lanjut..."></textarea></label><label>Tanggal monitoring berikutnya<input id="followMonitoring" type="date"></label><button class="primary-cta" type="submit">Simpan Tindak Lanjut →</button></form></div>`;document.getElementById("detailModal")?.classList.add("show");document.getElementById("followForm")?.addEventListener("submit",saveFollowUp);}
function closeDetail(){document.getElementById("detailModal")?.classList.remove("show");}
async function saveFollowUp(e){e.preventDefault();const g=findGuru(val("followGuruId"));if(!g)return;try{const rec=buildRecommendation(g);await saveTindakLanjut({ewsId:getEWS(g.id).id||"",userId:g.id,namaGuru:g.nama,tanggal:todayKey(),jenisTindakLanjut:val("followJenis"),rekomendasi:rec.recs[0]||"",catatan:val("followCatatan"),status:val("followStatus"),tanggalMonitoring:val("followMonitoring")});closeDetail();await loadDashboard();showToast("Tindak lanjut berhasil disimpan.");}catch(err){showToast("Tindak lanjut gagal disimpan: "+err.message);}}

// ---------- GURU DASHBOARD ----------
function renderGuruDashboard(){
  const g=findGuru(currentUser.userId),e=getEWS(currentUser.userId);const moods=appData.moodList.filter(x=>String(rowUserId(x))===String(currentUser.userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)));const evals=appData.evaluasiList.filter(x=>String(rowUserId(x))===String(currentUser.userId)).sort((a,b)=>new Date(dateOf(b))-new Date(dateOf(a)));const w=wellbeingForGuru(currentUser.userId),pm=pmForGuru(currentUser.userId);
  document.getElementById("guruOwnStatus").innerHTML=`<span class="status-badge large ${e.status.cls}">${e.status.icon} ${e.status.label}</span>`;setText("guruOwnScore",Math.round(e.score||0));setText("guruOwnScoreLarge",Math.round(e.score||0));setText("guruOwnTrigger",e.trigger||"Belum ada data.");setText("guruOwnTrend",e.trend||"Stabil");setText("guruStatusShort",e.status.label==="Prioritas Tindak Lanjut"?"Prioritas":e.status.label);setText("guruStatusHint",e.trigger||"Kondisi stabil");setText("guruMoodValue",moods[0]?.mood||"—");setText("guruMoodDate",moods[0]?formatDateTime(dateOf(moods[0])):"Belum mengisi");setText("guruEvalValue",evals[0]?.total_score||"—");
  setText("guruWelcomeName",g?.nama||currentUser.name);const option=`<option value="${safe(currentUser.userId)}">${safe(currentUser.name)}</option>`;["moodGuru","refleksiGuru","evaluasiGuru"].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=option;});["moodGuruName","refleksiGuruName","evaluasiGuruName"].forEach(id=>{const el=document.getElementById(id);if(el)el.value=currentUser.name;});
  document.getElementById("guruOwnHistory").innerHTML=moods.slice(0,7).map(x=>`<div><span>${moodIcon(x.mood)}</span><strong>${safe(x.mood)}</strong><small>${formatDateTime(dateOf(x))}</small></div>`).join("")||`<div class="empty">Belum ada riwayat mood.</div>`;
}

// ---------- FORMS ----------
function setupForms(){
  if(formsReady)return;formsReady=true;
  document.getElementById("moodForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await saveMood({userId:currentUser.userId,guruId:currentUser.userId,guruNama:currentUser.name,tanggal:todayKey(),mood:val("moodValue"),catatan:val("moodNote")});e.target.reset();await loadDashboard();showToast("Mood Check berhasil disimpan. EWS dan wellbeing diperbarui otomatis.");}catch(err){showToast("Mood gagal disimpan: "+err.message);}});
  document.getElementById("refleksiForm")?.addEventListener("submit",async e=>{e.preventDefault();const ids=["pmBerkesadaran","pmBermakna","pmMenyenangkan","pmMemahami","pmMengaplikasi","pmMerefleksi","pmPraktikPedagogis","pmKemitraan","pmLingkungan","pmTeknologi"];const pm=ids.map(val).map(Number);if(pm.some(x=>x<1||x>4))return showToast("Lengkapi 10 indikator Implementasi Pembelajaran Mendalam.");try{await saveRefleksi({userId:currentUser.userId,guruId:currentUser.userId,guruNama:currentUser.name,tanggal:val("refleksiTanggal"),bebanKerja:val("refleksiBeban"),kondisiPembelajaran:val("refleksiPembelajaran"),dukungan:val("refleksiDukungan"),berkesadaran:pm[0],bermakna:pm[1],menyenangkan:pm[2],menggembirakan:pm[2],memahami:pm[3],mengaplikasi:pm[4],merefleksi:pm[5],praktikPedagogis:pm[6],kemitraan:pm[7],lingkunganPembelajaran:pm[8],teknologiDigital:pm[9],tujuanPembelajaran:val("refTujuanPembelajaran"),strategiBerhasil:val("refStrategiBerhasil"),kendala:val("refKendala"),responsMurid:val("refResponsMurid"),perbaikan:val("refPerbaikan"),catatan:val("refleksiCatatan")});e.target.reset();setDate();await loadDashboard();showToast("Daily Reflection berhasil disimpan. EWS, wellbeing, dan PM diperbarui otomatis.");}catch(err){showToast("Daily Reflection gagal disimpan: "+err.message);}});
  document.getElementById("evaluasiForm")?.addEventListener("submit",async e=>{e.preventDefault();const qs=["evaluasiSemangat","evaluasiBeban","evaluasiHubunganKerja","evaluasiDukungan","evaluasiKeseimbangan"].map(val).map(Number);if(qs.some(x=>x<1||x>4))return showToast("Lengkapi semua skor Weekly Wellbeing 1–4.");try{await saveEvaluasi({userId:currentUser.userId,guruId:currentUser.userId,guruNama:currentUser.name,minggu:val("evaluasiMinggu"),semangatMotivasi:qs[0],bebanTerkelola:qs[1],hubunganKerja:qs[2],dukunganKepalaSekolah:qs[3],keseimbanganHidupKerja:qs[4],bebanKerja:qs[1],pembelajaran:qs[0],kolaborasi:qs[2],dukungan:qs[3],kesiapan:qs[4],totalScore:qs.reduce((a,b)=>a+b,0)});e.target.reset();await loadDashboard();showToast("Weekly Wellbeing berhasil disimpan. EWS dan wellbeing diperbarui otomatis.");}catch(err){showToast("Weekly Wellbeing gagal disimpan: "+err.message);}});
  document.getElementById("settingsForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await saveSettings({tagline:val("settingsTagline"),instansi:val("settingsInstansi")});await loadDashboard();showToast("Pengaturan berhasil disimpan.");}catch(err){showToast(err.message);}});
}

// ---------- DATA GURU ----------
function setupTeacherModal(){
  if(teacherModalReady)return;teacherModalReady=true;document.getElementById("modalClose")?.addEventListener("click",closeTeacherModal);document.getElementById("modalCancel")?.addEventListener("click",closeTeacherModal);document.getElementById("modal")?.addEventListener("click",e=>{if(e.target.id==="modal")closeTeacherModal();});document.getElementById("teacherForm")?.addEventListener("submit",saveTeacher);document.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-guru]"),del=e.target.closest("[data-delete-guru]");if(edit)openTeacherModal(findGuru(edit.dataset.editGuru));if(del)deleteTeacher(del.dataset.deleteGuru);});}
function renderGuruTable(){const body=document.getElementById("guruFullBody");if(!body)return;const list=appData.guruList.map(normalizeGuru).filter(g=>g.nama);body.innerHTML=list.length?list.map((g,i)=>`<tr><td>${i+1}</td><td><strong>${safe(g.nama)}</strong></td><td>${safe(g.nip)||"—"}</td><td>${safe(g.mapel)||"—"}</td><td>${safe(g.kelas)||"—"}</td><td><span class="status ${String(g.status).toLowerCase()==="nonaktif"?"off":""}">${safe(g.status)}</span></td><td><button class="action-btn" data-edit-guru="${safe(g.id)}">Edit</button><button class="action-btn delete" data-delete-guru="${safe(g.id)}">Hapus</button></td></tr>`).join(""):`<tr><td colspan="7" class="empty">Belum ada data guru.</td></tr>`;}
function openTeacherModal(g){if(!isAdmin())return;document.getElementById("modalTitle").textContent=g?"Edit Guru":"Tambah Guru";document.getElementById("teacherId").value=g?.id||"";document.getElementById("teacherName").value=g?.nama||"";document.getElementById("teacherNip").value=g?.nip||"";document.getElementById("teacherMapel").value=g?.mapel||"";document.getElementById("teacherKelas").value=g?.kelas||"";document.getElementById("teacherStatus").value=g?.status||"Aktif";document.getElementById("modal").classList.add("show");}
function closeTeacherModal(){document.getElementById("modal")?.classList.remove("show");}
async function saveTeacher(e){e.preventDefault();try{await saveGuru({id:val("teacherId"),nama:val("teacherName"),nip:val("teacherNip"),mapel:val("teacherMapel"),kelas:val("teacherKelas"),status:val("teacherStatus")});closeTeacherModal();await loadDashboard();loadLoginGuru(true);showToast("Data guru berhasil disimpan.");}catch(err){showToast(err.message);}}
async function deleteTeacher(id){if(!confirm("Hapus data guru ini? Riwayat data tidak ikut dihapus."))return;try{await deleteGuru({id});await loadDashboard();loadLoginGuru(true);showToast("Data guru berhasil dihapus.");}catch(err){showToast(err.message);}}

// ---------- SEARCH ----------
function setupSearch(){const global=document.getElementById("globalSearch");if(global)global.addEventListener("input",e=>{if(!isAdmin())return;const q=e.target.value.toLowerCase();if(q)showPage("warning");document.querySelectorAll("#ewsTableBody tr").forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(q));});document.getElementById("guruFullSearch")?.addEventListener("input",e=>filterTeacherRows(e.target.value));}
function filterTeacherRows(q){document.querySelectorAll("#guruFullBody tr").forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(q.toLowerCase()));}
