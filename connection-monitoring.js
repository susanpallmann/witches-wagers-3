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

let getUnverifiedUsers = new Promise(function(returnUsers) {
  const db = getDatabase();
  const connectedUsersRef = ref(db, 'rooms/TEST/connection/users');
  const timeStamp = Date.now();
  let users = [];
  get(connectedUsersRef).then((snapshot) => {
    snapshot.forEach((childSnapshot) => {
      //console.log(childSnapshot.key); 
      if (childSnapshot.val().lastVerified <= timeStamp - verificationCadence) {
        console.log(childSnapshot.val().lastVerified);
        console.log('this record is old');
        users.push(childSnapshot.key);
      } else {
        console.log(childSnapshot.val().lastVerified);
        console.log('this record is new');
      }
    });
    returnUsers(users);
  });
}

// 

$(document).ready(function () {
  //connectionCodeListener();
  //getUnverifiedUsers();
  console.log(getUnverifiedUsers());
  getUnverifiedUsers.then(
    function(users) {
      console.log(users);
    }
  );
});
