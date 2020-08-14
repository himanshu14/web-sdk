const redis = require("redis");
const bluebird = require("bluebird");
const { Worker } = require("worker_threads");
const path = require("path");
const workerScript = path.join(__dirname, "./workerScript.js");
bluebird.promisifyAll(redis.RedisClient.prototype);
const os = require("os");
const threadCount = os.cpus().length;
const client = redis.createClient({
  port: process.env.REDIS_PORT || 6379,
  host: process.env.REDIS_HOST || "127.0.0.1",
});

client.on("connect", () => {
  console.log("connected script file");
});

async function upload() {
  try {
    let keys = await client.keysAsync(`newsbytes_*`);
    await distributeLoadAcrossWorkers(threadCount, keys);
    process.exit();
  } catch (e) {
    console.log(e);
    process.exit();
  }
}

async function distributeLoadAcrossWorkers(workers, outerKeys) {
  const segmentsPerWorker = Math.round(outerKeys.length / workers);
  const promises = Array(workers)
    .fill()
    .map((_, index) => {
      let keysChunk;
      if (index === 0) {
        keysChunk = outerKeys.slice(0, segmentsPerWorker);
      } else if (index === workers - 1) {
        keysChunk = outerKeys.slice(segmentsPerWorker * index);
      } else {
        keysChunk = outerKeys.slice(
          segmentsPerWorker * index,
          segmentsPerWorker * (index + 1)
        );
      }
      return getEventsFromKeys(keysChunk);
    });
  try {
    const segmentsResults = await Promise.all(promises);
    return segmentsResults;
  } catch (e) {
    console.log(e);
    console.log("Error on" + process.env.CATEGORYNAME);
    process.exit();
  }
}

function getEventsFromKeys(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerScript, { workerData: data });
    worker.on("message", resolve);
    worker.on("error", reject);
  });
}

upload();
