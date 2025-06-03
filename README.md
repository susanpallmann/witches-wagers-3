# witches-wagers-3
## Initiatives
### Environment setup
Get basic dev environment set up so we can build things.
- [X] Set up repository for work
  - [X] Build index.html
  - [X] Build styles.css
  - [X] Build scripts.js
  - [X] Install jQuery
  - [X] Set up Github Pages
- [X] Set up Firebase
  - [X] Create app in Firebase
  - [X] Initialize in repo
  - [X] Set up realtime database in Firebase
  - [X] Add realtime database SDK
  - [X] Set up authentication in Firebase
  - [X] Add authentication SDK
### Lobby setup
- [ ] Host screen
  - [X] Create host screen page
  - [ ] Button to create lobby
  - [ ] Display room code
  - [ ] Display joined players
  - [ ] Display VIP player
- [ ] Join screen
  - [ ] Create join screen page
  - [ ] Add form for username, room code, and join button
  - [ ] Display error if player can't join lobby
- [ ] Functionality
  - [ ] Generate room code
  - [ ] Create joinable lobby in back-end
  - [ ] Add ability to join lobby
  - [ ] Assess if lobby can be joined
  - [ ] Assign VIP if joining player was first to join
  - [ ] Add players to the lobby
    - [ ] Add session ID?
    - [ ] Add username
    - [ ] Add if VIP
    - [ ] Add join order
  - [ ] Send error if player can't join lobby
  - [ ] Remove players if they disconnect (or stay disconnected for longer than X time?)
  - [ ] If VIP disconnects, reassign VIP to next player who joined
### Tutorial & settings
- [ ] Tutorial
- [ ] Build settings menu
- [ ] Allow tutorial to be turned off in settings
- [ ] Allow tutorial to be skipped by VIP
### Gameplay loop
- [ ] Initiate player's turn
- [ ] Generate monster
- [ ] Wagering
- [ ] Send/equip items
- [ ] Fight animation
- [ ] Outcome
- [ ] Check for winner
### Player won
- [ ] Player won
### Game canceled
- [ ] Game canceled
### Look & feel
- [ ] Game look & feel
- [ ] Design
- [ ] Build
- [ ] Illustrations for players, monsters, items, and backgrounds

## "Modules"
### Game lobby
Lobby:
  - Generate room code
  - Validate room code (repeat, reset, create)
    - Check if room code exists
      - If so, check if room is old
        - If so, call reset lobby (new host)
        - If not, generate new room code, and repeat
      - If not, create lobby
- Create lobby
- Reset lobby (same host)
- Reset lobby (new host)
- Delete lobby

Host:
- Authenticate host

### Connection monitoring:
#### Constants:
- **verificationCadence** - how often a user must be verified for connection status
- **minimumGuests** - how many guests are required for the game to be playable

#### Stored allowed values:
- **connectionCodes** - allConnected, hostDisconnect, notEnoughPlayers
- **verificationStatus** - pending, confirmed

#### Database structure
Firebase realtime database:
- rooms:
  - $room_code
- allowedValues:
  - connectionCodes:
    - allConnected: TRUE,
    - hostDisconnect: TRUE,
    - notEnoughPlayers: TRUE
  - verificationStatus:
    - pending: TRUE,
    - confirmed: TRUE

#### Functions:
- getUnverified()
- verifyUsers(users)
- handleResponse(status)
- handleDisconnect(user)
- evaluateVIP(user)
- removePlayer(guest)
- endGame(errorType)
- updateVerifyTimestamp(user)
- connectionCodeListener()
