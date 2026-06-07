/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-base-to-string, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, preserve-caught-error */

/*
	Lua/Luau documentation generator from extracted data
	Works for most things, although has some markdown issues with indentation and styling
	Supports all main moonwave features, along with my custom @group feature and summaries
*/

import { exec as execCallback } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, isAbsolute } from 'node:path';
import { promisify } from 'node:util';

import type { LuauClass,ReferenceMap } from './utils/luau-members';
import { renderClassMarkdown, getAnchor } from './utils/luau-members';

import type { Loader } from 'astro/loaders';

import { getCollectionPathFromRoot } from './utils/collection';

const exec = promisify(execCallback);

interface LuauDocsLoaderOptions {
	/**
	 * One or more directories containing Luau source files.
	 * Each directory is passed to moonwave-extractor to be scanned.
	 */
	code: string[];
	/** (Optional) The project root used when resolving paths for the extractor. */
	projectDir?: string;
	/** (Optional) The path to the extractor binary. Defaults to `moonwave-extractor`. */
	binaryPath?: string;
}

// Cache
let robloxTypes: ReferenceMap | null = null;

// Utils
function toPathSegments(parts: string[]) {
	return parts.map((part) => encodeURIComponent(part));
}

function toRouteId(segments: string[]) {
	return ['api', ...toPathSegments(segments)].join('/');
}

function toRoute(segments: string[]) {
    return [toPathSegments(segments)].join('/').replace(',', '/');
}

function getGroupPath(luaClass: LuauClass) {
	if (!luaClass.group) {
		return [];
	}

	const path = [] as string[];
	if (luaClass.group.parent) {
		path.push(luaClass.group.parent);
	}
	path.push(luaClass.group.name);
	return path;
}

/*****
 * Original function built by evaera (https://github.com/evaera). Used in Moonwave with explicit permission from original author
 *
 * Author: evaera (https://github.com/evaera)
 * Project: Cmdr (https://github.com/evaera/Cmdr)
 * Copyright © 2018 Eryn L. K.
 * 
 * Ported into Starlight for usage with Moonlight, as it uses Moonwave.
 *****/
async function getRobloxTypeReferences(): Promise<ReferenceMap> {
	if (robloxTypes !== null) {
		return new Map(robloxTypes);
	}

	const references: ReferenceMap = new Map();
	const robloxDocsBase = 'https://developer.roblox.com/en-us/api-reference';

	try {
		const response = await fetch('https://raw.githubusercontent.com/CloneTrooper1019/Roblox-Client-Watch/roblox/API-Dump.json');
		const apiData = await response.json() as { Classes: Array<{ Name: string }>; Enums: Array<{ Name: string }> };

		for (const apiClass of apiData.Classes) {
			references.set(apiClass.Name, {
				href: `${robloxDocsBase}/class/${apiClass.Name}`,
				label: apiClass.Name,
			});
		}

		for (const apiEnum of apiData.Enums) {
			references.set(apiEnum.Name, {
				href: `${robloxDocsBase}/enum/${apiEnum.Name}`,
				label: apiEnum.Name,
			});
		}
	} catch (_err) {
		// Do not have any roblox references if it failed.
        // Ideally maybe add a refetch? or warning?
        // But this works for now since its a small thing.
	}

	// Hardcoded.
	const dataTypes = [
		'Axes', 'BrickColor', 'CFrame', 'Color3', 'ColorSequence', 'ColorSequenceKeypoint',
		'DockWidgetPluginGuiInfo', 'Enum', 'EnumItem', 'Enums', 'Faces',
		'NumberRange', 'NumberSequence', 'NumberSequenceKeypoint', 'PathWaypoint',
		'PhysicalProperties', 'Random', 'Ray', 'RBXScriptConnection', 'RBXScriptSignal',
		'Rect', 'Region3', 'Region3int16', 'TweenInfo', 'UDim', 'UDim2', 'Vector2',
		'Vector2int16', 'Vector3', 'Vector3int16',
	];

	for (const dataType of dataTypes) {
		references.set(dataType, {
			href: `${robloxDocsBase}/datatype/${dataType}`,
			label: dataType,
		});
	}

	robloxTypes = references;
	return new Map(references);
}

async function createReferenceMap(classes: LuauClass[], baseUrl: string) {
	const references: ReferenceMap = new Map();

	// Roblox fetched types
	const robloxRefs = await getRobloxTypeReferences();
	for (const [name, ref] of robloxRefs) {
		references.set(name, ref);
	}

	// Add local class reference
	for (const luaClass of classes) {
		const routeIdentifier = toRouteId(getGroupPath(luaClass).concat(luaClass.name));
		const classPath = baseUrl ? `${baseUrl}${routeIdentifier}/` : `/${routeIdentifier}/`;
		references.set(luaClass.name, { href: classPath, label: luaClass.name });

		for (const type of luaClass.types) {
			references.set(type.name, {
				href: `#${getAnchor(type.name)}`,
				label: type.name,
			});
		}
	}

	return references;
}


