// ===== MODAL MANAGEMENT =====
function closeModal() {
    modalOverlay.classList.add('hidden-field');
}

function initializeModal() {
    // Show modal every time page loads
    modalOverlay.classList.remove('hidden-field');
}
