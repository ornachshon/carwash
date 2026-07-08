const appJson = require('./app.json');

const PLACEHOLDER_KEY = 'PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE';

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || PLACEHOLDER_KEY;

  return {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      config: {
        ...appJson.expo.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
