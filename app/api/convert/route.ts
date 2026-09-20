import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import os from "os";
import fs from "fs/promises";
import crypto from "crypto";
import { createReadStream } from "fs";

const YT_DLP = "yt-dlp";
const FFMPEG = "ffmpeg";

function cleanFileName(name: string) {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function runYtDlp(args: string[], timeout: number) {
  return new Promise<{ stdout: string; stderr: string }>(
    (resolve, reject) => {
      execFile(
        YT_DLP,
        args,
        {
          timeout,
          env: {
            ...process.env,
            YTDLP_POT_PROVIDER: "http://127.0.0.1:4416",
          },
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
            return;
          }

          resolve({ stdout, stderr });
        }
      );
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json(
        { message: "URL is required" },
        { status: 400 }
      );
    }

    const { stdout: infoOutput } = await runYtDlp(
      [
        "--no-playlist",
        "--extractor-args",
        "youtube:player_client=mweb",
        "--print",
        "%(uploader)s|||%(title)s",
        url,
      ],
      30000
    );

    const [uploader, title] = infoOutput.trim().split("|||");

    const artist = cleanFileName(uploader || "Unknown Artist");
    const cleanTitle = cleanFileName(title || "Unknown Title");

    const fileName = `${artist} - ${cleanTitle}.mp4`;

    const tempDir = path.join(os.tmpdir(), "youtube-to-mp4");

    await fs.mkdir(tempDir, { recursive: true });

    const tempName = `${crypto.randomUUID()}.mp4`;
    const tempPath = path.join(tempDir, tempName);

    await runYtDlp(
      [
        "--no-playlist",
        "--extractor-args",
        "youtube:player_client=mweb",
        "-f",
        "bestvideo+bestaudio/best",
        "--merge-output-format",
        "mp4",
        "--ffmpeg-location",
        FFMPEG,
        "--newline",
        "--progress",
        "-o",
        tempPath,
        url,
      ],
      300000
    );

    const file = await fs.open(tempPath, "r");
    const stat = await file.stat();

    const nodeStream = createReadStream(tempPath);

    const stream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => {
          controller.enqueue(chunk);
        });

        nodeStream.on("end", async () => {
          controller.close();

          try {
            await fs.unlink(tempPath);
          } catch {
            // Ignore cleanup errors
          }
        });

        nodeStream.on("error", async (error) => {
          controller.error(error);

          try {
            await fs.unlink(tempPath);
          } catch {
            // Ignore cleanup errors
          }
        });
      },

      cancel() {
        nodeStream.destroy();

        fs.unlink(tempPath).catch(() => {});
      },
    });

    await file.close();

    return new Response(stream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Download failed",
      },
      { status: 500 }
    );
  }
}