import {
  accountPublicUrl,
  accountSignInUrl,
  accountSignUpUrl,
  apiPublicUrl,
  appPublicUrl,
  downloadPublicUrl,
  listEcosystemFooterSurfaces,
  listEcosystemNavSurfaces,
  listEcosystemNetworkSurfaces,
  marketingPublicUrl,
  partnerPublicUrl,
  type ResolvedKhepreeSurface,
} from "@khepree/config";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

export {
  accountPublicUrl,
  accountSignInUrl,
  accountSignUpUrl,
  apiPublicUrl,
  appPublicUrl,
  downloadPublicUrl,
  marketingPublicUrl,
  partnerPublicUrl,
};

function marketingPathFor(locale: SupportedLocale) {
  return (path: string) => localePath(locale, path);
}

export function getEcosystemNavSurfaces(locale: SupportedLocale): ResolvedKhepreeSurface[] {
  return listEcosystemNavSurfaces({ locale, marketingPath: marketingPathFor(locale) });
}

export function getEcosystemFooterSurfaces(locale: SupportedLocale): ResolvedKhepreeSurface[] {
  return listEcosystemFooterSurfaces({ locale, marketingPath: marketingPathFor(locale) });
}

export function getEcosystemNetworkSurfaces(locale: SupportedLocale): ResolvedKhepreeSurface[] {
  return listEcosystemNetworkSurfaces({ locale, marketingPath: marketingPathFor(locale) });
}
