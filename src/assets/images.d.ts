/**
 * TypeScript declarations for image imports
 *
 * These allow importing SVG and PNG files as base64 data URLs
 */

declare module '*.svg' {
	const content: string;
	export default content;
}

declare module '*.png' {
	const content: string;
	export default content;
}
