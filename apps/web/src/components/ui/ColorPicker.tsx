import clsx from "clsx";

export type ColorOption = {
  value: string | null;
  label?: string;
  shortLabel?: string;
  preview?: string;
};

type ColorPickerProps = {
  colors: readonly ColorOption[];
  selectedColor: string | null;
  onSelect: (color: string | null) => void;
  ariaLabelPrefix: string;
};

export function ColorPicker({
  colors,
  selectedColor,
  onSelect,
  ariaLabelPrefix,
}: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const isSelected = selectedColor === color.value;
        const ariaLabel =
          color.label ?? `${ariaLabelPrefix} ${color.value ?? ""}`.trim();
        const previewColor =
          color.preview ?? color.value ?? "var(--tasklist-theme-bg)";

        return (
          <button
            key={color.value ?? "none"}
            type="button"
            aria-pressed={isSelected}
            aria-label={ariaLabel}
            title={color.label}
            onClick={() => onSelect(color.value)}
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-[10px] border border-gray-300 text-[10px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300",
              isSelected
                ? "ring-2 ring-gray-900 ring-offset-2 ring-offset-white dark:ring-gray-50 dark:ring-offset-gray-900"
                : "",
            )}
            style={{ backgroundColor: previewColor }}
          >
            {color.shortLabel ?? ""}
          </button>
        );
      })}
    </div>
  );
}

export default ColorPicker;
