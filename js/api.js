/* GERAK iCARE API - single gateway for HTML/CSS/JS frontend */
const API_URL = window.GERAK_API_URL || "https://script.google.com/macros/s/AKfycby6UyUkKsENBZvKOnGqR7UrZKLoaigSDJPq_9UCdLFHfhE5fGPW92KnV2duB3NGoFEZ/exec";

async function api(action, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (!result.success) throw new Error(result.error || `Action ${action} gagal`);
  return result;
}

async function getInitialData(role = "public", userId = "") { return api("getInitialData", { role, userId }); }
async function getDashboardData(payload = {}) { return api("getDashboardData", payload); }
async function getParticipationData(payload = {}) { return api("getParticipationData", payload); }
async function getMoodDistribution(payload = {}) { return api("getMoodDistribution", payload); }
async function getWellbeingData(payload = {}) { return api("getWellbeingData", payload); }
async function getDeepLearningImplementation(payload = {}) { return api("getDeepLearningImplementation", payload); }
async function getEWSData(payload = {}) { return api("getEWSData", payload); }
async function getTeacherDetail(payload = {}) { return api("getTeacherDetail", payload); }
async function getRecommendations(payload = {}) { return api("getRecommendations", payload); }
async function getTrendData(payload = {}) { return api("getTrendData", payload); }
async function verifyAdminPin(pin) { return api("verifyAdminPin", { pin }); }
async function saveGuru(data) { return api("saveGuru", data); }
async function deleteGuru(data) { return api("deleteGuru", data); }
async function saveMood(data) { return api("saveMood", data); }
async function saveRefleksi(data) { return api("saveRefleksi", data); }
async function saveEvaluasi(data) { return api("saveEvaluasi", data); }
async function saveTindakLanjut(data) { return api("saveTindakLanjut", data); }
async function saveSettings(data) { return api("saveSettings", data); }
