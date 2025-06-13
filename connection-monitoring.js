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

// ========================================
// ** FUNCTION: Error handling **
// ========================================

// A reusable function for logging errors consistently
function logError(context, error) {
	// Parameters: context (where the error occured), and error (what went wrong)
    console.error(`[${context}] | ${error.message}`, error);
}

// ========================================
// ** CLASS: UserSession **
// ========================================
class UserSession {
	// Attributes: config, uid, lobby, verifySessionInterval
	
	constructor(config) {
		this.config = config;
		this.uid;
		this.lobby;
		this.verifySessionInterval;
	}
	
	// Verify that the user is still connected by updating lastVerified with the current timestamp
	async verifySession() {
		try {
			
			// 1. Check if user exists
            const userExists = this.lobby.checkForUser(this.uid);
			
			// 2. If user is not found in the lobby instance:
            if (!userExists) {
				
                // Throw an error
                throw new Error(`User with uid (${this.uid}) was not found in lobby.`);
            }
			
			// 3. Otherwise, update lastVerified with a current timestamp
            await this.lobby.updateUserAttribute(this.uid, 'lastVerified', Date.now());
			
			// 4. Return TRUE if the above completes successfully
            return true;
			
		// Throw an error if it fails
        } catch (error) {
            logError('UserSession.verifySession', error);
            throw error;
        }
	}
	
	// Given a lobby instance, assigns that lobby to the UserSession instance's lobby attribute
	assignLobby(lobby) {
		this.lobby = lobby;
	}
	
	// Anonymously signs in the user and returns the user's auth once complete
	async getAuthFromSignIn() {
        try {
			
			// Get user's auth
            const auth = getAuth();
			
			// Use the auth to signInAnonymously via Firebase's authentication
            await signInAnonymously(auth);
			
			// Return auth when complete
            return auth;
			
		// Throw an error if it fails
		// Error will be caught by UserSession.create
        } catch (error) {
            throw new Error(`Firebase anonymous sign-in failed: ${error.message}`);
        }
    }

	// Listen for changes to the user's authState (currently doesn't do anything; we'll need it later though)
	authStateListener(auth) {
		
		// Whevener the authState changes:
		onAuthStateChanged(auth, (user) => {
			
			// If user exists:
			if (user) {
				// user is logged in
				
			// Else:
			} else {
				// user is not logged in
			}
		});
	}
	
	// Start a periodic cadence of verifying that the user is still connected via verifySession
	initVerifySessionCadence() {
		
		// Set an interval on the userSession verifySessionInterval attribute
		this.verifySessionInterval = setInterval(() => {
			
			// Run verifySession each interval
			this.verifySession().catch(error => {
				
				// If an error occurs, clear the interval
				logError(`UserSession.verifySessionCadence`, new Error(`Periodic verification failed: ${error.message}`));
				clearInterval(this.verifySessionInterval);
			});
			
		// Interval timing is pulled from config's ageAllowance attribute
		}, this.config.ageAllowance);
	}
	
	static async create(config) {
		
		// Create and set up userSession instance
		try {
			
			// 1. Create userSession instance
			const userSession = new UserSession(config);
			
			// 2. Sign in anonymously and get an auth back
			const auth = await userSession.getAuthFromSignIn();
			
			// 3. Assign uid to instance
			userSession.uid = auth.currentUser.uid;
			
			// 4. Initialize authStateListener
			userSession.authStateListener(auth);
			
			// 5. Return set up userSession
			return userSession;
		
		// Send an error if create or setup failed 
		} catch (error) {
			logError(`UserSession.create:`, error);
			throw error;
		}
	}
}

// ========================================
// ** CLASS: GameLobby **
// ========================================
class GameLobby {
	 // Attributes: config, database, roomCode, connection
	
	constructor(database, host, config) {
		this.config = config;
		this.database = database;
		this.roomCode;
		this.connection = {
			connectionCode: 'lobbySetup',
			users: {}
		};
	}
	
