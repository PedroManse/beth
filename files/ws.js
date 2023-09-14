"use strict";
window.onload = () => {
	var MyId = null;
	var LastMsgId = -1;
	document.getElementById("new").addEventListener("click", ({ target })=>{
		fetch("/chat", {
			method:"POST",
			body: JSON.stringify({user:"Manse"})
		}).then(a=>{
			a.text().then( id=>{
				MyId = parseInt(id)
				console.log(`Connected with session id ${MyId}`)
			} )
		})
		target.remove()
	})
	const send = document.getElementById("send")
	send.addEventListener("click", ()=>{
		fetch("/chat/send", {
			method:"POST",
			body: JSON.stringify({
				user:MyId,
				body: "Hello!",
			})
		}).then(()=>{
			console.log("Sent!")
		})
	})
	const check = document.getElementById("check")
	check.addEventListener("click", ()=>{
		fetch("/chat/latest")
			.then(a=>a.json())
			.then(console.log)
	})
}

