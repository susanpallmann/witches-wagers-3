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
  const connectedUsersRef = ref(db, 'rooms/TEST/connection/users');
  const timeStamp = Date.now();
  get(connectedUsersRef).then((snapshot) => {
    snapshot.forEach((childSnapshot) => {
      //console.log(childSnapshot.key); 
      if (childSnapshot.lastVerified.val() <= timeStamp - verificationCadence) {
        console.log('this record is old');
      } else {
        console.log('this record is new');
      }
    });
  });
}

// 

$(document).ready(function () {
  //connectionCodeListener();
  //getUnverifiedUsers();
  getUnverifiedUsers();
});
