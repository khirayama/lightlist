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
              "flex h-8 w-8 items-center justify-center rounded-[10px] border border-border text-[10px] font-semibold text-muted dark:border-border-dark dark:text-muted-dark",
              isSelected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-surface dark:ring-primary-dark dark:ring-offset-surface-dark"
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
