# Introduction
- vite plugin for long term cache in static files

# Usage
```
// use npm
npm i vite-plugin-long-term-cache-import-map -D
// use yarn
yarn add vite-plugin-long-term-cache-import-map -D
// use pnpm
pnpm i vite-plugin-long-term-cache-import-map -D

```
Then you can use it in vite.config.ts:

```
// vite.config.ts example
import { defineConfig } from "vite"
import Vue from "@vitejs/plugin-vue"
import Inspect from 'vite-plugin-inspect'
import {
    importMapGeneratorPlugin,
    importMapPatcherPlugin,
} from 'vite-plugin-long-term-cache-import-map';

const staticDir = 'assets';

export default defineConfig({
    plugins: [
        Vue(),
        Inspect(),
        importMapGeneratorPlugin(),
        importMapPatcherPlugin({
            entryPath: `/${staticDir}/js/index.js`,
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                chunkFileNames: `${staticDir}/js/[name].js`, // 这里要不带hash，避免文件中都有hash
                entryFileNames: `${staticDir}/js/[name].js`, // 这里要不带hash，避免文件中都有hash
                // assetFileNames: `${ staticDir }/[ext]/[name].[ext]`, // css的需要带hash，单独处理,因为importMap里面没有css
                assetFileNames: (targetInfo: any) => {
                    if (targetInfo.name.endsWith('.css')) {
                        return `${staticDir}/[ext]/[name]-[hash].[ext]`;
                    } else {
                        return `${staticDir}/[ext]/[name].[ext]`;
                    }
                },
                // 这个容易玩白屏，而且不知道没白屏的情况是不是真的没有白屏
                // 只拆分js,这个地方拆分要注意，保证充分验证，否则会JS报错，导致全站白屏
                manualChunks: (modulePath: string) => {
                    if (modulePath.includes('/node_modules/')) {
                        if (modulePath.includes('monaco-editor')) {
                            return 'vendor-monaco-editor';
                        } else if (modulePath.includes('@codemirror')) {
                            // 这里需要加@，package.json中还有其他包名包含codemirror
                            return 'vendor-codemirror';
                        } else {
                            return 'vendor-common';
                        }
                    } else {
                        return 'main-all';
                    }
                },
            },
        },
    },
})

```
