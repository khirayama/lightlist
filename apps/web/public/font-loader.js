(() => {
  document
    .querySelectorAll('link[rel="preload"][as="style"][data-font-stylesheet]')
    .forEach((link) => {
      link.setAttribute("rel", "stylesheet");
    });
})();
