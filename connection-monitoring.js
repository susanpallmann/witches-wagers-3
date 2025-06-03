import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

const verificationCadence = 60000;
const minimumGuests = 2;
let connectionCode;

function connectionCodeListener() {
  const db = getDatabase();
  const connectionCodeRef = ref(db, 'rooms/TEST/connection/connectionCode');
  onValue(connectionCode, (snapshot) => {
    connectionCode = snapshot.val();
    // Do something whenever this code changes.
    console.log(connectionCode);
  });
}

$(document).ready(function () {
  connectionCodeListener();
});
