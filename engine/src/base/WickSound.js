// Class WickSound - Howl wrapper
WickSound = class {
	constructor(assetName) {
		this.asset = project.project.getAssetByName(assetName);
		this._pan    = 0;
		this._volume = 1;
		this._seek   = 0;
		this._loop   = false;
		this._muteVolume = 1;
	}

	// set sound to loop or not, returns is its looping when no argument is passed.
	loop(loop) {
		if(loop === null || loop==undefined){
			return this._loop;
		}
		this._loop = loop;
		this.asset._howl.loop(this._loop);
	}

	// Method for volume control, volume = 1 is the default sound volume. 
	volume(volume) {
		if(volume === null || volume==undefined){
			return this._volume;
		}

		this._volume  = volume;
		if(this._volume<0) {
			this._volume = 0;
		}else if(this._volume>1) {
			this._volume = 1;
		}
		this.asset._howl.volume(this._volume);
	}

	// Method for panning pan = -1 all left, pan = 1 all right...
	stereo(pan) {
		if(pan === null || pan==undefined){
			return this._pan;
		}

		this._pan = pan;
		if(this._pan<-1) {
			this._pan = -1;
		}  else if(this._pan>1) {
			this._pan = 1;
		}
		this.asset._howl.stereo(this._pan);
	}

	// seek sound in seconds from 0 to sound duration
	seek(seconds) {
		if(seconds === null || seconds==undefined) {
			return this.asset._howl.seek();
		}

		this._seek = seconds;
		if(this._seek >this.duration()) {
			this._seek = this.duration();
		} else if(this._seek<0) {
			this._seek = 0;
		}
		this.asset._howl.seek(this._seek);
	}

	// play sound at specified second.  If no argument is 
	// passed, it will start at the beging.  If the current
	// sound is in pause, it will resume the sound from where
	// it was before the pause.
	play(seconds=this.seek()) {
		if(!this.isPlaying()) {
			this.seek(seconds);
			this.asset._howl.play();
		}
	}

	// It will mute the sound
	mute() {
		this._muteVolume = this._volume;
		this.volume(0);
	}

	// It will unmute the sound to previous volume.
	unmute() {
		this.volume(this._muteVolume);
	}

	// Returns true if the sound is playing
	isPlaying() {
		return this.asset._howl.playing()
	}

	// stop the sound
	stop() {
		this.asset._howl.stop();
		this.seek(0);
	}

	// It pause the sound
	pause() {
		this.asset._howl.pause();
		this._seek = this.currently();
	}

	// Retuns the current sound time cursor in seconds
	currently() {
		return this.asset._howl.seek();
	}

	// Retuns the duration of the sound
	duration() {
		return this.asset._howl.duration();
	}
}