// First: routes an async handler's rejection to the error handler (Express 4 drops it).
import "#lib/asyncRouteErrors";

import helmet from "helmet";
import compression from "compression";
import express, { raw, NextFunction, Request, Response, RequestHandler } from "express";

import { config } from "#config";

import { ApiError, createSuccessResponse } from "#lib/errors";
import { httpMetricsMiddleware } from "#lib/metrics";

import { corsMiddleware } from "#middleware/cors";
import { loggingMiddleware } from "#middleware/logging";
import { rateLimitMiddleware } from "#middleware/rateLimit";
import { errorHandler, notFoundHandler } from "#middleware/errorHandler";
import { authRequestDiagnosticsMiddleware } from "#middleware/authRequestDiagnostics";

import aiRoutes from "#routes/ai";
import atsRoutes from "#routes/ats";
import userRoutes from "#routes/users";
import statsRoutes from "#routes/stats";
import githubRoutes from "#routes/github";
import healthRoutes from "#routes/health";
import sharesRoutes from "#routes/shares";
import apiKeyRoutes from "#routes/apiKeys";
import roadmapRoutes from "#routes/roadmap";
import changelogRoutes from "#routes/changelog";
import contactRoutes from "#routes/contact";
import clientErrorRoutes from "#routes/clientErrors";
import billingRoutes from "#routes/billing";
import profileRoutes from "#routes/profiles";
import documentRoutes from "#routes/documents";
import portfolioRoutes from "#routes/portfolios";
import affiliateRoutes from "#routes/affiliates";
import ambassadorRoutes from "#routes/ambassador";
import portfolioAssetRoutes from "#routes/portfolioAssets";
import adminRoutes from "#routes/admin/index";
import { BillingController } from "#controllers/billingController";

import { getRequestIpDetails } from "#utils/requestIp";
import { hasWellFormedHostAndProto, isAllowedHost } from "#utils/requestOrigin";

import { auth, authNodeHandler, authRequestContext } from "#auth/index";

const app = express();

// The better-auth endpoints, for the limiter's per-endpoint auth buckets (V-162).
app.locals.authEndpointPaths = Object.values(auth.api as Record<string, { path?: unknown }>)
  .map((endpoint) => endpoint.path)
  .filter((path): path is string => typeof path === "string");

// Request duration by route pattern for `/health/metrics`; first, so 429s and CORS refusals count.
app.use(httpMetricsMiddleware);

// Security middleware
app.use(helmet());

// Compress JSON responses (resume/portfolio payloads can be large; free bandwidth/latency win)
app.use(compression());

// CORS middleware
app.use(corsMiddleware);

// Rate limiting
app.use(rateLimitMiddleware);

// Logging middleware
app.use(loggingMiddleware);

// Body parser middleware
app.post(
  "/api/v1/billing/webhooks/dodo",
  raw({ type: "application/json", limit: "1mb" }),
  BillingController.dodoWebhook,
);

// JSON only, deliberately. `application/x-www-form-urlencoded` is one of the three CORS
// "simple" content types, so it is the only body format a cross-origin POST can send without
// triggering a preflight — mounting a parser for it would give away preflight as a structural
// CSRF barrier for no benefit, since no client sends that format (multipart uploads go through
// multer on the routes that accept them). SameSite=lax on the session cookie is the other layer.
//
// V-098: 100 kb everywhere, so unauthenticated routes (contact, auth, stats events, share
// verify) never parse large bodies. These paths are skipped here because their routers mount a
// larger parser after authentication: 4 MB for documents, profiles (master profile, imports),
// share create and the portfolio draft; 256 kb for the AI and ATS text routes.
const defaultJsonBody = express.json({ limit: "100kb" });
const OWN_BODY_PARSER_PATHS = [
  /^\/api\/v1\/(documents|profiles|ai)(\/|$)/i,
  /^\/api\/v1\/shares\/?$/i,
  /^\/api\/v1\/portfolios\/draft\/?$/i,
  /^\/api\/v1\/ats\/(check|analyze|convert-resume)\/?$/i,
];
app.use((req: Request, res: Response, next: NextFunction) =>
  OWN_BODY_PARSER_PATHS.some((pattern) => pattern.test(req.path))
    ? next()
    : defaultJsonBody(req, res, next),
);

// Trust proxy (for accurate IP addresses behind reverse proxies)
app.set("trust proxy", config.server.trustProxy);

// Versioned API routes
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/ats", atsRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/stats", statsRoutes);
app.use("/api/v1/github", githubRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/shares", sharesRoutes);
app.use("/api/v1/roadmap", roadmapRoutes);
app.use("/api/v1/changelog", changelogRoutes);
app.use("/api/v1/api-keys", apiKeyRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/client-errors", clientErrorRoutes);
app.use("/api/v1/profiles", profileRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/portfolios", portfolioRoutes);
app.use("/api/v1/affiliates", affiliateRoutes);
app.use("/api/v1/ambassador", ambassadorRoutes);
app.use("/api/v1/portfolio-assets", portfolioAssetRoutes);

// Single admin surface. Auth is enforced once inside the router, so every sub-route added
// under `#routes/admin` is gated by construction.
app.use("/api/v1/admin", adminRoutes);

app.all(["/api/v1/auth", "/api/v1/auth/*"], [
  authRequestDiagnosticsMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    // better-call builds `new Request(`${x-forwarded-proto}://${host}${url}`)` with no try/catch,
    // so `Host: a:99999` or a junk `X-Forwarded-Proto` throws "Failed to parse URL" outside
    // Express's error path. Refuse those before they reach it.
    if (!hasWellFormedHostAndProto(req.headers))
      return next(new ApiError(400, "Invalid Host or X-Forwarded-Proto header"));
    if (
      !isAllowedHost(req.headers, {
        baseUrl: config.auth.baseUrl,
        extraHosts: config.auth.allowedHosts,
      })
    )
      return next(new ApiError(400, "Unknown Host header", { code: "HOST_NOT_ALLOWED" }));

    let provider: string | undefined = undefined;
    const cleanPath = req.path.replace(/\/+$/, "");

    if (cleanPath.includes("/callback/")) provider = cleanPath.split("/").pop();
    else if (cleanPath.includes("verify-otp") || cleanPath.includes("email-otp"))
      provider = "email-otp";

    const ipDetails = getRequestIpDetails(req);
    authRequestContext.run(
      {
        ip: ipDetails.resolvedIp,
        userAgent: req.headers["user-agent"] || "unknown",
        provider,
      },
      () => {
        // The handler's promise used to float: any rejection became an `unhandledRejection`,
        // which `index.ts` answers by shutting the worker down. Keep it on the error path.
        Promise.resolve(authNodeHandler(req, res)).catch(next);
      },
    );
  },
] as RequestHandler[]);

// Root GET route
app.get("/", (req, res) => {
  res.json(createSuccessResponse({ status: "ok" }, "VeriWorkly API Server"));
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export { app };
