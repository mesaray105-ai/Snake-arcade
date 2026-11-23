const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, "public");
const scoresFile = path.join(__dirname, "scores.json");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

async function readScores() {
  try {
    const contents = await fs.readFile(scoresFile, "utf8");
    const scores = JSON.parse(contents);
    return Array.isArray(scores) ? scores : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function readRequestBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2048) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
  }
  return JSON.parse(body);
}

async function handleApi(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, await readScores());
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  let payload;
  try {
    payload = await readRequestBody(request);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: "Invalid request body." });
    return;
  }

  const score = payload && payload.score;
  const name = payload && typeof payload.name === "string" ? payload.name.trim() : "";
  if (!Number.isSafeInteger(score) || score < 0 || score > 100000 || !name || name.length > 16) {
    sendJson(response, 400, { error: "Provide a name (up to 16 characters) and a valid score." });
    return;
  }

  const scores = await readScores();
  scores.push({ name, score, date: new Date().toISOString() });
  scores.sort((first, second) => second.score - first.score || first.date.localeCompare(second.date));
  const topScores = scores.slice(0, 10);
  await fs.writeFile(scoresFile, `${JSON.stringify(topScores, null, 2)}\n`, "utf8");
  sendJson(response, 201, topScores);
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;

  try {
    if (pathname === "/api/scores") {
      await handleApi(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    const requestedPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
    const filePath = path.resolve(publicDirectory, `.${requestedPath}`);
    if (!filePath.startsWith(`${publicDirectory}${path.sep}`)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const contents = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      ...(path.basename(filePath) === "sw.js" ? { "Cache-Control": "no-cache" } : {}),
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof URIError) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    console.error("Request failed:", error);
    sendJson(response, 500, { error: "Internal server error." });
  }
});

server.listen(port, () => {
  console.log(`Snake game is running at http://localhost:${port}`);
});
