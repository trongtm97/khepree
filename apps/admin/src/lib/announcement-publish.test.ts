import assert from "node:assert/strict";
import { assertPublishConfirmation } from "./announcement-publish";

const formData = new FormData();
assert.throws(() => assertPublishConfirmation(formData), /CONFIRM/);
formData.set("confirm", "CONFIRM");
assert.doesNotThrow(() => assertPublishConfirmation(formData));

console.log("announcement-publish.test: ok");
