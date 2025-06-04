import { getDatabase, ref, get, child, set, onValue, push, update } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
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
        users.push(childSnapshot.key);
      } else {
      }
    });
    returnUsers(users);
  });
});

/*
function reverifyUsers (users) {
  const db = getDatabase();
  const connectedUsersRef = ref(db, 'rooms/TEST/connection/users');
  let unverified = users;
  let verified = [];
  unverified.forEach((user) => {
    let timestamp = Date.now();
    set(ref(db, `rooms/TEST/connection/users/${user}`), {
      lastVerified: timestamp,
      verificationStatus: 'pending'
    })
      .then(() => {
        console.log('updated status');
        verified.push(user);
      })
      .catch((error) => {
    });
  });
}
*/

function verifyUser(db, user, timestamp) {
  return new Promise(resolve => {
    set(ref(db, `rooms/TEST/connection/users/${user}`), {
      lastVerified: timestamp,
      verificationStatus: 'pending'
    })
      .then(() => {
        console.log('updated status');
        resolve(user);
      })
      .catch((error) => {
    });
  });
}

async function setPendingStatus(users) {
  const db = getDatabase();
  const connectedUsersRef = ref(db, 'rooms/TEST/connection/users');
  let unverified = users;
  let verified = [];
  for (let user of users) {
    let timestamp = Date.now();
    let verifiedUser = await verifyUser(db, user, timestamp);
    console.log('user is ' + user);
    console.log('verifiedUser is ' + verifiedUser);
    if (user == verifiedUser) {
      verified.push(user);
    } else {
      console.log('something went wrong');
    }
  }
  console.log(verified);
}

function writeData(uid) {
  const db = getDatabase();
  console.log(uid);
  set(ref(db, 'rooms/TEST'), {
    host: uid
  }).then(() => {
  })
  .catch((error) => {
  });
}
// 

$(document).ready(function () {
  //connectionCodeListener();
  //getUnverifiedUsers();
  getUnverifiedUsers.then(
    function(users) {
      console.log(users);
      setPendingStatus(users);
    }
  );
});
