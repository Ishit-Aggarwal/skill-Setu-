/**
 * Test-runner shim: the app's modules import each other without a ".js"
 * extension (the bundler resolves that), so under plain Node a resolve hook
 * tries the extension when the bare path is not found. Wired in from the
 * "test" script in package.json; nothing in the app itself uses it.
 */
import { register } from "node:module";

register(new URL("./_resolve-hook.mjs", import.meta.url));
