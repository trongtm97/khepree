"use strict";
// ponytail: outbox worker never processes images; esbuild cannot bundle sharp (native + import.meta.url).
function sharp() {
  throw new Error("sharp is not available in the outbox worker bundle");
}
module.exports = sharp;
module.exports.default = sharp;
