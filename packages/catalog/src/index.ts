export {
  ContentService,
  createContentService,
  bodyObjectKeyFor,
  nextContentVersionNumber,
  sha256Hex,
  type ContentStatus,
} from "./content/service";
export {
  renderContentMarkdown,
  expandProductBlocks,
  type ProductCtaBlock,
} from "./content/markdown";
export {
  contentToEditorHtml,
  isLikelyHtmlContent,
  normalizeContentHeadings,
  renderContentBody,
  serializeEditorHtml,
} from "./content/body-html";
export {
  countHeadings,
  countInternalLinks,
  countWords,
  estimateReadingMinutes,
  getContentSeoIssues,
  getContentSeoScore,
  warnSeoDescriptionLength,
  warnSeoTitleLength,
  type ContentSeoCheckInput,
  type ContentSeoIssue,
} from "./content/seo-validation";
export { sanitizeContentHtml, escapeHtml, stripUnsafeMarkdownSource } from "./content/sanitize";
export {
  createContentPreviewToken,
  verifyContentPreviewToken,
  contentPreviewUrl,
} from "./content/preview-token";
export { suggestContentSlug } from "./content/slug";
export { isSafeRedirectPath, normalizeRedirectPath } from "./content/redirect-path";
export {
  buildContentRevalidationPlan,
  contentRevalidationPaths,
  contentRevalidationTags,
  type ContentRevalidationPlan,
} from "./content/revalidation";
export type {
  ContentType,
  ContentVersionRecord,
  CreateDraftInput,
  CreateDraftVersionInput,
  PublishedContent,
  UpdateContentInput,
} from "./content/types";

export { MediaService, createMediaService, type MediaVisibility } from "./media/service";
export type {
  CompleteMediaUploadInput,
  MediaRecord,
  PrepareMediaUploadInput,
  PrepareMediaUploadResult,
} from "./content/types";

export {
  DownloadService,
  createDownloadService,
  defaultDownloadAccessPolicy,
  DESKTOP_RELEASE_DOWNLOAD_TTL_SECONDS,
  isReleaseMediaContext,
  type DownloadAccessPolicy,
  type DownloadAuthorizationContext,
  productIdFromMediaContext,
} from "./download/service";
export { MemoryDownloadTicketStore, type DownloadTicketStore } from "./download/ticket-store";

export {
  AnnouncementService,
  createAnnouncementService,
} from "./announcement/service";
export {
  sanitizeAnnouncementBody,
  renderAnnouncementBodyHtml,
} from "./announcement/body";
export {
  buildAnnouncementTargetingSummary,
  formatUtcDateTimeLocal,
  parseAnnouncementDraftForm,
  parseUtcDateTimeLocal,
} from "./announcement/admin-form";
export {
  isAllowedAnnouncementUrl,
  validateAnnouncementCta,
  SOFTWARE_UPDATE_ACTIONS,
} from "./announcement/cta-policy";
export type {
  SoftwareUpdateAction,
  SoftwareUpdateCtaPayload,
} from "./announcement/cta-policy";
export {
  assertValidAnnouncementSchedule,
  assertValidAppVersionRange,
  matchesAnnouncementTargeting,
  matchesAppVersionRange,
} from "./announcement/targeting";
export {
  hasDefaultLocaleTranslation,
  resolveAnnouncementCopy,
} from "./announcement/locale";
export type { DesktopAnnouncementQuery } from "./announcement/targeting";
export {
  clampAnnouncementLimit,
  decodeAnnouncementCursor,
  encodeAnnouncementCursor,
  paginateAnnouncements,
} from "./announcement/pagination";
export type {
  AdminAnnouncementListItem,
  AnnouncementRecord,
  AnnouncementTranslationInput,
  CreateAnnouncementDraftInput,
  DesktopAnnouncementView,
  DesktopAnnouncementsPage,
  ListAdminAnnouncementsQuery,
  ListDesktopAnnouncementsQuery,
  UpdateAnnouncementDraftInput,
} from "./announcement/types";
export {
  buildReleaseWhatsNewDraftInput,
} from "./announcement/release-notify";
export type {
  PublishWhatsNewForReleaseResult,
  ReleaseNotifySource,
} from "./announcement/release-notify";

