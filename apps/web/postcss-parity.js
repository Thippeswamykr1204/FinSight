// The approved UI blended opacity utilities in sRGB. Preserve that color space
// rather than accepting a framework-default switch to perceptual Oklab mixing.
module.exports = () => ({
  postcssPlugin: "finsight-approved-color-space",
  OnceExit(root) {
    root.walkDecls((declaration) => {
      declaration.value = declaration.value.replace(
        /color-mix\(\s*in\s+oklab\s*,/g,
        "color-mix(in srgb,",
      );
    });
  },
});
module.exports.postcss = true;
