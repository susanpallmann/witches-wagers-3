import { getDatabase, ref, get, child, set, onValue, push, update, remove } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

const ageAllowance = 60000;
const minGuests = 4
const maxGuests = 8;

class userSession {
	constructor(uid) {
		this.uid = uid;
	}
}

function isUserHost(user) {
	return user.host;
}

function removeUsers(disconnectedUsers) {
    const db = getDatabase();
    const removalPromises = disconnectedUsers.map(user => {
        return remove(ref(db, `rooms/TEST/connection/users/${user.id}`));
    });
    // Just return the promise that Promise.all creates
    return Promise.all(removalPromises);
}

function writeDisconnectCode(data) {
    return new Promise(function (resolve, reject) {
        const { disconnectedUsers, users } = data;

        // 1. First, check if the host is among the disconnected. This is the highest priority.
        const isHostDisconnected = disconnectedUsers.some(user => isUserHost(user));
        if (isHostDisconnected) {
            resolve('hostDisconnected');
            return; // Exit the function
        }

        // 2. Next, check if removing these users would drop the lobby below the minimum required players.
        const remainingUserCount = Object.keys(users).length - disconnectedUsers.length;
        if (remainingUserCount < minGuests) {
            resolve('notEnoughGuests');
            return; // Exit the function
        }
        
        // 3. If neither of the above is true, the default action is to remove the guests.
        // We can add a sanity check here to ensure we have disconnected users to remove.
        if (disconnectedUsers.length > 0) {
            resolve('removeGuests');
            return; // Exit the function
        }

        // This case should theoretically not be hit if handleDisconnectedUsers is working,
        // but it's good practice to handle all paths.
        reject(`writeDisconnectCode: a disconnect code should not be created for this situation; see data (${data}).`);
    });
}


// Function that gets a snapshot of user data from the lobby's 'connection' child.
function getConnectedUserData() {
	return new Promise(function (resolve, reject) {
		
		// Get our database reference.
		let db = getDatabase();
		
		// Take a snapshot of our lobby's 'connection' child.
		get(ref(db, 'rooms/TEST/connection')).then((snapshot) => {
			let users = snapshot.val().users;
			
			// Return the 'users' object containing all users if successful.
			resolve(users);
			
		// Return a Firebase error if we are unable to get the snapshot.
		}).catch((error) => {
			reject(`getConnectedUserData: Firebase error: ${error}`);
		});
	});
}

// Function that, given a list of users, checks if any users have disconnected and returns an array of users that have disconnected. Returns an error if any users have check ins dated in the future.
function getDisconnectedUsers(users) {
	return new Promise(function(resolve, reject) {
		
		// Get the current time as a timestamp
		let refTimestamp = Date.now();
		
		// Prepare an array for storing disconnected users
		let disconnectedUsers = [];
		
		// Check each user in our users object
		for (let user in users) {
			
			// Get the user's last verification timestamp
			let userTimestamp = users[user].lastVerified;
			
			// If the user's timestamp is less than the current time minus a preset ageAllowance (the maximum amount of time a user can go without verifying to still be considered connected), add that user to the disconnectedUsers array.
			if (userTimestamp  <= refTimestamp - ageAllowance) {
				disconnectedUsers.push({
					id: user, ...users[user]
				});
				
			// If the user's timestamp is in the future, return an error.
			} else if (userTimestamp  > refTimestamp) {
				reject(`getDisconnectedUsers: userTimestamp (${userTimestamp}) exceeds refTimestamp (${refTimestamp}).`);
			
			// Otherwise, do not add the user to the disconnectedUsers array.
			} else {
			}
		}
		
		// Once all users have been checked, send the users object and disconnectedUsers array (this may be empty).
			resolve({
				users: users,
				disconnectedUsers : disconnectedUsers
		});
	});
}

function updateConnectionStatus(code) {
	return new Promise(function (resolve, reject) {
		const db = getDatabase();
		update(ref(db, 'rooms/TEST/connection'), {
		  connectionStatus: code
		})
		.then(() => {
		  resolve(true);
		})
		.catch((error) => {
		  reject(`updateConnectionStatus: Firebase error: ${error}`);
		});

	});
}