export {
  ReleaseService,
  createReleaseService,
  releasePlatformLabel,
} from "./release/service";
export {
  compareReleaseVersions,
  isReleaseVersionNewer,
  matchesReleaseChannelPolicy,
  meetsMinimumVersion,
  parseReleaseVersion,
  pickLatestCompatibleRelease,
  pickLatestPublishedRelease,
  versionCeilingBelow,
} from "./release/version";
export type { LatestReleaseCandidate } from "./release/version";
export {
  assertPublishableArtifacts,
  hasRequiredArtifacts,
  mediaContextMatchesRelease,
  requiredArtifactKinds,
  WINDOWS_SQUIRREL_REQUIRED_KINDS,
} from "./release/artifact-policy";
export { resolveReleaseNotes, sortPublicChangelog } from "./release/public-changelog";
export { serializeDesktopLatestUpdate, type DesktopLatestUpdatePayload } from "./release/desktop-update";
export {
  SquirrelFeedService,
  createSquirrelFeedService,
  type SquirrelFeedBuildInput,
  type SquirrelFeedBuildResult,
} from "./release/squirrel-feed-service";
export {
  buildSquirrelReleasesFile,
  filterSquirrelEntriesToKnownArtifacts,
  formatSquirrelReleaseEntry,
  parseSquirrelReleasesFile,
  rewriteSquirrelReleaseEntryUrl,
  sanitizeSquirrelNupkgFilename,
  type SquirrelReleaseEntry,
} from "./release/squirrel-releases";
export {
  mintSquirrelTicket,
  squirrelTicketLogRef,
  verifySquirrelTicket,
  type SquirrelTicketKind,
  type SquirrelTicketPayload,
} from "./release/squirrel-ticket";
export { assertPublishableReleaseNotes } from "./release/release-notes-policy";
export { sha256HexOfBytes, verifyStoredObjectSha256 } from "./release/artifact-verify";
export {
  assessReleasePublishReadiness,
  verifyReleaseArtifact,
} from "./release/publish-gate";
export {
  buildUpdateArtifactManifest,
  canonicalizeUpdateArtifactManifest,
  verifyUpdateArtifactManifestSignature,
  type UpdateArtifactManifest,
} from "./release/update-signing";
export type {
  AddReleaseArtifactInput,
  ArtifactVerificationResult,
  ArtifactVerificationState,
  CreateReleaseDraftInput,
  LatestReleaseQuery,
  PrepareReleaseUploadInput,
  PublicChangelogEntry,
  ReleaseArtifactRecord,
  ReleasePublishReadiness,
  ReleaseRecord,
} from "./release/types";

export {
  ProductService,
  createProductService,
} from "./product/service";
export {
  CatalogAdminService,
  CatalogError,
  createCatalogAdminService,
  isCatalogError,
  rejectIfReferenced,
} from "./product/admin";
export {
  buildProductRevalidationPlan,
  productRevalidationPaths,
  productRevalidationTags,
  type ProductRevalidationPlan,
} from "./product/revalidation";
export {
  PlanFeatureSet,
  mapPlanFeatureRow,
  type PlanFeatureEntry,
} from "./product/features";
export {
  formatPriceAmount,
  formatBillingInterval,
  minorToMajor,
  resolvePricingDisplayMode,
  selectDisplayPrice,
  currencyMinorUnits,
} from "./product/pricing";
export { defaultMarket, isPriceAllowedForMarket, type MarketContext } from "./product/market";
export {
  parseProductMarketingMetadata,
  parseOperatingSystems,
  KNOWN_OPERATING_SYSTEMS,
} from "./product/metadata";
export {
  composeMarketingToMarkdown,
  migrateLegacyDescriptionCopy,
  readMarketingMetadata,
  resolvePublicFullDescription,
} from "./product/compose-legacy-description";
export { resolvePublicSeoFields } from "./product/public-display";
export {
  PRODUCT_IMAGE_SPECS,
  productImageCropNoticeVi,
  productImageNeedsCropNotice,
  productImageSpec,
  productImageTargetAspect,
  computeCentreCoverCrop,
  type ProductImageSlot,
  type ProductImageSpec,
} from "./product/image-specs";
export { processProductImageUpload } from "./product/process-product-image";
export {
  RASTER_ACCEPTED_MIME_TYPES,
  RASTER_MAX_INPUT_BYTES,
  isRasterImageMime,
  processRasterToWebp,
  processRasterToWebpCropped,
  type ProcessedRasterImage,
  type RasterCropSpec,
} from "./media/process-raster-image";
export {
  deriveDesktopCallbackUri,
  deriveTechnicalIdentity,
  parseAccessFeatureKey,
  parseDesktopProtocol,
  parseProductCode,
  suggestAccessFeatureKey,
  suggestDesktopClientId,
  suggestDesktopProtocol,
  suggestInternalPlanCode,
  suggestProductCode,
  validateCallbackUri,
  validateDesktopClientId,
  validateDesktopProtocol,
  validateProductCode,
} from "./product/technical-identity";
export type {
  LicensingMode,
  PlanBillingType,
  PricingDisplayMode,
  PricingProductGroup,
  ProductMarketingMetadata,
  ProductStatus,
  PublicPlan,
  PublicPlanFeature,
  PublicPrice,
  PublicProductDetail,
  PublicProductMedia,
  PublicProductSummary,
  PublicStartingPrice,
  PurchasableOffer,
} from "./product/types";
export { isPurchasableBillingType } from "./product/types";
export {
  ProductStudioService,
  computeProductReadiness,
  createProductStudioService,
} from "./product/studio/service";
export { suggestProductSlug } from "./product/slug";
export {
  ACCESS_TERM_PRESETS,
  PRODUCT_CATEGORIES,
  PRODUCT_DESCRIPTION_TEMPLATE,
  PRODUCT_TYPES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_TYPE_LABELS,
  STUDIO_FEATURE_KEYS,
  deriveSeoFields,
  detectAccessTermKind,
  mergeFullDescription,
  parseCoverMediaPublicId,
  parseProductCategory,
  parseProductType,
  parseRecommendedPlanPublicId,
  productTypeNeedsRelease,
  productTypeToLicensingMode,
  productTypeToPlatforms,
  resolveAccessTerm,
  suggestPlanSlug,
  type AccessTermKind,
  type DerivedSeoFields,
  type ProductCategory,
  type ProductType,
} from "./product/studio-field-policy";
export { createProductPreviewToken, verifyProductPreviewToken } from "./product/preview-token";
export type {
  ProductStudioSnapshot,
  ReadinessResult,
  ReadinessItem,
  SaveStudioDraftInput,
  SaveStudioDraftResult,
  StudioListRow,
  StudioPlan,
} from "./product/studio/types";