	// Create a user object with appropriate attributes based on how many users have already joined the lobby
	createUser(uid) {
		
		// Get number of users
		const numUsers = this.connection.users ? Object.keys(this.connection.users).length : 0;
		
		// Initialize variables for attributes
        let isHost = numUsers === 0; // If the user is the first to join, assume they are the host
        let isVIP = false; // Start with isVIP set to false
		
		
		// If not the host, determine if this user should be the VIP (hosts can not be VIP)
        if (!isHost) {
			
            // Check if a VIP already exists
            const hasVIP = Object.values(this.connection.users || {}).some(user => user.isVIP);
			
			// If no VIP is found:
            if (!hasVIP) {
				
				// Make the joining user VIP
                isVIP = true;
            }
        }
        
		// Create newUser object with its uid as its key, and attributes as calculated above as values
        const newUser = {
            [uid]: {
                isVIP: isVIP,
                isHost: isHost,
                joinOrder: numUsers,
                lastVerified: Date.now()
            }
        };
		
		// Return the created newUser object
		return newUser;
	}
	
	// Adds a user object to the lobby in the database
	// Returns TRUE if successful
	async addUser(user) {
		
		// Get uid from user object for use in the path used for set
        const uid = Object.keys(user)[0];
		
		// If uid doesn't exist, throw an error
        if (!uid) {
            throw new Error("User object must contain a UID as its key.");
        }
		
        try {
			
			// Attempt to add this user and its data to its own path under users
            const userRef = ref(this.database, `rooms/${this.roomCode}/connection/users/${uid}`);
            await set(userRef, user[uid]);
			
			// Return TRUE if successful
            return true;
			
		// Throw an error if unable add this user to the database
        } catch (error) {
            logError('GameLobby.addUser', error);
            throw error;
        }
    }
	
	// Adds a lobby with starting attributes to the database
	// Returns TRUE if successful
    async addLobby() {
        try {
			
			// Attempt to add this lobby to its own path (roomCode) under 'rooms,' with starting attributes
            const roomRef = ref(this.database, `rooms/${this.roomCode}`);
            const lobbyData = {
                connection: {
                    connectionStatus: this.connection.connectionStatus, // Should be: 'lobbySetup'
                    users: {} // Start with an empty object for users
                },
                dateCreated: Date.now() // Timestamp for when lobby was created for easier cleanup
            };
            await set(roomRef, lobbyData);
			
			// Return TRUE if lobby is added successfully
            return true;
		
		// Throw an error if unable to add the lobby
        } catch (error) {
            logError('GameLobby.addLobby', error);
            throw error;
        }
    }
	
	// Generate a roomCode (currently always returns 'TEST')
	// Later this will have more complex logic.
	generateRoomCode() {
		return `TEST`;
	}
	
	// Check if the provided roomCode is in use in the database already
	// Returns TRUE if roomCode is available, and FALSE if the roomCode is not
	async checkRoomCodeAvailability(roomCode) {
        try {
			// Get a snapshot of the roomCode's data under 'rooms'
            const roomCodeRef = ref(this.database, `rooms/${roomCode}`);
            const snapshot = await get(roomCodeRef);
			
            // TODO: Add logic to check lobby age
			
			// Returns TRUE if roomCode is available, and FALSE if the roomCode is not
            return !snapshot.exists();
			
		// Throw an error if we were unable to determine if the roomCode is available
        } catch (error) {
            logError('GameLobby.checkRoomCodeAvailability', error);
            throw error;
        }
    }
	
