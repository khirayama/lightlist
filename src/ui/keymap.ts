/* Meta-, Ctrl-, Shift-, Alt- */

type KeymapHandlersOptions = {
  platformDetection?: () => string;
  customModKeymap?: {
    [platform: string]: {
      [key: string]: string;
    };
  };
};

function getKeymapPatternFromEvent(
  event: KeyboardEvent,
  options: KeymapHandlersOptions,
) {
  const platform = options.platformDetection();

  const key = event.key;
  const meta = event.metaKey;
  const shift = event.shiftKey;
  const ctrl = event.ctrlKey;
  const alt = event.altKey;

  let keymapPattern = "";
  if (key !== "Meta" && key !== "Control" && key !== "Shift" && key !== "Alt") {
    if (meta) {
      keymapPattern +=
        (options.customModKeymap[platform]?.Meta || "Meta") + "-";
    }
    if (ctrl) {
      keymapPattern +=
        (options.customModKeymap[platform]?.Ctrl || "Ctrl") + "-";
    }
    if (shift) {
      keymapPattern +=
        (options.customModKeymap[platform]?.Shift || "Shift") + "-";
    }
    if (alt) {
      keymapPattern += (options.customModKeymap[platform]?.Alt || "Alt") + "-";
    }
  }
  keymapPattern += options.customModKeymap[platform]?.[key] || key;
  return keymapPattern;
}

function getKeymapHander(options: KeymapHandlersOptions) {
  return (
    keymap: string,
    event: KeyboardEvent,
    handler: Function,
    additionalCondition: Function = () => true,
  ) => {
    const keymapPattern = getKeymapPatternFromEvent(event, options);
    const isComposing = event.isComposing;
    if (!isComposing && keymapPattern === keymap && additionalCondition()) {
      handler();
    }
  };
}

export const kmh = getKeymapHander({
  platformDetection: () => "default",
  customModKeymap: {
    mac: {
      Meta: "Mod",
      Backspace: "Delete",
    },
    win: {
      Ctrl: "Mod",
      Backspace: "Delete",
    },
    default: {
      Meta: "Mod",
      Backspace: "Delete",
    },
  },
});
