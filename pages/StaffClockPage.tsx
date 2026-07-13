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
	const [error, setError] = useState<string | null>(null);
	const [toggleResult, setToggleResult] = useState<StaffClockToggleResult | null>(null);
	const [status, setStatus] = useState<StaffClockStatus | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function run() {
			if (!badgeToken) {
				setError("Missing badge on this link. Scan your assigned QR sticker.");
				setLoading(false);
				return;
			}

			try {
				const restaurant = await supabaseService.getRestaurantBySlug(slug);
				if (!restaurant) {
					setError("Restaurant not found");
					return;
				}
				if (!cancelled) setRestaurantName(restaurant.name);

				const params = new URLSearchParams(window.location.search);
				const done = params.get("done") === "1";

				if (!done) {
					const result = await supabaseService.toggleStaffClock(badgeToken);
					if (!cancelled) setToggleResult(result);
					if (result.ok) {
						const next = new URLSearchParams(params);
						next.set("done", "1");
						window.history.replaceState({}, "", `${window.location.pathname}?${next.toString()}`);
					} else if (!cancelled) {
						setError(result.error ?? "Could not update time log");
					}
				}

				const current = await supabaseService.getStaffClockStatus(badgeToken);
				if (!cancelled) setStatus(current);
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Something went wrong");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void run();
		return () => {
			cancelled = true;
		};
	}, [slug, badgeToken]);

	const isIn = toggleResult?.action === "in" || (toggleResult == null && status?.isClockedIn);
	const staffName = toggleResult?.staffName ?? status?.staffName;
	const eventAt = toggleResult?.at ?? status?.lastEventAt;

	return (
		<div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
			<div className="w-full max-w-sm text-center space-y-6">
				<div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
					<Clock size={32} className="text-emerald-400" />
				</div>

				{restaurantName && (
					<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{restaurantName}</p>
				)}

				{loading && <p className="text-zinc-400 animate-pulse">Updating time log…</p>}

				{!loading && error && (
					<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
						{error}
					</div>
				)}

				{!loading && !error && staffName && (
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
							{eventAt && (
								<p className="text-sm text-zinc-400">{formatTime(eventAt)}</p>
							)}
						</div>
						<p className="text-xs text-zinc-500 leading-relaxed">
							Scan your badge again when you leave to clock out.
						</p>
					</>
				)}
			</div>
		</div>
	);
};
