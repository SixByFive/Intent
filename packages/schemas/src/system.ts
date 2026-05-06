import { z } from "zod";
import { IsoDateSchema, TagsSchema } from "./common.js";

export const SystemFrontmatterSchema = z.object({
  id: z.string().regex(/^sys-[a-z0-9-]+$/, "System ID must be 'sys-' followed by lowercase alphanumeric and hyphens"),
  title: z.string().min(1),
  type: z.literal("system"),
  created: IsoDateSchema,
  updated: IsoDateSchema,
  plans: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  tags: TagsSchema,
});

export type SystemFrontmatter = z.infer<typeof SystemFrontmatterSchema>;

export interface SystemFile {
  frontmatter: SystemFrontmatter;
  body: string;
  filePath: string;
}
