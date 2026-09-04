/// <reference types="@cloudflare/workers-types" />

interface CloudflareBindings {
  ASSETS: Fetcher;
  AHP_BOT_PRIVATE_KEY: string;
}

declare namespace Cloudflare {
  interface Env extends CloudflareBindings {}
}

interface Env extends CloudflareBindings {}
