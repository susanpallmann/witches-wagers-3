import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously, setCustomUserClaims} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

function writeData() {
  const db = getDatabase();
  set(ref(db, 'test'), {
    test: 'test'
  });
}

function signInAnon() {
  const auth = getAuth();
  
  signInAnonymously(auth)
    .then(() => {
      // Signed in..
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      // ...
    });
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in, see docs for a list of available properties
      // https://firebase.google.com/docs/reference/js/auth.user
      const uid = user.uid;
      console.log(uid);
      // ...
    } else {
      // User is signed out
      // ...
    }
  }
}

$(document).ready(function () {
  writeData();
  signInAnon();
});
