import { z } from "zod";

export const IsoDateSchema = z.string().datetime({ offset: true });

export const TagsSchema = z.array(z.string()).default([]);

export const StatusSchema = z.enum(["active", "draft", "archived", "superseded"]);

export type Status = z.infer<typeof StatusSchema>;
