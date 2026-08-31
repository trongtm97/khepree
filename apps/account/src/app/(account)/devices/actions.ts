import { assertRecentAuth, isAuthError } from "@khepree/auth";
import { requireSession } from "@khepree/auth/session";
import { isLicensingError } from "@khepree/licensing";
import { redirect } from "next/navigation";
import { getPlatform } from "@/lib/commerce";

export async function removeDeviceAction(formData: FormData) {
  const session = await requireSession();
  const devicePublicId = String(formData.get("devicePublicId") ?? "");
  if (!devicePublicId) redirect("/devices");

  try {
    await assertRecentAuth();
  } catch (error) {
    if (isAuthError(error) && error.code === "RECENT_AUTH_REQUIRED") {
      redirect(`/sign-in?next=${encodeURIComponent("/devices")}&stepUp=1`);
    }
    throw error;
  }

  try {
    await getPlatform().licensing.removeDevice({
      principal: { type: "USER", id: session.user.id },
      devicePublicId,
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (isLicensingError(error) && error.code === "DEVICE_TRANSFER_COOLDOWN") {
      redirect("/devices?error=cooldown");
    }
    if (isLicensingError(error) && error.code === "DEVICE_TRANSFER_LIMIT_REACHED") {
      redirect("/devices?error=transfer-limit");
    }
    throw error;
  }
  redirect("/devices?removed=1");
}

/** @deprecated Use removeDeviceAction — kept for any stale forms during rollout. */
export const deactivateDeviceAction = removeDeviceAction;
