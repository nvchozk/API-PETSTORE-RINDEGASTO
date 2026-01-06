import { defineConfig } from "@playwright/test";

const rawBaseURL = process.env.PETSTORE_BASE_URL ?? "https://petstore.swagger.io/v2";
const baseURL = rawBaseURL.endsWith("/") ? rawBaseURL : `${rawBaseURL}/`;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  use: {
    // Base URL del Swagger Petstore v2
    baseURL,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
});
