const STORAGE_KEY = "twodogs_store_v1";
const ADMIN_CREDENTIALS = {
  email: "2dogsadmin@studio.co",
  password: "2dogsadminpass",
};

const demoData = {
  catalog: [
    {
      id: crypto.randomUUID(),
      type: "game",
      title: "Nebula Strikers",
      price: 39.99,
      image:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
      description: "Arena sci-fi shooter with squad-based ranked modes.",
      status: "published",
    },
    {
      id: crypto.randomUUID(),
      type: "game",
      title: "Rally City X",
      price: 24.99,
      image:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
      description: "Urban racing with dynamic weather and drift leagues.",
      status: "published",
    },
    {
      id: crypto.randomUUID(),
      type: "app",
      title: "CreatorForge Studio",
      price: 14.99,
      image:
        "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1200&q=80",
      description: "Video and social creative toolkit for pro teams.",
      status: "published",
    },
  ],
  submissions: [],
  users: {
    player: { name: "Player One", avatar: "", library: [], installed: [] },
    developer: null,
    adminLoggedIn: false,
  },
};

const state = loadState();
const $ = (selector) => document.querySelector(selector);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoData));
    return structuredClone(demoData);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(demoData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderStore();
  renderApps();
  renderLibrary();
  renderSubmissions();
  renderPendingReviews();
  renderCatalogEditor();
  renderProfilePreview();
}

function cardFactory(item, includeInstall = false) {
  const tpl = $("#itemTemplate").content.cloneNode(true);
  tpl.querySelector("img").src = item.image || "https://picsum.photos/seed/2dogs/500/300";
  tpl.querySelector("h3").textContent = item.title;
  tpl.querySelector(".pill").textContent = item.type.toUpperCase();
  tpl.querySelector(".desc").textContent = item.description;
  tpl.querySelector(".price").textContent = item.price > 0 ? `$${item.price.toFixed(2)}` : "FREE";

  const actions = tpl.querySelector(".actions");
  const buyBtn = document.createElement("button");
  buyBtn.className = "primary";
  const owned = state.users.player.library.includes(item.id);
  buyBtn.textContent = owned ? "Owned" : item.price > 0 ? "Purchase" : "Get";
  buyBtn.disabled = owned;
  buyBtn.onclick = () => purchaseItem(item.id);
  actions.append(buyBtn);

  if (includeInstall) {
    const isInstalled = state.users.player.installed.includes(item.id);
    const installBtn = document.createElement("button");
    installBtn.className = "ghost";
    installBtn.textContent = isInstalled ? "Installed" : "Install on PC";
    installBtn.disabled = isInstalled;
    installBtn.onclick = () => installItem(item.id);
    actions.append(installBtn);
  }
  return tpl;
}

function renderStore() {
  const grid = $("#storeGrid");
  grid.innerHTML = "";
  state.catalog
    .filter((item) => item.status === "published" && item.type === "game")
    .forEach((item) => grid.append(cardFactory(item)));
}

function renderApps() {
  const grid = $("#appsGrid");
  grid.innerHTML = "";
  state.catalog
    .filter((item) => item.status === "published" && item.type === "app")
    .forEach((item) => grid.append(cardFactory(item)));
}

function renderLibrary() {
  const grid = $("#libraryGrid");
  grid.innerHTML = "";
  const owned = state.catalog.filter((item) => state.users.player.library.includes(item.id));
  if (!owned.length) {
    grid.innerHTML = `<div class="notice">No purchases yet. Buy something from Store or Apps.</div>`;
    return;
  }
  owned.forEach((item) => grid.append(cardFactory(item, true)));
}

function renderSubmissions() {
  const target = $("#mySubmissions");
  target.innerHTML = "";

  const dev = state.users.developer;
  if (!dev) {
    target.innerHTML = `<div class="notice">Sign in as a developer to manage submissions.</div>`;
    return;
  }

  const mine = state.submissions.filter((s) => s.developerEmail === dev.email);
  if (!mine.length) {
    target.innerHTML = `<div class="notice">No submissions yet.</div>`;
    return;
  }

  mine.forEach((s) => {
    const box = document.createElement("div");
    box.className = "card panel";
    box.innerHTML = `<strong>${s.title}</strong> · ${s.type.toUpperCase()} · <span>${s.reviewStatus}</span><p class="tiny">${s.description}</p>`;
    target.append(box);
  });
}

function renderPendingReviews() {
  const target = $("#pendingReviews");
  target.innerHTML = "";
  if (!state.users.adminLoggedIn) {
    target.innerHTML = `<div class="notice">Admin sign in required.</div>`;
    return;
  }

  const pending = state.submissions.filter((s) => s.reviewStatus === "pending");
  if (!pending.length) {
    target.innerHTML = `<div class="notice">No pending submissions.</div>`;
    return;
  }

  pending.forEach((s) => {
    const row = document.createElement("div");
    row.className = "card panel";
    row.innerHTML = `<strong>${s.title}</strong> by ${s.developerEmail}<p class="tiny">${s.description}</p>`;
    const actions = document.createElement("div");
    actions.className = "row";

    const approve = document.createElement("button");
    approve.className = "primary";
    approve.textContent = "Approve & Publish";
    approve.onclick = () => approveSubmission(s.id);

    const reject = document.createElement("button");
    reject.className = "ghost danger";
    reject.textContent = "Reject";
    reject.onclick = () => rejectSubmission(s.id);

    actions.append(approve, reject);
    row.append(actions);
    target.append(row);
  });
}

