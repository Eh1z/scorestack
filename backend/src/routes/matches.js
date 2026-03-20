import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validations/matches.ts";
import { db } from "../db/db.ts";
import { matches } from "../db/schema.ts";
import { getMatchStatus } from "../utils/matchStatus.ts";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsedData = listMatchesQuerySchema.safeParse(req.query);

  if (!parsedData.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsedData.error.issues,
    });
  }

  const fetchLimit = Math.min(parsedData.data.limit ?? 30, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(matches.createdAt, "desc")
      .limit(fetchLimit);
    return res.json({ message: "Matches fetched successfully", data });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch matches",
      details: error,
    });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsedData = createMatchSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsedData.error.issues,
    });
  }

  const { homeScore, awayScore, startTime, endTime } = parsedData.data;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsedData.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(new Date(startTime), new Date(endTime)),
      })
      .returning();

      if(res.app.locals.broadcastMatchCreated){
        res.app.locals.broadcastMatchCreated(event);
      }

    res
      .status(201)
      .json({ message: "Match created successfully", data: event });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to create match",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
