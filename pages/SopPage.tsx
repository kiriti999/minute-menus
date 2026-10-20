import { ArrowLeft, BookOpen, ChevronDown, QrCode } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { SOP_SECTIONS, type SopSection } from "../lib/sop/sopData";
import { supabaseService } from "../services/supabaseService";

export interface SopPageProps {
	isDarkTheme: boolean;
	slug: string;
	onBack: () => void;
}

const titleFromSlug = (slug: string): string =>
	slug
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");

/** Internal page — keep it out of search results. */
function useNoIndex() {
	useEffect(() => {
		const meta = document.createElement("meta");
		meta.name = "robots";
		meta.content = "noindex, nofollow";
		document.head.appendChild(meta);
		return () => meta.remove();
	}, []);
}

const SopAccordion: React.FC<{
	section: SopSection;
	open: boolean;
	onToggle: () => void;
	isDarkTheme: boolean;
}> = ({ section, open, onToggle, isDarkTheme }) => {
	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-500";
	return (
		<section className={`rounded-2xl border ${card}`}>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				className="w-full flex items-center gap-3 px-4 py-3 text-left"
			>
				<div className="flex-1 min-w-0">
					<h2 className="text-base font-semibold">{section.title}</h2>
					<p className={`text-xs ${muted}`}>{section.summary}</p>
				</div>
				<span className={`text-xs ${muted}`}>{section.checklist.length} steps</span>
				<ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
			</button>
			{open && (
				<ol className="px-4 pb-4 space-y-2 text-sm list-decimal list-inside marker:font-semibold">
					{section.checklist.map((step) => (
						<li key={step} className="leading-relaxed">
							{step}
						</li>
					))}
				</ol>
			)}
		</section>
	);
};

/**
 * Staff SOP hub: quick links plus collapsed, expandable SOP sections.
 * Public to anyone with the link (staff have badges, not accounts) but noindex.
 */
export const SopPage: React.FC<SopPageProps> = ({ isDarkTheme, slug, onBack }) => {
	const [openIds, setOpenIds] = useState<Set<string>>(new Set());
	const [name, setName] = useState(titleFromSlug(slug));
	useNoIndex();

	// Real restaurant name; the slug-derived title stays if the lookup fails.
	useEffect(() => {
		let cancelled = false;
		supabaseService
			.getRestaurantBySlug(slug)
			.then((r) => {
				if (r?.name && !cancelled) setName(r.name);
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [slug]);

	useEffect(() => {
		document.body.className = isDarkTheme ? "bg-zinc-950 text-white" : "bg-zinc-100 text-black";
	}, [isDarkTheme]);

	const toggle = (id: string) =>
		setOpenIds((prev) => {
			const next = new Set(prev);
			if (!next.delete(id)) next.add(id);
			return next;
		});
	const allOpen = openIds.size === SOP_SECTIONS.length;
	const setAll = () => setOpenIds(allOpen ? new Set() : new Set(SOP_SECTIONS.map((s) => s.id)));

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-500";
	const icon = isDarkTheme ? "text-emerald-400" : "text-[#0B4A42]";
	const pill = isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100";

	return (
		<div className="min-h-screen">
			<div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
				<button
					type="button"
					onClick={onBack}
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${pill}`}
				>
					<ArrowLeft size={16} />
					Menu
				</button>

				<header>
					<h1 className="text-2xl font-bold tracking-tight">{name} — SOP</h1>
					<p className={`text-sm ${muted}`}>Standard operating procedures for the kitchen team.</p>
				</header>

				<div className="grid gap-3 sm:grid-cols-2">
					<a
						href={`/${slug}/recipe-book`}
						className={`flex items-start gap-3 rounded-2xl border p-4 hover:opacity-90 ${card}`}
					>
						<BookOpen size={22} className={`mt-0.5 ${icon}`} />
						<div>
							<p className="font-semibold">Recipe book</p>
							<p className={`text-xs ${muted}`}>Portions, methods and videos for every dish.</p>
						</div>
					</a>
					<div className={`flex items-start gap-3 rounded-2xl border p-4 ${card}`}>
						<QrCode size={22} className={`mt-0.5 ${icon}`} />
						<div>
							<p className="font-semibold">Clock in / clock out</p>
							<p className={`text-xs ${muted}`}>
								Scan your own QR badge with your phone camera at the start and end of every shift.
							</p>
						</div>
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold uppercase tracking-wide">Procedures</h2>
						<button
							type="button"
							onClick={setAll}
							className={`px-3 py-1 rounded-full text-xs font-semibold border ${pill}`}
						>
							{allOpen ? "Collapse all" : "Expand all"}
						</button>
					</div>
					{SOP_SECTIONS.map((section) => (
						<SopAccordion
							key={section.id}
							section={section}
							open={openIds.has(section.id)}
							onToggle={() => toggle(section.id)}
							isDarkTheme={isDarkTheme}
						/>
					))}
				</div>
			</div>
		</div>
	);
};
