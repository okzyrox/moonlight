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

// From the extractor structures.
// @group abc 
interface GroupPath {
	parent?: string;
	name: string;
}

// @<something.
interface CustomTag {
	name: string;
}

// @deprecated
interface DeprecatedTag {
	version: string;
	desc?: string;
}

interface ExternalType {
	name: string;
	url: string;
}

// @param
interface LuauParam {
	name: string;
	desc: string;
	lua_type: string;
}

// @return 
interface LuauReturn {
	desc: string;
	lua_type: string;
}

interface LuauFunction {
	name: string;
	desc: string;
	params: LuauParam[];
	returns: LuauReturn[];
	function_type: 'method' | 'static';
	tags?: CustomTag[];
	external_types?: ExternalType[];
	errors?: Array<{ lua_type: string; desc: string }>;
	realm?: string[];
	since?: string;
	deprecated?: DeprecatedTag;
	private?: boolean; // @private
	unreleased?: boolean;
	yields?: boolean; // @yields
	ignore?: boolean;
	source?: { relative_path: string; line: number };
}

// @prop or .something
interface LuauProperty {
	name: string;
	desc: string;
	lua_type: string;
	tags?: CustomTag[];
	external_types?: ExternalType[];
	realm?: string[];
	since?: string;
	deprecated?: DeprecatedTag;
	private?: boolean; // @private
	unreleased?: boolean;
	readonly?: boolean; // @readonly
	ignore?: boolean;
	source?: { relative_path: string; line: number };
}

// @field
interface LuauField {
	name: string;
	lua_type: string;
	desc: string;
}

// @type
interface LuauType {
	name: string;
	desc: string;
	lua_type?: string | null;
	fields?: LuauField[];
	tags?: CustomTag[];
	external_types?: ExternalType[];
	since?: string;
	deprecated?: DeprecatedTag;
	private?: boolean;
	unreleased?: boolean;
	ignore?: boolean;
	source?: { relative_path: string; line: number };
}

// @class
interface LuauClass {
	name: string;
	desc: string;
	functions: LuauFunction[];
	properties: LuauProperty[];
	types: LuauType[];
	group?: GroupPath;
	groupDescription?: GroupPath & { desc?: string };
	realm?: string[];
	private?: boolean;
	deprecated?: DeprecatedTag;
	since?: string;
	unreleased?: boolean;
	ignore?: boolean;
	output_source?: { relative_path: string; line: number };
}

type ReferenceMap = Map<string, { href: string; label: string }>;

// Cache
let robloxTypes: ReferenceMap | null = null;

// Constants
/// Ported from my moonwave fork.
const SIMPLE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PROPERTY_ICON_SVG =
	'<svg width="28" height="28" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.89453 9.38443V15.4702C4.89453 16.0225 5.34225 16.4702 5.89453 16.4702H11.9803C12.3781 16.4702 12.7597 16.3122 13.041 16.0309L15.4552 13.6167C15.7365 13.3354 15.8945 12.9538 15.8945 12.556V6.97021C15.8945 6.14179 15.223 5.47021 14.3945 5.47021H8.80874C8.41092 5.47021 8.02939 5.62825 7.74808 5.90955L5.33387 8.32377C5.05257 8.60507 4.89453 8.9866 4.89453 9.38443ZM8.80874 6.47021C8.67614 6.47021 8.54896 6.52289 8.45519 6.61666L6.60164 8.47021H11.8945C11.9841 8.47021 12.0709 8.48199 12.1536 8.50409L14.1874 6.47021H8.80874ZM14.8945 7.17732L12.8607 9.21119C12.8828 9.29381 12.8945 9.38064 12.8945 9.47021V14.7631L14.7481 12.9096C14.8419 12.8158 14.8945 12.6886 14.8945 12.556V7.17732Z" fill="#1AC8FF"></path></svg>';
