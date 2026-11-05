import Image from "next/image";
import Link from "next/link";
import { IMAGE_QUALITY } from "@/lib/image-defaults";

type Props = {
  className?: string;
  priority?: boolean;
  link?: boolean;
};

/** Logo header — dimensions fixes pour éviter le CLS ; Next sert WebP/AVIF. */
export default function BrandLogo({
  className = "h-10 w-auto object-contain xl:h-11",
  priority = false,
  link = true,
}: Props) {
  const img = (
    <Image
      src="/home/IAtv-logo.png"
      alt="L'Intelligent TV"
      width={220}
      height={48}
      quality={priority ? IMAGE_QUALITY : 72}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
    />
  );

  if (!link) return img;

  return (
    <Link href="/" className="flex shrink-0 items-center">
      {img}
    </Link>
  );
}
