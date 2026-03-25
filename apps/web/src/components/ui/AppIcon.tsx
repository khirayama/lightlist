import type { SVGProps } from "react";
import { ICON_PATHS, type AppIconName } from "@/lib/icons";

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: AppIconName;
  size?: string | number;
  color?: string;
};

export const AppIcon = ({
  name,
  size = 24,
  color = "currentColor",
  ...props
}: AppIconProps) => {
  const paths = ICON_PATHS[name];
  const isArray = Array.isArray(paths);
  const isRtl =
    typeof document !== "undefined" &&
    document.documentElement.dir.toLowerCase() === "rtl";
  const shouldMirrorArrow = name === "arrow-back" && isRtl;
  const style = props.style as SVGProps<SVGSVGElement>["style"];

  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      width={size}
      height={size}
      {...props}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        ...(shouldMirrorArrow ? { transform: "scaleX(-1)" } : {}),
        ...style,
      }}
    >
      {isArray ? (
        (paths as string[]).map((p, i) => <path key={i} d={p} />)
      ) : (
        <path d={paths as string} />
      )}
    </svg>
  );
};