function renderOverviewMarkdown(classes: LuauClass[], _refs: ReferenceMap) {
	const lines: string[] = [];
	lines.push('List of all documented objects, grouped by their assigned group (if they have one).');
	lines.push('');

	const grouped = new Map<string, LuauClass[]>();
	for (const luaClass of classes) {
		const groupPath = getGroupPath(luaClass).join(' / ') || 'Ungrouped';
		const groupItems = grouped.get(groupPath) || [];
		groupItems.push(luaClass);
		grouped.set(groupPath, groupItems);
	}

	for (const [groupName, groupItems] of grouped.entries()) {
		lines.push(`## ${groupName}`);
		lines.push('');
        if (groupName === 'Ungrouped') {
            lines.push('These classes have not been assigned to a group yet.')
        }
		for (const luaClass of groupItems) {
			const routeId = toRoute(getGroupPath(luaClass).concat(luaClass.name));
			lines.push(`- [${luaClass.name}](${routeId}/) - ${luaClass.desc.trim().split(/\r?\n/)[0]}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}

async function loadExtractorData(binaryPath: string, codeRoots: string[], basePath: string) {
	const results = await Promise.all(
		codeRoots.map(async (root) => {
			const command = `"${binaryPath}" extract "${root.replace(/\\/g, '/')}" --base "${basePath}"`;
			try {
				const { stdout, stderr } = await exec(command, {
					maxBuffer: 10 * 1024 * 1024,
				});

				if (stderr.trim().length > 0) {
					// only fail when nothing is generated
					stdout.trim();
				}

				return JSON.parse(stdout) as LuauClass[];
			} catch (error) {
				const stderr = typeof error === 'object' && error && 'stderr' in error ? String((error as { stderr?: unknown }).stderr || '') : '';
				throw new Error(stderr || `Moonwave extractor errored when loading for ${root}`);
			}
		})
	);

	return results.flat();
}

export function luauDocsLoader(options: LuauDocsLoaderOptions): Loader {
	return {
		name: 'starlight-luau-docs-gen-loader',
		load: async ({ config, store, parseData, renderMarkdown, generateDigest, watcher, logger }) => {
			const projectDir = options.projectDir ?? fileURLToPath(config.root);
			const basePath = projectDir;
			const binaryPath = options.binaryPath ?? 'moonwave-extractor';
			const docsRoot = getCollectionPathFromRoot('docs', config);
			// Resolve to absolute paths so the watcher and extractor
			// always receive the correct paths (usually)
			const resolvedRoots = options.code.map((root) => {
				if (root.startsWith('file:')) return fileURLToPath(root);
				if (isAbsolute(root)) return root;
				return resolve(projectDir, root);
			});

			const sync = async () => {
				const classes = (await loadExtractorData(binaryPath, resolvedRoots, basePath))
					.filter((luaClass) => !luaClass.ignore)
					.sort((left, right) => {
						const leftGroup = getGroupPath(left).join('/');
						const rightGroup = getGroupPath(right).join('/');
						if (leftGroup !== rightGroup) {
							return leftGroup.localeCompare(rightGroup);
						}

						return left.name.localeCompare(right.name);
					});

				const refs = await createReferenceMap(classes, '');
				store.clear();

				// Dummy page for listing the content, replaced if an actual one is created.
				const rootMarkdown = `\nBrowse the [API Reference](/api/).\n`;
				const rootFilePath = `${docsRoot}/index.md`;
				const rootRendered = await renderMarkdown(rootMarkdown, {
					fileURL: pathToFileURL(rootFilePath),
				});
				store.set({
					id: 'index',
					filePath: rootFilePath,
					data: await parseData({
						id: 'index',
						data: {
							title: 'Documentation',
							description: 'API documentation generated by Moonwave.',
							sidebar: { hidden: true },
							pagefind: false,
							editUrl: false,
						},
					}),
					body: rootMarkdown,
					rendered: { html: rootRendered.html, metadata: rootRendered.metadata },
					digest: generateDigest(rootMarkdown),
				});

				const overviewMarkdown = renderOverviewMarkdown(classes, refs);
				const overviewFilePath = `${docsRoot}/api/index.md`;
				const overviewRendered = await renderMarkdown(overviewMarkdown, {
					fileURL: pathToFileURL(overviewFilePath),
				});
				store.set({
					id: 'api/index',
					filePath: overviewFilePath,
					data: await parseData({
						id: 'api/index',
						data: {
							title: 'API Reference',
							description: 'Generated API documentation from Source Code.',
							sidebar: { order: 0, label: 'API Reference' },
							pagefind: true,
							editUrl: false,
						},
					}),
					body: overviewMarkdown,
					rendered: { html: overviewRendered.html, metadata: overviewRendered.metadata },
					digest: generateDigest(overviewMarkdown),
				});

				for (const [index, luaClass] of classes.entries()) {
					const routeSegments = getGroupPath(luaClass).concat(luaClass.name);
					const routeId = toRouteId(routeSegments);
					const filePath = `${docsRoot}/${routeId}.md`;
					const markdown = renderClassMarkdown(luaClass, refs);
					const rendered = await renderMarkdown(markdown, {
						fileURL: pathToFileURL(filePath),
					});

					store.set({
						id: routeId,
						filePath,
						data: await parseData({
							id: routeId,
							data: {
								title: luaClass.name,
								description: luaClass.desc.trim().split(/\r?\n/)[0],
								sidebar: {
									order: index + 1,
									label: luaClass.name,
									hidden: false,
								},
								pagefind: true,
								editUrl: false,
							},
						}),
						body: markdown,
						rendered: { html: rendered.html, metadata: rendered.metadata },
						digest: generateDigest(markdown),
					});
				}

				logger.info(`Loaded ${classes.length} Docs entries`);
			};

			await sync();

			if (watcher) {
				for (const root of resolvedRoots) {
					watcher.add(root);
				}

				let reloadTimer: ReturnType<typeof setTimeout> | null = null;
				const reload = (filePath: string) => {
					if (!/\.luau?$/.test(filePath)) return;
					if (reloadTimer) clearTimeout(reloadTimer);
					reloadTimer = setTimeout(async () => {
						reloadTimer = null;
						await sync();
					}, 300);
				};

				watcher.on('add', reload);
				watcher.on('change', reload);
				watcher.on('unlink', reload);
			}
		},
	};
}
