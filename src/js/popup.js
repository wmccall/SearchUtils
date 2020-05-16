/*** CONSTANTS ***/
var DEFAULT_INSTANT_RESULTS = true;
var ERROR_COLOR = "#ff8989";
var WHITE_COLOR = "#ffffff";
var GOOD_COLOR = "#1D1F23";
var ERROR_TEXT = "Reload page to search";
var SHOW_HISTORY_TITLE = "Show search history";
var HIDE_HISTORY_TITLE = "Hide search history";
var ENABLE_CASE_SENSITIVE_TITLE = "Enable case sensitive search";
var DISABLE_CASE_SENSITIVE_TITLE = "Disable case sensitive search";
var ENABLE_USE_REGEX_TITLE = "Enable regex search";
var DISABLE_USE_REGEX_TITLE = "Disable regex search";
var HISTORY_IS_EMPTY_TEXT = "Search history is empty.";
var CLEAR_ALL_HISTORY_TEXT = "Clear History";
var DEFAULT_CASE_SENSITIVE = false;
var DEFAULT_USE_REGEX = false;
var MAX_HISTORY_LENGTH = 5;
/*** CONSTANTS ***/

/*** VARIABLES ***/
var sentInput = false;
var processingKey = false;
var searchHistory = null;
var lastSearch = null;
var maxHistoryLength = MAX_HISTORY_LENGTH;
/*** VARIABLES ***/

/*** FUNCTIONS ***/
/* Validate that a given pattern string is a valid regex */
function isValidRegex(pattern) {
  try {
    var regex = new RegExp(pattern);
    return true;
  } catch (e) {
    return false;
  }
}

/* Send message to content script of tab to select next result */
function selectNext() {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    function (tabs) {
      if ("undefined" != typeof tabs[0].id && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          message: "selectNextNode",
        });
      }
    }
  );
}

/* Send message to content script of tab to select previous result */
function selectPrev() {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    function (tabs) {
      if ("undefined" != typeof tabs[0].id && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          message: "selectPrevNode",
        });
      }
    }
  );
}

/* Send message to pass input string to content script of tab to find and highlight regex matches */
function passInputToContentScript() {
  passInputToContentScript(false);
}

function passInputToContentScript(configurationChanged) {
  chrome.storage.local.get({ useRegex: DEFAULT_USE_REGEX }, function (result) {
    if (!processingKey) {
      var regexString = document.getElementById("inputRegex").value;
      if (!isValidRegex(regexString) && result.useRegex) {
        document.getElementById(
          "inputRegex"
        ).style.backgroundColor = ERROR_COLOR;
      } else {
        document.getElementById(
          "inputRegex"
        ).style.backgroundColor = GOOD_COLOR;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if ("undefined" != typeof tabs[0].id && tabs[0].id) {
          processingKey = true;
          chrome.tabs.sendMessage(tabs[0].id, {
            message: "search",
            regexString: regexString,
            configurationChanged: configurationChanged,
            getNext: true,
          });
          sentInput = true;
        }
      });
    }
  });
}

function createHistoryLineElement(text) {
  var deleteEntrySpan = document.createElement("span");
  deleteEntrySpan.className = "historyDeleteEntry";
  deleteEntrySpan.textContent = "\u2715";
  deleteEntrySpan.addEventListener("click", function () {
    for (var i = searchHistory.length - 1; i >= 0; i--) {
      if (searchHistory[i] == text) {
        searchHistory.splice(i, 1);
      }
    }
    chrome.storage.local.set({ searchHistory: searchHistory });
    updateHistoryDiv();
  });
  var linkSpan = document.createElement("span");
  linkSpan.className = "historyLink";
  linkSpan.textContent = text;
  linkSpan.addEventListener("click", function () {
    if (document.getElementById("inputRegex").value !== text) {
      document.getElementById("inputRegex").value = text;
      passInputToContentScript();
      document.getElementById("inputRegex").focus();
    }
  });
  var lineDiv = document.createElement("div");
  lineDiv.appendChild(deleteEntrySpan);
  lineDiv.appendChild(linkSpan);
  lineDiv.className = "historyEntry";
  return lineDiv;
}

