import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { env } from "./env";
import { getFreeResponseAnswer } from "./completions";

console.log(env);

const app = new Hono();

app.get("/", (c) => c.text("Hello from SolveIt Server!"));

app.post("/solve/free-response", async (c) => {
	const reason = c.req.query("reason") === "1";
	console.log("RESONING:", reason);
	const token = c.req.query("token");

	if (token !== env.solveitToken) {
		return c.json({ error: "Invalid SolveIt token" });
	}

	const question = await c.req.text();
	console.log("Got question:", question);
	const answer = await getFreeResponseAnswer(
		question,
		reason ? env.cotModel : env.chatModel,
		reason ? env.cotModelSupportsSystem : env.chatModelSupportsSystem,
	);
	if (!answer) {
		return c.json({ error: "Failed to generate answer" }, 500);
	}
	return c.json(answer);
});

// app.post("/solve/multiple-choice", async (c) => {
// 	const q
// })

serve(app);
