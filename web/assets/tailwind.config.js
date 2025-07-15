// See the Tailwind configuration guide for advanced usage
// https://tailwindcss.com/docs/configuration

const plugin = require("tailwindcss/plugin");
const fs = require("fs");
const path = require("path");

module.exports = {
	content: [
		"./js/**/*.js",
		"./js/**/*.jsx",
		"./js/**/*.tsx",
		"../lib/zk_arcade_web.ex",
		"../lib/zk_arcade_web/**/*.*ex",
	],
	theme: {
		extend: {
			colors: {
				none: "none",
				inherit: "inherit",
				current: "currentColor",
				transparent: "transparent",
				background: "rgb(5 6 5 / <alpha-value>)",
				"modal-overlay": "rgba(0, 0, 0, 0.5)",
				red: "rgb(253 77 77 / <alpha-value>)",
				accent: {
					100: "rgb(64 254 146 / <alpha-value>)",
					200: "rgb(102 255 168 / <alpha-value>)",
				},
				text: {
					100: "rgb(255 255 255 / <alpha-value>)",
					200: "rgb(193 193 193 / <alpha-value>)",
				},
				contrast: {
					100: "rgb(54 54 55 / <alpha-value>)",
					200: "rgb(66 77 71 / <alpha-value>)",
				},
				disabled: "rgb(179 179 179 / <alpha-value>)",
			},
			fontSize: {
				xs: ["0.75rem", "1.375rem"], // 12px to rem, 22px to rem
				sm: ["0.875rem", "1.375rem"], // 14px to rem, 22px to rem
				md: ["1rem", "1.375rem"], // 16px to rem, 22px to rem
				lg: ["1.125rem", "1.375rem"], // 18px to rem, 22px to rem
				xl: ["1.25rem", "2rem"], // 20px to rem, 32px to rem
				"2xl": ["1.5rem", "2rem"], // 24px to rem, 32px to rem
				"3xl": ["1.75rem", "2.375rem"], // 28px to rem, 38px to rem
				"4xl": ["1.875rem", "2.375rem"], // 30px to rem, 38px to rem
				"5xl": ["2.5rem", "3rem"], // 40px to rem, 48px to rem
				"6xl": ["3rem", "3.625rem"], // 48px to rem, 58px to rem
				"7xl": ["3.75rem", "4.5rem"], // 60px to rem, 72px to rem
			},
			borderWidth: {
				DEFAULT: "1px",
				0: "0px",
			},
			borderRadius: {
				s: "4px",
				DEFAULT: "6px",
				l: "8px",
				full: "100%",
			},
			spacing: {
				0: "0px",
				1: "6px",
				2: "8px",
				3: "10px",
				4: "12px",
				5: "16px",
				6: "20px",
				7: "24px",
				8: "30px",
				9: "36px",
				10: "40px",
			},
		},
	},
	plugins: [
		require("@tailwindcss/forms"),
		// Allows prefixing tailwind classes with LiveView classes to add rules
		// only when LiveView classes are applied, for example:
		//
		//     <div class="phx-click-loading:animate-ping">
		//
		plugin(({ addVariant }) =>
			addVariant("phx-click-loading", [
				".phx-click-loading&",
				".phx-click-loading &",
			])
		),
		plugin(({ addVariant }) =>
			addVariant("phx-submit-loading", [
				".phx-submit-loading&",
				".phx-submit-loading &",
			])
		),
		plugin(({ addVariant }) =>
			addVariant("phx-change-loading", [
				".phx-change-loading&",
				".phx-change-loading &",
			])
		),

		// Embeds Heroicons (https://heroicons.com) into your app.css bundle
		// See your `CoreComponents.icon/1` for more information.
		//
		plugin(function ({ matchComponents, theme }) {
			let iconsDir = path.join(__dirname, "../deps/heroicons/optimized");
			let values = {};
			let icons = [
				["", "/24/outline"],
				["-solid", "/24/solid"],
				["-mini", "/20/solid"],
				["-micro", "/16/solid"],
			];
			icons.forEach(([suffix, dir]) => {
				fs.readdirSync(path.join(iconsDir, dir)).forEach(file => {
					let name = path.basename(file, ".svg") + suffix;
					values[name] = {
						name,
						fullPath: path.join(iconsDir, dir, file),
					};
				});
			});
			matchComponents(
				{
					hero: ({ name, fullPath }) => {
						let content = fs
							.readFileSync(fullPath)
							.toString()
							.replace(/\r?\n|\r/g, "");
						let size = theme("spacing.6");
						if (name.endsWith("-mini")) {
							size = theme("spacing.5");
						} else if (name.endsWith("-micro")) {
							size = theme("spacing.4");
						}
						return {
							[`--hero-${name}`]: `url('data:image/svg+xml;utf8,${content}')`,
							"-webkit-mask": `var(--hero-${name})`,
							mask: `var(--hero-${name})`,
							"mask-repeat": "no-repeat",
							"background-color": "currentColor",
							"vertical-align": "middle",
							display: "inline-block",
							width: size,
							height: size,
						};
					},
				},
				{ values }
			);
		}),
	],
};
