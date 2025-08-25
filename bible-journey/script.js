document.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi Telegram Web App
  const tg = window.Telegram.WebApp;
  tg.expand();
  const user = tg.initDataUnsafe?.user;

  // --- KONFIGURASI ---
  const N8N_GET_USER_STATUS_URL = 'https://n8n.theos-automata.com/webhook/29345b64-6ed5-400f-904a-73b173633fca';
  const N8N_GET_BIBLE_JOURNEY_URL = 'https://n8n.theos-automata.com/webhook/bible-journey-pericope';
  const N8N_GET_THEMATIC_JOURNEYS_URL = 'https://n8n.theos-automata.com/webhook/5aaf51d1-993d-4e62-8830-8abfaccbc430';
  const N8N_GET_BIBLE_PROGRESS_URL = 'https://n8n.theos-automata.com/webhook/b0d6f4eb-ad01-49c1-b26c-84883cbae765';

  // Daftar kitab
  const OLD_TESTAMENT_BOOKS = [
    "Kejadian","Keluaran","Imamat","Bilangan","Ulangan","Yosua","Hakim-hakim","Rut",
    "1 Samuel","2 Samuel","1 Raja-raja","2 Raja-raja","1 Tawarikh","2 Tawarikh",
    "Ezra","Nehemia","Ester","Ayub","Mazmur","Amsal","Pengkhotbah","Kidung Agung",
    "Yesaya","Yeremia","Ratapan","Yehezkiel","Daniel","Hosea","Yoel","Amos","Obaja",
    "Yunus","Mikha","Nahum","Habakuk","Zefanya","Hagai","Zakharia","Maleakhi"
  ];
  const NEW_TESTAMENT_BOOKS = [
    "Matius","Markus","Lukas","Yohanes","Kisah Para Rasul","Roma","1 Korintus","2 Korintus",
    "Galatia","Efesus","Filipi","Kolose","1 Tesalonika","2 Tesalonika","1 Timotius","2 Timotius",
    "Titus","Filemon","Ibrani","Yakobus","1 Petrus","2 Petrus","1 Yohanes","2 Yohanes",
    "3 Yohanes","Yudas","Wahyu"
  ];

  // === ELEMEN DOM ===
  // Tabs
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // Konten Urut
  const oldTestamentList = document.getElementById('old-testament-list');
  const newTestamentList = document.getElementById('new-testament-list');
  const loadingUrut = document.getElementById('loading-indicator-urut');
  const mainContentUrut = document.getElementById('main-content-urut');

  // Konten Tematik
  const loadingTematik = document.getElementById('loading-indicator-tematik');
  const journeyListContainer = document.getElementById('journey-list-container');

  // Templates
  const templates = document.getElementById('templates');
  const bookTemplate = templates.querySelector('.book-item');
  const categoryTemplate = templates.querySelector('.journey-category');
  const journeyTemplate = templates.querySelector('.journey-item');

  // Modal
  const premiumModal = document.getElementById('premium-modal');
  const pericopeModal = document.getElementById('pericope-modal');

  // State
  let currentUserStatus = { isPaid: false };
  let progressDataCache = {}; // <— cache progres kitab

  // === FUNGSI UTIL ===
  async function checkUserStatus() {
    if (!user?.id) {
      console.warn("User ID tidak ditemukan. Menggunakan status default (free).");
      return { isPaid: false, user: null };
    }
    try {
      const res = await fetch(N8N_GET_USER_STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (!res.ok) throw new Error('Gagal memverifikasi status pengguna');
      const data = await res.json();
      return data;
    } catch (e) {
      console.error(e);
      tg.showAlert('Gagal memverifikasi status Anda. Fitur premium mungkin tidak tersedia.');
      return { isPaid: false };
    }
  }

  function setupTabs() {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        tabContents.forEach(c => c.classList.toggle('active', c.id === `${targetTab}-content`));
      });
    });
  }

  // Collapsible (accordion) PL / PB
  function setupCollapsibles() {
    const collapsibles = document.querySelectorAll('.collapsible');
    collapsibles.forEach(header => {
      header.addEventListener('click', function () {
        this.classList.toggle('active');
        const content = this.nextElementSibling;
        content.classList.toggle('show');
      });
    });
  }

  // --- RENDER KITAB (FIX: clone elemen .book-item utuh) ---
  function renderBook(bookName, container) {
    // CLONE elemen .book-item, bukan child di dalamnya
    const bookElement = bookTemplate.cloneNode(true);
    bookElement.classList.add('book-item'); // jaga-jaga
    bookElement.dataset.book = bookName;
    bookElement.querySelector('.book-name').textContent = bookName;

    // Klik kitab => tampilkan info progres / lanjutkan perikop berikutnya
    bookElement.addEventListener('click', () => {
      const p = progressDataCache?.[bookName] ?? { read: 0, total: 0 };
      const nextOrder = Number.isFinite(p.read) ? p.read + 1 : 1;
      // Sementara alert; nanti ganti panggil API showPericope()
      tg.showAlert(`${bookName}\nProgres: ${p.read}/${p.total}\nLanjut ke urutan: ${nextOrder}`);
      // Contoh kalau mau langsung panggil:
      // showPericope(bookName, nextOrder);
    });

    container.appendChild(bookElement);
  }

  // --- DATA PROGRES ---
  async function fetchProgressData() {
    if (!user?.id) {
      console.warn("User ID tidak ditemukan. Tidak dapat memuat progres.");
      return {};
    }

    loadingUrut.classList.remove('hidden');
    mainContentUrut.classList.add('hidden');

    try {
      const response = await fetch(N8N_GET_BIBLE_PROGRESS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (!response.ok) throw new Error(`API request failed: ${response.status}`);
      const progressData = await response.json();
      progressDataCache = progressData; // simpan cache
      return progressData;
    } catch (error) {
      console.error("Error fetching progress data:", error);
      tg.showAlert('Tidak dapat memuat progres Anda.');
      return {};
    } finally {
      loadingUrut.classList.add('hidden');
      mainContentUrut.classList.remove('hidden');
    }
  }

  function updateUrutUI(progressData) {
    let totalReadPL = 0, totalChaptersPL = 0;
    let totalReadPB = 0, totalChaptersPB = 0;

    const allBooks = [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];
    allBooks.forEach(bookName => {
      const p = progressData[bookName] || { read: 0, total: 0 };
      const total = p.total || 1;
      const read = p.read || 0;
      const percentage = Math.round((read / total) * 100) || 0;

      const el = document.querySelector(`.book-item[data-book="${bookName}"]`);
      if (el) {
        el.querySelector('.progress-bar').style.width = `${percentage}%`;
        el.querySelector('.progress-text').textContent = `${read}/${total}`;
        el.querySelector('.progress-percentage').textContent = `${percentage}%`;
      }

      if (OLD_TESTAMENT_BOOKS.includes(bookName)) {
        totalReadPL += read; totalChaptersPL += total;
      } else {
        totalReadPB += read; totalChaptersPB += total;
      }
    });

    const percentagePL = Math.round((totalReadPL / totalChaptersPL) * 100) || 0;
    document.getElementById('pl-summary-text').textContent = `${percentagePL}% Selesai`;

    const percentagePB = Math.round((totalReadPB / totalChaptersPB) * 100) || 0;
    document.getElementById('pb-summary-text').textContent = `${percentagePB}% Selesai`;

    const totalRead = totalReadPL + totalReadPB;
    const totalChapters = totalChaptersPL + totalChaptersPB;
    const overallPercentage = Math.round((totalRead / totalChapters) * 100) || 0;
    document.getElementById('overall-progress-bar').style.width = `${overallPercentage}%`;
    document.getElementById('overall-progress-text').textContent = `${overallPercentage}% (${totalRead}/${totalChapters} Pasal)`;
  }

  // --- TEMATIK ---
  async function fetchThematicJourneys() {
    try {
      const response = await fetch(N8N_GET_THEMATIC_JOURNEYS_URL);
      if (!response.ok) throw new Error('Gagal memuat perjalanan tematik.');
      return await response.json();
    } catch (error) {
      console.error("Error fetching thematic journeys:", error);
      tg.showAlert('Tidak dapat memuat perjalanan tematik.');
      return {};
    }
  }

  function renderThematicJourneys(journeysData, isPaid) {
    loadingTematik.classList.add('hidden');
    journeyListContainer.innerHTML = '';

    for (const categoryName in journeysData) {
      const categoryEl = categoryTemplate.cloneNode(true);
      categoryEl.querySelector('.category-title').textContent = categoryName;
      const itemsContainer = categoryEl.querySelector('.journey-items');

      journeysData[categoryName].forEach(journey => {
        const itemEl = journeyTemplate.cloneNode(true);
        itemEl.querySelector('.journey-title').textContent = journey.title;
        itemEl.querySelector('.journey-description').textContent = journey.description;

        if (isPaid) {
          const progress = journey.progress || { read: 0 };
          const total = journey.total_days || 1;
          const percentage = Math.round((progress.read / total) * 100) || 0;

          itemEl.querySelector('.progress-bar').style.width = `${percentage}%`;
          itemEl.querySelector('.journey-progress .progress-text').textContent = `${progress.read}/${total} Hari`;

          itemEl.addEventListener('click', (e) => {
            e.preventDefault();
            tg.showAlert(`Membuka journey: ${journey.title}`);
          });
        } else {
          itemEl.classList.add('locked');
          itemEl.addEventListener('click', (e) => {
            e.preventDefault();
            premiumModal.classList.remove('hidden');
          });
        }

        itemsContainer.appendChild(itemEl);
      });

      journeyListContainer.appendChild(categoryEl);
    }
  }

  // --- MODAL ---
  function setupModals() {
    // Premium
    premiumModal.querySelector('.close-button')
      .addEventListener('click', () => premiumModal.classList.add('hidden'));
    premiumModal.addEventListener('click', (e) => {
      if (e.target === premiumModal) premiumModal.classList.add('hidden');
    });
    document.getElementById('upgrade-button')
      .addEventListener('click', () => tg.openLink('https://t.me/YourPremiumBotOrChannelLink'));

    // Pericope
    pericopeModal.querySelector('.close-button')
      .addEventListener('click', () => pericopeModal.classList.add('hidden'));
    pericopeModal.addEventListener('click', (e) => {
      if (e.target === pericopeModal) pericopeModal.classList.add('hidden');
    });
  }

  // (Opsional) contoh implementasi showPericope — panggil API n8n nanti
  async function showPericope(bookName, order) {
    try {
      // Tampilkan modal + loader (opsional)
      pericopeModal.classList.remove('hidden');
      tg.showAlert(`(Demo) Ambil perikop: ${bookName} urutan ${order}`);
      // Contoh request:
      // const res = await fetch(N8N_GET_BIBLE_JOURNEY_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId: user?.id, book: bookName, order })
      // });
      // const data = await res.json();
      // TODO: isi elemen di modal dari "data"
    } catch (e) {
      console.error(e);
      tg.showAlert('Gagal memuat perikop.');
    }
  }

  // --- MAIN ---
  async function main() {
    setupTabs();
    setupCollapsibles();
    setupModals();

    currentUserStatus = await checkUserStatus();

    // Render daftar kitab (kosongkan dulu biar rapi saat re-render)
    oldTestamentList.innerHTML = '';
    newTestamentList.innerHTML = '';
    OLD_TESTAMENT_BOOKS.forEach(b => renderBook(b, oldTestamentList));
    NEW_TESTAMENT_BOOKS.forEach(b => renderBook(b, newTestamentList));

    // Muat progres & tematik paralel
    const progressDataPromise = fetchProgressData().then(updateUrutUI);
    loadingTematik.classList.remove('hidden');
    const thematicJourneysPromise = fetchThematicJourneys()
      .then(data => renderThematicJourneys(data, currentUserStatus.isPaid));

    await Promise.all([progressDataPromise, thematicJourneysPromise]);
  }

  main();
});
