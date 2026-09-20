"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedTool, setSelectedTool] = useState("youtube");

  const tools = [
    {
      id: "youtube",
      name: "YouTube → MP4",
      description: "Download videos as MP4",
    },
    {
      id: "tool2",
      name: "Tool 2",
      description: "Coming soon",
    },
    {
      id: "tool3",
      name: "Tool 3",
      description: "Coming soon",
    },
  ];

  const currentTool = tools.find(
    (tool) => tool.id === selectedTool
  );

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

      setIsConverting(true);
      setProgress(0);
      setStatus("Starting...");

      const response = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Download failed");
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength
        ? parseInt(contentLength, 10)
        : 0;

      const reader = response.body.getReader();

      const chunks: Uint8Array[] = [];
      let received = 0;

      setStatus("Downloading video...");

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        if (value) {
          chunks.push(value);
          received += value.length;

          if (total > 0) {
            const percent = Math.round(
              (received / total) * 100
            );

            setProgress(Math.min(percent, 100));
          }
        }
      }

      setStatus("Preparing download...");
      setProgress(100);

      const blob = new Blob(chunks, {
        type: "video/mp4",
      });

      const downloadUrl = URL.createObjectURL(blob);

      const contentDisposition =
        response.headers.get("content-disposition");

      let fileName = "video.mp4";

      const match = contentDisposition?.match(
        /filename="(.+)"/
      );

      if (match) {
        fileName = match[1];
      }

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(downloadUrl);

      setStatus("Download ready!");
    } catch (error) {
      console.error(error);
      setStatus("Something went wrong");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="w-full shrink-0 border-b border-zinc-800 bg-zinc-950 p-4 md:w-64 md:border-b-0 md:border-r md:p-5">
          <div>
            <h1 className="text-xl font-semibold">
              My Tools
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Personal utilities
            </p>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 md:mt-8 md:block md:space-y-2 md:overflow-visible">
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool(tool.id)}
                className={`min-w-[180px] rounded-xl px-4 py-3 text-left transition md:w-full ${
                  selectedTool === tool.id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <div className="text-sm font-medium">
                  {tool.name}
                </div>

                <div className="mt-1 text-xs text-zinc-500">
                  {tool.description}
                </div>
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-5 sm:p-8 md:p-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {currentTool?.name}
            </h2>

            <p className="mt-3 text-sm text-zinc-400 sm:text-base">
              {currentTool?.description}
            </p>

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:mt-10 sm:p-8">
              {selectedTool === "youtube" ? (
                <div className="space-y-4">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube URL..."
                    disabled={isConverting}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-white outline-none placeholder:text-zinc-500 transition focus:border-zinc-600 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="w-full rounded-xl bg-white px-4 py-4 font-medium text-black transition hover:bg-zinc-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isConverting
                      ? "Downloading..."
                      : "Convert"}
                  </button>

                  <div className="border-t border-zinc-800 pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-500">
                        {status}
                      </p>

                      {isConverting && (
                        <span className="text-sm font-medium text-zinc-300">
                          {progress}%
                        </span>
                      )}
                    </div>

                    {(isConverting || progress === 100) && (
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-white transition-all duration-200"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-zinc-400">
                    Coming soon
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}