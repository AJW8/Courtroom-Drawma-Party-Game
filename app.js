var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var express_session = require("express-session")({
	secret: "c60ebe0a696ee406ad598621c0a70c15",
	resave: true,
	saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
require('string.prototype.startswith');

var Entities = require('html-entities').XmlEntities;
var entities = new Entities();

var fs = require('fs');
eval(fs.readFileSync('game.js') + '');

app.use(express_session);
app.use(express.static('public'));
io.use(sharedsession(express_session, { autoSave:true } ));

const prefs = require('./prefs.json');

var games = new Games();

var isHost = function(socket, session){
	if(session.in_game){
		var game = games.getGame(session.game_id);
		if(game){
			var uniqueId = session.unique_id;
			var user = game.getUser(uniqueId);
			return user ? user.getHost() : false;
		}
	}
	return false;
}

var isPlayer = function(socket, session){
	if(session.in_game){
		var game = games.getGame(session.game_id);
		if(game){
			var uniqueId = session.unique_id;
			var user = game.getUser(uniqueId);
			return user ? user.getPlayer() : false;
		}
	}
	return false;
}

var isAudience = function(socket, session){
	if(session.in_game){
		var game = games.getGame(session.game_id);
		if(game){
			var uniqueId = session.unique_id;
			var user = game.getUser(uniqueId);
			return user ? user.getAudience() : false;
		}
	}
	return false;
}

io.on('connection', function(socket){
	try{
		var session = socket.handshake.session;
		socket.on('index_init', function(){
			if(session.in_game){
				var isHost = false;
				var isPlayer = false;
				var game = games.getGame(session.game_id);
				if(game){
					var user = game.getUser(session.user_id);
					if(user){
						if(user.getHost()){
							socket.emit('connect_host_ok');
							return;
						}
						else if(user.getPlayer() || user.getAudience()){
							socket.emit('connect_player_ok');
							return;
						}
					}
				}
			}
			socket.emit('index_init_ok');
		});
		socket.on('connect_host', function(password){
			if(password == prefs.password){
				var game = games.createGame();
				var host = new User(socket, 'host');
				game.addUser(host, game.getId());
				socket.emit('connect_host_ok');
			}
			else socket.emit('connect_host_nok');
		});
		socket.on('connect_player', function(data){
			var game = games.getGame(data.code);
			if(!game){
				socket.emit('connect_player_nok_room_not_found');
				return false;
			}
			if(!game.hasStarted() && game.getPlayerCount() < prefs.max_players){
				if(data.name && data.name.length > 0){
					var userName = data.name;
					if(game.hasPlayer(userName)){
						var index = 2;
						while(game.hasPlayer(userName + index)) index++;
						userName += index;
					}
					var player = new User(socket, userName);
					game.addUser(player, data.code);
				}
				else{
					socket.emit('connect_player_nok_no_name');
					return false;
				}
			}
			else{
				var audience = new User(socket, 'audience');
				game.addUser(audience, game.getId());
			}
			socket.emit('connect_player_ok');
			return false;
		});
		socket.on('host_init', function(){
			if(!session.in_game){
				socket.emit('host_init_nok');
				return;
			}
			var game = games.getGame(session.game_id);
			if(!game){
				socket.emit('host_init_nok');
				return;
			}
			var userId = session.user_id;
			var user = game.getUser(userId);
			socket.emit('host_init_ok', game.getUserData(userId));
			user.updateSocket(socket);
			game.sendUpdates(user);
		});
		socket.on('game_init', function(){
			if(!session.in_game){
				socket.emit('game_init_nok');
				return;
			}
			var game = games.getGame(session.game_id);
			if(!game){
				socket.emit('game_init_nok');
				return;
			}
			var userId = session.user_id;
			var user = game.getUser(userId);
			socket.emit('game_init_ok', game.getUserData(userId));
			user.updateSocket(socket);
			game.sendUpdates(user);
		});
		socket.on('game_verify_audience_connection', function(){
			if(isAudience(socket, session)){
				var game = games.getGame(session.game_id);
				if(game) game.verifyAudienceConnection(session.user_id);
			}
		});
		socket.on('host_start_game', function(){
			if(isHost(socket, session)){
				var game = games.getGame(session.game_id);
				if(game && game.getPlayerCount() >= prefs.min_players){
				game.startGame();}
			}
		});
		socket.on('host_continue', function(){
			if(isHost(socket, session)){
				var game = games.getGame(session.game_id);
				if(game) game.continue();
			}
		});
		socket.on('host_end_game', function(){
			if(isHost(socket, session)){
				var game = games.getGame(session.game_id);
				if(game) game.endGame();
			}
		});
		socket.on('host_leave_game', function(){
			if(isHost(socket, session)) games.removeGame(session.game_id);
		});
		socket.on('host_new_lobby', function(){
			if(isHost(socket, session)) games.newLobby(session.game_id);
		});
		socket.on('game_submit_prompt', function(prompt){
			if(isPlayer(socket, session)){
				var game = games.getGame(session.game_id);
				if(game) game.receivePrompt(session.user_id, prompt);
			}
			return false;
		});
		socket.on('game_select_case', function(prompt){
			if(isPlayer(socket, session)){
				var game = games.getGame(session.game_id);
				if(game) game.selectCase(session.user_id, prompt);
			}
			return false;
		});
		socket.on('game_update_evidence', function(evidence){
			if(isPlayer(socket, session)){
				var game = games.getGame(session.game_id);
				if(game) game.updateEvidence(session.user_id, evidence);
			}
			return false;
		});
		socket.on('game_finish_case', function(){
			if(isPlayer(socket, session)){
				var game = games.getGame(session.game_id);
				if(game) game.finishCase(session.user_id);
			}
		});
		socket.on('game_submit_vote', function(vote){
			if(isPlayer(socket, session) || isAudience(socket, session)){
				var game = games.getGame(session.game_id);
				if(game) game.receiveVote(session.user_id, vote);
			}
			return false;
		});
	}
	catch(e){
		console.log(e);
		console.trace();
	}
});

server.listen(3000);
console.log("listening on port 3000");