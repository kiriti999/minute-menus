import { LoadingScreen } from "@minute-menus/ui";
import type { SopSection } from "@minute-menus/types";
import { BookOpen, ChevronDown, ChevronsDownUp, ChevronsUpDown, Printer, QrCode } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { BackButton } from "../components/BackButton";
import { RecipeBookSignIn } from "../components/RecipeBookSignIn";
import { type BackDestination, type BackTo, staffBack } from "../lib/backNavigation";
import { useRecipeBookAccess } from "../hooks/useRecipeBookAccess";
import { supabaseService } from "../services/supabaseService";

export interface SopPageProps {
	isDarkTheme: boolean;
	slug: string;
	/** Receives the destination chosen for this visitor (see lib/backNavigation.ts). */
	onBack: (to: BackTo) => void;
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
		<section className={`rounded-2xl border print:break-inside-avoid print:!bg-white print:!border-zinc-300 ${card}`}>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				className="w-full flex items-center gap-3 px-4 py-3 text-left print:cursor-default"
			>
				<div className="flex-1 min-w-0">
					<h2 className="text-base font-semibold">{section.title}</h2>
					<p className={`text-xs ${muted}`}>{section.summary}</p>
				</div>
				<span className={`text-xs ${muted}`}>{section.checklist.length} steps</span>
				<ChevronDown size={18} className={`transition-transform print:hidden ${open ? "rotate-180" : ""}`} />
			</button>
			{/* Always in the DOM so printing / saving as PDF includes every procedure. */}
			<ol className={`px-4 pb-4 space-y-2 text-sm list-decimal list-inside marker:font-semibold ${open ? "" : "hidden print:block"}`}>
				{section.checklist.map((step) => (
					<li key={step} className="leading-relaxed">
						{step}
					</li>
				))}
			</ol>
		</section>
	);
};

/** Signed-in view of the SOP: quick links plus expandable procedures, printable as PDF. */
const SopContent: React.FC<SopPageProps & { back: BackDestination }> = ({ isDarkTheme, slug, back, onBack }) => {
	const [openIds, setOpenIds] = useState<Set<string>>(new Set());
	const [name, setName] = useState(titleFromSlug(slug));
	const [sections, setSections] = useState<SopSection[] | null>(null);
	const [error, setError] = useState("");

	// Real restaurant name plus the SOP itself; the database only answers for the owner and team.
	useEffect(() => {
		let cancelled = false;
		supabaseService
			.getRestaurantBySlug(slug)
			.then(async (restaurant) => {
				if (!restaurant) throw new Error(`Restaurant "${slug}" not found`);
				if (restaurant.name && !cancelled) setName(restaurant.name);
				const rows = await supabaseService.getSopSections(restaurant.id);
				if (!cancelled) setSections(rows);
			})
			.catch((e: unknown) => {
				if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the SOP");
			});
		return () => {
			cancelled = true;
		};
	}, [slug]);

	const toggle = (id: string) =>
		setOpenIds((prev) => {
			const next = new Set(prev);
			if (!next.delete(id)) next.add(id);
			return next;
		});
	const list = sections ?? [];
	const allOpen = list.length > 0 && openIds.size === list.length;
	const setAll = () => setOpenIds(allOpen ? new Set() : new Set(list.map((s) => s.id)));

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-500";
	const icon = isDarkTheme ? "text-emerald-400" : "text-[#0B4A42]";
	const pill = isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100";

	return (
		<div className="min-h-screen print:!bg-white print:!text-black">
			<style>{`@page { size: A4; margin: 12mm 12mm 16mm; @bottom-center { content: counter(page) " / " counter(pages); font-size: 9px; color: #52525b; } }`}</style>
			<div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
				<div className="flex items-center gap-2 print:hidden">
					<BackButton label={back.label} onClick={() => onBack(back.to)} isDarkTheme={isDarkTheme} className="mr-auto" />
					<button
						type="button"
						onClick={() => window.print()}
						aria-label="Print or save as PDF"
						title="Print / save as PDF"
						className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-sm font-semibold bg-[#0B4A42] text-white hover:opacity-90"
					>
						<Printer size={16} />
						<span className="hidden sm:inline">Print / PDF</span>
					</button>
				</div>

				<header>
					<h1 className="text-2xl font-bold tracking-tight">{name} — SOP</h1>
					<p className={`text-sm ${muted} print:!text-zinc-600`}>Standard operating procedures for the kitchen team.</p>
				</header>

				<div className="grid gap-3 sm:grid-cols-2 print:hidden">
					<a
						href={`/${slug}/recipe-book`}
						className={`flex items-start gap-3 rounded-2xl border p-4 hover:opacity-90 ${card}`}
					>
						<BookOpen size={22} className={`mt-0.5 ${icon}`} />
						<div>
							<p className="font-semibold">Recipe book</p>
							<p className={`text-xs ${muted}`}>
								Portions, methods and videos for every dish. Team sign-in required.
							</p>
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
							aria-label={allOpen ? "Collapse all procedures" : "Expand all procedures"}
							className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border print:hidden ${pill}`}
						>
							{allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
							<span className="hidden sm:inline">{allOpen ? "Collapse all" : "Expand all"}</span>
						</button>
					</div>
					{error && <p className="text-sm text-red-500">{error}</p>}
					{!error && sections === null && <p className={`text-sm ${muted}`}>Loading procedures…</p>}
					{list.map((section) => (
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

/**
 * Staff SOP hub. Only the owner and team members (the same people as the recipe book) can open it:
 * the procedures live in the database behind that check, not in the public bundle.
 */
export const SopPage: React.FC<SopPageProps> = (props) => {
	const access = useRecipeBookAccess(props.slug);
	const publicBack = staffBack("sop", null, props.slug);
	useNoIndex();
	useEffect(() => {
		document.body.className = props.isDarkTheme
			? "bg-zinc-950 text-white overflow-auto"
			: "bg-zinc-100 text-black overflow-auto";
	}, [props.isDarkTheme]);

	if (access.status === "checking") return <LoadingScreen label="Checking access…" />;
	if (access.status === "error") {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
				<p className="text-sm text-red-500">{access.message}</p>
				<BackButton label={publicBack.label} onClick={() => props.onBack(publicBack.to)} isDarkTheme={props.isDarkTheme} />
			</div>
		);
	}
	if (access.status !== "granted") {
		return (
			<RecipeBookSignIn
				isDarkTheme={props.isDarkTheme}
				restaurantName={access.restaurantName}
				slug={props.slug}
				title="SOP"
				backLabel={publicBack.label}
				deniedEmail={access.status === "denied" ? access.email : undefined}
				onBack={() => props.onBack(publicBack.to)}
			/>
		);
	}
	return <SopContent {...props} back={staffBack("sop", access.role, props.slug)} />;
};
