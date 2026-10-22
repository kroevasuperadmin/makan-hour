const app = require('./app.json');

// MAKAN_OPEN_DEMO is the only switch. Expo inlines EXPO_PUBLIC_* into the
// client bundle and ignores other names, so this copies that one value across
// before Metro reads it. Setting the public name on its own does not stick.
const open = process.env.MAKAN_OPEN_DEMO === 'on';
process.env.EXPO_PUBLIC_MAKAN_OPEN_DEMO = open ? 'on' : 'off';

module.exports = () => ({
  expo: {
    ...app.expo,
    extra: {
      ...(app.expo.extra || {}),
      makanOpenDemo: open,
    },
  },
});
