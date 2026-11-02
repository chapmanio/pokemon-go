import { useState } from "react";

interface PokemonImageProps {
  alt: string;
  className: string;
  src?: string;
}

export default function PokemonImage({ alt, className, src }: PokemonImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className={`${className} ${className}--empty`} aria-label={`${alt} image unavailable`} aria-hidden="true">?</div>;
  }

  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
