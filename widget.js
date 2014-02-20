WAF.define('AudioRecorder', function() {
    var widget = WAF.require('waf-core/widget');
    var AudioRecorder = widget.create('AudioRecorder');

    // we setup standards methods if only vendor's specific one are available
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    if (!navigator.cancelAnimationFrame)
        navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
    if (!navigator.requestAnimationFrame)
        navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

    AudioRecorder.prototype.init = function() {
        if(window.AudioContext)
            this.audioContext = new AudioContext();

        // Setup HTML
        // This widget isn't a container, so lets override the node
        this.node.innerHTML = '<canvas></canvas>' +
        '    <div>' +
        '        <span></span>' +
        '        <button class="waf-audiorecorder-play"><span>Play</span></button>' +
        '        <button class="waf-audiorecorder-record"><span>Record</span></button>' +
        '        <button class="waf-audiorecorder-stop"><span>Stop</span></button>' +
        '        <button class="waf-audiorecorder-capture"><span>Capture</span></button>' +
        '    </div>';

        var canvas = this.node.getElementsByTagName('canvas')[0];
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        var ctx = this.context = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.fill();


        if(this.audioContext) {
            $('.waf-audiorecorder-play',    this.node).on('click', this.play.bind(this));
            $('.waf-audiorecorder-record',  this.node).on('click', this.record.bind(this));
            $('.waf-audiorecorder-stop',    this.node).on('click', this.stop.bind(this));
            $('.waf-audiorecorder-capture', this.node).on('click', this.capture.bind(this));

            // analyser setup
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 2048;

            // player setup
            this.player = new Audio();
            this.playerInput = this.audioContext.createMediaElementSource(this.player);
        }

        this.updateInterface();
    };

    AudioRecorder.prototype.capture = function() {
        console.log('capture');
        if(this._capture)
            this.stopCapture();
        else
            this.startCapture();
    };

    AudioRecorder.prototype.startCapture = function(callback) {
        if(this._capture) return;
        if(this.playing()) this.stop();
        
        if(!this.inputPoint) {
            // first run, so we need to initialize the capture stream
            if(navigator.getUserMedia) {
                navigator.getUserMedia({ audio:true }, this._gotStream.bind(this, callback), function(e) {
                    alert('Error getting audio');
                    console.log(e);
                });
            } else {
                this.node.innerHTML = 'Navigator not supported';
            }
        } else {
            // connect to the analyser
            this.inputPoint.connect(this.analyserNode);
            this.startAnalyser();

            this._capture = true;
            this.addClass('waf-state-capture');
            this.fire('capture', {});

            if(callback) callback();
        }
    };

    AudioRecorder.prototype.stopCapture = function() {
        if(!this._capture) return;
        if(this.recording()) this.stop();
        
        if(this.inputPoint)
            this.analyserNode.disconnect();
        
        // stop analyser animation
        this.stopAnalyser();

        this._capture = false;
        this.removeClass('waf-state-capture');
        this.fire('stopCapture', {});
    };

    AudioRecorder.prototype._gotStream = function(callback, stream) {
        // Create an AudioNode from the stream.
        this.audioInput = this.audioContext.createMediaStreamSource(stream);
        
        // Create a point to plus the recorder
        this.inputPoint = this.audioContext.createGain();
        this.audioInput.connect(this.inputPoint);
        // we need to specify the path to recorder worker
        // this shouldn't work if we use the widget outside a Wakanda Server
        this.audioRecorder = new Recorder(this.inputPoint, { workerPath: "/widgets-custom/AudioRecorder/recorderjs/recorderWorker.js" });

        // connect to the analyser
        this.inputPoint.connect( this.analyserNode );
        
        // start analyser animation
        this.startAnalyser();

        
        this._capture = true;
        this.addClass('waf-state-capture');
        this.fire('capture', {});

        if(callback) callback();
    }

    AudioRecorder.prototype.startAnalyser = function(time) {
        var ctx = this.context;

        // analyzer draw code here
        var SPACING = 3;
        var BAR_WIDTH = 1;
        var numBars = Math.round(this.canvasWidth / SPACING);
        var freqByteData = new Uint8Array(this.analyserNode.frequencyBinCount);

        this.analyserNode.getByteFrequencyData(freqByteData); 

        //ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.fill();

        ctx.fillStyle = '#F6D565';
        ctx.lineCap = 'round';
        var multiplier = this.analyserNode.frequencyBinCount / numBars;

        // Draw rectangle for each frequency bin.
        for (var i = 0; i < numBars; ++i) {
            var magnitude = 0;
            var offset = Math.floor( i * multiplier );
            // gotta sum/average the block, or we miss narrow-bandwidth spikes
            for (var j = 0; j< multiplier; j++)
                magnitude += freqByteData[offset + j];
            magnitude = magnitude / multiplier;
            var magnitude2 = freqByteData[i * multiplier];
            ctx.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            ctx.fillRect(i * SPACING, this.canvasHeight, BAR_WIDTH, -magnitude);
        }

        // start refreshing based on browser framerate
        this.requestAnimationFrameID = window.requestAnimationFrame( this.startAnalyser.bind(this) );
    };

    AudioRecorder.prototype.stopAnalyser = function() {
        if("requestAnimationFrameID" in this)
            window.cancelAnimationFrame( this.requestAnimationFrameID );

        var ctx = this.context;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.fill();
    }

    // stop analyser update before destroying the widget
    AudioRecorder.doBefore('destroy', function() {
        this._stopAnalyser();
    });

    AudioRecorder.prototype.record = function () {
        if(!this._capture)
            return this.startCapture(this.record.bind(this));

        if(this._recording) return;
        this._recording = new Date().getTime();
        this.addClass('waf-state-record');

        this.audioRecorder.clear(function() {
            this.audioRecorder.record();
            this.fire('record', {});
        }.bind(this));
    };

    AudioRecorder.prototype.stop = function() {
        if(this.recording()) {
            this._recording = false;
            this.removeClass('waf-state-record');


            this.audioRecorder.exportWAV(function(blob) {
                var f = new FileReader();
                f.onload = function() {
                    this.value(f.result);
                    this.fire('stopRecording', {});
                }.bind(this);
                f.readAsDataURL(blob);
            }.bind(this));
        }
        if(this.playing()) {
            this.player.pause();
            this.player.currentTime = 0;
            this.removeClass('waf-state-play');

            this.stopAnalyser();
            this.fire('stopPlaying', {});
        }
    };

    AudioRecorder.prototype.play = function() {
        if(!this.player) return;
        this.addClass('waf-state-play');
        
        this.stop();
        this.stopCapture();

        this.playerInput.connect(this.analyserNode);
        this.playerInput.connect(this.audioContext.destination);
        this.startAnalyser();
        this.player.play();
        this.fire('play', {});
    }

    AudioRecorder.prototype.playing = function() {
        return this.player && !!this.player.currentTime;
    }

    AudioRecorder.prototype.recording = function() {
        return !!this._recording;
    }

    AudioRecorder.addProperty('value', {
        onChange: function(url) {
            if(!this.player) return;
            if(url != this.player.src)
                this.player.src = url || '';
        }
    });

    var timeFormater = function(t) {
        t = Math.floor(t);
        return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
    };

    AudioRecorder.prototype.updateInterface = function() {
        clearTimeout(this._timeout_interface);
        var msg = '';

        if(this.recording()) {
            var t = new Date().getTime() - this._recording;
            msg = 'Recording - ' + timeFormater(t / 1000);
        } else if(this.playing()) {
            msg = 'Playing - ' + timeFormater(this.player.currentTime) + ' / ' + timeFormater(this.player.duration);
        } else {
            msg = 'Stopped - ' + timeFormater(this.player && this.player.duration || 0);
        }

        $('>div>span', this.node).html(msg);

        if(this.playing() && this.player.ended) {
            this.stop();
            this.stopAnalyser();
        }

        this._timeout_interface = setTimeout(this.updateInterface.bind(this), 200);
    };

	return AudioRecorder;
});
