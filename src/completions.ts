import { z } from "zod";
import OpenAI from "openai";
import { env } from "./env";
import { zodResponseFormat } from "openai/src/helpers/zod.js";

export const exampleFRQuestion = `
FIGURE 1:
The figure shows a horizontal bar. A downward force of 8 newtons acts on its right end. An upward force of 12 newtons acts on a point that is 0.2 meters from the right end of the bar and is directed straight upward. The axis passes through the left end of the bar.

FIGURE 2:
The figure shows four diagrams. Four forces are applied to a bar in each diagram. The bar is divided into four identical segments having a length of one fourth of L. In diagram A, forces are 14 newtons downward acting on the left end, 8 newtons upward acting L/4 from the left end, 1 newton downward acting L/4 from the right end, and 7 newtons downward acting on the right end. In diagram B, forces are 20 newtons downward acting L/4 from the left end, 6 newtons downward and 4 newtons upward acting on the center, and 6 newtons upward acting on the right end. In diagram C, three forces are 20 newtons upward acting on the left end, L/4 from the left end, and L/4 from the right end; fourth force is 20 newtons downward acting on the right end. In diagram D, forces are 6 newtons downward acting L/4 from the left end, 12 newtons upward acting on the center, 4 newtons downward acting L/4 from the right end, and 2 newtons downward acting on the right end.

FIGURE 3:
The figure shows four diagrams. Several forces are applied to the disks of radius r in each diagram. In diagram A, forces are 12 newtons rightward acting on the top point, 4 newtons downward acting on the leftmost point, 8 newtons rightward acting on the bottom point, and 8 newtons bisecting fourth quadrant acting on the center. In diagram B, forces are 8 newtons rightward acting on the top point, 4 newtons downward acting on the rightmost point, and 4 newtons upward acting half of r to the left from the center. In diagram C, forces are 4 newtons rightward acting on the top point, 8 newtons downward acting on the leftmost point, and 12 newtons rightward acting half of r below the center. In diagram D, forces are 8 newtons rightward acting on the top point, 4 newtons upward acting on the leftmost point, 4 newtons downward acting on the rightmost point, and 36 newtons rightward acting half of r below the center.

QUESTION:
The uniform bar shown in (Figure 1) has a length of 0.80 m. The bar begins to rotate from rest in the horizontal plane about the axis passing through its left end. What will be the magnitude of the angular momentum LL of the bar 6.0 s after the motion has begun? The forces acting on the bar are shown in (Figure 1). Express your answer in kg⋅m2/s to two significant figures.

HINT 1 - How to approach the problem:
First, find the net torque, and then use \\(\\large{\frac{dec L}{dt} = ec  au_{\rm net}}\\).
`;

export const exampleFRQuestionOutput = `
ANSWER:
4.8

UNITS:
\(kg \frac{m^2}{s}\)

EXPLANATION:
The net torque is calculated by summing the torques from each force. The 8 N downward force at 0.80 m creates a clockwise torque: 0.80 m * 8 N = 6.4 N⋅m. The 12 N upward force at 0.60 m creates a counterclockwise torque: 0.60 m * 12 N = 7.2 N⋅m. Net torque = 7.2 - 6.4 = 0.8 N⋅m. Angular momentum L = τ_net * t = 0.8 N⋅m * 6.0 s = 4.8 kg⋅m²/s.
`;

export const frQuestionSystemPrompt = `
You will be provided a college physics problem. Please read and answer the question, using the other information as context. Please output your response, with the numeric/symbolic answer under ANSWER, the units under UNITS if applicable, and a brief explanation under EXPLANATION. Format all equations and units using LaTeX. Refer to the following example.

EXAMPLE INPUT
${exampleFRQuestion}

EXAMPLE OUTPUT
${exampleFRQuestionOutput}
`;

const frAnswerSchema = z.object({
	answer: z.string(),
	unit: z.string().optional(),
	explanation: z.string(),
});

export const frConversionSystemPrompt = `
Extract the answer, unit (if applicable), and explanation from the following answer to a physics problem. All of these keys should use LaTeX formatting when necessary.
`;

const client = new OpenAI({
	baseURL: env.openaiBaseUrl,
	apiKey: env.openaiApiKey,
});

export async function getFreeResponseAnswer(
	question: string,
	model: string,
	useSystemPrompt: boolean,
) {
	console.log("solving with model:", model);
	let retries = 0;
	let answer: string | null = null;
	while (answer == null) {
		if (retries >= 3) {
			return undefined;
		}
		const completion = await client.chat.completions.create({
			model,
			messages: [
				{
					role: useSystemPrompt ? "system" : "user",
					content: frQuestionSystemPrompt,
				},
				{ role: "user", content: question },
			],
		});
		answer = completion.choices[0]?.message?.content;
		retries++;
	}

	let jsonAnswer: z.infer<typeof frAnswerSchema> | null = null;
	while (jsonAnswer == null) {
		if (retries >= 3) {
			return undefined;
		}
		const conversion = await client.beta.chat.completions.parse({
			model: env.jsonModel,
			messages: [
				{ role: "system", content: frConversionSystemPrompt },
				{ role: "user", content: answer },
			],
			response_format: zodResponseFormat(frAnswerSchema, "answer"),
		});
		jsonAnswer = conversion.choices[0].message.parsed;
		retries++;
	}

	return jsonAnswer;
}
