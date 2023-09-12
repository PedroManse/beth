"use strict";


function AddCol() {
	if (lastColCount == colCount()) {
		document.querySelector("input").select()
		return
		// INVALID XYPopup
	}
	lastColCount = colCount();
	document.querySelectorAll("tbody > tr")
		.forEach(element => {
			const td = document.createElement( "td" )
			td.setAttribute("contenteditable","true")
			element.appendChild(td)
		});
	document.querySelector("input").select()
}

function RemCol(target) {
	const targetIndex = Array.from(document.querySelectorAll("thead > tr > th")).indexOf(target)
	document.querySelectorAll("tbody > tr")
		.forEach(row=>{
			Array.from(row.children)
				.filter((_, index)=>index==targetIndex)
				.forEach(e=>e.remove())
		})
}

const colCount = ()=>document.querySelector("thead > tr").childElementCount;
let lastColCount = undefined;
window.onload = () => {
	htmx.on("htmx:afterRequest", (event)=>{
		if (event.target == document.getElementById("col-adder")) {
			AddCol();
		}
		lastColCount = colCount();
	})
	lastColCount = colCount();
	document.getElementById("table-saver").addEventListener("click", ()=>{
		fetch("/people/update", {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(MakePeopleMatrix()),
		}).then(({ status })=>{
			// TODO XYPopup
			alert(status)
		})
	})
}

function MakePeopleMatrix() {
	const rows = []
	document.querySelectorAll("tbody > tr").forEach((row)=>{
		let cols = [];
		row.querySelectorAll("td").forEach((col)=>{
			cols.push(col.innerText)
		})
		rows.push(cols)
	})
	return rows
}