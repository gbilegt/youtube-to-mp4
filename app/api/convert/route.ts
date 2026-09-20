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

    const info = await new Promise<{
      title: string;
      uploader: string;
    }>((resolve, reject) => {
      execFile(
        YT_DLP,
        [
          "--no-playlist",
          "--extractor-args",
          "youtube:player_client=android",
          "--print",
          "%(uploader)s|||%(title)s",
          url,
        ],
        { timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
            return;
          }

          const [uploader, title] = stdout.trim().split("|||");

          resolve({
            uploader: uploader || "Unknown Artist",
            title: title || "Unknown Title",
          });
        }
      );
    });

    const artist = cleanFileName(info.uploader);
    const title = cleanFileName(info.title);

    const fileName = `${artist} - ${title}.mp4`;

    const tempDir = path.join(os.tmpdir(), "youtube-to-mp4");

    await fs.mkdir(tempDir, { recursive: true });

    const tempName = `${crypto.randomUUID()}.mp4`;
    const tempPath = path.join(tempDir, tempName);

    await new Promise<void>((resolve, reject) => {
      execFile(
        YT_DLP,
        [
          "--no-playlist",
          "--extractor-args",
          "youtube:player_client=android",
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
        { timeout: 300000 },
        (error, stdout, stderr) => {
          console.log(stdout);

          if (error) {
            console.error(stderr);
            reject(error);
            return;
          }

          resolve();
        }
      );
    });

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
      { message: "Download failed" },
      { status: 500 }
    );
  }
}