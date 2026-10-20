/** Owner-only dashboard URLs. "dashboard" is a reserved slug, so these never hit the customer routes. */
export const DASHBOARD_TEAM_PATH = "/dashboard/team";
export const DASHBOARD_TEAM_DOCUMENTS_PATH = "/dashboard/team/documents";

export function isDashboardPath(pathname: string): boolean {
	return /^\/dashboard(\/|$)/i.test(pathname);
}

export function isDashboardTeamPath(pathname: string): boolean {
	return /^\/dashboard\/team(\/|$)/i.test(pathname);
}

export function isDashboardTeamDocumentsPath(pathname: string): boolean {
	return /^\/dashboard\/team\/documents\/?$/i.test(pathname);
}
