let urlParams = window.location.pathname;
let startTime = new Date();
let endTime = new Date();
let tabActive = true;

window.onfocus = function () {
  let currentTime = new Date();
  tabActive = true;
  if (currentTime.getMinutes() - endTime.getMinutes() > 2) {
    startTime = currentTime;
  }
};
window.onblur = function () {
  tabActive = false;
  endTime = new Date();
};

function init() {
  urlParams = window.location.pathname;
  startTime = new Date();
  endTime = new Date();
  tabActive = true;
}

function sendPayload() {
  let payload = getPayload(urlParams);
  var xhttp = new XMLHttpRequest();
  xhttp.open("POST", "https://newsbytes-api.kalagato.co", true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhttp.send(payload);

  function getPayload(urlParams) {
    let payload = [],
      timeStamp = getCurrentTimeStamp(),
      clientId = getClientId();
    endTime = tabActive ? new Date() : endTime;
    params = urlParams.split("/");
    params.shift();

    if (params.length === 2) {
      if (params[0] === "category") {
        payload.push("type=category");
        payload.push("category=" + params[1]);
      }
    } else if (params.length > 2) {
      if (params[0] === "timeline") {
        payload.push("type=article");
        payload.push("category=" + params[1]);
        payload.push("title=" + params[params.length - 1]);
        payload.push("article_id=" + params[2]);
      }
    }
    payload.push("timestamp=" + timeStamp);
    payload.push("client_id=" + clientId);
    payload.push("url=" + window.location.href);
    payload.push("time_spent=" + (endTime - startTime) / 1000);
    payload.push("start_time=" + startTime);
    payload.push("end_time=" + endTime);

    return payload.join("&");
  }

  function getCurrentTimeStamp() {
    let date = new Date(),
      year = date.getFullYear(),
      month = ("0" + (date.getMonth() + 1)).slice(-2),
      day = ("0" + date.getDate()).slice(-2),
      time = date.getTime();

    return year + "-" + month + "-" + day + " " + time;
  }

  function getClientId() {
    let cookieArr = document.cookie.split(";");

    for (let i = 0; i < cookieArr.length; i++) {
      let cookiePair = cookieArr[i].split("=");

      if (cookiePair[0].trim() === "_gid") {
        let gid = cookiePair[1].split(".").join("_");
        return gid;
      }
    }

    return null;
  }
}

if (
  urlParams.split("/").length > 1 &&
  urlParams.indexOf("/entertainment/") !== -1
) {
  setInterval(sendPayload, 30000);
}
