import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

function writeData(uid) {
  let uid = uid;
  const db = getDatabase();
  set(ref(db, 'Rooms/TEST/players/' + uid), {
    test: 'test'
  });
}

function signInAnon() {
  const auth = getAuth();
  
  signInAnonymously(auth)
    .then(() => {
      // Signed in..
      return (user.uid);
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
      console.log('user is signed in');
      // ...
    } else {
      // User is signed out
      // ...
    }
  });
}

$(document).ready(function () {
  let uid = signInAnon();
  console.log(uid);
  writeData(uid);
});
