"use client";

import { ReactNode, useEffect, useState } from "react";

const DEFAULT_PRODUCT_IMAGE = "/image/default.png";

function getSafeImageUrl(imageUrl: string | null | undefined) {
  if (typeof imageUrl !== "string") {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const normalizedValue = imageUrl.trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === "null") {
    return DEFAULT_PRODUCT_IMAGE;
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