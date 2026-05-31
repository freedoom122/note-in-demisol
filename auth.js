(function() {
    var AUTH_KEY = 'nid_auth';
    var USERS_KEY = 'nid_users';
    var ADMIN_USERS = ['alexczirai', 'marcuadmin'];

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        } catch(e) { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(AUTH_KEY));
        } catch(e) { return null; }
    }

    function saveSession(session) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    }

    function clearSession() {
        localStorage.removeItem(AUTH_KEY);
    }

    function hashPassword(pw) {
        var hash = 0;
        for (var i = 0; i < pw.length; i++) {
            var char = pw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(16) + '_s';
    }

    window.NIDAuth = {
        register: function(username, email, password) {
            username = username.trim().toLowerCase();
            email = email.trim().toLowerCase();
            if (!username || !email || !password) return { ok: false, error: 'Toate campurile sunt obligatorii' };
            if (password.length < 6) return { ok: false, error: 'Parola trebuie sa aiba minim 6 caractere' };
            if (email.indexOf('@') === -1) return { ok: false, error: 'Email invalid' };
            var users = getUsers();
            if (users.some(function(u) { return u.username === username; })) return { ok: false, error: 'Username deja existent' };
            if (users.some(function(u) { return u.email === email; })) return { ok: false, error: 'Email deja inregistrat' };
            users.push({
                username: username,
                email: email,
                password: hashPassword(password),
                createdAt: new Date().toISOString(),
                isAdmin: ADMIN_USERS.indexOf(username) !== -1
            });
            saveUsers(users);
            return { ok: true };
        },

        login: function(username, password) {
            username = username.trim().toLowerCase();
            var users = getUsers();
            var user = null;
            for (var i = 0; i < users.length; i++) {
                if (users[i].username === username || users[i].email === username) {
                    user = users[i];
                    break;
                }
            }
            if (!user) return { ok: false, error: 'Utilizator negasit' };
            if (user.password !== hashPassword(password)) return { ok: false, error: 'Parola incorecta' };
            var bans = JSON.parse(localStorage.getItem('nid_banned')) || [];
            if (bans.some(function(b) { return b.ip === user.username || b.ip.indexOf(user.username) !== -1; })) {
                return { ok: false, error: 'Contul tau a fost blocat. Contacteaza administratorul.' };
            }
            var session = { username: user.username, email: user.email, isAdmin: user.isAdmin, loginTime: Date.now() };
            saveSession(session);
            return { ok: true, user: session };
        },

        logout: function() {
            clearSession();
        },

        getSession: function() {
            return getSession();
        },

        isLoggedIn: function() {
            return !!getSession();
        },

        isAdmin: function() {
            var s = getSession();
            return s && s.isAdmin;
        },

        getUsername: function() {
            var s = getSession();
            return s ? s.username : null;
        },

        getAllUsers: function() {
            if (!this.isAdmin()) return [];
            var users = getUsers();
            return users.map(function(u) {
                return { username: u.username, email: u.email, createdAt: u.createdAt, isAdmin: u.isAdmin };
            });
        },

        promoteToAdmin: function(username) {
            var users = getUsers();
            for (var i = 0; i < users.length; i++) {
                if (users[i].username === username.toLowerCase()) {
                    users[i].isAdmin = true;
                    saveUsers(users);
                    return { ok: true };
                }
            }
            return { ok: false, error: 'Utilizatorul nu a fost gasit' };
        },

        isBanned: function(username) {
            var bans = JSON.parse(localStorage.getItem('nid_banned')) || [];
            return bans.some(function(b) { return b.ip === username || b.ip.indexOf(username) !== -1; });
        },

        forgotPassword: function(email) {
            email = email.trim().toLowerCase();
            if (email.indexOf('@') === -1) return { ok: false, error: 'Email invalid' };
            var users = getUsers();
            var user = null;
            for (var i = 0; i < users.length; i++) {
                if (users[i].email === email) { user = users[i]; break; }
            }
            if (!user) return { ok: false, error: 'Nu exista cont cu acest email' };
            var resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            localStorage.setItem('nid_reset_' + email, JSON.stringify({ code: resetCode, expires: Date.now() + 3600000 }));
            return { ok: true, message: 'Cod de resetare trimis la ' + email, code: resetCode };
        },

        resetPassword: function(email, code, newPassword) {
            email = email.trim().toLowerCase();
            var resetData = JSON.parse(localStorage.getItem('nid_reset_' + email));
            if (!resetData) return { ok: false, error: 'Nicio cerere de resetare pentru acest email' };
            if (Date.now() > resetData.expires) return { ok: false, error: 'Codul a expirat' };
            if (resetData.code !== code.toUpperCase()) return { ok: false, error: 'Cod incorect' };
            if (newPassword.length < 6) return { ok: false, error: 'Parola trebuie sa aiba minim 6 caractere' };
            var users = getUsers();
            for (var i = 0; i < users.length; i++) {
                if (users[i].email === email) {
                    users[i].password = hashPassword(newPassword);
                    break;
                }
            }
            saveUsers(users);
            localStorage.removeItem('nid_reset_' + email);
            return { ok: true };
        },

        seedAdmins: function() {
            var users = getUsers();
            var adminCreds = [
                { username: 'alexczirai', email: 'alex@noteindemisol.ro', password: 'admin123' },
                { username: 'marcuadmin', email: 'marcu@noteindemisol.ro', password: 'admin123' }
            ];
            adminCreds.forEach(function(cred) {
                if (!users.some(function(u) { return u.username === cred.username; })) {
                    users.push({
                        username: cred.username,
                        email: cred.email,
                        password: hashPassword(cred.password),
                        createdAt: new Date().toISOString(),
                        isAdmin: true
                    });
                }
            });
            saveUsers(users);
        }
    };

    window.NIDAuth.seedAdmins();
})();