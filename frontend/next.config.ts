import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// NEXT_PUBLIC_API_URL is injected by .env.local or build environment.
// It is optional: if absent, we rely on local defaults for dev.
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Resolve connect-src origins at build/startup time.
// CSP connect-src governs fetch(), XHR, WebSocket — anything that
// the frontend uses to talk to the backend.
function resolveConnectSrc(): string {
  const origins = ["'self'"];

  if (isDev) {
    // In dev, Next.js reads .env.local so apiUrl is typically
    // http://127.0.0.1:8000, but the user might also hit
    // http://localhost:8000 (which is a different origin in CSP terms).
    origins.push("http://127.0.0.1:8000", "http://localhost:8000");
  }

  if (apiUrl) {
    // Extract origin only — CSP does not allow paths in connect-src.
    try {
      const origin = new URL(apiUrl).origin;
      if (!origins.includes(origin)) {
        origins.push(origin);
      }
    } catch {
      // If the url is malformed, silently ignore.
    }
  }

  return origins.join(" ");
}

const connectSrc = resolveConnectSrc();

const cspHeader = `
    default-src 'self';
    connect-src ${connectSrc};
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_PUBLIC_URL
    if (!backendUrl) return []
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ]
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\s{2,}/g, " ").trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
