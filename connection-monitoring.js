import { getDatabase, ref, get, child, set, onValue, push, update, remove } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

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
		this.username;
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
				logError(`UserSession.initVerifySessionCadence`, new Error(`Periodic verification failed: ${error.message}`));
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
	
	constructor(database, config) {
		this.config = config;
		this.database = database;
		this.roomCode;
		this.connection = {
			connectionStatus: 'lobbySetup',
			users: {}
		};
		this.checkDisconnectionInterval;
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
			
			// If a lobby with that roomCode exists, check if it is stale			
            if (snapshot.exists()) {
				
				// Set up variables for lobby data and the current timestamp
				const lobbyData = snapshot.val();
				const timestamp = Date.now();
				
				if (timestamp - lobbyData.dateCreated >= this.config.lobbyAgeAllowance) {
					
					// TODO: add logic here to clean up the old lobby before reusing the code
					await set(roomCodeRef, null);

					// Return TRUE if room code can be used (is sufficiently old)
					return true;
				}
				
				// Return FALSE if room code cannot be used (is in use)
				return false;
			}
			
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
		});
	}
	
	// Start an onValue listener for the lobby's users in Firebase
	initUsersListener() {
        let usersRef = ref(this.database, `rooms/${this.roomCode}/connection/users`);
        onValue(usersRef, (snapshot) => {
            this.connection.users = snapshot.val() || {};
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
	
	// Checks if any of the provided user uids are the VIP, and reassigns it to the next best user based on joinOrder if necessary
	async reassignVipIfNecessary(disconnectedUserIds) {
        try {
            // 1. Find the current VIP among the *active* users before any removals
            const currentVipUid = Object.keys(this.connection.users).find(
                uid => this.connection.users[uid].isVIP
            );

            // 2. If there is no current VIP, or the current VIP is not among the disconnected users, no reassignments are strictly needed by this function for VIP. (A new VIP will be assigned when a new user joins if no VIP exists).
            if (!currentVipUid || !disconnectedUserIds.includes(currentVipUid)) {
                return true;
            }

            // 3. Get all current users in the lobby, excluding the disconnected users and hosts, sorted by join order
            const remainingUsers = Object.entries(this.connection.users)
                .filter(([uid, user]) => !disconnectedUserIds.includes(uid) && !user.isHost)
                .sort(([, userA], [, userB]) => userA.joinOrder - userB.joinOrder);

            // 4. If there are no other non-host users, the VIP cannot be reassigned, return FALSE
            if (remainingUsers.length === 0) {
                return false;
            }

            // 5. The next VIP is the user with the lowest joinOrder among the remaining non-host users
            const [nextVipUid, nextVipUser] = remainingUsers[0];

            // 6. Reassign VIP status in the database
            await this.updateUserAttribute(nextVipUid, 'isVIP', true);

			// Return TRUE once handled successfully
            return true;

		// Indicate failure to reassign VIP
        } catch (error) {
            logError('GameLobby.reassignVipIfNecessary', error);
			throw error;
        }
    } 
	
	// Check if user has either attribute or value for attribute
	// Returns TRUE if attribute or value is found, and FALSE if not
	checkForUserAttribute(uid, attribute, value) {
		
		// Check if the user exists
		const user = this.connection.users?.[uid];
		
		// User or attribute not found/provided
		if (!user || !attribute) {
			return false; 
		}
		
		// Check for the given attribute and value
		const attributeValue = user[attribute];
		
		// If a value was provided as a parameter, return a boolean for if it matches the attributeValue
		// If a value was not provided, return a boolean for it the attribute exists
		return value ? (attributeValue === value) : (attributeValue !== undefined);
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
	
	// Check users' lastVerified timestamps to indentify users that have disconnected, then handle what to do based on who and how many users disconnected
	async handleDisconnection() {
		
		// 1. Set up variables
        const now = Date.now();
        const users = this.connection.users || {};
        const allUserIds = Object.keys(users);
        const disconnectedUserIds = [];
        let hostId = null;
		
		// 2. For each uid, get the user object
        for (const uid in users) {
            const user = users[uid];
			
			// A. Make note if the current user is the host
            if (user.isHost) {
                hostId = uid;
            }
			
			// B. If this user's lastVerified was not recent enough based on the config ageAllowance:
            if (user.lastVerified <= now - this.config.ageAllowance) {
				
				// Add the user to our disconnectedUserIds array
                disconnectedUserIds.push(uid);
            }
        }

        // 3. If no one disconnected, return TRUE as there is nothing to handle
        if (disconnectedUserIds.length === 0) {
            return true;
        }
		
        // 4. If one or more users disconnected, proceed to handle the situation as appropriate:
        try {
			
            // A. Check for game-ending conditions (host disconnected or not enough players)
            const hostDisconnected = hostId && disconnectedUserIds.includes(hostId);
            const remainingUserCount = allUserIds.length - disconnectedUserIds.length;

			// B. If the host disconnected:
            if (hostDisconnected) {
				
				// i. Send an updated connectionStatus to the database
                await this.updateConnectionStatus('hostDisconnected');
				
				// ii. Remove all players regardless of how recently they were verified as the game cannot continue
                await this.removeUsers(allUserIds);
				
				// iii. Return TRUE once handled
                return true;
            }

            // C. If there are not enough guests to continue (excluding the host):
            if (remainingUserCount - 1 < this.config.minGuests) {
				
				// i. Send an updated connectionStatus to the database
                await this.updateConnectionStatus('notEnoughGuests');
				
				// ii. Remove all players regardless of how recently they were verified as the game cannot continue
                await this.removeUsers(allUserIds);
				
				// iii. Return TRUE once handled
                return true;
            }

            // D. If the game continues, reassign VIP if necessary
            await this.reassignVipIfNecessary(disconnectedUserIds);
           
            // E. Remove only the disconnected users, as the game can continue
            await this.removeUsers(disconnectedUserIds);
           
            return true;

		// Throw an error if unable to handle disconnection
        } catch (error) {
            logError('GameLobby.handleDisconnection', error);
            throw error;
        }
    }
	
	// Start a periodic cadence of verifying that all users are still connected via handleDisconnection
	initCheckDisconnectionCadence() {
		
		// Set an interval on the lobby checkDisconnectionInterval attribute
		this.checkDisconnectionInterval = setInterval(() => {
			
			// Run handleDisconnection each interval
			this.handleDisconnection().catch(error => {
				
				// If an error occurs, clear the interval
				logError(`GameLobby.initCheckDisconnectionCadence`, new Error(`Periodic verification failed: ${error.message}`));
				clearInterval(this.checkDisconnectionInterval);
			});
			
		// Interval timing is pulled from config's ageAllowance attribute
		}, this.config.ageAllowance*1.5);
	}
	
	// Updates the lobby's connectionStatus in the database
	// Returns TRUE if successful
    async updateConnectionStatus(newStatus) {
        try {
			
			// Attempt to set the lobby's connectionStatus to a new value as provided
            const statusRef = ref(this.database, `rooms/${this.roomCode}/connection/connectionStatus`);
            await set(statusRef, newStatus);
			
			// Return TRUE if successful
            return true;
			
		// Throw an error if unsuccessful
        } catch (error) {
            logError('GameLobby.updateConnectionStatus', error);
            throw error;
        }
    }
	
	// Attempts to remove multiple users
	async removeUsers(usersToRemove) {
		
        // If there are no users to remove, exit early
        if (!usersToRemove || usersToRemove.length === 0) {
            return true;
        }
        
        try {
            // Create an object for a multi-path update
            const updates = {};
            usersToRemove.forEach(uid => {
                updates[`rooms/${this.roomCode}/connection/users/${uid}`] = null; // Setting a path to null in an update call deletes the data at that path
            });
           
            // Perform the atomic update
            await update(ref(this.database), updates);
           
            return true;
           
        } catch (error) {
            logError('GameLobby.removeUsers', error);
            throw error;
        }
    }
	
	// Create and set up a lobby using static async factory method
	static async create(database, config, roomCode, initialData = null) {
        try {
            // 1. Construct lobby instance
            const lobby = new GameLobby(database, config);
            
            // 2. If a roomCode was provided, fill it, or else generate a valid roomCode and assign it
            lobby.roomCode = roomCode ? roomCode : await lobby.generateValidRoomCode();
            
			// 3. Create the lobby in Firebase if a roomCode wasn't provided
			if (!roomCode) {
				await lobby.addLobby();
			} else {
				const currentLobbyData = initialData ? initialData : await lobby.getLobbyData();
                lobby.connection = currentLobbyData.connection || { connectionStatus: 'lobbySetup', users: {} };
				lobby.connection.users = lobby.connection.users || {};
			}
            
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

async function joinExistingLobby(database, userSession, config, roomCode) {
    try {
        // 1. Check if the roomCode actually exists in the database
        const roomCodeRef = ref(database, `rooms/${roomCode}`);
        const snapshot = await get(roomCodeRef);

        if (!snapshot.exists()) {
            throw new Error(`Lobby with room code (${roomCode}) does not exist.`);
        }

        // 2. Initialize client-side lobby with the provided roomCode
        const lobby = await GameLobby.create(database, config, roomCode, snapshot.val());

        // 3. Assign the created lobby to the userSession
        userSession.assignLobby(lobby);

        // 4. Create a user object for the joining user (isHost will be false)
        const newUser = lobby.createUser(userSession.uid);

        // 5. Add that user to the lobby
        await lobby.addUser(newUser);

        return lobby;

    } catch (error) {
        logError('joinExistingLobby', error);
        throw error;
    }
}

async function initializeLobbyAsHost(database, userSession, config) {
    try {
		
        // 1. Initialize client-side lobby
        const lobby = await GameLobby.create(database, config, null);
        
        // 2. Assign the created lobby to the userSession
        userSession.assignLobby(lobby);
        
        // 3. Create a user object for the host
        const newUser = lobby.createUser(userSession.uid);
        
        // 4. Add that user to the lobby
        await lobby.addUser(newUser);
        
        return lobby;
		
	// Log the error and re-throw
    } catch (error) {
        logError('initializeLobby', error);
        throw error;
    }
}

// Once the DOM is loaded
$(document).ready(async function() {
    const config = {
        ageAllowance: 60000,
        minGuests: 2,
        maxGuests: 8,
		lobbyAgeAllowance: 12 * 60 * 60 * 1000 // 12 hours
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
				
                // Display an alert if lobby creation fails
                logError('create-lobby.click', error);
                alert(`Failed to create lobby: ${error.message}`);
				
                // Re-enable the button so that the user can try again
                $(this).prop('disabled', false);
            }
        });
		
		// Once client is set up, allow lobby joining
        $('#join-lobby').click(async function() {
			let roomCode = $('#room-code-input').val();
			let username = $('#name-input').val();
			
			// Basic validation for roomCode and username
            if (!roomCode) {
                alert("Please enter a room code.");
                return;
            }
            if (!username) {
                alert("Please enter a username.");
                return;
            }
			
            try {
                // 1. Disable button to prevent multiple clicks
                $(this).prop('disabled', true);

                // 2. Join the existing lobby
                const lobby = await joinExistingLobby(database, userSession, config, roomCode);
                
				// 3. Add username to the user's data in the lobby
                await lobby.updateUserAttribute(userSession.uid, 'username', username);
				
                // 4. Start verifySession cadence for the user
                userSession.initVerifySessionCadence();
                
                // 5. Log for debugging and update UI
                console.log("Lobby joined successfully:", lobby);
                console.log("User session is active:", userSession);
                alert(`Lobby ${lobby.roomCode} joined!`);

            } catch (error) {
				
                // Display an alert if joining lobby fails
                logError('join-lobby.click', error);
                alert(`Failed to join lobby: ${error.message}`);
				
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
