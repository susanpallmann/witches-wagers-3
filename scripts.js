import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, setPersistence, browserSessionPersistence, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

function writeData() {
  const db = getDatabase();
  set(ref(db, 'test'), {
    test: 'test'
  });
}

function signInAnon() {
  const auth = getAuth();
  setPersistence(auth, browserSessionPersistence)
  .then(() => {
    // Existing and future Auth states are now persisted in the current
    // session only. Closing the window would clear any existing state even
    // if a user forgets to sign out.
    // ...
    // New sign-in will be persisted with session persistence.
      return signInAnonymously(auth);
    })
  .catch((error) => {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
  });
}

$(document).ready(function () {
  writeData();
  signInAnon();
});
