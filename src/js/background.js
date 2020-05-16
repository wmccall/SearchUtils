var alteration = { "&": "%26", "?": "%3F", "%": "%25", "=": "%3D", " ": "+" };

var searches = {
  google: "https://www.google.com/search?q=",
  duck: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q=",
};

function cleanText(selection) {
  let text = "" + selection;
  text = text.replace(/&/g, alteration["&"]);
  text = text.replace(/\?/g, alteration["?"]);
  text = text.replace(/%/g, alteration["%"]);
  text = text.replace(/=/g, alteration["="]);
  text = text.replace(/ /g, alteration[" "]);
  return text;
}

function openInNewTab(url) {
  var win = window.open(url, "_blank");
  win.focus();
  return false;
}

function doSearch(text) {
  setTimeout(() => {
    openInNewTab(searches["google"] + text);
  }, 50);
}

/* Received returnSearchInfo message, set badge text with number of results */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if ("returnSearchInfo" == request.message) {
    chrome.browserAction.setBadgeText({
      text: request.numResults > 0 ? String(request.numResults) : "",
      tabId: sender.tab.id,
    });
  }
});

chrome.runtime.onInstalled.addListener(function () {
  new chrome.declarativeContent.ShowPageAction();
  chrome.commands.onCommand.addListener(function (command) {
    chrome.tabs.executeScript(
      {
        code: "window.getSelection().toString();",
      },
      function (selection) {
        let text = cleanText(selection);
        if (text != "") {
          switch (command) {
            case "search":
              doSearch(text);
              break;
          }
        } else {
          removeHighlight();
        }
      }
    );
    console.log("Command:", command);
  });
});
