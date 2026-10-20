import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfferLetterDetails, StaffDocument } from "@minute-menus/types";
import type { Database, Json } from "@minute-menus/types/db";

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["staff_documents"]["Row"];

const BUCKET = "staff-documents";
const SIGNED_URL_TTL_SECONDS = 300;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const COLUMNS = "id, restaurant_id, staff_id, kind, title, file_path, details, created_at";

function mapRow(row: Row): StaffDocument {
	return {
		id: row.id,
		restaurantId: row.restaurant_id,
		staffId: row.staff_id,
		kind: "offer_letter",
		title: row.title,
		filePath: row.file_path,
		details: row.details as unknown as OfferLetterDetails | null,
		createdAt: row.created_at,
	};
}

function safeFileName(name: string): string {
	return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export async function listStaffDocuments(client: Client, restaurantId: string): Promise<StaffDocument[]> {
	const { data, error } = await client
		.from("staff_documents")
		.select(COLUMNS)
		.eq("restaurant_id", restaurantId)
		.order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []).map(mapRow);
}

export async function createGeneratedOfferLetter(
	client: Client,
	restaurantId: string,
	staffId: string,
	details: OfferLetterDetails,
): Promise<StaffDocument> {
	const { data, error } = await client
		.from("staff_documents")
		.insert({
			restaurant_id: restaurantId,
			staff_id: staffId,
			title: `Offer letter — ${details.role}`,
			details: details as unknown as Json,
		})
		.select(COLUMNS)
		.single();
	if (error) throw error;
	return mapRow(data);
}

export async function uploadOfferLetter(
	client: Client,
	restaurantId: string,
	staffId: string,
	file: File,
): Promise<StaffDocument> {
	if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is too large (max 10 MB)");
	const path = `${restaurantId}/${staffId}/${Date.now()}-${safeFileName(file.name)}`;
	const { error: uploadErr } = await client.storage.from(BUCKET).upload(path, file, {
		contentType: file.type || "application/pdf",
	});
	if (uploadErr) throw uploadErr;

	const { data, error } = await client
		.from("staff_documents")
		.insert({ restaurant_id: restaurantId, staff_id: staffId, title: file.name, file_path: path })
		.select(COLUMNS)
		.single();
	if (error) {
		await client.storage.from(BUCKET).remove([path]);
		throw error;
	}
	return mapRow(data);
}

export async function getStaffDocumentUrl(client: Client, filePath: string): Promise<string> {
	const { data, error } = await client.storage.from(BUCKET).createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);
	if (error) throw error;
	return data.signedUrl;
}

export async function deleteStaffDocument(client: Client, doc: StaffDocument): Promise<void> {
	const { error } = await client.from("staff_documents").delete().eq("id", doc.id);
	if (error) throw error;
	if (doc.filePath) await client.storage.from(BUCKET).remove([doc.filePath]);
}
