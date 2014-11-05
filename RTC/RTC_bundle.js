!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.RTCActivator=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var RTC = require("./RTC.js");
var RTCBrowserType = require("../service/RTC/RTCBrowserType.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");

/**
 * Provides a wrapper class for the MediaStream.
 * 
 * TODO : Add here the src from the video element and other related properties
 * and get rid of some of the mappings that we use throughout the UI.
 */
var MediaStream = (function() {
    /**
     * Creates a MediaStream object for the given data, session id and ssrc.
     *
     * @param data the data object from which we obtain the stream,
     * the peerjid, etc.
     * @param sid the session id
     * @param ssrc the ssrc corresponding to this MediaStream
     *
     * @constructor
     */
    function MediaStreamProto(data, sid, ssrc, eventEmmiter) {
        this.sid = sid;
        this.VIDEO_TYPE = "Video";
        this.AUDIO_TYPE = "Audio";
        this.stream = data.stream;
        this.peerjid = data.peerjid;
        this.ssrc = ssrc;
//        this.session = connection.jingle.sessions[sid];
        this.type = (this.stream.getVideoTracks().length > 0)
                    ? this.VIDEO_TYPE : this.AUDIO_TYPE;
        eventEmmiter.emit(StreamEventTypes.EVENT_TYPE_REMOTE_CREATED, this);
    }

    if(RTC.browser == RTCBrowserType.RTC_BROWSER_FIREFOX)
    {
        if (!MediaStream.prototype.getVideoTracks)
            MediaStream.prototype.getVideoTracks = function () { return []; };
        if (!MediaStream.prototype.getAudioTracks)
            MediaStream.prototype.getAudioTracks = function () { return []; };
    }

    return MediaStreamProto;
})();




module.exports = MediaStream;
},{"../service/RTC/RTCBrowserType.js":6,"../service/RTC/StreamEventTypes.js":7,"./RTC.js":2}],2:[function(require,module,exports){
var RTCActivator = require("./RTCActivator");

var RTCBrowserTypes = require("../service/RTC/RTCBrowserType.js");

function RTC(RTCService)
{
    this.service = RTCService;
    if (navigator.mozGetUserMedia) {
        console.log('This appears to be Firefox');
        var version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
        if (version >= 22) {
            this.peerconnection = mozRTCPeerConnection;
            this.browser = RTCBrowserTypes.RTC_BROWSER_FIREFOX;
            this.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
            this.pc_constraints = {};
            RTCSessionDescription = mozRTCSessionDescription;
            RTCIceCandidate = mozRTCIceCandidate;
        }
    } else if (navigator.webkitGetUserMedia) {
        console.log('This appears to be Chrome');
        this.peerconnection = webkitRTCPeerConnection;
        this.browser = RTCBrowserTypes.RTC_BROWSER_CHROME;
        this.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
        // DTLS should now be enabled by default but..
        this.pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]};
        if (navigator.userAgent.indexOf('Android') != -1) {
            this.pc_constraints = {}; // disable DTLS on Android
        }
        if (!webkitMediaStream.prototype.getVideoTracks) {
            webkitMediaStream.prototype.getVideoTracks = function () {
                return this.videoTracks;
            };
        }
        if (!webkitMediaStream.prototype.getAudioTracks) {
            webkitMediaStream.prototype.getAudioTracks = function () {
                return this.audioTracks;
            };
        }
    }
    else
    {
        try { console.log('Browser does not appear to be WebRTC-capable'); } catch (e) { }

        window.location.href = 'webrtcrequired.html';
        return;
    }

    if (this.browser !== RTCBrowserTypes.RTC_BROWSER_CHROME) {
        window.location.href = 'chromeonly.html';
        return;
    }

}

RTC.prototype.getUserMediaWithConstraints
    = function(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream) {
    var constraints = {audio: false, video: false};

    if (um.indexOf('video') >= 0) {
        constraints.video = { mandatory: {}, optional: [] };// same behaviour as true
    }
    if (um.indexOf('audio') >= 0) {
        constraints.audio = { mandatory: {}, optional: []};// same behaviour as true
    }
    if (um.indexOf('screen') >= 0) {
        constraints.video = {
            mandatory: {
                chromeMediaSource: "screen",
                googLeakyBucket: true,
                maxWidth: window.screen.width,
                maxHeight: window.screen.height,
                maxFrameRate: 3
            },
            optional: []
        };
    }
    if (um.indexOf('desktop') >= 0) {
        constraints.video = {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: desktopStream,
                googLeakyBucket: true,
                maxWidth: window.screen.width,
                maxHeight: window.screen.height,
                maxFrameRate: 3
            },
            optional: []
        }
    }

    if (constraints.audio) {
        // if it is good enough for hangouts...
        constraints.audio.optional.push(
            {googEchoCancellation: true},
            {googAutoGainControl: true},
            {googNoiseSupression: true},
            {googHighpassFilter: true},
            {googNoisesuppression2: true},
            {googEchoCancellation2: true},
            {googAutoGainControl2: true}
        );
    }
    if (constraints.video) {
        constraints.video.optional.push(
            {googNoiseReduction: true}
        );
        if (um.indexOf('video') >= 0) {
            constraints.video.optional.push(
                {googLeakyBucket: true}
            );
        }
    }

    // Check if we are running on Android device
    var isAndroid = navigator.userAgent.indexOf('Android') != -1;

    if (resolution && !constraints.video || isAndroid) {
        constraints.video = { mandatory: {}, optional: [] };// same behaviour as true
    }
    // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
    switch (resolution) {
        // 16:9 first
        case '1080':
        case 'fullhd':
            constraints.video.mandatory.minWidth = 1920;
            constraints.video.mandatory.minHeight = 1080;
            break;
        case '720':
        case 'hd':
            constraints.video.mandatory.minWidth = 1280;
            constraints.video.mandatory.minHeight = 720;
            break;
        case '360':
            constraints.video.mandatory.minWidth = 640;
            constraints.video.mandatory.minHeight = 360;
            break;
        case '180':
            constraints.video.mandatory.minWidth = 320;
            constraints.video.mandatory.minHeight = 180;
            break;
        // 4:3
        case '960':
            constraints.video.mandatory.minWidth = 960;
            constraints.video.mandatory.minHeight = 720;
            break;
        case '640':
        case 'vga':
            constraints.video.mandatory.minWidth = 640;
            constraints.video.mandatory.minHeight = 480;
            break;
        case '320':
            constraints.video.mandatory.minWidth = 320;
            constraints.video.mandatory.minHeight = 240;
            break;
        default:
            if (isAndroid) {
                constraints.video.mandatory.minWidth = 320;
                constraints.video.mandatory.minHeight = 240;
                constraints.video.mandatory.maxFrameRate = 15;
            }
            break;
    }
    if (constraints.video.mandatory.minWidth)
        constraints.video.mandatory.maxWidth = constraints.video.mandatory.minWidth;
    if (constraints.video.mandatory.minHeight)
        constraints.video.mandatory.maxHeight = constraints.video.mandatory.minHeight;

    if (bandwidth) { // doesn't work currently, see webrtc issue 1846
        if (!constraints.video) constraints.video = {mandatory: {}, optional: []};//same behaviour as true
        constraints.video.optional.push({bandwidth: bandwidth});
    }
    if (fps) { // for some cameras it might be necessary to request 30fps
        // so they choose 30fps mjpg over 10fps yuy2
        if (!constraints.video) constraints.video = {mandatory: {}, optional: []};// same behaviour as true;
        constraints.video.mandatory.minFrameRate = fps;
    }

    var isFF = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

    try {
        if (config.enableSimulcast
            && constraints.video
            && constraints.video.chromeMediaSource !== 'screen'
            && constraints.video.chromeMediaSource !== 'desktop'
            && !isAndroid

            // We currently do not support FF, as it doesn't have multistream support.
            && !isFF) {
            var simulcast = new Simulcast();
            simulcast.getUserMedia(constraints, function (stream) {
                    console.log('onUserMediaSuccess');
                    success_callback(stream);
                },
                function (error) {
                    console.warn('Failed to get access to local media. Error ', error);
                    if (failure_callback) {
                        failure_callback(error);
                    }
                });
        } else {

            this.getUserMedia(constraints,
                function (stream) {
                    console.log('onUserMediaSuccess');
                    success_callback(stream);
                },
                function (error) {
                    console.warn('Failed to get access to local media. Error ', error);
                    if (failure_callback) {
                        failure_callback(error);
                    }
                });

        }
    } catch (e) {
        console.error('GUM failed: ', e);
        if (failure_callback) {
            failure_callback(e);
        }
    }
}

RTC.prototype.obtainAudioAndVideoPermissions = function () {
    var self = this;
    this.getUserMediaWithConstraints(
        ['audio', 'video'],
        function (avStream) {
            self.handleLocalStream(avStream);
        },
        function (error) {
            console.error('failed to obtain audio/video stream - stop', error);
        },
            config.resolution || '360');

}

