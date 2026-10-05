import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { validateEnvironment } = require("../dist/config.cjs");
validateEnvironment();
require("../server.js");
