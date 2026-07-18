module.exports = {
  apps: [
    {
      name: 'menu-pictures',
      cwd: __dirname,
      script: 'server/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      }
    }
  ]
};
