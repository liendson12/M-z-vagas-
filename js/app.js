(() => {
  const { esc, safeUrl, timeAgo, MODALITY, TYPE } = JB;
  const $ = (s) => document.querySelector(s);

  const PAGE_SIZE = 20;
  let all = [];
  let filtered = [];
  let shown = 0;

  const els = {
    q: $("#q"),
    modality: $("#f-modality"),
    type: $("#f-type"),
    category: $("#f-category"),
    clear: $("#clear"),
    count: $("#count"),
    state: $("#state"),
    list: $("#jobs"),
    more: $("#more"),
  };

  function showState(title, text) {
    els.list.hidden = true;
    els.more.hidden = true;
    els.state.hidden = false;
    els.state.innerHTML = `<h2>${esc(title)}</h2><p>${esc(text)}</p>`;
  }

  function fillSelect(select, entries) {
    entries.forEach(([value, label]) => {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      select.appendChild(o);
    });
  }

  function paragraphs(text) {
    return String(text || "")
      .split(/\n{2,}/)
      .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function jobHTML(j) {
    const url = safeUrl(j.apply_url);
    const isNew = Date.now() - new Date(j.created_at).getTime() < 3 * 864e5;
    const apply = url
      ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow">Candidatar-se</a>`
      : `<span class="btn is-disabled">Link indisponível</span>`;
    const facts = [
      j.salary ? `<li><strong>Salário:</strong> ${esc(j.salary)}</li>` : "",
      j.category ? `<li><strong>Área:</strong> ${esc(j.category)}</li>` : "",
      `<li><strong>Publicada:</strong> ${esc(timeAgo(j.created_at))}</li>`,
      j.expires_at
        ? `<li><strong>Inscrições até:</strong> ${esc(new Date(j.expires_at).toLocaleDateString("pt-BR"))}</li>`
        : "",
    ].join("");

    return `
      <li class="job">
        <div class="job-row">
          <button class="job-main" type="button" aria-expanded="false" aria-controls="d-${esc(j.id)}">
            <span class="job-title">${esc(j.title)}${isNew ? '<span class="new">Nova</span>' : ""}</span>
            <span class="job-company">${esc(j.company)}</span>
          </button>
          <div class="job-meta">
            <span>${esc(j.location || "Local não informado")}</span>
            <span class="tag">${esc(MODALITY[j.modality] || j.modality)}</span>
            <span class="tag">${esc(TYPE[j.job_type] || j.job_type)}</span>
          </div>
          ${apply}
        </div>
        <div class="job-detail" id="d-${esc(j.id)}" hidden>
          <ul class="facts">${facts}</ul>
          ${j.description ? paragraphs(j.description) : "<p>A empresa não incluiu uma descrição. Use o botão de candidatura para saber mais.</p>"}
        </div>
      </li>`;
  }

  function render(append = false) {
    const slice = filtered.slice(shown, shown + PAGE_SIZE);
    const html = slice.map(jobHTML).join("");
    if (append) els.list.insertAdjacentHTML("beforeend", html);
    else els.list.innerHTML = html;
    shown += slice.length;
    els.more.hidden = shown >= filtered.length;
  }

  function applyFilters() {
    const q = els.q.value.trim().toLowerCase();
    const m = els.modality.value;
    const t = els.type.value;
    const c = els.category.value;

    filtered = all.filter((j) => {
      if (m && j.modality !== m) return false;
      if (t && j.job_type !== t) return false;
      if (c && j.category !== c) return false;
      if (q) {
        const hay = [j.title, j.company, j.location, j.category, j.description]
          .join(" ")
          .toLowerCase();
        return q.split(/\s+/).every((word) => hay.includes(word));
      }
      return true;
    });

    const active = Boolean(q || m || t || c);
    els.clear.hidden = !active;
    shown = 0;

    const n = filtered.length;
    els.count.textContent =
      n === 0 ? "Nenhuma vaga encontrada" : n === 1 ? "1 vaga encontrada" : `${n} vagas encontradas`;

    if (n === 0) {
      showState(
        active ? "Nenhuma vaga com esses filtros" : "Ainda não há vagas abertas",
        active ? "Tente buscar outro termo ou limpar os filtros." : "Volte em breve: novas vagas são publicadas com frequência."
      );
      return;
    }
    els.state.hidden = true;
    els.list.hidden = false;
    render(false);
    updateStructuredData();
  }

  // Dados estruturados para o Google Vagas (SEO)
  function updateStructuredData() {
    const old = document.getElementById("jobs-jsonld");
    if (old) old.remove();
    const typeMap = {
      clt: "FULL_TIME", pj: "CONTRACTOR", estagio: "INTERN",
      temporario: "TEMPORARY", freelancer: "CONTRACTOR",
    };
    const items = filtered.slice(0, 20).map((j) => ({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: j.title,
      description: j.description || j.title,
      datePosted: j.created_at,
      ...(j.expires_at ? { validThrough: j.expires_at } : {}),
      employmentType: typeMap[j.job_type],
      hiringOrganization: { "@type": "Organization", name: j.company },
      ...(j.modality === "remoto" ? { jobLocationType: "TELECOMMUTE" } : {}),
      jobLocation: {
        "@type": "Place",
        address: { "@type": "PostalAddress", addressLocality: j.location || "Brasil", addressCountry: "BR" },
      },
    }));
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "jobs-jsonld";
    s.textContent = JSON.stringify(items);
    document.head.appendChild(s);
  }

  async function load() {
    if (!JB.configured()) {
      showState("Falta configurar o Supabase", "Preencha SUPABASE_URL e SUPABASE_ANON_KEY no arquivo js/config.js.");
      return;
    }
    showState("Carregando vagas", "Só um instante.");
    try {
      const sb = JB.client();
      const { data, error } = await sb
        .from("jobs")
        .select("id,title,company,location,modality,job_type,category,salary,description,apply_url,expires_at,created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      all = data || [];

      fillSelect(els.modality, Object.entries(MODALITY));
      fillSelect(els.type, Object.entries(TYPE));
      const cats = [...new Set(all.map((j) => j.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      fillSelect(els.category, cats.map((c) => [c, c]));

      applyFilters();
    } catch (err) {
      console.error(err);
      showState("Não foi possível carregar as vagas", "Verifique sua conexão e recarregue a página.");
    }
  }

  // Eventos
  let timer;
  els.q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(applyFilters, 150);
  });
  [els.modality, els.type, els.category].forEach((s) => s.addEventListener("change", applyFilters));
  els.clear.addEventListener("click", () => {
    els.q.value = "";
    els.modality.value = els.type.value = els.category.value = "";
    applyFilters();
    els.q.focus();
  });
  els.more.addEventListener("click", () => render(true));

  els.list.addEventListener("click", (e) => {
    const btn = e.target.closest(".job-main");
    if (!btn) return;
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    panel.hidden = open;
  });

  load();
})();
