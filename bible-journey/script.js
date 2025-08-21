document.addEventListener('DOMContentLoaded', () => {

    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.expand();
    const user = tg.initDataUnsafe?.user;

    // --- KONFIGURASI ---
    // GANTI DENGAN URL WEBHOOK N8N ANDA
    const N8N_GET_USER_STATUS_URL = 'https://n8n.theos-automata.com/webhook/get-user-status';
    const N8N_GET_BIBLE_JOURNEY_URL = 'https://n8n.theos-automata.com/webhook/bible-journey-pericope'; // Ganti jika URL berbeda
    const N8N_GET_THEMATIC_JOURNEYS_URL = 'https://n8n.theos-automata.com/webhook/get-thematic-journeys'; // Buat webhook ini di n8n

    // Daftar kitab (bisa juga diambil dari API nanti)
    const OLD_TESTAMENT_BOOKS = [ "Kejadian", "Keluaran", "Imamat", "Bilangan", "Ulangan", /* ... sisanya */ ];
    const NEW_TESTAMENT_BOOKS = [ "Matius", "Markus", "Lukas", "Yohanes", "Kisah Para Rasul", /* ... sisanya */ ];

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

    // --- FUNGSI UNTUK TAB PEMBACAAN URUT ---
    
    function renderBook(bookName, container) {
        // ... (fungsi renderBook sama seperti sebelumnya) ...
    }
    
    async function fetchProgressData() {
        // ... (fungsi fetchProgressData sama seperti sebelumnya) ...
    }

    function updateUrutUI(progressData) {
        // ... (fungsi updateUI diganti nama jadi updateUrutUI, isinya sama) ...
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
