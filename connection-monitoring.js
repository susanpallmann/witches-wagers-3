import { getDatabase, ref, get, child, set, onValue, push, update } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

const verificationCadence = 60000;
const minimumGuests = 1;

function removeGuests(guests) {
  return new Promise(resolve => {
    const db = getDatabase();
    for (let i = 0; i < guests.length; i++) {
      let guest = guests[i];
      set(ref(db, `rooms/TEST/connection/users/${guest}`), {
        null: null
      }).then(() => {
      }).catch((error) => {
        console.log('removeGuests: ' + error);
        resolve(false);
      });
    }
    resolve(true);
  });
}

function updateConnectionStatus(code) {
  return new Promise(resolve => {
    const db = getDatabase();
    update(ref(db, 'rooms/TEST/connection'), {
      connectionStatus: code
    })
    .then(() => {
      resolve(true);
    })
    .catch((error) => {
      console.log('updateConnectionStatus: ' + error);
      resolve(false);
    });
  });
}


async function missingCheckIn(code, users) {
  return new Promise(async resolve => {
    if (code === 'hostDisconnect' || code === 'notEnoughGuests') {
      let updateSuccessful = await updateConnectionStatus(code);
      if (updateSuccessful) {
        console.log('missingCheckIn: Updated connectionStatus to ' + code + ' successfully.');
        resolve(true);
      } else {
        console.log('missingCheckIn: Unable to update connectionStatus to ' + code);
        resolve(false);
      }
    } else if (code === 'removeGuests') {
      if (users !== null) {
        console.log(users);
        let updateSuccessful = await removeGuests(users);
        if (updateSuccessful) {
          console.log('missingCheckIn: Removed disconnected guests ' + users.join(', ') + ' successfully.');
          resolve(true);
        }
      } else {
        console.log('missingCheckIn: Missing required parameter: users.');
        resolve(false);
      }
    } else {
      console.log('missingCheckIn: Unrecognized parameter: code.');
      resolve(false);
    }
  });
}

let getCheckIns = new Promise(function(allUsersCheckedIn, missingCheckIn) {
  const db = getDatabase();
  const connectionRef = ref(db, 'rooms/TEST/connection');
  const timestamp = Date.now();
  
  get(connectionRef).then((snapshot) => {
    let hostUser = snapshot.val().host;
    let allUsers = snapshot.val().users;
    let totalUsers = 0;
    let unresponsiveGuests = [];
    for (let user in allUsers) {
      if (allUsers[user].lastVerified  <= timestamp - verificationCadence) {
        if (user === hostUser) {
          missingCheckIn('hostDisconnect', null);
        } else {
          unresponsiveGuests.push(user);
        }
      }
      totalUsers++;
    }
    if (unresponsiveGuests.length < 1) {
      allUsersCheckedIn();
    } else if (totalUsers - unresponsiveGuests.length - 1 < minimumGuests) {
      missingCheckIn('notEnoughGuests', null);
    } else {
      console.log(unresponsiveGuests);
      missingCheckIn('removeGuests', unresponsiveGuests);
    }
  });
});

async function handler(code, users) {
  console.log(`code sent: ${code}`);
  
  console.log(users);
  let handleMissingCheckIn = await missingCheckIn(code, users);
  if (handleMissingCheckIn) {
    console.log('Document ready: Missing check in was handled successfully.')
  } else {
    console.log('Document ready: Missing check in could not be handled.')
  }
}

$(document).ready(function () {
  getCheckIns.then(
    function() {
      console.log('all users checked in recently');
    },
    function(code, users) {
      handler(code, users);
    }
  );
});

/*
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

function setConnectionCode (code) {
  const db = getDatabase();
  let connectionRef = ref(db, 'rooms/TEST/connection');
  let codeUpdate = {};
  codeUpdate['connectionCode'] = code;
  update(ref(connectionRef), codeUpdate);
}

function updateVerificationTimestamp () {
  const db = getDatabase();
  let connectionRef = ref(db, 'rooms/TEST/connection');
  let newTimestamp = {};
  newTimestamp['lastVerified'] = Date.now();
  update(ref(connectionRef), newTimestamp);
}

function removeGuests (guests) {
  updateVerificationTimestamp ();
}

function handleUnresponsiveUsers (snapshot, unresponsiveUsers) {
  return new Promise( function (setConnectionCode, removeGuests) {
    let hostUser = snapshot.val().host;
    if (unresponsiveUsers.includes(hostUser) {
      setConnectionCode ('hostDisconnect');
    } else {
      let users = snapshot.val().users;
      let numGuests = Number(users.length) - 1;
      if (numGuests - users.length < minimumGuests) {
        setConnectionCode ('notEnoughPlayers');
      } else {
        removeGuests (unresponsiveUsers);
      }
    }
  });
});

async function getUsersWithStatus(snapshot, status) {
  let users = [];
  for (let childSnapshot of snapshot) {
    if (childSnapshot.val().verificationStatus === status) {
      users.push(childSnapshot.key);
    } else {
    }
  }
  return users;
  });
}

function checkVerificationStatus (snapshot) {
  return new Promise ( function (handleUnresponsiveUsers, updateVerificationTimestamp) {
    let hasPending = [];
    let hasConfirmed = [];
    hasPending = await getUsersWithStatus (snapshot, 'pending');
    hasConfirmed = await getUsersWithStatus (snapshot, 'confirmed');
    if (hasPending.length < 1) {
      updateVerificationTimestamp ();
    } else {
      handleUnresponsiveUsers (snapshot, hasPending);
    }
  });
}

function getVerificationTimestamp () {
  return new Promise(function (checkVerificationStatus, recentlyVerified) {
    const db = getDatabase();
    const connectionRef = ref(db, 'rooms/TEST/connection');
    const timeStamp = Date.now();
    get(connectionRef).then((snapshot) => {
        if (snapshot.val().lastVerified <= timeStamp - verificationCadence) {
          checkVerificationStatus(snapshot);
        } else {
          recentlyVerified ();
        }
    });
  });
}

let checkVerification = new Promise(function() {
});

$(document).ready(function () {
  //connectionCodeListener();
  //getUnverifiedUsers();
  //getUnverifiedUsers.then(
  //  function(users) {
  //    console.log(users);
  //    setPendingStatus(users);
  //  }
  //);
  getVerificationTimestamp ().then(
    function () {
      console.log('Verification needed');
      checkVerificationStatus (snapshot).then(
        function () {
          console.log('Unresponsive users found');
          handleUnresponsiveUsers (snapshot, unresponsiveUsers).then(
            function () {
              console.log('Game-ending condition from disconnect');
              setConnectionCode (code);
            },
            function () {
              console.log('Game can continue after player(s) are removed');
              removeGuests (guests);
            }
          );
        },
        function () {
          console.log('All users responded');
          updateVerificationTimestamp ();
        }
      );
    },
    function () {
      console.log('No verification needed');
    }
  );
});
*/
