import { ParamsSheet } from "v2/components/primitives/ParamsSheet";
import qs from "query-string";

export function PreferencesSheet() {
  const isSheetOpen = () => {
    return qs.parse(window.location.search).sheet === "preferences";
  };

  return (
    <ParamsSheet isSheetOpen={isSheetOpen} title={"Preferences"}>
      <h1>Preferences Sheet</h1>
    </ParamsSheet>
  );
}
