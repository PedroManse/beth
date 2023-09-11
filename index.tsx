import { Elysia, t } from "elysia";
import { Database } from 'bun:sqlite';
import { html } from "@elysiajs/html";
import { staticPlugin } from '@elysiajs/static';
import * as elements from "typed-html";
import {assert, log} from "console";

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

const server = new Elysia()
	.use(html())
	.use(staticPlugin({
		prefix: "/files", assets: "./files",
	}));


// TODO app
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

// People app
await (async ()=>{
interface StringMap { [key: string]: string; }
type Person = {
	id: number,
	info: StringMap,
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
	Bun.write(FILE, JSON.stringify(FILE_MIRROR));
}

SaveFile()

function PERSON_HTML(p: Person) {
	return (
		<tr>
			{INFO_COLS.map(r => <th contenteditable="true">{p.info[r]??""}</th> )}
		</tr>
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
						hx-post="/people/addcol"
						hx-target="thead > tr"
						hx-swap="beforeend"
						hx-include="[id='addtext']"
						onclick="this.parentElement.querySelector('input').select()"
					>Add Col</button>
					<button
						id="row-adder"
						hx-post="/people/addrow"
						hx-target="tbody"
						hx-swap="beforeend"
						//onclick="this.parentElement.querySelector('input').select()"
					>Add Row</button>
			</span>
			<table> <thead>
				<tr>
					{INFO_COLS.map((infoName)=><th>{infoName}</th>)}
				</tr>
			</thead> <tbody>
				{PEOPLE_DB.map(PERSON_HTML)}
			</tbody> </table>
		</body>
		</BASE_HTML>)
	})
	.post("/people/addcol", ({ body })=>{
		if (!INFO_COLS.includes(body.text) && body.text.length) {
			INFO_COLS.push(body.text);
			SaveFile();
			return (<th>{body.text}</th>);
		}
	}, {
		body: t.Object({
			text: t.String(),
		})
	})
	.post("/people/addrow", ()=>{
			const id = ++BIGGEST_ID;
			const newPerson:Person = ({id, info:{}});
			PEOPLE_DB.push(newPerson)
			SaveFile();
			return PERSON_HTML(newPerson)
	})

})();

server.get("/", ()=>"Hi!")

server.listen(8080);
log("BETH stack serving at ::8080")