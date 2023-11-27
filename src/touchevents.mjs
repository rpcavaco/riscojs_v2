
import {GlobalConst} from './constants.js';

function copyTouch(touch, evt, type) {

	const rect = evt.target.getBoundingClientRect();

	const offx = touch.pageX - rect.left;
	const offy = touch.pageY - rect.top;

	return { 
		target: evt.target,
		identifier: touch.identifier, 
		pageX: touch.pageX, 
		pageY: touch.pageY,
		offsetX: offx, 
		offsetY: offy,
		clientX: touch.clientX, 
		clientY: touch.clientY,
		screenX: touch.screenX, 
		screenY: touch.screenY,
		type: type
	};
}	

export class TouchController {
	

	constructor () {
		this.zoomcenter = [];
		this.waitPeriodMsec = 400;
		this.initPinchDiagonal = null;
		this.start = [];
		
		this.ongoingTouches = [];
	}

	adapt(p_evt) {
		let ret;
		const evttypes = ["touchstart", "touchmove", "touchend", "touchcancel"];
		if (evttypes.indexOf(p_evt.type) >= 0) {
			switch(p_evt.type) {

				case "touchstart":
					ret = this.touchstart(p_evt);
					break;

				case "touchmove":
					ret = this.touchmove(p_evt);
					break;
					
				case "touchend":
					ret = this.touchend(p_evt);
					break;

				case "touchcancel":
					ret = this.touchend(p_evt);
					break;
	
			}
		} else {
			ret = p_evt;
		}

		return ret;
	}
	
	ongoingTouchIndexById(idToFind) {
		for (var i = 0; i < this.ongoingTouches.length; i++) {
			var id = this.ongoingTouches[i].identifier;
			if (id == idToFind) {
				return i;
			}
		}
		return -1;    // not found
	}
 
	touchstart(e) {
		
		e.preventDefault();
		let ret = null;
		let touches = e.changedTouches;
		this.zoomcenter.length = 0;
		
		for (let i = 0; i < touches.length; i++) {
			this.ongoingTouches.push(copyTouch(touches[i], e, "touchstart"));
		}
		if (this.ongoingTouches.length == 1) {
			ret = this.ongoingTouches[0];
		}
		if (this.ongoingTouches.length == 2) {
			this.initPinchDiagonal = null;
		}

		if (ret) {
			this.start = [ret.offsetX, ret.offsetY];
		}

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] TOUCH start ret:", ret, "start:", this.start);
		}

		return ret;
	}

	touchmove(e) {
		e.preventDefault();
		let ret = null;
		let idx, touches = e.changedTouches;
		const move_sensibility = 4;

		for (let i = 0; i < touches.length; i++) {
			idx = this.ongoingTouchIndexById(touches[i].identifier);
			if (idx >= 0) {
				this.ongoingTouches.splice(idx, 1, copyTouch(touches[i], e, "touchmove"));
			}
		}

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] TOUCH touchmove ong_touches:", this.ongoingTouches.length);
		}

		if (this.ongoingTouches.length == 1) {
			ret = this.ongoingTouches[0];
		} else if (this.ongoingTouches.length == 2) {
			ret = this.handlepinch();
		}

		if (ret != null && this.start.length > 0) {
			if (ret['offsetX'] !== undefined) {
				if (Math.abs(ret.offsetX - this.start[0]) <= move_sensibility && Math.abs(ret.offsetY - this.start[1]) <= move_sensibility) {
					ret = null;
				}
			}
		}
		return ret;
	}

	touchend(e) {
		
		e.preventDefault();
		let ret = null, found = null;
		let idx, touches = e.changedTouches;

		for (let i = 0; i < touches.length; i++) {
			idx = this.ongoingTouchIndexById(touches[i].identifier);
			if (idx >= 0) {
				if (found == null) {
					found = copyTouch(touches[i], e, "touchend");
				}
				this.ongoingTouches.splice(idx, 1);
			}
		}
		
		// When second touchend fires after two-finger pinching movement
		// this.started == false already, so that ret value returns null 
		// signaling the caller to do nothing
		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] TOUCH touchend len:", touches.length, "start:", this.start);
		}

		if (touches.length == 1 && this.start.length > 0) {
			ret = found;
		} else {
			this.initPinchDiagonal = null;
		}

		this.start.length = 0;
		return ret;
		
	}

	handlepinch() {
		
		let xcoord, ycoord, dx=null, dy=null, t;
		let coords=[], minx=999999, miny=999999;
		let maxx=-999999, maxy=-999999, d, k, diff, maxdim;
		
		if (this.ongoingTouches.length < 2) {
			return;
		};

		const newevt = { 
			type: "touchpinch"
		};
			
		for (let i=0; i < 2; i++) {
			t = this.ongoingTouches[i];
			//getEvtCoords(t, t.target, coords);
			minx = Math.min(minx, t.offsetX);
			miny = Math.min(miny, t.offsetY);
			maxx = Math.max(maxx, t.offsetX);
			maxy = Math.max(maxy, t.offsetY);
			}
		dx = parseInt(maxx - minx);
		dy = parseInt(maxy - miny);
		d = parseInt(Math.sqrt(dx * dx + dy * dy));
		
		if (this.initPinchDiagonal === null) {
			this.initPinchDiagonal = d;
			return null;
		}
				
		newevt['centerx'] = minx + (dx/2.0);
		newevt['centery'] = miny + (dy/2.0);

		newevt['scale'] = this.initPinchDiagonal / d;

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] TOUCH handlepinch evt:", newevt);
		}

		return newevt;
	}

}	