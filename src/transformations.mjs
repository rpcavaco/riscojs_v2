import {GlobalConst} from './constants.js';
import {rad2Deg} from './geom.mjs';

import {identity, multiply, inverse, scaling, translation, twod_shift, rotation, getCartoScaling, vectorMultiply} from './matrices3.mjs';

class MapAffineTransformationMxColl {

	constructor() {
		this.scaling = [];
		this.translating = [];
		this.rotating = [];
	}	
	copy () {
		const ret = new MapAffineTransformationMxColl();
		ret.scaling = [...this.scaling];
		ret.translating = [...this.translating];
		ret.rotating = [...this.rotating];

		return ret;
	}
}
/** 
 * Class MapAffineTransformation
 * Transformation from ground length into canvas dots.
 * Canvas to terrain achieved aplying inverse matrix.
 * @param {string} opt_name - Optional name
 */
export class MapAffineTransformation extends MapAffineTransformationMxColl {

	constructor() {
		super();
		identity(this.scaling);
		identity(this.translating);
		identity(this.rotating);
		this.trace = false;
	}

	fromOther(p_other) {
		this.scaling = [...p_other.scaling];
		this.translating = [...p_other.scaling];
		this.rotating = [...p_other.rotating];
	}

	getMatrix(out_m) {
		multiply(this.scaling, this.rotating, out_m);
		multiply(out_m, this.translating, out_m);
		//m3.logMx(console, out_m);
	}
	logMx() {
		let outmx = [];
		this.getMatrix(outmx);
		console.info("logMx:", outmx);
	}
	getInvMatrix(out_m) {
		let tmp = [];
		this.getMatrix(tmp);
		inverse(tmp, out_m);
	}	
	setScaling(p_scalingf) {
		scaling(p_scalingf, -p_scalingf, this.scaling);
		if (this.trace) {
			console.info("setScaling "+p_scalingf+" 1:"+this.getReadableCartoScale(GlobalConst.MMPD));
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
	getTranslating(out_res) {
		out_res.length = 2;
		out_res[0] = this.translating[6];
		out_res[1] = this.translating[7];
	}
	setRotating(p_deg) {
		rotation(rad2Deg(p_deg), this.rotating);
	}
	getScalingFactor() {
		return getCartoScaling(this.scaling);
	}
	getReadableCartoScale(p_mmpd) {
		let ret = Math.round(1000.0 / (getCartoScaling(this.scaling) * p_mmpd));
		return ret;
	}
	setScaleFromReadableCartoScale(p_scaleval, p_mmpd) {		
		this.setScaling(1000.0 / (p_scaleval * p_mmpd));
	}
}

class TransformsQueue {
	constructor(p_mapctx) {
		this.mapctx = p_mapctx;
		this.queue = [],
		this.currentpos = -1;
		this.currentTransform = new MapAffineTransformation();
	}
	store() {
		this.queue.push(this.currentTransform.copy());
		this.currentpos = this.queue.length-1;
		this.mapctx.transformsChanged(this.queue.length > 1);
	}
	back() {
		let ret = false;

		if (this.queue.length > 0) {
			if (this.currentpos > 0) {
				this.currentpos--;
				this.currentTransform.fromOther(this.queue[this.currentpos]);
				ret = true;
			}
		}

		return ret;
	}
	forth() {
		let ret = false;

		if (this.queue.length > 0) {
			if (this.currentpos < (this.queue.length-1)) {
				this.currentpos++;
				this.currentTransform.fromOther(this.queue[this.currentpos]);
				ret = true;
			}
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

	constructor(p_mapctx, p_mapctx_config_var) {

		if (p_mapctx_config_var == null) {
			throw new Error("Class Transform2DMgr, null mapctx_config_var");
		}
		if (p_mapctx == null) {
			throw new Error("Class Transform2DMgr, null mapctx");
		}		

		this.mapctx = p_mapctx;
		this.mapctx_config_var = p_mapctx_config_var;
		
		let keys = ["terrain_center", "scale"];
		for (let i=0; i<keys.length; i++) {

			if (p_mapctx_config_var[keys[i]] === undefined) {
				throw new Error(`Class Transform2DMgr, mapctx_config is missing mandatory '${keys[i]}' entry`);
			}
	
		}	
		
		this.transformsQueue = new TransformsQueue(this.mapctx);		
		this.init();

		console.info("[init RISCO]  2D transform env prepared");

	}
	/**
	 * Method init 
	 * Initiate transforms manager with config values or reset it to those initial values
	 */
	init() {

		if (this.mapctx_config_var["scale"] === undefined) {
			throw new Error("Class Transform2DMgr, init, configuration JSON dictionary contains no 'scale' value");
		}

		this.setScaleFromReadableCartoScale(this.mapctx_config_var["scale"], false);
		this.setCenter(...this.mapctx_config_var["terrain_center"], true);

	}
	/**
	 * Method setScaleFromReadableCartoScale
	 * @param {float} p_scale 
	 */
	 setScaleFromReadableCartoScale(p_scale, opt_do_store) {

		if (Math.abs(this.getReadableCartoScale() - p_scale) <= GlobalConst.MINSCALEDIFF) { 
			return;
		}

		if (p_scale === null || isNaN(p_scale)) {
			throw new Error("Class Transform2DMgr, setScaleFromReadableCartoScale, invalid value was passed for scale");
		}
		let vscale, p1_scale = parseFloat(p_scale);
		if (p1_scale <= 0) {
			throw new Error("Class Transform2DMgr, setScaleFromReadableCartoScale, invalid negative or zero value was passed for scale");
		}
		
		// Constrain value
		if (GlobalConst.MINSCALE !== undefined) {
			vscale = Math.max(GlobalConst.MINSCALE, p1_scale);
		} else {
			vscale = p1_scale;
		}
		if (GlobalConst.MAXSCALE !== undefined) {
			vscale = Math.min(vscale, GlobalConst.MAXSCALE);
		}
		
		// Round
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
		ctrans.setScaleFromReadableCartoScale(vscale, GlobalConst.MMPD);

		if (opt_do_store) {
			this.transformsQueue.store();
		}
		
	}	

	getReadableCartoScale() {
		const ctrans = this.transformsQueue.currentTransform;		
		return ctrans.getReadableCartoScale(GlobalConst.MMPD);
	}

	/**
	 * Method setCenter in terrain coordinates
	 * @param {float} p_cx
	 * @param {float} p_cy 
	 */
	setCenter(p_cx, p_cy, opt_do_store) {

		if (p_cx === null || isNaN(p_cx)) {
			throw new Error("Class Transform2DMgr, setCenter, invalid value was passed for cx");
		}
		if (p_cy === null || isNaN(p_cy)) {
			throw new Error("Class Transform2DMgr, setCenter, invalid value was passed for cy");
		}

		let ox, oy, ctrans = this.transformsQueue.currentTransform;		
		var k, hwidth, hheight, fheight, cdims = [];

		this.mapctx.canvasmgr.getCanvasDims(cdims);
		k = ctrans.getScalingFactor();

		hwidth = (cdims[0] / 2.0) / k;
		fheight = cdims[1] / k;
		hheight = fheight / 2.0;
		
		/*console.log(['814 -- ', k, cdims[0], hwidth, p_cx]);
		console.log(['815 -- ', k, cdims[1], hheight, p_cy]); */
		
		ox = p_cx - hwidth;
		oy = p_cy - hheight;

		ctrans.setTranslating(-ox, -(oy + fheight));

		if (opt_do_store) {
			this.transformsQueue.store();
		}

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

	getTerrainTranslation(p_scrpt_a, p_scrpt_b, out_diff_pt) {
		
		if (p_scrpt_a === null || typeof p_scrpt_a != 'object' || p_scrpt_a.length != 2) {
			throw new Error(`Class Transform2DMgr, getTerrainTranslation, invalid canvas point A: ${p_scrpt_a}`);
		}
		if (p_scrpt_b === null || typeof p_scrpt_b != 'object' || p_scrpt_b.length != 2) {
			throw new Error(`Class Transform2DMgr, getTerrainTranslation, invalid canvas point B: ${p_scrpt_b}`);
		}
		
		let v1=[], v2=[], v3=[], v4=[], mx1=[];
		let ctrans = this.transformsQueue.currentTransform;

		out_diff_pt.length = 2;
		v1 = [parseFloat(p_scrpt_a[0]), parseFloat(p_scrpt_a[1]), 1];
		v3 = [parseFloat(p_scrpt_b[0]), parseFloat(p_scrpt_b[1]), 1];
		// get terrain coords from the inverse of current transformation
		ctrans.getInvMatrix(mx1);
		vectorMultiply(v1, mx1, v2);
		vectorMultiply(v3, mx1, v4);
		
		out_diff_pt[0] = v4[0] - v2[0];
		out_diff_pt[1] = v4[1] - v2[1];
	}	

	doPan(p_scrpt_a, p_scrpt_b, opt_do_store) {

		let ctrans, diff_pt = [];
		this.getTerrainTranslation(p_scrpt_a, p_scrpt_b, diff_pt);

		ctrans = this.transformsQueue.currentTransform;
		ctrans.translate(diff_pt[0], diff_pt[1]);

		if (opt_do_store) {
			this.transformsQueue.store();
		}
	}

	/**
	 * Method getCanvasPt
	 * @param {object} p_terrpt - Array of coordinates for a terrain point 
	 * @param {float} out_pt - Out parameter: array of coordinates for a canvas point 
	 */

	getCanvasPt(p_terrpt, out_pt) {
		if (p_terrpt === null || typeof p_terrpt != 'object' || p_terrpt.length != 2) {
			throw new Error(`Class Transform2DMgr, getTerrainPt, invalid terrain point: ${p_terrpt}`);
		}
		
		let v1=[], v2=[], mx1=[];
		let trans = this.transformsQueue.currentTransform;

		out_pt.length = 2;
		v1 = [parseFloat(p_terrpt[0]), parseFloat(p_terrpt[1]), 1];
		// get canvas coords from current transformation
		trans.getMatrix(mx1);
		vectorMultiply(v1, mx1, v2);
		
		out_pt[0] = Math.round(v2[0]);
		out_pt[1] = Math.floor(v2[1]);
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