// Function that, given an array of disconnectedUsers, takes the appropriate action and returns TRUE if action was successfully completed. Returns an error message if not.
function handleDisconnectedUsers(data) {
	return new Promise(function (resolve, reject) {
		
		let disconnectedUsers = data.disconnectedUsers;
		let	users = data.users;
		
		// If number of disconnected users is 0:
		if (disconnectedUsers.length === 0) {
			// then there is nothing to handle, return TRUE
			resolve(true);
			
		// If the number of disconnected users is not 0 and within the expected range:
		} else if (disconnectedUsers.length >= 1 && disconnectedUsers.length <= maxGuests + 1) {
			
			// Determine the appropriate disconnect code.
			writeDisconnectCode(data)
			.then(function (disconnectCode) {
				
				// If the disconnect code is 'hostDisconnected' or 'notEnoughGuests,' update the lobby's connection status.
				if (disconnectCode === 'hostDisconnected' || disconnectCode === 'notEnoughGuests') {
					
					// Attempt to update the connection status for the lobby in Firebase.
					updateConnectionStatus(disconnectCode)
					.then(function (updateComplete) {
						// Return TRUE once complete.
						resolve(true);
					})
					// Return an error if we are not able to update the lobby connection status.
					.catch(function (error) {
						reject(`handleDisconnectedUsers: error setting lobby connection status to disconnectCode (${disconnectCode}). Firebase error: ${error}.`);
					});
				// If the disconnect code is 'removeUsers':
				} else if (disconnectCode === 'removeUsers') {
					
					// Run removeUsers, passing in the disconnectedUsers array.
					removeUsers(disconnectedUsers)
					
					// Once the above is complete, return TRUE.
					.then(function (updateComplete) {
						resolve(true);
					})
					// If the above fails, return the error passed back from removeUsers.
					.catch(function (error) {
						reject(error);
					});
				// If the disconnectCode is neither of the above, it is unrecognized and we return an error.
				} else {
					reject(`handleDisconnectedUsers: disconnectCode (${disconnectCode}) is not recognized.`);
				}
			})
		// Return an error if the number of disconnected users exceeds the range of what is possible for a lobby based on external variable maxGuests.
		} else {
			reject(`handleDisconnectedUsers: length of disconnectedUsers (${disconnectedUsers.length}) is outside of expected range (${maxGuests}).`);
		}
	});
}

function checkForDisconnects() {
	getConnectedUserData()
	.then(function (responseTimes) {
		return getDisconnectedUsers(responseTimes);
	})
	.then(function (data) {
		return handleDisconnectedUsers(data);
	})
	.catch(error => {
		console.log(error);
	});
}

function verifyUser(uid) {
	const db = getDatabase();
	let timestamp = Date.now();
	update(ref(db, `rooms/TEST/connection/users/${uid}`), {
		lastVerified: timestamp
	});
}

function anonSignIn () {
	return new Promise(function (resolve, reject) {
		const auth = getAuth();
		
		signInAnonymously(auth)
		.then(() => {
			resolve(auth);
		}).catch((error) => {
			reject(`anonSignIn: Firebase error: ${error}`);
		});		
	});
}

function getNumUsers(roomcode) {
	return new Promise(function (resolve, reject) {
		const db = getDatabase();
		get(ref(db, `rooms/${roomcode}/connection`)).then((snapshot) => {
			let users = snapshot.val().users;
			let numUsers = Number(users.length);
			resolve(numUsers);
		})
		.catch((error) => {
			reject(`getNumUsers: Firebase error: ${error}`);
		});
	});
}

function joinRoom(uid, roomcode) {
	const db = getDatabase();
	let updates = {};
	let timestamp = Date.now();
	let joinOrder = getNumUsers(roomcode);
	let isHost = joinOrder === 0;
	update[uid] = {
		lastVerified: timestamp,
		isHost: isHost,
		joinOrder: joinOrder
	};
	update(ref(db, `rooms/${roomcode}/connection/users`), update).then(() => {
	})
	.catch((error) => {
		console.log(`joinRoom: Firebase error: ${error}`);
	});
}

function connectionCodeListener() {
  const db = getDatabase();
  const connectionCodeRef = ref(db, 'rooms/TEST/connection/connectionStatus');
  onValue(connectionCodeRef, (snapshot) => {
    connectionCode = snapshot.val();
    console.log(`connectionCodeListener: connection status changed to '${connectionCode}'`);
  });
}

$(document).ready(function() {
	let currentUserSession;
	let verificationInterval;
	
	anonSignIn()
	.then((auth) => {
		onAuthStateChanged(auth, (user) => {
			if (user) {
				let uid = user.uid;
				currentUserSession = new userSession(uid);
				joinRoom(uid, 'TEST');
				connectionCodeListener();
				verificationInterval = setInterval(function(uid) {
					verifyUser(uid);
				}, ageAllowance);
			} else {
				console.log(`$(document).ready: user is signed out.`);
				clearInterval(verificationInterval);
			}
		});
	})
	.catch(error => {
		console.log(error);
	});
});
