import { z } from "zod";

export const LinkEntrySchema = z.object({
  id: z.string(),
  type: z.enum(["plan", "decision", "system", "constraint"]),
  title: z.string(),
  filePath: z.string(),
  refs: z.array(z.string()).default([]),
});

export const LinksIndexSchema = z.object({
  generated: z.string().datetime({ offset: true }),
  entries: z.array(LinkEntrySchema),
});

export type LinkEntry = z.infer<typeof LinkEntrySchema>;
export type LinksIndex = z.infer<typeof LinksIndexSchema>;
