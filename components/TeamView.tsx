import type { RestaurantStaffMember, StaffBadge, WeeklyStaffHours } from "@minute-menus/types";
import { getErrorMessage } from "@minute-menus/errors";
import {
	Check,
	Copy,
	Download,
	Loader2,
	Pencil,
	Plus,
	Printer,
	QrCode,
	Trash2,
	UserMinus,
	Users,
	X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	exportWeeklyHoursCsv,
	formatShiftClockOut,
	formatShiftDate,
	formatShiftTime,
} from "../lib/teamTimeFormat";
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

function shortClockPath(slug: string, badgeToken: string): string {
	return `/clock/${slug}?badge=${badgeToken.slice(0, 8)}…`;
}

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

const WeeklyHoursTables: React.FC<{
	rows: WeeklyStaffHours[];
	isDarkTheme: boolean;
	muted: string;
}> = ({ rows, isDarkTheme, muted }) => {
	const border = isDarkTheme ? "border-t border-zinc-800" : "border-t border-zinc-100";
	const text = isDarkTheme ? "text-white" : "text-zinc-900";
	const shiftRows = rows.flatMap((row) =>
		row.shifts.map((shift) => ({ row, shift, key: `${row.staffId}-${shift.clockInAt}` })),
	);
	const cardBorder = isDarkTheme ? "border-zinc-800" : "border-zinc-200";
	const cardBg = isDarkTheme ? "bg-zinc-950/50" : "bg-zinc-50";

	return (
		<div className="space-y-5">
			<ul className="sm:hidden space-y-2">
				{rows.map((row) => (
					<li key={row.staffId} className={`rounded-xl border p-3.5 ${cardBorder} ${cardBg}`}>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className={`font-medium truncate ${text}`}>{row.staffName}</p>
								<p className={`text-xs ${muted} truncate`}>{row.phone ?? "No phone"}</p>
							</div>
							<p className={`shrink-0 font-mono text-sm tabular-nums ${text}`}>
								{row.totalHours.toFixed(1)}h
							</p>
						</div>
						<p className={`mt-2 text-xs ${muted}`}>
							{row.daysWorked} day{row.daysWorked === 1 ? "" : "s"}
						</p>
					</li>
				))}
			</ul>

			<div className="hidden sm:block overflow-x-auto">
				<table className="w-full text-sm min-w-[360px]">
					<thead>
						<tr className={`text-left text-xs uppercase tracking-wide ${muted}`}>
							<th className="pb-2 pr-3 font-medium">Staff</th>
							<th className="pb-2 pr-3 font-medium">Phone</th>
							<th className="pb-2 text-right font-medium">Hours</th>
							<th className="pb-2 text-right font-medium">Days</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr key={row.staffId} className={border}>
								<td className={`py-2.5 pr-3 ${text}`}>{row.staffName}</td>
								<td className={`py-2.5 pr-3 ${muted}`}>{row.phone ?? "—"}</td>
								<td className={`py-2.5 text-right font-mono tabular-nums ${text}`}>
									{row.totalHours.toFixed(1)}h
								</td>
								<td className={`py-2.5 text-right ${muted}`}>{row.daysWorked}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{shiftRows.length > 0 && (
				<div>
					<h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${muted}`}>
						Clock in / out
					</h3>
					<ul className="sm:hidden space-y-2">
						{shiftRows.map(({ row, shift, key }) => (
							<li key={key} className={`rounded-xl border p-3.5 ${cardBorder} ${cardBg}`}>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<p className={`font-medium truncate ${text}`}>{row.staffName}</p>
										<p className={`text-xs ${muted}`}>{formatShiftDate(shift.clockInAt)}</p>
									</div>
									<p className={`shrink-0 font-mono text-sm tabular-nums ${text}`}>
										{shift.hours.toFixed(1)}h
									</p>
								</div>
								<div className="mt-3 grid grid-cols-2 gap-3 text-sm">
									<div>
										<p className={`text-[10px] uppercase tracking-wide ${muted}`}>In</p>
										<p className={`font-mono tabular-nums ${text}`}>
											{formatShiftTime(shift.clockInAt)}
										</p>
									</div>
									<div>
										<p className={`text-[10px] uppercase tracking-wide ${muted}`}>Out</p>
										<p className={`font-mono tabular-nums ${muted}`}>
											{formatShiftClockOut(shift.clockOutAt)}
										</p>
									</div>
								</div>
							</li>
						))}
					</ul>
					<div className="hidden sm:block overflow-x-auto">
						<table className="w-full text-sm min-w-[520px]">
							<thead>
								<tr className={`text-left text-xs uppercase tracking-wide ${muted}`}>
									<th className="pb-2 pr-3 font-medium">Staff</th>
									<th className="pb-2 pr-3 font-medium">Date</th>
									<th className="pb-2 pr-3 font-medium">Clock in</th>
									<th className="pb-2 pr-3 font-medium">Clock out</th>
									<th className="pb-2 text-right font-medium">Hours</th>
								</tr>
							</thead>
							<tbody>
								{shiftRows.map(({ row, shift, key }) => (
									<tr key={key} className={border}>
										<td className={`py-2.5 pr-3 ${text}`}>{row.staffName}</td>
										<td className={`py-2.5 pr-3 ${muted}`}>{formatShiftDate(shift.clockInAt)}</td>
										<td className={`py-2.5 pr-3 font-mono tabular-nums ${text}`}>
											{formatShiftTime(shift.clockInAt)}
										</td>
										<td className={`py-2.5 pr-3 font-mono tabular-nums ${muted}`}>
											{formatShiftClockOut(shift.clockOutAt)}
										</td>
										<td className={`py-2.5 text-right font-mono tabular-nums ${text}`}>
											{shift.hours.toFixed(1)}h
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
};

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

type ThemeBits = {
	isDarkTheme: boolean;
	card: string;
	muted: string;
	input: string;
	text: string;
	innerBorder: string;
};

const BadgeCard: React.FC<{
	badge: StaffBadge;
	slug: string;
	activeStaff: RestaurantStaffMember[];
	assignValue: string;
	saving: boolean;
	theme: ThemeBits;
	onAssignChange: (staffId: string) => void;
	onSave: () => void;
	onPrint: () => void;
	onDelete: () => void;
}> = ({
	badge,
	slug,
	activeStaff,
	assignValue,
	saving,
	theme,
	onAssignChange,
	onSave,
	onPrint,
	onDelete,
}) => {
	const [copied, setCopied] = useState(false);
	const url = slug ? badgeClockUrl(slug, badge.badgeToken) : "";
	const { isDarkTheme, muted, input, text, innerBorder } = theme;

	const handleCopy = async () => {
		if (!url) return;
		const ok = await copyText(url);
		if (!ok) return;
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	};

	return (
		<div className={`rounded-xl border p-3.5 sm:p-4 space-y-3.5 min-w-0 ${innerBorder}`}>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className={`font-semibold ${text}`}>{badge.label}</p>
					<p className={`text-xs mt-0.5 truncate ${muted}`}>
						{badge.assignedStaffName ? `Assigned · ${badge.assignedStaffName}` : "Unassigned"}
					</p>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					{url && (
						<button
							type="button"
							onClick={onPrint}
							className={`p-2 rounded-lg border ${
								isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-200 hover:bg-zinc-100"
							}`}
							title="Print sticker"
							aria-label="Print sticker"
						>
							<Printer size={16} />
						</button>
					)}
					<button
						type="button"
						onClick={onDelete}
						disabled={saving}
						className={`p-2 rounded-lg border text-red-400 disabled:opacity-50 ${
							isDarkTheme ? "border-zinc-700 hover:bg-red-950/40" : "border-zinc-200 hover:bg-red-50"
						}`}
						title="Delete badge"
						aria-label="Delete badge"
					>
						<Trash2 size={16} />
					</button>
				</div>
			</div>

			{url && (
				<div className="flex items-center gap-3 min-w-0">
					<div
						className={`shrink-0 rounded-lg p-1.5 ${isDarkTheme ? "bg-zinc-950" : "bg-white border border-zinc-100"}`}
					>
						<QRCodeSVG
							value={url}
							size={72}
							level="H"
							bgColor={isDarkTheme ? "#09090b" : "#ffffff"}
							fgColor={isDarkTheme ? "#fff" : "#000"}
						/>
					</div>
					<div className="min-w-0 flex-1 space-y-2">
						<p className={`text-[11px] font-mono truncate ${muted}`}>{shortClockPath(slug, badge.badgeToken)}</p>
						<button
							type="button"
							onClick={() => void handleCopy()}
							className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${
								isDarkTheme
									? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
									: "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
							}`}
						>
							{copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
							{copied ? "Copied" : "Copy link"}
						</button>
					</div>
				</div>
			)}

			<div className="flex flex-col sm:flex-row gap-2">
				<select
					value={assignValue}
					onChange={(e) => onAssignChange(e.target.value)}
					className={`w-full min-w-0 flex-1 text-sm rounded-lg border px-2.5 py-2.5 sm:py-2 ${input}`}
					aria-label={`Assign ${badge.label}`}
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
					onClick={onSave}
					disabled={saving}
					className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold shrink-0 ${
						isDarkTheme
							? "bg-zinc-800 text-white hover:bg-zinc-700"
							: "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
					}`}
				>
					Save
				</button>
			</div>
		</div>
	);
};

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

	const text = isDarkTheme ? "text-white" : "text-zinc-900";
	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-500";
	const input = isDarkTheme
		? "bg-zinc-950 border-zinc-700 text-white"
		: "bg-zinc-50 border-zinc-300 text-zinc-900";
	const innerBorder = isDarkTheme ? "border-zinc-800" : "border-zinc-200";
	const theme: ThemeBits = { isDarkTheme, card, muted, input, text, innerBorder };

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

	const handleDeleteBadge = async (badge: StaffBadge) => {
		const who = badge.assignedStaffName ? ` (assigned to ${badge.assignedStaffName})` : "";
		if (!window.confirm(`Delete ${badge.label}${who}? The printed sticker QR will stop working.`)) {
			return;
		}
		setSaving(true);
		setError(null);
		try {
			if (printBadge?.id === badge.id) setPrintBadge(null);
			await supabaseService.deleteStaffBadge(badge.id);
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
		<div className="w-full min-w-0 max-w-5xl space-y-5 sm:space-y-7 pb-12 overflow-x-hidden">
			<header className="min-w-0">
				<h1 className={`text-2xl sm:text-3xl font-light tracking-tight mb-1 ${text}`}>Team</h1>
				<p className={`text-sm ${muted}`}>
					Reusable QR badge stickers — reassign staff without reprinting.
				</p>
			</header>

			{error && (
				<div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 sm:px-4 py-3 text-sm text-red-400 break-words">
					{error}
				</div>
			)}

			<section className={`rounded-2xl border p-4 sm:p-6 space-y-4 min-w-0 ${card}`}>
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<h2 className={`text-base sm:text-lg font-semibold ${text}`}>QR Badges</h2>
						<p className={`text-xs mt-0.5 ${muted}`}>
							{badges.length}/6 · print once, reassign anytime
						</p>
					</div>
					<button
						type="button"
						onClick={() => void handleAddBadge()}
						disabled={saving || badges.length >= 6}
						className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 ${
							isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
						} disabled:opacity-50`}
					>
						<Plus size={14} />
						<span className="hidden sm:inline">Add badge</span>
						<span className="sm:hidden">Add</span>
					</button>
				</div>

				{badges.length === 0 ? (
					<p className={`text-sm ${muted}`}>
						Add badges for your staff stickers (print once, reuse forever).
					</p>
				) : (
					<div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
						{badges.map((badge) => (
							<BadgeCard
								key={badge.id}
								badge={badge}
								slug={slug}
								activeStaff={activeStaff}
								assignValue={assignStaffId[badge.id] ?? ""}
								saving={saving}
								theme={theme}
								onAssignChange={(staffId) =>
									setAssignStaffId((prev) => ({ ...prev, [badge.id]: staffId }))
								}
								onSave={() => void handleAssign(badge.id)}
								onPrint={() => setPrintBadge(badge)}
								onDelete={() => void handleDeleteBadge(badge)}
							/>
						))}
					</div>
				)}
			</section>

			<section className={`rounded-2xl border p-4 sm:p-6 space-y-4 min-w-0 ${card}`}>
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<h2 className={`text-base sm:text-lg font-semibold flex items-center gap-2 ${text}`}>
							<Users size={18} className="shrink-0 opacity-70" />
							Staff
						</h2>
						<p className={`text-xs mt-0.5 ${muted}`}>
							{activeStaff.length} active
							{staff.length > activeStaff.length
								? ` · ${staff.length - activeStaff.length} inactive`
								: ""}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
					<input
						type="text"
						placeholder="Name"
						value={newStaffName}
						onChange={(e) => setNewStaffName(e.target.value)}
						className={`w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm ${input}`}
					/>
					<input
						type="tel"
						placeholder="Mobile (optional)"
						value={newStaffPhone}
						onChange={(e) => setNewStaffPhone(e.target.value)}
						className={`w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm ${input}`}
					/>
					<button
						type="button"
						onClick={() => void handleAddStaff()}
						disabled={saving || !newStaffName.trim()}
						className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap ${
							isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
						} disabled:opacity-50`}
					>
						<Plus size={14} /> Add staff
					</button>
				</div>

				{staff.length === 0 ? (
					<p className={`text-sm ${muted}`}>No staff yet. Add someone to assign a badge.</p>
				) : (
					<ul className="space-y-2">
						{staff.map((s) => {
							const isEditing = editingStaffId === s.id;
							return (
								<li
									key={s.id}
									className={`rounded-xl border p-3 sm:p-3.5 min-w-0 ${innerBorder} ${
										s.active ? "" : "opacity-60"
									}`}
								>
									{isEditing ? (
										<div className="flex flex-col gap-2">
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												<input
													type="text"
													value={editStaffName}
													onChange={(e) => setEditStaffName(e.target.value)}
													placeholder="Name"
													className={`w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm ${input}`}
												/>
												<input
													type="tel"
													value={editStaffPhone}
													onChange={(e) => setEditStaffPhone(e.target.value)}
													placeholder="Mobile (optional)"
													className={`w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm ${input}`}
												/>
											</div>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => void handleSaveStaff()}
													disabled={saving || !editStaffName.trim()}
													className={`px-3 py-2 rounded-xl text-xs font-bold ${
														isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
													} disabled:opacity-50`}
												>
													Save
												</button>
												<button
													type="button"
													onClick={cancelEditStaff}
													disabled={saving}
													className={`p-2 rounded-xl border ${
														isDarkTheme
															? "border-zinc-700 text-zinc-400"
															: "border-zinc-200 text-zinc-500"
													}`}
													title="Cancel"
													aria-label="Cancel edit"
												>
													<X size={14} />
												</button>
											</div>
										</div>
									) : (
										<div className="flex items-start sm:items-center justify-between gap-3">
											<div className="min-w-0">
												<p className={`font-medium break-words ${text}`}>
													{s.name}
													{!s.active && (
														<span className="ml-2 text-xs font-normal text-zinc-500">
															(inactive)
														</span>
													)}
												</p>
												<p className={`text-xs mt-0.5 truncate ${muted}`}>
													{s.phone || "No mobile number"}
												</p>
											</div>
											<div className="flex items-center gap-1.5 shrink-0">
												<button
													type="button"
													onClick={() => startEditStaff(s)}
													disabled={saving}
													className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs inline-flex items-center gap-1 ${
														isDarkTheme
															? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
															: "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
													}`}
													title="Edit"
													aria-label={`Edit ${s.name}`}
												>
													<Pencil size={14} />
													<span className="hidden sm:inline">Edit</span>
												</button>
												{s.active && (
													<button
														type="button"
														onClick={() => void handleDeactivate(s.id)}
														className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-red-500/30 text-red-400 text-xs inline-flex items-center gap-1 hover:bg-red-500/10"
														title="Deactivate"
														aria-label={`Deactivate ${s.name}`}
													>
														<UserMinus size={14} />
														<span className="hidden sm:inline">Deactivate</span>
													</button>
												)}
											</div>
										</div>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</section>

			<section className={`rounded-2xl border p-4 sm:p-6 space-y-4 min-w-0 ${card}`}>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<h2 className={`text-base sm:text-lg font-semibold flex items-center gap-2 ${text}`}>
							<QrCode size={18} className="shrink-0 opacity-70" />
							Weekly hours
						</h2>
						<p className={`text-xs mt-0.5 ${muted}`}>Week starting {weekStart}</p>
					</div>
					<div className="grid grid-cols-[1fr_auto] gap-2 w-full sm:w-auto sm:flex sm:items-center">
						<input
							type="date"
							value={weekStart}
							onChange={(e) => setWeekStart(e.target.value)}
							className={`w-full min-w-0 sm:w-auto rounded-xl border px-2.5 py-2.5 sm:py-2 text-sm ${input}`}
							aria-label="Week start date"
						/>
						<button
							type="button"
							onClick={() => exportWeeklyHoursCsv(weeklyHours, weekStart)}
							disabled={weeklyHours.length === 0}
							className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs font-bold border ${
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
					<WeeklyHoursTables rows={weeklyHours} isDarkTheme={isDarkTheme} muted={muted} />
				)}
			</section>

			{printBadge && slug && (
				<>
					<div className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
						<div
							className={`rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
								isDarkTheme ? "bg-zinc-900" : "bg-white"
							}`}
						>
							<h3 className={`font-semibold ${text}`}>Print badge sticker</h3>
							<p className={`text-sm ${muted}`}>
								Use Print — only the sticker below is sent to the printer.
							</p>
							<BadgePrintCard
								label={printBadge.label}
								staffName={printBadge.assignedStaffName ?? null}
								url={badgeClockUrl(slug, printBadge.badgeToken)}
							/>
							<div className="flex gap-2 justify-end pt-1">
								<button
									type="button"
									onClick={() => setPrintBadge(null)}
									className={`text-sm px-3 py-2 ${muted}`}
								>
									Close
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
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
