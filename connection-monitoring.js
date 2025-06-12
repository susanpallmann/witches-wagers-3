import { getDatabase, ref, get, child, set, onValue, push, update, remove } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';
/*
const ageAllowance = 60000;
const minGuests = 2
const maxGuests = 8;

class userSession {
	constructor(uid) {
		this.uid = uid;
	}
}

function isUserHost(user) {
	console.log(user);
	console.log(user.host);
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
		const isHostDisconnected = disconnectedUsers.some(user => isUserHost(users.user));
		console.log(isHostDisconnected);
		if (isHostDisconnected) {
			resolve('hostDisconnected');
			return; // Exit the function
		} else {
			
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
				} else if (disconnectCode === 'removeGuests') {
					
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
			});
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

function verifyUser(uid, roomcode) {
	checkForUser(uid, roomcode)
	.then((userExists) => {
		if (userExists) {
			const db = getDatabase();
			let timestamp = Date.now();
			update(ref(db, `rooms/TEST/connection/users/${uid}`), {
				lastVerified: timestamp
			});
		} else {
		}
	})
	.catch((error) => {
		console.log(error);
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
			let numUsers = 0;
			if (users) {
				numUsers = Object.keys(users).length;
			} else {
			}
			resolve(numUsers);
		})
		.catch((error) => {
			reject(`getNumUsers: Firebase error: ${error}`);
		});
	});
}

function checkForUser(uid, roomcode) {
	return new Promise(function (resolve, reject) {
		const db = getDatabase();
		get(ref(db, `rooms/${roomcode}/connection/users/${uid}`))
		.then((snapshot) => {
			if (snapshot.exists()) {
				resolve(true);
			} else {
				resolve(false);
			}
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
	let joinOrder;
	getNumUsers(roomcode)
	.then((numUsers) => {
		joinOrder = numUsers;
		if (joinOrder <= maxGuests && joinOrder >= 0) {
			checkForUser(uid, roomcode)
			.then((userExists) => {
				if (userExists) {
					// Don't join if user is already present in room
				} else {
					let isHost = false;
					if (joinOrder === 0) {
						isHost = true;
					}
					updates[uid] = {
						lastVerified: timestamp,
						isHost: isHost,
						joinOrder: joinOrder
					};
					update(ref(db, `rooms/${roomcode}/connection/users`), updates).then(() => {
					})
					.catch((error) => {
						console.log(`joinRoom: Firebase error: ${error}`);
					});
				}
			})
			.catch((error) => {
				console.log(error);
			});
		} else if (joinOrder > maxGuests) {
			// Lobby is full (TODO)
		} else {
			console.log(`joinRoom: Unexpected value for JoinOrder (${joinOrder}).`);
		}
	})
	.catch((error) => {
		console.log(`joinRoom: Firebase error: ${error}`);
	});
}

function connectionCodeListener() {
	const db = getDatabase();
	const connectionCodeRef = ref(db, 'rooms/TEST/connection/connectionStatus');
	onValue(connectionCodeRef, (snapshot) => {
	let connectionCode = snapshot.val();
	console.log(`connectionCodeListener: connection status changed to '${connectionCode}'`);
	});
}

$(document).ready(function() {
	let currentUserSession;
	let verificationInterval;
	let checkInterval;
	
	anonSignIn()
	.then((auth) => {
		onAuthStateChanged(auth, (user) => {
			if (user) {
				let constructorUid = user.uid;
				currentUserSession = new userSession(constructorUid);
				let uid = currentUserSession.uid;
				joinRoom(uid, 'TEST');
				connectionCodeListener();
				verificationInterval = setInterval(function() {
					verifyUser(currentUserSession.uid, 'TEST');
				}, ageAllowance);
				checkInterval = setInterval(function() {
					checkForDisconnects();
				}, ageAllowance*2);
			} else {
				console.log(`$(document).ready: user is signed out.`);
				clearInterval(verificationInterval);
				clearInterval(checkInterval);
			}
		});
	})
	.catch(error => {
		console.log(error);
	});
});
*/
function signIn() {
	return new Promise(function (resolve, reject) {
		const auth = getAuth();
		signInAnonymously(auth)
		.then(() => {
			resolve(auth.currentUser.uid);
		})
		.catch((error) => {
			reject(`signIn | Firebase error: ${error.message}`);
		});
	});
}


class userSession {
	
	// Reusable method for logging errors.
	logError(error) {
		console.log(`userSession | ${error}`);
	}
	
