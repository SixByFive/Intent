import { z } from "zod";
import { IsoDateSchema, StatusSchema, TagsSchema } from "./common.js";

export const DecisionFrontmatterSchema = z.object({
  id: z.string().regex(/^DEC-\d{4}$/, "Decision ID must match DEC-NNNN"),
  title: z.string().min(1),
  type: z.literal("decision"),
  status: StatusSchema,
  created: IsoDateSchema,
  updated: IsoDateSchema,
  system: z.string().optional(),
  plans: z.array(z.string()).default([]),
  supersedes: z.string().optional(),
  tags: TagsSchema,
});

export type DecisionFrontmatter = z.infer<typeof DecisionFrontmatterSchema>;

export interface DecisionFile {
  frontmatter: DecisionFrontmatter;
  body: string;
  filePath: string;
}