const FUNCTION_ICON_SVG =
	'<svg width="30" height="30" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14.7149 7.74818C14.4095 7.57548 14.0359 7.57548 13.7304 7.74818L9.98044 9.86867C9.89177 9.91881 9.81266 9.98134 9.7448 10.0534L14.2228 12.4053L18.7063 10.0596C18.6372 9.98493 18.5561 9.92025 18.4649 9.86867L14.7149 7.74818Z" fill="#E26CF4"></path><path d="M18.9727 11.0488L14.7222 13.2726V17.9312L18.4649 15.8148C18.7787 15.6374 18.9727 15.3048 18.9727 14.9444V11.0488Z" fill="#E26CF4"></path><path d="M9.47266 11.04L13.7222 13.2719V17.9307L9.98044 15.8148C9.66666 15.6374 9.47266 15.3048 9.47266 14.9444V11.04Z" fill="#E26CF4"></path><path d="M8.72266 9.21985C8.85025 9.21985 8.9704 9.25171 9.07559 9.30792C8.6996 9.67497 8.47792 10.1812 8.47275 10.7198H6.22266C5.80844 10.7198 5.47266 10.3841 5.47266 9.96985C5.47266 9.55564 5.80844 9.21985 6.22266 9.21985H8.72266Z" fill="#E26CF4"></path><path d="M8.22266 11.9796C8.31032 11.9796 8.39446 11.9947 8.47266 12.0223V13.4369C8.39446 13.4646 8.31032 13.4796 8.22266 13.4796H4.72266C4.30844 13.4796 3.97266 13.1438 3.97266 12.7296C3.97266 12.3154 4.30844 11.9796 4.72266 11.9796H8.22266Z" fill="#E26CF4"></path><path d="M6.22266 14.7296H8.47266V14.9444C8.47266 15.4104 8.63476 15.853 8.91887 16.2037C8.85633 16.2206 8.79055 16.2296 8.72266 16.2296H6.22266C5.80844 16.2296 5.47266 15.8938 5.47266 15.4796C5.47266 15.0654 5.80844 14.7296 6.22266 14.7296Z" fill="#E26CF4"></path></svg>';
const EVENT_ICON_SVG =
	'<svg width="28" height="28" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12.788 3.96973H7.81887C7.59378 3.96973 7.39643 4.12014 7.33676 4.33718L5.41219 11.3372C5.32468 11.6555 5.56419 11.9697 5.8943 11.9697H8.32037L7.95957 17.7677C7.94134 18.0607 8.3112 18.2028 8.49384 17.9731L15.0056 9.78085C15.266 9.45322 15.0327 8.96973 14.6142 8.96973H12.108L13.2712 4.5983C13.3556 4.28094 13.1164 3.96973 12.788 3.96973Z" fill="#F2BA2A"></path></svg>';
const TYPE_ICON_SVG =
	'<svg width="28" height="28" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7.2 5.7C5.8 5.7 5.1 6.5 5.1 7.9V8.9C5.1 9.7 4.7 10.2 3.9 10.5C4.7 10.8 5.1 11.3 5.1 12.1V13.1C5.1 14.5 5.8 15.3 7.2 15.3" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path><path d="M13.8 5.7C15.2 5.7 15.9 6.5 15.9 7.9V8.9C15.9 9.7 16.3 10.2 17.1 10.5C16.3 10.8 15.9 11.3 15.9 12.1V13.1C15.9 14.5 15.2 15.3 13.8 15.3" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="8.9" cy="10.5" r="0.85" fill="#FFFFFF"></circle><circle cx="10.5" cy="10.5" r="0.85" fill="#FFFFFF"></circle><circle cx="12.1" cy="10.5" r="0.85" fill="#FFFFFF"></circle></svg>';