	async verifySession() {
		try {
			const userExists = this.lobby.checkForUser(this.uid);
			
			if (!userExists) {
				this.logError(`verifySession: user with uid (${this.uid}) was not found in lobby.`);
				throw new Error(`verifySession: user with uid (${this.uid}) was not found in lobby.`);
			}
			
			const currentTimestamp = Date.now();
			
			await this.lobby.updateUserAttribute(this.uid, 'lastVerified', currentTimestamp);
				
			return true;
			
		} catch (error) {
			this.logError(`verifySession: ${error}`);
			throw error;
		}
	}
	
	assignLobby(lobby) {
		this.lobby = lobby;
	}
	
	constructor() {
		
		this.uid;
		this.authState;
		this.lobby;
	}
}

// GameLobby
class GameLobby {
	
	// Reusable method for logging errors.
	logError(error) {
		console.log(`GameLobby | ${error}`);
	}
	
	// Generate a roomCode (currently always returns 'TEST')
	// Later this will have more complex logic.
	generateRoomCode() {
		return `TEST`;
	}
	
	// Start an onValue listener for the lobby's connectionStatus in Firebase
	initConnectionStatusListener() {
		let connectionStatusRef = ref(this.database, `rooms/${this.roomCode}/connection/connectionStatus`);
		onValue(connectionStatusRef, (snapshot) => {
			this.connection.connectionStatus = snapshot.val();
			console.log(this.connection.connectionStatus);
		});
	}
	
	// Start an onValue listener for the lobby's users in Firebase
	initUsersListener() {
		let usersRef = ref(this.database, `rooms/${this.roomCode}/connection/users`);
		onValue(usersRef, (snapshot) => {
			this.connection.users = snapshot.val();
			console.log(this.connection.users);
		});
	}
	
	async fetchLobby() {
		const connectionRef = ref(this.database, `rooms/${this.roomCode}/connection`);
		try {
			const snapshot = await get(connectionRef);
			
			if (snapshot.exists()) {
				
				const data = snapshot.val();
				
				this.connection.connectionStatus = data.connectionStatus;
				this.connection.users = data.users;
				
				this.initConnectionStatusListener();
				this.initUsersListener();
				
			} else {
				this.logError(`fetchLobby | Connection information for this room (${this.roomCode}) was not found in database.`);
				throw new Error(`Lobby connection ref not found.`);
			}
		} catch (error) {
			this.logError(`fetchLobby | Firebase error: ${error.message}`);
			throw error;
		}
	}
	
	checkForUser(uid) {
		return this.connection.users && uid in this.connection.users;
	}
	
	updateUserAttribute(uid, attribute, data) {
		return new Promise((resolve, reject) => {
			if (this.checkForUser(uid)) {
				const userRef = ref(this.database, `rooms/${this.roomCode}/connection/users/${uid}`);
				const newData = { [attribute]: data };
				
				update(userRef, newData)
				.then(() => resolve(true))
				.catch((error) => reject(error));
				
			} else {
				const usersList = JSON.stringify(this.connection.users, null, 2);
				reject(`updateUserAttribute: uid (${uid}) was not found in users (${usersList}).`);
			}
		});
	}
	
	constructor(host, config) {
		this.database = getDatabase();
		this.roomCode = this.generateRoomCode();
		this.connection = {
			connectionStatus: `lobbySetup`,
			users: {}
		};
		this.config = config;
	}
}

// Once everything is loaded
$(document).ready(async function () {
	
	// console.log(await signIn());
	
	// Set up a config variable with values we'll use for logic later
	const config = {
		ageAllowance: 60000,
		minGuests: 2,
		maxGuests: 8
	};
	
	// Attempt to set up our client-side lobby object:
	//     - populate it with initial values
	//     - initialize our Firebase listeners for connectionStatus and connected users
	//     - do something once it's all ready
	try {
		
		// Create a new client-side lobby object
		let lobby = new GameLobby(`8OVqx8U1FlRC0RMGHyrBF7LzJk12`, config);
		
		// Populate lobby object with values from Firebase, and then intialize listeners for connectionStatus and connected users
		await lobby.fetchLobby();
		
		// Do things now that our lobby is ready
		
		// Testing updating a user attribute
		lobby.updateUserAttribute(`8OVqx8U1FlRC0RMGHyrBF7LzJk12`, `isHost`, false)
		.then(() => {
		}).catch((error) => {
			lobby.logError(error);
		});
		
	// Something went wrong setting up client-side lobby
	} catch (error) {
		console.log(`Document ready: failed to initialize game lobby: ${error.message}`);
	}
});
