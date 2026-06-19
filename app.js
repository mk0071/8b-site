const $ = (id) => document.getElementById(id);

const CONFIG = {
  TREASURY: "0xA73b2C44db98a336A5729e93963a20BfdD8AEd76"
};

function applyLang(lang) {
  const pack = window.I18N[lang] || window.I18N.ru;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = pack.title || "8B";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (pack[key]) el.textContent = pack[key];
  });
  localStorage.setItem("8b_lang", lang);
}

function detectLang() {
  const lang = (navigator.language || "ru").toLowerCase();
  const supported = ["ru","en","es","fr","de","zh","ar","hi","pt","tr","id","ja","ko"];
  for (const code of supported) { if (lang.startsWith(code)) return code; }
  return "en";
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask / Web3 wallet not found");
    return;
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const wallet = accounts[0];
  $("connectBtn").textContent = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function openModal() {
  $("modal").classList.add("open");
  $("modal").setAttribute("aria-hidden", "false");
}

function closeModal() {
  $("modal").classList.remove("open");
  $("modal").setAttribute("aria-hidden", "true");
}

$("langSelect").addEventListener("change", (e) => applyLang(e.target.value));
$("joinBtn").addEventListener("click", openModal);
$("closeModal").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});
$("payBtn").addEventListener("click", () => {
  alert("Automatic purchase will be available after Sale Contract launch.");
});

const startLang = localStorage.getItem("8b_lang") || detectLang();
$("langSelect").value = startLang;
applyLang(startLang);

const treasury = CONFIG.TREASURY;
$("treasuryText").textContent = treasury.includes("000000")
  ? "0x8B00...8B00"
  : `${treasury.slice(0, 6)}...${treasury.slice(-4)}`;
