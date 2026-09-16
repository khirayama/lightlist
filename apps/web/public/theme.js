(() => {
  try {
    const theme = localStorage.getItem("lightlist.theme");
    const isDark =
      theme === "dark" ||
      (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch {}
})();
