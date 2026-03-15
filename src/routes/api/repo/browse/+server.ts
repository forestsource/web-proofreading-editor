import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join, relative, extname, basename } from 'path';

const BINARY_EXTENSIONS = new Set([
	'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
	'.mp3', '.mp4', '.avi', '.mov', '.mkv', '.flac', '.wav', '.ogg',
	'.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz',
	'.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o',
	'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
	'.woff', '.woff2', '.ttf', '.otf', '.eot',
	'.class', '.pyc', '.pyo', '.wasm',
	'.sqlite', '.db', '.lock'
]);

const IGNORE_DIRS = new Set([
	'node_modules', '.git', '.svelte-kit', 'dist', 'build', '.next',
	'__pycache__', '.venv', 'venv', '.tox', 'target', 'vendor',
	'.idea', '.vscode', 'coverage', '.nyc_output'
]);

const MAX_FILES = 5000;

async function walkDir(dir: string, base: string, files: string[]): Promise<void> {
	if (files.length >= MAX_FILES) return;

	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true, encoding: 'utf-8' });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (files.length >= MAX_FILES) return;

		// entry.name may be octal-escaped on some platforms; decode it
		const name = decodeOctalEscape(entry.name);
		const fullPath = join(dir, name);

		if (entry.isDirectory()) {
			if (IGNORE_DIRS.has(name) || name.startsWith('.')) continue;
			await walkDir(fullPath, base, files);
		} else if (entry.isFile()) {
			const ext = extname(name).toLowerCase();
			if (BINARY_EXTENSIONS.has(ext)) continue;
			const relPath = relative(base, fullPath).replace(/\\/g, '/');
			files.push(relPath);
		}
	}
}

/** Decode octal-escaped UTF-8 byte sequences like \\343\\202\\244 back to proper strings */
function decodeOctalEscape(str: string): string {
	if (!str.includes('\\')) return str;
	try {
		const bytes: number[] = [];
		let i = 0;
		while (i < str.length) {
			if (str[i] === '\\' && i + 3 < str.length) {
				const octal = str.substring(i + 1, i + 4);
				if (/^[0-3][0-7]{2}$/.test(octal)) {
					bytes.push(parseInt(octal, 8));
					i += 4;
					continue;
				}
			}
			// flush any accumulated bytes before pushing a plain char
			if (bytes.length > 0) {
				// shouldn't happen in well-formed sequences, but handle gracefully
			}
			bytes.push(str.charCodeAt(i));
			i++;
		}
		return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
	} catch {
		return str;
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const repo = url.searchParams.get('repo');
	if (!repo) return json({ error: 'repo parameter required' }, { status: 400 });

	const trimmed = repo.trim();
	if (!existsSync(trimmed)) {
		return json({ error: `ディレクトリが存在しません: ${trimmed}` }, { status: 400 });
	}

	try {
		const files: string[] = [];
		await walkDir(trimmed, trimmed, files);
		files.sort();
		return json({ files });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
