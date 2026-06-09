import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables and inject into process.env so API handlers can read them
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: "api-server-middleware",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith("/api/")) {
              const urlPath = req.url.split("?")[0];
              try {
                // Parse request body if POST
                let body = {};
                if (req.method === "POST") {
                  const buffers = [];
                  for await (const chunk of req) {
                    buffers.push(chunk);
                  }
                  const data = Buffer.concat(buffers).toString();
                  if (data) {
                    try {
                      body = JSON.parse(data);
                    } catch (e) {
                      body = {};
                    }
                  }
                }

                // Wrap response methods to match Vercel API
                const vercelRes = {
                  status(code: number) {
                    res.statusCode = code;
                    return this;
                  },
                  json(data: any) {
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(data));
                  },
                };

                // Wrap request object
                const vercelReq = {
                  method: req.method,
                  body,
                  query: {}, // simple wrapper, can extend if needed
                  headers: req.headers,
                };

                // Load API module using Vite's ssrLoadModule
                const modulePath = path.resolve(__dirname, `.${urlPath}.ts`);
                const apiModule = await server.ssrLoadModule(modulePath);
                
                if (apiModule && typeof apiModule.default === "function") {
                  await apiModule.default(vercelReq, vercelRes);
                  return; // Stop next middleware
                }
              } catch (err: any) {
                console.error(`Error in local API handler (${urlPath}):`, err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message || "Internal Server Error" }));
                return;
              }
            }
            next();
          });
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

