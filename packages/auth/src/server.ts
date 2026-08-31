import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { getEnv } from "@khepree/config";
import { authSchema, requireDb } from "@khepree/db";
import { isGoogleAuthConfigured } from "./google";
import { recordAuthAudit } from "./audit";
import {
  getAuthBaseUrl,
  getTrustedOrigins,
  resetPasswordEmailContent,
  sendAuthEmail,
  verificationEmailContent,
} from "./email";
import { ensureUserProfile } from "./profile";

const env = getEnv();

const secret =
  env.BETTER_AUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : "dev-only-secret-min-32-characters-long");

export function createAuth(baseURL = getAuthBaseUrl()) {
  const db = requireDb();

  return betterAuth({
    baseURL,
    secret,
    trustedOrigins: getTrustedOrigins(),
    session: {
      expiresIn: 60 * 60 * 24 * 90,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: process.env.NODE_ENV === "production",
      autoSignIn: true,
      onPasswordReset: async ({ user }) => {
        await recordAuthAudit({
          actorUserId: user.id,
          action: "auth.password_change",
          resourceType: "user",
          resourceId: user.id,
        });
      },
      sendResetPassword: async ({ user, url }) => {
        const content = resetPasswordEmailContent(url, user.name);
        await sendAuthEmail({ to: user.email, ...content });
        await recordAuthAudit({
          actorUserId: user.id,
          action: "auth.password_reset_request",
          metadata: { email: user.email },
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        const content = verificationEmailContent(url, user.name);
        await sendAuthEmail({ to: user.email, ...content });
      },
    },
    ...(isGoogleAuthConfigured(env)
      ? {
          socialProviders: {
            google: {
              clientId: env.GOOGLE_CLIENT_ID!,
              clientSecret: env.GOOGLE_CLIENT_SECRET!,
            },
          },
          account: {
            accountLinking: {
              enabled: true,
              trustedProviders: ["google"],
            },
          },
        }
      : {}),
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ newEmail, url }) => {
          await sendAuthEmail({
            to: newEmail,
            subject: "Confirm your new Khepree email",
            text: `Confirm your new email address:\n${url}`,
            html: `<p>Confirm your new email address:</p><p><a href="${url}">${url}</a></p>`,
          });
        },
      },
    },
    plugins: [
      twoFactor({
        otpOptions: {
          sendOTP: async ({ user, otp }) => {
            await sendAuthEmail({
              to: user.email,
              subject: "Your Khepree verification code",
              text: `Your verification code is: ${otp}`,
              html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
            });
          },
        },
      }),
      nextCookies(),
    ],
    databaseHooks: {
      user: {
        update: {
          after: async (user) => {
            if (!user?.id) return;
            await recordAuthAudit({
              actorUserId: user.id,
              action: "auth.profile_update",
              resourceType: "user",
              resourceId: user.id,
            });
          },
        },
        create: {
          after: async (createdUser) => {
            if (!createdUser?.id) return;
            await ensureUserProfile(db, {
              userId: createdUser.id,
              name: createdUser.name,
            });
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            if (!session?.userId) return;
            await recordAuthAudit({
              actorUserId: session.userId,
              action: "auth.sign_in",
              resourceType: "session",
              resourceId: session.id,
            });
          },
        },
        delete: {
          after: async (session) => {
            if (!session?.userId) return;
            await recordAuthAudit({
              actorUserId: session.userId,
              action: "auth.session_revoke",
              resourceType: "session",
              resourceId: session.id,
            });
          },
        },
      },
    },
  });
}

const authByBase = new Map<string, ReturnType<typeof createAuth>>();

export function getAuth(baseURL?: string) {
  const key = baseURL ?? getAuthBaseUrl();
  let instance = authByBase.get(key);
  if (!instance) {
    instance = createAuth(key);
    authByBase.set(key, instance);
  }
  return instance;
}

export type Auth = ReturnType<typeof createAuth>;
