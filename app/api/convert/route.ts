import { NextResponse } from "next/server";
import { spawn, execFile } from "child_process";
import path from "path";
import fs from "fs/promises";

const YT_DLP =
  "C:\\Users\\jakel\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe";

const FFMPEG =
  "C:\\Users\\jakel\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin";

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
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    const info = await new Promise<{
      title: string;
      uploader: string;
    }>((resolve, reject) => {
      execFile(
        YT_DLP,
        ["--no-playlist", "--print", "%(uploader)s|||%(title)s", url],
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
        },
      );
    });

    const artist = cleanFileName(info.uploader);
    const title = cleanFileName(info.title);

    const fileName = `${artist} - ${title}.mp4`;

    const downloadDir = path.join(process.cwd(), "public", "downloads");

    await fs.mkdir(downloadDir, { recursive: true });

    const outputPath = path.join(downloadDir, fileName);

    const args = [
      "--no-playlist",
      "-f",
      "bestvideo+bestaudio/best",
      "--merge-output-format",
      "mp4",
      "--ffmpeg-location",
      FFMPEG,
      "--newline",
      "--progress",
      "-o",
      outputPath,
      url,
    ];

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const process = spawn(YT_DLP, args);

        process.stdout.on("data", (data: Buffer) => {
          const output = data.toString();

          console.log("YT-DLP:", JSON.stringify(output));

          const matches = output.match(/(\d+(?:\.\d+)?)%/g);

          if (matches) {
            const lastMatch = matches[matches.length - 1];
            const progress = parseFloat(lastMatch);

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "progress",
                  progress,
                }) + "\n",
              ),
            );
          }
        });

        process.stderr.on("data", (data: Buffer) => {
          console.error(data.toString());
        });

        process.on("close", (code) => {
          if (code === 0) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "complete",
                  downloadUrl: `/downloads/${fileName}`,
                }) + "\n",
              ),
            );
          } else {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  message: "Download failed",
                }) + "\n",
              ),
            );
          }

          controller.close();
        });

        process.on("error", (error) => {
          console.error(error);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ message: "Download failed" }, { status: 500 });
  }
}
