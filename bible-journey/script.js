document.addEventListener('DOMContentLoaded', () => {
  // === Telegram WebApp ===
  const tg = window.Telegram.WebApp;
  tg.expand();
  const user = tg.initDataUnsafe?.user;

  // === CONFIG (n8n webhook) ===
  const N8N_GET_USER_STATUS_URL   = 'https://n8n.theos-automata.com/webhook/29345b64-6ed5-400f-904a-73b173633fca';
  const N8N_GET_BIBLE_JOURNEY_URL = 'https://n8n.theos-automata.com/webhook/bible-journey-pericope';
  const N8N_GET_THEMATIC_JOURNEYS_URL = 'https://n8n.theos-automata.com/webhook/5aaf51d1-993d-4e62-8830-8abfaccbc430';
  const N8N_GET_BIBLE_PROGRESS_URL = 'https://n8n.theos-automata.com/webhook/b0d6f4eb-ad01-49c1-b26c-84883cbae765';

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

  const premiumModal = document.getElementById('premium-modal');
  const pericopeModal = document.getElementById('pericope-modal');

  // === STATE ===
  let currentUserStatus = { isPaid: false };
  let progressDataCache = {};

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
    } catch (e) {
      console.warn(e);
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

  // === FIX: Accordion reliable (uses maxHeight instead of only class) ===
  function setupCollapsibles() {
    document.querySelectorAll('.collapsible').forEach(header => {
      const content = header.nextElementSibling;
      // buka default bila sudah punya class 'show' di HTML
      if (content.classList.contains('show')) {
        content.style.maxHeight = content.scrollHeight + 'px';
        header.classList.add('active');
      }
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        // toggle tinggi
        if (content.style.maxHeight && content.style.maxHeight !== '0px') {
          content.style.maxHeight = '0px';
          content.classList.remove('show');
        } else {
          content.classList.add('show');
          // hitung ulang tinggi aktual setelah item dirender
          requestAnimationFrame(() => {
            content.style.maxHeight = content.scrollHeight + 'px';
          });
        }
      });
    });
  }

  // === RENDER KITAB (FIX: clone elemen .book-item utuh) ===
  function renderBook(bookName, container) {
    const el = bookTemplate.cloneNode(true);       // <— penting: clone .book-item
    el.classList.add('book-item');                 // jaga-jaga
    el.dataset.book = bookName;
    el.querySelector('.book-name').textContent = bookName;

    el.addEventListener('click', () => {
      const p = progressDataCache?.[bookName] ?? { read: 0, total: 0 };
      const nextOrder = Number.isFinite(p.read) ? p.read + 1 : 1;
      // sementara alert; nanti bisa panggil showPericope(bookName, nextOrder)
      tg.showAlert(`${bookName}\nProgres: ${p.read}/${p.total}\nLanjut ke urutan: ${nextOrder}`);
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
      console.error(e);
      tg.showAlert('Tidak dapat memuat progres Anda.');
      return {};
    } finally {
      loadingUrut.classList.add('hidden');
      mainUrut.classList.remove('hidden');
      // setelah konten terlihat, pastikan tinggi accordion disesuaikan lagi
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

    // pastikan tinggi accordion dihitung ulang setelah items terpasang
    document.querySelectorAll('.content.show').forEach(c=>{
      c.style.maxHeight = c.scrollHeight + 'px';
    });
  }

  async function fetchThematicJourneys() {
    try {
      const r = await fetch(N8N_GET_THEMATIC_JOURNEYS_URL);
      if (!r.ok) throw new Error('journeys request failed');
      return await r.json();
    } catch (e) {
      console.error(e);
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

  function setupModals() {
    // premium
    premiumModal.querySelector('.close-button').addEventListener('click', ()=>premiumModal.classList.add('hidden'));
    premiumModal.addEventListener('click', e=>{ if(e.target===premiumModal) premiumModal.classList.add('hidden'); });
    document.getElementById('upgrade-button').addEventListener('click', ()=>tg.openLink('https://t.me/YourPremiumBotOrChannelLink'));
    // pericope
    pericopeModal.querySelector('.close-button').addEventListener('click', ()=>pericopeModal.classList.add('hidden'));
    pericopeModal.addEventListener('click', e=>{ if(e.target===pericopeModal) pericopeModal.classList.add('hidden'); });
  }

  // === MAIN ===
  async function main() {
    setupTabs();
    setupCollapsibles();
    setupModals();

    // render list kitab terlebih dulu (agar saat header dibuka, ada konten)
    oldList.innerHTML = '';
    newList.innerHTML = '';
    OT.forEach(b => renderBook(b, oldList));
    NT.forEach(b => renderBook(b, newList));

    currentUserStatus = await checkUserStatus();

    // muat data
    const p1 = fetchProgressData().then(updateUrutUI);
    loadingTematik.classList.remove('hidden');
    const p2 = fetchThematicJourneys().then(d => renderThematicJourneys(d, currentUserStatus.isPaid));

    await Promise.all([p1, p2]);
  }

  main();
});
