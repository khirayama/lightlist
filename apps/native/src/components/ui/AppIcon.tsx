import Svg, { Path, type SvgProps } from "react-native-svg";
import { ICON_PATHS, type AppIconName } from "@lightlist/sdk/icons";
import { cssInterop } from "nativewind";

type AppIconProps = SvgProps & {
  name: AppIconName;
  size?: number;
  color?: string;
  className?: string;
};

cssInterop(Svg, {
  className: {
    target: "style",
    nativeStyleToProp: {
      fill: true,
      stroke: true,
    },
  },
});

export const AppIcon = ({
  name,
  size = 24,
  color = "currentColor",
  className,
  ...props
}: AppIconProps) => {
  const paths = ICON_PATHS[name];
  const isArray = Array.isArray(paths);

  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      className={className}
      {...props}
    >
      {isArray ? (
        (paths as string[]).map((p, i) => <Path key={i} d={p} />)
      ) : (
        <Path d={paths as string} />
      )}
    </Svg>
  );
};
