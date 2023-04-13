# Courtroom-Drawma-Party-Game

## A local server-based drawing/presentation party game experience built using Node.js and Socket.IO.

This project was built from my previous party game template at https://github.com/AJW8/Party-Game-Template.

### Host
- Each game has a single host whose screen must be publically displayed at all times.
- During a game, press 'Continue' to move to the next state. This controls the flow of the game as opposed to timers.
- After a game, press 'Same Players' to restart the game, or press the 'New Players' button to disconnect all players and start a new lobby.
- At any time, press 'Leave Game' to disconnect all users from the current game.
- Currently, the presentation is very bare-bones as I'm no visual designer.  Feel free to copy this project and update the graphics.

### Player
- Once a game has been created, users can join as a player by entering the matching room code displayed on the host's screen.
- Players actively compete against each other to win by ending up with the most money.
- The player view is exclusive to the player and should not be shown to anyone else.
- Players complete 2 prompts at the start of the game by filling in a blank.  They then choose one of two prompts which were completed by other players, for their case.
- For each lawsuit, during the plaintiff's case they 'present' (draw) their evidence against the defendant.  After the plaintiff has finished their case, the defendant takes the evidence and completes the drawing to form their own counter-evidence.  Both parties should be explaining their evidence on their turn.
- Players get to vote for who to award the case in each lawsuit they are not involved in, and can also vote for their favourite lawsuit at the end of each round.

### Audience
- If the maximum number of players have already joined or the game has started, any further users who try to join will be put in the audience.
- Audience members get to vote for who to award the case in each lawsuit, and can also vote for their favourite lawsuit at the end of each round.

### Project Setup
After downloading and unzipping the GIT folder, you will need to install dependencies before you can play.  You can do so with the following command:
```
npm install
```

### Preferences
The root folder contains a prefs.json file for customising preferences.  These include:
- The password required to host a game
- The minimum number of players required to start a game (must be at least 3, preferably 4).
- The maximum number of players that can join a game (preferably 8).
- The list of stroke colours randomly assigned to players for drawing with.
- The list of prompts.  There must be at least twice as many prompts in this list as there are players in a full game.
- [For each prompt] The part of the prompt that precedes the blank to be filled in by a player.
- [For each prompt] The part of the prompt that succeeds the blank to be filled in by a player.
- [For each prompt] The list of autofill answers, one of which is randomly filled into the blank if a player does not complete the prompt.
You may also add your own preferences e.g. enable audience, hide code.

### Local Server
Run the local server with the following command:
```
node app.js
```

### Creating a new game
- Go to http://localhost:3000 on your web browser
- Under the 'Create Game' heading, enter the correct password then click 'Create'
- You will be taken to the host page, where you will be shown the room code and the lobby
- Once enough players have joined, you may start the game whenever you are ready

### Joining a game
- Go to http://localhost:3000 on your web browser
- Under the 'Join Game' heading, enter your desired name and the matching room code then click 'Connect'
- You will be taken to the game page, where you will need to wait for the host to start the game
