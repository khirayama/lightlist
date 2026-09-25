(() => {
  const root = document.documentElement;
  try {
    const theme = localStorage.getItem("lightlist.theme");
    const isDark =
      theme === "dark" ||
      (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) root.classList.add("dark");
    if (theme === "light" || theme === "dark") {
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((meta) =>
          meta.setAttribute("content", isDark ? "#030712" : "#ffffff"),
        );
    }
  } catch {}
  try {
    const value = (
      new URLSearchParams(location.search).get("lang") ||
      localStorage.getItem("i18nextLng") ||
      navigator.language ||
      ""
    ).toLowerCase();
    const prefixes = ["ja", "en", "es", "de", "fr", "ko", "hi", "ar"];
    const language =
      prefixes.find((prefix) => value.startsWith(prefix)) ||
      (value === "zh" || /^zh-(cn|hans|sg)/.test(value) ? "zh-CN" : "") ||
      (value === "pt" || value.startsWith("pt-") ? "pt-BR" : "") ||
      (value === "id" || value === "in" || value.startsWith("id-")
        ? "id"
        : "ja");
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
  } catch {}
})();
