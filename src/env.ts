import z from "zod";
import { camelKeys } from "string-ts";

const envSchema = z.object({
	OPENAI_BASE_URL: z.string().url(),
	OPENAI_API_KEY: z.string(),
	CHAT_MODEL: z.string(),
	CHAT_MODEL_SUPPORTS_SYSTEM: z.coerce.boolean().default(true),
	COT_MODEL: z.string(),
	COT_MODEL_SUPPORTS_SYSTEM: z.coerce.boolean().default(true),
	JSON_MODEL: z.string(),
	SOLVEIT_TOKEN: z.string(),
});

export const env = camelKeys(envSchema.parse(process.env));
