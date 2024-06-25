import { createHash } from 'crypto';
import {Plugin} from "vite";

const importMapFileName = 'import-map.json'

export const importMapGeneratorPlugin = ():Plugin => {
	const importMap = {imports: {}};
	return {
		name: 'import-map-generator-plugin',
		generateBundle(outputOpts, bundle) {
			Object.keys(bundle).forEach((fileName) => {
				const fileObj = bundle[fileName];
				// 删除默认的map文件 重新生成
				if (fileName.endsWith('.js.map') && fileObj.type === 'asset') {
					delete bundle[fileName]
				}
				if (fileName.endsWith('.js') && fileObj.type === 'chunk') {


					const hashObj = createHash('md5');
					hashObj.update(fileObj.code);
					const hashStr = hashObj.digest('hex').slice(0, 8)

					fileObj.code = fileObj.code.replace(`//# sourceMappingURL=${ fileObj.name }.js.map`, `//# sourceMappingURL=${ fileObj.name }@${ hashStr }.js.map`);

					fileObj.fileName = fileObj.fileName.replace(/.js$/, `@${ hashStr }.js`);
					// @ts-ignore
					fileObj.preliminaryFileName = fileObj.preliminaryFileName.replace(/.js$/, `@${ hashStr }.js`);
					// @ts-ignore
					fileObj.map.file = fileObj.fileName.replace(/.js$/, `@${ hashStr }.js`);
					// @ts-ignore
					fileObj.sourcemapFileName = fileObj.sourcemapFileName.replace(/.js.map$/, `@${ hashStr }.js.map`);
					// @ts-ignore
					importMap.imports[`/${ fileName }`] = `/${ fileObj.fileName }`;

					// 重新生成sourceMap资源
					this.emitFile({
						// @ts-ignore
						fileName: fileObj.sourcemapFileName,
						name: undefined,
						source: JSON.stringify(fileObj.map),
						// @ts-ignore
						needsCodeReference: false,
						type: 'asset',
					});
				}
			});
			this.emitFile({
				type: 'asset',
				source: JSON.stringify(importMap),
				fileName: importMapFileName,
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
	return {
		name: 'import-map-patcher-plugin',
		transformIndexHtml: (html,ctx) => {
			// @ts-ignore
			const importsMapString = ctx.bundle?.[importMapFileName]?.source;
			console.log(importsMapString)
			if (!htmlReplacer) {
				// @ts-ignore
				let newHTML:string = html.replaceAll(/\s*<(script) type="module"[\w\W]*?\1>/g, '');
				newHTML = newHTML.replaceAll(/\s*<link rel="modulepreload"[^>]*?>/g, '');
				newHTML = newHTML.replace('<head>', `<head><script type="importmap">${ importsMapString }</script><script type="module"> import '${ entryPath }';</script>`);
				return newHTML;
			} else if (typeof htmlReplacer === 'function') {
				// @ts-ignore
				return htmlReplacer(html, importsMapString);
			} else {
				throw new Error('htmlReplacer should return a function to get a string result');
			}

		},
	}
}
