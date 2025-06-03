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
      onSuccess(uid);
      // ...
    } else {
      // User is signed out
      // ...
    }
  });
});

// End experiments

// Simple function to generate and return a room code from a list of allowed letters.
function generateRoomCode() {
  
  const letters = 'BCDFGHJKLMNPQRSTVWXYZ'; // Allowed letters. Vowels are omitted to reduce the likelihood of accidentally generating real words.
  const roomCodeLength = 4; // Determines how many characters long the generated room code will be.

  let roomCode = ''; // Initialize an empty room code variable.

  // Choose a random letter from the allowed letters and add it to the room code until room code is desired length.
  for (let i = 0; i < roomCodeLength; i++) {
    roomCode = roomCode + letters.split('')[(Math.floor(Math.random() * letters.length))]
  }

  // Return room code when loop is complete.
  return roomCode;
}

// Function to authenticate user upon page load, and then show UI once authentication succeeded

// Function to create lobby upon button press
// Create room code
// Check if room code exists already
// If so, create room code again
// If not, set up room, assign host

$(document).ready(function () {
  //signInAnon.then(
  //  function(uid) {writeData(uid);},
  //  function(errorCode, errorMessage) { console.log(errorCode + ': ' + errorMessage);}
  //);
  generateRoomCode();
});
