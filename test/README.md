# Real-Time Game Lobby with Firebase

This project implements a real-time game lobby system using Firebase Realtime Database and Firebase Authentication. It provides the core functionalities for creating, joining, and managing game lobbies, including user session management, host and VIP roles, and automatic disconnection handling.

## Features

* **Anonymous User Authentication**: Users are seamlessly signed in anonymously using Firebase Authentication.
* **Create and Join Lobbies**: Users can create new game lobbies or join existing ones using a room code.
* **Real-time Updates**: Lobby and user data are synchronized in real-time across all clients using Firebase Realtime Database.
* **User Session Management**: Each user's session is actively managed, with periodic verification to handle disconnections gracefully.
* **Host and VIP Roles**: The first user to create a lobby is designated as the 'host', and the first user to join is the 'VIP'.
* **Automatic Disconnection Handling**: The system automatically detects and removes inactive users. If the host disconnects, the lobby is terminated.
* **Scalable Lobby Management**: The `GameLobby` class provides a robust set of methods for managing the lobby state.

## Getting Started

### Prerequisites

* A Firebase project with Realtime Database and Authentication enabled.
* The Firebase SDK snippet configured in your HTML file.

### Installation

1.  Clone the repository:
    ```bash
    git clone [https://github.com/your-username/your-repository.git](https://github.com/your-username/your-repository.git)
    ```
2.  Include the provided JavaScript file in your HTML:
    ```html
    <script type="module" src="your-script-file.js"></script>
    ```
3.  Update your Firebase configuration in your HTML file where you initialize Firebase.

## Code Overview

The core of the application is built around two main classes: `UserSession` and `GameLobby`.

### `logError(context, error)`

A utility function for consistent error logging.

* **`context`** (String): The name of the function or context where the error occurred.
* **`error`** (Error): The error object.

---

### `UserSession` Class

Manages the local user's session, including authentication and periodic verification of their connection status.

#### `constructor(config)`

* Initializes a new `UserSession` with the provided configuration.

#### `async create(config)`

A static factory method to create and initialize a new user session. It handles anonymous sign-in and returns a `UserSession` instance.

* **Usage:**
    ```javascript
    const userSession = await UserSession.create(config);
    ```

#### `assignLobby(lobby)`

* Assigns a `GameLobby` instance to the user's session.

#### `verifySession()`

* Updates the user's `lastVerified` timestamp in the Firebase database to indicate they are still active. This is called periodically by `initVerifySessionCadence`.

#### `initVerifySessionCadence()`

* Starts a `setInterval` that periodically calls `verifySession()` to keep the user's session alive. The interval is determined by `config.ageAllowance`.

---

### `GameLobby` Class

Manages the state of the game lobby in the Firebase Realtime Database.

#### `constructor(database, config)`

* Initializes a new `GameLobby`. This is typically not called directly; use `GameLobby.create()` instead.

#### `async create(database, config, roomCode, initialData)`

A static factory method to create a new lobby or connect to an existing one.

* If `roomCode` is `null`, it generates a new unique room code and creates a new lobby in the database.
* If a `roomCode` is provided, it connects to that lobby.
* **Usage (Creating a new lobby):**
    ```javascript
    const lobby = await GameLobby.create(database, config, null);
    ```
* **Usage (Joining an existing lobby):**
    ```javascript
    const lobby = await GameLobby.create(database, config, 'TEST');
    ```

#### `createUser(uid)`

* Creates a new user object with appropriate roles (`isHost`, `isVIP`) based on the current state of the lobby.

#### `addUser(user)`

* Adds a new user to the lobby in the database.

#### `updateUserAttribute(uid, attribute, data)`

* Updates a specific attribute for a user in the database.
* **Usage:**
    ```javascript
    await lobby.updateUserAttribute(userSession.uid, 'username', 'PlayerOne');
    ```

#### `handleDisconnection()`

* Checks for users who have not verified their session recently and removes them from the lobby. It also handles game-ending conditions like the host disconnecting or not enough players remaining. This is called periodically by `initCheckDisconnectionCadence`.

#### `initCheckDisconnectionCadence()`

* Starts a `setInterval` that periodically calls `handleDisconnection()` to manage the lobby's user list. This should only be run by the host to avoid redundant checks.

---

## Initialization Logic

The main execution flow is handled within the `$(document).ready()` function.

1.  **Configuration**: A `config` object is defined with settings like `ageAllowance`, `minGuests`, etc.
2.  **Client Setup**:
    * The Firebase `database` is retrieved.
    * A `UserSession` is created for the current user via `UserSession.create()`.
3.  **Event Listeners**:
    * **`#create-lobby` click**:
        1.  Calls `initializeLobbyAsHost()` to create a new lobby.
        2.  The current user is added as the host.
        3.  Starts the `verifySession` cadence for the host.
    * **`#join-lobby` click**:
        1.  Takes the `roomCode` and `username` from input fields.
        2.  Calls `joinExistingLobby()` to add the user to the specified lobby.
        3.  Updates the user's `username` in the lobby.
        4.  Starts the `verifySession` cadence for the joining user.

### `async initializeLobbyAsHost(database, userSession, config)`

* A helper function that orchestrates the creation of a new lobby and designates the current `userSession` as the host.

### `async joinExistingLobby(database, userSession, config, roomCode)`

* A helper function that handles the logic for a `userSession` to join an already-created lobby.

## Configuration

The `config` object at the bottom of the script can be modified to change the lobby's behavior:

* **`ageAllowance`**: (Milliseconds) How long a user can be inactive before being considered disconnected.
* **`minGuests`**: The minimum number of non-host players required for the game to continue.
* **`maxGuests`**: The maximum number of non-host players allowed in the lobby.
* **`lobbyAgeAllowance`**: (Milliseconds) How long a lobby can exist before its room code can be reused.