const BADGE_SVG = {
	Server:
		'<svg width="12" height="12" viewBox="0 0 90 90" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><polygon points="6.125,72.421 58.544,88.523 58.544,24.372 6.125,8.269"></polygon><polygon points="79.818,15.77 79.868,15.755 29.615,1.453 10.328,6.318 60.102,21.609"></polygon><path d="M61.643,78.738l22.232-6.582V17.801l-22.232,6.584V78.738z M73.811,69.257c-1.174,0-2.125-1.19-2.125-2.659  c0-1.468,0.951-2.658,2.125-2.658c1.172,0,2.123,1.19,2.123,2.658C75.934,68.066,74.982,69.257,73.811,69.257z M64.898,32.121  l16.336-4.41v7.117l-16.336,4.409V32.121z M64.898,41.292l16.336-4.41v7.116l-16.336,4.409V41.292z M64.898,50.463l16.336-4.411  v7.116l-16.336,4.411V50.463z"></path><polygon points="83.875,74.893 61.643,81.477 61.643,88.547 83.875,81.963"></polygon></svg>',
	Client:
		'<svg width="12" height="12" viewBox="0 0 337 304" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 201h337v36H0v-36zm0 0zM0 0v188h337V0H0zM218 287h30c12 0 12 17 0 17H88c-11 0-11-17 0-17h31l10-39h79l10 39z" /></svg>',
	Plugin:
		'<svg width="12" height="12" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M74.388 29.812H25.612a2.152 2.152 0 0 0-2.152 2.152v5.315c0 1.188.963 2.152 2.152 2.152h2.87v8.314c0 9.634 6.333 17.792 15.063 20.533v5.052c0 .792.642 1.435 1.434 1.435h1.435v1.436c0 6.703 2.612 13.008 7.354 17.75.698.699 1.617 1.049 2.535 1.049s1.836-.35 2.536-1.051c1.4-1.4 1.4-3.672 0-5.072a17.81 17.81 0 0 1-5.252-12.678v-1.436h1.435c.792 0 1.434-.643 1.434-1.435v-5.052c8.731-2.743 15.063-10.898 15.063-20.533V39.43h2.869a2.152 2.152 0 0 0 2.152-2.152v-5.315a2.152 2.152 0 0 0-2.152-2.151zM41.392 8.586a3.586 3.586 0 0 0-7.173 0v18.649h7.173V8.586zM65.78 8.586a3.586 3.586 0 0 0-7.173 0v18.649h7.173V8.586z"/></svg>',
	Yields:
		'<svg width="12" height="12" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M96.4 11.9c-1.4-2.5-4-4-6.9-4H10.8c-2.9 0-5.4 1.5-6.9 4-1.4 2.5-1.4 5.5 0 7.9L43.3 88c1.4 2.5 4 4 6.9 4 2.9 0 5.4-1.5 6.9-4l39.3-68.2c1.4-2.4 1.4-5.4 0-7.9zM46.3 54.5c1.1-1.1 2.3-1.6 3.8-1.6s2.8.5 3.8 1.6c1.1 1.1 1.6 2.3 1.6 3.8s-.5 2.8-1.6 3.8c-1.1 1.1-2.3 1.6-3.8 1.6s-2.8-.5-3.8-1.6c-1.1-1.1-1.6-2.3-1.6-3.8.1-1.5.6-2.8 1.6-3.8zm-.5-4.9V21.8h8.8v27.8h-8.8z"/></svg>',
	'Read Only':
		'<svg width="12" height="12" viewBox="0 0 96 96" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M70.354,15.662h-7.496H25.566c-3.282,0-5.19-0.776-5.728-1.169v-1.456c0.538-0.393,2.445-1.168,5.728-1.168h46.479V8H25.566  c-4.776,0-9.594,1.468-9.594,4.747v61.458C15.972,86.645,20.328,88,37.495,88h42.535V15.662H70.354z"/></svg>',
} as const;

const BADGE_STYLE = {
	Server: { color: '#00CC67', title: 'This item only works when running on the server.' },
	Client: { color: '#349AD5', title: 'This item only works when running on the client.' },
	Plugin: { color: '#f39c12', title: 'This item only works when running in the context of a plugin.' },
	Yields: {
		color: '#f1c40f',
		title:
			'This is a yielding function. When called, it will pause the Lua thread that called the function until a result is ready to be returned, without interrupting other scripts.',
	},
	'Read Only': { color: '#e74c3c', title: 'This item is read only and cannot be modified.' },
} as const;

