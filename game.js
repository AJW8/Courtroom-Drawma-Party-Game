var states = {
	LOBBY: 0,
	INTRO: 1,
	COMPLETE_PROMPTS: 2,
	SELECT_CASES: 3,
	CASE_INTRO: 4,
	PLAINTIFF_CASE: 5,
	DEFENDANT_CASE: 6,
	VOTE_CASES: 7,
	CASE_VOTES: 8,
	CASE_RESULTS: 9,
	WINNER: 10,
	END: 11
};

function Games(){
	var games = {};
	
	this.createGame = function(){
		var id = this.generateId();
		games[id] = new Game();
		games[id].setId(id);
		return games[id];
	}
	
	this.generateId = function(){
		var id;
		do{
			id = '';
			var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			var length = letters.length;
			for(var i = 0; i < 4; i++) id += letters.charAt(Math.floor(Math.random() * length));
			for(var g in games) if(games[g] && games[g].getId() == id) id = false;
		}
		while(!id);
		return id;
	}
	
	this.newLobby = function(gameId){
		var game = games[gameId];
		if(!game) return;
		var id = this.generateId();
		games[id] = game;
		game.setId(id);
		game.newLobby();
	}
	
	this.removeGame = function(gameId){
		if(gameId in games){
			games[gameId].disconnectAll();
			delete games[gameId];
			games[gameId] = false;
		}
	}
	
	this.getGame = function(gameId){
		if(gameId in games) return games[gameId];
		else return false;
	}
}

