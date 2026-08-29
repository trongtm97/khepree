export * from "./identity";
export * from "./catalog";
export * from "./content";
export * from "./commerce";
export * from "./entitlement";
export * from "./partner";
export * from "./system";

import * as identity from "./identity";
import * as catalog from "./catalog";
import * as content from "./content";
import * as commerce from "./commerce";
import * as entitlement from "./entitlement";
import * as partner from "./partner";
import * as system from "./system";

export const schema = {
  ...identity,
  ...catalog,
  ...content,
  ...commerce,
  ...entitlement,
  ...partner,
  ...system,
};

/** Better Auth expects this export shape — do not duplicate auth tables elsewhere. */
export const authSchema = {
  user: identity.user,
  session: identity.session,
  account: identity.account,
  verification: identity.verification,
  twoFactor: identity.twoFactor,
};
