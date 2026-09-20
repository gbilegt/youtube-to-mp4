import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const YT_DLP =
  "C:\\Users\\jakel\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe";

const FFMPEG =
  "C:\\Users\\jakel\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin";

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

    const downloadDir = path.join(process.cwd(), "public", "downloads");

    await fs.mkdir(downloadDir, { recursive: true });

    const fileName = `${crypto.randomUUID()}.mp4`;
    const outputPath = path.join(downloadDir, fileName);

    await new Promise<void>((resolve, reject) => {
      execFile(
        YT_DLP,
        [
          "--no-playlist",
          "-f",
          "bestvideo+bestaudio/best",
          "--merge-output-format",
          "mp4",
          "--ffmpeg-location",
          FFMPEG,
          "-o",
          outputPath,
          url,
        ],
        { timeout: 300000 },
        (error, stdout, stderr) => {
          if (error) {
            console.error(stderr);
            reject(error);
            return;
          }

          resolve();
        }
      );
    });

    return NextResponse.json({
      message: "Download ready!",
      downloadUrl: `/downloads/${fileName}`,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Download failed" },
      { status: 500 }
    );
  }
}