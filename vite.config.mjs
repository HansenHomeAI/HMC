import { spawn } from "node:child_process";
import { defineConfig } from "vite";

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

export default defineConfig({
  plugins: [localClipboardPlugin()]
});
