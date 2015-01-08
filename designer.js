(function(AudioRecorder) {

  /*  AudioRecorder.addAttributes([{
        name        : 'data-binding-value',
        description : 'Source',
        typeValue   : 'datasource'
	}]);
*/
	AudioRecorder.setWidth('200');
	AudioRecorder.setHeight('100');

    AudioRecorder.addEvent({ 'name': 'change' });
    AudioRecorder.addEvent({ 'name': 'play' });
    AudioRecorder.addEvent({ 'name': 'stopPlaying' });
    AudioRecorder.addEvent({ 'name': 'record' });
    AudioRecorder.addEvent({ 'name': 'stopRecording' });
    AudioRecorder.addEvent({ 'name': 'capture' });
    AudioRecorder.addEvent({ 'name': 'stopCapture' });

});
