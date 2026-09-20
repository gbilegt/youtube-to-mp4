import { NextResponse } from "next/server";
import { execFile } from "child_process";

const YT_DLP =
  "C:\\Users\\jakel\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe";

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

    const result = await new Promise<string>((resolve, reject) => {
      execFile(
        YT_DLP,
        ["--no-playlist", "--print", "%(title)s", url],
        { timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
            return;
          }

          resolve(stdout.trim());
        }
      );
    });

    return NextResponse.json({
      message: "Video found!",
      title: result,
    });
  } catch (error) {
    console.error("yt-dlp error:", error);

    return NextResponse.json(
      { message: "Could not fetch video information" },
      { status: 500 }
    );
  }
}