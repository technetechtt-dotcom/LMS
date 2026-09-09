import type { Plugin } from 'vite';

export function buildVersionPlugin(): Plugin {
  const revision =
    process.env.VITE_APP_VERSION?.trim() ||
    process.env.GIT_SHA?.trim() ||
    process.env.RENDER_GIT_COMMIT?.trim() ||
    'development';
  return {
    name: 'build-version',
    config: () => ({ define: { __APP_VERSION__: JSON.stringify(revision) } }),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ revision }),
      });
    },
  };
}
