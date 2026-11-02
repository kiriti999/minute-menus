import { ArrowLeft, Mail } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { supabaseService } from "../services/supabaseService";

export interface RecipeBookSignInProps {
	isDarkTheme: boolean;
	restaurantName: string;
	slug: string;
	/** Set when someone is signed in but is not on the team. */
	deniedEmail?: string;
	onBack: () => void;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** Sign-in for the recipe book: emailed one-time code or Google. Access itself is decided by the database. */
export const RecipeBookSignIn: React.FC<RecipeBookSignInProps> = ({
	isDarkTheme,
	restaurantName,
	slug,
	deniedEmail,
	onBack,
}) => {
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [codeSent, setCodeSent] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-500";
	const pill = isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100";
	const field = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B4A42] ${
		isDarkTheme ? "bg-zinc-800 border-zinc-700" : "bg-white border-zinc-300"
	}`;

	const run = async (action: () => Promise<void>) => {
		setBusy(true);
		setError("");
		try {
			await action();
		} catch (e) {
			setError(messageOf(e));
		} finally {
			setBusy(false);
		}
	};

	const sendCode = (e: React.FormEvent) => {
		e.preventDefault();
		void run(async () => {
			await supabaseService.sendRecipeBookCode(slug, email);
			setCodeSent(true);
		});
	};

	// A correct code signs the user in; the page then re-checks access on its own.
	const verifyCode = (e: React.FormEvent) => {
		e.preventDefault();
		void run(() => supabaseService.verifyRecipeBookCode(email, code));
	};

	const google = () => void run(() => supabaseService.signInWithGoogleHere());
	const signOut = () => void run(() => supabaseService.signOut());

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className={`w-full max-w-sm space-y-4 rounded-2xl border p-6 ${card}`}>
				<button
					type="button"
					onClick={onBack}
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${pill}`}
				>
					<ArrowLeft size={16} />
					Back
				</button>
				<div>
					<h1 className="text-xl font-bold">Recipe book</h1>
					<p className={`text-sm ${muted}`}>
						Only the owner and team members of {restaurantName} can open this page.
					</p>
				</div>

				{deniedEmail ? (
					<div className="space-y-3">
						<p className="text-sm text-red-500">
							{deniedEmail} is not on the {restaurantName} team. Ask the owner to add this email on the
							Team page, or sign in with a different account.
						</p>
						<button
							type="button"
							disabled={busy}
							onClick={signOut}
							className={`w-full rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${pill}`}
						>
							Sign out
						</button>
					</div>
				) : (
					<div className="space-y-3">
						<button
							type="button"
							disabled={busy}
							onClick={google}
							className={`w-full rounded-full border px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${pill}`}
						>
							Continue with Google
						</button>
						<p className={`text-center text-xs ${muted}`}>or use an emailed code</p>
						{codeSent ? (
							<form onSubmit={verifyCode} className="space-y-3">
								<p className={`text-xs ${muted}`}>If {email} is on the team, we sent it a code. Enter it here.</p>
								<input
									value={code}
									onChange={(e) => setCode(e.target.value)}
									inputMode="numeric"
									autoComplete="one-time-code"
									placeholder="Code"
									aria-label="Sign-in code"
									className={field}
								/>
								<button
									type="submit"
									disabled={busy || !code.trim()}
									className="w-full rounded-full bg-[#0B4A42] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
								>
									Verify and open
								</button>
								<button
									type="button"
									onClick={() => setCodeSent(false)}
									className={`w-full text-xs underline ${muted}`}
								>
									Use a different email
								</button>
							</form>
						) : (
							<form onSubmit={sendCode} className="space-y-3">
								<div className="relative">
									<Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
									<input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										autoComplete="email"
										placeholder="Your team email"
										aria-label="Team email"
										className={`${field} pl-9`}
									/>
								</div>
								<button
									type="submit"
									disabled={busy || !email.trim()}
									className="w-full rounded-full bg-[#0B4A42] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
								>
									Email me a code
								</button>
							</form>
						)}
						{error && <p className="text-sm text-red-500">{error}</p>}
					</div>
				)}
			</div>
		</div>
	);
};
