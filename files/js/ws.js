"use strict";

class WSConnection {
	constructor (
		serverURL,
		userName,
		onmsg,
		keepAliveInterval=5000,
	) {
		this.serverURL = serverURL;
		this.userName = userName;

		this.socket = null;
		this.userId = null;
		this.userHash = null;

		this.socket = new WebSocket(serverURL);

		this.keepAliveIntervalId = setInterval(()=>{
			this.send( "keep-alive" )
		}, keepAliveInterval)

		this.socket.addEventListener("message", (event) => {
			const info = JSON.parse(event.data);
			if (info.action === "set-server-info") {
				this.userId = info.id;
				this.userHash = info.hash;

				this.send( "set-username", {
					name: userName,
				});
			} else {
				onmsg(info);
			}
		});
	}

	on(eventName, callback) {
		console.assert(this.socket)
		this.socket.addEventListener(eventName, callback)
	}

	send(action, obj={}) {
		obj["action"] = action
		obj["id"] = this.userId
		obj["hash"] = this.userHash
		this.socket.send(JSON.stringify(obj))
	}

	close() {
		clearInterval(this.keepAliveIntervalId)
		this.send("disconnect")
		this.socket.close()
	}
}

