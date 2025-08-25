document.addEventListener('DOMContentLoaded', () => {
  // === Telegram WebApp ===
  const tg = window.Telegram.WebApp;
  tg.expand();
  const user = tg.initDataUnsafe?.user;

  // === CONFIG (n8n webhook) ===
  const N8N_GET_USER_STATUS_URL     = 'https://n8n.theos-automata.com/webhook/29345b64-6ed5-400f-904a-73b173633fca';
  const N8N_GET_BIBLE_JOURNEY_URL   = 'https://n8n.theos-automata.com/webhook/bible-journey-pericope';
  const N8N_GET_THEMATIC_JOURNEYS_URL = 'https://n8n.theos-automata.com/webhook/5aaf51d1-993d-4e62-8830-8abfaccbc430';
  const N8N_GET_BIBLE_PROGRESS_URL  = 'https://n8n.theos-automata.com/webhook/b0d6f4eb-ad01-49c1-b26c-84883cbae765';

  // Tambahan endpoint (silakan sesuaikan di n8n):
  const N8N_UPDATE_PROGRESS_URL     = 'https://n8n.theos-automata.com/webhook/bible-journey-update-progress';
  const N8N_RESET_PROGRESS_URL      = 'https://n8n.theos-automata.com/webhook/bible-journey-reset-progress';

  // === DATA KITAB ===
  const OT = ["Kejadian","Keluaran","Imamat","Bilangan","Ulangan","Yosua","Hakim-hakim","Rut","1 Samuel","2 Samuel","1 Raja-raja","2 Raja-raja","1 Tawarikh","2 Tawarikh","Ezra","Nehemia","Ester","Ayub","Mazmur","Amsal","Pengkhotbah","Kidung Agung","Yesaya","Yeremia","Ratapan","Yehezkiel","Daniel","Hosea","Yoel","Amos","Obaja","Yunus","Mikha","Nahum","Habakuk","Zefanya","Hagai","Zakharia","Maleakhi"];
  const NT = ["Matius","Markus","Lukas","Yohanes","Kisah Para Rasul","Roma","1 Korintus","2 Korintus","Galatia","Efesus","Filipi","Kolose","1 Tesalonika","2 Tesalonika","1 Timotius","2 Timotius","Titus","Filemon","Ibrani","Yakobus","1 Petrus","2 Petrus","1 Yohanes","2 Yohanes","3 Yohanes","Yudas","Wahyu"];

  // === DOM ===
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  const oldList = document.getElementById('old-testament-list');
  const newList = document.getElementById('new-testament-list');
  const loadingUrut = document.getElementById('loading-indicator-urut');
  const mainUrut = document.getElementById('main-content-urut');

  const loadingTematik = document.getElementById('loading-indicator-tematik');
  const journeyListContainer = document.getElementById('journey-list-container');

  const templates = document.getElementById('templates');
  const bookTemplate = templates.querySelector('.book-item');
  const categoryTemplate = templates.querySelector('.journey-category');
  const journeyTemplate = templates.querySelector('.journey-item');

  // Modal Perikop
  const pericopeModal = document.getElementById('pericope-modal');
  const pericopeTitle = document.getElementById('pericope-title');
  const pericopeTheo  = document.getElementById('pericope-theology');
  const pericopeRefl  = document.getElementById('pericope-reflection');
  const modalLoader   = document.getElementById('modal-loader');
  const btnPrev       = document.getElementById('prev-button');
  const btnNext       = document.getElementById('next-button');

  // Modal Premium
  const premiumModal = document.getElementById('premium-modal');

  // Tombol reset
  const resetBtn = document.getElementById('reset-progress-btn');

  // === STATE ===
  let currentUserStatus = { isPaid: false };
  let progressDataCache = {};
  // State perikop aktif
  let currentBook = null;
  let currentOrder = 1;
  let maxOrder = 1; // total perikop di kitab tsb (opsional dari API)

  // === UTILS ===
  async function checkUserStatus() {
    if (!user?.id) return { isPaid: false };
    try {
      const r = await fetch(N8N_GET_USER_STATUS_URL, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId: user.id })
      });
      if (!r.ok) throw new Error('status request failed');
      return await r.json();
    } catch {
      return { isPaid: false };
    }
  }

  function setupTabs() {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContents.forEach(c => c.classList.toggle('active', c.id === `${target}-content`));
      });
    });
  }

  // Accordion pakai maxHeight (stabil di Telegram)
  function setupCollapsibles() {
    document.querySelectorAll('.collapsible').forEach(header => {
      const content = header.nextElementSibling;
      // default open jika ada .show di HTML
      if (content.classList.contains('show')) {
        content.style.maxHeight = content.scrollHeight + 'px';
        header.classList.add('active');
      }
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        if (content.style.maxHeight && content.style.maxHeight !== '0px') {
          content.style.maxHeight = '0px';
          content.classList.remove('show');
        } else {
          content.classList.add('show');
          requestAnimationFrame(() => {
            content.style.maxHeight = content.scrollHeight + 'px';
          });
        }
      });
    });
  }

  // Render buku
  function renderBook(bookName, container) {
    const el = bookTemplate.cloneNode(true);
    el.classList.add('book-item');
    el.dataset.book = bookName;
    el.querySelector('.book-name').textContent = bookName;

    el.addEventListener('click', () => {
      const p = progressDataCache?.[bookName] ?? { read: 0, total: 0 };
      const nextOrder = Number.isFinite(p.read) ? p.read + 1 : 1;
      showPericope(bookName, nextOrder);
    });

    container.appendChild(el);
  }

  async function fetchProgressData() {
    if (!user?.id) return {};
    loadingUrut.classList.remove('hidden');
    mainUrut.classList.add('hidden');
    try {
      const r = await fetch(N8N_GET_BIBLE_PROGRESS_URL, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId: user.id })
      });
      if (!r.ok) throw new Error('progress request failed');
      const data = await r.json();
      progressDataCache = data;
      return data;
    } catch (e) {
      tg.showAlert('Tidak dapat memuat progres Anda.');
      return {};
    } finally {
      loadingUrut.classList.add('hidden');
      mainUrut.classList.remove('hidden');
      document.querySelectorAll('.content.show').forEach(c=>{
        c.style.maxHeight = c.scrollHeight + 'px';
      });
    }
  }

  function updateUrutUI(progressData) {
    let plR=0, plT=0, pbR=0, pbT=0;

    [...OT, ...NT].forEach(name => {
      const p = progressData[name] || { read:0, total:0 };
      const total = p.total || 1;
      const read = p.read || 0;
      const pct  = Math.round((read/total)*100) || 0;

      const item = document.querySelector(`.book-item[data-book="${name}"]`);
      if (item) {
        item.querySelector('.progress-bar').style.width = `${pct}%`;
        item.querySelector('.progress-text').textContent = `${read}/${total}`;
        item.querySelector('.progress-percentage').textContent = `${pct}%`;
      }
      if (OT.includes(name)) { plR+=read; plT+=total; } else { pbR+=read; pbT+=total; }
    });

    const plPct = Math.round((plR/plT)*100) || 0;
    const pbPct = Math.round((pbR/pbT)*100) || 0;
    document.getElementById('pl-summary-text').textContent = `${plPct}% Selesai`;
    document.getElementById('pb-summary-text').textContent = `${pbPct}% Selesai`;

    const allR = plR+pbR, allT = plT+pbT;
    const allPct = Math.round((allR/allT)*100) || 0;
    document.getElementById('overall-progress-bar').style.width = `${allPct}%`;
    document.getElementById('overall-progress-text').textContent = `${allPct}% (${allR}/${allT} Pasal)`;

    // sesuaikan tinggi accordion (item baru)
    document.querySelectorAll('.content.show').forEach(c=>{
      c.style.maxHeight = c.scrollHeight + 'px';
    });
  }

  async function fetchThematicJourneys() {
    try {
      const r = await fetch(N8N_GET_THEMATIC_JOURNEYS_URL);
      if (!r.ok) throw new Error('journeys request failed');
      return await r.json();
    } catch {
      return {};
    }
  }

  function renderThematicJourneys(data, isPaid) {
    loadingTematik.classList.add('hidden');
    journeyListContainer.innerHTML = '';
    for (const category in data) {
      const catEl = categoryTemplate.cloneNode(true);
      catEl.querySelector('.category-title').textContent = category;
      const items = catEl.querySelector('.journey-items');
      (data[category] || []).forEach(j => {
        const it = journeyTemplate.cloneNode(true);
        it.querySelector('.journey-title').textContent = j.title;
        it.querySelector('.journey-description').textContent = j.description;
        if (isPaid) {
          const read = j.progress?.read ?? 0;
          const total = j.total_days || 1;
          const pct = Math.round((read/total)*100) || 0;
          it.querySelector('.progress-bar').style.width = `${pct}%`;
          it.querySelector('.journey-progress .progress-text').textContent = `${read}/${total} Hari`;
          it.addEventListener('click', e => { e.preventDefault(); tg.showAlert(`Membuka: ${j.title}`); });
        } else {
          it.classList.add('locked');
          it.addEventListener('click', e => { e.preventDefault(); premiumModal.classList.remove('hidden'); });
        }
        items.appendChild(it);
      });
      journeyListContainer.appendChild(catEl);
    }
  }

  // ====== PERIKOP: fetch + render + navigasi ======
  function setNavDisabled() {
    btnPrev.disabled = currentOrder <= 1;
    btnNext.disabled = currentOrder >= maxOrder;
  }

  function showModal() {
    pericopeModal.classList.remove('hidden');
  }
  function hideModal() {
    pericopeModal.classList.add('hidden');
  }
  function setModalLoading(isLoading) {
    if (isLoading) {
      modalLoader.classList.remove('hidden');
      pericopeTitle.textContent = '';
      pericopeTheo.textContent  = '';
      pericopeRefl.textContent  = '';
    } else {
      modalLoader.classList.add('hidden');
    }
  }

  async function getPericopeFromAPI(book, order) {
    // Harapkan respons: { title, theology, reflection, order, max_order }
    const payload = { userId: user?.id, book, order };
    const r = await fetch(N8N_GET_BIBLE_JOURNEY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('fetch pericope failed');
    return await r.json();
  }

  async function markProgress(book, readCount) {
    // readCount bisa berupa angka order (pasal/perikop yang dibaca)
    const body = { userId: user?.id, book, read: readCount };
    const r = await fetch(N8N_UPDATE_PROGRESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('update progress failed');
    return await r.json();
  }

  async function refreshProgressUI() {
    const data = await fetchProgressData();
    updateUrutUI(data);
  }

  async function renderPericope(book, order) {
    setModalLoading(true);
    try {
      const data = await getPericopeFromAPI(book, order);

      // Dukungan varian nama field dari n8n
      const title = data.title ?? data.pericope_title ?? `${book} • Urutan ${order}`;
      const theology = data.theology ?? data.meaning ?? data.theological_meaning ?? '';
      const reflection = data.reflection ?? data.application ?? data.devotional ?? '';

      currentBook = book;
      currentOrder = data.order ?? order ?? 1;
      maxOrder = data.max_order ?? data.total ?? progressDataCache?.[book]?.total ?? currentOrder;

      pericopeTitle.textContent = title;
      pericopeTheo.textContent  = theology;
      pericopeRefl.textContent  = reflection;

      setModalLoading(false);
      setNavDisabled();
    } catch (e) {
      setModalLoading(false);
      tg.showAlert('Gagal memuat perikop.');
      console.error(e);
    }
  }

  // API publik yang dipanggil saat klik kitab
  async function showPericope(book, order) {
    showModal();
    await renderPericope(book, order);
  }

  // Event modal (close + nav)
  pericopeModal.querySelector('.close-button')
    .addEventListener('click', hideModal);
  pericopeModal.addEventListener('click', (e) => {
    if (e.target === pericopeModal) hideModal();
  });

  btnPrev.addEventListener('click', async () => {
    if (currentOrder <= 1) return;
    const nextOrder = currentOrder - 1;
    await renderPericope(currentBook, nextOrder);
    // Tidak mengubah progress saat mundur
  });

  btnNext.addEventListener('click', async () => {
    if (currentOrder >= maxOrder) return;
    const nextOrder = currentOrder + 1;

    // Anggap setiap kali user tekan "Berikutnya" berarti perikop saat ini sudah dianggap dibaca.
    // Kita update progress ke 'currentOrder' (atau ke 'nextOrder - 1')
    try {
      const readTo = currentOrder; // perikop yang baru saja selesai
      await markProgress(currentBook, readTo);
      await refreshProgressUI();
    } catch (e) {
      console.error(e);
      // lanjut render perikop berikutnya walau update gagal
    }

    await renderPericope(currentBook, nextOrder);
  });

  // ====== RESET PROGRESS ======
  resetBtn?.addEventListener('click', async () => {
    const ok = confirm('Yakin reset semua progres ke 0? Tindakan ini tidak bisa dibatalkan.');
    if (!ok) return;
    try {
      const r = await fetch(N8N_RESET_PROGRESS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      if (!r.ok) throw new Error('reset failed');
      await refreshProgressUI();
      tg.showAlert('Progres berhasil direset.');
    } catch (e) {
      console.error(e);
      tg.showAlert('Gagal mereset progres.');
    }
  });

  // ====== PREMIUM MODAL ======
  function setupModals() {
    // premium modal
    premiumModal.querySelector('.close-button')
      .addEventListener('click', () => premiumModal.classList.add('hidden'));
    premiumModal.addEventListener('click', (e) => {
      if (e.target === premiumModal) premiumModal.classList.add('hidden');
    });
    document.getElementById('upgrade-button')
      .addEventListener('click', () => tg.openLink('https://t.me/YourPremiumBotOrChannelLink'));
  }

  // ====== TEMATIK ======
  function renderThematicJourneys(data, isPaid) {
    loadingTematik.classList.add('hidden');
    journeyListContainer.innerHTML = '';
    for (const category in data) {
      const catEl = categoryTemplate.cloneNode(true);
      catEl.querySelector('.category-title').textContent = category;
      const items = catEl.querySelector('.journey-items');
      (data[category] || []).forEach(j => {
        const it = journeyTemplate.cloneNode(true);
        it.querySelector('.journey-title').textContent = j.title;
        it.querySelector('.journey-description').textContent = j.description;
        if (isPaid) {
          const read = j.progress?.read ?? 0;
          const total = j.total_days || 1;
          const pct = Math.round((read/total)*100) || 0;
          it.querySelector('.progress-bar').style.width = `${pct}%`;
          it.querySelector('.journey-progress .progress-text').textContent = `${read}/${total} Hari`;
          it.addEventListener('click', e => { e.preventDefault(); tg.showAlert(`Membuka: ${j.title}`); });
        } else {
          it.classList.add('locked');
          it.addEventListener('click', e => { e.preventDefault(); premiumModal.classList.remove('hidden'); });
        }
        items.appendChild(it);
      });
      journeyListContainer.appendChild(catEl);
    }
  }

  // ====== MAIN ======
  async function main() {
    setupTabs();
    setupCollapsibles();
    setupModals();

    // Render list kitab dulu
    oldList.innerHTML = '';
    newList.innerHTML = '';
    OT.forEach(b => renderBook(b, oldList));
    NT.forEach(b => renderBook(b, newList));

    // Load data
    currentUserStatus = await checkUserStatus();
    const p1 = fetchProgressData().then(updateUrutUI);
    loadingTematik.classList.remove('hidden');
    const p2 = fetchThematicJourneys().then(d => renderThematicJourneys(d, currentUserStatus.isPaid));
    await Promise.all([p1, p2]);
  }

  main();
});
