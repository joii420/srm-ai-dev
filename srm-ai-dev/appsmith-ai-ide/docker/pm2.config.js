module.exports = {
  apps: [
    {
      name: 'ai-proxy',
      script: 'dist/ai-proxy/server.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        AI_PROXY_PORT: '3000',
      },
    },
    {
      name: 'file-manager',
      script: 'dist/file-manager/server.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        FILE_MANAGER_PORT: '3001',
        WORKSPACE_DIR: '/workspace',
      },
    },
  ],
};
