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

    // Treadmill fade-in for team photos
    var fadeElements = document.querySelectorAll('.fade-on-scroll');
    if (fadeElements.length) {
        var fadeObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-visible');
                } else {
                    entry.target.classList.remove('fade-visible');
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -60px 0px'
        });
        fadeElements.forEach(function(el) {
            fadeObserver.observe(el);
        });
    }
});