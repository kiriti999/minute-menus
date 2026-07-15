import type { MenuItemForStorageGuide, OwnerAiSettings, StorageGuideResult } from "@minute-menus/types";
import { getErrorMessage } from "@minute-menus/errors";
import { FileSpreadsheet, FileText, Loader2, Refrigerator, Sparkles } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
	buildStorageGuideExcel,
	downloadStorageGuideExcel,
	openStorageGuidePrintWindow,
	writeStorageGuidePdf,
} from "../lib/storageGuide/buildStorageGuideExport";
import { supabaseService } from "../services/supabaseService";

export interface StorageGuidePanelProps {
	menuItems: MenuItemForStorageGuide[];
	restaurantId: string;
	restaurantSlug: string;
	isDarkTheme: boolean;
}

function menuPayloadFromItems(
	items: StorageGuidePanelProps["menuItems"],
): MenuItemForStorageGuide[] {
	return items.filter((item) => item.name.trim());
}

export const StorageGuidePanel: React.FC<StorageGuidePanelProps> = ({
	menuItems,
	restaurantId,
	restaurantSlug,
	isDarkTheme,
}) => {
	const [aiSettings, setAiSettings] = useState<OwnerAiSettings | null>(null);
	const [loadingSettings, setLoadingSettings] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState("");
	const [showKeyModal, setShowKeyModal] = useState(false);
	const [apiKeyInput, setApiKeyInput] = useState("");
	const [savingKey, setSavingKey] = useState(false);
	const [pendingFormat, setPendingFormat] = useState<"pdf" | "excel" | null>(null);
	const [lastGuide, setLastGuide] = useState<StorageGuideResult | null>(null);

	const card = isDarkTheme ? "bg-zinc-900/60 border-zinc-800" : "bg-emerald-50/80 border-emerald-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-600";
	const input = isDarkTheme
		? "bg-zinc-950 border-zinc-700 text-white"
		: "bg-white border-zinc-300 text-zinc-900";

	const scanItems = useMemo(() => menuPayloadFromItems(menuItems), [menuItems]);
	const dishCount = scanItems.length;

	const loadSettings = useCallback(async () => {
		setLoadingSettings(true);
		try {
			const settings = await supabaseService.getOwnerAiSettings();
			setAiSettings(settings);
		} catch {
			setAiSettings({ hasAnthropicApiKey: false, anthropicModel: "claude-haiku-4-5" });
		} finally {
			setLoadingSettings(false);
		}
	}, []);

	useEffect(() => {
		void loadSettings();
	}, [loadSettings]);

	const requestGuide = async (): Promise<StorageGuideResult | null> => {
		const { data: sessionData } = await supabase.auth.getSession();
		const token = sessionData.session?.access_token;
		if (!token) throw new Error("Please sign in again");

		const res = await fetch("/api/parse-invoice", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				action: "storage-guide",
				restaurantId,
				menuItems: scanItems,
			}),
		});

		const raw = await res.text();
		let body: unknown;
		try {
			body = JSON.parse(raw);
		} catch {
			throw new Error(
				raw.trim().slice(0, 180) || `Server returned a non-JSON response (${res.status})`,
			);
		}

		const asRecord = body as StorageGuideResult & {
			error?: string;
			message?: string;
			detail?: string;
		};

		if (res.status === 428 || asRecord.error === "invalid_api_key") {
			if (asRecord.error === "invalid_api_key") {
				setError(
					asRecord.message ??
						"Your Claude API key was rejected. Paste a valid key from console.anthropic.com.",
				);
			}
			setShowKeyModal(true);
			return null;
		}
		if (!res.ok) {
			throw new Error(
				asRecord.message ?? asRecord.detail ?? asRecord.error ?? "Failed to generate guide",
			);
		}

		// Normalize: API should return { tips, ... }; tolerate a bare tips array.
		if (Array.isArray(body)) {
			return {
				generatedAt: new Date().toISOString(),
				restaurantName: restaurantSlug || "Restaurant",
				tips: body as StorageGuideResult["tips"],
			};
		}
		if (!Array.isArray(asRecord.tips) || asRecord.tips.length === 0) {
			throw new Error("Storage guide response had no tips");
		}
		return {
			generatedAt: asRecord.generatedAt || new Date().toISOString(),
			restaurantName: asRecord.restaurantName || restaurantSlug || "Restaurant",
			tips: asRecord.tips,
		};
	};

	const runExport = async (format: "pdf" | "excel") => {
		if (!dishCount) {
			setError("Add menu items with ingredients in the Menu Editor first.");
			return;
		}
		if (!aiSettings?.hasAnthropicApiKey) {
			setPendingFormat(format);
			setShowKeyModal(true);
			return;
		}

		// Must open before any await — browsers block window.open after async work.
		let printWin: Window | null = null;
		if (format === "pdf") {
			try {
				printWin = openStorageGuidePrintWindow();
			} catch (err) {
				setError(getErrorMessage(err));
				return;
			}
		}

		setGenerating(true);
		setError("");
		try {
			const guide = lastGuide ?? (await requestGuide());
			if (!guide) {
				printWin?.close();
				return;
			}
			setLastGuide(guide);
			if (format === "pdf" && printWin) {
				writeStorageGuidePdf(printWin, guide);
			} else {
				const buffer = await buildStorageGuideExcel(guide);
				downloadStorageGuideExcel(buffer, restaurantSlug || "restaurant");
			}
		} catch (err) {
			printWin?.close();
			setError(getErrorMessage(err));
		} finally {
			setGenerating(false);
			setPendingFormat(null);
		}
	};

	const saveApiKey = async () => {
		const trimmed = apiKeyInput.trim().replace(/^["']+|["']+$/g, "");
		if (!trimmed) return;
		if (!trimmed.startsWith("sk-ant-")) {
			setError("Claude keys start with sk-ant-. Get one from console.anthropic.com/settings/keys");
			return;
		}
		setSavingKey(true);
		setError("");
		try {
			await supabaseService.saveOwnerAnthropicKey(trimmed);
			setApiKeyInput("");
			setShowKeyModal(false);
			await loadSettings();
			if (pendingFormat) await runExport(pendingFormat);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSavingKey(false);
		}
	};

	return (
		<section className={`border rounded-xl p-5 space-y-4 ${card}`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2
						className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}
					>
						<Refrigerator size={16} /> Storage &amp; preservation guide
					</h2>
					<p className={`text-sm mt-1 max-w-xl ${muted}`}>
						AI scans all {dishCount} menu item{dishCount !== 1 ? "s" : ""} and ingredients, then builds
						simple fridge / pantry storage hacks for your kitchen team.
					</p>
					<p className={`text-[11px] mt-1 ${muted}`}>
						Uses Claude Haiku · your API key is saved privately to your account
						{aiSettings?.hasAnthropicApiKey ? (
							<>
								{" · "}
								<button
									type="button"
									onClick={() => {
										setPendingFormat(null);
										setShowKeyModal(true);
									}}
									className="underline"
								>
									Update key
								</button>
							</>
						) : null}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						disabled={generating || loadingSettings || !dishCount}
						onClick={() => void runExport("pdf")}
						className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${
							isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
						}`}
					>
						{generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
						Export PDF
					</button>
					<button
						type="button"
						disabled={generating || loadingSettings || !dishCount}
						onClick={() => void runExport("excel")}
						className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50 ${
							isDarkTheme ? "border-zinc-600 text-white" : "border-zinc-300 text-zinc-900"
						}`}
					>
						{generating ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
						Export Excel
					</button>
				</div>
			</div>

			{error && <p className="text-sm text-red-400">{error}</p>}

			{lastGuide && !generating && (
				<p className={`text-xs ${muted}`}>
					Last guide: {lastGuide.tips.length} ingredients ·{" "}
					{new Date(lastGuide.generatedAt).toLocaleString("en-IN")}
				</p>
			)}

			{showKeyModal && (
				<div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70">
					<div
						className={`w-full max-w-md rounded-xl border p-5 space-y-4 ${isDarkTheme ? "bg-zinc-900 border-zinc-700" : "bg-white border-zinc-200"}`}
					>
						<h3 className={`font-semibold flex items-center gap-2 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
							<Sparkles size={16} /> {aiSettings?.hasAnthropicApiKey ? "Update Claude API key" : "Claude API key required"}
						</h3>
						<p className={`text-sm ${muted}`}>
							Get a key from{" "}
							<a
								href="https://console.anthropic.com/settings/keys"
								target="_blank"
								rel="noreferrer"
								className="underline"
							>
								console.anthropic.com
							</a>
							. Paste the full key (starts with <code className="text-xs">sk-ant-</code>). We use{" "}
							<strong>Claude Haiku</strong> for fast, low-cost scans. Your key stays in your private
							account settings — never shared with other restaurants.
						</p>
						<input
							type="password"
							value={apiKeyInput}
							onChange={(e) => setApiKeyInput(e.target.value)}
							placeholder="sk-ant-..."
							className={`w-full rounded-lg border px-3 py-2 text-sm ${input}`}
						/>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									setShowKeyModal(false);
									setPendingFormat(null);
								}}
								className={`px-3 py-2 text-sm ${muted}`}
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={savingKey || !apiKeyInput.trim()}
								onClick={() => void saveApiKey()}
								className={`px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${
									isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
								}`}
							>
								{savingKey ? "Saving…" : "Save & continue"}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
};