function renderCatalogEditor() {
  const target = $("#catalogEditor");
  target.innerHTML = "";
  if (!state.users.adminLoggedIn) {
    target.innerHTML = `<div class="notice">Admin sign in required for full catalog editing.</div>`;
    return;
  }

  state.catalog.filter((i) => i.status === "published").forEach((item) => {
    const row = document.createElement("div");
    row.className = "card panel";
    row.innerHTML = `<strong>${item.title}</strong> <span class="tiny">(${item.type})</span>`;

    const form = document.createElement("form");
    form.className = "form";
    form.innerHTML = `
      <input value="${escapeHtml(item.title)}" data-field="title" />
      <input type="number" min="0" step="0.01" value="${item.price}" data-field="price" />
      <textarea data-field="description">${escapeHtml(item.description)}</textarea>
      <input value="${escapeHtml(item.image || "")}" data-field="image" />
      <div class="row">
        <button class="primary" type="submit">Save</button>
        <button class="ghost danger" type="button" data-delete="1">Remove</button>
      </div>
    `;

    form.onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(
        [...form.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el.value]),
      );
      editCatalog(item.id, data);
    };

    form.querySelector("[data-delete]").onclick = () => removeCatalogItem(item.id);

    row.append(form);
    target.append(row);
  });
}

function purchaseItem(itemId) {
  if (state.users.player.library.includes(itemId)) return;
  state.users.player.library.push(itemId);
  saveState();
  render();
}

function installItem(itemId) {
  if (!state.users.player.library.includes(itemId)) return;
  if (!state.users.player.installed.includes(itemId)) {
    state.users.player.installed.push(itemId);
    saveState();
    render();
  }
}

function approveSubmission(submissionId) {
  const sub = state.submissions.find((s) => s.id === submissionId);
  if (!sub) return;
  sub.reviewStatus = "approved";
  state.catalog.push({ ...sub, status: "published" });
  saveState();
  render();
}

function rejectSubmission(submissionId) {
  const sub = state.submissions.find((s) => s.id === submissionId);
  if (!sub) return;
  sub.reviewStatus = "rejected";
  saveState();
  render();
}

function editCatalog(itemId, updates) {
  const item = state.catalog.find((i) => i.id === itemId);
  if (!item) return;
  item.title = updates.title;
  item.price = Number(updates.price) || 0;
  item.description = updates.description;
  item.image = updates.image;
  saveState();
  render();
}

function removeCatalogItem(itemId) {
  state.catalog = state.catalog.filter((i) => i.id !== itemId);
  state.users.player.library = state.users.player.library.filter((id) => id !== itemId);
  state.users.player.installed = state.users.player.installed.filter((id) => id !== itemId);
  saveState();
  render();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
      $("#" + btn.dataset.tab).classList.add("active");
    };
  });

  $("#goStore").onclick = () => document.querySelector('[data-tab="store"]').click();
  $("#goDev").onclick = () => document.querySelector('[data-tab="developer"]').click();
}

function setupForms() {
  $("#publishForm").onsubmit = (e) => {
    e.preventDefault();
    if (!state.users.developer) {
      alert("Sign in as developer first.");
      return;
    }

    const submission = {
      id: crypto.randomUUID(),
      title: $("#itemTitle").value.trim(),
      type: $("#itemType").value,
      price: Number($("#itemPrice").value),
      image: $("#itemImage").value.trim() || "https://picsum.photos/seed/publish/500/300",
      description: $("#itemDesc").value.trim(),
      reviewStatus: "pending",
      developerEmail: state.users.developer.email,
    };

    state.submissions.push(submission);
    saveState();
    e.target.reset();
    render();
  };

  $("#devLoginForm").onsubmit = (e) => {
    e.preventDefault();
    state.users.developer = {
      email: $("#devEmail").value.trim(),
      password: $("#devPassword").value,
    };
    saveState();
    render();
  };

  $("#adminLoginForm").onsubmit = (e) => {
    e.preventDefault();
    const email = $("#adminEmail").value.trim();
    const password = $("#adminPassword").value;
    state.users.adminLoggedIn =
      email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password;
    alert(state.users.adminLoggedIn ? "Admin login successful." : "Invalid admin credentials.");
    saveState();
    render();
  };

  $("#logoutAdmin").onclick = () => {
    state.users.adminLoggedIn = false;
    saveState();
    render();
  };

  $("#seedData").onclick = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoData));
    location.reload();
  };

  $("#openUserModal").onclick = () => $("#userModal").showModal();
  $("#closeUserModal").onclick = () => $("#userModal").close();

  $("#userForm").onsubmit = (e) => {
    e.preventDefault();
    state.users.player.name = $("#displayName").value.trim();
    state.users.player.avatar = $("#avatarUrl").value.trim();
    saveState();
    renderProfilePreview();
  };
}

function renderProfilePreview() {
  $("#displayName").value = state.users.player.name;
  $("#avatarUrl").value = state.users.player.avatar;
  const container = $("#profilePreview");
  container.innerHTML = `
    <div class="profile">
      <img class="avatar" src="${state.users.player.avatar || "https://i.pravatar.cc/80?img=12"}" alt="avatar" />
      <div>
        <strong>${escapeHtml(state.users.player.name)}</strong>
        <p class="tiny">Owned: ${state.users.player.library.length} · Installed: ${state.users.player.installed.length}</p>
      </div>
    </div>
  `;
}

function bootParticles() {
  const canvas = $("#particles");
  const ctx = canvas.getContext("2d");
  const particles = Array.from({ length: 80 }).map(() => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
  }));

  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  };
  addEventListener("resize", resize);
  resize();

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(138,196,255,0.55)";
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  draw();
}

setupTabs();
setupForms();
render();
bootParticles();
