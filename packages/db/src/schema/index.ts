export * from "./identity";
export * from "./catalog";
export * from "./content";
export * from "./release";
export * from "./commerce";
export * from "./entitlement";
export * from "./desktop";
export * from "./partner";
export * from "./system";
export * from "./outbox";
export * from "./announcement";

import * as identity from "./identity";
import * as catalog from "./catalog";
import * as content from "./content";
import * as release from "./release";
import * as commerce from "./commerce";
import * as entitlement from "./entitlement";
import * as desktop from "./desktop";
import * as partner from "./partner";
import * as system from "./system";
import * as outbox from "./outbox";
import * as announcement from "./announcement";

export const schema = {
  ...identity,
  ...catalog,
  ...content,
  ...release,
  ...commerce,
  ...entitlement,
  ...desktop,
  ...partner,
  ...system,
  ...outbox,
  ...announcement,
};

/** Better Auth expects this export shape — do not duplicate auth tables elsewhere. */
export const authSchema = {
  user: identity.user,
  session: identity.session,
  account: identity.account,
  verification: identity.verification,
  twoFactor: identity.twoFactor,
};