function Game(){
	var gameId = false;
	var round = false;
	var playerIds = false;
	var sortedPlayers = false;
	var strokeColours = false;
	var playerData = false;
	var caseData = false;
	var currentCase = false;
	var audience = false;
	var audienceVotes = false;
	var users = new Users();
	var gameState = new GameState();
	gameState.setState(states.LOBBY, {});
	
	this.setId = function(pId){
		gameId = pId;
	}
	
	this.getId = function(){
		return gameId;
	}
	
	this.addUser = function(user){
		var curState = gameState.get();
		if(user.getPlayer() && curState != states.LOBBY) return;
		users.addUser(user, gameId);
		const allUsers = users.getAll();
		if(user.getPlayer()){
			if(playerIds) playerIds.push(user.getUniqueId());
			else playerIds = [user.getUniqueId()];
			if(!strokeColours) strokeColours = {};
			const colours = prefs.stroke_colours;
			var r;
			do r = Math.floor(Math.random() * colours.length);
			while(strokeColours[r]);
			user.setStrokeColour(colours[r]);
			strokeColours[r] = true;
			if(gameState.get() != states.LOBBY) return;
			for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(u).players);
		}
		else if(user.getAudience()){
			if(!audience) audience = {};
			audience[user.getUniqueId()] = {
				connected: true,
				voting: gameState.get() == states.VOTE_CASES
			};
			for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendAudienceUpdate(this.getAudienceCount());
		}
	}
	
	this.getUser = function(userId){
		return users.getUser(userId);
	}
	
	this.removeUser = function(userId){
		users.removeUser(userId);
	}
	
	this.getState = function(){
		return gameState.get();
	}
	
	this.getPlayerCount = function(){
		return playerIds ? playerIds.length : 0;
	}
	
	this.getAudienceCount = function(){
		if(!audience) return 0;
		const allUsers = users.getAll();
		var audienceCount = 0;
		for(var a in audience) if(audience[a] && audience[a].connected && allUsers[a] && allUsers[a].getAudience()) audienceCount++;
		return audienceCount;
	}
	
	this.hasPlayer = function(playerName){
		if(!playerIds) return false;
		const allUsers = users.getAll();
		for(let i = 0; i < playerIds.length; i++) if(allUsers[playerIds[i]] && playerName == allUsers[playerIds[i]].getName()) return true;
		return false;
	}
	
	this.verifyAudienceConnection = function(userId){
		var user = this.getUser(userId);
		if(user && user.getAudience()) audience[userId].connected = true;
	}
	
	this.getUserData = function(userId){
		var user = this.getUser(userId);
		if(!user) return {};
		const allUsers = users.getAll();
		const state = gameState.get();
		if(user.getHost()){
			var plaintiff = false;
			var defendant = false;
			var curCase = false;
			var cases = false;
			if(caseData && !(currentCase === false)){
				if(currentCase < playerIds.length){
					plaintiff = caseData[currentCase].plaintiff;
					defendant = caseData[currentCase].defendant;
					curCase = caseData[currentCase].case;
					if(state == states.VOTE_CASES) audienceVotes = caseData[currentCase].audience_votes;
				}
				else{
					cases = [];
					for(let i = 0; i < playerIds.length; i++){
						cases.push(caseData[i].case ? {
							case: caseData[i].case,
							plaintiff: caseData[i].plaintiff,
							defendant: caseData[i].defendant,
							votes: caseData[i].votes,
							score: caseData[i].score
						} : false);
					}
				}
			}
			var players = [];
			if(playerIds){
				for(let i = 0; i < playerIds.length; i++){
					players.push({
						name: allUsers[playerIds[i]].getName(),
						colour: allUsers[playerIds[i]].getStrokeColour(),
						finished: playerData ? playerData[i].finished : false,
						score: allUsers[playerIds[i]].getScore()
					});
				}
			}
			return {
				code: gameId,
				state: state,
				min_players: prefs.min_players,
				max_players: prefs.max_players,
				players: players,
				sorted_players: sortedPlayers,
				audience: this.getAudienceCount(),
				round: round,
				plaintiff: plaintiff,
				defendant: defendant,
				current_case: curCase,
				audience_votes: audienceVotes,
				cases: cases
			};
		}
		else if(user.getPlayer()){
			var prompt = false;
			var finished = false;
			var case1 = false;
			var case2 = false;
			var evidence = false;
			var plaintiff = false;
			var defendant = false;
			var cases = false;
			var voting = false;
			if(caseData){
				var player = false;
				for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) player = i;
				if(!(player === false)){
					finished = playerData[player].finished;
					if(state == states.COMPLETE_PROMPTS) prompt = finished == 0 ? playerData[player].prompt1 : finished == 1 ? playerData[player].prompt2 : false;
					else if(state == states.SELECT_CASES){
						for(let i = 0; i < playerIds.length; i++) if(player == caseData[i].plaintiff.player) defendant = allUsers[playerIds[caseData[i].defendant.player]].getName();
						case1 = playerData[player].case1;
						case2 = playerData[player].case2;
					}
					else if(state == states.CASE_INTRO && caseData[currentCase].case) plaintiff = player == caseData[currentCase].plaintiff.player;
					else if(state == states.PLAINTIFF_CASE){
						plaintiff = player == caseData[currentCase].plaintiff.player;
						defendant = player == caseData[currentCase].defendant.player;
						if(plaintiff) evidence = caseData[currentCase].plaintiff.evidence;
					}
					else if(state == states.DEFENDANT_CASE){
						if(player == caseData[currentCase].defendant.player){
							evidence = caseData[currentCase].defendant.evidence;
							plaintiff = {
								colour: allUsers[playerIds[caseData[currentCase].plaintiff.player]].getStrokeColour(),
								evidence: caseData[currentCase].plaintiff.evidence
							};
							defendant = true;
						}
					}
					else if(state == states.VOTE_CASES && !playerIds[player].finished){
						if(currentCase < playerIds.length){
							const casePlaintiff = caseData[currentCase].plaintiff.player;
							const caseDefendant = caseData[currentCase].defendant.player;
							plaintiff = player == casePlaintiff ? true : allUsers[playerIds[casePlaintiff]].getName();
							defendant = player == caseDefendant ? true : allUsers[playerIds[caseDefendant]].getName();
							voting = !(plaintiff === true || defendant === true);
						}
						else{
							cases = [];
							var caseCount = 0;
							for(let i = 0; i < playerIds.length; i++){
								const casePlaintiff = caseData[i].plaintiff.player;
								const caseDefendant = caseData[i].defendant.player;
								if(!caseData[i].case || player == casePlaintiff || player == caseDefendant) cases.push(false);
								else{
									cases.push(allUsers[playerIds[casePlaintiff]].getName() + " vs " + allUsers[playerIds[caseDefendant]].getName());
									caseCount++;
								}
							}
							if(caseCount < 2) cases = false;
							else voting = true;
						}
					}
				}
			}
			return {
				state: state,
				name: allUsers[userId].getName(),
				stroke_colour: allUsers[userId].getStrokeColour(),
				prompt: prompt ? {
					part1: prompt.part1,
					part2: prompt.part2
				} : false,
				case1: case1,
				case2: case2,
				evidence: evidence,
				plaintiff: plaintiff,
				defendant: defendant,
				cases: cases,
				voting: voting
			};
		}
		else if(user.getAudience()){
			const voting = audience[userId].voting;
			var cases = false;
			if(voting && state == states.VOTE_CASES && currentCase == playerIds.length){
				cases = [];
				for(let i = 0; i < playerIds.length; i++) cases.push(caseData[i].case ? allUsers[playerIds[caseData[i].plaintiff.player]].getName() + " vs " + allUsers[playerIds[caseData[i].defendant.player]].getName() : false);
			}
			return {
				state: state,
				plaintiff: voting && state == states.VOTE_CASES && currentCase < playerIds.length ? allUsers[playerIds[caseData[currentCase].plaintiff.player]].getName() : false,
				defendant: voting && state == states.VOTE_CASES && currentCase < playerIds.length ? allUsers[playerIds[caseData[currentCase].defendant.player]].getName() : false,
				cases: cases,
				voting: voting,
			};
		}
		else return {};
	}
	
	this.startGame = function(){
		sortedPlayers = false;
		rounds = playerIds.length < 5 ? 2 : 1;
		round = 0;
		var curState = gameState.get();
		if(curState != states.LOBBY && curState != states.END) return;
		gameState.setState(states.INTRO, {});
		audienceVotes = false;
		const allUsers = users.getAll();
		for(let i = 0; i < playerIds.length; i++) allUsers[playerIds[i]].resetScore();
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.hasStarted = function(){
		var curState = gameState.get();
		return curState != states.LOBBY;
	}
	
	this.continue = function(){
		var curState = gameState.get();
		const allUsers = users.getAll();
		if(curState == states.LOBBY || curState == states.END) return;
		else if(curState == states.CASE_RESULTS){
			var voteCases = false;
			if(currentCase < playerIds.length){
				currentCase++;
				if(currentCase == playerIds.length){
					for(let i = 0; i < playerIds.length; i++){
						if(!voteCases){
							var caseCount = 0;
							for(let j = 0; j < playerIds.length; j++) if(caseData[j].case && i != caseData[j].plaintiff.player && i != caseData[j].defendant.player) caseCount++;
							voteCases = caseCount > 1;
						}
					}
				}
			}
			if(currentCase < playerIds.length) curState = states.CASE_INTRO;
			else if(voteCases) curState = states.VOTE_CASES;
			else if(round < rounds - 1){
				round++;
				currentCase = 0;
				var playerIndices = [];
				for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
				var playerOrder = [];
				for(let i = 0; i < playerIds.length; i++){
					var r;
					do r = Math.floor(Math.random() * playerIds.length);
					while(!playerIndices[r]);
					playerOrder.push(r);
					playerIndices[r] = false;
				}
				caseData = [];
				for(let i = 0; i < playerIds.length; i++){
					const defendant = playerOrder[(i + 1) % playerIds.length];
					caseData.push({
						case: playerData[defendant].case1 ? playerData[defendant].case1 : playerData[defendant].case2,
						plaintiff: {
							player: playerOrder[i],
							evidence: false,
							votes: 0,
							score: 0,
							winner_bonus: 0,
							unanimous_bonus: 0
						},
						defendant: {
							player: defendant,
							evidence: false,
							votes: 0,
							score: 0,
							winner_bonus: 0,
							unanimous_bonus: 0
						},
						votes: 0,
						score: 0
					});
				}
				curState = states.CASE_INTRO;
			}
			else{
				var indices = [];
				for(let i = 0; i < playerIds.length; i++) indices.push(true);
				sortedPlayers = [];
				for(let i = 0; i < playerIds.length; i++){
					var maxIndex = false;
					var maxScore = 0;
					for(let j = 0; j < playerIds.length; j++){
						if(indices[j]){
							const currentScore = allUsers[playerIds[j]].getScore();
							if(maxIndex === false || currentScore > maxScore){
								maxIndex = j;
								maxScore = currentScore;
							}
						}
					}
					sortedPlayers.push(maxIndex);
					indices[maxIndex] = false;
				}
				curState = states.WINNER;
			}
		}
		else if(curState == states.WINNER){
			this.endGame();
			return;
		}
		else curState++;
		if(curState == states.COMPLETE_PROMPTS){
			currentCase = 0;
			playerData = [];
			for(let i = 0; i < playerIds.length; i++){
				playerData.push({
					prompt1: false,
					prompt2: false,
					case_recipient1: false,
					case_recipient2: false,
					case1: false,
					case2: false,
					finished: 0
				});
			}
			const allPrompts = prefs.prompts;
			var promptIndices = [];
			for(let i = 0; i < allPrompts.length; i++) promptIndices.push(true);
			for(let i = 0; i < playerIds.length; i++){
				var r;
				do r = Math.floor(Math.random() * allPrompts.length);
				while(!promptIndices[r]);
				playerData[i].prompt1 = allPrompts[r];
				promptIndices[r] = false;
				do r = Math.floor(Math.random() * allPrompts.length);
				while(!promptIndices[r]);
				playerData[i].prompt2 = allPrompts[r];
				promptIndices[r] = false;
			}
			var playerIndices = [];
			for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
			var playerOrder = [];
			for(let i = 0; i < playerIds.length; i++){
				var r;
				do r = Math.floor(Math.random() * playerIds.length);
				while(!playerIndices[r]);
				playerOrder.push(r);
				playerIndices[r] = false;
			}
			caseData = [];
			for(let i = 0; i < playerIds.length; i++){
				caseData.push({
					case: false,
					plaintiff: {
						player: playerOrder[i],
						evidence: false,
						votes: 0,
						score: 0,
						winner_bonus: 0,
						unanimous_bonus: 0
					},
					defendant: {
						player: playerOrder[(i + 1) % playerIds.length],
						evidence: false,
						votes: 0,
						score: 0,
						winner_bonus: 0,
						unanimous_bonus: 0
					},
					votes: 0,
					score: 0
				});
			}
			playerIndices = [];
			for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
			playerOrder = [];
			for(let i = 0; i < playerIds.length; i++){
				var r;
				do r = Math.floor(Math.random() * playerIds.length);
				while(!playerIndices[r]);
				playerOrder.push(r);
				playerIndices[r] = false;
			}
			for(let i = 0; i < playerIds.length; i++){
				var index = false;
				for(let j = 0; j < playerIds.length; j++) if(i == playerOrder[j]) index = j;
				if(!(index === false)){
					const recipientIndex1 = playerOrder[(index + 1) % playerIds.length];
					playerData[i].case_recipient1 = recipientIndex1;
					const prompt1 = playerData[i].prompt1;
					playerData[recipientIndex1].case1 = prompt1.part1 + " " + prompt1.autofills[Math.floor(Math.random() * prompt1.autofills.length)].toUpperCase() + " " + prompt1.part2;
					const recipientIndex2 = playerOrder[(index + 2) % playerIds.length];
					playerData[i].case_recipient2 = recipientIndex2;
					const prompt2 = playerData[i].prompt2;
					playerData[recipientIndex2].case2 = prompt2.part1 + " " + prompt2.autofills[Math.floor(Math.random() * prompt2.autofills.length)].toUpperCase() + " " + prompt2.part2;
				}
			}
		}
		else if(curState == states.SELECT_CASES){
			for(let i = 0; i < playerIds.length; i++) playerData[i].finished = false;
		}
		else if(curState == states.CASE_INTRO){
			for(let i = 0; i < playerIds.length; i++) playerData[i].finished = false;
		}
		else if(curState == states.PLAINTIFF_CASE && !caseData[currentCase].case) curState = states.CASE_RESULTS;
		else if(curState == states.VOTE_CASES){
			for(let i = 0; i < playerIds.length; i++) playerData[i].finished = false;
			for(var a in audience) if(audience[a] && allUsers[a] && allUsers[a].getAudience()) audience[a].voting = true;
			audienceVotes = 0;
		}
		else if(curState == states.CASE_VOTES) audienceVotes = false;
		if(curState == states.CASE_RESULTS){
			if(currentCase < playerIds.length){
				if(caseData[currentCase].case){
					const plaintiff = caseData[currentCase].plaintiff;
					const defendant = caseData[currentCase].defendant;
					if(plaintiff.votes) plaintiff.score = Math.floor(plaintiff.votes * 100.0 / (plaintiff.votes + defendant.votes)) * 100;
					if(defendant.votes) defendant.score = Math.floor(defendant.votes * 100.0 / (plaintiff.votes + defendant.votes)) * 100;
					if(plaintiff.votes > defendant.votes){
						if(defendant.votes || plaintiff.votes < 3) plaintiff.winner_bonus = 1000;
						else plaintiff.unanimous_bonus = 2500;
					}
					else if(plaintiff.votes < defendant.votes){
						if(plaintiff.votes || defendant.votes < 3) defendant.winner_bonus = 1000;
						else defendant.unanimous_bonus = 2500;
					}
					allUsers[playerIds[plaintiff.player]].addToScore(plaintiff.score + plaintiff.winner_bonus + plaintiff.unanimous_bonus);
					allUsers[playerIds[defendant.player]].addToScore(defendant.score + defendant.winner_bonus + defendant.unanimous_bonus);
				}
				else{
					const defendant = caseData[currentCase].defendant;
					defendant.score = 10000;
					defendant.winner_bonus = 1000;
					allUsers[playerIds[defendant.player]].addToScore(defendant.score + defendant.winner_bonus);
				}
			}
			else{
				var indices = [];
				for(let i = 0; i < playerIds.length; i++) indices.push(true);
				var order = [];
				for(let i = 0; i < playerIds.length; i++){
					var maxIndex = 0;
					var maxVotes = 0;
					for(let j = 0; j < playerIds.length; j++){
						if(indices[j]){
							var curVotes = caseData[j].votes;
							if(curVotes > maxVotes){
								maxIndex = j;
								maxVotes = curVotes;
							}
						}
					}
					order.push(maxIndex);
					indices[maxIndex] = false;
				}
				var maxVotes = 0;
				var curScore = 20000;
				for(let i = 0; i < playerIds.length; i++){
					if(curScore){
						var curVotes = caseData[order[i]].votes;
						if(curVotes){
							if(i > 0 && curVotes < maxVotes) curScore = Math.floor((playerIds.length - i) * 100.0 / playerIds.length) * 200;
							maxVotes = curVotes;
							caseData[order[i]].score = curScore;
							allUsers[playerIds[caseData[order[i]].plaintiff.player]].addToScore(curScore);
							allUsers[playerIds[caseData[order[i]].defendant.player]].addToScore(curScore);
						}
						else curScore = 0;
					}
				}
			}
		}
		gameState.setState(curState, {});
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.receivePrompt = function(userId, prompt){
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		for(let i = 0; i < playerIds.length; i++){
			if(userId == playerIds[i]){
				var update = false;
				if(playerData[i].finished == 0){
					playerData[playerData[i].case_recipient1].case1 = prompt;
					playerData[i].finished = 1;
					const newPrompt = playerData[i].prompt2;
					allUsers[playerIds[i]].sendPrompt({
						part1: newPrompt.part1,
						part2: newPrompt.part2
					});
				}
				else if(playerData[i].finished == 1){
					playerData[playerData[i].case_recipient2].case2 = prompt;
					playerData[i].finished = true;
					for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(u).players);
				}
			}
		}
	}
	
	this.selectCase = function(userId, prompt){
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		for(let i = 0; i < playerIds.length; i++){
			var index = caseData[i].plaintiff.player;
			if(userId == playerIds[index] && !playerData[index].finished){
				caseData[i].case = prompt;
				if(prompt == playerData[index].case1) playerData[index].case1 = false;
				else if(prompt == playerData[index].case2) playerData[index].case2 = false;
				playerData[index].finished = true;
				for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(u).players);
			}
		}
	}
	
	this.updateEvidence = function(userId, evidence){
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		const curState = gameState.get();
		var lawyer = curState == states.PLAINTIFF_CASE ? caseData[currentCase].plaintiff : curState == states.DEFENDANT_CASE ? caseData[currentCase].defendant : false;
		if(!(lawyer == false) && userId == playerIds[lawyer.player] && !playerData[lawyer.player].finished) lawyer.evidence = evidence;
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendEvidenceUpdate(evidence);
	}
	
	this.finishCase = function(userId){
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		const curState = gameState.get();
		var index = curState == states.PLAINTIFF_CASE ? caseData[currentCase].plaintiff.player : curState == states.DEFENDANT_CASE ? caseData[currentCase].defendant.player : false;
		if(!(index === false) && userId == playerIds[index]){
			playerData[index].finished = true;
			for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(u).players);
		}
	}
	
	this.receiveVote = function(userId, vote){
		const curState = gameState.get();
		if(curState != states.VOTE_CASES) return;
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer() && !user.getAudience()) return;
		if(user.getPlayer()){
			var player = false;
			for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) player = i;
			if(player === false || playerData[player].finished) return;
			if(currentCase < playerIds.length){
				if(vote == 0) caseData[currentCase].plaintiff.votes++;
				else if(vote == 1) caseData[currentCase].defendant.votes++;
			}
			else caseData[vote].votes++;
			playerData[player].finished = true;
		}
		else if(user.getAudience() && audience[userId].voting){
			var update = false;
			if(currentCase < playerIds.length){
				update = true;
				audienceVotes++;
				if(vote == 0) caseData[currentCase].plaintiff.votes++;
				else if(vote == 1) caseData[currentCase].defendant.votes++;
			}
			else if(caseData[vote]){
				update = true;
				audienceVotes++;
				caseData[vote].votes++;
			}
			audience[userId].voting = false;
			if(update){
				for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].setAudienceVotes(audienceVotes);
			}
		}
	}
	
	this.endGame = function(){
		gameState.setState(states.END, {});
		const allUsers = users.getAll();
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.newLobby = function(){
		playerIds = false;
		audience = {};
		currentPrompt = false;
		gameState.setState(states.LOBBY, {});
		const allUsers = users.getAll();
		for(var u in allUsers) if(allUsers[u] && !allUsers[u].getHost()) users.removeUser(u);
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.disconnectAll = function(){
		const allUsers = users.getAll();
		for(var u in allUsers) users.removeUser(u);
	}
	
	this.sendUpdates = function(user, params){
		//var summary = gameState.getSummary();
		//user.sendUpdates(summary, params);
	}
	
	setInterval(function(game){
		return function(){
			const allUsers = users.getAll();
			const audienceCount = game.getAudienceCount();
			for(var a in audience){
				if(audience[a] && allUsers[a] && allUsers[a].getAudience()){
					audience[a].connected = false;
					allUsers[a].checkAudienceConnection();
				}
			}
		}
	}(this), 1000);
}

function Users(){
	var users = {};
	
	this.addUser = function(user, gameId){
		var uniqueId = user.getUniqueId();
		if(typeof uniqueId === 'undefined' || !uniqueId) return;
		user.setGameId(gameId);
		users[uniqueId] = user;
	}
	
	this.getUser = function(userId){
		if(userId in users) return users[userId];
		else return false;
	}
	
	this.removeUser = function(userId){
		if(userId in users){
			users[userId].disconnectUser();
			delete users[userId];
			users[userId] = false;
		}
	}
	
	this.getAll = function(){
		return users;
	}
}

function User(pSocket, pName){
	var socket = pSocket;
	
	this.getUniqueId = function(){
		if(socket && socket.handshake && socket.handshake.session && socket.handshake.session.unique_id) return socket.handshake.session.unique_id;
		return false;
	}
	
	if(socket && socket.handshake && socket.handshake.session){
		//if(typeof socket.handshake.session.unique_id === 'undefined'){
		//	console.log('# User connected.');
		//	socket.handshake.session.unique_id = socket.id;
		//}
		console.log('# User connected.');
		socket.handshake.session.unique_id = socket.id;
		
		socket.handshake.session.in_game = true;
		socket.handshake.session.user_id = this.getUniqueId();
		socket.handshake.session.save();
	}
	
	var isHost = pName == 'host';
	var isPlayer;
	var isAudience = pName == 'audience';
	isPlayer = !(isHost || isAudience);
	var name = isPlayer ? pName : false;
	var strokeColour = false;
	var drawing = false;
	var score = false;
	var likes = false;
	
	this.getHost = function(){
		return isHost;
	}
	
	this.getPlayer = function(){
		return isPlayer;
	}
	
	this.getAudience = function(){
		return isAudience;
	}
	
	this.getName = function(){
		return name;
	}
	
	this.setStrokeColour = function(colour){
		if(isPlayer) strokeColour = colour;
	}
	
	this.getStrokeColour = function(){
		return strokeColour;
	}
	
	this.resetScore = function(){
		score = 0;
	}
	
	this.addToScore = function(s){
		if(isPlayer) score += s;
	}
	
	this.getScore = function(){
		return score;
	}
	
	this.setGameId = function(gameId){
		socket.handshake.session.game_id = gameId;
	}
	
	this.updateSocket = function(pSocket){
		socket = pSocket;
	}
	
	this.disconnectUser = function(){
		socket.handshake.session.in_game = false;
		socket.handshake.session.unique_id = false;
		socket.handshake.session.user_id = false;
		socket.handshake.session.game_id = false;
		socket.handshake.session.save();
		if(isHost) socket.emit('host_init_nok');
		else socket.emit('game_init_nok');
	}
	
	this.sendPlayersUpdate = function(players){
		if(isHost) socket.emit('host_players_update', players);
	}
	
	this.sendAudienceUpdate = function(audience){
		if(isHost) socket.emit('host_audience_update', audience);
	}
	
	this.sendStateUpdate = function(params){
		if(isHost) socket.emit('host_state_update', params);
		else socket.emit('game_state_update', params);
	}
	
	this.sendEvidenceUpdate = function(evidence){
		if(isHost) socket.emit('host_evidence_update', evidence);
	}
	
	this.setAudienceVotes = function(audienceVotes){
		if(isHost) socket.emit('host_set_audience_votes', audienceVotes);
	}
	
	this.sendPrompt = function(prompt){
		if(isPlayer) socket.emit('game_receive_prompt', prompt);
	}
	
	this.setAudienceVotes = function(audienceVotes){
		if(isHost) socket.emit('host_set_audience_votes', audienceVotes);
	}
	
	this.checkAudienceConnection = function(){
		if(isAudience) socket.emit('game_check_audience_connection');
	}
}

function GameState(){
	var curState = false;
	var stateParams = false;
	var hiddenParams = false;
	
	this.get = function(){
		return curState;
	}
	
	this.setState = function(pState, pStateParams){
		curState = pState;
		stateParams = pStateParams;
	}
	
	this.setHiddenParams = function(pHiddenParams){
		hiddenParams = pHiddenParams;
	}
	
	this.getHiddenParams = function(){
		return hiddenParams;
	}
	
	this.getSummary = function(){
		var obj = {};
		obj.state = curState;
		obj.stateParams = stateParams;
		return obj;
	}
}