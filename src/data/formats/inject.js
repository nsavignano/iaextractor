var $ = (function() {
  var cache = [];
  return function(id) {
    if (cache[id]) {
      return cache[id];
    }
    cache[id] = document.getElementById(id);
    return cache[id];
  }
})();
var html = (function() {
  var elems = {
    a: document.createElement("a"),
    span: document.createElement("span"),
    i: document.createElement("i"),
    div: document.createElement("div"),
  }
  return function(tag) {
    var tmp;
    switch (tag) {
    case "a":
    case "span":
    case "i":
      return elems[tag].cloneNode(false);
    default:
      return document.createElement(tag);
    }
  }
})();
var remove = function (elem) {
  if (typeof(elem) == "string") {
    elem = document.getElementById(elem);
  }
  if (!elem) return false;
  elem.parentNode.removeChild(elem);
  return true;
}

// Detect video player
var detect = function () {
  //Flash player
  var players = document.getElementsByTagName("embed"); 
  //HTML5 player
  if (!players.length) {
    tmp = document.getElementsByTagName("video");
    if (tmp.length) {
      players = [tmp[0].parentNode.parentNode];
    }
  }
  return players.length ? players[0] : null;
}

// Make new menu
var Menu = function (doSize) {
  var vInfo, container = {}, currentIndex;
  // Remove old menu and dropdown
  remove("iaextractor-downloader");
  if (remove("iaextractor-menu")) return; //Toggle
  //
  var player = detect();
  if (!player) {
    console.error("No embed player detected");
    return;
  }
  var rect = player.getBoundingClientRect();
  player.insertAdjacentHTML("afterend", 
    '<div id="iaextractor-menu">' + //injected menu
    '  <span type="title">Download Links</span> ' +
    '  <span id="iaextractor-close" class="iaextractor-button"><i></i></span>' +
    '  <div id="iaextractor-items"></div> ' +
    '  <span id="iaextractor-load"></span>' +
    '  <span id="iaextractor-tabs"></span> ' +
    '</div>' +
    '<ul id="iaextractor-downloader">' +  //dropdown
    '  <li>Firefox Downloader</li>' + 
    '  <li>FLashGot</li>' + 
    '  <li>DownThemAll!</li>' + 
    '  <li>dTa OneClick</li>' + 
    '</ul>'
  );
  var width = 330 + (doSize ? 50 : 0),
      items = $("iaextractor-items"),
      tabs = $("iaextractor-tabs"),
      downloader = $("iaextractor-downloader");
      
  container.height = rect.height - 85;
  $("iaextractor-menu").setAttribute("style", 
    ' top: -' + (rect.height + 2) + 'px;' + 
    ' left: ' + (rect.width - width) + 'px;' + 
    ' width: ' + width + 'px;' +
    ' height: ' + rect.height + 'px;'
  );
  items.setAttribute("style", 'width: ' + (width * 10) + 'px;');  //Support up to 10 pages
  tabs.setAttribute("style", 'width: ' + width + 'px;');
  tabs.addEventListener('click', function (e) {
    var elem = e.originalTarget;
    var index = elem.getAttribute("index");
    if (index === null) return;
    index = parseInt(index);
    for (var i = 0; i < items.childNodes.length; i++) {
      if (i == index) {
        items.childNodes[i].style.display = "block";
        tabs.children[i].setAttribute("selected", "true");
      }
      else {
        items.childNodes[i].style.display = "none";
        tabs.children[i].removeAttribute("selected");
      }
    }
  }, false);
  items.addEventListener('click', function (e) {
    var target = e.originalTarget;
    if (target.localName == "a") {
      self.port.emit("download", target.getAttribute("fIndex"));
      e.stopPropagation();
      e.preventDefault();
    }
    else if (target.className.indexOf("iaextractor-dropdown") != -1) {
      var item = target.parentNode; 
          formats = document.getElementsByClassName("iaextractor-item");
      for (var i = 0; i < formats.length; i++) {
        if (formats[i].hasAttribute("selected")) formats[i].removeAttribute("selected");
      }
      item.setAttribute("selected", "true");
      downloader.style.left = player.offsetLeft + (rect.width - width) + 33 + "px";
      downloader.style.top = (item.offsetTop + 55) + "px";
      downloader.style.display = "block";
      currentIndex = parseInt(target.parentNode.getAttribute("fIndex"));
      e.stopPropagation();
      e.preventDefault();
    }
  }, false);
  downloader.setAttribute("style", 'width: ' + (width - 66) + 'px;');
  downloader.addEventListener('click', function (e) {
    var format = vInfo.formats[currentIndex];
    switch (e.originalTarget) {
    case downloader.children[0]:
      self.port.emit("download", currentIndex);
      break;
    case downloader.children[1]:
    case downloader.children[2]:
    case downloader.children[3]:
      self.port.emit(
        e.originalTarget == downloader.children[1] ? "flashgot" : "downThemAll", 
        format.url, 
        vInfo.title,
        vInfo.author,
        format.container,
        vInfo.video_id,
        format.resolution,
        format.audioBitrate,
        e.originalTarget == downloader.children[3] ? true : false
      );
    }
  }, false);
  $("iaextractor-close").addEventListener('click', function (e) {
    remove("iaextractor-menu")
  }, false);

  return {
    initialize: function (_vInfo) {
      vInfo = _vInfo;
      function map (str) {
        switch (str) {
        case "hd720":
          return "HD720p";
        case "hd1080":
          return "HD1080p";
        default:
          return str.toLowerCase().replace(/./, function($1) {return $1.toUpperCase();});
        }
      }
      //Remove loading icon
      remove("iaextractor-load");
      //Add new items
      var tabIndex = (Math.floor((vInfo.formats.length - 1) * 53 / container.height) + 1),
          tabWidth = width / tabIndex;
      for (var i = 0; i < tabIndex; i++) {
        var div = html("div");
        div.setAttribute("style", 'width: ' + width + 'px;');
        $("iaextractor-items").appendChild(div);
        var span = html("span");
        span.setAttribute("index", i);
        span.setAttribute("style", 'width: ' + tabWidth + 'px;');
        span.textContent = i + 1;
        if (i === 0) {
          span.setAttribute("selected", "true");
        }
        $("iaextractor-tabs").appendChild(span);
      }
      tabs.style.display = tabIndex == 1 ? "none" : "block";
      
      vInfo.formats.forEach (function (elem, index) {
        var url = elem.url + "&keepalive=yes&title=" + encodeURIComponent(vInfo.title);
        var a = html("a");
        a.setAttribute("class", "iaextractor-item");
        a.setAttribute("href", url);
        a.setAttribute("fIndex", index);
        var text = html("span");
        text.setAttribute("style", "pointer-events: none;");
        var dropdown = html("span");
        dropdown.setAttribute("class", "iaextractor-button iaextractor-dropdown");
        var i = html("i");
        dropdown.appendChild(i);
        a.appendChild(text);
        a.appendChild(dropdown);
        text.textContent = 
          elem.container.toUpperCase() + " " + map(elem.quality) +
          " - " +
          elem.audioEncoding.toUpperCase() + " " + elem.audioBitrate + "K";
        var i = Math.floor(index * 53 / container.height);
        items.children[i].appendChild(a);
        //Requesting File Size
        if (doSize) {
          self.port.emit("file-size-request", url, i, items.children[i].children.length - 1);
        }
      });
    }
  }
}
self.port.on("file-size-response", function(url, size, i1, i2) {
  var a = $("iaextractor-items").children[i1].children[i2];
  if (!a || a.localName !== "a") return;
  var span = a.childNodes[0];
  //Rejecting wrong file size
  if (a.getAttribute("href") != url) {
    return;
  }
  span.textContent += " - " + size;
});
window.addEventListener("click", function (e) {
  var elem = e.originalTarget,
      downloader = $("iaextractor-downloader");
      formats = document.getElementsByClassName("iaextractor-item");
  for (var i = 0; i < formats.length; i++) {
    if (formats[i].hasAttribute("selected")) formats[i].removeAttribute("selected");
  }
  if (downloader) {
    downloader.style.display = "none";
  }
}, false);

var menu = new Menu(self.options.doSize);
self.port.on("info", menu.initialize);