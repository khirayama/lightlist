import { ParamsSheet } from "v2/components/primitives/ParamsSheet";
import qs from "query-string";

export function UserSheet() {
  const isSheetOpen = () => {
    return qs.parse(window.location.search).sheet === "user";
  };

  return (
    <ParamsSheet isSheetOpen={isSheetOpen} title={"Log In"}>
      <h1>User Sheet</h1>
    </ParamsSheet>
  );
}
