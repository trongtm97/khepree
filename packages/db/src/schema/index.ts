export * from "./identity";
export * from "./catalog";
export * from "./content";
export * from "./release";
export * from "./commerce";
export * from "./entitlement";
export * from "./partner";
export * from "./system";
export * from "./outbox";

import * as identity from "./identity";
import * as catalog from "./catalog";
import * as content from "./content";
import * as release from "./release";
import * as commerce from "./commerce";
import * as entitlement from "./entitlement";
import * as partner from "./partner";
import * as system from "./system";
import * as outbox from "./outbox";

export const schema = {
  ...identity,
  ...catalog,
  ...content,
  ...release,
  ...commerce,
  ...entitlement,
  ...partner,
  ...system,
  ...outbox,
};

/** Better Auth expects this export shape — do not duplicate auth tables elsewhere. */
export const authSchema = {
  user: identity.user,
  session: identity.session,
  account: identity.account,
  verification: identity.verification,
  twoFactor: identity.twoFactor,
};
