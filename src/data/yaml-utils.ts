/**
 * YAML parsing and serialization utilities
 */

/**
 * Parses YAML frontmatter from file content
 */
export function parseFrontmatter<T>(content: string): { frontmatter: T | null; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) {
		return { frontmatter: null, body: content };
	}

	try {
		// Simple YAML parser for our use case
		const yamlContent = match[1] ?? '';
		const body = match[2] ?? '';
		const frontmatter = parseSimpleYaml(yamlContent) as T;
		return { frontmatter, body };
	} catch {
		return { frontmatter: null, body: content };
	}
}

/**
 * Simple YAML parser that handles our data structures including nested arrays and objects
 */
export function parseSimpleYaml(yaml: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const lines = yaml.split('\n');

	// Stack to track nested structures: each entry has { obj, array, key, indent }
	interface StackEntry {
		obj: Record<string, unknown>;
		array: unknown[] | null;
		key: string;
		indent: number;
	}

	const stack: StackEntry[] = [{ obj: result, array: null, key: '', indent: -2 }];

	const getIndent = (line: string): number => {
		const match = line.match(/^( *)/);
		return match?.[1]?.length ?? 0;
	};

	// Look ahead to determine if a block is an array (starts with -) or object
	const isArrayBlock = (startIndex: number, blockIndent: number): boolean => {
		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i];
			if (!line || !line.trim()) continue;
			const lineIndent = getIndent(line);
			if (lineIndent <= blockIndent) break; // Left the block
			if (lineIndent > blockIndent) {
				// First content line - check if it's an array item
				return line.trim().startsWith('- ');
			}
		}
		return false;
	};

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		if (!line) continue;

		// Skip empty lines
		if (!line.trim()) continue;

		const indent = getIndent(line);
		const trimmed = line.trim();

		// Pop stack until we're at the right level
		while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
			stack.pop();
		}

		const current = stack[stack.length - 1]!;

		// Check for inline array at any level
		const inlineArrayMatch = trimmed.match(/^(\w+): \[(.+)\]$/);
		if (inlineArrayMatch && inlineArrayMatch[1] && inlineArrayMatch[2]) {
			const key = inlineArrayMatch[1];
			const values = inlineArrayMatch[2].split(',').map(v => parseValue(v.trim()));
			current.obj[key] = values;
			continue;
		}

		// Check for array item (starts with -)
		if (trimmed.startsWith('- ')) {
			const content = trimmed.slice(2);

			// Array item with key:value (object in array)
			const objMatch = content.match(/^(\w+): (.+)$/);
			if (objMatch && objMatch[1] && objMatch[2]) {
				const newObj: Record<string, unknown> = { [objMatch[1]]: parseValue(objMatch[2]) };
				if (current.array) {
					current.array.push(newObj);
				}
				// Push this object onto stack for potential nested properties
				stack.push({ obj: newObj, array: null, key: '', indent: indent });
				continue;
			}

			// Simple array item (primitive value)
			if (current.array) {
				current.array.push(parseValue(content));
			}
			continue;
		}

		// Check for block start (key followed by colon only) - could be array or object
		const blockStartMatch = trimmed.match(/^(\w+):$/);
		if (blockStartMatch && blockStartMatch[1]) {
			const key = blockStartMatch[1];

			// Look ahead to determine if this is an array or object
			if (isArrayBlock(lineIndex + 1, indent)) {
				// It's an array
				const newArray: unknown[] = [];
				current.obj[key] = newArray;
				stack.push({ obj: current.obj, array: newArray, key: key, indent: indent });
			} else {
				// It's a nested object
				const newObj: Record<string, unknown> = {};
				current.obj[key] = newObj;
				stack.push({ obj: newObj, array: null, key: key, indent: indent });
			}
			continue;
		}

		// Check for key-value pair
		const kvMatch = trimmed.match(/^(\w+): (.+)$/);
		if (kvMatch && kvMatch[1] && kvMatch[2]) {
			current.obj[kvMatch[1]] = parseValue(kvMatch[2]);
			continue;
		}
	}

	return result;
}

