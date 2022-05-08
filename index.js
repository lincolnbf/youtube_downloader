const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");
const VIDEO_PATH = "test_videos";

const cp = require("child_process");
const readline = require("readline");

const tracker = {
  start: Date.now(),
  audio: { downloaded: 0, total: Infinity },
  video: { downloaded: 0, total: Infinity },
  merged: { frame: 0, speed: "0x", fps: 0 },
};

getVideoUrlArr = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(VIDEO_PATH, "utf8", (_, data) => {
      resolve(data.split("\n"));
    });
  });
};

createVideoName = (index) => {
  return "video" + index + ".mp4";
};

endedVideoListener = (index) => {
  console.log("✅ Video " + (index + 1) + " ended");
};

errorVideoListener = (index, err) => {
  console.log("❌ Video " + (index + 1) + err);
};

removeSpecialCharactersFromString = (title) => {
  return title.replace(/[^a-zA-Z0-9 ]/g, "");
}

init = async () => {
  const videos = await getVideoUrlArr();
  console.log("All videos", videos);

  videos.forEach((video) => {
    Promise.all([
      new Promise(async (resolve, reject) => {

        const currentVideoInfo = await ytdl.getBasicInfo(video);
        const videoTitle = removeSpecialCharactersFromString(currentVideoInfo.videoDetails.title);

        
        console.log("Downloading...", currentVideoInfo.videoDetails.title);

        const ffmpegProcess = cp.spawn(
          ffmpeg,
          [
            // Remove ffmpeg's console spamming
            "-loglevel",
            "8",
            "-hide_banner",
            // Redirect/Enable progress messages
            "-progress",
            "pipe:3",
            // Set inputs
            "-i",
            "pipe:4",
            "-i",
            "pipe:5",
            // Map audio & video from streams
            "-map",
            "0:a",
            "-map",
            "1:v",
            // Keep encoding
            "-c:v",
            "copy",
            // Define output file
            videoTitle + ".mp4",
          ],
          {
            windowsHide: true,
            stdio: [
              /* Standard: stdin, stdout, stderr */
              "inherit",
              "inherit",
              "inherit",
              /* Custom: pipe:3, pipe:4, pipe:5 */
              "pipe",
              "pipe",
              "pipe",
            ],
          }
        );

        ffmpegProcess.on("close", () => {
          process.stdout.write("\n\n\n\n");
        });

        const audio = ytdl(video, { quality: "highestaudio" }).on(
          "progress",
          (_, downloaded, total) => {
            tracker.audio = { downloaded, total };
          }
        );

        const videoObj = ytdl(video, { quality: "highestvideo" })
          .on("progress", (_, downloaded, total) => {
            tracker.video = { downloaded, total };
          })
          .on("end", () => {
            resolve();
          });

        ffmpegProcess.stdio[3].on("data", (chunk) => {
          const lines = chunk.toString().trim().split("\n");
          const args = {};
          for (const l of lines) {
            const [key, value] = l.split("=");
            args[key.trim()] = value.trim();
          }
          tracker.merged = args;
        });

        audio.pipe(ffmpegProcess.stdio[4]);
        videoObj.pipe(ffmpegProcess.stdio[5]);
      }),
    ]);
  });
};

init();
