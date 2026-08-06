import { type NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
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

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "kaizen", resource_type: "auto" }, (err, res) => {
          if (err) reject(err);
          else resolve(res as { secure_url: string });
        })
        .end(buffer);
    });

    urls.push(result.secure_url);
  }

  return NextResponse.json({ urls });
}
