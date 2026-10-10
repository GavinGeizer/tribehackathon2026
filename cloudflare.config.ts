import { bindings, defineConfig } from 'cf/config';
export default defineConfig({
  worker: {
    name: 'permitpath',
    entrypoint: './server/index.ts',
    compatibilityDate: '2026-10-10',
    compatibilityFlags: ['nodejs_compat'],
    workersDev: true,
    assets: { notFoundHandling: 'single-page-application', runWorkerFirst: ['/api/*'] },
    bindings: { ASSETS: bindings.assets() },
    observability: { enabled: true, logs: { enabled: true }, traces: { enabled: true, headSamplingRate: 0.1 } },
  },
});
