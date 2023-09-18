import { Elysia, t, ws } from "elysia";
import { Database } from 'bun:sqlite';
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { cors } from "@elysiajs/cors";
import * as elements from "typed-html";
import { assert, log } from "console";
import { KeyObject } from "crypto";
import { WebSocketServer } from 'ws';

const BASE_HTML = ({ children }: elements.Children ) => `
<!DOCTYPE html>

<html>
	<head>
		<meta charset="UTF-8">
		<title>BETH stack!</title>
		<script src="https://unpkg.com/htmx.org@1.9.5/dist/htmx.min.js"></script>
	</head>
	${children}
`

const server = new Elysia({
	serve:{
		hostname:"127.0.0.1"
	}
})
	.use(cors())
	.use(html())
	.use(ws())
	.use(staticPlugin({
		prefix: "/files", assets: "./files",
	}));


// TODO
(()=>{

const TODO_HTML = (todo:Todo, index:number) => (
	<li id={"todo-"+todo.index.toString()}>
		<span>
			<p style="display: inline-block">{todo.text}</p>
			<button
				hx-target={"#todo-"+todo.index.toString()}
				hx-post="/todo/remove"
				hx-vals="js:{'index': event.target.parentElement.parentElement.id.substring(5)}"
				style="display: inline-block"
			>Remove</button>
		</span>
	</li>
)

const REMOVED_TODO_HTML = (oldText:string) => (
	<li>
		<p style="display: inline-block"><s>
			{oldText}
		</s></p>
	</li>
)

type Todo = { text: string, index: number }
const TODO_DB: Todo[] = [ ];
const NewTodo = (text: string): Todo => ( {text:text, index:((TODO_DB?.at(-1)?.index)??-1)+1} );
server
	.get("/todo", ({ html }) => html(
		<BASE_HTML><body>
			<h1>
				TODO list with the BETH stack
			</h1>
			<ul id="todo-list">
				{TODO_DB.map(TODO_HTML)}
			</ul>
			<form
				hx-target="#todo-list"
				hx-swap="beforeend"
				hx-post="/todo/add"
			>
				<label for="text">New Todo:</label>
				<input id="text" name="text"></input>
				<button onclick="this.parentElement.querySelector('input').select()">New Todo</button>
			</form>
		</body></BASE_HTML>
	))
	.post("/todo/remove", ({ body })=>{
		assert(body.index <= TODO_DB.length && body.index >= 0);
		const dbindex = TODO_DB.findIndex(({index})=>index==body.index)
		TODO_DB.splice(dbindex, 1)
		return REMOVED_TODO_HTML("removed");
	}, {
		body: t.Object({
			index: t.Numeric(),
		})
	})
	.post("/todo/add", ({ body })=>{
		assert(typeof(body.text) === "string");
		TODO_DB.push(NewTodo(body.text))
		return TODO_HTML(TODO_DB[TODO_DB.length-1], TODO_DB.length)
	}, {
		body: t.Object({
			text: t.String(),
		})
	})

})();

