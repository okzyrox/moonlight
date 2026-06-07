import { expect, test } from 'vitest';
import { parseWithFriendlyErrors } from '../../utils/error-map';
import { StarlightConfigSchema, type StarlightUserConfig } from '../../utils/user-config';

function parseStarlightConfigWithFriendlyErrors(config: StarlightUserConfig) {
	return parseWithFriendlyErrors(
		StarlightConfigSchema,
		config,
		'Invalid config passed to starlight integration'
	);
}

test('parses bare minimum valid config successfully', () => {
	const data = parseStarlightConfigWithFriendlyErrors({ title: '' });
	expect(data).toMatchInlineSnapshot(`
		{
		  "components": {
		    "Banner": "@okzyrox/moonlight/components/Banner.astro",
		    "ContentPanel": "@okzyrox/moonlight/components/ContentPanel.astro",
		    "DraftContentNotice": "@okzyrox/moonlight/components/DraftContentNotice.astro",
		    "EditLink": "@okzyrox/moonlight/components/EditLink.astro",
		    "FallbackContentNotice": "@okzyrox/moonlight/components/FallbackContentNotice.astro",
		    "Footer": "@okzyrox/moonlight/components/Footer.astro",
		    "Head": "@okzyrox/moonlight/components/Head.astro",
		    "Header": "@okzyrox/moonlight/components/Header.astro",
		    "Hero": "@okzyrox/moonlight/components/Hero.astro",
		    "LanguageSelect": "@okzyrox/moonlight/components/LanguageSelect.astro",
		    "LastUpdated": "@okzyrox/moonlight/components/LastUpdated.astro",
		    "MarkdownContent": "@okzyrox/moonlight/components/MarkdownContent.astro",
		    "MobileMenuFooter": "@okzyrox/moonlight/components/MobileMenuFooter.astro",
		    "MobileMenuToggle": "@okzyrox/moonlight/components/MobileMenuToggle.astro",
		    "MobileTableOfContents": "@okzyrox/moonlight/components/MobileTableOfContents.astro",
		    "PageFrame": "@okzyrox/moonlight/components/PageFrame.astro",
		    "PageSidebar": "@okzyrox/moonlight/components/PageSidebar.astro",
		    "PageTitle": "@okzyrox/moonlight/components/PageTitle.astro",
		    "Pagination": "@okzyrox/moonlight/components/Pagination.astro",
		    "Search": "@okzyrox/moonlight/components/Search.astro",
		    "Sidebar": "@okzyrox/moonlight/components/Sidebar.astro",
		    "SiteTitle": "@okzyrox/moonlight/components/SiteTitle.astro",
		    "SkipLink": "@okzyrox/moonlight/components/SkipLink.astro",
		    "SocialIcons": "@okzyrox/moonlight/components/SocialIcons.astro",
		    "TableOfContents": "@okzyrox/moonlight/components/TableOfContents.astro",
		    "ThemeProvider": "@okzyrox/moonlight/components/ThemeProvider.astro",
		    "ThemeSelect": "@okzyrox/moonlight/components/ThemeSelect.astro",
		    "TwoColumnContent": "@okzyrox/moonlight/components/TwoColumnContent.astro",
		  },
		  "credits": false,
		  "customCss": [],
		  "defaultLocale": {
		    "dir": "ltr",
		    "label": "English",
		    "lang": "en",
		    "locale": undefined,
		  },
		  "disable404Route": false,
		  "editLink": {},
		  "favicon": {
		    "href": "/favicon.svg",
		    "type": "image/svg+xml",
		  },
		  "head": [],
		  "isMultilingual": false,
		  "isUsingBuiltInDefaultLocale": true,
		  "lastUpdated": false,
		  "locales": undefined,
		  "markdown": {
		    "headingLinks": true,
		    "processedDirs": [],
		  },
		  "pagefind": {
		    "ranking": {
		      "diacriticSimilarity": 0.8,
		      "pageLength": 0.1,
		      "termFrequency": 0.1,
		      "termSaturation": 2,
		      "termSimilarity": 9,
		    },
		  },
		  "pagination": true,
		  "prerender": true,
		  "routeMiddleware": [],
		  "tableOfContents": {
		    "maxHeadingLevel": 3,
		    "minHeadingLevel": 2,
		  },
		  "title": {
		    "en": "",
		  },
		  "titleDelimiter": "|",
		}
	`);
});

