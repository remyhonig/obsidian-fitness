/**
 * MarkdownContent Component
 *
 * Renders markdown content using Obsidian's MarkdownRenderer.
 */

import { useRef, useEffect } from 'react';
import { MarkdownRenderer, Component } from 'obsidian';
import { useApp } from '../contexts';

interface MarkdownContentProps {
	/** Markdown content to render */
	content: string;
	/** Additional CSS class */
	className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
	const app = useApp();
	const containerRef = useRef<HTMLDivElement>(null);
	const componentRef = useRef<Component | null>(null);

	useEffect(() => {
		if (!containerRef.current || !content) return;

		// Clear previous content
		containerRef.current.innerHTML = '';

		// Create a component for the renderer lifecycle
		componentRef.current = new Component();
		componentRef.current.load();

		// Render markdown
		void MarkdownRenderer.render(
			app,
			content,
			containerRef.current,
			'',
			componentRef.current
		);

		// Cleanup on unmount or content change
		return () => {
			if (componentRef.current) {
				componentRef.current.unload();
				componentRef.current = null;
			}
		};
	}, [app, content]);

	return (
		<div
			ref={containerRef}
			className={`fit-markdown-content ${className}`}
		/>
	);
}
