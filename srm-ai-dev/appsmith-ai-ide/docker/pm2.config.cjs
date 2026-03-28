module.exports = {
  apps: [
    {
      name: 'container-services',
      script: 'dist/server.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        AI_PROXY_PORT: '3000',
        FILE_MANAGER_PORT: '3001',
        WORKSPACE_DIR: '/workspace',
      },
    },
  ],
};