// People
await (async ()=>{

type Person = {
	id: number,
	info: { [key: string]: string; },
}
let FILE_MIRROR = {
	cols: [],
	rows: [],
	biggestId: -1,
}
const FILE = Bun.file("people.json", { type: "application/json" });
if (await FILE.exists()) {
	FILE_MIRROR = (await FILE.json())
}
let BIGGEST_ID: number = FILE_MIRROR.biggestId
const INFO_COLS: string[] = FILE_MIRROR.cols;
const PEOPLE_DB: Person[] = FILE_MIRROR.rows;

function SaveFile (){
	FILE_MIRROR.biggestId = BIGGEST_ID;
	Bun.write(FILE, JSON.stringify(FILE_MIRROR));
}

SaveFile()

function PERSON_HTML(p: Person) {
	return (
		<tr>
			{INFO_COLS.map(r => <td contenteditable="true">{p.info[r]??""}</td> )}
		</tr>
	)
}

function ROW_HTML(infoName: string) {
	return (
		<th hx-target="this">
			<label class="row">{infoName}</label>
			<span
				class="row-rem"
				hx-delete="/people/col"
				hx-swap="outerHTML"
				hx-vals="js:{'text': event.target.parentElement.querySelector('p').innerText}"
				onclick="RemCol(this.parentElement)"
			>X</span>
		</th>
	)
}

server
	.get("/people", ({ html })=>{
		return html(<BASE_HTML>
		<body>
			<script src="/files/people.js"></script>
			<link rel="stylesheet" type="text/css" href="/files/people.css"></link>

			<span>
				<input name="text" id="addtext"></input>
				<button
					id="col-adder"
					hx-post="/people/col"
					hx-target="thead > tr"
					hx-swap="beforeend"
					hx-include="[id='addtext']"
					//onclick="this.parentElement.querySelector('input').select()"
				>Add Col</button>
				<button
					id="row-adder"
					hx-post="/people/row"
					hx-target="tbody"
					hx-swap="beforeend"
				>Add Row</button>
				<button id="table-saver">Save</button>
			</span>
			<table> <thead>
				<tr>
					{INFO_COLS.map(ROW_HTML)}
				</tr>
			</thead> <tbody>
				{PEOPLE_DB.map(PERSON_HTML)}
			</tbody> </table>
		</body>
		</BASE_HTML>)
	})
	.post("/people/col", ({ body })=>{
		if (INFO_COLS.includes(body.text) || body.text.length === 0) {
			return
		}
		INFO_COLS.push(body.text);
		SaveFile();
		return ROW_HTML(body.text)
	}, {
		body: t.Object({
			text: t.String(),
		})
	})
	.delete("/people/col", ({ body })=>{
		if (body.text.length === 0) return;
		const index = INFO_COLS.indexOf(body.text)
		if (index < 0) return;
		INFO_COLS.splice(index, 1)
		SaveFile()
		return;
	}, {
		body: t.Object({
				text: t.String(),
		})
	})
	.post("/people/row", ()=>{
			const id = ++BIGGEST_ID;
			const newPerson:Person = ({id, info:{}});
			PEOPLE_DB.push(newPerson)
			SaveFile();
			return PERSON_HTML(newPerson)
	})
	.post("/people/update", ({ body })=>{
		body.forEach((cols, pindex)=>{
			cols.forEach((col, dindex)=>{
				PEOPLE_DB[pindex].info[INFO_COLS[dindex]] = col
			})
		})
		SaveFile()
	}, {
		body: t.Array(
			t.Array( // col
				t.String() // data
			)
		)
	})

});

// Easy Clip Board
(()=>{
const ECB_DB:{ [key: string]: string; } = {}

server
	.get("/ecb", ({ html })=>html(
	<BASE_HTML>
		<form method="POST" action="/ecb">
			<label for="ishtml">Parse as HTML:</label>
			<input type="checkbox" id="ishtml" name="ishtml"></input>
			<br/>
			<label for="name">Note Name:</label>
			<input id="name" name="name"></input>
			<br/>
			<label for="text">Note Content:</label>
			<br/>
			<textarea required="true" id="text" name="text"></textarea>
			<br/>
			<button>Create Note</button>
		</form>
	</BASE_HTML>
	))
	.post("/ecb", ({ body, set })=>{
		const noteName = body.name??Bun.hash(body.text).toString()
		if (body.ishtml!=="on") {
			body.text = "<code>"+Bun.escapeHTML(body.text)+"</code>"
		}
		ECB_DB[noteName] = body.text
		set.redirect = "/ecb/"+noteName
	}, {
		body: t.Object({
			ishtml: t.Optional(t.String()),
			name: t.Optional(t.String()),
			text: t.String(),
		})
	})
	.get("/ecb/:id", ({ params })=>{
		return ECB_DB[params.id]
	}, {
		params: t.Object({
			id: t.String()
		})
	})
})();

// WebSocket chat
(()=>{
const wss = new WebSocketServer({ port: 3030 });
type User = {
	id: number,
	send: (string)=>void, // ws stream
	name: string,
}
const users:User = [];

function broadcast(message, senderId) {
	users.forEach(({id, send})=>{
		if (id != senderId) {
			send(message)
		}
	})
}

wss.on('connection', (ws, req, client) => {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
		log(JSON.parse(data));
    log('received: %s', data);
  });

	users.push({id:users.length, send: ws.send.bind(ws), name:"" })
  ws.send((users.length-1).toString());

});

server.get("/bunchat", ({ html })=>html(
	<BASE_HTML>
		<body>
			<script src="/files/ws.js"></script>
			<h1>Bun Chat</h1>
			<div id="login">
				<input  id="username" type="text" />
				<button id="dologin" type="button">Login</button>
			</div>
			<div id="chatapp">
				<div id="chatlog"> </div>
				<input  id="msg" type="text" />
				<button id="send" type="button">Send</button>
			</div>
		</body>
	</BASE_HTML>
	))
})();

server.get("/", ({ html })=>html((
<BASE_HTML>
<body>
	<h1>Welcome to Owsei's server!</h1>
	<a href="/people">People App</a><br/>
	<a href="/todo">Todo App</a><br/>
	<a href="/ecb">ECB App</a><br/>
	<a href="/bunchat">Chat App</a><br/>
</body>
</BASE_HTML>
)))

server.listen(8080);
log(`🦊 Elysia is running at ${server.server?.hostname}:${server.server?.port}`)
