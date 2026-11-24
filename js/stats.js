(() => {
  const body = document.getElementById("stats-body");
  const msg = document.getElementById("stats-msg");
  const btn = document.getElementById("stats-refresh");
  if (!body || !msg || !btn || typeof JB === "undefined") return;
  const { esc } = JB;

  async function countEvents(sb, tipo, siteOnly) {
    let q = sb.from("eventos").select("id", { count: "exact", head: true }).eq("tipo", tipo);
    q = siteOnly ? q.is("vaga_id", null) : q.not("vaga_id", "is", null);
    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  }

  async function load() {
    try {
      const sb = JB.client();
      const { data } = await sb.auth.getSession();
      if (!data || !data.session) return; // só carrega com o admin autenticado

      msg.textContent = "A carregar estatísticas…";
      const [site, aberturas, cliques, res] = await Promise.all([
        countEvents(sb, "visita", true),
        countEvents(sb, "visita", false),
        countEvents(sb, "clique", false),
        sb.from("estatisticas_vagas").select("*"),
      ]);
      if (res.error) throw res.error;

      const rows = (res.data || []).slice().sort(
        (a, b) => b.cliques - a.cliques || b.visitas - a.visitas
      );

      const card = (n, label) =>
        `<div style="flex:1;min-width:110px;padding:12px;border:1px solid #d9dde8;border-radius:10px;text-align:center">
           <div style="font-size:1.6rem;font-weight:800">${n}</div>
           <div style="font-size:.85rem;opacity:.75">${label}</div>
         </div>`;

      const table = rows.length
        ? `<div style="overflow-x:auto;margin-top:14px">
             <table style="width:100%;border-collapse:collapse;font-size:.92rem">
               <thead><tr style="text-align:left;border-bottom:2px solid #d9dde8">
                 <th style="padding:8px">Vaga</th>
                 <th style="padding:8px;text-align:right">Visitas</th>
                 <th style="padding:8px;text-align:right">Cliques</th>
               </tr></thead>
               <tbody>${rows
                 .map(
                   (r) => `<tr style="border-bottom:1px solid #e8ebf2">
                     <td style="padding:8px"><strong>${esc(r.titulo || "Vaga removida")}</strong><br><span style="opacity:.7">${esc(r.empresa || "")}</span></td>
                     <td style="padding:8px;text-align:right">${r.visitas}</td>
                     <td style="padding:8px;text-align:right">${r.cliques}</td>
                   </tr>`
                 )
                 .join("")}</tbody>
             </table>
           </div>`
        : `<p style="margin-top:14px">Ainda não há dados por vaga.</p>`;

      body.innerHTML =
        `<div style="display:flex;gap:10px;flex-wrap:wrap">
           ${card(site, "Visitas ao site")}
           ${card(aberturas, "Vagas abertas")}
           ${card(cliques, "Cliques em Candidatar-se")}
         </div>` + table;
      msg.textContent = "";
    } catch (err) {
      console.error(err);
      msg.textContent =
        "Não foi possível carregar as estatísticas. Confirme que correu o SQL das estatísticas no Supabase.";
    }
  }

  btn.addEventListener("click", load);
  JB.client().auth.onAuthStateChange(() => setTimeout(load, 0));
  load();
})();
