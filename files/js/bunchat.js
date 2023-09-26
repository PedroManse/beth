"use strict";

function setChatLogSize() {
	let chatlogSize = window.innerHeight-window.header.clientHeight-100
	chatlog.setAttribute("style",`max-height:${chatlogSize}px;min-height:${chatlogSize}px`)
}

function parseMD(line) {
	return line
		.replaceAll(/\\\*/g, "\u0001")
		.replaceAll(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
		.replaceAll(/\*(.*?)\*/g, "<em>$1</em>")
		.replaceAll("\u0001", "*")
}

function onMessage({action, from, msg}) {
	switch (action) {
		case "user-msg":
			window.chatlog.appendChild(createElement(
				"div", {class:"chat-msg"}, [
					createElement("h3", from),
					createElement("p", parseMD(msg)),
				]
			)).scrollIntoView()
			break;
		case "server-msg":
			window.chatlog.appendChild(createElement(
				"div", {class:"server-msg"}, [
					createElement("p", msg),
				]
			)).scrollIntoView()
			break;
		case "server-warning":
			//TODO: XYPopup
			alert(`${msg}`)
			break
		default:
			alert(`Unexpected action from WSServer ${action}:${msg}`)
			break
	}
	//window.chatlog.scrollTop = window.chatlog.scrollHeight - window.chatlog.clientHeight;
}

let connection = null;
window.onload = () => {
	window.addEventListener("resize", setChatLogSize)

	window.dologin.addEventListener("click", ()=>{
		connection = new WSConnection(
			"ws://192.168.15.117:3030",
			window.username.value,
			onMessage
		);

		window.addEventListener("beforeunload", ()=>{connection.close()})

		connection.on("close", ({code, reason})=>{
			alert("WS CLOSED");
			window.location.reload();
		});

		window.login.remove();
		window.chatapp.classList.remove("invisible");
		window.msg.focus()
		window.msg.select()
		window.header.appendChild(
			createElement("p", `Connected as "${connection.userName}"`)
		);
		setChatLogSize()
	})

	window.msg.addEventListener("keydown", ({ key })=>{
		if (key !== "Enter") return;
		connection.send("message", {
			msg:window.msg.value,
		})
		window.msg.value = ""
	})
}

