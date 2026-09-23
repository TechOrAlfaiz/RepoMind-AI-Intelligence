import app from "../apps/api/dist/app.js";
import { connectDatabase } from "../apps/api/dist/config/database.js";

export default async function handler(req, res) {
  // Restore original URL from query param or headers if rewritten by Vercel
  try {
    const parsed = new URL(req.url, "http://localhost");
    const subpath = parsed.searchParams.get("__subpath");
    if (subpath !== null) {
      parsed.searchParams.delete("__subpath");
      const remainingQuery = parsed.searchParams.toString();
      req.url = `/api/${subpath}${remainingQuery ? `?${remainingQuery}` : ""}`;
    } else {
      const matchedPath = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
      if (matchedPath && matchedPath !== "/api" && req.url !== matchedPath) {
        req.url = matchedPath;
      }
    }
  } catch (err) {
    console.error("[Vercel Serverless URL Parse Error]:", err);
  }

  // Ensure database is connected (with cached connection check)
  try {
    await connectDatabase();
  } catch (err) {
    console.error("[Vercel Serverless DB Warning]:", err.message);
  }

  return app(req, res);
}
