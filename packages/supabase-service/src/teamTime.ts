import type { SupabaseClient } from "@supabase/supabase-js";
import type {
	StaffBadge,
	RestaurantStaffMember,
	StaffClockStatus,
	StaffClockToggleResult,
	StaffTimeShift,
	WeeklyStaffHours,
} from "@minute-menus/types";
import type { Database, Json } from "@minute-menus/types/db";

type Client = SupabaseClient<Database>;

function parseClockStatus(data: Json): StaffClockStatus {
	const row = data as Record<string, unknown>;
	return {
		ok: Boolean(row.ok),
		error: typeof row.error === "string" ? row.error : undefined,
		staffName: typeof row.staff_name === "string" ? row.staff_name : undefined,
		badgeLabel: typeof row.badge_label === "string" ? row.badge_label : undefined,
		isClockedIn: typeof row.is_clocked_in === "boolean" ? row.is_clocked_in : undefined,
		lastEventAt: typeof row.last_event_at === "string" ? row.last_event_at : null,
	};
}

function parseToggleResult(data: Json): StaffClockToggleResult {
	const row = data as Record<string, unknown>;
	return {
		ok: Boolean(row.ok),
		error: typeof row.error === "string" ? row.error : undefined,
		action: row.action === "in" || row.action === "out" ? row.action : undefined,
		staffName: typeof row.staff_name === "string" ? row.staff_name : undefined,
		at: typeof row.at === "string" ? row.at : undefined,
	};
}

export async function getStaffClockStatus(client: Client, badgeToken: string): Promise<StaffClockStatus> {
	const { data, error } = await client.rpc("get_staff_clock_status", { p_badge_token: badgeToken });
	if (error) throw error;
	return parseClockStatus(data as Json);
}

export async function toggleStaffClock(client: Client, badgeToken: string): Promise<StaffClockToggleResult> {
	const { data, error } = await client.rpc("toggle_staff_clock", { p_badge_token: badgeToken });
	if (error) throw error;
	return parseToggleResult(data as Json);
}

export async function listStaffBadges(client: Client, restaurantId: string): Promise<StaffBadge[]> {
	const { data, error } = await client
		.from("staff_badges")
		.select("id, restaurant_id, badge_token, label, assigned_staff_id, created_at")
		.eq("restaurant_id", restaurantId)
		.order("created_at");
	if (error) throw error;

	const staffIds = (data ?? [])
		.map((row) => row.assigned_staff_id)
		.filter((id): id is string => Boolean(id));
	const staffById = new Map<string, { name: string; phone: string | null }>();
	if (staffIds.length > 0) {
		const { data: staffRows, error: staffErr } = await client
			.from("restaurant_staff")
			.select("id, name, phone")
			.in("id", staffIds);
		if (staffErr) throw staffErr;
		for (const s of staffRows ?? []) {
			staffById.set(s.id, { name: s.name, phone: s.phone });
		}
	}

	return (data ?? []).map((row) => {
		const assigned = row.assigned_staff_id ? staffById.get(row.assigned_staff_id) : undefined;
		return {
			id: row.id,
			restaurantId: row.restaurant_id,
			badgeToken: row.badge_token,
			label: row.label,
			assignedStaffId: row.assigned_staff_id,
			assignedStaffName: assigned?.name ?? null,
			assignedStaffPhone: assigned?.phone ?? null,
			createdAt: row.created_at,
		};
	});
}

export async function listRestaurantStaff(client: Client, restaurantId: string): Promise<RestaurantStaffMember[]> {
	const { data, error } = await client
		.from("restaurant_staff")
		.select("*")
		.eq("restaurant_id", restaurantId)
		.order("created_at");
	if (error) throw error;

	return (data ?? []).map((row) => ({
		id: row.id,
		restaurantId: row.restaurant_id,
		name: row.name,
		phone: row.phone,
		active: row.active,
		resignedAt: row.resigned_at,
		createdAt: row.created_at,
	}));
}

export async function createStaffBadge(client: Client, restaurantId: string, label: string): Promise<StaffBadge> {
	const { data, error } = await client
		.from("staff_badges")
		.insert({ restaurant_id: restaurantId, label })
		.select("id, restaurant_id, badge_token, label, assigned_staff_id, created_at")
		.single();
	if (error) throw error;
	return {
		id: data.id,
		restaurantId: data.restaurant_id,
		badgeToken: data.badge_token,
		label: data.label,
		assignedStaffId: data.assigned_staff_id,
		createdAt: data.created_at,
	};
}