test('errors if title is missing', () => {
	expect(() =>
		// @ts-expect-error - Testing invalid config
		parseStarlightConfigWithFriendlyErrors({})
	).toThrowErrorMatchingInlineSnapshot(
		`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**title**: Did not match union.
			> Required"
		`
	);
});

test('errors if title value is not a string or an Object', () => {
	expect(() =>
		// @ts-expect-error - Testing invalid config
		parseStarlightConfigWithFriendlyErrors({ title: 5 })
	).toThrowErrorMatchingInlineSnapshot(
		`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**title**: Did not match union.
			> Expected type \`"string" | "record"\`, received \`"number"\`"
	`
	);
});

test('errors with bad social icon config', () => {
	expect(() =>
		// @ts-expect-error - Testing invalid config
		parseStarlightConfigWithFriendlyErrors({ title: 'Test', social: { unknown: '' } })
	).toThrowErrorMatchingInlineSnapshot(
		`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			Starlight v0.33.0 changed the \`social\` configuration syntax. Please specify an array of link items instead of an object.
			See the Starlight changelog for details: https://github.com/withastro/starlight/blob/main/packages/starlight/CHANGELOG.md#0330
			"
	`
	);
});

test('errors with bad logo config', () => {
	expect(() =>
		// @ts-expect-error - Testing invalid config
		parseStarlightConfigWithFriendlyErrors({ title: 'Test', logo: { html: '' } })
	).toThrowErrorMatchingInlineSnapshot(
		`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**logo**: Did not match union.
			> Expected type \`{ src: string } | { dark: string; light: string }\`
			> Received \`{ "html": "" }\`"
	`
	);
});

test('errors with bad head config', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			// @ts-expect-error - Testing invalid config
			head: [{ tag: 'unknown', attrs: { prop: null }, content: 20 }],
		})
	).toThrowErrorMatchingInlineSnapshot(
		`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**head.0.tag**: Invalid option: expected one of "title"|"base"|"link"|"style"|"meta"|"script"|"noscript"|"template"
			**head.0.attrs.prop**: Did not match union.
			> Expected type \`"string" | "boolean" | "undefined"\`, received \`"null"\`
			**head.0.content**: Expected type \`"string"\`, received \`"number"\`"
	`
	);
});

test('errors with bad sidebar config', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			// @ts-expect-error - Testing invalid config
			sidebar: [{ label: 'Example', href: '/' }],
		})
	).toThrowErrorMatchingInlineSnapshot(
		`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**sidebar.0**: Did not match union.
			> Expected type \`{ link: string } | { items: array } | { autogenerate: object } | { slug: string } | string\`
			> Received \`{ "label": "Example", "href": "/" }\`"
	`
	);
});

test('errors with bad nested sidebar config', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			sidebar: [
				// @ts-expect-error - Testing invalid config
				{
					label: 'Example',
					items: [
						{ label: 'Nested Example 1', link: '/' },
						{ label: 'Nested Example 2', link: true },
					],
				},
			],
		})
	).toThrowErrorMatchingInlineSnapshot(`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**sidebar.0.items.1**: Did not match union.
			> Expected type \`{ link: string } | { items: array } | { autogenerate: object } | { slug: string } | string\`
			> Received \`{ "label": "Nested Example 2", "link": true }\`"
	`);
});

test('errors with sidebar entry that includes `link` and `items`', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			sidebar: [
				{ label: 'Parent', link: '/parent', items: [{ label: 'Child', link: '/parent/child' }] },
			],
		})
	).toThrowErrorMatchingInlineSnapshot(`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**sidebar.0**: Did not match union.
			> Expected type \`{ autogenerate: object } | { slug: string } | string\`
			> Received \`{ "label": "Parent", "link": "/parent", "items": [ { "label": "Child", "link": "/parent/child" } ] }\`"
	`);
});