function updateHistoryDiv() {
  var historyDiv = document.getElementById("history");
  if (historyDiv) {
    historyDiv.innerHTML = "";
    if (searchHistory.length == 0) {
      var span = document.createElement("span");
      span.className = "historyIsEmptyMessage";
      span.textContent = HISTORY_IS_EMPTY_TEXT;
      historyDiv.appendChild(span);
    } else {
      for (var i = searchHistory.length - 1; i >= 0; i--) {
        historyDiv.appendChild(createHistoryLineElement(searchHistory[i]));
      }
      var clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.textContent = CLEAR_ALL_HISTORY_TEXT;
      clearButton.className = "clearHistoryButton";
      clearButton.addEventListener("click", clearSearchHistory);
      historyDiv.appendChild(clearButton);
    }
  }
}

function equalArrays(arr1, arr2) {
  return JSON.stringify(arr1) === JSON.stringify(arr2);
}

function historyLocation(regex) {
  for (let i = 0; i < searchHistory.length; i++) {
    if (equalArrays(searchHistory[i], regex)) {
      return i;
    }
  }
  return -1;
}

function addToHistory(regex) {
  if (regex && searchHistory !== null) {
    const regexHistoryLoc = historyLocation(regex);
    if (regexHistoryLoc !== -1) {
      searchHistory.splice(regexHistoryLoc, 1);
    }
    searchHistory.push(regex);

    for (var i = searchHistory.length - 2; i >= 0; i--) {
      if (searchHistory[i] == regex) {
        searchHistory.splice(i, 1);
      }
    }
    if (searchHistory.length > maxHistoryLength) {
      searchHistory.splice(0, searchHistory.length - maxHistoryLength);
    }
    chrome.storage.local.set({ searchHistory: searchHistory });
    updateHistoryDiv();
  }
}

function updateLastSearch(regex) {
  chrome.storage.local.set({ lastSearch: regex });
}

function setHistoryVisibility(makeVisible) {
  document.getElementById("history").style.display = makeVisible
    ? "block"
    : "none";
  document.getElementById("show-history").title = makeVisible
    ? HIDE_HISTORY_TITLE
    : SHOW_HISTORY_TITLE;
  if (makeVisible) {
    document.getElementById("show-history").className = "optionButton selected";
  } else {
    document.getElementById("show-history").className = "optionButton";
  }
}

function setCaseSensitiveElement() {
  var caseSensitive = chrome.storage.local.get(
    { caseSensitive: DEFAULT_CASE_SENSITIVE },
    function (result) {
      document.getElementById("sensitive").title = result.caseSensitive
        ? DISABLE_CASE_SENSITIVE_TITLE
        : ENABLE_CASE_SENSITIVE_TITLE;
      if (result.caseSensitive) {
        document.getElementById("sensitive").className =
          "optionButton selected";
      } else {
        document.getElementById("sensitive").className = "optionButton";
      }
    }
  );
}
function toggleCaseSensitive() {
  var caseSensitive =
    document.getElementById("sensitive").className == "optionButton selected";
  document.getElementById("sensitive").title = caseSensitive
    ? ENABLE_CASE_SENSITIVE_TITLE
    : DISABLE_CASE_SENSITIVE_TITLE;
  if (caseSensitive) {
    document.getElementById("sensitive").className = "optionButton";
  } else {
    document.getElementById("sensitive").className = "optionButton selected";
  }
  sentInput = false;
  chrome.storage.local.set({ caseSensitive: !caseSensitive });
  passInputToContentScript(true);
}

function setUserRegexElement() {
  var useRegex = chrome.storage.local.get(
    { useRegex: DEFAULT_USE_REGEX },
    function (result) {
      document.getElementById("regex").title = result.useRegex
        ? DISABLE_USE_REGEX_TITLE
        : ENABLE_USE_REGEX_TITLE;
      if (result.useRegex) {
        document.getElementById("regex").className = "optionButton selected";
      } else {
        document.getElementById("regex").className = "optionButton";
      }
    }
  );
}
function toggleUseRegex() {
  var useRegex =
    document.getElementById("regex").className == "optionButton selected";
  document.getElementById("regex").title = useRegex
    ? ENABLE_USE_REGEX_TITLE
    : DISABLE_USE_REGEX_TITLE;
  if (useRegex) {
    document.getElementById("regex").className = "optionButton";
  } else {
    document.getElementById("regex").className = "optionButton selected";
  }
  sentInput = false;
  chrome.storage.local.set({ useRegex: !useRegex });
  passInputToContentScript(true);
}

function clearSearchHistory() {
  searchHistory = [];
  chrome.storage.local.set({ searchHistory: searchHistory });
  updateHistoryDiv();
}

/*** LISTENERS ***/
document.getElementById("next").addEventListener("click", function () {
  selectNext();
});

document.getElementById("prev").addEventListener("click", function () {
  selectPrev();
});

