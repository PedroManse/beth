
window.onload = () => {
	document.getElementById("col-adder")
		.addEventListener("click", ()=>{
			//TODO check if new col
			document.querySelectorAll("tbody > tr")
				.forEach(element => {
					const th = document.createElement( "th" )
					th.setAttribute("contenteditable","true")
					element.appendChild(th)
				});
		})
}