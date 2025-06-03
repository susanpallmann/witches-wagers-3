import { getDatabase, ref, get, child, set, onValue } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

const verificationCadence = 60000;
const minimumGuests = 2;
let connectionCode;

function connectionCodeListener() {
  const db = getDatabase();
  const connectionCodeRef = ref(db, 'rooms/TEST/connection/connectionCode');
  onValue(connectionCodeRef, (snapshot) => {
    connectionCode = snapshot.val();
    // Do something whenever this code changes.
  });
}

function getUnverifiedUsers() {
  const db = getDatabase();
  get(child(db, 'rooms/TEST/connection/users')).then((snapshot) => {
    if (snapshot.exists()) {
      console.log(snapshot.val());
    } else {
      console.log('data does not exist.');
    }
  }).catch((error) => {
    console.error(error);
  });
}

$(document).ready(function () {
  connectionCodeListener();
  getUnverifiedUsers();
});
