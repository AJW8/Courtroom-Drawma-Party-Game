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

function HostView(){
	var code = false;
	var state = false;
	var minPlayers = false;
	var maxPlayers = false;
	var players = false;
	var sortedPlayers = false;
	var audience = false;
	var round = false;
	var plaintiff = false;
	var defendant = false;
	var currentCase = false;
	var audienceVotes = false;
	var cases = false;
	
	this.init = function(){
		this.initSocket();
		this.bindViewEvents();
		this.bindSocketEvents();
		socket.emit('host_init');
	}
	
	this.initSocket = function(){
		socket = io.connect({
			'reconnection':true,
			'reconnectionDelay': 1000,
			'reconnectionDelayMax' : 1000,
			'reconnectionAttempts': 1000
		});
	}
	
	this.updateData = function(data){
		code = data.code;
		state = data.state;
		audience = data.audience;
		if(!minPlayers) minPlayers = data.min_players;
		if(!maxPlayers) maxPlayers = data.max_players;
		players = data.players;
		sortedPlayers = data.sorted_players;
		audience = data.audience;
		round = data.round;
		plaintiff = data.plaintiff;
		defendant = data.defendant;
		currentCase = data.current_case;
		audienceVotes = data.audience_votes;
		cases = data.cases;
		this.updateView();
	}
	
	this.updateView = function(){
		$("#room_code").html("Code: " + code);
		if(state == states.LOBBY){
			$("#lobby").show();
			$("#game_start").hide();
			$("#lobby_room_code").html("<p>Code: " + code + "</p>");
			var html = "";
			for(let i = 0; i < maxPlayers; i++) html += "<p>" + (i < players.length ? players[i].name + "</p>" : "<i>join now!</i></p>");
			document.getElementById("btn_start_game").disabled = players.length < minPlayers;
			if(players.length < minPlayers) $("#btn_start_game").html((minPlayers - players.length) + (minPlayers - players.length > 1 ? " more players needed" : " more player needed"));
			else{
				$("#btn_start_game").html('Start Game');
				if(players.length == maxPlayers) html += "<p>" + (audience > 0 ? audience + " in audience" : "Join the audience!") + "</p>";
			}
			$('#lobby_players').html(html);
		}
		else{
			$("#lobby").hide();
			$("#game_start").show();
			$("#game").show();
			$("#game_audience_count").html("<p>" + (audience > 0 ? audience + " in audience</p>" : "Join the audience!</p>"));
			if(state == states.INTRO){
				$("#intro").show();
				$("#intro").html("<p>Welcome to Courtroom Drawma!</p><p>For each round, you will be filing a lawsuit against another player. You will also be defending yourself against someone else's lawsuit.</p><p>During the court session, you will 'present' (draw) your evidence in front of the other players in order to make your case.</p><p>Finally, everyone else (who collectively form the jury) votes on who should win the case!</p>" + (audience > 0 ? "<p>Audience members get to be on the jury too!</p>" : "") + (players.length < 5 ? "<p>There will be 2 rounds this game.</p>" : "<p>There will only be 1 round this game, so make it count!</p>"));
			}
			else $("#intro").hide();
			if(state == states.COMPLETE_PROMPTS || state == states.SELECT_CASES){
				$("#complete_tasks").show();
				var html = state == states.COMPLETE_PROMPTS ? "<p>Players, complete the prompts that have been sent to your devices!</p>" : "<p>Now, select one of the cases that has been sent to your device!</p>";
				for(let i = 0; i < players.length; i++) html += "<p>" + players[i].name + (players[i].finished === true ? " (done)</p>" : " (not done)</p>");
				$("#players_finished").html(html);
			}
			else $("#complete_tasks").hide();
			if(state == states.CASE_INTRO){
				$("#case_intro").show();
				$("#plaintiff").html("<p>Plaintiff: " + players[plaintiff.player].name + "</p>");
				$("#defendant").html("<p>Defendant: " + players[defendant.player].name + "</p>");
				$("#charges").html(currentCase ? "<p>Charges:</p><p>" + currentCase  + "</p>" : "<p><i>The plaintiff did not select a case: the defendant wins by default.</i></p>");
			}
			else $("#case_intro").hide();
			if(state == states.PLAINTIFF_CASE || state == states.DEFENDANT_CASE){
				$("#case_presentation").show();
				$("#case_prompt").html(state == states.PLAINTIFF_CASE ? "<p>The plaintiff " + (players[plaintiff.player].finished ? "has finished their case.</p>" : "(" + players[plaintiff.player].name + ") is now making their case.</p>") : "<p>The defendant " + (players[defendant.player].finished ? "has finished their case.</p>" : "(" + players[defendant.player].name + ") is now making their case.</p>"));
				if(plaintiff.evidence || defendant.evidence){
					var canvas = document.getElementById("case_presentation_canvas");
					var context = canvas.getContext("2d");
					context.clearRect(0, 0, canvas.width, canvas.height);
					if(plaintiff.evidence){
						context.beginPath();
						context.strokeStyle = players[plaintiff.player].colour;
						for(let i = 0; i < plaintiff.evidence.length; i++){
							const currentPath = plaintiff.evidence[i];
							for(let j = 0; j < currentPath.length; j++){
								if(j == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
								else{
									context.lineTo(currentPath[j].x * canvas.width, currentPath[j].y * canvas.height);
									context.stroke();
								}
							}
						}
					}
					if(state == states.DEFENDANT_CASE && defendant.evidence){
						context.beginPath();
						context.strokeStyle = players[defendant.player].colour;
						for(let i = 0; i < defendant.evidence.length; i++){
							const currentPath = defendant.evidence[i];
							for(let j = 0; j < currentPath.length; j++){
								if(j == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
								else{
									context.lineTo(currentPath[j].x * canvas.width, currentPath[j].y * canvas.height);
									context.stroke();
								}
							}
						}
					}
				}
				document.getElementById("btn_continue").disabled = !players[state == states.PLAINTIFF_CASE ? plaintiff.player : defendant.player].finished;
			}
			else{
				$("#case_presentation").hide();
				var canvas = document.getElementById("case_presentation_canvas");
				canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
			}
			if(state == states.VOTE_CASES || state == states.CASE_VOTES || state == states.CASE_RESULTS){
				if(cases){
					$("#judge_case").hide();
					$("#vote_cases").show();
					if(state == states.VOTE_CASES){
						for(let i = 0; i < cases.length; i++){
							if(cases[i]){
								$("#case" + (i + 1)).show();
								$("#case_lawyers" + (i + 1)).html(players[cases[i].plaintiff.player].name + " vs " + players[cases[i].defendant.player].name);
								var canvas = document.getElementById("case_plaintiff_canvas" + (i + 1));
								var context = canvas.getContext("2d");
								context.clearRect(0, 0, canvas.width, canvas.height);
								if(cases[i].plaintiff.evidence){
									const p = cases[i].plaintiff;
									context.beginPath();
									context.strokeStyle = players[p.player].colour;
									for(let j = 0; j < p.evidence.length; j++){
										const currentPath = p.evidence[j];
										for(let k = 0; k < currentPath.length; k++){
											if(k == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
											else{
												context.lineTo(currentPath[k].x * canvas.width, currentPath[k].y * canvas.height);
												context.stroke();
											}
										}
									}
									canvas = document.getElementById("case_defendant_canvas" + (i + 1));
									context = canvas.getContext("2d");
									context.clearRect(0, 0, canvas.width, canvas.height);
									context.beginPath();
									context.strokeStyle = players[p.player].colour;
									for(let j = 0; j < p.evidence.length; j++){
										const currentPath = p.evidence[j];
										for(let k = 0; k < currentPath.length; k++){
											if(k == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
											else{
												context.lineTo(currentPath[k].x * canvas.width, currentPath[k].y * canvas.height);
												context.stroke();
											}
										}
									}
								}
								else{
									canvas = document.getElementById("case_defendant_canvas" + (i + 1));
									context = canvas.getContext("2d");
									context.clearRect(0, 0, canvas.width, canvas.height);
								}
								if(cases[i].defendant.evidence){
									const d = cases[i].defendant;
									context.beginPath();
									context.strokeStyle = players[d.player].colour;
									for(let j = 0; j < d.evidence.length; j++){
										const currentPath = d.evidence[j];
										for(let k = 0; k < currentPath.length; k++){
											if(k == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
											else{
												context.lineTo(currentPath[k].x * canvas.width, currentPath[k].y * canvas.height);
												context.stroke();
											}
										}
									}
								}
								$("#case_charges" + (i + 1)).html(cases[i].case);
								$("#case_votes" + (i + 1)).hide();
								$("#case_score" + (i + 1)).hide();
							}
							else $("#case" + (i + 1)).hide();
						}
						for(let i = cases.length + 1; i < 9; i++) $("#case" + i).hide();
						$("#vote_cases_prompt").show();
						$("#vote_cases_audience_votes").show();
						$("#vote_cases_audience_votes").html(audienceVotes ? "<p>Audience Votes: " + audienceVotes + "</p>" : "");
					}
					else if(state == states.CASE_VOTES){
						for(let i = 0; i < cases.length; i++){
							$("#case_votes" + (i + 1)).show();
							$("#case_votes" + (i + 1)).html("Votes: " + cases[i].votes);
						}
						$("#vote_cases_prompt").hide();
						$("#vote_cases_audience_votes").hide();
					}
					else{
						for(let i = 0; i < cases.length; i++){
							$("#case_score" + (i + 1)).show();
							$("#case_score" + (i + 1)).html("Reward: $" + cases[i].score);
						}
					}
				}
				else{
					$("#judge_case").show();
					$("#vote_cases").hide();
					if(state == states.VOTE_CASES){
						$("#case_plaintiff").html("Plaintiff: " + players[plaintiff.player].name);
						$("#case_defendant").html("Defendant: " + players[defendant.player].name);
						var canvas = document.getElementById("case_plaintiff_canvas");
						var context = canvas.getContext("2d");
						context.clearRect(0, 0, canvas.width, canvas.height);
						if(plaintiff.evidence){
							context.beginPath();
							context.strokeStyle = players[plaintiff.player].colour;
							for(let i = 0; i < plaintiff.evidence.length; i++){
								const currentPath = plaintiff.evidence[i];
								for(let j = 0; j < currentPath.length; j++){
									if(j == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
									else{
										context.lineTo(currentPath[j].x * canvas.width, currentPath[j].y * canvas.height);
										context.stroke();
									}
								}
							}
							canvas = document.getElementById("case_defendant_canvas");
							context = canvas.getContext("2d");
							context.clearRect(0, 0, canvas.width, canvas.height);
							context.beginPath();
							context.strokeStyle = players[plaintiff.player].colour;
							for(let i = 0; i < plaintiff.evidence.length; i++){
								const currentPath = plaintiff.evidence[i];
								for(let j = 0; j < currentPath.length; j++){
									if(j == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
									else{
										context.lineTo(currentPath[j].x * canvas.width, currentPath[j].y * canvas.height);
										context.stroke();
									}
								}
							}
						}
						else{
							canvas = document.getElementById("case_defendant_canvas");
							context = canvas.getContext("2d");
							context.clearRect(0, 0, canvas.width, canvas.height);
						}
						if(defendant.evidence){
							context.beginPath();
							context.strokeStyle = players[defendant.player].colour;
							for(let i = 0; i < defendant.evidence.length; i++){
								const currentPath = defendant.evidence[i];
								for(let j = 0; j < currentPath.length; j++){
									if(j == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
									else{
										context.lineTo(currentPath[j].x * canvas.width, currentPath[j].y * canvas.height);
										context.stroke();
									}
								}
							}
						}
						$("#case_plaintiff_votes").hide();
						$("#case_defendant_votes").hide();
						$("#case_plaintiff_score").hide();
						$("#case_defendant_score").hide();
						$("#judge_case_prompt").show();
						$("#judge_case_audience_votes").show();
						$("#judge_case_audience_votes").html(audienceVotes ? "<p>Audience Votes: " + audienceVotes + "</p>" : "");
					}
					else if(state == states.CASE_VOTES){
						$("#case_plaintiff_votes").show();
						$("#case_defendant_votes").show();
						$("#case_plaintiff_votes").html("Votes: " + plaintiff.votes);
						$("#case_defendant_votes").html("Votes: " + defendant.votes);
						$("#judge_case_prompt").hide();
						$("#judge_case_audience_votes").hide();
					}
					else{
						if(!currentCase){
							$("#case_plaintiff").html("Plaintiff: " + players[plaintiff.player].name);
							$("#case_defendant").html("Defendant: " + players[defendant.player].name);
							$("#case_plaintiff_votes").hide();
							$("#case_defendant_votes").hide();
						}
						$("#case_plaintiff_score").show();
						$("#case_defendant_score").show();
						$("#case_plaintiff_score").html("Reward: $" + plaintiff.score + (plaintiff.winner_bonus ? " + $" + plaintiff.winner_bonus + " Winner Bonus" : plaintiff.unanimous_bonus ? " + $" + plaintiff.unanimous_bonus + " Unanimous Jury Bonus" : ""));
						$("#case_defendant_score").html("Reward: $" + defendant.score + (defendant.winner_bonus ? " + $" + defendant.winner_bonus + " Winner Bonus" : defendant.unanimous_bonus ? " + $" + defendant.unanimous_bonus + " Unanimous Jury Bonus" : ""));
						$("#judge_case_prompt").hide();
						$("#judge_case_audience_votes").hide();
					}
				}
			}
			else{
				$("#judge_case").hide();
				$("#vote_cases").hide();
			}
			if(state == states.WINNER){
				$("#winner").show();
				var winners = [];
				var maxScore = 0;
				for(let i = 0; i < players.length; i++){
					var currentScore = players[sortedPlayers[i]].score;
					if(i == 0) maxScore = currentScore;
					if(currentScore == maxScore) winners.push(sortedPlayers[i]);
				}
				var html = winners.length > 1 ? "<p>WINNERS:<p>" : "<p>WINNER:</p>";
				for(let i = 0; i < winners.length; i++) html += "<p>" + players[winners[i]].name + "</p>";
				$("#winner").html(html);
			}
			else $("#winner").hide();
			if(state == states.END){
				$("#game").hide();
				$("#end").show();
				var html = "<p>FINAL SCORES</p>";
				for(let i = 0; i < players.length; i++) html += "<p>" + (i + 1) + " " + players[sortedPlayers[i]].name + ": $" + players[sortedPlayers[i]].score + "</p>";
				$("#final_scores").html(html);
			}
			else $("#end").hide();
		}
	}
	
	this.bindViewEvents = function(){
		$('#btn_start_game').click(function(){
			if(!players || players.length < minPlayers) alert((players ? minPlayers - players.length : minPlayers) + (minPlayers - players.length > 1 ? " more players needed to start." : " more player needed to start."));
			else if(confirm("Start the game?")) socket.emit('host_start_game');
			return false;
		});
		$('#btn_continue').click(function(){
			socket.emit('host_continue');
			return false;
		});
		$('#btn_end_game').click(function(){
			socket.emit('host_end_game');
			return false;
		});
		$('#btn_leave_game').click(function(){
			if(confirm("Destroy the current game? All data associated with this game will be lost.")) socket.emit('host_leave_game');
			return false;
		});
		$('#btn_same_players').click(function(){
			if(confirm("Play again with the same players?")) socket.emit('host_start_game');
			return false;
		});
		$('#btn_new_players').click(function(){
			if(confirm("Start a new lobby? You as the host will remain connected.")) socket.emit('host_new_lobby');
			return false;
		});
	}
	
	this.bindSocketEvents = function(){
		socket.on('host_init_ok', function(host){
			return function(data){
				host.updateData(data);
				return false;
			}
		}(this));
		socket.on('host_init_nok', function(){
			location.href = '/';
		});
		socket.on('host_players_update', function(host){
			return function(newPlayers){
				players = newPlayers;
				host.updateView();
				return false;
			}
		}(this));
		socket.on('host_audience_update', function(host){
			return function(newAudience){
				audience = newAudience;
				host.updateView();
				return false;
			}
		}(this));
		socket.on('host_state_update', function(host){
			return function(data){
				if(state != data.state) host.updateData(data);
				return false;
			}
		}(this));
		socket.on('host_evidence_update', function(host){
			return function(evidence){
				if(state == states.PLAINTIFF_CASE && !players[plaintiff.player].finished) plaintiff.evidence = evidence;
				else if(state == states.DEFENDANT_CASE && !players[defendant.player].finished) defendant.evidence = evidence;
				else return false;
				host.updateView();
				return false;
			}
		}(this));
		socket.on('host_set_audience_votes', function(host){
			return function(votes){
				if(state != states.CURRENT_PROMPT) return false;
				audienceVotes = votes;
				host.updateView();
				return false;
			}
		}(this));
	}
}

$(document).ready(function(){
	var game = new HostView();
	game.init();
});