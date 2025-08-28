document.addEventListener('DOMContentLoaded', function() {

    // --- Modal Logic ---
    const timelineItems = document.querySelectorAll('.timeline-item');
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');
    const closeButton = document.getElementById('close-button');

    const modalTitle = document.getElementById('modal-title');
    const modalImage = document.getElementById('modal-image');
    const modalDescription = document.getElementById('modal-description');
    const modalScriptures = document.getElementById('modal-scriptures');

    timelineItems.forEach(item => {
        item.addEventListener('click', () => {
            // Get data from data-attributes
            const title = item.dataset.title;
            const image = item.dataset.image;
            const description = item.dataset.description;
            const scriptures = item.dataset.scriptures;

            // Populate modal with data
            modalTitle.textContent = title;
            modalImage.src = image;
            modalDescription.textContent = description;
            modalScriptures.innerHTML = scriptures;

            // Show the modal
            modalContainer.classList.add('show');
        });
    });

    function closeModal() {
        modalContainer.classList.remove('show');
    }

    closeButton.addEventListener('click', closeModal);

    modalContainer.addEventListener('click', (e) => {
        // Close modal if background is clicked
        if (e.target === modalContainer) {
            closeModal();
        }
    });

    // --- Scroll Animation Logic ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the item is visible
    });

    timelineItems.forEach(item => {
        observer.observe(item);
    });

});
