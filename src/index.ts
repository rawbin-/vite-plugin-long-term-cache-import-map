import { createHash } from 'crypto';
import {Plugin} from "vite";

export const importMapGeneratorPlugin = ():Plugin => {
	const importMap = {imports: {}};
	return {
		name: 'import-map-generator-plugin',
		// @ts-ignore
		renderChunk(code, chunk) {
			const hashObj = createHash('md5');
			hashObj.update(code);
			const contentHash = chunk.fileName.replace(
				/\.js$/,
				`-${ hashObj.digest('hex').slice(0, 8) }.js`,
			);
			// @ts-ignore
			importMap.imports['./' + chunk.fileName] = './' + contentHash;

			this.emitFile({
				type: 'asset',
				// source: code,
				// @ts-ignore
				source: code.replace('__VITE_IS_MODERN__', true), // 这个地方加上本插件之后为啥就多了个这个玩意？
				fileName: contentHash,
			});
		},
		generateBundle(outputOpts, bundle) {
			this.emitFile({
				type: 'asset',
				source: JSON.stringify(importMap),
				fileName: 'import-map.json',
			});
		},
	};
}

export const importMapPatcherPlugin = ({
	entryPath = '/assets/index.js',
	htmlReplacer }:{
	entryPath: string;
	htmlReplacer?: undefined | null | ((html:string,importsMapString:string) => string);
}):Plugin => {
	let importsMapString = '{"imports":{}}'; // 插件间共享的数据
	return {
		name: 'import-map-patcher-plugin',
		generateBundle(outputOpts, bundle) {
			// @ts-ignore
			const importsJSONString = bundle['import-map.json']?.source;
			importsMapString = importsJSONString?.replaceAll('./', '/');
			// this.emitFile({
			//   type: 'asset',
			//   fileName: 'index.html',
			//   source: indexTpl(importsJSONStringNew, '/assets/js/index.js')
			// });
		},
		transformIndexHtml: (html) => {
			if (!htmlReplacer) {
				// @ts-ignore
				let newHTML:string = html.replaceAll(/\s*<(script) type="module"[\w\W]*?\1>/g, '');
				newHTML = newHTML.replaceAll(/\s*<link rel="modulepreload"[^>]*?>/g, '');
				newHTML = newHTML.replace('<head>', `<head><script type="importmap">${ importsMapString }</script><script type="module"> import '${ entryPath }';</script>`);
				return newHTML;
			} else if (typeof htmlReplacer === 'function') {
				return htmlReplacer(html, importsMapString);
			} else {
				throw new Error('htmlReplacer should return a function to get a string result');
			}

		},
	}
}
