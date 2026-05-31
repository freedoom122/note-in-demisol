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

    // Treadmill fade-in/out for team members
    var teamMembers = document.querySelectorAll('.team-scroll .team-member');
    if (teamMembers.length) {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('member-visible');
                    entry.target.classList.remove('member-hidden');
                } else {
                    entry.target.classList.remove('member-visible');
                    entry.target.classList.add('member-hidden');
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });
        teamMembers.forEach(function(member) {
            observer.observe(member);
        });
    }
});