import type { SVGProps } from "react";
import { ICON_PATHS, type AppIconName } from "@lightlist/sdk/icons";

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
        ...props.style,
      }}
    >
      {name === "logo" ? (
        <g transform="scale(0.046875)">
          {" "}
          {/* 24/512 = 0.046875 */}
          <path d={(paths as string[])[0]} />
          <path d={(paths as string[])[1]} fill="white" />
        </g>
      ) : isArray ? (
        (paths as string[]).map((p, i) => <path key={i} d={p} />)
      ) : (
        <path d={paths as string} />
      )}
    </svg>
  );
};
