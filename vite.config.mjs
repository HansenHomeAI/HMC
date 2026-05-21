import { spawn } from "node:child_process";
import { defineConfig } from "vite";

const SOGS_PROXY_PREFIX = "/api/sogs-proxy/";
const SOGS_PROXY_HOSTS = new Set([
  "spaceport-ml-processing-staging.s3.amazonaws.com",
  "spaceport-ml-processing-staging.s3.us-west-2.amazonaws.com",
  "spaceport-ml-processing.s3.amazonaws.com",
  "spaceport-ml-processing.s3.us-west-2.amazonaws.com"
]);
const AWS_CLI = process.env.AWS_CLI || "/opt/homebrew/bin/aws";

function contentTypeForPath(pathname) {
  if (pathname.endsWith(".json")) return "application/json";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".wasm")) return "application/wasm";
  if (pathname.endsWith(".js")) return "text/javascript";
  if (pathname.endsWith(".css")) return "text/css";
  return "application/octet-stream";
}

function parseSogsProxyUrl(reqUrl) {
  const requestUrl = new URL(reqUrl, "http://localhost");
  const rawPath = requestUrl.pathname.startsWith(SOGS_PROXY_PREFIX)
    ? requestUrl.pathname.slice(SOGS_PROXY_PREFIX.length)
    : requestUrl.pathname.replace(/^\/+/, "");
  const rawTarget = decodeURIComponent(rawPath);
  const target = new URL(rawTarget.replace(/^https:\//, "https://").replace(/^http:\//, "http://"));
  target.search = requestUrl.search;
  if (!SOGS_PROXY_HOSTS.has(target.host)) {
    throw new Error(`Unsupported SOGS proxy host: ${target.host}`);
  }
  const bucket = target.host.split(".s3.")[0];
  const key = target.pathname.replace(/^\/+/, "");
  if (!bucket || !key || key.includes("..")) {
    throw new Error("Invalid S3 target");
  }
  return { target, s3Uri: `s3://${bucket}/${key}` };
}

function readRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function writeMacClipboard(text) {
  return new Promise((resolve, reject) => {
    const child = spawn("pbcopy", [], { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `pbcopy exited with ${code}`));
      }
    });
    child.stdin.end(text);
  });
}

function localClipboardPlugin() {
  return {
    name: "meadow-local-clipboard",
    configureServer(server) {
      server.middlewares.use("/__meadow/clipboard", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        try {
          const text = await readRequestBody(req);
          if (process.platform !== "darwin") {
            throw new Error("Local clipboard bridge is only enabled on macOS");
          }
          await writeMacClipboard(text);
          res.statusCode = 204;
          res.end();
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
      });
    }
  };
}

function localSogsProxyPlugin() {
  return {
    name: "hmc-local-sogs-proxy",
    configureServer(server) {
      server.middlewares.use(SOGS_PROXY_PREFIX, (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          next();
          return;
        }
        let parsed;
        try {
          parsed = parseSogsProxyUrl(req.url || "");
        } catch (error) {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
          return;
        }
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("cache-control", "no-store");
        res.setHeader("content-type", contentTypeForPath(parsed.target.pathname));
        if (req.method === "HEAD") {
          res.statusCode = 200;
          res.end();
          return;
        }
        const child = spawn(AWS_CLI, ["s3", "cp", parsed.s3Uri, "-"], {
          env: { ...process.env, AWS_PAGER: "" },
          stdio: ["ignore", "pipe", "pipe"]
        });
        let stderr = "";
        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });
        child.on("error", (error) => {
          if (!res.headersSent) res.statusCode = 502;
          res.end(JSON.stringify({ error: error.message }));
        });
        child.on("close", (code) => {
          if (code !== 0 && !res.writableEnded) {
            if (!res.headersSent) {
              res.statusCode = 502;
              res.setHeader("content-type", "application/json");
            }
            res.end(JSON.stringify({ error: stderr || `aws exited with ${code}` }));
          }
        });
        child.stdout.pipe(res);
      });
    }
  };
}

export default defineConfig({
  plugins: [localClipboardPlugin(), localSogsProxyPlugin()]
});
