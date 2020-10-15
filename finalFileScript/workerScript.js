const AWS = require("aws-sdk");
AWS.config.update({
  region: process.env.REGION || "awsRegion",
  accessKeyId: process.env.ACCESS_KEY_ID || "somerandomid",
  secretAccessKey: process.env.SECRET_ACCESS_KEY || "somerandomkey",
});
const s3 = new AWS.S3();
const redis = require("redis");
const bluebird = require("bluebird");
const { parentPort, workerData, isMainThread } = require("worker_threads");

bluebird.promisifyAll(redis.RedisClient.prototype);
const client = redis.createClient({
  port: process.env.REDIS_PORT || 6379,
  host: process.env.REDIS_HOST || "127.0.0.1",
});

client.on("connect", () => {
  console.log("connected worker file");
});

let S3Promises = [];

async function putDataInS3(workerData) {
  try {
    let finalData = { data: [] };
    for (let i = 0; i < workerData.length; i++) {
      let data = await client.hgetallAsync(workerData[i]);
      if (data) {
        let timestampKeys = Object.keys(data);

        for (let timestampKey in timestampKeys) {
          let eventPayload = await client.hmgetAsync(
            workerData[i],
            timestampKeys[timestampKey]
          );
          finalData.data.push(JSON.parse(eventPayload[0]));
        }

        let filePath = workerData[i].split("_"),
          userId = filePath.slice(3).join("_");
        let params = {
          Body: JSON.stringify(finalData),
          ContentType: "application/json; charset=utf-8",
          Bucket: "newsbytes-sdk",
          Key: `${filePath[2]}/${filePath[3]}/${userId}/final.json`,
        };

        S3Promises.push(
          new Promise((resolve, reject) => {
            s3.putObject(params, (err, results) => {
              if (err) {
                reject(err);
              } else resolve(results);
            });
          })
        );
      }
    }
    let result = await Promise.all(S3Promises);
    console.log("done");
    return result;
  } catch (e) {
    console.log(e);
    process.exit();
  }
}

if (!isMainThread) {
  if (!Array.isArray(workerData)) {
    throw new Error("workerData must be an array");
  }

  putDataInS3(workerData).then((result) => {
    parentPort.postMessage(result);
  });
}
