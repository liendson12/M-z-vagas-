(() => {
  const { esc, safeUrl, STATUS, MODALITY, TYPE } = JB;
  const $ = (s) => document.querySelector(s);

  const el = {
    login: $("#login"),
    loginForm: $("#login-form"),
    loginMsg: $("#login-msg"),
    panel: $("#panel"),
    who: $("#who"),
    logout: $("#logout"),
    form: $("#job-form"),
    formTitle: $("#form-title"),
    formMsg: $("#form-msg"),
    save: $("#save"),
    cancel: $("#cancel"),
    list: $("#admin-list"),
    listMsg: $("#list-msg"),
  };

  const FIELDS = [
    "title", "company", "location", "category", "modality",
    "job_type", "salary", "expires_at", "apply_url", "description", "status",
  ];

  let sb;
  let jobs = [];
  let editingId = null;

  const say = (node, text, kind) => {
    node.textContent = text || "";
    node.className = "msg" + (kind ? " " + kind : "");
  };

  function showLogin(message) {
    el.panel.hidden = true;
    el.login.hidden = false;
    say(el.loginMsg, message, message ? "error" : "");
  }

  function showPanel(user) {
    el.login.hidden = true;
    el.panel.hidden = false;
    el.who.textContent = `Conectado como ${user.email}`;
  }

  async function enter(user) {
    const { data, error } = await sb
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) {
      await sb.auth.signOut();
      showLogin("Esta conta não tem permissão de administrador.");
      return;
    }
    showPanel(user);
    resetForm();
    loadJobs();
  }

  // ---------- Lista ----------
  async function loadJobs() {
    say(el.listMsg, "");
    const { data, error } = await sb
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      say(el.listMsg, "Não foi possível carregar as vagas. Recarregue a página.", "error");
      return;
    }
    jobs = data || [];
    renderList();
  }

  function renderList() {
    if (!jobs.length) {
      el.list.innerHTML = `<li class="sub">Nenhuma vaga cadastrada ainda. Use o formulário acima para publicar a primeira.</li>`;
      return;
    }
    el.list.innerHTML = jobs
      .map((j) => {
        const nextStatus = j.status === "published" ? "closed" : "published";
        const toggle = j.status === "published" ? "Encerrar" : "Publicar";
        return `
        <li class="admin-item" data-id="${esc(j.id)}">
          <div>
            <h3>${esc(j.title)}<span class="badge ${esc(j.status)}">${esc(STATUS[j.status])}</span></h3>
            <div class="sub">${esc(j.company)}, ${esc(j.location || "sem local")}, ${esc(MODALITY[j.modality])}, ${esc(TYPE[j.job_type])}</div>
          </div>
          <div class="row-actions">
            <button class="btn secondary small" data-act="edit" type="button">Editar</button>
            <button class="btn secondary small" data-act="toggle" data-next="${nextStatus}" type="button">${toggle}</button>
            <button class="btn danger small" data-act="delete" type="button">Excluir</button>
          </div>
        </li>`;
      })
      .join("");
  }

  el.list.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.closest(".admin-item").dataset.id;
    const job = jobs.find((j) => j.id === id);
    if (!job) return;

    if (btn.dataset.act === "edit") {
      startEdit(job);
    } else if (btn.dataset.act === "toggle") {
      const { error } = await sb.from("jobs").update({ status: btn.dataset.next }).eq("id", id);
      if (error) return say(el.listMsg, "Não foi possível alterar a situação da vaga.", "error");
      say(el.listMsg, "Situação atualizada.", "ok");
      loadJobs();
    } else if (btn.dataset.act === "delete") {
      if (!confirm(`Excluir a vaga "${job.title}"? Esta ação não pode ser desfeita.`)) return;
      const { error } = await sb.from("jobs").delete().eq("id", id);
      if (error) return say(el.listMsg, "Não foi possível excluir a vaga.", "error");
      if (editingId === id) resetForm();
      say(el.listMsg, "Vaga excluída.", "ok");
      loadJobs();
    }
  });

  // ---------- Formulário ----------
  function resetForm() {
    editingId = null;
    el.form.reset();
    $("#status").value = "published";
    el.formTitle.textContent = "Nova vaga";
    el.save.textContent = "Publicar vaga";
    el.cancel.hidden = true;
    say(el.formMsg, "");
  }

  function startEdit(job) {
    editingId = job.id;
    FIELDS.forEach((f) => {
      const input = $("#" + f);
      if (f === "expires_at") input.value = job.expires_at ? job.expires_at.slice(0, 10) : "";
      else input.value = job[f] ?? "";
    });
    el.formTitle.textContent = "Editar vaga";
    el.save.textContent = "Salvar alterações";
    el.cancel.hidden = false;
    say(el.formMsg, "");
    el.form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  el.cancel.addEventListener("click", resetForm);

  el.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (id) => $("#" + id).value.trim();

    const title = v("title");
    const company = v("company");
    const url = safeUrl(v("apply_url"));

    if (title.length < 3) return say(el.formMsg, "Informe o cargo (mínimo de 3 letras).", "error");
    if (company.length < 2) return say(el.formMsg, "Informe o nome da empresa.", "error");
    if (!url) return say(el.formMsg, "Informe um link válido, começando com https:// ou mailto:.", "error");

    const expires = v("expires_at");
    const payload = {
      title,
      company,
      location: v("location") || null,
      category: v("category") || null,
      modality: v("modality"),
      job_type: v("job_type"),
      salary: v("salary") || null,
      description: v("description") || null,
      apply_url: url,
      status: v("status"),
      expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
    };

    el.save.disabled = true;
    const query = editingId
      ? sb.from("jobs").update(payload).eq("id", editingId)
      : sb.from("jobs").insert(payload);
    const { error } = await query;
    el.save.disabled = false;

    if (error) {
      console.error(error);
      return say(el.formMsg, "Não foi possível salvar a vaga. Confira os campos e tente novamente.", "error");
    }
    const wasEditing = Boolean(editingId);
    resetForm();
    say(el.formMsg, wasEditing ? "Alterações salvas." : "Vaga publicada.", "ok");
    loadJobs();
  });

  // ---------- Login ----------
  el.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    say(el.loginMsg, "");
    const { data, error } = await sb.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value,
    });
    if (error) return say(el.loginMsg, "E-mail ou senha incorretos.", "error");
    $("#password").value = "";
    enter(data.user);
  });

  el.logout.addEventListener("click", async () => {
    await sb.auth.signOut();
    showLogin();
  });

  // ---------- Início ----------
  (async function boot() {
    if (!JB.configured()) {
      showLogin("Falta configurar o Supabase no arquivo js/config.js.");
      return;
    }
    sb = JB.client();
    const { data } = await sb.auth.getSession();
    if (data.session) enter(data.session.user);
    else showLogin();
  })();
})();
