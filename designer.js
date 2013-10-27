(function() {
    var AudioRecorder = Widget.AudioRecorder.inherit(WAF.require('waf-behavior/studio'));

    AudioRecorder.addAttributes([{
        name        : 'data-binding-value',
        description : 'Source',
        typeValue   : 'datasource'
	}]);

	AudioRecorder.setWidth('200');
	AudioRecorder.setHeight('100');

    AudioRecorder.addEvent({ 'name': 'Change' });
    AudioRecorder.addEvent({ 'name': 'Play' });
    AudioRecorder.addEvent({ 'name': 'StopPlaying' });
    AudioRecorder.addEvent({ 'name': 'Record' });
    AudioRecorder.addEvent({ 'name': 'StopRecording' });
    AudioRecorder.addEvent({ 'name': 'Capture' });
    AudioRecorder.addEvent({ 'name': 'StopCapture' });

})();
