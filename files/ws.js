"use strict";
const id = document.getElementById.bind(document)

let socket = null;
let userId = null;

function Connect(userName) {
	socket = new WebSocket("ws://localhost:3030");

	//socket.addEventListener("open", (event) => {;
	//	socket.send(userName);
	//});

	socket.addEventListener("message", (event) => {
		if (userId === null) {
			console.log(`My id is ${event.data}`)
			userId = parseInt(event.data)
			socket.send(`{id: ${userId}, name:userName}`)
		} else {
			console.log("Message from server ", event.data);
		}
	});
}


window.onload = () => {
	id("dologin").addEventListener("click", ()=>{
		Connect(id("username").value)
	})

	id("send").addEventListener("click", ()=>{
		console.log("SENT!", id("msg").value)
		socket.send(id("msg").value)
	})
}

