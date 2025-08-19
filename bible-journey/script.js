document.addEventListener('DOMContentLoaded', () => {

    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.expand();

    // --- KONFIGURASI ---
    // GANTI DENGAN URL WEBHOOK N8N ANDA YANG SEBENARNYA (PRODUCTION URL)
    //const N8N_WEBHOOK_URL = 'https://dshbiniakqjjqksvywve.supabase.co/rpc/get_bible_pericope'; 
    const N8N_WEBHOOK_URL = 'https://n8n.theos-automata.com/webhook/bible-journey-pericope'; 

    // Daftar kitab yang di-hardcode
    const OLD_TESTAMENT_BOOKS = [
        "Kejadian", "Keluaran", "Imamat", "Bilangan", "Ulangan", "Yosua", "Hakim-hakim", "Rut",
        "1 Samuel", "2 Samuel", "1 Raja-raja", "2 Raja-raja", "1 Tawarikh", "2 Tawarikh", "Ezra",
        "Nehemia", "Ester", "Ayub", "Mazmur", "Amsal", "Pengkhotbah", "Kidung Agung", "Yesaya",
        "Yeremia", "Ratapan", "Yehezkiel", "Daniel", "Hosea", "Yoel", "Amos", "Obaja", "Yunus",
        "Mikha", "Nahum", "Habakuk", "Zefanya", "Hagai", "Zakharia", "Maleakhi"
    ];
    const NEW_TESTAMENT_BOOKS = [
        "Matius", "Markus", "Lukas", "Yohanes", "Kisah Para Rasul", "Roma", "1 Korintus",
        "2 Korintus", "Galatia", "Efesus", "Filipi", "Kolose", "1 Tesalonika", "2 Tesalonika",
        "1 Timotius", "2 Timotius", "Titus", "Filemon", "Ibrani", "Yakobus", "1 Petrus",
        "2 Petrus", "1 Yohanes", "2 Yohanes", "3 Yohanes", "Yudas", "Wahyu"
    ];

    // Mengambil elemen dari DOM
    const oldTestamentList = document.getElementById('old-testament-list');
    const newTestamentList = document.getElementById('new-testament-list');
    const bookTemplate = document.getElementById('book-item-template');
    const loadingIndicator = document.getElementById('loading-indicator');
    const mainContent = document.getElementById('main-content');
    
    // Elemen Modal
    const modal = document.getElementById('pericope-modal');
    const modalLoader = document.getElementById('modal-loader');
    const modalBody = document.getElementById('modal-body');
    const pericopeTitle = document.getElementById('pericope-title');
    const pericopeTheology = document.getElementById('pericope-theology');
    const pericopeReflection = document.getElementById('pericope-reflection');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const closeButton = modal.querySelector('.close-button');

    // Variabel untuk menyimpan state navigasi modal
    let currentBook = null;
    let currentPericopeOrder = 0;
    let progressDataCache = null; // Cache untuk data progres

    /**
     * Fungsi untuk membuat dan menampilkan elemen kitab di daftar.
     */
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

    /**
     * Fungsi untuk mengambil data progres dari backend.
     */
    async function fetchProgressData() {
        loadingIndicator.classList.remove('hidden');
        mainContent.classList.add('hidden');
        await new Promise(resolve => setTimeout(resolve, 500)); 

        try {
            // GANTI DENGAN API PROGRES ANDA NANTI
            console.warn("Menggunakan data progres dummy. Ganti dengan API Anda.");
            const dummyData = {
                "Kejadian": { "read": 50, "total": 78 }, "Keluaran": { "read": 23, "total": 69 },
                "Matius": { "read": 28, "total": 28 }, "Markus": { "read": 10, "total": 16 },
                "Wahyu": { "read": 1, "total": 22 }
            };
            progressDataCache = dummyData; // Simpan ke cache
            return dummyData;
        } catch (error) {
            console.error("Error fetching progress data:", error);
            tg.showAlert(error.message || 'Tidak dapat memuat progres.');
            return {}; 
        } finally {
            loadingIndicator.classList.add('hidden');
            mainContent.classList.remove('hidden');
        }
    }

    /**
     * Fungsi untuk memperbarui UI dengan data progres yang diterima.
     */
    function updateUI(progressData) {
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

    /**
     * Menampilkan modal dan memuat data perikop.
     */
    async function showPericope(bookName, order = null) {
        currentBook = bookName;
        modal.classList.remove('hidden');
        modalBody.classList.add('hidden');
        modalLoader.classList.remove('hidden');
        
        try {
            const pericopeData = await fetchPericopeFromN8N(bookName, order);
            
            if (pericopeData && pericopeData.title) {
                populateModal(pericopeData);
                currentPericopeOrder = pericopeData.order;
                prevButton.disabled = pericopeData.isFirst;
                nextButton.disabled = pericopeData.isLast;
            } else {
                // Jika tidak ada data (misal perikop terakhir sudah dibaca)
                throw new Error('Semua perikop di kitab ini sudah selesai dibaca.');
            }

        } catch (error) {
            console.error("Gagal memuat perikop:", error);
            tg.showAlert(error.message || 'Gagal memuat perikop dari server.');
            closeModal();
        } finally {
            modalLoader.classList.add('hidden');
            modalBody.classList.remove('hidden');
        }
    }

    /**
     * === FUNGSI YANG DIPERBARUI ===
     * Melakukan fetch ke webhook n8n untuk mendapatkan detail perikop.
     */
    async function fetchPericopeFromN8N(book, order) {
        // Pastikan URL webhook Anda sudah benar (Production URL)
        if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.includes('example.com')) {
            throw new Error("URL Webhook n8n belum dikonfigurasi di script.js");
        }

        // Dapatkan userId dari Telegram initData (perlu divalidasi di backend)
        // Untuk sekarang kita kirim dummy userId, ganti dengan logika yang benar
        const userId = tg.initDataUnsafe?.user?.id || 'dummy_user_123';

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Kirim data yang dibutuhkan oleh fungsi Supabase Anda
                userId: userId,
                book: book,
                order: order
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("n8n response error:", errorBody);
            throw new Error(`Request ke n8n gagal dengan status ${response.status}`);
        }
        
        const result = await response.json();

        // Jika n8n mengembalikan JSON dari AI di dalam properti 'output'
        if (typeof result.output === 'string') {
            return JSON.parse(result.output);
        }
        // Jika n8n langsung mengembalikan objek JSON
        return result;
    }

    /**
     * Mengisi konten modal dengan data perikop.
     */
    function populateModal(data) {
        pericopeTitle.textContent = data.title;
        pericopeTheology.textContent = data.theology;
        pericopeReflection.textContent = data.reflection;
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    // Event listeners untuk navigasi dan menutup modal
    prevButton.addEventListener('click', () => {
        if (currentBook && currentPericopeOrder > 1) {
            showPericope(currentBook, currentPericopeOrder - 1);
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentBook) {
            showPericope(currentBook, currentPericopeOrder + 1);
        }
    });

    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    /**
     * Fungsi untuk menginisialisasi fungsionalitas collapsible.
     */
    function initializeCollapsibles() {
        const collapsibles = document.querySelectorAll('.collapsible');
        collapsibles.forEach(coll => {
            coll.addEventListener('click', () => {
                coll.classList.toggle('active');
                const content = coll.nextElementSibling;
                content.classList.toggle('show');
            });
        });
    }

    /**
     * Fungsi utama untuk menjalankan aplikasi.
     */
    async function main() {
        OLD_TESTAMENT_BOOKS.forEach(book => renderBook(book, oldTestamentList));
        NEW_TESTAMENT_BOOKS.forEach(book => renderBook(book, newTestamentList));
        initializeCollapsibles();
        const progressData = await fetchProgressData();
        updateUI(progressData);
    }

    main();
});
