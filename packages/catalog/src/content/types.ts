export type ContentType = "page" | "article" | "doc" | "product_page" | "legal";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type MediaVisibility = "public" | "private";

export interface CreateDraftInput {
  slug: string;
  contentType: ContentType;
  locale: string;
  title: string;
  excerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  body?: string | null;
}

export interface UpdateContentInput {
  versionId: string;
  title?: string;
  excerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  body?: string | null;
}

export interface ContentVersionRecord {
  id: string;
  entryId: string;
  entryPublicId: string;
  slug: string;
  contentType: ContentType;
  locale: string;
  versionNumber: number;
  title: string;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bodyStorageProvider: string | null;
  bodyStorageBucket: string | null;
  bodyObjectKey: string | null;
  status: ContentStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishedContent {
  entryPublicId: string;
  slug: string;
  contentType: ContentType;
  locale: string;
  versionNumber: number;
  title: string;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bodyObjectKey: string | null;
  publishedAt: Date | null;
}

export interface MediaRecord {
  id: string;
  publicId: string;
  storageProvider: string;
  bucket: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string | null;
  width: number | null;
  height: number | null;
  visibility: MediaVisibility;
  altText: string | null;
  ownerType: string | null;
  ownerId: string | null;
  context: string | null;
  publicUrl: string | null;
  createdAt: Date;
}

export interface PrepareMediaUploadInput {
  mimeType: string;
  sizeBytes: number;
  visibility: MediaVisibility;
  namespace: string;
  context?: string | null;
  altText?: string | null;
  ownerType?: string | null;
  ownerId?: string | null;
}

export interface PrepareMediaUploadResult {
  objectKey: string;
  bucket: MediaVisibility;
  upload: {
    url: string;
    expiresAt: Date;
    headers: Record<string, string>;
  };
}

export interface CompleteMediaUploadInput {
  objectKey: string;
  bucket: MediaVisibility;
  mimeType: string;
  expectedSizeBytes: number;
  altText?: string | null;
  context?: string | null;
  ownerType?: string | null;
  ownerId?: string | null;
  width?: number | null;
  height?: number | null;
  checksumSha256?: string | null;
}
