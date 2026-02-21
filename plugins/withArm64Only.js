const { withGradleProperties } = require("expo/config-plugins");

module.exports = function withArm64Only(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const archIndex = props.findIndex(
      (item) => item.type === "property" && item.key === "reactNativeArchitectures"
    );
    if (archIndex !== -1) {
      props[archIndex].value = "arm64-v8a";
    } else {
      props.push({
        type: "property",
        key: "reactNativeArchitectures",
        value: "arm64-v8a",
      });
    }
    return config;
  });
};
