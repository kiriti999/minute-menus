import type React from "react";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { DASHBOARD_TEAM_DOCUMENTS_PATH, DASHBOARD_TEAM_PATH, isDashboardTeamDocumentsPath } from "../lib/dashboardRoute";
import { TeamView } from "./TeamView";
import { TeamDocumentsTab } from "./team/TeamDocumentsTab";

type TeamTab = "team" | "documents";

interface TeamPageProps {
	isDarkTheme: boolean;
	isPlus: boolean;
	/** Opens the Plus paywall; returns true when the user is blocked. */
	onRequirePlus: (reason: string) => boolean;
}

function tabFromPath(): TeamTab {
	return isDashboardTeamDocumentsPath(window.location.pathname) ? "documents" : "team";
}

export const TeamPage: React.FC<TeamPageProps> = ({ isDarkTheme, isPlus, onRequirePlus }) => {
	const [tab, setTab] = useState<TeamTab>(tabFromPath);

	useEffect(() => {
		const onPopState = () => setTab(tabFromPath());
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	const selectTab = (next: TeamTab) => {
		if (next === "documents" && onRequirePlus("HR Documents")) return;
		setTab(next);
		window.history.pushState({}, "", next === "documents" ? DASHBOARD_TEAM_DOCUMENTS_PATH : DASHBOARD_TEAM_PATH);
	};

	const showDocuments = tab === "documents" && isPlus;
	const tabClass = (active: boolean) =>
		`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${
			active
				? isDarkTheme
					? "bg-white text-black"
					: "bg-zinc-900 text-white"
				: isDarkTheme
					? "text-zinc-500 hover:text-white"
					: "text-zinc-500 hover:text-zinc-900"
		}`;

	return (
		<div className="w-full min-w-0 space-y-5">
			<div className="flex gap-1">
				<button type="button" className={tabClass(!showDocuments)} onClick={() => selectTab("team")}>
					Badges &amp; Staff
				</button>
				<button type="button" className={tabClass(showDocuments)} onClick={() => selectTab("documents")}>
					Documents {!isPlus && <Lock size={11} />}
				</button>
			</div>
			{showDocuments ? <TeamDocumentsTab isDarkTheme={isDarkTheme} /> : <TeamView isDarkTheme={isDarkTheme} />}
		</div>
	);
};
