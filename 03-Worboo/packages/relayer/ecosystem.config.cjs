module.exports = {
  apps: [
    {
      name: 'worboo-relayer',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