const META_BADGE_STYLE_BLOCK = `<style>
    .ml-meta-badges{display: flex; flex-wrap: wrap; gap: .4rem; margin: .2rem 0 .45rem}
    .ml-meta-badge-wrap{position: relative; display: inline-flex}
    .ml-meta-badge{display:inline-flex; align-items: center;gap:.35rem;padding:.1rem .45rem;border-radius:999px;font-size:.75rem;font-weight:600;line-height:1.2;white-space:nowrap}
    .ml-meta-badge-popup{position:absolute;left:0;bottom:calc(100% + .55rem);transform:translateY(6px);min-width:260px;max-width:min(70vw,420px);padding:.7rem .9rem;border-radius:.6rem;background:var(--sl-color-bg-nav);color:var(--sl-color-text);border:1px solid var(--sl-color-hairline-light);font-size:.95rem;font-weight:500;line-height:1.4;box-shadow:0 12px 32px rgba(0,0,0,.28);opacity:0;pointer-events:none;z-index:calc(var(--sl-z-index-skiplink) + 1);transition:opacity .15s ease,transform .15s ease}
    .ml-meta-badge-popup:after{content:'';position:absolute;left:1.3rem;top:100%;border:9px solid transparent;border-top-color:var(--sl-color-bg-nav)}
    .ml-meta-badge-wrap:hover .ml-meta-badge-popup,.ml-meta-badge-wrap:focus-within .ml-meta-badge-popup{opacity:1;transform:translateY(0)}
    @media (max-width: 740px){.ml-meta-badge-popup{min-width: 220px; max-width: min(80vw, 360px)}}
</style>`;

function renderMarkdownTable(rows: string[][]) {
	if (rows.length === 0) {
		return '';
	}

	const header = rows[0];
	const body = rows.slice(1);
	const separator = header.map(() => '---');
	return [header, separator, ...body].map((row) => `| ${row.join(' | ')} |`).join('\n');
}

function toPathSegments(parts: string[]) {
	return parts.map((part) => encodeURIComponent(part));
}

function toRouteId(segments: string[]) {
	return ['api', ...toPathSegments(segments)].join('/');
}

