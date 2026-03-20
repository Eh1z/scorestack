import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/db.ts";
import { commentary } from "../db/schema.ts";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validations/commentary.ts";
import { matchIdParamSchema } from "../validations/matches.ts";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.get("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid route parameters",
      details: parsedParams.error.issues,
    });
  }

  const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsedQuery.error.issues,
    });
  }

  const fetchLimit = Math.min(parsedQuery.data.limit ?? 100, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, parsedParams.data.id))
      .orderBy(commentary.createdAt, "desc")
      .limit(fetchLimit);

    return res.json({
      message: "Commentary fetched successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch commentary",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid route parameters",
      details: parsedParams.error.issues,
    });
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsedBody.error.issues,
    });
  }

  try {
    const { minute, ...rest } = parsedBody.data;
    const [result] = await db
      .insert(commentary)
      .values({
        matchId: parsedParams.data.id,
        minute,
        ...rest,
      })
      .returning();
    if (res.app.locals.broadcastCommentaryUpdate) {
      res.app.locals.broadcastCommentaryUpdate(result.matchId, result);
    }

    return res
      .status(201)
      .json({ message: "Commentary created successfully", data: result });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create commentary",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
