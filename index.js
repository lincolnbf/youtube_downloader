const fs = require("fs");
const ytdl = require("ytdl-core");

const VIDEO_PATH = "video_urls";

getVideoUrlArr = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(VIDEO_PATH, "utf8", (_, data) => {
      resolve(data.split("\n"));
    });
  });
};

createVideoName = (index) => {
  return Date.now() + "video" + index + ".mp4";
};

endedVideoListener = (index) => {
  console.log("✅ Video " + (index + 1) + " ended");
};

errorVideoListener = (index) => {
  console.log("❌ Video " + (index + 1) + " error");
};

init = async () => {
  const videos = await getVideoUrlArr();

  videos.forEach(async (video, index) => {
    const currentVideo = ytdl(video, {
      quality: "highestvideo",
      format: "mp4",
    });

    const currentVideoInfo = await ytdl.getBasicInfo(video);
    console.log("Downloading...", currentVideoInfo.videoDetails.title);

    currentVideo
      .addListener("end", () => endedVideoListener(index))
      .addListener("error", () => errorVideoListener(index))
      .pipe(fs.createWriteStream(createVideoName(index + 1)));
  });
};

init();
