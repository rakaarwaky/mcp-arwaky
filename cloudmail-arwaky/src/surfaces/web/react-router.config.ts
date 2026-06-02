/**
 * @module react-router.config
 * @description Configuration for React Router (V7) web surface.
 * Sets the app directory, SSR status, and output build directory.
 */
import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: ".",
  ssr: true,
  buildDirectory: "web-dist",
} satisfies Config;