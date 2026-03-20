import dotenv from "dotenv";
dotenv.config();

import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";
const arjectKey = process.env.ARCJET_KEY;
const arjectMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";
const arjectEnv = process.env.ARCJET_ENV || "production";

if (!arjectKey) {
  console.warn(
    "ARCJET_KEY is not set or is empty. Arcjet protection is disabled and the server will run without Arcjet.",
  );
}

// HTTP Arcjet config - using more lenient rules since HTTP requests are generally less resource-intensive than WebSocket connections
export const httpArcjetConfig = arjectKey
  ? arcjet({
      key: arjectKey,
      rules: [
        shield({
          mode: arjectMode,
        }),
        detectBot({
          mode: arjectMode,
          allow: [
            "CATEGORY:SEARCH_ENGINE",
            
            "CATEGORY:PREVIEW",
          ],
        }),
        slidingWindow({ mode: arjectMode, interval: "10s", max: 40 }),
      ],
    })
  : null;

//   WebSocket Arcjet config - using more aggressive rules since WebSocket connections are long-lived and can be more resource-intensive if abused
export const wsArcjetConfig = arjectKey
  ? arcjet({
      key: arjectKey,
      rules: [
        shield({
          mode: arjectMode,
        }),
        detectBot({
          mode: arjectMode,
          allow: [
            "CATEGORY:SEARCH_ENGINE",
            "CATEGORY:PREVIEW",
          ],
        }),
        slidingWindow({ mode: arjectMode, interval: "2s", max: 5 }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjetConfig) {
      return next();
    }

    try {
      const decision = await httpArcjetConfig.protect(req);
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({
            error: "Too many requests",
            details: "Your request has been blocked by security measures.",
          });
        }
        console.warn(`Request blocked by Arcjet: ${decision.reason}`);
        return res.status(403).json({
          error: "Forbidden",
          details: "Your request has been blocked by security measures.",
        });
      }
    } catch (error) {
      console.error("Error processing Arcjet security middleware:", error);
      return res.status(503).json({
        error: "Service Unavailable",
        details: "An error occurred while processing the request.",
      });
    }
    next();
  };
}
