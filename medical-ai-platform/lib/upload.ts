import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function persistUploadedFile(file: File, uploadsSubdir = "uploads") {
    const uploadsDir = path.join(process.cwd(), "public", uploadsSubdir);
    await mkdir(uploadsDir, { recursive: true });

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const filename = `${randomUUID()}.${extension}`;
    const absolutePath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(absolutePath, Buffer.from(bytes));

    return {
        bytes,
        filename,
        relativeUrl: `/${uploadsSubdir}/${filename}`,
        mimeType: file.type || null,
        size: file.size,
        originalName: file.name,
    };
}
