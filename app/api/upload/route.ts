import { type NextRequest, NextResponse } from "next/server";
import { minioClient, PutObjectCommand, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Verify staff session cookie
  const cookieStore = await cookies();
  const staffSession = cookieStore.get("staff_session");
  if (!staffSession?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const urls: string[] = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and create unique key
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `kaizen/${Date.now()}-${sanitizedName}`;

    await minioClient.send(
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const publicUrl = `${MINIO_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
    urls.push(publicUrl);
  }

  return NextResponse.json({ urls });
}
