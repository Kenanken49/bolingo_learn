const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Offline classics shelf: bundled .txt ebooks + .mp3 chapters (lib/classicsAudiobooks.ts).
for (const ext of ['txt', 'mp3']) {
  if (!config.resolver.assetExts.includes(ext)) config.resolver.assetExts.push(ext);
}

module.exports = withNativeWind(config, { input: './global.css' });
