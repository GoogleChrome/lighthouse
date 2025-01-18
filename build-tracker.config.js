// https://buildtracker.dev/docs/installation/#upload-your-builds


module.exports = {
  applicationUrl: 'https://lh-build-tracker.herokuapp.com',
  artifacts: [
    'dist/lightrider/lighthouse-lr-bundle.js',
    'dist/extension/scripts/lighthouse-ext-bundle.js',
    'dist/lighthouse-dt-bundle.js',
    'dist/gh-pages/viewer/src/bundled.js',
    'dist/gh-pages/treemap/src/bundled.js',
    'dist/lightrider/report-generator-bundle.js',
    'dist/dt-report-resources/report.js',
    'dist/dt-report-resources/report-generator.js',
  ],
};
