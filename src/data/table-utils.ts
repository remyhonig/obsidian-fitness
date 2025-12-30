/**
 * Markdown table parsing and creation utilities
 */

/**
 * Parses a markdown table into an array of row objects
 */
export function parseMarkdownTable(tableContent: string): Record<string, string>[] {
	const lines = tableContent.trim().split('\n').filter(line => line.trim());
	if (lines.length < 2) return [];

	// Parse header row
	const headerLine = lines[0];
	if (!headerLine) return [];
	const headers = headerLine
		.split('|')
		.map(h => h.trim())
		.filter(h => h.length > 0);

	// Skip separator row (index 1)
	const rows: Record<string, string>[] = [];

	for (let i = 2; i < lines.length; i++) {
		const line = lines[i];
		if (!line) continue;

		// Handle edge case where split creates empty first/last elements
		const values = line.startsWith('|')
			? line.split('|').slice(1, -1).map(c => c.trim())
			: line.split('|').map(c => c.trim());

		// Skip empty rows (all values are empty or just dashes/whitespace)
		const hasContent = values.some(v => v && v !== '-' && v !== '—');
		if (!hasContent) continue;

		const row: Record<string, string> = {};
		headers.forEach((header, idx) => {
			row[header] = values[idx] ?? '';
		});
		rows.push(row);
	}

	return rows;
}

/**
 * Creates a markdown table from column definitions and rows
 */
export function createMarkdownTable(
	columns: { key: string; header: string }[],
	rows: Record<string, string | number | undefined>[]
): string {
	if (columns.length === 0) return '';

	const lines: string[] = [];

	// Header row
	const headerCells = columns.map(c => c.header);
	lines.push(`| ${headerCells.join(' | ')} |`);

	// Separator row
	const separators = columns.map(() => '---');
	lines.push(`|${separators.join('|')}|`);

	// Data rows
	for (const row of rows) {
		const cells = columns.map(c => {
			const val = row[c.key];
			return val !== undefined ? String(val) : '-';
		});
		lines.push(`| ${cells.join(' | ')} |`);
	}

	return lines.join('\n');
}
