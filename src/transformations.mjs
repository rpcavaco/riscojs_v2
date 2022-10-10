import {GlobalConst} from './constants.js';
import {rad2Deg} from './geom.mjs';

import {identity, multiply, inverse, scaling, translation, twod_shift, rotation, getCartoScaling, vectorMultiply} from './matrices3.mjs';

/** 
 * Class MapAffineTransformation
 * Transformation from ground length into canvas dots.
 * Canvas to terrain achieved aplying inverse matrix.
 * @param {string} opt_name - Optional name
 */
export class MapAffineTransformation {

	constructor(opt_name) {
		this.scaling = [];
		identity(this.scaling);
		this.translating = [];
		identity(this.translating);
		this.rotating = [];
		identity(this.rotating);
		this._rotval = null;
		this._transval = [];
		this._name = opt_name;
		this.trace = false;
	}

	setName(p_name) {
		this._name = p_name;
	}	
	getMatrix(out_m) {
		multiply(this.scaling, this.rotating, out_m);
		multiply(out_m, this.translating, out_m);
		//m3.logMx(console, out_m);
	}
	logMx() {
		let outmx = [];
		this.getMatrix(outmx);
		console.log("logMx:", outmx);
	}
	getInvMatrix(out_m) {
		let tmp = [];
		this.getMatrix(tmp);
		inverse(tmp, out_m);
	}	
	setScaling(p_scalingf) {
		scaling(p_scalingf, -p_scalingf, this.scaling);
		if (this.trace) {
			console.log("setScaling "+p_scalingf+" 1:"+this.getCartoScaleVal(GlobalConst.MMPD));
		}
	}
	setTranslating(p_tx, p_ty) {
		translation(p_tx, p_ty, this.translating);
		if (this.trace) {
			console.trace(['translating', p_tx, p_ty]);
		}
	}
	translate(p_dx, p_dy) {
		twod_shift(this.translating, p_dx, p_dy);
		if (this.trace) {
			console.trace(['2dshift', p_dx, p_dy]);
		}
	}
	getTranslate(out_res) {
		out_res.length = 2;
		out_res[0] = this.translating[6];
		out_res[1] = this.translating[7];
	}
	setRotating(p_deg) {
		rotation(rad2Deg(p_deg), this.rotating);
	}
	getScaling() {
		return getCartoScaling(this.scaling);
	}
	getCartoScaleVal(p_mmpd) {
		return Math.round(1000.0 / (getCartoScaling(this.scaling) * p_mmpd));
	}
	setScaleFromCartoScale(p_scaleval, p_mmpd) {		
		this.setScaling(1000.0 / (p_scaleval * p_mmpd));
	}
}

class TransformsQueue {
	constructor() {
		this._queue = [],
		this.currentTransform = new MapAffineTransformation();
	}
	checkToStore() {
		this._queue.push(structuredClone(this.currentTransform));
		this._queue[this._queue.length-1].setName(String.format("trans n.º {0}", this._queue.length));
	}
	getLastStored() {
		let ret = null;
		if (this._queue.length > 0) {
			ret = this._queue[this._queue.length-1];
		}
		return ret;
	}
}