	// Attempts a constant (maxAttempts) times to generate an available roomCode
	// Returns the valid roomCode if successful
	async generateValidRoomCode() {
		
		// Max number of times to try generating a roomCode to avoid infinite loops
        const maxAttempts = 16;
		
		// Start attempts
        for (let i = 0; i < maxAttempts; i++) {
			
			// Generate a roomCode
            const roomCode = this.generateRoomCode();
			
			// Check if roomCode is available
            try {
                if (await this.checkRoomCodeAvailability(roomCode)) {
					// Return roomCode if it is available
                    return roomCode;
                }
			
			// Log an error if roomCode isn't available, but continue trying
            } catch (error) {
                logError('GameLobby.generateValidRoomCode', new Error(`Attempt ${i+1} failed: ${error.message}`));
            }
        }
		
		// Throw an error if all attempts are unsuccessful
        throw new Error(`Failed to generate an available room code after ${maxAttempts} attempts.`);
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
	
	// Load existing data from the lobby's Firebase reference
	// Returns data snapshot if successful
	async getLobbyData() {
        try {
			// 1. Get snapshot of data under the lobby's roomCode path in the database
            const lobbyRef = ref(this.database, `rooms/${this.roomCode}`);
            const snapshot = await get(lobbyRef);
			
			// 2. If data was retrieved successfully, but no snapshot exists, throw an error
            if (!snapshot.exists()) {
                throw new Error(`No data exists for roomCode (${this.roomCode}).`);
            }
			
			// 3. Return snapshot data
            return snapshot.val();
			
		// Throw an error if unable to get a snapshot
        } catch (error) {
            logError('GameLobby.getLobbyData', error);
            throw error;
        }
    }
	
	// Check if user exists in lobby
	// Returns TRUE if user is found, and FALSE if not
	checkForUser(uid) {
		return this.connection.users && uid in this.connection.users;
	}
	
	// Set a provided user's given attribute to given data/value in the database
	// Returns TRUE if successful
	async updateUserAttribute(uid, attribute, data) {
		 
		// If the provided user isn't found in the lobby, thrown an error
        if (!this.checkForUser(uid)) {
            throw new Error(`User with uid (${uid}) was not found in this lobby.`);
        }
		
        try {
			// 1. Attempt to set the user's attribute to the given value
            const userRef = ref(this.database, `rooms/${this.roomCode}/connection/users/${uid}`);
            await update(userRef, { [attribute]: data });
			
			// 2. Return TRUE if successful
            return true;
			
		// Throw an error if unable to update the attribute
        } catch (error) {
            logError('GameLobby.updateUserAttribute', error);
            throw error;
        }
    }
	
	// Create and set up a lobby using static async factory method
	static async create(database, config) {
        try {
            // 1. Construct lobby instance
            const lobby = new GameLobby(database, config);
            
            // 2. Generate a valid roomCode and assign it
            lobby.roomCode = await lobby.generateValidRoomCode();
            
            // 3. Create the lobby in Firebase
            await lobby.addLobby();
            
            // 4. Listen for realtime updates (no need to fetch separately)
            lobby.initConnectionStatusListener();
            lobby.initUsersListener();
            
            // 5. Return the set up lobby
            return lobby;
            
		// Throw an error if unable to create and set up the lobby
        } catch (error) {
            logError('GameLobby.create', error);
            throw error;
        }
    }
}

// ========================================
// ** FUNCTION: Initialization logic **
// ========================================

async function initializeLobbyAsHost(database, userSession, config) {
    try {
		
        // 1. Initialize client-side lobby
        const lobby = await GameLobby.create(database, config);
        
        // 2. Assign the created lobby to the userSession
        userSession.assignLobby(lobby);
        
        // 3. Create a user object for the host
        const hostUser = lobby.createUser(userSession.uid);
        
        // 4. Add that user to the lobby
        await lobby.addUser(hostUser);
        
        return lobby;
		
	// Log the error and re-throw
    } catch (error) {
        logError('initializeLobbyAsHost', error);
        throw error;
    }
}

// Once the DOM is loaded
$(document).ready(async function() {
    const config = {
        ageAllowance: 60000,
        minGuests: 2,
        maxGuests: 8
    };
    let database;
    let userSession;
    
    try {
		
		// Client setup (authenticate user, create userSession instance, and get database)
        database = getDatabase();
        userSession = await UserSession.create(config);
        console.log("Client setup complete. User UID:", userSession.uid);

		// Once client is set up, allow lobby creation
        $('#create-lobby').click(async function() {
            try {
                // 1. Disable button to prevent multiple clicks
                $(this).prop('disabled', true);

                // 2. Initialize lobby as host
                const lobby = await initializeLobbyAsHost(database, userSession, config);
                
                // 3. Start verifySession cadence for the user
                userSession.initVerifySessionCadence();
                
                // 4. Log for debugging and update UI
                console.log("Lobby created successfully:", lobby);
                console.log("User session is active:", userSession);
                alert(`Lobby ${lobby.roomCode} created!`);

            } catch (error) {
				
                // Display an alert if lobby creation failes
                logError('create-lobby.click', error);
                alert(`Failed to create lobby: ${error.message}`);
				
                // Re-enable the button so that the user can try again
                $(this).prop('disabled', false);
            }
        });

	// Client setup failed
    } catch (error) {
        logError('document.ready', new Error(`Critical setup failed: ${error.message}`));
        alert("There was a critical error setting up the application. Please refresh the page.");
    }
});
