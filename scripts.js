import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

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
    console.log('signed in successfully');
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    // ...
  });
}

$(document).ready(function () {
  writeData();
  signInAnon();
});
