// This file only makes sense if server-side rendering is used.
// The file will intercept ALL XMLHTTPRequests and reply with a cached version of the response.
// License: MIT
// Development is on-going, some critical features may be still missing.
//
// Visit https://caching.guru for more information.

document.addEventListener("DOMContentLoaded", function () {
      if (document.getElementById('caching-guru-cache')) {

      }
      else {
        let script = window.document.createElement('script');
        script.setAttribute('id', "caching-guru-cache");
        let last = window.document.body.lastChild;
        while (last.previousSibling.nodeName === 'SCRIPT') {
          last = last.previousSibling;
        }
        document.body.insertBefore(script, last);
        script.textContent = `window.cachingGuruCache = ${JSON.stringify([])};`;
      }
    });


    var cgCache = cgCache || [];
    var _Event = function Event(type, bubbles, cancelable, target) {
      this.type = type;
      this.bubbles = bubbles;
      this.cancelable = cancelable;
      this.target = target;
    };
    XMLHttpRequest.prototype.reallySend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.reallyOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.reallyAddEventListener = XMLHttpRequest.prototype.addEventListener;
    XMLHttpRequest.prototype.addEventListener = function (type, listener) {
      if (!this.myEventListener) {
        this.myEventListener = {};
      }
      if (!this.myEventListener[type]) {
        this.myEventListener[type] = [];
      }
      this.myEventListener[type].push(listener);
      this.reallyAddEventListener(type, listener);
    }
    XMLHttpRequest.prototype.open = function (method, url) {
      this.url = url;
      this.method = method;
      this.reallyOpen(method, url);
    };
    XMLHttpRequest.prototype.dispatchEvent = function dispatchEvent(event) {
      var type = event.type;
      var listeners = this.myEventListener[type] || [];

      for (var i = 0; i < listeners.length; i++) {
        if (typeof listeners[i] == "function") {
          listeners[i].call(this, event);
        } else {
          listeners[i].handleEvent(event);
        }
      }
      return !!event.defaultPrevented;
    };
    XMLHttpRequest.prototype._readyStateChange = function _readyStateChange(state) {
      this.readyState = state;

      if (typeof this.onreadystatechange == "function") {
        this.onreadystatechange(new _Event("readystatechange"));
      }

      this.dispatchEvent(new _Event("readystatechange"));

      if (this.readyState == 4) {
        this.dispatchEvent(new _Event("load", false, false, this));
      }
      if (this.readyState == 0 || this.readyState == 4) {
        this.dispatchEvent(new _Event("loadend", false, false, this));
      }
    };
    XMLHttpRequest.prototype.send = function (body) {
      let self = this;
      for (var i = 0; i < cgCache.length; i++) {
        if (cgCache[i].url == this.url) {
          Object.defineProperty(self, 'response', { writable: true });
          Object.defineProperty(self, 'status', { writable: true });
          Object.defineProperty(self, 'readyState', { writable: true });
          Object.defineProperty(self, 'responseText', { writable: true });

          self.response = self.responseText = cgCache[i].body;
          self.status = 200;
          self.readyState = 4;
          this._readyStateChange(4);

          if (typeof this.onSend == "function") {
            this.onSend(this);
          }

          this.dispatchEvent(new _Event("loadstart", false, false, this));
          return;
        }
      }
      let originalOnReadyState = this.onreadystatechange;
      this.onreadystatechange = function () {
        if (self.readyState == 4) {
          window.cgCache.push({
            "url": this.url,
            "body": this.response
          });
          document.getElementById("caching-guru-cache").textContent = `window.cgCache = ${JSON.stringify(window.cgCache)};`;

        }
        if (originalOnReadyState) {
          originalOnReadyState();
        }

      }

      this.reallySend(body);
    };
