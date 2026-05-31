document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const menuCircle = document.getElementById('menuCircle');
    const menuIcon = document.querySelector('.menu-icon');
    
    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        menuCircle.classList.toggle('active');
        menuIcon.classList.toggle('active');
    });
    
    document.addEventListener('click', function(event) {
        if (!menuToggle.contains(event.target) && !menuCircle.contains(event.target)) {
            menuCircle.classList.remove('active');
            menuIcon.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.menu-item').forEach(function(item) {
        item.addEventListener('click', function() {
            menuCircle.classList.remove('active');
            menuIcon.classList.remove('active');
        });
    });
});