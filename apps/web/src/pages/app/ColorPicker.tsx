import clsx from "clsx";

type ColorPickerProps = {
  colors: readonly string[];
  selectedColor: string;
  onSelect: (color: string) => void;
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
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-pressed={selectedColor === color}
          aria-label={`${ariaLabelPrefix} ${color}`}
          onClick={() => onSelect(color)}
          className={clsx(
            "h-8 w-8 rounded-[10px] border border-gray-300 dark:border-gray-700",
            selectedColor === color
              ? "ring-2 ring-gray-900 ring-offset-2 ring-offset-white dark:ring-gray-50 dark:ring-offset-gray-900"
              : "",
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export default ColorPicker;