test('errors with sidebar entry that includes `link` and `autogenerate`', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			sidebar: [
				{
					label: 'Parent',
					link: '/parent',
					// @ts-expect-error - Testing invalid config
					autogenerate: { directory: 'test' },
				},
			],
		})
	).toThrowErrorMatchingInlineSnapshot(`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**sidebar.0**: Did not match union.
			> Expected type \`{ items: array } | { slug: string } | string\`
			> Received \`{ "label": "Parent", "link": "/parent", "autogenerate": { "directory": "test" } }\`"
	`);
});

test('errors with sidebar entry that includes `items` and `autogenerate`', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			sidebar: [
				{
					label: 'Parent',
					items: [{ label: 'Child', link: '/parent/child' }],
					// @ts-expect-error - Testing invalid config
					autogenerate: { directory: 'test' },
				},
			],
		})
	).toThrowErrorMatchingInlineSnapshot(`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			**sidebar.0**: Did not match union.
			> Expected type \`{ link: string } | { slug: string } | string\`
			> Received \`{ "label": "Parent", "items": [ { "label": "Child", "link": "/parent/child" } ], "autogenerate": { "directory": "test" } }\`"
	`);
});

test('parses route middleware config successfully', () => {
	const data = parseStarlightConfigWithFriendlyErrors({
		title: '',
		routeMiddleware: './src/routeData.ts',
	});
	expect(data.routeMiddleware).toEqual(['./src/routeData.ts']);
});

test('errors if a route middleware path will conflict with Astro middleware', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			routeMiddleware: ['./src/middleware.ts', './src/routeData.ts'],
		})
	).toThrowErrorMatchingInlineSnapshot(
		`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			The \`"./src/middleware.ts"\` path in your Starlight \`routeMiddleware\` config conflicts with Astro’s middleware locations.
			
			You should rename \`./src/middleware.ts\` to something else like \`./src/starlightRouteData.ts\` and update the \`routeMiddleware\` file path to match.
			
			- More about Starlight route middleware: https://starlight.astro.build/guides/route-data/#how-to-customize-route-data
			- More about Astro middleware: https://docs.astro.build/en/guides/middleware/"
		`
	);
});

test('errors if an invalid customCss file path is provided', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			customCss: ['./public/styles.css', '/public/other-styles.css'],
		})
	).toThrowErrorMatchingInlineSnapshot(`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			These paths in your Starlight \`customCss\` config are invalid: \`"./public/styles.css"\`, \`"/public/other-styles.css"\`
			
			CSS files specified in \`customCss\` should be in the \`src/\` directory, not the \`public/\` directory.
			
			You should move these CSS files into the \`src/\` directory and update the path in \`customCss\` to match."
	`);
});

test('errors on removed autogenerated sidebar groups with no attributes', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			sidebar: [
				{
					label: 'Example',
					// @ts-expect-error - Testing invalid config
					autogenerate: { directory: 'test', collapsed: true },
				},
			],
		})
	).toThrowErrorMatchingInlineSnapshot(`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			Found an \`autogenerate\` object with a \`label\`. Support for autogenerated sidebar groups was removed in Starlight v0.39.0.
			You should instead create a group with the desired \`label\` and an \`items\` array containing the autogenerate config:
			
			{
			  label: 'Example',
			  items: [{ autogenerate: { "directory": "test", "collapsed": true } }]
			}"
	`);
});

test('errors on removed autogenerated sidebar groups with attributes', () => {
	expect(() =>
		parseStarlightConfigWithFriendlyErrors({
			title: 'Test',
			sidebar: [
				{
					label: 'Example',
					// @ts-expect-error - Testing invalid config
					autogenerate: { directory: 'test', attrs: { 'data-test': 'test' } },
				},
			],
		})
	).toThrowErrorMatchingInlineSnapshot(`
		"[AstroUserError]:
			Invalid config passed to starlight integration
		Hint:
			Found an \`autogenerate\` object with a \`label\`. Support for autogenerated sidebar groups was removed in Starlight v0.39.0.
			You should instead create a group with the desired \`label\` and an \`items\` array containing the autogenerate config:
			
			{
			  label: 'Example',
			  items: [{ autogenerate: { "directory": "test", "attrs": { "data-test": "test" } } }]
			}"
	`);
});
