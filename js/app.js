import { supabase } from "/js/supabase-config.js";

const form = document.getElementById("registrationForm");
const button = document.getElementById("registerButton");
const message = document.getElementById("formMessage");
const modal = document.getElementById("ticketModal");
const codeBox = document.getElementById("ticketCode");
const qrBox = document.getElementById("ticketQr");

const eventDate = new Date("2026-12-20T09:30:00+01:00").getTime();
const pad = n => String(n).padStart(2, "0");

function updateCountdown() {
  const distance = eventDate - Date.now();
  if (distance <= 0) {
    ["days","hours","minutes","seconds"].forEach(id => document.getElementById(id).textContent = "00");
    return;
  }
  document.getElementById("days").textContent = Math.floor(distance / 86400000);
  document.getElementById("hours").textContent = pad(Math.floor(distance % 86400000 / 3600000));
  document.getElementById("minutes").textContent = pad(Math.floor(distance % 3600000 / 60000));
  document.getElementById("seconds").textContent = pad(Math.floor(distance % 60000 / 1000));
}
updateCountdown();
setInterval(updateCountdown, 1000);

async function updateCapacity() {
  const { data, error } = await supabase.rpc("public_registration_count");
  console.log("Capacity data:", data, "Error:", error);
  console.log("Capacity data type:", typeof data, "Error type:", typeof error);
  if (error) {
    document.getElementById("capacityText").textContent = "Registration availability will be confirmed when you submit.";
    return;
  }
  const count = Number(data || 0);
  const remaining = Math.max(0, 260 - count);
  document.getElementById("spotsLeft").textContent = remaining;
  document.getElementById("capacityBar").style.width = `${Math.min(100, count / 260 * 100)}%`;
  document.getElementById("capacityText").textContent = `${count} of 260 places reserved`;
  if (remaining === 0) {
    button.disabled = true;
    button.textContent = "Registration is full";
  }
}
updateCapacity();

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "";
  message.className = "form-message";
  if (!form.reportValidity()) return;

  const values = new FormData(form);
  const fullName = String(values.get("full_name") || "").trim();
  const phone = String(values.get("phone") || "").trim();
  const email = String(values.get("email") || "").trim();
  const ageValue = String(values.get("age") || "").trim();
  const department = String(values.get("department") || "").trim();

  button.disabled = true;
  button.innerHTML = "Submitting registration…";
  try {
    const { data, error } = await supabase.rpc("register_attendee", {
      p_full_name: fullName,
      p_phone: phone,
      p_email: email || null,
      p_age: ageValue ? Number(ageValue) : null,
      p_department: department || null
    });
    if (error) throw error;

    codeBox.textContent = data;
    qrBox.innerHTML = "";
    if (window.QRCode) {
      new QRCode(qrBox, { text: `HMA|${data}`, width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M });
    } else {
      qrBox.textContent = data;
    }
    modal.hidden = false;
    form.reset();
    await updateCapacity();
  } catch (error) {
    const raw = (error.message || "").toLowerCase();
    if (raw.includes("registration_full")) {
      message.textContent = "We're sorry — all 260 registration spaces have been filled.";
    } else if (raw.includes("duplicate") || raw.includes("already registered")) {
      message.textContent = "This attendee may already be registered. Please contact the event organisers.";
    } else {
      console.error(error);
      message.textContent = "We couldn't complete your registration. Please check your details and try again.";
    }
  } finally {
    button.disabled = false;
    button.innerHTML = "Complete registration <span>→</span>";
    await updateCapacity();
  }
});

document.getElementById("closeTicket").addEventListener("click", () => modal.hidden = true);
modal.addEventListener("click", event => { if (event.target === modal) modal.hidden = true; });
document.getElementById("printTicket").addEventListener("click", () => window.print());

const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