document.getElementById("show-history").addEventListener("click", function () {
  var makeVisible = document.getElementById("history").style.display == "none";
  setHistoryVisibility(makeVisible);
  chrome.storage.local.set({ isSearchHistoryVisible: makeVisible });
});

document.getElementById("sensitive").addEventListener("click", function () {
  toggleCaseSensitive();
});
document.getElementById("regex").addEventListener("click", function () {
  toggleUseRegex();
});

document
  .getElementById("copy-to-clipboard")
  .addEventListener("click", function () {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      function (tabs) {
        if ("undefined" != typeof tabs[0].id && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            message: "copyToClipboard",
          });
        }
      }
    );
  });

/* Received returnSearchInfo message, populate popup UI */

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if ("returnSearchInfo" == request.message) {
    processingKey = false;
    if (request.numResults > 0) {
      document.getElementById("numResults").textContent =
        String(request.currentSelection + 1) +
        " of " +
        String(request.numResults);
    } else {
      document.getElementById("numResults").textContent =
        String(request.currentSelection) + " of " + String(request.numResults);
    }
    if (request.numResults > 0 && request.cause == "selectNode") {
      addToHistory(request.regexString);
    }
    if (request.regexString !== document.getElementById("inputRegex").value) {
      passInputToContentScript();
    }
    updateLastSearch(request.regexString);
  }
});

/* Key listener for selectNext and selectPrev
 * Thanks a lot to Cristy from StackOverflow for this AWESOME solution
 * http://stackoverflow.com/questions/5203407/javascript-multiple-keys-pressed-at-once */
var map = [];
onkeydown = onkeyup = function (e) {
  map[e.keyCode] = e.type == "keydown";
  if (document.getElementById("inputRegex") === document.activeElement) {
    //input element is in focus
    if (!map[16] && map[13]) {
      //ENTER
      if (sentInput) {
        selectNext();
      } else {
        passInputToContentScript();
      }
    } else if (map[16] && map[13]) {
      //SHIFT + ENTER
      selectPrev();
    }
  }
};
/*** LISTENERS ***/

/*** INIT ***/
/* Retrieve from storage whether we should use instant results or not */
chrome.storage.local.get(
  {
    instantResults: DEFAULT_INSTANT_RESULTS,
    maxHistoryLength: MAX_HISTORY_LENGTH,
    searchHistory: null,
    lastSearch: null,
    isSearchHistoryVisible: false,
  },
  function (result) {
    if (result.instantResults) {
      document
        .getElementById("inputRegex")
        .addEventListener("input", function () {
          passInputToContentScript();
        });
    } else {
      document
        .getElementById("inputRegex")
        .addEventListener("change", function () {
          passInputToContentScript();
        });
    }
    console.log(result);
    if (result.maxHistoryLength) {
      maxHistoryLength = result.maxHistoryLength;
    }
    if (result.searchHistory) {
      searchHistory = result.searchHistory.slice(0);
    } else {
      searchHistory = [];
    }
    if (result.lastSearch) {
      lastSearch = result.lastSearch;
    } else {
      lastSearch = "";
    }
    setHistoryVisibility(result.isSearchHistoryVisible);
    updateHistoryDiv();
  }
);

/* Get search info if there is any */
chrome.tabs.query(
  {
    active: true,
    currentWindow: true,
  },
  function (tabs) {
    if ("undefined" != typeof tabs[0].id && tabs[0].id) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          message: "getSearchInfo",
        },
        function (response) {
          if (response) {
            // Content script is active
            console.log(response);
          } else {
            console.log(response);
            document.getElementById("error").textContent = ERROR_TEXT;
          }
        }
      );
    }
  }
);

// grab highlighted text, and add it to history
chrome.tabs.executeScript(
  {
    code: "window.getSelection().toString();",
  },
  function (text) {
    if (text[0] !== "") {
      document.getElementById("inputRegex").value = text;
      addToHistory(lastSearch);
    } else {
      document.getElementById("inputRegex").value = lastSearch;
    }
  }
);

/* Focus onto input form */
document.getElementById("inputRegex").focus();
window.setTimeout(function () {
  document.getElementById("inputRegex").select();
}, 0);
//Thanks to http://stackoverflow.com/questions/480735#comment40578284_14573552

var makeVisible = document.getElementById("history").style.display == "none";
setHistoryVisibility(makeVisible);
chrome.storage.local.set({ isSearchHistoryVisible: makeVisible });

setCaseSensitiveElement();
setUserRegexElement();
/*** INIT ***/
