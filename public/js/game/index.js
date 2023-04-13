function IndexView(){
	var socket = false;
	
	this.start = function(){
		socket = io();
		this.bindViewEvents();
		this.bindSocketEvents();
		socket.emit('index_init');
	}
	
	this.bindViewEvents = function(){
		$("#btn_host_connect").click(function(){
			socket.emit('connect_host', $("#host_password").val());
			return false;
		});
		$("#btn_player_connect").click(function(){
			console.log($("#player_name").val());
			socket.emit('connect_player', {
				name: $("#player_name").val().toUpperCase(),
				code: $("#room_code").val().toUpperCase()
			});
			return false;
		});
	}
	
	this.bindSocketEvents = function(){
		socket.on('index_init', function(){
			
		});
		socket.on('connect_host_ok', function(){
			location.href = '/host.html';
		});
		socket.on('connect_host_nok', function(){
			alert('Incorrect password.');
			document.getElementById("host_password").value = "";
		});
		socket.on('connect_player_ok', function(){
			location.href = '/game.html';
		});
		socket.on('connect_player_nok_no_name', function(){
			alert('Name field is empty.');
		});
		socket.on('connect_player_nok_room_not_found', function(){
			alert('Room not found.');
			document.getElementById("room_code").value = "";
		});
	}
}

$(document).ready(function(){
	var index = new IndexView();
	index.start();
});