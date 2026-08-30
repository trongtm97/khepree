type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  pathname: string;
};

function readPublicMediaBaseUrl(): string | undefined {
  const base = process.env.S3_PUBLIC_BASE_URL?.trim();
  return base || undefined;
}

function publicMediaRemotePattern(): RemotePattern | undefined {
  const base = readPublicMediaBaseUrl();
  if (!base) return undefined;

  try {
    const parsed = new URL(base);
    return {
      protocol: parsed.protocol === "http:" ? "http" : "https",
      hostname: parsed.hostname,
      pathname: "/**",
    };
  } catch {
    return undefined;
  }
}

/** Allow `next/image` to load public CDN media — hostname from env, never hard-coded. */
export function withPublicMediaImages<T extends Record<string, unknown>>(config: T): T {
  const pattern = publicMediaRemotePattern();
  if (!pattern) return config;

  const images = (config.images as { remotePatterns?: RemotePattern[] } | undefined) ?? {};

  return {
    ...config,
    images: {
      ...images,
      remotePatterns: [...(images.remotePatterns ?? []), pattern],
    },
  };
}
