// Funções compartilhadas entre o site público e o painel
window.JB = (() => {
  const cfg = window.JOBBOARD_CONFIG || {};

  const MODALITY = { presencial: "Presencial", hibrido: "Híbrido", remoto: "Remoto" };
  const TYPE = {
    efectivo: "Efectivo",
    termo: "Contrato a termo",
    parcial: "Tempo parcial",
    estagio: "Estágio",
    freelancer: "Freelancer",
  };
  const STATUS = { draft: "Rascunho", published: "Publicada", closed: "Encerrada" };

  // Escapa HTML para evitar XSS ao montar a tela com dados do banco
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  // Só aceita links http, https e mailto
  const safeUrl = (value) => {
    try {
      const u = new URL(String(value).trim());
      return ["http:", "https:", "mailto:"].includes(u.protocol) ? u.href : null;
    } catch {
      return null;
    }
  };

  const timeAgo = (iso) => {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat("pt-MZ", { numeric: "auto" });
    const steps = [
      [60, "second"], [3600, "minute"], [86400, "hour"],
      [604800, "day"], [2629800, "week"], [31557600, "month"],
    ];
    const divisors = [1, 60, 3600, 86400, 604800, 2629800];
    for (let i = 0; i < steps.length; i++) {
      if (Math.abs(diff) < steps[i][0]) {
        return rtf.format(Math.round(diff / divisors[i]), steps[i][1]);
      }
    }
    return rtf.format(Math.round(diff / 31557600), "year");
  };

  const configured = () =>
    cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("SEU-PROJETO") &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("SUA-CHAVE");

  const client = () => {
    if (!window.supabase) throw new Error("Biblioteca do Supabase não carregou.");
    return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  };

  return { cfg, MODALITY, TYPE, STATUS, esc, safeUrl, timeAgo, configured, client };
})();
