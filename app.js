const $ = (id) => document.getElementById(id);

const CONFIG = {
  TREASURY: "0xA73b2C44db98a336A5729e93963a20BfdD8AEd76",
  TOKEN_8B: "0x756cc000b0674dbc52e95bac0a90fdd386b4f4d7",
  SALE: "0x6E32A761D1Ac04C0Bfd7Ac4EE6a0bbed0dE9002e",
  USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  POLYGON_CHAIN_ID: "0x89"
};

let currentWallet = "";

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
  for (const code of supported) if (lang.startsWith(code)) return code;
  return "en";
}

function setStatus(text) {
  let el = $("buyStatus");
  if (!el) {
    el = document.createElement("div");
    el.id = "buyStatus";
    el.style.marginTop = "14px";
    el.style.fontSize = "14px";
    el.style.opacity = "0.9";
    $("payBtn")?.insertAdjacentElement("afterend", el);
  }
  el.textContent = text;
}

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function pad64(value) {
  return value.toLowerCase().replace("0x", "").padStart(64, "0");
}

function encodeAddress(address) {
  return pad64(address);
}

function encodeUint(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function formatUnits(value, decimals) {
  const n = BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const fraction = (n % base).toString().padStart(decimals, "0").slice(0, 4);
  return `${whole}.${fraction}`.replace(/\.?0+$/, "");
}

async function switchToPolygon() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONFIG.POLYGON_CHAIN_ID }]
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CONFIG.POLYGON_CHAIN_ID,
          chainName: "Polygon Mainnet",
          nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
          rpcUrls: ["https://polygon-rpc.com"],
          blockExplorerUrls: ["https://polygonscan.com"]
        }]
      });
    } else {
      throw error;
    }
  }
}

async function ethCall(to, data) {
  return await window.ethereum.request({
    method: "eth_call",
    params: [{ to, data }, "latest"]
  });
}

async function balanceOf(token, wallet) {
  const data = "0x70a08231" + encodeAddress(wallet);
  return BigInt(await ethCall(token, data));
}

async function allowance(owner, spender) {
  const data = "0xdd62ed3e" + encodeAddress(owner) + encodeAddress(spender);
  return BigInt(await ethCall(CONFIG.USDT, data));
}

async function waitForTx(txHash) {
  while (true) {
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function updateBalances() {
  if (!currentWallet) return;

  const usdt = await balanceOf(CONFIG.USDT, currentWallet);
  const token8B = await balanceOf(CONFIG.TOKEN_8B, currentWallet);

  setStatus(`USDT: ${formatUnits(usdt, 6)} | 8B: ${formatUnits(token8B, 18)}`);
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found");
    return;
  }

  await switchToPolygon();

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts"
  });

  currentWallet = accounts[0];
  $("connectBtn").textContent = shortAddress(currentWallet);

  setStatus("Wallet connected");
  await updateBalances();
}

async function buy8B() {
  try {
    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    if (!currentWallet) {
      await connectWallet();
    }

    await switchToPolygon();

    const units = 1n;
    const usdtAmount = 1000000n; // 1 USDT

    setStatus("Checking USDT allowance...");

    const currentAllowance = await allowance(currentWallet, CONFIG.SALE);

    if (currentAllowance < usdtAmount) {
      setStatus("Approve 1 USDT in MetaMask...");

      const approveData =
        "0x095ea7b3" +
        encodeAddress(CONFIG.SALE) +
        encodeUint(usdtAmount);

      const approveTx = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: currentWallet,
          to: CONFIG.USDT,
          data: approveData
        }]
      });

      await waitForTx(approveTx);
    }

    setStatus("Confirm purchase: 1 USDT → 1 8B");

    const buyData =
      "0xbfbe6fe5" +
      encodeUint(units);

    const buyTx = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{
        from: currentWallet,
        to: CONFIG.SALE,
        data: buyData
      }]
    });

    await waitForTx(buyTx);

    setStatus("Success! You bought 1 8B for 1 USDT.");
    await updateBalances();

    alert("Success! You bought 1 8B.");
  } catch (error) {
    console.error(error);
    setStatus("Transaction failed or was cancelled.");
  }
}

function openModal() {
  $("modal").classList.add("open");
  $("modal").setAttribute("aria-hidden", "false");
}

function closeModal() {
  $("modal").classList.remove("open");
  $("modal").setAttribute("aria-hidden", "true");
}

$("langSelect")?.addEventListener("change", (e) => applyLang(e.target.value));
$("connectBtn")?.addEventListener("click", connectWallet);
$("joinBtn")?.addEventListener("click", openModal);
$("closeModal")?.addEventListener("click", closeModal);

$("modal")?.addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});

$("payBtn")?.addEventListener("click", buy8B);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}

const startLang = localStorage.getItem("8b_lang") || detectLang();
$("langSelect").value = startLang;
applyLang(startLang);

const treasury = CONFIG.TREASURY;
$("treasuryText").textContent = `${treasury.slice(0, 6)}...${treasury.slice(-4)}`;
