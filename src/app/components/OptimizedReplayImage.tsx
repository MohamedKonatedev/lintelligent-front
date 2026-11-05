import Image from "next/image";
import { IMAGE_QUALITY, REPLAY_THUMB_SIZES } from "@/lib/image-defaults";

type Props = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export default function OptimizedReplayImage({
  src,
  alt,
  className = "object-cover",
  sizes = REPLAY_THUMB_SIZES,
  priority = false,
}: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={IMAGE_QUALITY}
      className={className}
      priority={priority}
      loading={priority ? undefined : "lazy"}
    />
  );
}
