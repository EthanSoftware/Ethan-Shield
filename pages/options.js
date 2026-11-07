// EthanGuard v2.0 Options — Ethan Software

function fmt(n){
  if(n>=1e6)return(n/1e6).toFixed(1)+"M";
  if(n>=1e3)return(n/1e3).toFixed(1)+"K";
  return String(n||0);
}

function toast(msg="✓ Saved"){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2500);
}

async function load(){
  const data = await chrome.storage.sync.get([
    "orgName","orgLogo","userId","stats",
    "customBlocklist","customAllowlist","adBlocking","trackerBlocking"
  ]);

  // Sidebar org name
  document.getElementById("sidebar-org-name").textContent = data.orgName || "EthanGuard";

  // Dashboard stats
  const s = data.stats || {};
  document.getElementById("ds-total").textContent    = fmt(s.total);
  document.getElementById("ds-ads").textContent      = fmt(s.ads);
  document.getElementById("ds-trackers").textContent = fmt(s.trackers);
  document.getElementById("ds-sites").textContent    = fmt(s.sites);
  document.getElementById("ds-https").textContent    = fmt(s.https);
  document.getElementById("ds-identity").textContent = fmt(s.identity);
  document.getElementById("uid-display").textContent = data.userId || "—";

  // Branding
  document.getElementById("org-name-input").value = data.orgName || "";
  document.getElementById("org-logo-input").value  = data.orgLogo || "";
  updateLogoPreview(data.orgLogo);

  // Lists
  document.getElementById("blocklist-textarea").value  = (data.customBlocklist||[]).join("\n");
  document.getElementById("allowlist-textarea").value  = (data.customAllowlist||[]).join("\n");

  // Protection badges
  updateBadge("badge-ads",     data.adBlocking !== false);
  updateBadge("badge-trackers",data.trackerBlocking !== false);
}

function updateBadge(id, active){
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = active
    ? '<span class="always-on-dot"></span>Active'
    : '<span style="width:5px;height:5px;border-radius:50%;background:#e05252;display:inline-block"></span><span style="color:#e05252">Off</span>';
  el.style.background = active ? "rgba(62,207,142,.08)" : "rgba(224,82,82,.08)";
  el.style.borderColor = active ? "rgba(62,207,142,.2)" : "rgba(224,82,82,.2)";
  el.style.color = active ? "var(--green)" : "var(--red)";
}

function updateLogoPreview(url){
  const box = document.getElementById("logo-preview-box");
  if (url) {
    box.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML=defaultSvg()">`;
  } else {
    box.innerHTML = defaultSvg();
  }
}

function defaultSvg(){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><rect width="500" height="500" fill="#fff"/><g transform="translate(135,110)"><text x="120" y="235" font-family="serif" font-size="240" font-weight="700" font-style="italic" fill="#000" text-anchor="middle">E.</text></g></svg>`;
}

// Nav
document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".page-section").forEach(s=>s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("page-"+btn.dataset.page).classList.add("active");
  });
});

// Logo preview live
document.getElementById("org-logo-input").addEventListener("input", e => updateLogoPreview(e.target.value));
document.getElementById("org-name-input").addEventListener("input", e => {
  document.getElementById("sidebar-org-name").textContent = e.target.value || "EthanGuard";
});

// Save branding
document.getElementById("save-branding-btn").addEventListener("click", async () => {
  const name = document.getElementById("org-name-input").value.trim();
  const logo = document.getElementById("org-logo-input").value.trim();
  await chrome.storage.sync.set({ orgName: name, orgLogo: logo });
  document.getElementById("sidebar-org-name").textContent = name || "EthanGuard";
  chrome.runtime.sendMessage({ type: "RELOAD_RULES" });
  toast("✓ Branding saved");
});

// Save blocklist
document.getElementById("save-blocklist-btn").addEventListener("click", async () => {
  const list = document.getElementById("blocklist-textarea").value
    .split("\n")
    .map(d=>d.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/$/,""))
    .filter(d=>d&&d.includes("."));
  await chrome.storage.sync.set({ customBlocklist: list });
  chrome.runtime.sendMessage({ type: "RELOAD_RULES" });
  toast("✓ Block list saved — " + list.length + " domains");
});

// Save allowlist
document.getElementById("save-allowlist-btn").addEventListener("click", async () => {
  const list = document.getElementById("allowlist-textarea").value
    .split("\n")
    .map(d=>d.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/$/,""))
    .filter(d=>d&&d.includes("."));
  await chrome.storage.sync.set({ customAllowlist: list });
  chrome.runtime.sendMessage({ type: "RELOAD_RULES" });
  toast("✓ Allow list saved — " + list.length + " domains");
});

// Copy UID
document.getElementById("copy-uid-btn").addEventListener("click", () => {
  navigator.clipboard.writeText(document.getElementById("uid-display").textContent);
  toast("✓ User ID copied");
});

// Reset stats
document.getElementById("reset-stats-btn").addEventListener("click", async () => {
  if (!confirm("Reset all protection stats?")) return;
  await chrome.storage.sync.set({ stats:{ads:0,trackers:0,sites:0,https:0,identity:0,iframes:0,total:0} });
  load();
  toast("✓ Stats reset");
});

load();