/**
 * Class Transform2DMgr
 * 
 * Manager class for simple linear geometric coordinate transforms in 2D space (avoiding geographic projection systems).
 * 
 * @param {object} p_mapctx_config_var - Variable object containing configuration JSON dictionary~
 * @param {object} p_canvasmgr - HTML5 Canvases manager
 * 
 */
 export class Transform2DMgr {

	constructor(p_mapctx_config_var, p_canvasmgr) {

		if (p_mapctx_config_var == null) {
			throw new Error("Class Transform2DMgr, null mapctx_config_var");
		}
		if (p_canvasmgr == null) {
			throw new Error("Class Transform2DMgr, null canvasmgr");
		}		
		this.mapctx_config_var = p_mapctx_config_var;
		this.canvasmgr = p_canvasmgr;
		
		let keys = ["terrain_center", "scale"];
		for (let i=0; i<keys.length; i++) {

			if (p_mapctx_config_var[keys[i]] === undefined) {
				throw new Error(`Class Transform2DMgr, mapctx_config is missing mandatory '${keys[i]}' entry`);
			}
	
		}	
		
		this.transformsQueue = new TransformsQueue();		
		this.init();

		console.log("2D transforms prepared");

	}
	/**
	 * Method init 
	 * Initiate transforms manager with config values or reset it to those initial values
	 */
	init() {

		if (this.mapctx_config_var["scale"] === undefined) {
			throw new Error("Class Transform2DMgr, init, configuration JSON dictionary contains no 'scale' value");
		}

		this.setScale(this.mapctx_config_var["scale"]);
		this.setCenter(...this.mapctx_config_var["terrain_center"]);
	}
	/**
	 * Method setScale
	 * @param {float} p_scale 
	 */
	setScale(p_scale) {

		if (p_scale === null || isNaN(p_scale)) {
			throw new Error("Class Transform2DMgr, setScale, invalid value was passed for scale");
		}
		let vscale, p1_scale = parseFloat(p_scale);
		if (p1_scale <= 0) {
			throw new Error("Class Transform2DMgr, setScale, invalid negative or zero value was passed for scale");
		}
		
		// Arredondar
		if (p1_scale < GlobalConst.MINSCALE) {
			vscale = GlobalConst.MINSCALE;
		} else {
			vscale = p1_scale;
		}
		
		if (vscale < 250) {
			vscale = parseInt(Math.round(vscale));
		} else if (vscale < 500) {
			vscale = parseInt(Math.round(vscale / 10.0)) * 10.0;
		} else if (vscale < 2000) {
			vscale = parseInt(Math.round(vscale / 10.0)) * 10.0;
		} else if (vscale < 10000) {
			vscale = parseInt(Math.round(vscale / 100.0)) * 100.0;
		} else if (vscale < 100000) {
			vscale = parseInt(Math.round(vscale / 1000.0)) * 1000.0;
		} else if (vscale < 1000000) {
			vscale = parseInt(Math.round(vscale / 10000.0)) * 10000.0;
		} else {
			vscale = parseInt(Math.round(vscale));
		}
		
		const ctrans = this.transformsQueue.currentTransform;	
		ctrans.setScaleFromCartoScale(vscale, GlobalConst.MMPD);
		
	}	

	/**
	 * Method setCenter
	 * @param {float} p_cx 
	 * @param {float} p_cy 
	 */
	 setCenter(p_cx, p_cy) {

		if (p_cx === null || isNaN(p_cx)) {
			throw new Error("Class Transform2DMgr, setCenter, invalid value was passed for cx");
		}
		if (p_cy === null || isNaN(p_cy)) {
			throw new Error("Class Transform2DMgr, setCenter, invalid value was passed for cy");
		}

		let ox, oy, ctrans = this.transformsQueue.currentTransform;		
		var k, hwidth, hheight, fheight, cdims = [];

		this.canvasmgr.getCanvasDims(cdims);
		k = ctrans.getScaling();

		hwidth = (cdims[0] / 2.0) / k;
		fheight = cdims[1] / k;
		hheight = fheight / 2.0;
		
		/*console.log(['814 -- ', k, cdims[0], hwidth, p_cx]);
		console.log(['815 -- ', k, cdims[1], hheight, p_cy]); */
		
		ox = p_cx - hwidth;
		oy = p_cy - hheight;

		//console.log([ox, oy]);

		ctrans.setTranslating(-ox, -(oy + fheight));
		//ctrans.setTranslating(-ox, -oy);
	}	
	
	/**
	 * Method getTerrainPt
	 * @param {object} p_scrpt - Array of coordinates for a canvas point 
	 * @param {float} out_pt - Out parameter: array of coordinates for a terrain point 
	 */
	getTerrainPt(p_scrpt, out_pt) {
		if (p_scrpt === null || typeof p_scrpt != 'object' || p_scrpt.length != 2) {
			throw new Error(`Class Transform2DMgr, getTerrainPt, invalid canvas point: ${p_scrpt}`);
		}
		
		let v1=[], v2=[], mx1=[];
		let ctrans = this.transformsQueue.currentTransform;

		out_pt.length = 2;
		v1 = [parseFloat(p_scrpt[0]), parseFloat(p_scrpt[1]), 1];
		// get terrain coords from the inverse of current transformation
		ctrans.getInvMatrix(mx1);
		vectorMultiply(v1, mx1, v2);
		
		out_pt[0] = v2[0];
		out_pt[1] = v2[1];
	}	

	/**
	 * Method getCanvasPt
	 * @param {object} p_terrpt - Array of coordinates for a terrain point 
	 * @param {float} out_pt - Out parameter: array of coordinates for a canvas point 
	 */
	getCanvasPt(p_terrpt, out_pt) {
		if (p_scrpt === null || typeof p_scrpt != 'object' || p_scrpt.length != 2) {
			throw new Error(`Class Transform2DMgr, getTerrainPt, invalid terrain point: ${p_terrpt}`);
		}
		
		let v1=[], v2=[], mx1=[];
		let trans = this.transformsQueue.currentTransform;

		out_pt.length = 2;
		v1 = [parseFloat(p_terrpt[0]), parseFloat(p_terrpt[1]), 1];
		// get canvas coords from current transformation
		trans.getMatrix(mx1);
		vectorMultiply(v1, mx1, v2);
		
		out_pt[0] = v2[0];
		out_pt[1] = v2[1];
	}	

	getMapBounds(p_canvasdims, out_env) {

		if (p_canvasdims === null || typeof p_canvasdims != 'object' || p_canvasdims.length != 2) {
			throw new Error(`Class Transform2DMgr, getMapBounds, canvas dims: ${p_canvasdims}`);
		}

		const terrainPtUL = [];
		this.getTerrainPt([0, 0], terrainPtUL);
		const terrainPtLR = [];
		this.getTerrainPt(p_canvasdims, terrainPtLR);

		out_env.length = 4;
		
		// minx, miny, maxx, maxy
		out_env[0] = terrainPtUL[0];
		out_env[1] = terrainPtLR[1];		
		out_env[2] = terrainPtLR[0];
		out_env[3] = terrainPtUL[1];		
	}	


}