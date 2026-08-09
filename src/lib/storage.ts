import { put } from "@vercel/blob";

export const storageConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/** Upload a public file to blob storage, return its URL. Requires BLOB_READ_WRITE_TOKEN. */
export async function uploadPublic(file: File, prefix = "uploads"): Promise<string> {
  const safe = file.name.replace(/[^\w.-]/g, "_");
  const key = `${prefix}/${Date.now()}-${safe}`;
  const blob = await put(key, file, { access: "public" });
  return blob.url;
}
