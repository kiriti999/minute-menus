import type { StaffClockStatus, StaffClockToggleResult } from "@minute-menus/types";
import { Clock, LogIn, LogOut } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { supabaseService } from "../services/supabaseService";

function formatTime(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export interface StaffClockPageProps {
	slug: string;
	badgeToken: string | null;
}

export const StaffClockPage: React.FC<StaffClockPageProps> = ({ slug, badgeToken }) => {
	const [restaurantName, setRestaurantName] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [toggleResult, setToggleResult] = useState<StaffClockToggleResult | null>(null);
	const [status, setStatus] = useState<StaffClockStatus | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadStatus() {
			if (!badgeToken) {
				setLoadError("Missing badge on this link. Scan your assigned QR sticker.");
				setLoading(false);
				return;
			}

			try {
				const restaurant = await supabaseService.getRestaurantBySlug(slug);
				if (!restaurant) {
					setLoadError("Restaurant not found");
					return;
				}
				if (!cancelled) setRestaurantName(restaurant.name);

				const current = await supabaseService.getStaffClockStatus(badgeToken);
				if (!cancelled) {
					setStatus(current);
					if (!current.ok) setLoadError(current.error ?? "Could not load clock status");
				}
			} catch (err) {
				if (!cancelled) {
					setLoadError(err instanceof Error ? err.message : "Something went wrong");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void loadStatus();
		return () => {
			cancelled = true;
		};
	}, [slug, badgeToken]);

	async function handleToggle() {
		if (!badgeToken || saving) return;
		setSaving(true);
		setActionError(null);
		try {
			const result = await supabaseService.toggleStaffClock(badgeToken);
			setToggleResult(result);
			if (!result.ok) {
				setActionError(result.error ?? "Could not update time log");
				return;
			}
			const current = await supabaseService.getStaffClockStatus(badgeToken);
			setStatus(current);
		} catch (err) {
			setActionError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setSaving(false);
		}
	}

	const isIn =
		toggleResult?.action === "in" ||
		(toggleResult?.action !== "out" && Boolean(status?.isClockedIn));
	const staffName = toggleResult?.staffName ?? status?.staffName;
	const eventAt = toggleResult?.at ?? status?.lastEventAt;
	const ready = !loading && !loadError && Boolean(staffName);

	return (
		<div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
			<div className="w-full max-w-sm text-center space-y-6">
				<div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
					<Clock size={32} className="text-emerald-400" />
				</div>

				{restaurantName && (
					<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{restaurantName}</p>
				)}

				{loading && <p className="text-zinc-400 animate-pulse">Loading…</p>}

				{!loading && loadError && (
					<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
						{loadError}
					</div>
				)}

				{ready && (
					<>
						<h1 className="text-3xl font-semibold tracking-tight">{staffName}</h1>
						<div
							className={`rounded-2xl p-6 border ${
								isIn ? "bg-emerald-500/10 border-emerald-500/40" : "bg-zinc-900 border-zinc-700"
							}`}
						>
							<div className="flex items-center justify-center gap-2 mb-2">
								{isIn ? (
									<LogIn size={22} className="text-emerald-400" />
								) : (
									<LogOut size={22} className="text-zinc-400" />
								)}
								<span className={`text-xl font-bold ${isIn ? "text-emerald-300" : "text-zinc-300"}`}>
									{isIn ? "Clocked in" : "Clocked out"}
								</span>
							</div>
							{eventAt && <p className="text-sm text-zinc-400">{formatTime(eventAt)}</p>}
						</div>

						{actionError && (
							<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 text-sm">
								{actionError}
							</div>
						)}

						<button
							type="button"
							onClick={() => void handleToggle()}
							disabled={saving}
							className={`w-full rounded-2xl py-4 text-lg font-semibold transition disabled:opacity-60 ${
								isIn
									? "bg-zinc-100 text-zinc-900 hover:bg-white"
									: "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
							}`}
						>
							{saving ? "Saving…" : isIn ? "Clock out" : "Clock in"}
						</button>

						<p className="text-xs text-zinc-500 leading-relaxed">
							Tap once to start or end a shift. For two slots the same day (e.g. 9am–3pm, then
							6pm–11pm), clock out after the first shift, then clock in again for the next.
						</p>
					</>
				)}
			</div>
		</div>
	);
};