/**
 * Parses a YAML value into the appropriate JS type
 */
function parseValue(value: string): unknown {
	// Remove quotes if present
	if ((value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))) {
		return value.slice(1, -1);
	}

	// Boolean
	if (value === 'true') return true;
	if (value === 'false') return false;

	// Number
	const num = parseFloat(value);
	if (!isNaN(num) && value === String(num)) {
		return num;
	}

	// String
	return value;
}

/**
 * Converts an object to YAML frontmatter string
 */
export function toFrontmatter(data: Record<string, unknown>): string {
	const lines: string[] = ['---'];
	serializeObject(data, lines, 0);
	lines.push('---');
	return lines.join('\n');
}

/**
 * Recursively serializes an object to YAML lines
 */
function serializeObject(obj: Record<string, unknown>, lines: string[], indent: number): void {
	const prefix = '  '.repeat(indent);

	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			if (value.length === 0) continue;

			// Check if it's an array of objects or primitives
			if (typeof value[0] === 'object' && value[0] !== null) {
				// Array of objects
				lines.push(`${prefix}${key}:`);
				for (const item of value) {
					serializeArrayItem(item as Record<string, unknown>, lines, indent + 1);
				}
			} else {
				// Array of primitives - use inline format
				const formatted = value.map(v => formatValue(v)).join(', ');
				lines.push(`${prefix}${key}: [${formatted}]`);
			}
		} else {
			lines.push(`${prefix}${key}: ${formatValue(value)}`);
		}
	}
}

/**
 * Serializes an array item (object in an array) to YAML lines
 */
function serializeArrayItem(item: Record<string, unknown>, lines: string[], indent: number): void {
	const prefix = '  '.repeat(indent);
	const entries = Object.entries(item);

	if (entries.length === 0) return;

	let isFirst = true;
	for (const [key, value] of entries) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			if (value.length === 0) continue;

			// Nested array
			if (typeof value[0] === 'object' && value[0] !== null) {
				// Array of objects
				if (isFirst) {
					lines.push(`${prefix}- ${key}:`);
					isFirst = false;
				} else {
					lines.push(`${prefix}  ${key}:`);
				}
				for (const subItem of value) {
					serializeArrayItem(subItem as Record<string, unknown>, lines, indent + 2);
				}
			} else {
				// Array of primitives
				const formatted = value.map(v => formatValue(v)).join(', ');
				if (isFirst) {
					lines.push(`${prefix}- ${key}: [${formatted}]`);
					isFirst = false;
				} else {
					lines.push(`${prefix}  ${key}: [${formatted}]`);
				}
			}
		} else {
			if (isFirst) {
				lines.push(`${prefix}- ${key}: ${formatValue(value)}`);
				isFirst = false;
			} else {
				lines.push(`${prefix}  ${key}: ${formatValue(value)}`);
			}
		}
	}
}

/**
 * Formats a value for YAML output
 */
function formatValue(value: unknown): string {
	if (typeof value === 'string') {
		// Quote wikilinks - YAML interprets [[]] as nested arrays without quotes
		// Obsidian still recognizes quoted wikilinks as links in frontmatter
		if (value.startsWith('[[') && value.endsWith(']]')) {
			return `"${value}"`;
		}
		// Quote strings that might be ambiguous in YAML
		if (value.includes(':') || value.includes('#') || value.includes('\n')) {
			return `"${value.replace(/"/g, '\\"')}"`;
		}
		return value;
	}
	if (typeof value === 'boolean') {
		return value ? 'true' : 'false';
	}
	if (typeof value === 'number') {
		return String(value);
	}
	return String(value);
}

/**
 * Creates file content with frontmatter and body
 */
export function createFileContent(frontmatter: Record<string, unknown>, body = ''): string {
	const fm = toFrontmatter(frontmatter);
	return body ? `${fm}\n${body}` : fm;
}
