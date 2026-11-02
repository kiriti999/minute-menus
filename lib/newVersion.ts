const BUNDLE = /\/assets\/index-[A-Za-z0-9_-]+\.js/;

/** Hashed main bundle this page was loaded with, or null in dev (unhashed). */
function loadedBundle(): string | null {
	for (const script of Array.from(document.scripts)) {
		const hit = BUNDLE.exec(script.src);
		if (hit) return hit[0];
	}
	return null;
}

/**
 * True when a newer deploy exists than the one this open tab loaded.
 * A single-page app never picks up new code on its own, so an old tab keeps showing old recipes.
 */
export async function isNewVersionAvailable(): Promise<boolean> {
	const current = loadedBundle();
	if (!current) return false;
	const response = await fetch("/", { cache: "no-store" });
	if (!response.ok) return false;
	const live = BUNDLE.exec(await response.text())?.[0];
	return Boolean(live && live !== current);
}
