import type { RestaurantStaffMember, StaffBadge, WeeklyStaffHours } from "@minute-menus/types";
import { Download, Loader2, Pencil, Plus, Printer, QrCode, UserMinus, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getErrorMessage } from "@minute-menus/errors";
import { supabaseService } from "../services/supabaseService";

export interface TeamViewProps {
	isDarkTheme: boolean;
}

function mondayOfWeek(date = new Date()): string {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	return d.toISOString().slice(0, 10);
}

function badgeClockUrl(slug: string, badgeToken: string): string {
	const base = import.meta.env.VITE_SITE_URL || window.location.origin;
	return `${base}/clock/${slug}?badge=${encodeURIComponent(badgeToken)}`;
}

function exportWeeklyCsv(rows: WeeklyStaffHours[], weekStart: string) {
	const header = "Staff,Phone,Total Hours,Days Worked\n";
	const body = rows
		.map((r) =>
			[`"${r.staffName.replace(/"/g, '""')}"`, r.phone ?? "", r.totalHours.toFixed(2), r.daysWorked].join(","),
		)
		.join("\n");
	const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `team-hours-${weekStart}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

const BadgePrintCard: React.FC<{ label: string; staffName: string | null; url: string }> = ({
	label,
	staffName,
	url,
}) => (
	<div className="bg-white text-black rounded-lg border border-zinc-200 p-4 flex flex-col items-center gap-2 print:break-inside-avoid">
		<p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</p>
		<QRCodeSVG value={url} size={120} level="H" />
		{staffName && <p className="text-sm font-semibold">{staffName}</p>}
		<p className="text-[10px] text-zinc-500 text-center">Scan to clock in / out</p>
	</div>
);

const TEAM_BADGE_PRINT_STYLE = `
@media print {
	body.printing-team-badge * { visibility: hidden; }
	body.printing-team-badge #team-badge-print-root,
	body.printing-team-badge #team-badge-print-root * { visibility: visible; }
	body.printing-team-badge #team-badge-print-root {
		position: fixed;
		inset: 0;
		display: flex !important;
		align-items: center;
		justify-content: center;
	}
}
`;

export const TeamView: React.FC<TeamViewProps> = ({ isDarkTheme }) => {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [slug, setSlug] = useState("");
	const [badges, setBadges] = useState<StaffBadge[]>([]);
	const [staff, setStaff] = useState<RestaurantStaffMember[]>([]);
	const [weeklyHours, setWeeklyHours] = useState<WeeklyStaffHours[]>([]);
	const [weekStart, setWeekStart] = useState(mondayOfWeek());
	const [printBadge, setPrintBadge] = useState<StaffBadge | null>(null);

	const [newStaffName, setNewStaffName] = useState("");
	const [newStaffPhone, setNewStaffPhone] = useState("");
	const [assignStaffId, setAssignStaffId] = useState<Record<string, string>>({});
	const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
	const [editStaffName, setEditStaffName] = useState("");
	const [editStaffPhone, setEditStaffPhone] = useState("");

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-500";
	const input = isDarkTheme
		? "bg-zinc-950 border-zinc-700 text-white"
		: "bg-zinc-50 border-zinc-300 text-zinc-900";

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const details = await supabaseService.getRestaurantDetails();
			setSlug(details.slug);
			const [badgeRows, staffRows, hours] = await Promise.all([
				supabaseService.listStaffBadges(),
				supabaseService.listRestaurantStaff(),
				supabaseService.getWeeklyStaffHours(weekStart),
			]);
			setBadges(badgeRows);
			setStaff(staffRows);
			setWeeklyHours(hours);
			const assign: Record<string, string> = {};
			for (const b of badgeRows) {
				if (b.assignedStaffId) assign[b.id] = b.assignedStaffId;
			}
			setAssignStaffId(assign);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [weekStart]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		let style = document.getElementById("team-badge-print-style");
		if (!style) {
			style = document.createElement("style");
			style.id = "team-badge-print-style";
			style.textContent = TEAM_BADGE_PRINT_STYLE;
			document.head.appendChild(style);
		}
	}, []);

	useEffect(() => {
		if (!printBadge) return;
		document.body.classList.add("printing-team-badge");
		return () => document.body.classList.remove("printing-team-badge");
	}, [printBadge]);

	const handleAddBadge = async () => {
		setSaving(true);
		try {
			const label = `Badge ${badges.length + 1}`;
			await supabaseService.createStaffBadge(label);
			await load();
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	const handleAddStaff = async () => {
		if (!newStaffName.trim()) return;
		setSaving(true);
		try {
			await supabaseService.upsertRestaurantStaff({
				name: newStaffName.trim(),
				phone: newStaffPhone.trim() || null,
			});
			setNewStaffName("");
			setNewStaffPhone("");
			await load();
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	const handleAssign = async (badgeId: string) => {
		const staffId = assignStaffId[badgeId] || null;
		setSaving(true);
		try {
			await supabaseService.assignBadgeToStaff(badgeId, staffId);
			await load();
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	const handleDeactivate = async (staffId: string) => {
		if (!window.confirm("Deactivate this staff member? Their badge will be unassigned.")) return;
		setSaving(true);
		try {
			await supabaseService.deactivateRestaurantStaff(staffId);
			if (editingStaffId === staffId) setEditingStaffId(null);
			await load();
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	const startEditStaff = (member: RestaurantStaffMember) => {
		setEditingStaffId(member.id);
		setEditStaffName(member.name);
		setEditStaffPhone(member.phone ?? "");
	};

	const cancelEditStaff = () => {
		setEditingStaffId(null);
		setEditStaffName("");
		setEditStaffPhone("");
	};

	const handleSaveStaff = async () => {
		if (!editingStaffId || !editStaffName.trim()) return;
		setSaving(true);
		try {
			await supabaseService.upsertRestaurantStaff({
				id: editingStaffId,
				name: editStaffName.trim(),
				phone: editStaffPhone.trim() || null,
			});
			cancelEditStaff();
			await load();
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	const activeStaff = staff.filter((s) => s.active);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="animate-spin text-zinc-400" size={28} />
			</div>
		);
	}

	return (
		<div className="space-y-8 pb-12">
			<div>
				<h1 className={`text-3xl font-light tracking-tight mb-1 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
					Team
				</h1>
				<p className={`text-sm ${muted}`}>
					Reusable QR badge stickers — reassign staff without reprinting.
				</p>
			</div>

			{error && (
				<div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
					{error}
				</div>
			)}

			<section className={`rounded-xl border p-6 space-y-4 ${card}`}>
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<h2 className={`text-lg font-semibold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>QR Badges</h2>
					<button
						type="button"
						onClick={() => void handleAddBadge()}
						disabled={saving || badges.length >= 6}
						className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
							isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
						} disabled:opacity-50`}
					>
						<Plus size={14} /> Add badge
					</button>
				</div>

				{badges.length === 0 && (
					<p className={`text-sm ${muted}`}>Add two badges for your staff stickers (print once, reuse forever).</p>
				)}

				<div className="grid gap-4 md:grid-cols-2">
					{badges.map((badge) => {
						const url = slug ? badgeClockUrl(slug, badge.badgeToken) : "";
						return (
							<div key={badge.id} className={`rounded-lg border p-4 space-y-3 ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className={`font-semibold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>{badge.label}</p>
										<p className={`text-xs ${muted}`}>
											{badge.assignedStaffName ? `Assigned: ${badge.assignedStaffName}` : "Unassigned"}
										</p>
									</div>
									{url && (
										<button
											type="button"
											onClick={() => setPrintBadge(badge)}
											className={`p-2 rounded-lg border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-200 hover:bg-zinc-100"}`}
											title="Print sticker"
										>
											<Printer size={16} />
										</button>
									)}
								</div>
								{url && (
									<div className="flex items-center gap-3">
										<QRCodeSVG value={url} size={64} level="H" bgColor={isDarkTheme ? "#18181b" : "#ffffff"} fgColor={isDarkTheme ? "#fff" : "#000"} />
										<p className={`text-[10px] break-all flex-1 ${muted}`}>{url}</p>
									</div>
								)}
								<div className="flex gap-2">
									<select
										value={assignStaffId[badge.id] ?? ""}
										onChange={(e) =>
											setAssignStaffId((prev) => ({ ...prev, [badge.id]: e.target.value }))
										}
										className={`flex-1 text-sm rounded-lg border px-2 py-1.5 ${input}`}
									>
										<option value="">Unassigned</option>
										{activeStaff.map((s) => (
											<option key={s.id} value={s.id}>
												{s.name}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={() => void handleAssign(badge.id)}
										disabled={saving}
										className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
											isDarkTheme ? "bg-zinc-800 text-white" : "bg-zinc-200 text-zinc-900"
										}`}
									>
										Save
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			<section className={`rounded-xl border p-6 space-y-4 ${card}`}>
				<h2 className={`text-lg font-semibold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>Staff</h2>
				<div className="flex flex-wrap gap-2">
					<input
						type="text"
						placeholder="Name"
						value={newStaffName}
						onChange={(e) => setNewStaffName(e.target.value)}
						className={`rounded-lg border px-3 py-2 text-sm ${input}`}
					/>
					<input
						type="tel"
						placeholder="Mobile (optional)"
						value={newStaffPhone}
						onChange={(e) => setNewStaffPhone(e.target.value)}
						className={`rounded-lg border px-3 py-2 text-sm ${input}`}
					/>
					<button
						type="button"
						onClick={() => void handleAddStaff()}
						disabled={saving || !newStaffName.trim()}
						className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
							isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
						} disabled:opacity-50`}
					>
						<Plus size={14} /> Add staff
					</button>
				</div>
				<ul className="divide-y divide-zinc-800/50">
					{staff.map((s) => {
						const isEditing = editingStaffId === s.id;
						return (
						<li key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							{isEditing ? (
								<div className="flex flex-wrap gap-2 flex-1">
									<input
										type="text"
										value={editStaffName}
										onChange={(e) => setEditStaffName(e.target.value)}
										placeholder="Name"
										className={`rounded-lg border px-3 py-2 text-sm min-w-[140px] ${input}`}
									/>
									<input
										type="tel"
										value={editStaffPhone}
										onChange={(e) => setEditStaffPhone(e.target.value)}
										placeholder="Mobile (optional)"
										className={`rounded-lg border px-3 py-2 text-sm min-w-[140px] ${input}`}
									/>
								</div>
							) : (
								<div>
									<p className={`font-medium ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
										{s.name}
										{!s.active && (
											<span className="ml-2 text-xs text-zinc-500">(inactive)</span>
										)}
									</p>
									{s.phone ? (
										<p className={`text-xs ${muted}`}>{s.phone}</p>
									) : (
										<p className={`text-xs ${muted}`}>No mobile number</p>
									)}
								</div>
							)}
							<div className="flex items-center gap-2 shrink-0">
								{isEditing ? (
									<>
										<button
											type="button"
											onClick={() => void handleSaveStaff()}
											disabled={saving || !editStaffName.trim()}
											className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
												isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
											} disabled:opacity-50`}
										>
											Save
										</button>
										<button
											type="button"
											onClick={cancelEditStaff}
											disabled={saving}
											className={`p-2 rounded-lg border ${isDarkTheme ? "border-zinc-700 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}
											title="Cancel"
										>
											<X size={14} />
										</button>
									</>
								) : (
									<>
										<button
											type="button"
											onClick={() => startEditStaff(s)}
											disabled={saving}
											className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
												isDarkTheme ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" : "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
											}`}
										>
											<Pencil size={14} /> Edit
										</button>
										{s.active && (
											<button
												type="button"
												onClick={() => void handleDeactivate(s.id)}
												className="text-xs text-red-400 inline-flex items-center gap-1 hover:underline"
											>
												<UserMinus size={14} /> Deactivate
											</button>
										)}
									</>
								)}
							</div>
						</li>
						);
					})}
				</ul>
			</section>

			<section className={`rounded-xl border p-6 space-y-4 ${card}`}>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className={`text-lg font-semibold flex items-center gap-2 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
						<QrCode size={18} /> Weekly hours
					</h2>
					<div className="flex items-center gap-2">
						<input
							type="date"
							value={weekStart}
							onChange={(e) => setWeekStart(e.target.value)}
							className={`rounded-lg border px-2 py-1 text-sm ${input}`}
						/>
						<button
							type="button"
							onClick={() => exportWeeklyCsv(weeklyHours, weekStart)}
							disabled={weeklyHours.length === 0}
							className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border ${
								isDarkTheme ? "border-zinc-700 text-white" : "border-zinc-300 text-zinc-900"
							} disabled:opacity-50`}
						>
							<Download size={14} /> CSV
						</button>
					</div>
				</div>
				{weeklyHours.length === 0 ? (
					<p className={`text-sm ${muted}`}>No time logs for this week yet.</p>
				) : (
					<table className="w-full text-sm">
						<thead>
							<tr className={`text-left text-xs uppercase ${muted}`}>
								<th className="pb-2">Staff</th>
								<th className="pb-2">Phone</th>
								<th className="pb-2 text-right">Hours</th>
								<th className="pb-2 text-right">Days</th>
							</tr>
						</thead>
						<tbody>
							{weeklyHours.map((row) => (
								<tr key={row.staffId} className={isDarkTheme ? "border-t border-zinc-800" : "border-t border-zinc-100"}>
									<td className={`py-2 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>{row.staffName}</td>
									<td className={`py-2 ${muted}`}>{row.phone ?? "—"}</td>
									<td className={`py-2 text-right font-mono ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
										{row.totalHours.toFixed(1)}h
									</td>
									<td className={`py-2 text-right ${muted}`}>{row.daysWorked}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>

			{printBadge && slug && (
				<>
					<div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
						<div className="bg-zinc-900 rounded-xl max-w-md w-full p-6 space-y-4">
							<h3 className="text-white font-semibold">Print badge sticker</h3>
							<p className="text-zinc-400 text-sm">
								Use Print — only the sticker below is sent to the printer (no dashboard or browser UI).
							</p>
							<BadgePrintCard
								label={printBadge.label}
								staffName={printBadge.assignedStaffName ?? null}
								url={badgeClockUrl(slug, printBadge.badgeToken)}
							/>
							<div className="flex gap-2 justify-end">
								<button type="button" onClick={() => setPrintBadge(null)} className="text-zinc-400 text-sm px-3 py-2">
									Close
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2"
								>
									<Printer size={14} /> Print
								</button>
							</div>
						</div>
					</div>
					{createPortal(
						<div id="team-badge-print-root" aria-hidden="true">
							<BadgePrintCard
								label={printBadge.label}
								staffName={printBadge.assignedStaffName ?? null}
								url={badgeClockUrl(slug, printBadge.badgeToken)}
							/>
						</div>,
						document.body,
					)}
				</>
			)}
		</div>
	);
};
