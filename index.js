const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");
const VIDEO_PATH = "test_videos";
const cp = require("child_process");

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

const removeSpecialCharactersFromString = (title) => {
  return title.replace(/[^a-zA-Z0-9 ]/g, "");
};

init = async () => {
  const videos = await getVideoUrlArr();
  videos.forEach((video) => {
    Promise.all([
      new Promise(async (resolve) => {
        const currentVideoInfo = await ytdl.getBasicInfo(video);
        const videoTitle = removeSpecialCharactersFromString(
          currentVideoInfo.videoDetails.title
        );

        console.log(
          "✅ [STARTED DOWNLOAD]",
          currentVideoInfo.videoDetails.title
        );

        const ffmpegProcess = cp.spawn(
          ffmpeg,
          [
            "-loglevel",
            "8",
            "-hide_banner",
            "-progress",
            "pipe:3",
            "-i",
            "pipe:4",
            "-i",
            "pipe:5",
            "-map",
            "0:a",
            "-map",
            "1:v",
            "-c:v",
            "copy",
            videoTitle + ".mp4",
          ],
          {
            windowsHide: true,
            stdio: ["inherit", "inherit", "inherit", "pipe", "pipe", "pipe"],
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
            console.log("✅ [FINISHED DOWNLOAD]", videoTitle);
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
