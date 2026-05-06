import { z } from "zod";
import { IsoDateSchema, StatusSchema, TagsSchema } from "./common.js";

export const PlanFrontmatterSchema = z.object({
  id: z.string().regex(/^plan-[a-z0-9-]+$/, "Plan ID must be 'plan-' followed by lowercase alphanumeric and hyphens"),
  title: z.string().min(1),
  type: z.literal("plan"),
  status: StatusSchema,
  created: IsoDateSchema,
  updated: IsoDateSchema,
  system: z.string().optional(),
  decisions: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  tags: TagsSchema,
});

export type PlanFrontmatter = z.infer<typeof PlanFrontmatterSchema>;

export interface PlanFile {
  frontmatter: PlanFrontmatter;
  body: string;
  filePath: string;
}
