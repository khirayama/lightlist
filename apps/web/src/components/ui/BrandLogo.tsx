import clsx from "clsx";
import type { ImgHTMLAttributes } from "react";

type BrandLogoProps = ImgHTMLAttributes<HTMLImageElement>;

export function BrandLogo({
  className,
  alt = "",
  src = "/brand/logo.svg",
  ...props
}: BrandLogoProps) {
  return (
    <img src={src} alt={alt} className={clsx("block", className)} {...props} />
  );
}
