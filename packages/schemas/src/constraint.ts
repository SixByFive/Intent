import { z } from "zod";
import { IsoDateSchema, TagsSchema } from "./common.js";

export const ConstraintSeveritySchema = z.enum(["hard", "soft"]);

export const ConstraintFrontmatterSchema = z.object({
  id: z.string().regex(/^CON-\d{4}$/, "Constraint ID must match CON-NNNN"),
  title: z.string().min(1),
  type: z.literal("constraint"),
  severity: ConstraintSeveritySchema,
  created: IsoDateSchema,
  updated: IsoDateSchema,
  system: z.string().optional(),
  plans: z.array(z.string()).default([]),
  tags: TagsSchema,
});

export type ConstraintFrontmatter = z.infer<typeof ConstraintFrontmatterSchema>;

export interface ConstraintFile {
  frontmatter: ConstraintFrontmatter;
  body: string;
  filePath: string;
}
