const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.extraNodeModules = {
  lib: path.resolve(__dirname, '../../packages/lib/src'),
};

module.exports = withNativeWind(config, { input: './src/global.css' });
