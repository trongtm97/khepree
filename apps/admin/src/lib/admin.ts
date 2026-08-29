import { getEnv } from "@khepree/config";
import { createIdentityDirectory } from "@khepree/auth";
import { createCatalogAdminService, createContentService, createDownloadService } from "@khepree/catalog";
import { createPartnerPlatform } from "@khepree/reseller";

export function adminAuthBaseUrl(): string {
  return getEnv().ADMIN_URL || "http://localhost:3002";
}

export function getPlatform() {
  return createPartnerPlatform();
}

export function getIdentityDirectory() {
  return createIdentityDirectory();
}

export function getCatalogAdmin() {
  return createCatalogAdminService();
}

export function getContentService() {
  return createContentService();
}

export function getDownloadService() {
  return createDownloadService();
}
