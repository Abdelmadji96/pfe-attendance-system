/** PM2 config for production VPS — run from repo root: pm2 start apps/api/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "pfe-api",
      cwd: __dirname,
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
