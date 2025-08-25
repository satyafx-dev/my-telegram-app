document.addEventListener('DOMContentLoaded', () => {

    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.expand();
    const user = tg.initDataUnsafe?.user;

    // --- KONFIGURASI ---
    // GANTI DENGAN URL WEBHOOK N8N ANDA
    const N8N_GET_USER_STATUS_URL = 'https://n8n.theos-automata.com/webhook/29345b64-6ed5-400f-904a-73b173633fca';
    const N8N_GET_BIBLE_JOURNEY_URL = 'https://n8n.theos-automata.com/webhook/bible-journey-pericope'; // Ganti jika URL berbeda
    const N8N_GET_THEMATIC_JOURNEYS_URL = 'https://n8n.theos-automata.com/webhook/5aaf51d1-993d-4e62-8830-8abfaccbc430'; // Buat webhook ini di n8n
    const N8N_GET_BIBLE_PROGRESS_URL = 'https://n8n.theos-automata.com/webhook/b0d6f4eb-ad01-49c1-b26c-84883cbae765';
    
    // Daftar kitab (bisa juga diambil dari API nanti)
    const OLD_TESTAMENT_BOOKS = [ "Kejadian", "Keluaran", "Imamat", "Bilangan", "Ulangan", "Yosua", "Hakim-hakim", "Rut", "1 Samuel", "2 Samuel", "1 Raja-raja", "2 Raja-raja", "1 Tawarikh", "2 Tawarikh", "Ezra", "Nehemia", "Ester", "Ayub", "Mazmur", "Amsal", "Pengkhotbah", "Kidung Agung", "Yesaya", "Yeremia", "Ratapan", "Yehezkiel", "Daniel", "Hosea", "Yoel", "Amos", "Obaja", "Yunus", "Mikha", "Nahum", "Habakuk", "Zefanya", "Hagai", "Zakharia", "Maleakhi" ];
    const NEW_TESTAMENT_BOOKS = [ "Matius", "Markus", "Lukas", "Yohanes", "Kisah Para Rasul", "Roma", "1 Korintus", "2 Korintus", "Galatia", "Efesus", "Filipi", "Kolose", "1 Tesalonika", "2 Tesalonika", "1 Timotius", "2 Timotius", "Titus", "Filemon", "Ibrani", "Yakobus", "1 Petrus", "2 Petrus", "1 Yohanes", "2 Yohanes", "3 Yohanes", "Yudas", "Wahyu" ];

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

    // Template
    const templates = document.getElementById('templates');
    const bookTemplate = templates.querySelector('.book-item');
    const categoryTemplate = templates.querySelector('.journey-category');
    const journeyTemplate = templates.querySelector('.journey-item');

    // Modal
    const premiumModal = document.getElementById('premium-modal');
    const pericopeModal = document.getElementById('pericope-modal');
    
    // State Aplikasi
    let currentUserStatus = { isPaid: false }; // Default ke free user

    // === FUNGSI-FUNGSI APLIKASI ===

    /**
     * [BARU] Memeriksa status user (paid/free) dari backend (n8n).
     * Ini adalah langkah keamanan penting, jangan pernah mempercayai data dari client.
     */
    async function checkUserStatus() {
        if (!user?.id) {
            console.warn("User ID tidak ditemukan. Menggunakan status default.");
            return { isPaid: false, user: null };
        }
        try {
            const response = await fetch(N8N_GET_USER_STATUS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            if (!response.ok) throw new Error('Gagal memverifikasi status pengguna.');
            const data = await response.json();
            // Pastikan n8n mengembalikan format { isPaid: true/false }
            return data; 
        } catch (error) {
            console.error("Error saat memeriksa status user:", error);
            tg.showAlert('Gagal memverifikasi status Anda. Fitur premium mungkin tidak tersedia.');
            return { isPaid: false };
        }
    }

    /**
     * [BARU] Logika untuk mengganti tab.
     */
    function setupTabs() {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                tabContents.forEach(content => {
                    if (content.id === `${targetTab}-content`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });
    }

    /**
 * Fungsi untuk membuat elemen collapsible (buka/tutup).
 */
function setupCollapsibles() {
    const collapsibles = document.querySelectorAll('.collapsible');
    collapsibles.forEach(collapsible => {
        collapsible.addEventListener('click', function() {
            // Toggle kelas 'active' pada tombol yang diklik
            this.classList.toggle('active');

            // Dapatkan elemen konten (yang berisi daftar kitab)
            const content = this.nextElementSibling;

            // Toggle kelas 'show' untuk menampilkan atau menyembunyikan konten
            content.classList.toggle('show');
        });
    });
}

    // --- FUNGSI UNTUK TAB PEMBACAAN URUT ---
    
    function renderBook(bookName, container) {
        const bookElement = bookTemplate.firstElementChild.cloneNode(true);
        bookElement.dataset.book = bookName;
        bookElement.querySelector('.book-name').textContent = bookName;
        
        bookElement.addEventListener('click', () => {
            // Menggunakan data progres dari cache untuk mendapatkan urutan terakhir
            const bookProgress = progressDataCache ? progressDataCache[bookName] : null;
            const nextOrder = bookProgress ? bookProgress.read + 1 : null;
            showPericope(bookName, nextOrder);
        });

        container.appendChild(bookElement);

    }
    
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
            // Mengirim user_id ke n8n
            body: JSON.stringify({ userId: user.id })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const progressData = await response.json();
        progressDataCache = progressData; // Simpan ke cache
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
            const bookProgress = progressData[bookName] || { read: 0, total: 0 };
            const total = bookProgress.total || 1; 
            const read = bookProgress.read || 0;
            const percentage = Math.round((read / total) * 100) || 0;

            const bookElement = document.querySelector(`.book-item[data-book="${bookName}"]`);
            if (bookElement) {
                bookElement.querySelector('.progress-bar').style.width = `${percentage}%`;
                bookElement.querySelector('.progress-text').textContent = `${read}/${total}`;
                bookElement.querySelector('.progress-percentage').textContent = `${percentage}%`;
            }

            if (OLD_TESTAMENT_BOOKS.includes(bookName)) {
                totalReadPL += read;
                totalChaptersPL += total;
            } else {
                totalReadPB += read;
                totalChaptersPB += total;
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

    // --- FUNGSI BARU UNTUK TAB TEMATIK ---
    
    /**
     * Mengambil daftar perjalanan tematik dari backend.
     */
    async function fetchThematicJourneys() {
        try {
            const response = await fetch(N8N_GET_THEMATIC_JOURNEYS_URL);
            if (!response.ok) throw new Error('Gagal memuat perjalanan tematik.');
            const data = await response.json();
            // Asumsi n8n mengembalikan data dalam format:
            // { "Fondasi Doktrinal": [ { title, desc, ... } ], "Aplikasi Praktis": [ ... ] }
            return data;
        } catch (error) {
            console.error("Error fetching thematic journeys:", error);
            tg.showAlert('Tidak dapat memuat perjalanan tematik.');
            return {};
        }
    }

    /**
     * Merender daftar perjalanan tematik berdasarkan status pengguna.
     */
    function renderThematicJourneys(journeysData, isPaid) {
        loadingTematik.classList.add('hidden');
        journeyListContainer.innerHTML = ''; // Kosongkan kontainer

        for (const categoryName in journeysData) {
            const categoryElement = categoryTemplate.cloneNode(true);
            categoryElement.querySelector('.category-title').textContent = categoryName;
            const itemsContainer = categoryElement.querySelector('.journey-items');

            journeysData[categoryName].forEach(journey => {
                const journeyElement = journeyTemplate.cloneNode(true);
                journeyElement.querySelector('.journey-title').textContent = journey.title;
                journeyElement.querySelector('.journey-description').textContent = journey.description;

                if (isPaid) {
                    // Logika untuk pengguna premium
                    const progress = journey.progress || { read: 0 };
                    const total = journey.total_days;
                    const percentage = Math.round((progress.read / total) * 100) || 0;
                    
                    journeyElement.querySelector('.progress-bar').style.width = `${percentage}%`;
                    journeyElement.querySelector('.journey-progress .progress-text').textContent = `${progress.read}/${total} Hari`;
                    
                    journeyElement.addEventListener('click', (e) => {
                        e.preventDefault();
                        // TODO: Buka halaman detail journey
                        tg.showAlert(`Membuka journey: ${journey.title}`);
                    });

                } else {
                    // Logika untuk pengguna gratis (menampilkan sebagai etalase)
                    journeyElement.classList.add('locked');
                    journeyElement.addEventListener('click', (e) => {
                        e.preventDefault();
                        premiumModal.classList.remove('hidden');
                    });
                }
                itemsContainer.appendChild(journeyElement);
            });
            journeyListContainer.appendChild(categoryElement);
        }
    }

    // --- FUNGSI UNTUK MODAL ---
    function setupModals() {
        // Menutup modal premium
        premiumModal.querySelector('.close-button').addEventListener('click', () => premiumModal.classList.add('hidden'));
        premiumModal.addEventListener('click', (e) => { if(e.target === premiumModal) premiumModal.classList.add('hidden'); });
        
        // Menutup modal perikop
        pericopeModal.querySelector('.close-button').addEventListener('click', () => pericopeModal.classList.add('hidden'));
        pericopeModal.addEventListener('click', (e) => { if(e.target === pericopeModal) pericopeModal.classList.add('hidden'); });

        // Tombol upgrade
        document.getElementById('upgrade-button').addEventListener('click', () => {
            tg.openLink('https://t.me/YourPremiumBotOrChannelLink');
        });
    }

    /**
     * Fungsi utama untuk menjalankan aplikasi.
     */
    async function main() {
        setupTabs();
        setupCollapsibles(); // <-- TAMBAHKAN PANGGILAN INI
        setupModals();

        // 1. Cek status pengguna terlebih dahulu
        currentUserStatus = await checkUserStatus();
        
        // 2. Muat konten untuk kedua tab secara paralel
        // Tab Urut
        const progressDataPromise = fetchProgressData().then(data => updateUrutUI(data));
        
        // Tab Tematik
        loadingTematik.classList.remove('hidden');
        const thematicJourneysPromise = fetchThematicJourneys().then(data => renderThematicJourneys(data, currentUserStatus.isPaid));

        // Inisialisasi daftar kitab untuk tab urut
        OLD_TESTAMENT_BOOKS.forEach(book => renderBook(book, oldTestamentList));
        NEW_TESTAMENT_BOOKS.forEach(book => renderBook(book, newTestamentList));
        
        // Menunggu kedua proses loading selesai
        await Promise.all([progressDataPromise, thematicJourneysPromise]);
    }

    main();
});
