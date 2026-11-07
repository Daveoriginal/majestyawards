import { supabase } from "../js/supabase-config.js";

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");
const rows = document.getElementById("attendeeRows");
let attendees = [];

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  loginMessage.textContent = "Signing in…";
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById("adminEmail").value.trim(),
    password: document.getElementById("adminPassword").value
  });
  if (error) { loginMessage.textContent = error.message; return; }
  await showDashboard();
});

async function showDashboard() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  loginCard.style.display = "none";
  dashboard.style.display = "block";
  document.getElementById("logoutBtn").hidden = false;
  document.getElementById("refreshBtn").hidden = false;
  await loadDashboard();
}

async function loadDashboard() {
  dashboardMessage.textContent = "Loading…";
  const [{ data: stats, error: statsError }, { data, error }] = await Promise.all([
    supabase.rpc("admin_hma_stats"),
    supabase.rpc("admin_hma_attendees")
  ]);
  if (statsError || error) {
    dashboardMessage.textContent = (statsError || error).message;
    return;
  }
  attendees = data || [];
  document.getElementById("totalCount").textContent = stats.total;
  document.getElementById("remainingCount").textContent = stats.remaining;
  document.getElementById("checkedCount").textContent = stats.checked_in;
  renderRows();
  dashboardMessage.textContent = "";
}

function renderRows() {
  const q = document.getElementById("searchInput").value.toLowerCase().trim();
  const filtered = attendees.filter(a => [a.registration_code,a.full_name,a.phone,a.department].join(" ").toLowerCase().includes(q));
  if (!filtered.length) { rows.innerHTML = '<tr><td colspan="7" class="empty">No matching attendees.</td></tr>'; return; }
  rows.innerHTML = filtered.map(a => `<tr>
    <td><b>${escapeHtml(a.registration_code)}</b></td>
    <td>${escapeHtml(a.full_name)}</td><td>${escapeHtml(a.phone)}</td>
    <td>${escapeHtml(a.department || "—")}</td>
    <td>${new Date(a.created_at).toLocaleString()}</td>
    <td><span class="status ${a.checked_in ? "" : "out"}">${a.checked_in ? "Checked in" : "Not checked in"}</span></td>
    <td><button class="action-btn" data-delete-id="${a.id}">Delete</button></td>
  </tr>`).join("");
  rows.querySelectorAll("button[data-delete-id]").forEach(btn => btn.addEventListener("click", () => deleteRegistration(btn.dataset.deleteId)));
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
async function deleteRegistration(id) {
  const attendee = attendees.find(item => item.id === id);
  if (!attendee || !confirm(`Permanently delete registration ${attendee.registration_code} for ${attendee.full_name}? This cannot be undone.`)) return;
  dashboardMessage.textContent = "Deleting registration…";
  const { error } = await supabase.rpc("admin_hma_delete_attendee", { p_attendee_id: id });
  if (error) { dashboardMessage.textContent = error.message; return; }
  await loadDashboard();
  dashboardMessage.textContent = `Deleted registration ${attendee.registration_code}.`;
}
document.getElementById("searchInput").addEventListener("input", renderRows);
document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
document.getElementById("refreshListBtn").addEventListener("click", loadDashboard);
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  dashboard.style.display = "none"; loginCard.style.display = "block";
  document.getElementById("logoutBtn").hidden = true; document.getElementById("refreshBtn").hidden = true;
  document.getElementById("adminPassword").value = "";
});
document.getElementById("exportBtn").addEventListener("click", () => {
  const header = ["Registration ID","Full name","Phone","Email","Age","Department","Checked in","Created at"];
  const lines = [header, ...attendees.map(a => [a.registration_code,a.full_name,a.phone,a.email,a.age,a.department,a.checked_in,a.created_at])]
    .map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","));
  const blob = new Blob([lines.join("\r\n")], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = "HMA-attendees.csv"; link.click(); URL.revokeObjectURL(url);
});

const { data: { session } } = await supabase.auth.getSession();
if (session) await showDashboard();


// Camera QR scanner: ticket payload is HMA|HMA-0001.
let qrScanner = null;
const scanMessage = document.getElementById("scanMessage");
document.getElementById("startScannerBtn").addEventListener("click", async () => {
  if (!window.Html5Qrcode) {
    scanMessage.textContent = "QR scanner library could not be loaded. Check your internet connection.";
    return;
  }
  try {
    if (!qrScanner) qrScanner = new Html5Qrcode("qrReader");
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 230, height: 230 } },
      async decodedText => {
        const parts = decodedText.split("|");
        const code = parts.length === 2 && parts[0] === "HMA" ? parts[1] : decodedText.trim();
        scanMessage.textContent = `Checking ${code}…`;
        const { data, error } = await supabase.rpc("admin_hma_checkin_code", { p_registration_code: code });
        if (error) {
          scanMessage.textContent = error.message;
          return;
        }
        scanMessage.textContent = data?.already_checked_in
          ? `${code} was already checked in.`
          : `${code}: attendance confirmed.`;
        await loadDashboard();
      },
      () => {}
    );
    document.getElementById("startScannerBtn").disabled = true;
    document.getElementById("stopScannerBtn").disabled = false;
    scanMessage.textContent = "Camera is active. Point it at an HMA ticket QR code.";
  } catch (err) {
    scanMessage.textContent = "Could not start camera. Allow camera access and use the site over HTTPS or localhost.";
  }
});
document.getElementById("stopScannerBtn").addEventListener("click", async () => {
  if (qrScanner && qrScanner.isScanning) await qrScanner.stop();
  document.getElementById("startScannerBtn").disabled = false;
  document.getElementById("stopScannerBtn").disabled = true;
  scanMessage.textContent = "Scanner stopped.";
});
