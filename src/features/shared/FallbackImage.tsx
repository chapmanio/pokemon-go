import { useState } from "react";

interface FallbackImageProps {
  alt: string;
  className: string;
  fallbackClassName?: string;
  src?: string;
  loading?: "eager" | "lazy";
}

export default function FallbackImage({ alt, className, fallbackClassName = `${className}--empty`, src, loading = "lazy" }: FallbackImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`${className} ${fallbackClassName}`} role="img" aria-label={`${alt || "Image"} unavailable`}>?</div>;
  return <img className={className} src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />;
}
