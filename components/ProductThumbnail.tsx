"use client";

import { ReactNode, useEffect, useState } from "react";

const DEFAULT_PRODUCT_IMAGE = "/image/default.png";

function getApiOrigin() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  try {
    return new URL(baseUrl).origin;
  } catch {
    return "http://localhost:4000";
  }
}

function getSafeImageUrl(imageUrl: string | null | undefined) {
  if (typeof imageUrl !== "string") {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const normalizedValue = imageUrl.trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === "null") {
    return DEFAULT_PRODUCT_IMAGE;
  }

  // Handle API-served images (from uploads folder)
  if (normalizedValue.startsWith("/uploads/")) {
    return `${getApiOrigin()}${normalizedValue}`;
  }

  // Rewrite legacy absolute localhost image URL to active API host.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(normalizedValue)) {
    try {
      const parsed = new URL(normalizedValue);
      return `${getApiOrigin()}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return normalizedValue;
    }
  }

  return normalizedValue;
}

type ProductThumbnailProps = {
  src: string | null | undefined;
  alt: string;
  className: string;
  overlay?: ReactNode;
};

export function ProductThumbnail({ src, alt, className, overlay }: ProductThumbnailProps) {
  const [currentSrc, setCurrentSrc] = useState(getSafeImageUrl(src));

  useEffect(() => {
    setCurrentSrc(getSafeImageUrl(src));
  }, [src]);

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => {
          setCurrentSrc(DEFAULT_PRODUCT_IMAGE);
        }}
      />
      {overlay}
    </div>
  );
}