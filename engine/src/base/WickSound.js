// Class WickSound - Howl wrapper
WickSound = class {
	constructor(assetName) {
		this.asset = project.project.getAssetByName(assetName);
		this._pan         = 0;
		this._volume      = 1;
		this._seek        = 0;
		this._loop        = false;
		this._loopRange   = {low:0, high:this.duration()};
		this._hasCustomLoopRange = false;
		this._muteVolume  = 1;
	}

	// set a custom loop range, if low and high are the same as the sound duration
	setLoopRange(low, high) {
		if(low < 0) low = 0;
		if(high>this.duration()) high = this.duration();
		if(high<=low) {
			low = 0;
			high = this.duration();
		}

		if(low == 0 && high == this.duration()) {
			this._hasCustomLoopRange = false;
			return;
		} 

		// if the sound is playing and we are setting loop to true,
		this._hasCustomLoopRange = true;
		this._loopRange = {low:low, high:high};
	}

	// set sound to loop or not, returns is its looping when no argument is passed.
	loop(loop) {
		if(loop === null || loop === undefined) return (this._loop);

		this._loop = loop;

		if(!this._hasCustomLoopRange) {
			this.asset._howl.loop(this._loop);
		}
	}

	// required only to update the loop when using custom loop range
	updateLoop() {
		if(this._loop && this._hasCustomLoopRange) {
			if(this.isPlaying()) {
				let curr = this.currently();
				if (curr < this._loopRange.low || curr > this._loopRange.high) {
					this.seek(this._loopRange.low);
				}
			}
		}
	}

	// Method for volume control, volume = 1 is the default sound volume. 
	volume(volume) {
		if(volume === null || volume === undefined){
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

	// Method for rate control, rate = 1 is the default sound rate.
	// rate can go from 0.1 to 4
	rate(rate) {
		if(rate === null || rate === undefined){
			return this.asset._howl.rate();
		}

		if(rate<=0.01)   rate = 0.01;
		else if(rate>10) rate = 10;
		
		this.asset._howl.rate(rate);
	}

	// Method for panning pan = -1 all left, pan = 1 all right...
	stereo(pan) {
		if(pan === null || pan === undefined){
			return this._pan;
		}

		this._pan = pan;
		if(this._pan<-1)     this._pan = -1;
		else if(this._pan>1) this._pan = 1;
		
		this.asset._howl.stereo(this._pan);
	}

	// seek sound in seconds from 0 to sound duration
	seek(seconds) {
		if(seconds === null || seconds === undefined) {
			return this.asset._howl.seek();
		}

		this._seek = seconds;
		if(this._seek >this.duration()) this._seek = this.duration();
		else if(this._seek<0)           this._seek = 0;
		
		this.asset._howl.seek(this._seek);
	}

	// returns the internal Howl object
	getHowl(){
		return this.asset._howl;
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