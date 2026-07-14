import type { StaffTimeShift, WeeklyStaffHours } from "@minute-menus/types";

const LOCALE = "en-IN";

export function formatShiftDate(iso: string): string {
	return new Date(iso).toLocaleDateString(LOCALE, {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export function formatShiftTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(LOCALE, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatShiftClockOut(iso: string | null): string {
	if (!iso) return "Still in";
	return formatShiftTime(iso);
}

export function exportWeeklyHoursCsv(rows: WeeklyStaffHours[], weekStart: string): void {
	const summaryHeader = "Staff,Phone,Total Hours,Days Worked\n";
	const summaryBody = rows
		.map((r) =>
			[
				`"${r.staffName.replace(/"/g, '""')}"`,
				r.phone ?? "",
				r.totalHours.toFixed(2),
				r.daysWorked,
			].join(","),
		)
		.join("\n");

	const shiftHeader = "\n\nStaff,Phone,Date,Clock In,Clock Out,Session Hours\n";
	const shiftBody = rows
		.flatMap((r) =>
			r.shifts.map((s) => shiftCsvRow(r.staffName, r.phone, s)),
		)
		.join("\n");

	const blob = new Blob([summaryHeader + summaryBody + shiftHeader + shiftBody], {
		type: "text/csv;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `team-hours-${weekStart}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

function shiftCsvRow(staffName: string, phone: string | null, shift: StaffTimeShift): string {
	return [
		`"${staffName.replace(/"/g, '""')}"`,
		phone ?? "",
		formatShiftDate(shift.clockInAt),
		formatShiftTime(shift.clockInAt),
		shift.clockOutAt ? formatShiftTime(shift.clockOutAt) : "Still in",
		shift.hours.toFixed(2),
	].join(",");
}
