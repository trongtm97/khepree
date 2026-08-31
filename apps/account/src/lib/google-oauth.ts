import { authClient } from "@/lib/auth-client";

type GoogleOAuthResult = { error?: string };

/** Better Auth may return OAuth URL without auto-redirect — mirror Chapmee client handling. */
export async function startGoogleOAuth(options: {
  callbackURL: string;
  errorCallbackURL: string;
}): Promise<GoogleOAuthResult> {
  try {
    const { data, error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: options.callbackURL,
      newUserCallbackURL: options.callbackURL,
      errorCallbackURL: options.errorCallbackURL,
    });

    if (error) {
      return { error: error.message };
    }

    if (data?.url && data.redirect === false) {
      window.location.href = data.url;
      return {};
    }

    return {};
  } catch (caught) {
    return {
      error: caught instanceof Error ? caught.message : "Google sign-in failed",
    };
  }
}
