// Anúncios Google AdSense. Só funciona se ADSENSE_CLIENT estiver preenchido em config.js
window.Ads = (() => {
  const a = JB.cfg.ADS || {};
  const client = String(a.ADSENSE_CLIENT || "").trim();
  const enabled = Boolean(a.ENABLED && /^ca-pub-\d{10,}$/.test(client));
  const slots = a.SLOTS || {};
  let scriptLoaded = false;

  const has = (key) => enabled && /^\d+$/.test(String(slots[key] || ""));

  function loadScript() {
    if (!enabled || scriptLoaded) return;
    scriptLoaded = true;
    const meta = document.createElement("meta");
    meta.name = "google-adsense-account";
    meta.content = client;
    document.head.appendChild(meta);
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
    document.head.appendChild(s);
  }

  function unit(key) {
    if (!has(key)) return "";
    return `<div class="ad"><span class="ad-label">Publicidade</span>` +
      `<ins class="adsbygoogle" style="display:block" data-ad-client="${JB.esc(client)}" ` +
      `data-ad-slot="${JB.esc(slots[key])}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
  }

  // Inicia os anúncios que ainda não foram iniciados dentro de "root"
  function activate(root) {
    if (!enabled) return;
    loadScript();
    root.querySelectorAll("ins.adsbygoogle:not([data-started])").forEach((ins) => {
      ins.dataset.started = "1";
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("AdSense:", e);
      }
    });
  }

  function fill(selector, key) {
    const box = document.querySelector(selector);
    if (!box) return;
    if (!has(key)) { box.hidden = true; return; }
    if (!box.dataset.filled) {
      box.innerHTML = unit(key);
      box.dataset.filled = "1";
    }
    box.hidden = false;
    activate(box);
  }

  function hide(selector) {
    const box = document.querySelector(selector);
    if (box) box.hidden = true;
  }

  return { enabled, has, unit, activate, fill, hide };
})();
