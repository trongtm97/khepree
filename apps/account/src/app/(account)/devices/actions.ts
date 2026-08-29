import { requireSession } from "@khepree/auth/session";
import { isLicensingError } from "@khepree/licensing";
import { redirect } from "next/navigation";
import { getPlatform } from "@/lib/commerce";

export async function deactivateDeviceAction(formData: FormData) {
  const session = await requireSession();
  const devicePublicId = String(formData.get("devicePublicId") ?? "");
  if (!devicePublicId) redirect("/devices");

  try {
    await getPlatform().licensing.deactivate({
      principal: { type: "USER", id: session.user.id },
      devicePublicId,
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (isLicensingError(error) && error.code === "DEVICE_COOLDOWN") {
      redirect("/devices?error=cooldown");
    }
    throw error;
  }
  redirect("/devices");
}
