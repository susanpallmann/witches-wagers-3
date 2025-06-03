import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

function writeData(uid) {
  const db = getDatabase();
  console.log(uid);
  set(ref(db, 'rooms/TEST'), {
    host: uid
  });
}

let signInAnon = new Promise(function(onSuccess, onFail) {
  const auth = getAuth();
  
  signInAnonymously(auth)
    .then(() => {
      // Signed in..
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      onFail(errorCode, errorMessage);
      // ...
    });
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in, see docs for a list of available properties
      // https://firebase.google.com/docs/reference/js/auth.user
      const uid = user.uid;
      console.log('user is signed in');
      onSuccess(uid);
      // ...
    } else {
      // User is signed out
      // ...
    }
  });
});

// End experiments

function generateRoomCode() {
  const letters = 'BCDFGHJKLMNPQRSTVWXYZ';
  const roomCodeLength = 4;
  let roomCode;
  for (let i = 0; i < roomCodeLength; i++) {
    roomCode = roomCode + letters.split('')[(Math.floor(Math.random() * letters.length()))]
  }  
  console.log(roomCode);
}

$(document).ready(function () {
  //signInAnon.then(
  //  function(uid) {writeData(uid);},
  //  function(errorCode, errorMessage) { console.log(errorCode + ': ' + errorMessage);}
  //);
  generateRoomCode();
});
