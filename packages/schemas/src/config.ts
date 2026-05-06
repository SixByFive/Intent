import { z } from "zod";

export const IntentConfigSchema = z.object({
  version: z.literal("1"),
  project: z.string().min(1),
  systems: z.array(z.string()).default([]),
  defaultSystem: z.string().optional(),
  created: z.string().datetime({ offset: true }),
});

export type IntentConfig = z.infer<typeof IntentConfigSchema>;
