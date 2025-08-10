// Menjalankan script setelah seluruh halaman HTML selesai dimuat
document.addEventListener('DOMContentLoaded', function() {

    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.ready(); // Memberi tahu Telegram bahwa aplikasi sudah siap

    // Dapatkan semua elemen DOM yang kita butuhkan
    const oldTestamentContainer = document.getElementById('old-testament-list');
    const newTestamentContainer = document.getElementById('new-testament-list');
    const bookItemTemplate = document.getElementById('book-item-template');
    
    const overallProgressBar = document.getElementById('overall-progress-bar');
    const overallProgressText = document.getElementById('overall-progress-text');
    const plSummaryText = document.getElementById('pl-summary-text');
    const pbSummaryText = document.getElementById('pb-summary-text');

    /**
     * Fungsi utama untuk memuat data progres dari backend
     */
    async function loadProgress() {
        try {
            // Dapatkan user ID dari data inisialisasi Telegram
            // Untuk produksi, data ini harus divalidasi di backend Anda
            const userId = tg.initDataUnsafe?.user?.id;

            if (!userId) {
                displayError("Tidak dapat mengidentifikasi pengguna.");
                return;
            }

            // GANTI DENGAN URL API BACKEND ANDA
            const API_URL = `https://dshbiniakqjjqksvywve.supabase.co/functions/v1/bible-progress/progress?userId=${userId}`;

            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error(`Gagal memuat data: Status ${response.status}`);
            }

            const data = await response.json();
            
            // Panggil fungsi untuk menampilkan data ke UI
            renderData(data);

        } catch (error) {
            console.error("Error:", error);
            displayError(error.message);
        }
    }

    /**
     * Fungsi untuk menampilkan data JSON ke dalam elemen HTML
     * @param {object} data - Data progres dari API
     * * CONTOH STRUKTUR DATA JSON YANG DIHARAPKAN:
     * {
     * "overallProgress": 68.5,
     * "oldTestament": {
     * "progress": 75.0,
     * "books": [
     * {"name": "Kejadian", "lastOrder": 50, "maxOrder": 50},
     * {"name": "Keluaran", "lastOrder": 30, "maxOrder": 40}
     * ]
     * },
     * "newTestament": { ... }
     * }
     */
    function renderData(data) {
        // Hapus konten lama sebelum mengisi yang baru
        oldTestamentContainer.innerHTML = '';
        newTestamentContainer.innerHTML = '';
        
        // Render Ringkasan Keseluruhan
        const overallPercent = data.overallProgress || 0;
        overallProgressBar.style.width = `${overallPercent.toFixed(1)}%`;
        overallProgressText.textContent = `${overallPercent.toFixed(1)}%`;

        // Render Ringkasan Perjanjian
        const plPercent = data.oldTestament?.progress || 0;
        const pbPercent = data.newTestament?.progress || 0;
        plSummaryText.textContent = `${plPercent.toFixed(1)}% Selesai`;
        pbSummaryText.textContent = `${pbPercent.toFixed(1)}% Selesai`;

        // Render daftar kitab untuk setiap perjanjian
        if (data.oldTestament?.books) {
            data.oldTestament.books.forEach(book => {
                const bookElement = createBookElement(book);
                oldTestamentContainer.appendChild(bookElement);
            });
        }
        
        if (data.newTestament?.books) {
            data.newTestament.books.forEach(book => {
                const bookElement = createBookElement(book);
                newTestamentContainer.appendChild(bookElement);
            });
        }
    }
    
    /**
     * Membuat satu elemen item kitab dari template
     * @param {object} book - Objek data satu kitab
     */
    function createBookElement(book) {
        const newItem = bookItemTemplate.firstElementChild.cloneNode(true);

        const percentage = (book.maxOrder > 0) ? (book.lastOrder / book.maxOrder) * 100 : 0;

        newItem.querySelector('.book-name').textContent = book.name;
        newItem.querySelector('.progress-text').textContent = `${book.lastOrder}/${book.maxOrder} perikop`;
        newItem.querySelector('.progress-percentage').textContent = `${percentage.toFixed(0)}%`;
        newItem.querySelector('.progress-bar').style.width = `${percentage}%`;

        return newItem;
    }

    /**
     * Menampilkan pesan error di UI
     * @param {string} message - Pesan error yang akan ditampilkan
     */
    function displayError(message) {
        const container = document.querySelector('.container');
        container.innerHTML = `<div class="error-message">⚠️ ${message}</div>`;
    }


    // --- Logika untuk Accordion / Collapsible ---
    const collapsibles = document.querySelectorAll('.collapsible');
    collapsibles.forEach(item => {
        item.addEventListener('click', function() {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    // Panggil fungsi utama untuk memulai proses
    loadProgress();
});
