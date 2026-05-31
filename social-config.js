// OAuth Social Login Configuration
// 1. Google: Mergi la https://console.cloud.google.com/ -> Creeaza un proiect -> APIs & Services -> Credentials
//    -> Create OAuth 2.0 Client ID -> Web application -> Adauga URL-ul site-ului (ex: http://localhost:3456 sau https://note-in-demisol.onrender.com) in Authorized JavaScript Origins
//    -> La fel si pentru sign-in cu Google
//    -> Adauga acelasi URL in OAuth Redirect URIs
//    -> Copiaza App ID mai jos

var SOCIAL_CONFIG = {
  GOOGLE_CLIENT_ID: '207890997031-vcu8ntqnf04tp184bgmqn9bprkrdacuq.apps.googleusercontent.com',
  FACEBOOK_APP_ID: 'aici_pune_facebook_app_id'
};