export async function upsertRestaurantStaff(
	client: Client,
	restaurantId: string,
	input: { id?: string; name: string; phone?: string | null; active?: boolean },
): Promise<string> {
	if (input.id) {
		const { error } = await client
			.from("restaurant_staff")
			.update({
				name: input.name.trim(),
				phone: input.phone?.trim() || null,
				active: input.active ?? true,
				resigned_at: input.active === false ? new Date().toISOString() : null,
			})
			.eq("id", input.id);
		if (error) throw error;
		return input.id;
	}

	const { data, error } = await client
		.from("restaurant_staff")
		.insert({
			restaurant_id: restaurantId,
			name: input.name.trim(),
			phone: input.phone?.trim() || null,
			active: true,
		})
		.select("id")
		.single();
	if (error) throw error;
	return data.id;
}

export async function assignBadgeToStaff(
	client: Client,
	badgeId: string,
	staffId: string | null,
): Promise<void> {
	const { error } = await client
		.from("staff_badges")
		.update({ assigned_staff_id: staffId })
		.eq("id", badgeId);
	if (error) throw error;
}

export async function deactivateRestaurantStaff(client: Client, staffId: string): Promise<void> {
	const { error: staffErr } = await client
		.from("restaurant_staff")
		.update({ active: false, resigned_at: new Date().toISOString() })
		.eq("id", staffId);
	if (staffErr) throw staffErr;

	const { error: badgeErr } = await client
		.from("staff_badges")
		.update({ assigned_staff_id: null })
		.eq("assigned_staff_id", staffId);
	if (badgeErr) throw badgeErr;
}

function hoursBetween(start: string, end: string): number {
	const ms = new Date(end).getTime() - new Date(start).getTime();
	return Math.max(0, ms / 3_600_000);
}

export async function getWeeklyStaffHours(
	client: Client,
	restaurantId: string,
	weekStartIso: string,
): Promise<WeeklyStaffHours[]> {
	const weekStart = new Date(`${weekStartIso}T00:00:00`);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);

	const { data, error } = await client
		.from("time_logs")
		.select("staff_id, clock_in_at, clock_out_at")
		.eq("restaurant_id", restaurantId)
		.gte("clock_in_at", weekStart.toISOString())
		.lt("clock_in_at", weekEnd.toISOString());
	if (error) throw error;

	const staffIds = [...new Set((data ?? []).map((row) => row.staff_id))];
	const staffById = new Map<string, { name: string; phone: string | null }>();
	if (staffIds.length > 0) {
		const { data: staffRows, error: staffErr } = await client
			.from("restaurant_staff")
			.select("id, name, phone")
			.in("id", staffIds);
		if (staffErr) throw staffErr;
		for (const s of staffRows ?? []) {
			staffById.set(s.id, { name: s.name, phone: s.phone });
		}
	}

	const nowIso = new Date().toISOString();
	const byStaff = new Map<string, WeeklyStaffHours & { days: Set<string> }>();

	for (const row of data ?? []) {
		const staff = staffById.get(row.staff_id);
		const end = row.clock_out_at ?? nowIso;
		const hours = hoursBetween(row.clock_in_at, end);
		const dayKey = row.clock_in_at.slice(0, 10);
		const shift: StaffTimeShift = {
			clockInAt: row.clock_in_at,
			clockOutAt: row.clock_out_at,
			hours: Math.round(hours * 100) / 100,
		};
		const existing = byStaff.get(row.staff_id);
		if (existing) {
			existing.totalHours += hours;
			existing.days.add(dayKey);
			existing.daysWorked = existing.days.size;
			existing.shifts.push(shift);
		} else {
			byStaff.set(row.staff_id, {
				staffId: row.staff_id,
				staffName: staff?.name ?? "Staff",
				phone: staff?.phone ?? null,
				totalHours: hours,
				daysWorked: 1,
				days: new Set([dayKey]),
				shifts: [shift],
			});
		}
	}

	return Array.from(byStaff.values()).map(({ days: _days, ...rest }) => ({
		...rest,
		totalHours: Math.round(rest.totalHours * 100) / 100,
		shifts: rest.shifts.sort(
			(a, b) => new Date(a.clockInAt).getTime() - new Date(b.clockInAt).getTime(),
		),
	}));
}

export function mondayOfWeek(date = new Date()): string {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	return d.toISOString().slice(0, 10);
}
