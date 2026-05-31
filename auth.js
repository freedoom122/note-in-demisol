(function() {
  var API = '/api';
  var AUTH_KEY = 'nid_jwt';
  var SESSION_KEY = 'nid_session';

  function storeToken(token) {
    localStorage.setItem(AUTH_KEY, token);
  }

  function getToken() {
    return localStorage.getItem(AUTH_KEY);
  }

  function clearToken() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  function storeSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function apiSync(path, method, body) {
    var xhr = new XMLHttpRequest();
    xhr.open(method || 'GET', API + path, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    var token = getToken();
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    try {
      xhr.send(body ? JSON.stringify(body) : null);
      return JSON.parse(xhr.responseText);
    } catch(e) {
      return { ok: false, error: 'Eroare de conexiune la server. Asigura-te ca serverul este pornit (npm start in folderul server/)' };
    }
  }

  function apiAsync(path, method, body) {
    return new Promise(function(resolve) {
      var xhr = new XMLHttpRequest();
      xhr.open(method || 'GET', API + path, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      var token = getToken();
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.onload = function() {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch(e) { resolve({ ok: false, error: 'Eroare de conexiune' }); }
      };
      xhr.onerror = function() {
        resolve({ ok: false, error: 'Eroare de conexiune la server' });
      };
      xhr.send(body ? JSON.stringify(body) : null);
    });
  }

  window.NIDAuth = {
    register: function(username, email, password) {
      var res = apiSync('/auth/register', 'POST', { username: username, email: email, password: password });
      if (res.ok) { storeToken(res.token); storeSession(res.user); }
      return res;
    },

    login: function(username, password) {
      var res = apiSync('/auth/login', 'POST', { username: username, password: password });
      if (res.ok) { storeToken(res.token); storeSession(res.user); }
      return res;
    },

    logout: function() {
      clearToken();
    },

    getSession: function() {
      var s = localStorage.getItem(SESSION_KEY);
      try { return s ? JSON.parse(s) : null; } catch(e) { return null; }
    },

    isLoggedIn: function() {
      return !!this.getSession();
    },

    isAdmin: function() {
      var s = this.getSession();
      return s && s.isAdmin;
    },

    getUsername: function() {
      var s = this.getSession();
      return s ? s.username : null;
    },

    getAllUsers: function() {
      var res = apiSync('/admin/users', 'GET');
      return res.ok ? res.users : [];
    },

    promoteToAdmin: function(username) {
      return apiSync('/admin/users/promote', 'POST', { username: username });
    },

    isBanned: function(username) {
      return false;
    },

    forgotPassword: function(email) {
      return apiSync('/auth/forgot-password', 'POST', { email: email });
    },

    resetPassword: function(email, code, newPassword) {
      return apiSync('/auth/reset-password', 'POST', { email: email, code: code, newPassword: newPassword });
    },

    requestEmailChange: function(newEmail) {
      return apiSync('/auth/change-email', 'POST', { newEmail: newEmail });
    },

    confirmEmailChange: function(code) {
      var res = apiSync('/auth/confirm-email', 'POST', { code: code });
      if (res.ok) { storeToken(res.token); storeSession(res.user); }
      return res;
    },

    requestPasswordChange: function() {
      return apiSync('/auth/change-password', 'POST');
    },

    confirmPasswordChange: function(code, newPassword) {
      return apiSync('/auth/confirm-password', 'POST', { code: code, newPassword: newPassword });
    },

    adminChangeUserEmail: function(username, newEmail) {
      return apiSync('/admin/users/email', 'POST', { username: username, newEmail: newEmail });
    },

    seedAdmins: function() {
      return apiSync('/auth/seed', 'POST');
    }
  };
})();
