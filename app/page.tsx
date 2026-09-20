"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Ready");
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleConvert = async () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setStatus("Please paste a YouTube URL");
      return;
    }

    try {
      const parsedUrl = new URL(trimmedUrl);

      const isYouTube =
        parsedUrl.hostname === "youtube.com" ||
        parsedUrl.hostname === "www.youtube.com" ||
        parsedUrl.hostname === "youtu.be";

      if (!isYouTube) {
        setStatus("Please enter a valid YouTube URL");
        return;
      }

      setStatus("Converting...");
      setDownloadUrl("");

      const response = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (data.downloadUrl) {
        setStatus("Download ready!");
        setDownloadUrl(data.downloadUrl);
      } else {
        setStatus(data.message);
      }
    } catch {
      setStatus("Something went wrong");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            YouTube → MP4
          </h1>

          <p className="mt-4 text-zinc-400 text-base sm:text-lg">
            Download videos as MP4
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
          <div className="space-y-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube URL..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600 transition"
            />

            <button
              type="button"
              onClick={handleConvert}
              className="w-full rounded-xl bg-white px-4 py-4 font-medium text-black transition hover:bg-zinc-200 active:scale-[0.99]"
            >
              Convert
            </button>
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-6">
            <p className="text-sm text-zinc-500">Status</p>

            <p className="mt-2 text-sm text-zinc-300">{status}</p>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="mt-4 inline-block rounded-xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-zinc-200 transition"
              >
                Download MP4
              </a>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Personal tool
        </p>
      </div>
    </main>
  );
}