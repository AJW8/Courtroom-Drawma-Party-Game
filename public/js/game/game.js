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

function GameView(){
	var state = false;
	var name = false;
	var strokeColour = false;
	var prompt = false;
	var finished = false;
	var case1 = false;
	var case2 = false;
	var evidence = false;
	var voting = false;
	var plaintiff = false;
	var defendant = false;
	var cases = false;
	
	this.init = function(){
		this.initSocket();
		this.bindViewEvents();
		this.bindSocketEvents();
		socket.emit('game_init');
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
		state = data.state;
		if(!name) name = data.name;
		if(name){
			strokeColour = data.stroke_colour;
			prompt = data.prompt;
			finished = data.finished;
			case1 = data.case1;
			case2 = data.case2;
			evidence = data.evidence;
		}
		plaintiff = data.plaintiff;
		defendant = data.defendant;
		cases = data.cases;
		voting = data.voting;
		this.updateView();
	}
	
	this.updateView = function(){
		$("#title").html("<b>" + (name ? name : "AUDIENCE") + "</b>");
		$("#completed_prompts").hide();
		$("#selected_case").hide();
		$("#plaintiff").hide();
		$("#defendant").hide();
		$("#voted").hide();
		$("#my_case").hide();
		var idle = true;
		if(state == states.LOBBY){
			idle = false;
			$("#lobby").show();
		}
		else $("#lobby").hide();
		if(state == states.COMPLETE_PROMPTS && name){
			idle = false;
			if(prompt){
				$("#complete_prompt").show();
				$("#prompt_part1").html("<p>" + prompt.part1 + "</p>");
				$("#prompt_part2").html("<p>" + prompt.part2 + "</p>");
			}
			else{
				$("#complete_prompt").hide();
				$("#completed_prompts").show();
			}
		}
		else $("#complete_prompt").hide();
		if(state == states.SELECT_CASES && name){
			idle = false;
			if(finished){
				$("#select_case").hide();
				$("#selected_case").show();
			}
			else{
				$("#select_case").show();
				$("#case_defendant").html("<p>You are suing this player: " + defendant + "</p>");
				$("#btn_select_case1").html(case1);
				$("#btn_select_case2").html(case2);
			}
		}
		else $("#select_case").hide();
		if(state == states.CASE_INTRO && plaintiff === true){
			idle = false;
			$("#plaintiff").show();
		}
		if(state == states.PLAINTIFF_CASE){
			if(plaintiff === true && !finished){
				idle = false;
				$("#make_case").show();
				this.drawEvidence();
			}
			else if(defendant === true){
				idle = false;
				$("#defendant").show();
				$("#make_case").hide();
			}
			else $("#make_case").hide();
		}
		else if(state == states.DEFENDANT_CASE && defendant === true && !finished){
			idle = false;
			$("#make_case").show();
			this.drawEvidence();
		}
		else $("#make_case").hide();
		if(state == states.VOTE_CASES){
			if(voting){
				idle = false;
				$("#vote").show();
				if(cases){
					$("#vote_prompt").html("Vote for your favourite case!");
					for(let i = 0; i < cases.length; i++){
						const button = "#btn_vote" + (i + 1);
						if(cases[i]){
							$(button).show();
							$(button).html(cases[i]);
						}
						else $(button).hide();
					}
					for(let i = cases.length + 1; i < 9; i++) $("#btn_vote" + i).hide();
				}
				else{
					$("#vote_prompt").html("Who should win this case?");
					$("#btn_vote1").show();
					$("#btn_vote1").html(plaintiff);
					$("#btn_vote2").show();
					$("#btn_vote2").html(defendant);
					for(let i = 3; i < 9; i++) $("#btn_vote" + i).hide();
				}
			}
			else if(name && (plaintiff === true || defendant === true)){
				idle = false;
				$("#vote").hide();
				$("#my_case").show();
			}
			else{
				$("#vote").hide();
				if(cases){
					idle = false;
					$("#voted").show();
				}
			}
		}
		else $("#vote").hide();
		if(state == states.END){
			idle = false;
			$("#end").show();
		}
		else $("#end").hide();
		if(idle) $("#idle").show();
		else $("#idle").hide();
	}
	
	this.drawEvidence = function(){
		var canvas = document.getElementById("drawing_canvas");
		var context = canvas.getContext("2d");
		context.clearRect(0, 0, canvas.width, canvas.height);
		if(defendant === true && plaintiff.evidence){
			context.beginPath();
			context.strokeStyle = plaintiff.colour;
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
		if(evidence){
			context.beginPath();
			context.strokeStyle = strokeColour;
			for(let i = 0; i < evidence.length; i++){
				const currentPath = evidence[i];
				for(let j = 0; j < currentPath.length; j++){
					if(j == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
					else{
						context.lineTo(currentPath[j].x * canvas.width, currentPath[j].y * canvas.height);
						context.stroke();
					}
				}
			}
		}
		if(!evidence){
			document.getElementById("btn_undo").disabled = true;
			document.getElementById("btn_finish_case").disabled = true;
		}
	}
	
	this.submitVote = function(vote){
		if(cases && !cases[vote]) return;
		socket.emit('game_submit_vote', vote);
		voting = false;
		this.updateView();
	}
	
	this.bindViewEvents = function(){
		window.addEventListener('load', function(){
			var canvas = document.getElementById("drawing_canvas");
			var context = canvas.getContext("2d");
			var isIdle = true;
			var currentPath = false;
			function drawstart(event){
				if(!(state == states.PLAINTIFF_CASE && plaintiff === true || state == states.DEFENDANT_CASE && defendant === true)) return;
				currentPath = [{
					x: (event.pageX - canvas.offsetLeft) / canvas.width,
					y: (event.pageY - canvas.offsetTop) / canvas.height
				}];
				context.beginPath();
				context.moveTo(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop);
				isIdle = false;
			}
			function drawmove(event){
				if(!(state == states.PLAINTIFF_CASE && plaintiff === true || state == states.DEFENDANT_CASE && defendant === true) || isIdle) return;
				currentPath.push({
					x: (event.pageX - canvas.offsetLeft) / canvas.width,
					y: (event.pageY - canvas.offsetTop) / canvas.height
				});
				context.lineTo(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop);
				context.strokeStyle = strokeColour;
				context.stroke();
				var newEvidence = [];
				for(let i = 0; i < evidence.length; i++) newEvidence.push(evidence[i]);
				newEvidence.push(currentPath);
				socket.emit('game_update_evidence', newEvidence);
			}
			function drawend(event){
				if(!(state == states.PLAINTIFF_CASE && plaintiff === true || state == states.DEFENDANT_CASE && defendant === true) || isIdle) return;
				drawmove(event);
				if(evidence) evidence.push(currentPath);
				else evidence = [currentPath];
				isIdle = true;
				currentPath = false;
				document.getElementById("btn_undo").disabled = false;
				document.getElementById("btn_finish_case").disabled = false;
			}
			function touchstart(event){ drawstart(event.touches[0]) }
			function touchmove(event){ drawmove(event.touches[0]); event.preventDefault(); }
			function touchend(event){ drawend(event.changedTouches[0]) }
			canvas.addEventListener('touchstart', touchstart, false);
			canvas.addEventListener('touchmove', touchmove, false);
			canvas.addEventListener('touchend', touchend, false);        
			canvas.addEventListener('mousedown', drawstart, false);
			canvas.addEventListener('mousemove', drawmove, false);
			canvas.addEventListener('mouseup', drawend, false);
		}, false);
		$('#btn_submit_prompt').click(function(game){
			return function(){
				if(!$("#prompt_input").val().length){
					alert("Cannot submit while field is empty.");
					return false;
				}
				socket.emit('game_submit_prompt', prompt.part1 + " " + $("#prompt_input").val().toUpperCase() + " " + prompt.part2);
				prompt = false;
				document.getElementById("prompt_input").value = "";
				game.updateView();
				return false;
			}
		}(this));
		$('#btn_select_case1').click(function(game){
			return function(){
				socket.emit('game_select_case', case1);
				finished = true;
				game.updateView();
				return false;
			}
		}(this));
		$('#btn_select_case2').click(function(game){
			return function(){
				socket.emit('game_select_case', case2);
				finished = true;
				game.updateView();
				return false;
			}
		}(this));
		$('#btn_undo').click(function(game){
			return function(){
				if(!evidence) return false;
				if(evidence.length == 1) evidence = false;
				else{
					var newEvidence = [];
					for(let i = 1; i < evidence.length; i++) newEvidence.push(evidence[i - 1]);
					evidence = newEvidence;
				}
				socket.emit('game_update_evidence', evidence);
				game.updateView();
				return false;
			}
		}(this));
		$('#btn_finish_case').click(function(game){
			return function(){
				socket.emit('game_finish_case');
				finished = true;
				evidence = false;
				game.updateView();
				var canvas = document.getElementById("drawing_canvas");
				canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
				return false;
			}
		}(this));
		$('#btn_vote1').click(function(game){
			return function(){
				game.submitVote(0);
				return false;
			}
		}(this));
		$('#btn_vote2').click(function(game){
			return function(){
				game.submitVote(1);
				return false;
			}
		}(this));
		$('#btn_vote3').click(function(game){
			return function(){
				game.submitVote(2);
				return false;
			}
		}(this));
		$('#btn_vote4').click(function(game){
			return function(){
				game.submitVote(3);
				return false;
			}
		}(this));
		$('#btn_vote5').click(function(game){
			return function(){
				game.submitVote(4);
				return false;
			}
		}(this));
		$('#btn_vote6').click(function(game){
			return function(){
				game.submitVote(5);
				return false;
			}
		}(this));
		$('#btn_vote7').click(function(game){
			return function(){
				game.submitVote(6);
				return false;
			}
		}(this));
		$('#btn_vote8').click(function(game){
			return function(){
				game.submitVote(7);
				return false;
			}
		}(this));
	}
	
	this.bindSocketEvents = function(){
		socket.on('game_init_ok', function(game){
			return function(data){
				game.updateData(data);
				return false;
			}
		}(this));
		socket.on('game_init_nok', function(){
			alert('You were disconnected.');
			location.href = '/';
		});
		socket.on('game_state_update', function(game){
			return function(data){
				if(state != data.state) game.updateData(data);
				return false;
			}
		}(this));
		socket.on('game_check_audience_connection', function(){
			socket.emit('game_verify_audience_connection');
		});
		socket.on('game_receive_prompt', function(game){
			return function(newPrompt){
				prompt = newPrompt;
				game.updateView();
				return false;
			}
		}(this));
	}
}

$(document).ready(function(){
	var game = new GameView();
	game.init();
});