function toRoute(segments: string[]) {
    return [toPathSegments(segments)].join('/')
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

function isDeprecated(member: { deprecated?: DeprecatedTag }) {
	return member.deprecated !== undefined;
}

function isSignal(member: LuauFunction) {
	return member.tags?.some((tag) => tag.name === 'Signal') ?? false;
}

// A lot of this kinda sucks, although I kinda suck at JS/TS
// So it's not the finest thing that ive procured (mainly SO + docs copying)
function getAnchor(text: string) {
	const slug = text
		.toLowerCase()
		.replace(/["'`]/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');

	return slug || 'section';
}

function escapeInnerCode(text: string) {
	return text.replace(/`/g, '\\`');
}

function escapeTblCell(text: string) {
	return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function escapeHtml(text: string) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderMetaBadge(label: string) {
	const key = label as keyof typeof BADGE_STYLE;
	if (key in BADGE_STYLE) {
		const icon = BADGE_SVG[key as keyof typeof BADGE_SVG];
		const { color, title } = BADGE_STYLE[key];
		return `<span class="ml-meta-badge-wrap"><span class="ml-meta-badge" style="background:${color}22;border:1px solid ${color};color:${color};">${icon}<span>${escapeHtml(label)}</span></span><span class="ml-meta-badge-popup" role="tooltip">${escapeHtml(title)}</span></span>`;
	}

	return `<span class="ml-meta-badge" style="background:var(--sl-color-gray-6);border:1px solid var(--sl-color-gray-5);color:var(--sl-color-white);">${escapeHtml(label)}</span>`;
}

function formatMetaList(items: string[]) {
	if (items.length === 0) {
		return '';
	}

	return `${META_BADGE_STYLE_BLOCK}<div class="ml-meta-badges">${items.map((item) => renderMetaBadge(item)).join('')}</div>`;
}

function formatTypeText(text: string, refs: ReferenceMap) {
	const trimmed = text.trim();
	const baseType = trimmed.replace(/\?$/, '');
	const target = refs.get(baseType);

	if (target && SIMPLE_IDENTIFIER.test(baseType)) {
		return `[${trimmed}](${target.href})`;
	}

	return `\`${escapeInnerCode(text)}\``;
}

function formatTypeList(items: LuauReturn[], refs: ReferenceMap) {
	if (items.length === 0) {
		return '()';
	}

	if (items.length === 1) {
		return formatTypeText(items[0].lua_type, refs);
	}

	return `(${items.map((item) => formatTypeText(item.lua_type, refs)).join(', ')})`;
}

function formatParams(params: LuauParam[], refs: ReferenceMap) {
	if (params.length === 0) {
		return '()';
	}

	return `(${params
		.map((param) => `${param.name}: ${formatTypeText(param.lua_type, refs)}`)
		.join(', ')})`;
}

function formatFunctionSignature(className: string, member: LuauFunction, refs: ReferenceMap) {
	if (member.name === '__iter') {
		return `for ${formatTypeList(member.returns, refs)} in ${className} do`;
	}

	const operator = member.name === '__call' ? '' : member.function_type === 'static' ? '.' : ':';
	const suffix = member.name === '__call' ? '' : member.name;
	const params = formatParams(member.params, refs);
	const returns = formatTypeList(member.returns, refs);

	return `${className}${operator}${suffix}${params} -> ${returns}`;
}

function formatPropertySignature(className: string, member: LuauProperty, refs: ReferenceMap) {
	return `${className}.${member.name}: ${formatTypeText(member.lua_type, refs)}`;
}

function formatTypeSignature(member: LuauType, refs: ReferenceMap) {
	if (member.lua_type) {
		return `type ${member.name} = ${formatTypeText(member.lua_type, refs)}`;
	}

	return `interface ${member.name}`;
}

// TODO: Less hardcoded?
function formatTags(member: { realm?: string[]; private?: boolean; unreleased?: boolean; yields?: boolean; readonly?: boolean; since?: string; deprecated?: DeprecatedTag }) {
	const tags: string[] = [];
	if (member.since) tags.push(`Since ${member.since}`);
	if (member.deprecated) tags.push(`Deprecated in ${member.deprecated.version}`);
	if (member.private) tags.push('Private');
	if (member.unreleased) tags.push('Unreleased');
	if (member.yields) tags.push('Yields');
	if (member.readonly) tags.push('Read Only');
	if (member.realm?.length) tags.push(...member.realm);
	return tags;
}

function renderParamsTable(params: LuauParam[], refs: ReferenceMap) {
	if (params.length === 0) {
		return '';
	}

	return renderMarkdownTable([
		['Name', 'Type', 'Description'],
		...params.map((param) => [
			escapeTblCell(param.name),
			escapeTblCell(formatTypeText(param.lua_type, refs)),
			escapeTblCell(param.desc || ''),
		]),
	]);
}

function renderReturnsTable(returns: LuauReturn[], refs: ReferenceMap) {
	if (returns.length === 0) {
		return '';
	}

	return renderMarkdownTable([
		['Type', 'Description'],
		...returns.map((ret) => [
			escapeTblCell(formatTypeText(ret.lua_type, refs)),
			escapeTblCell(ret.desc || ''),
		]),
	]);
}

function renderMemberSection(
	className: string,
	member: LuauFunction | LuauProperty | LuauType,
	kind: 'property' | 'function' | 'event' | 'type',
	refs: ReferenceMap
) {
	const lines: string[] = [];
	// ugly...
	const icon =
		kind === 'property'
			? PROPERTY_ICON_SVG
			: kind === 'event'
				? EVENT_ICON_SVG
				: kind === 'type'
					? TYPE_ICON_SVG
					: FUNCTION_ICON_SVG;
	lines.push(`### <span style="display:inline-flex;vertical-align:middle;line-height:0;margin-right:8px;">${icon}</span>${member.name}`);
	lines.push('');

	if ('function_type' in member) {
		lines.push(`**Signature:** ${formatFunctionSignature(className, member as LuauFunction, refs)}`);
	} else if ('lua_type' in member && !('fields' in member)) {
		lines.push(`**Signature:** ${formatPropertySignature(className, member as LuauProperty, refs)}`);
	} else {
		lines.push(`**Signature:** ${formatTypeSignature(member as LuauType, refs)}`);
	}

	const tags = formatTags(member as LuauFunction & LuauProperty & LuauType);
	if (tags.length > 0) {
		lines.push('');
		lines.push(formatMetaList(tags));
	}

	if (member.deprecated?.desc) {
		lines.push('');
		lines.push(`> ${member.deprecated.desc}`);
	}

	if (member.desc.trim()) {
		lines.push('');
		lines.push(member.desc.trim());
	}

	if ('params' in member && member.params.length > 0) {
		const paramsTable = renderParamsTable(member.params, refs);
		if (paramsTable) {
			lines.push('');
			lines.push('**Parameters**');
			lines.push('');
			lines.push(paramsTable);
		}
	}

	if ('returns' in member && member.returns.length > 0) {
		const returnsTable = renderReturnsTable(member.returns, refs);
		if (returnsTable) {
			lines.push('');
			lines.push('**Returns**');
			lines.push('');
			lines.push(returnsTable);
		}
	}

	if ('errors' in member && member.errors && member.errors.length > 0) {
		lines.push('');
		lines.push('**Errors**');
		lines.push('');
		lines.push(renderMarkdownTable([
			['Type', 'Description'],
			...member.errors.map((error) => [
				escapeTblCell(error.lua_type),
				escapeTblCell(error.desc),
			]),
		]));
	}

	if ('fields' in member && member.fields && member.fields.length > 0) {
		lines.push('');
		lines.push('**Fields**');
		lines.push('');
		lines.push(renderMarkdownTable([
			['Name', 'Type', 'Description'],
			...member.fields.map((field) => [
				escapeTblCell(field.name),
				escapeTblCell(formatTypeText(field.lua_type, refs)),
				escapeTblCell(field.desc || ''),
			]),
		]));
	}

	return lines.join('\n');
}

function sortMembers<T extends { name: string; deprecated?: DeprecatedTag; function_type?: 'static' | 'method' }>(members: T[]) {
	return [...members].sort((left, right) => {
		if (!isDeprecated(left) && isDeprecated(right)) {
			return -1;
		}

		if (isDeprecated(left) && !isDeprecated(right)) {
			return 1;
		}

		if (left.function_type === 'static' && right.function_type === 'method') {
			return -1;
		}

		if (left.function_type === 'method' && right.function_type === 'static') {
			return 1;
		}

		return left.name.localeCompare(right.name);
	});
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

function formatCompactSignature(
	member: LuauFunction | LuauProperty | LuauType,
	kind: 'property' | 'function' | 'type',
	refs: ReferenceMap
): string {
	if (kind === 'function') {
		const fn = member as LuauFunction;
		const params =
			fn.params.length === 0
				? '()'
				: `(${fn.params.map((p) => `${p.name}: ${formatTypeText(p.lua_type, refs)}`).join(', ')})`;
		const returns = formatTypeList(fn.returns, refs);
		return `${params} -> ${returns}`;
	} else if (kind === 'property') {
		return `: ${formatTypeText((member as LuauProperty).lua_type, refs)}`;
	} else {
		const type = member as LuauType;
		return type.lua_type ? `= ${formatTypeText(type.lua_type, refs)}` : '`{ ... }`';
	}
}

function renderSummaryTable(
	icon: string,
	title: string,
	members: Array<LuauFunction | LuauProperty | LuauType>,
	kind: 'property' | 'function' | 'type',
	className: string,
	refs: ReferenceMap
): string {
	const lines: string[] = [];
	const iconEl = `<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;min-width:32px;line-height:0;">${icon}</span>`;
	lines.push(`**${title}**`);
	lines.push('');
	lines.push('| | Member | Description |');
	lines.push('|:---:|:---|:---|');

	for (const member of members) {
		const anchor = getAnchor(member.name);
		const nameStr = isDeprecated(member) ? `~~${member.name}~~` : member.name;
		const sig = escapeTblCell(formatCompactSignature(member, kind, refs));
		const badges: string[] = [];
		if (isDeprecated(member)) badges.push('*Deprecated*');
		if ((member as LuauProperty).readonly) badges.push('*Read Only*');
		if ((member as LuauFunction).yields) badges.push('*Yields*');
		const badgeStr = badges.length > 0 ? `${badges.join(' ')} · ` : '';
		const desc = escapeTblCell(member.desc.trim().split(/\r?\n/)[0] ?? '');
		const displayName = member.name === '__call' ? `${className}()` : nameStr;
		lines.push(`| ${iconEl} | [**${displayName}**](#${anchor}) ${sig} | ${badgeStr}${desc} |`);
	}

	return lines.join('\n');
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

function renderClassMarkdown(luaClass: LuauClass, refs: ReferenceMap) {
	const lines: string[] = [];
	const meta = formatTags(luaClass as LuauClass & { yields?: boolean; readonly?: boolean });
	if (meta.length > 0) {
		lines.push(formatMetaList(meta));
		lines.push('');
	}

	if (luaClass.groupDescription?.desc) {
		lines.push(luaClass.groupDescription.desc.trim());
		lines.push('');
	}

	if (luaClass.deprecated?.desc) {
		lines.push(`> ${luaClass.deprecated.desc}`);
		lines.push('');
	}

	if (luaClass.desc.trim()) {
		lines.push(luaClass.desc.trim());
		lines.push('');
	}

	const properties = sortMembers(luaClass.properties.filter((member) => !member.ignore));
	const signalFunctions = sortMembers(luaClass.functions.filter((member) => !member.ignore && isSignal(member)));
	const functions = sortMembers(luaClass.functions.filter((member) => !member.ignore && !isSignal(member)));
	const types = sortMembers(luaClass.types.filter((member) => !member.ignore));

	// SummarySection, ported from my old moonwave fork
    // Essentially replicates the Roblox-style summary with the list of the entries
    // With their basic descriptions
	const summaryEntries = [
		{ icon: PROPERTY_ICON_SVG, title: 'Properties', members: properties, kind: 'property' as const },
		{ icon: FUNCTION_ICON_SVG, title: 'Functions', members: functions, kind: 'function' as const },
		{ icon: EVENT_ICON_SVG, title: 'Events', members: signalFunctions, kind: 'function' as const },
		{ icon: TYPE_ICON_SVG, title: 'Types', members: types, kind: 'type' as const },
	].filter((entry) => entry.members.length > 0);

	if (summaryEntries.length > 0) {
		lines.push('## Summary');
		lines.push('');
		for (const entry of summaryEntries) {
			lines.push(renderSummaryTable(entry.icon, entry.title, entry.members, entry.kind, luaClass.name, refs));
			lines.push('');
		}
	}

	if (properties.length > 0) {
		lines.push('## Properties');
		lines.push('');
		for (const member of properties) {
			lines.push(renderMemberSection(luaClass.name, member, 'property', refs));
			lines.push('');
		}
	}

	if (functions.length > 0) {
		lines.push('## Functions');
		lines.push('');
		for (const member of functions) {
			lines.push(renderMemberSection(luaClass.name, member, 'function', refs));
			lines.push('');
		}
	}

	if (signalFunctions.length > 0) {
		lines.push('## Events');
		lines.push('');
		for (const member of signalFunctions) {
			lines.push(renderMemberSection(luaClass.name, member, 'event', refs));
			lines.push('');
		}
	}

	if (types.length > 0) {
		lines.push('## Types');
		lines.push('');
		for (const member of types) {
			lines.push(renderMemberSection(luaClass.name, member, 'type', refs));
			lines.push('');
		}
	}

	return lines.join('\n').trim() + '\n';
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