RTC.prototype.handleLocalStream = function(stream) {

    var audioStream = new webkitMediaStream(stream);
    var videoStream = new webkitMediaStream(stream);
    var videoTracks = stream.getVideoTracks();
    var audioTracks = stream.getAudioTracks();
    for (var i = 0; i < videoTracks.length; i++) {
        audioStream.removeTrack(videoTracks[i]);
    }
    this.service.createLocalStream(audioStream, "audio");
    for (i = 0; i < audioTracks.length; i++) {
        videoStream.removeTrack(audioTracks[i]);
    }
    this.service.createLocalStream(videoStream, "video");
}

module.exports = RTC;
},{"../service/RTC/RTCBrowserType.js":6,"./RTCActivator":3}],3:[function(require,module,exports){
var RTCService = require("./RTCService.js");
var XMPPEvents = require("../service/xmpp/XMPPEvents");
var DataChannels = require("./data_channels");

var RTCActivator = (function()
{
    var rtcService = null;

    function RTCActivatorProto()
    {
        
    }

    RTCActivatorProto.stop=  function () {
        rtcService.dispose();
        rtcService = null;

    }

    function onConferenceCreated(event) {
        DataChannels.bindDataChannelListener(event.peerconnection);
    }

    RTCActivatorProto.start= function () {
        rtcService = new RTCService();
        XMPPActivator.addListener(XMPPEvents.CONFERENCE_CERATED, onConferenceCreated);
        XMPPActivator.addListener(XMPPEvents.CALL_INCOMING, onConferenceCreated);
    }

    RTCActivatorProto.getRTCService= function () {
        return rtcService;
    }

    RTCActivatorProto.addStreamListener= function(listener, eventType)
    {
        return RTCService.addStreamListener(listener, eventType);
    }

    RTCActivatorProto.removeStreamListener= function(listener, eventType)
    {
        return RTCService.removeStreamListener(listener, eventType);
    }
    
    return RTCActivatorProto;
})();

module.exports = RTCActivator;

},{"../service/xmpp/XMPPEvents":8,"./RTCService.js":4,"./data_channels":5}],4:[function(require,module,exports){
var EventEmitter = require("events");
var RTC = require("./RTC.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var MediaStream = require("./MediaStream.js");


var RTCService = function()
{
    var eventEmitter = new EventEmitter();

    function Stream(stream, type)
    {
        this.stream = stream;
        this.eventEmitter = eventEmitter;
        this.type = type;
        eventEmitter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_CREATED, this);
        var self = this;
        this.stream.onended = function()
        {
            self.streamEnded();
        }
    }

    Stream.prototype.streamEnded = function () {
        eventEmitter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_ENDED, this);
    }

    Stream.prototype.getOriginalStream = function()
    {
        return this.stream;
    }

    Stream.prototype.isAudioStream = function () {
        return (this.stream.getAudioTracks() && this.stream.getAudioTracks().length > 0);
    }

    Stream.prototype.mute = function()
    {
        var ismuted = false;
        var tracks = [];
        if(this.type = "audio")
        {
            tracks = this.stream.getAudioTracks();
        }
        else
        {
            tracks = this.stream.getVideoTracks();
        }

        for (var idx = 0; idx < tracks.length; idx++) {
            ismuted = !tracks[idx].enabled;
            tracks[idx].enabled = !tracks[idx].enabled;
        }
        return ismuted;
    }

    Stream.prototype.isMuted = function () {
        var tracks = [];
        if(this.type = "audio")
        {
            tracks = this.stream.getAudioTracks();
        }
        else
        {
            tracks = this.stream.getVideoTracks();
        }
        for (var idx = 0; idx < tracks.length; idx++) {
            if(tracks[idx].enabled)
                return false;
        }
        return true;
    }

    function RTCServiceProto() {
        this.rtc = new RTC(this);
        this.rtc.obtainAudioAndVideoPermissions();
        this.localStreams = new Array();
        this.remoteStreams = new Array();
        this.localAudio = null;
        this.localVideo = null;
    }


    RTCServiceProto.addStreamListener = function (listener, eventType) {
        eventEmitter.on(eventType, listener);
    };

    RTCServiceProto.removeStreamListener = function (listener, eventType) {
        if(!(eventType instanceof SteamEventType))
            throw "Illegal argument";

        eventEmitter.removeListener(eventType, listener);
    };

    RTCServiceProto.prototype.createLocalStream = function (stream, type) {
        var localStream =  new Stream(stream, type);
        this.localStreams.push(localStream);
        if(type == "audio")
        {
            this.localAudio = localStream;
        }
        else
        {
            this.localVideo = localStream;
        }
        return localStream;
    };
    
    RTCServiceProto.prototype.removeLocalStream = function (stream) {
        for(var i = 0; i < this.localStreams.length; i++)
        {
            if(this.localStreams[i].getOriginalStream() === stream) {
                delete this.localStreams[i];
                return;
            }
        }
    }
    
    RTCServiceProto.prototype.createRemoteStream = function (data, sid, thessrc) {
        var remoteStream = new MediaStream(data, sid, thessrc, eventEmitter);
        this.remoteStreams.push(remoteStream);
        return remoteStream;
    }

    RTCServiceProto.prototype.getBrowserType = function () {
        return this.rtc.browser;
    };

    RTCServiceProto.prototype.getPCConstraints = function () {
        return this.rtc.pc_constraints;
    };

    RTCServiceProto.prototype.getUserMediaWithConstraints =
        function(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream)
        {
            return this.rtc.getUserMediaWithConstraints(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream);
        };

    RTCServiceProto.prototype.dispose = function() {
        eventEmitter.removeAllListeners("statistics.audioLevel");

        if (this.rtc) {
            this.rtc = null;
        }
    }

    return RTCServiceProto;
}();

module.exports = RTCService;

},{"../service/RTC/StreamEventTypes.js":7,"./MediaStream.js":1,"./RTC.js":2,"events":9}],5:[function(require,module,exports){
/* global connection, Strophe, updateLargeVideo, focusedVideoSrc*/

// cache datachannels to avoid garbage collection
// https://code.google.com/p/chromium/issues/detail?id=405545
var _dataChannels = [];


var DataChannels =
{

    /**
     * Callback triggered by PeerConnection when new data channel is opened
     * on the bridge.
     * @param event the event info object.
     */
    onDataChannel: function (event) {
        var dataChannel = event.channel;

        dataChannel.onopen = function () {
            console.info("Data channel opened by the Videobridge!", dataChannel);

            // Code sample for sending string and/or binary data
            // Sends String message to the bridge
            //dataChannel.send("Hello bridge!");
            // Sends 12 bytes binary message to the bridge
            //dataChannel.send(new ArrayBuffer(12));

            // when the data channel becomes available, tell the bridge about video
            // selections so that it can do adaptive simulcast,

            // we want the notification to trigger even if userJid is undefined,
            // or null.
            onSelectedEndpointChanged(UIActivator.getUIService().getSelectedJID());
        };

        dataChannel.onerror = function (error) {
            console.error("Data Channel Error:", error, dataChannel);
        };

        dataChannel.onmessage = function (event) {
            var data = event.data;
            // JSON
            var obj;

            try {
                obj = JSON.parse(data);
            }
            catch (e) {
                console.error(
                    "Failed to parse data channel message as JSON: ",
                    data,
                    dataChannel);
            }
            if (('undefined' !== typeof(obj)) && (null !== obj)) {
                var colibriClass = obj.colibriClass;

                if ("DominantSpeakerEndpointChangeEvent" === colibriClass) {
                    // Endpoint ID from the Videobridge.
                    var dominantSpeakerEndpoint = obj.dominantSpeakerEndpoint;

                    console.info(
                        "Data channel new dominant speaker event: ",
                        dominantSpeakerEndpoint);
                    $(document).trigger(
                        'dominantspeakerchanged',
                        [dominantSpeakerEndpoint]);
                }
                else if ("LastNEndpointsChangeEvent" === colibriClass) {
                    // The new/latest list of last-n endpoint IDs.
                    var lastNEndpoints = obj.lastNEndpoints;
                    /*
                     * The list of endpoint IDs which are entering the list of
                     * last-n at this time i.e. were not in the old list of last-n
                     * endpoint IDs.
                     */
                    var endpointsEnteringLastN = obj.endpointsEnteringLastN;

                    var stream = obj.stream;

                    console.log(
                        "Data channel new last-n event: ",
                        lastNEndpoints, endpointsEnteringLastN, obj);

                    $(document).trigger(
                        'lastnchanged',
                        [lastNEndpoints, endpointsEnteringLastN, stream]);
                }
                else if ("SimulcastLayersChangedEvent" === colibriClass) {
                    var endpointSimulcastLayers = obj.endpointSimulcastLayers;
                    $(document).trigger('simulcastlayerschanged', [endpointSimulcastLayers]);
                }
                else if ("StartSimulcastLayerEvent" === colibriClass) {
                    var simulcastLayer = obj.simulcastLayer;
                    $(document).trigger('startsimulcastlayer', simulcastLayer);
                }
                else if ("StopSimulcastLayerEvent" === colibriClass) {
                    var simulcastLayer = obj.simulcastLayer;
                    $(document).trigger('stopsimulcastlayer', simulcastLayer);
                }
                else {
                    console.debug("Data channel JSON-formatted message: ", obj);
                }
            }
        };

        dataChannel.onclose = function () {
            console.info("The Data Channel closed", dataChannel);
            var idx = _dataChannels.indexOf(dataChannel);
            if (idx > -1)
                _dataChannels = _dataChannels.splice(idx, 1);
        };
        _dataChannels.push(dataChannel);
    },

    /**
     * Binds "ondatachannel" event listener to given PeerConnection instance.
     * @param peerConnection WebRTC peer connection instance.
     */
    bindDataChannelListener: function (peerConnection) {
        if (!config.openSctp)
            return;
        peerConnection.ondatachannel = this.onDataChannel;

        // Sample code for opening new data channel from Jitsi Meet to the bridge.
        // Although it's not a requirement to open separate channels from both bridge
        // and peer as single channel can be used for sending and receiving data.
        // So either channel opened by the bridge or the one opened here is enough
        // for communication with the bridge.
        /*var dataChannelOptions =
         {
         reliable: true
         };
         var dataChannel
         = peerConnection.createDataChannel("myChannel", dataChannelOptions);

         // Can be used only when is in open state
         dataChannel.onopen = function ()
         {
         dataChannel.send("My channel !!!");
         };
         dataChannel.onmessage = function (event)
         {
         var msgData = event.data;
         console.info("Got My Data Channel Message:", msgData, dataChannel);
         };*/
    }
};

function onSelectedEndpointChanged(userJid)
{
    console.log('selected endpoint changed: ', userJid);
    if (_dataChannels && _dataChannels.length != 0 && _dataChannels[0].readyState == "open") {
        _dataChannels[0].send(JSON.stringify({
            'colibriClass': 'SelectedEndpointChangedEvent',
            'selectedEndpoint': (!userJid || userJid == null)
                ? null : Strophe.getResourceFromJid(userJid)
        }));
    }
}

$(document).bind("selectedendpointchanged", function(event, userJid) {
    onSelectedEndpointChanged(userJid);
});

module.exports = DataChannels;


},{}],6:[function(require,module,exports){
var RTCBrowserType = {
    RTC_BROWSER_CHROME: "rtc_browser.chrome",

    RTC_BROWSER_FIREFOX: "rtc_browser.firefox"
};

module.exports = RTCBrowserType;
},{}],7:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}],8:[function(require,module,exports){
/**
 * Created by hristo on 10/29/14.
 */
var XMPPEvents = {
    CONFERENCE_CERATED: "xmpp.conferenceCreated.jingle",
    CALL_TERMINATED: "xmpp.callterminated.jingle",
    CALL_INCOMING: "xmpp.callincoming.jingle",
    DISPOSE_CONFERENCE: "xmpp.dispoce_confernce",
    DISPLAY_NAME_CHANGED: "xmpp.display_name_changed"

};
module.exports = XMPPEvents;
},{}],9:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9SVEMvTWVkaWFTdHJlYW0uanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9SVEMvUlRDLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvUlRDL1JUQ0FjdGl2YXRvci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1JUQy9SVENTZXJ2aWNlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvUlRDL2RhdGFfY2hhbm5lbHMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9SVENCcm93c2VyVHlwZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL3htcHAvWE1QUEV2ZW50cy5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUlRDID0gcmVxdWlyZShcIi4vUlRDLmpzXCIpO1xudmFyIFJUQ0Jyb3dzZXJUeXBlID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzXCIpO1xudmFyIFN0cmVhbUV2ZW50VHlwZXMgPSByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qc1wiKTtcblxuLyoqXG4gKiBQcm92aWRlcyBhIHdyYXBwZXIgY2xhc3MgZm9yIHRoZSBNZWRpYVN0cmVhbS5cbiAqIFxuICogVE9ETyA6IEFkZCBoZXJlIHRoZSBzcmMgZnJvbSB0aGUgdmlkZW8gZWxlbWVudCBhbmQgb3RoZXIgcmVsYXRlZCBwcm9wZXJ0aWVzXG4gKiBhbmQgZ2V0IHJpZCBvZiBzb21lIG9mIHRoZSBtYXBwaW5ncyB0aGF0IHdlIHVzZSB0aHJvdWdob3V0IHRoZSBVSS5cbiAqL1xudmFyIE1lZGlhU3RyZWFtID0gKGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBNZWRpYVN0cmVhbSBvYmplY3QgZm9yIHRoZSBnaXZlbiBkYXRhLCBzZXNzaW9uIGlkIGFuZCBzc3JjLlxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGEgdGhlIGRhdGEgb2JqZWN0IGZyb20gd2hpY2ggd2Ugb2J0YWluIHRoZSBzdHJlYW0sXG4gICAgICogdGhlIHBlZXJqaWQsIGV0Yy5cbiAgICAgKiBAcGFyYW0gc2lkIHRoZSBzZXNzaW9uIGlkXG4gICAgICogQHBhcmFtIHNzcmMgdGhlIHNzcmMgY29ycmVzcG9uZGluZyB0byB0aGlzIE1lZGlhU3RyZWFtXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBNZWRpYVN0cmVhbVByb3RvKGRhdGEsIHNpZCwgc3NyYywgZXZlbnRFbW1pdGVyKSB7XG4gICAgICAgIHRoaXMuc2lkID0gc2lkO1xuICAgICAgICB0aGlzLlZJREVPX1RZUEUgPSBcIlZpZGVvXCI7XG4gICAgICAgIHRoaXMuQVVESU9fVFlQRSA9IFwiQXVkaW9cIjtcbiAgICAgICAgdGhpcy5zdHJlYW0gPSBkYXRhLnN0cmVhbTtcbiAgICAgICAgdGhpcy5wZWVyamlkID0gZGF0YS5wZWVyamlkO1xuICAgICAgICB0aGlzLnNzcmMgPSBzc3JjO1xuLy8gICAgICAgIHRoaXMuc2Vzc2lvbiA9IGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zW3NpZF07XG4gICAgICAgIHRoaXMudHlwZSA9ICh0aGlzLnN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgID8gdGhpcy5WSURFT19UWVBFIDogdGhpcy5BVURJT19UWVBFO1xuICAgICAgICBldmVudEVtbWl0ZXIuZW1pdChTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfUkVNT1RFX0NSRUFURUQsIHRoaXMpO1xuICAgIH1cblxuICAgIGlmKFJUQy5icm93c2VyID09IFJUQ0Jyb3dzZXJUeXBlLlJUQ19CUk9XU0VSX0ZJUkVGT1gpXG4gICAge1xuICAgICAgICBpZiAoIU1lZGlhU3RyZWFtLnByb3RvdHlwZS5nZXRWaWRlb1RyYWNrcylcbiAgICAgICAgICAgIE1lZGlhU3RyZWFtLnByb3RvdHlwZS5nZXRWaWRlb1RyYWNrcyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdOyB9O1xuICAgICAgICBpZiAoIU1lZGlhU3RyZWFtLnByb3RvdHlwZS5nZXRBdWRpb1RyYWNrcylcbiAgICAgICAgICAgIE1lZGlhU3RyZWFtLnByb3RvdHlwZS5nZXRBdWRpb1RyYWNrcyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdOyB9O1xuICAgIH1cblxuICAgIHJldHVybiBNZWRpYVN0cmVhbVByb3RvO1xufSkoKTtcblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBNZWRpYVN0cmVhbTsiLCJ2YXIgUlRDQWN0aXZhdG9yID0gcmVxdWlyZShcIi4vUlRDQWN0aXZhdG9yXCIpO1xuXG52YXIgUlRDQnJvd3NlclR5cGVzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzXCIpO1xuXG5mdW5jdGlvbiBSVEMoUlRDU2VydmljZSlcbntcbiAgICB0aGlzLnNlcnZpY2UgPSBSVENTZXJ2aWNlO1xuICAgIGlmIChuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUaGlzIGFwcGVhcnMgdG8gYmUgRmlyZWZveCcpO1xuICAgICAgICB2YXIgdmVyc2lvbiA9IHBhcnNlSW50KG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0ZpcmVmb3hcXC8oWzAtOV0rKVxcLi8pWzFdLCAxMCk7XG4gICAgICAgIGlmICh2ZXJzaW9uID49IDIyKSB7XG4gICAgICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uID0gbW96UlRDUGVlckNvbm5lY3Rpb247XG4gICAgICAgICAgICB0aGlzLmJyb3dzZXIgPSBSVENCcm93c2VyVHlwZXMuUlRDX0JST1dTRVJfRklSRUZPWDtcbiAgICAgICAgICAgIHRoaXMuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYS5iaW5kKG5hdmlnYXRvcik7XG4gICAgICAgICAgICB0aGlzLnBjX2NvbnN0cmFpbnRzID0ge307XG4gICAgICAgICAgICBSVENTZXNzaW9uRGVzY3JpcHRpb24gPSBtb3pSVENTZXNzaW9uRGVzY3JpcHRpb247XG4gICAgICAgICAgICBSVENJY2VDYW5kaWRhdGUgPSBtb3pSVENJY2VDYW5kaWRhdGU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1RoaXMgYXBwZWFycyB0byBiZSBDaHJvbWUnKTtcbiAgICAgICAgdGhpcy5wZWVyY29ubmVjdGlvbiA9IHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uO1xuICAgICAgICB0aGlzLmJyb3dzZXIgPSBSVENCcm93c2VyVHlwZXMuUlRDX0JST1dTRVJfQ0hST01FO1xuICAgICAgICB0aGlzLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEuYmluZChuYXZpZ2F0b3IpO1xuICAgICAgICAvLyBEVExTIHNob3VsZCBub3cgYmUgZW5hYmxlZCBieSBkZWZhdWx0IGJ1dC4uXG4gICAgICAgIHRoaXMucGNfY29uc3RyYWludHMgPSB7J29wdGlvbmFsJzogW3snRHRsc1NydHBLZXlBZ3JlZW1lbnQnOiAndHJ1ZSd9XX07XG4gICAgICAgIGlmIChuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ0FuZHJvaWQnKSAhPSAtMSkge1xuICAgICAgICAgICAgdGhpcy5wY19jb25zdHJhaW50cyA9IHt9OyAvLyBkaXNhYmxlIERUTFMgb24gQW5kcm9pZFxuICAgICAgICB9XG4gICAgICAgIGlmICghd2Via2l0TWVkaWFTdHJlYW0ucHJvdG90eXBlLmdldFZpZGVvVHJhY2tzKSB7XG4gICAgICAgICAgICB3ZWJraXRNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0VmlkZW9UcmFja3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlkZW9UcmFja3M7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghd2Via2l0TWVkaWFTdHJlYW0ucHJvdG90eXBlLmdldEF1ZGlvVHJhY2tzKSB7XG4gICAgICAgICAgICB3ZWJraXRNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0QXVkaW9UcmFja3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXVkaW9UcmFja3M7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICAgIHRyeSB7IGNvbnNvbGUubG9nKCdCcm93c2VyIGRvZXMgbm90IGFwcGVhciB0byBiZSBXZWJSVEMtY2FwYWJsZScpOyB9IGNhdGNoIChlKSB7IH1cblxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICd3ZWJydGNyZXF1aXJlZC5odG1sJztcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmJyb3dzZXIgIT09IFJUQ0Jyb3dzZXJUeXBlcy5SVENfQlJPV1NFUl9DSFJPTUUpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnY2hyb21lb25seS5odG1sJztcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxufVxuXG5SVEMucHJvdG90eXBlLmdldFVzZXJNZWRpYVdpdGhDb25zdHJhaW50c1xuICAgID0gZnVuY3Rpb24odW0sIHN1Y2Nlc3NfY2FsbGJhY2ssIGZhaWx1cmVfY2FsbGJhY2ssIHJlc29sdXRpb24sIGJhbmR3aWR0aCwgZnBzLCBkZXNrdG9wU3RyZWFtKSB7XG4gICAgdmFyIGNvbnN0cmFpbnRzID0ge2F1ZGlvOiBmYWxzZSwgdmlkZW86IGZhbHNlfTtcblxuICAgIGlmICh1bS5pbmRleE9mKCd2aWRlbycpID49IDApIHtcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8gPSB7IG1hbmRhdG9yeToge30sIG9wdGlvbmFsOiBbXSB9Oy8vIHNhbWUgYmVoYXZpb3VyIGFzIHRydWVcbiAgICB9XG4gICAgaWYgKHVtLmluZGV4T2YoJ2F1ZGlvJykgPj0gMCkge1xuICAgICAgICBjb25zdHJhaW50cy5hdWRpbyA9IHsgbWFuZGF0b3J5OiB7fSwgb3B0aW9uYWw6IFtdfTsvLyBzYW1lIGJlaGF2aW91ciBhcyB0cnVlXG4gICAgfVxuICAgIGlmICh1bS5pbmRleE9mKCdzY3JlZW4nKSA+PSAwKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvID0ge1xuICAgICAgICAgICAgbWFuZGF0b3J5OiB7XG4gICAgICAgICAgICAgICAgY2hyb21lTWVkaWFTb3VyY2U6IFwic2NyZWVuXCIsXG4gICAgICAgICAgICAgICAgZ29vZ0xlYWt5QnVja2V0OiB0cnVlLFxuICAgICAgICAgICAgICAgIG1heFdpZHRoOiB3aW5kb3cuc2NyZWVuLndpZHRoLFxuICAgICAgICAgICAgICAgIG1heEhlaWdodDogd2luZG93LnNjcmVlbi5oZWlnaHQsXG4gICAgICAgICAgICAgICAgbWF4RnJhbWVSYXRlOiAzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3B0aW9uYWw6IFtdXG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmICh1bS5pbmRleE9mKCdkZXNrdG9wJykgPj0gMCkge1xuICAgICAgICBjb25zdHJhaW50cy52aWRlbyA9IHtcbiAgICAgICAgICAgIG1hbmRhdG9yeToge1xuICAgICAgICAgICAgICAgIGNocm9tZU1lZGlhU291cmNlOiBcImRlc2t0b3BcIixcbiAgICAgICAgICAgICAgICBjaHJvbWVNZWRpYVNvdXJjZUlkOiBkZXNrdG9wU3RyZWFtLFxuICAgICAgICAgICAgICAgIGdvb2dMZWFreUJ1Y2tldDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtYXhXaWR0aDogd2luZG93LnNjcmVlbi53aWR0aCxcbiAgICAgICAgICAgICAgICBtYXhIZWlnaHQ6IHdpbmRvdy5zY3JlZW4uaGVpZ2h0LFxuICAgICAgICAgICAgICAgIG1heEZyYW1lUmF0ZTogM1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wdGlvbmFsOiBbXVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvbnN0cmFpbnRzLmF1ZGlvKSB7XG4gICAgICAgIC8vIGlmIGl0IGlzIGdvb2QgZW5vdWdoIGZvciBoYW5nb3V0cy4uLlxuICAgICAgICBjb25zdHJhaW50cy5hdWRpby5vcHRpb25hbC5wdXNoKFxuICAgICAgICAgICAge2dvb2dFY2hvQ2FuY2VsbGF0aW9uOiB0cnVlfSxcbiAgICAgICAgICAgIHtnb29nQXV0b0dhaW5Db250cm9sOiB0cnVlfSxcbiAgICAgICAgICAgIHtnb29nTm9pc2VTdXByZXNzaW9uOiB0cnVlfSxcbiAgICAgICAgICAgIHtnb29nSGlnaHBhc3NGaWx0ZXI6IHRydWV9LFxuICAgICAgICAgICAge2dvb2dOb2lzZXN1cHByZXNzaW9uMjogdHJ1ZX0sXG4gICAgICAgICAgICB7Z29vZ0VjaG9DYW5jZWxsYXRpb24yOiB0cnVlfSxcbiAgICAgICAgICAgIHtnb29nQXV0b0dhaW5Db250cm9sMjogdHJ1ZX1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGNvbnN0cmFpbnRzLnZpZGVvKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm9wdGlvbmFsLnB1c2goXG4gICAgICAgICAgICB7Z29vZ05vaXNlUmVkdWN0aW9uOiB0cnVlfVxuICAgICAgICApO1xuICAgICAgICBpZiAodW0uaW5kZXhPZigndmlkZW8nKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5vcHRpb25hbC5wdXNoKFxuICAgICAgICAgICAgICAgIHtnb29nTGVha3lCdWNrZXQ6IHRydWV9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgd2UgYXJlIHJ1bm5pbmcgb24gQW5kcm9pZCBkZXZpY2VcbiAgICB2YXIgaXNBbmRyb2lkID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdBbmRyb2lkJykgIT0gLTE7XG5cbiAgICBpZiAocmVzb2x1dGlvbiAmJiAhY29uc3RyYWludHMudmlkZW8gfHwgaXNBbmRyb2lkKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvID0geyBtYW5kYXRvcnk6IHt9LCBvcHRpb25hbDogW10gfTsvLyBzYW1lIGJlaGF2aW91ciBhcyB0cnVlXG4gICAgfVxuICAgIC8vIHNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9MTQzNjMxI2M5IGZvciBsaXN0IG9mIHN1cHBvcnRlZCByZXNvbHV0aW9uc1xuICAgIHN3aXRjaCAocmVzb2x1dGlvbikge1xuICAgICAgICAvLyAxNjo5IGZpcnN0XG4gICAgICAgIGNhc2UgJzEwODAnOlxuICAgICAgICBjYXNlICdmdWxsaGQnOlxuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoID0gMTkyMDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQgPSAxMDgwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzcyMCc6XG4gICAgICAgIGNhc2UgJ2hkJzpcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aCA9IDEyODA7XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0ID0gNzIwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzM2MCc6XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGggPSA2NDA7XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0ID0gMzYwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzE4MCc6XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGggPSAzMjA7XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0ID0gMTgwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIDQ6M1xuICAgICAgICBjYXNlICc5NjAnOlxuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoID0gOTYwO1xuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodCA9IDcyMDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICc2NDAnOlxuICAgICAgICBjYXNlICd2Z2EnOlxuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoID0gNjQwO1xuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodCA9IDQ4MDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICczMjAnOlxuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoID0gMzIwO1xuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodCA9IDI0MDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgaWYgKGlzQW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aCA9IDMyMDtcbiAgICAgICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0ID0gMjQwO1xuICAgICAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5tYXhGcmFtZVJhdGUgPSAxNTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAoY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoKVxuICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWF4V2lkdGggPSBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGg7XG4gICAgaWYgKGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQpXG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5tYXhIZWlnaHQgPSBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0O1xuXG4gICAgaWYgKGJhbmR3aWR0aCkgeyAvLyBkb2Vzbid0IHdvcmsgY3VycmVudGx5LCBzZWUgd2VicnRjIGlzc3VlIDE4NDZcbiAgICAgICAgaWYgKCFjb25zdHJhaW50cy52aWRlbykgY29uc3RyYWludHMudmlkZW8gPSB7bWFuZGF0b3J5OiB7fSwgb3B0aW9uYWw6IFtdfTsvL3NhbWUgYmVoYXZpb3VyIGFzIHRydWVcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8ub3B0aW9uYWwucHVzaCh7YmFuZHdpZHRoOiBiYW5kd2lkdGh9KTtcbiAgICB9XG4gICAgaWYgKGZwcykgeyAvLyBmb3Igc29tZSBjYW1lcmFzIGl0IG1pZ2h0IGJlIG5lY2Vzc2FyeSB0byByZXF1ZXN0IDMwZnBzXG4gICAgICAgIC8vIHNvIHRoZXkgY2hvb3NlIDMwZnBzIG1qcGcgb3ZlciAxMGZwcyB5dXkyXG4gICAgICAgIGlmICghY29uc3RyYWludHMudmlkZW8pIGNvbnN0cmFpbnRzLnZpZGVvID0ge21hbmRhdG9yeToge30sIG9wdGlvbmFsOiBbXX07Ly8gc2FtZSBiZWhhdmlvdXIgYXMgdHJ1ZTtcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkZyYW1lUmF0ZSA9IGZwcztcbiAgICB9XG5cbiAgICB2YXIgaXNGRiA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdmaXJlZm94JykgPiAtMTtcblxuICAgIHRyeSB7XG4gICAgICAgIGlmIChjb25maWcuZW5hYmxlU2ltdWxjYXN0XG4gICAgICAgICAgICAmJiBjb25zdHJhaW50cy52aWRlb1xuICAgICAgICAgICAgJiYgY29uc3RyYWludHMudmlkZW8uY2hyb21lTWVkaWFTb3VyY2UgIT09ICdzY3JlZW4nXG4gICAgICAgICAgICAmJiBjb25zdHJhaW50cy52aWRlby5jaHJvbWVNZWRpYVNvdXJjZSAhPT0gJ2Rlc2t0b3AnXG4gICAgICAgICAgICAmJiAhaXNBbmRyb2lkXG5cbiAgICAgICAgICAgIC8vIFdlIGN1cnJlbnRseSBkbyBub3Qgc3VwcG9ydCBGRiwgYXMgaXQgZG9lc24ndCBoYXZlIG11bHRpc3RyZWFtIHN1cHBvcnQuXG4gICAgICAgICAgICAmJiAhaXNGRikge1xuICAgICAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgICAgIHNpbXVsY2FzdC5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsIGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29uVXNlck1lZGlhU3VjY2VzcycpO1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzX2NhbGxiYWNrKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gZ2V0IGFjY2VzcyB0byBsb2NhbCBtZWRpYS4gRXJyb3IgJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmFpbHVyZV9jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbHVyZV9jYWxsYmFjayhlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgdGhpcy5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb25Vc2VyTWVkaWFTdWNjZXNzJyk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NfY2FsbGJhY2soc3RyZWFtKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBnZXQgYWNjZXNzIHRvIGxvY2FsIG1lZGlhLiBFcnJvciAnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmYWlsdXJlX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsdXJlX2NhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dVTSBmYWlsZWQ6ICcsIGUpO1xuICAgICAgICBpZiAoZmFpbHVyZV9jYWxsYmFjaykge1xuICAgICAgICAgICAgZmFpbHVyZV9jYWxsYmFjayhlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuUlRDLnByb3RvdHlwZS5vYnRhaW5BdWRpb0FuZFZpZGVvUGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0VXNlck1lZGlhV2l0aENvbnN0cmFpbnRzKFxuICAgICAgICBbJ2F1ZGlvJywgJ3ZpZGVvJ10sXG4gICAgICAgIGZ1bmN0aW9uIChhdlN0cmVhbSkge1xuICAgICAgICAgICAgc2VsZi5oYW5kbGVMb2NhbFN0cmVhbShhdlN0cmVhbSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZmFpbGVkIHRvIG9idGFpbiBhdWRpby92aWRlbyBzdHJlYW0gLSBzdG9wJywgZXJyb3IpO1xuICAgICAgICB9LFxuICAgICAgICAgICAgY29uZmlnLnJlc29sdXRpb24gfHwgJzM2MCcpO1xuXG59XG5cblJUQy5wcm90b3R5cGUuaGFuZGxlTG9jYWxTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcblxuICAgIHZhciBhdWRpb1N0cmVhbSA9IG5ldyB3ZWJraXRNZWRpYVN0cmVhbShzdHJlYW0pO1xuICAgIHZhciB2aWRlb1N0cmVhbSA9IG5ldyB3ZWJraXRNZWRpYVN0cmVhbShzdHJlYW0pO1xuICAgIHZhciB2aWRlb1RyYWNrcyA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpO1xuICAgIHZhciBhdWRpb1RyYWNrcyA9IHN0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlkZW9UcmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYXVkaW9TdHJlYW0ucmVtb3ZlVHJhY2sodmlkZW9UcmFja3NbaV0pO1xuICAgIH1cbiAgICB0aGlzLnNlcnZpY2UuY3JlYXRlTG9jYWxTdHJlYW0oYXVkaW9TdHJlYW0sIFwiYXVkaW9cIik7XG4gICAgZm9yIChpID0gMDsgaSA8IGF1ZGlvVHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZpZGVvU3RyZWFtLnJlbW92ZVRyYWNrKGF1ZGlvVHJhY2tzW2ldKTtcbiAgICB9XG4gICAgdGhpcy5zZXJ2aWNlLmNyZWF0ZUxvY2FsU3RyZWFtKHZpZGVvU3RyZWFtLCBcInZpZGVvXCIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJUQzsiLCJ2YXIgUlRDU2VydmljZSA9IHJlcXVpcmUoXCIuL1JUQ1NlcnZpY2UuanNcIik7XG52YXIgWE1QUEV2ZW50cyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL3htcHAvWE1QUEV2ZW50c1wiKTtcbnZhciBEYXRhQ2hhbm5lbHMgPSByZXF1aXJlKFwiLi9kYXRhX2NoYW5uZWxzXCIpO1xuXG52YXIgUlRDQWN0aXZhdG9yID0gKGZ1bmN0aW9uKClcbntcbiAgICB2YXIgcnRjU2VydmljZSA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBSVENBY3RpdmF0b3JQcm90bygpXG4gICAge1xuICAgICAgICBcbiAgICB9XG5cbiAgICBSVENBY3RpdmF0b3JQcm90by5zdG9wPSAgZnVuY3Rpb24gKCkge1xuICAgICAgICBydGNTZXJ2aWNlLmRpc3Bvc2UoKTtcbiAgICAgICAgcnRjU2VydmljZSA9IG51bGw7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkNvbmZlcmVuY2VDcmVhdGVkKGV2ZW50KSB7XG4gICAgICAgIERhdGFDaGFubmVscy5iaW5kRGF0YUNoYW5uZWxMaXN0ZW5lcihldmVudC5wZWVyY29ubmVjdGlvbik7XG4gICAgfVxuXG4gICAgUlRDQWN0aXZhdG9yUHJvdG8uc3RhcnQ9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcnRjU2VydmljZSA9IG5ldyBSVENTZXJ2aWNlKCk7XG4gICAgICAgIFhNUFBBY3RpdmF0b3IuYWRkTGlzdGVuZXIoWE1QUEV2ZW50cy5DT05GRVJFTkNFX0NFUkFURUQsIG9uQ29uZmVyZW5jZUNyZWF0ZWQpO1xuICAgICAgICBYTVBQQWN0aXZhdG9yLmFkZExpc3RlbmVyKFhNUFBFdmVudHMuQ0FMTF9JTkNPTUlORywgb25Db25mZXJlbmNlQ3JlYXRlZCk7XG4gICAgfVxuXG4gICAgUlRDQWN0aXZhdG9yUHJvdG8uZ2V0UlRDU2VydmljZT0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcnRjU2VydmljZTtcbiAgICB9XG5cbiAgICBSVENBY3RpdmF0b3JQcm90by5hZGRTdHJlYW1MaXN0ZW5lcj0gZnVuY3Rpb24obGlzdGVuZXIsIGV2ZW50VHlwZSlcbiAgICB7XG4gICAgICAgIHJldHVybiBSVENTZXJ2aWNlLmFkZFN0cmVhbUxpc3RlbmVyKGxpc3RlbmVyLCBldmVudFR5cGUpO1xuICAgIH1cblxuICAgIFJUQ0FjdGl2YXRvclByb3RvLnJlbW92ZVN0cmVhbUxpc3RlbmVyPSBmdW5jdGlvbihsaXN0ZW5lciwgZXZlbnRUeXBlKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIFJUQ1NlcnZpY2UucmVtb3ZlU3RyZWFtTGlzdGVuZXIobGlzdGVuZXIsIGV2ZW50VHlwZSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBSVENBY3RpdmF0b3JQcm90bztcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDQWN0aXZhdG9yO1xuIiwidmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIik7XG52YXIgUlRDID0gcmVxdWlyZShcIi4vUlRDLmpzXCIpO1xudmFyIFN0cmVhbUV2ZW50VHlwZXMgPSByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qc1wiKTtcbnZhciBNZWRpYVN0cmVhbSA9IHJlcXVpcmUoXCIuL01lZGlhU3RyZWFtLmpzXCIpO1xuXG5cbnZhciBSVENTZXJ2aWNlID0gZnVuY3Rpb24oKVxue1xuICAgIHZhciBldmVudEVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICBmdW5jdGlvbiBTdHJlYW0oc3RyZWFtLCB0eXBlKVxuICAgIHtcbiAgICAgICAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG4gICAgICAgIHRoaXMuZXZlbnRFbWl0dGVyID0gZXZlbnRFbWl0dGVyO1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICBldmVudEVtaXR0ZXIuZW1pdChTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRCwgdGhpcyk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5zdHJlYW0ub25lbmRlZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgc2VsZi5zdHJlYW1FbmRlZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgU3RyZWFtLnByb3RvdHlwZS5zdHJlYW1FbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLmVtaXQoU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX0xPQ0FMX0VOREVELCB0aGlzKTtcbiAgICB9XG5cbiAgICBTdHJlYW0ucHJvdG90eXBlLmdldE9yaWdpbmFsU3RyZWFtID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RyZWFtO1xuICAgIH1cblxuICAgIFN0cmVhbS5wcm90b3R5cGUuaXNBdWRpb1N0cmVhbSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnN0cmVhbS5nZXRBdWRpb1RyYWNrcygpICYmIHRoaXMuc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoID4gMCk7XG4gICAgfVxuXG4gICAgU3RyZWFtLnByb3RvdHlwZS5tdXRlID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgdmFyIGlzbXV0ZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIHRyYWNrcyA9IFtdO1xuICAgICAgICBpZih0aGlzLnR5cGUgPSBcImF1ZGlvXCIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRyYWNrcyA9IHRoaXMuc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICB0cmFja3MgPSB0aGlzLnN0cmVhbS5nZXRWaWRlb1RyYWNrcygpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgdHJhY2tzLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgICAgIGlzbXV0ZWQgPSAhdHJhY2tzW2lkeF0uZW5hYmxlZDtcbiAgICAgICAgICAgIHRyYWNrc1tpZHhdLmVuYWJsZWQgPSAhdHJhY2tzW2lkeF0uZW5hYmxlZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNtdXRlZDtcbiAgICB9XG5cbiAgICBTdHJlYW0ucHJvdG90eXBlLmlzTXV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0cmFja3MgPSBbXTtcbiAgICAgICAgaWYodGhpcy50eXBlID0gXCJhdWRpb1wiKVxuICAgICAgICB7XG4gICAgICAgICAgICB0cmFja3MgPSB0aGlzLnN0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgdHJhY2tzID0gdGhpcy5zdHJlYW0uZ2V0VmlkZW9UcmFja3MoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCB0cmFja3MubGVuZ3RoOyBpZHgrKykge1xuICAgICAgICAgICAgaWYodHJhY2tzW2lkeF0uZW5hYmxlZClcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gUlRDU2VydmljZVByb3RvKCkge1xuICAgICAgICB0aGlzLnJ0YyA9IG5ldyBSVEModGhpcyk7XG4gICAgICAgIHRoaXMucnRjLm9idGFpbkF1ZGlvQW5kVmlkZW9QZXJtaXNzaW9ucygpO1xuICAgICAgICB0aGlzLmxvY2FsU3RyZWFtcyA9IG5ldyBBcnJheSgpO1xuICAgICAgICB0aGlzLnJlbW90ZVN0cmVhbXMgPSBuZXcgQXJyYXkoKTtcbiAgICAgICAgdGhpcy5sb2NhbEF1ZGlvID0gbnVsbDtcbiAgICAgICAgdGhpcy5sb2NhbFZpZGVvID0gbnVsbDtcbiAgICB9XG5cblxuICAgIFJUQ1NlcnZpY2VQcm90by5hZGRTdHJlYW1MaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lciwgZXZlbnRUeXBlKSB7XG4gICAgICAgIGV2ZW50RW1pdHRlci5vbihldmVudFR5cGUsIGxpc3RlbmVyKTtcbiAgICB9O1xuXG4gICAgUlRDU2VydmljZVByb3RvLnJlbW92ZVN0cmVhbUxpc3RlbmVyID0gZnVuY3Rpb24gKGxpc3RlbmVyLCBldmVudFR5cGUpIHtcbiAgICAgICAgaWYoIShldmVudFR5cGUgaW5zdGFuY2VvZiBTdGVhbUV2ZW50VHlwZSkpXG4gICAgICAgICAgICB0aHJvdyBcIklsbGVnYWwgYXJndW1lbnRcIjtcblxuICAgICAgICBldmVudEVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoZXZlbnRUeXBlLCBsaXN0ZW5lcik7XG4gICAgfTtcblxuICAgIFJUQ1NlcnZpY2VQcm90by5wcm90b3R5cGUuY3JlYXRlTG9jYWxTdHJlYW0gPSBmdW5jdGlvbiAoc3RyZWFtLCB0eXBlKSB7XG4gICAgICAgIHZhciBsb2NhbFN0cmVhbSA9ICBuZXcgU3RyZWFtKHN0cmVhbSwgdHlwZSk7XG4gICAgICAgIHRoaXMubG9jYWxTdHJlYW1zLnB1c2gobG9jYWxTdHJlYW0pO1xuICAgICAgICBpZih0eXBlID09IFwiYXVkaW9cIilcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5sb2NhbEF1ZGlvID0gbG9jYWxTdHJlYW07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLmxvY2FsVmlkZW8gPSBsb2NhbFN0cmVhbTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9jYWxTdHJlYW07XG4gICAgfTtcbiAgICBcbiAgICBSVENTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnJlbW92ZUxvY2FsU3RyZWFtID0gZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5sb2NhbFN0cmVhbXMubGVuZ3RoOyBpKyspXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmKHRoaXMubG9jYWxTdHJlYW1zW2ldLmdldE9yaWdpbmFsU3RyZWFtKCkgPT09IHN0cmVhbSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmxvY2FsU3RyZWFtc1tpXTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgUlRDU2VydmljZVByb3RvLnByb3RvdHlwZS5jcmVhdGVSZW1vdGVTdHJlYW0gPSBmdW5jdGlvbiAoZGF0YSwgc2lkLCB0aGVzc3JjKSB7XG4gICAgICAgIHZhciByZW1vdGVTdHJlYW0gPSBuZXcgTWVkaWFTdHJlYW0oZGF0YSwgc2lkLCB0aGVzc3JjLCBldmVudEVtaXR0ZXIpO1xuICAgICAgICB0aGlzLnJlbW90ZVN0cmVhbXMucHVzaChyZW1vdGVTdHJlYW0pO1xuICAgICAgICByZXR1cm4gcmVtb3RlU3RyZWFtO1xuICAgIH1cblxuICAgIFJUQ1NlcnZpY2VQcm90by5wcm90b3R5cGUuZ2V0QnJvd3NlclR5cGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJ0Yy5icm93c2VyO1xuICAgIH07XG5cbiAgICBSVENTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdldFBDQ29uc3RyYWludHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJ0Yy5wY19jb25zdHJhaW50cztcbiAgICB9O1xuXG4gICAgUlRDU2VydmljZVByb3RvLnByb3RvdHlwZS5nZXRVc2VyTWVkaWFXaXRoQ29uc3RyYWludHMgPVxuICAgICAgICBmdW5jdGlvbih1bSwgc3VjY2Vzc19jYWxsYmFjaywgZmFpbHVyZV9jYWxsYmFjaywgcmVzb2x1dGlvbiwgYmFuZHdpZHRoLCBmcHMsIGRlc2t0b3BTdHJlYW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJ0Yy5nZXRVc2VyTWVkaWFXaXRoQ29uc3RyYWludHModW0sIHN1Y2Nlc3NfY2FsbGJhY2ssIGZhaWx1cmVfY2FsbGJhY2ssIHJlc29sdXRpb24sIGJhbmR3aWR0aCwgZnBzLCBkZXNrdG9wU3RyZWFtKTtcbiAgICAgICAgfTtcblxuICAgIFJUQ1NlcnZpY2VQcm90by5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBldmVudEVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKFwic3RhdGlzdGljcy5hdWRpb0xldmVsXCIpO1xuXG4gICAgICAgIGlmICh0aGlzLnJ0Yykge1xuICAgICAgICAgICAgdGhpcy5ydGMgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFJUQ1NlcnZpY2VQcm90bztcbn0oKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSVENTZXJ2aWNlO1xuIiwiLyogZ2xvYmFsIGNvbm5lY3Rpb24sIFN0cm9waGUsIHVwZGF0ZUxhcmdlVmlkZW8sIGZvY3VzZWRWaWRlb1NyYyovXG5cbi8vIGNhY2hlIGRhdGFjaGFubmVscyB0byBhdm9pZCBnYXJiYWdlIGNvbGxlY3Rpb25cbi8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD00MDU1NDVcbnZhciBfZGF0YUNoYW5uZWxzID0gW107XG5cblxudmFyIERhdGFDaGFubmVscyA9XG57XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayB0cmlnZ2VyZWQgYnkgUGVlckNvbm5lY3Rpb24gd2hlbiBuZXcgZGF0YSBjaGFubmVsIGlzIG9wZW5lZFxuICAgICAqIG9uIHRoZSBicmlkZ2UuXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCBpbmZvIG9iamVjdC5cbiAgICAgKi9cbiAgICBvbkRhdGFDaGFubmVsOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGRhdGFDaGFubmVsID0gZXZlbnQuY2hhbm5lbDtcblxuICAgICAgICBkYXRhQ2hhbm5lbC5vbm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oXCJEYXRhIGNoYW5uZWwgb3BlbmVkIGJ5IHRoZSBWaWRlb2JyaWRnZSFcIiwgZGF0YUNoYW5uZWwpO1xuXG4gICAgICAgICAgICAvLyBDb2RlIHNhbXBsZSBmb3Igc2VuZGluZyBzdHJpbmcgYW5kL29yIGJpbmFyeSBkYXRhXG4gICAgICAgICAgICAvLyBTZW5kcyBTdHJpbmcgbWVzc2FnZSB0byB0aGUgYnJpZGdlXG4gICAgICAgICAgICAvL2RhdGFDaGFubmVsLnNlbmQoXCJIZWxsbyBicmlkZ2UhXCIpO1xuICAgICAgICAgICAgLy8gU2VuZHMgMTIgYnl0ZXMgYmluYXJ5IG1lc3NhZ2UgdG8gdGhlIGJyaWRnZVxuICAgICAgICAgICAgLy9kYXRhQ2hhbm5lbC5zZW5kKG5ldyBBcnJheUJ1ZmZlcigxMikpO1xuXG4gICAgICAgICAgICAvLyB3aGVuIHRoZSBkYXRhIGNoYW5uZWwgYmVjb21lcyBhdmFpbGFibGUsIHRlbGwgdGhlIGJyaWRnZSBhYm91dCB2aWRlb1xuICAgICAgICAgICAgLy8gc2VsZWN0aW9ucyBzbyB0aGF0IGl0IGNhbiBkbyBhZGFwdGl2ZSBzaW11bGNhc3QsXG5cbiAgICAgICAgICAgIC8vIHdlIHdhbnQgdGhlIG5vdGlmaWNhdGlvbiB0byB0cmlnZ2VyIGV2ZW4gaWYgdXNlckppZCBpcyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvLyBvciBudWxsLlxuICAgICAgICAgICAgb25TZWxlY3RlZEVuZHBvaW50Q2hhbmdlZChVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5nZXRTZWxlY3RlZEpJRCgpKTtcbiAgICAgICAgfTtcblxuICAgICAgICBkYXRhQ2hhbm5lbC5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRGF0YSBDaGFubmVsIEVycm9yOlwiLCBlcnJvciwgZGF0YUNoYW5uZWwpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGRhdGFDaGFubmVsLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgLy8gSlNPTlxuICAgICAgICAgICAgdmFyIG9iajtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBvYmogPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICAgICAgICBcIkZhaWxlZCB0byBwYXJzZSBkYXRhIGNoYW5uZWwgbWVzc2FnZSBhcyBKU09OOiBcIixcbiAgICAgICAgICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YUNoYW5uZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCgndW5kZWZpbmVkJyAhPT0gdHlwZW9mKG9iaikpICYmIChudWxsICE9PSBvYmopKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbGlicmlDbGFzcyA9IG9iai5jb2xpYnJpQ2xhc3M7XG5cbiAgICAgICAgICAgICAgICBpZiAoXCJEb21pbmFudFNwZWFrZXJFbmRwb2ludENoYW5nZUV2ZW50XCIgPT09IGNvbGlicmlDbGFzcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFbmRwb2ludCBJRCBmcm9tIHRoZSBWaWRlb2JyaWRnZS5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGRvbWluYW50U3BlYWtlckVuZHBvaW50ID0gb2JqLmRvbWluYW50U3BlYWtlckVuZHBvaW50O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiRGF0YSBjaGFubmVsIG5ldyBkb21pbmFudCBzcGVha2VyIGV2ZW50OiBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbWluYW50U3BlYWtlckVuZHBvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICdkb21pbmFudHNwZWFrZXJjaGFuZ2VkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFtkb21pbmFudFNwZWFrZXJFbmRwb2ludF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChcIkxhc3RORW5kcG9pbnRzQ2hhbmdlRXZlbnRcIiA9PT0gY29saWJyaUNsYXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSBuZXcvbGF0ZXN0IGxpc3Qgb2YgbGFzdC1uIGVuZHBvaW50IElEcy5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGxhc3RORW5kcG9pbnRzID0gb2JqLmxhc3RORW5kcG9pbnRzO1xuICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgKiBUaGUgbGlzdCBvZiBlbmRwb2ludCBJRHMgd2hpY2ggYXJlIGVudGVyaW5nIHRoZSBsaXN0IG9mXG4gICAgICAgICAgICAgICAgICAgICAqIGxhc3QtbiBhdCB0aGlzIHRpbWUgaS5lLiB3ZXJlIG5vdCBpbiB0aGUgb2xkIGxpc3Qgb2YgbGFzdC1uXG4gICAgICAgICAgICAgICAgICAgICAqIGVuZHBvaW50IElEcy5cbiAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgIHZhciBlbmRwb2ludHNFbnRlcmluZ0xhc3ROID0gb2JqLmVuZHBvaW50c0VudGVyaW5nTGFzdE47XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0cmVhbSA9IG9iai5zdHJlYW07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgICAgICAgICBcIkRhdGEgY2hhbm5lbCBuZXcgbGFzdC1uIGV2ZW50OiBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RORW5kcG9pbnRzLCBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLCBvYmopO1xuXG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGFzdG5jaGFuZ2VkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFtsYXN0TkVuZHBvaW50cywgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Tiwgc3RyZWFtXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwiU2ltdWxjYXN0TGF5ZXJzQ2hhbmdlZEV2ZW50XCIgPT09IGNvbGlicmlDbGFzcykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRTaW11bGNhc3RMYXllcnMgPSBvYmouZW5kcG9pbnRTaW11bGNhc3RMYXllcnM7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3NpbXVsY2FzdGxheWVyc2NoYW5nZWQnLCBbZW5kcG9pbnRTaW11bGNhc3RMYXllcnNdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoXCJTdGFydFNpbXVsY2FzdExheWVyRXZlbnRcIiA9PT0gY29saWJyaUNsYXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzaW11bGNhc3RMYXllciA9IG9iai5zaW11bGNhc3RMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignc3RhcnRzaW11bGNhc3RsYXllcicsIHNpbXVsY2FzdExheWVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoXCJTdG9wU2ltdWxjYXN0TGF5ZXJFdmVudFwiID09PSBjb2xpYnJpQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNpbXVsY2FzdExheWVyID0gb2JqLnNpbXVsY2FzdExheWVyO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdzdG9wc2ltdWxjYXN0bGF5ZXInLCBzaW11bGNhc3RMYXllcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiRGF0YSBjaGFubmVsIEpTT04tZm9ybWF0dGVkIG1lc3NhZ2U6IFwiLCBvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBkYXRhQ2hhbm5lbC5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiVGhlIERhdGEgQ2hhbm5lbCBjbG9zZWRcIiwgZGF0YUNoYW5uZWwpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IF9kYXRhQ2hhbm5lbHMuaW5kZXhPZihkYXRhQ2hhbm5lbCk7XG4gICAgICAgICAgICBpZiAoaWR4ID4gLTEpXG4gICAgICAgICAgICAgICAgX2RhdGFDaGFubmVscyA9IF9kYXRhQ2hhbm5lbHMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIF9kYXRhQ2hhbm5lbHMucHVzaChkYXRhQ2hhbm5lbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmRzIFwib25kYXRhY2hhbm5lbFwiIGV2ZW50IGxpc3RlbmVyIHRvIGdpdmVuIFBlZXJDb25uZWN0aW9uIGluc3RhbmNlLlxuICAgICAqIEBwYXJhbSBwZWVyQ29ubmVjdGlvbiBXZWJSVEMgcGVlciBjb25uZWN0aW9uIGluc3RhbmNlLlxuICAgICAqL1xuICAgIGJpbmREYXRhQ2hhbm5lbExpc3RlbmVyOiBmdW5jdGlvbiAocGVlckNvbm5lY3Rpb24pIHtcbiAgICAgICAgaWYgKCFjb25maWcub3BlblNjdHApXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHBlZXJDb25uZWN0aW9uLm9uZGF0YWNoYW5uZWwgPSB0aGlzLm9uRGF0YUNoYW5uZWw7XG5cbiAgICAgICAgLy8gU2FtcGxlIGNvZGUgZm9yIG9wZW5pbmcgbmV3IGRhdGEgY2hhbm5lbCBmcm9tIEppdHNpIE1lZXQgdG8gdGhlIGJyaWRnZS5cbiAgICAgICAgLy8gQWx0aG91Z2ggaXQncyBub3QgYSByZXF1aXJlbWVudCB0byBvcGVuIHNlcGFyYXRlIGNoYW5uZWxzIGZyb20gYm90aCBicmlkZ2VcbiAgICAgICAgLy8gYW5kIHBlZXIgYXMgc2luZ2xlIGNoYW5uZWwgY2FuIGJlIHVzZWQgZm9yIHNlbmRpbmcgYW5kIHJlY2VpdmluZyBkYXRhLlxuICAgICAgICAvLyBTbyBlaXRoZXIgY2hhbm5lbCBvcGVuZWQgYnkgdGhlIGJyaWRnZSBvciB0aGUgb25lIG9wZW5lZCBoZXJlIGlzIGVub3VnaFxuICAgICAgICAvLyBmb3IgY29tbXVuaWNhdGlvbiB3aXRoIHRoZSBicmlkZ2UuXG4gICAgICAgIC8qdmFyIGRhdGFDaGFubmVsT3B0aW9ucyA9XG4gICAgICAgICB7XG4gICAgICAgICByZWxpYWJsZTogdHJ1ZVxuICAgICAgICAgfTtcbiAgICAgICAgIHZhciBkYXRhQ2hhbm5lbFxuICAgICAgICAgPSBwZWVyQ29ubmVjdGlvbi5jcmVhdGVEYXRhQ2hhbm5lbChcIm15Q2hhbm5lbFwiLCBkYXRhQ2hhbm5lbE9wdGlvbnMpO1xuXG4gICAgICAgICAvLyBDYW4gYmUgdXNlZCBvbmx5IHdoZW4gaXMgaW4gb3BlbiBzdGF0ZVxuICAgICAgICAgZGF0YUNoYW5uZWwub25vcGVuID0gZnVuY3Rpb24gKClcbiAgICAgICAgIHtcbiAgICAgICAgIGRhdGFDaGFubmVsLnNlbmQoXCJNeSBjaGFubmVsICEhIVwiKTtcbiAgICAgICAgIH07XG4gICAgICAgICBkYXRhQ2hhbm5lbC5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpXG4gICAgICAgICB7XG4gICAgICAgICB2YXIgbXNnRGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICBjb25zb2xlLmluZm8oXCJHb3QgTXkgRGF0YSBDaGFubmVsIE1lc3NhZ2U6XCIsIG1zZ0RhdGEsIGRhdGFDaGFubmVsKTtcbiAgICAgICAgIH07Ki9cbiAgICB9XG59O1xuXG5mdW5jdGlvbiBvblNlbGVjdGVkRW5kcG9pbnRDaGFuZ2VkKHVzZXJKaWQpXG57XG4gICAgY29uc29sZS5sb2coJ3NlbGVjdGVkIGVuZHBvaW50IGNoYW5nZWQ6ICcsIHVzZXJKaWQpO1xuICAgIGlmIChfZGF0YUNoYW5uZWxzICYmIF9kYXRhQ2hhbm5lbHMubGVuZ3RoICE9IDAgJiYgX2RhdGFDaGFubmVsc1swXS5yZWFkeVN0YXRlID09IFwib3BlblwiKSB7XG4gICAgICAgIF9kYXRhQ2hhbm5lbHNbMF0uc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAnY29saWJyaUNsYXNzJzogJ1NlbGVjdGVkRW5kcG9pbnRDaGFuZ2VkRXZlbnQnLFxuICAgICAgICAgICAgJ3NlbGVjdGVkRW5kcG9pbnQnOiAoIXVzZXJKaWQgfHwgdXNlckppZCA9PSBudWxsKVxuICAgICAgICAgICAgICAgID8gbnVsbCA6IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHVzZXJKaWQpXG4gICAgICAgIH0pKTtcbiAgICB9XG59XG5cbiQoZG9jdW1lbnQpLmJpbmQoXCJzZWxlY3RlZGVuZHBvaW50Y2hhbmdlZFwiLCBmdW5jdGlvbihldmVudCwgdXNlckppZCkge1xuICAgIG9uU2VsZWN0ZWRFbmRwb2ludENoYW5nZWQodXNlckppZCk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRhQ2hhbm5lbHM7XG5cbiIsInZhciBSVENCcm93c2VyVHlwZSA9IHtcbiAgICBSVENfQlJPV1NFUl9DSFJPTUU6IFwicnRjX2Jyb3dzZXIuY2hyb21lXCIsXG5cbiAgICBSVENfQlJPV1NFUl9GSVJFRk9YOiBcInJ0Y19icm93c2VyLmZpcmVmb3hcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSVENCcm93c2VyVHlwZTsiLCJ2YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHtcbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQ6IFwic3RyZWFtLmxvY2FsX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfTE9DQUxfRU5ERUQ6IFwic3RyZWFtLmxvY2FsX2VuZGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX1JFTU9URV9DUkVBVEVEOiBcInN0cmVhbS5yZW1vdGVfY3JlYXRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfRU5ERUQ6IFwic3RyZWFtLnJlbW90ZV9lbmRlZFwiXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmVhbUV2ZW50VHlwZXM7IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGhyaXN0byBvbiAxMC8yOS8xNC5cbiAqL1xudmFyIFhNUFBFdmVudHMgPSB7XG4gICAgQ09ORkVSRU5DRV9DRVJBVEVEOiBcInhtcHAuY29uZmVyZW5jZUNyZWF0ZWQuamluZ2xlXCIsXG4gICAgQ0FMTF9URVJNSU5BVEVEOiBcInhtcHAuY2FsbHRlcm1pbmF0ZWQuamluZ2xlXCIsXG4gICAgQ0FMTF9JTkNPTUlORzogXCJ4bXBwLmNhbGxpbmNvbWluZy5qaW5nbGVcIixcbiAgICBESVNQT1NFX0NPTkZFUkVOQ0U6IFwieG1wcC5kaXNwb2NlX2NvbmZlcm5jZVwiLFxuICAgIERJU1BMQVlfTkFNRV9DSEFOR0VEOiBcInhtcHAuZGlzcGxheV9uYW1lX2NoYW5nZWRcIlxuXG59O1xubW9kdWxlLmV4cG9ydHMgPSBYTVBQRXZlbnRzOyIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
