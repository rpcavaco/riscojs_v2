import {GlobalConst} from './constants.js';
import {geomTest, rad2Deg} from './geom.mjs';
import {identity, multiply, inverse, scaling, translation, twod_shift, rotation, getCartoScaling, vectorMultiply} from './matrices3.mjs';
		


import {getCookie, setCookie} from './utils.mjs';

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

	getPixSize() {
		return 1.0 / this.getScalingFactor();
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

	mapctx;
	transformsQueue;

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
				throw new Error(`Class Transform2DMgr, 'basic' config is missing mandatory '${keys[i]}' entry`);
			}
	
		}	
		
		this.transformsQueue = new TransformsQueue(this.mapctx);		
		this.init();

		geomTest();		

		console.info("[init RISCO]  2D transform env prepared");

	}

	static _step(p_auxscale, p_step) {

		let step = 0;

		if (p_auxscale < 600) {
			step = p_step;
		} else if (p_auxscale < 1500) {
			step = p_step * 1.5;
		} else if (p_auxscale < 2000) {
			step = p_step * 3;
		} else if (p_auxscale < 3000) {
			step = p_step * 5;
		} else if (p_auxscale < 5000) {
			step = p_step * 8;
		} else if (p_auxscale < 7000) {
			step = p_step * 10;
		} else {
			step = p_step * 14;
		}

		return step;
	}

	/**
	 * Method init 
	 * Initiate transforms manager with config values or reset it to those initial values
	 */
	init() {

		if (this.mapctx_config_var["scale"] === undefined) {
			throw new Error("Class Transform2DMgr, init, configuration JSON dictionary contains no 'scale' value");
		}

		let scalev, tc = getCookie("risco_mapscale");
		if (tc.length < 1) {
			tc = this.mapctx_config_var["scale"];
			scalev = parseFloat(tc);
		} else {
			if (isNaN(parseFloat(tc))) {
				throw new Error("Invalid scale in 'risco_mapscale' cookie:", tc);
			}
			scalev = parseFloat(tc);
		}

		if (scalev < GlobalConst.MINSCALE) {
			scalev = GlobalConst.MINSCALE;
		}

		this.setScaleFromReadableCartoScale(scalev, false);

		let tcobj;
		tc = getCookie("risco_terrain_center");
		if (tc.length < 1) {
			tcobj = this.mapctx_config_var["terrain_center"];
		} else {
			tcobj = tc.split("_");
		}
				
		this.setCenter(...tcobj, true);
	}

	/* Method setScaleFromReadableCartoScale
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

		// BASIC_CONFIG_DEFAULTS_OVERRRIDE
		if (this.mapctx_config_var['set_mapenv_cookies'] === undefined || this.mapctx_config_var['set_mapenv_cookies']) {
			setCookie("risco_mapscale", vscale.toString());
		}		
		
	}	

	getReadableCartoScale() {
		const ctrans = this.transformsQueue.currentTransform;		
		return ctrans.getReadableCartoScale(GlobalConst.MMPD);
	}

	getScalingFactor() {
		const ctrans = this.transformsQueue.currentTransform;		
		return ctrans.getScalingFactor();
	}	

	convertScalingFactorToReadableScale(p_scalingf) {
		return Math.round(1000.0 / (p_scalingf * GlobalConst.MMPD));
	}

	convertReadableScaleToScalingFactor(p_scale) {
		return 1000.0 / (p_scale * GlobalConst.MMPD);
	}

	getPixSize() {
		const ctrans = this.transformsQueue.currentTransform;		
		return ctrans.getPixSize();
	}	

	/**
	 * Method setCenter in terrain coordinates
	 * @param {float} p_cx
	 * @param {float} p_cy 
	 */
	setCenter(p_cx, p_cy, b_do_store) {

		if (p_cx === null || isNaN(p_cx)) {
			throw new Error("Class Transform2DMgr, setCenter, invalid value was passed for cx", p_cx);
		}
		if (p_cy === null || isNaN(p_cy)) {
			throw new Error("Class Transform2DMgr, setCenter, invalid value was passed for cy", p_cy);
		}

		let ox, oy;
		const ctrans = this.transformsQueue.currentTransform;		
		let k, hwidth, hheight, fheight, cdims = [];

		this.mapctx.renderingsmgr.getCanvasDims(cdims);
		k = ctrans.getScalingFactor();

		hwidth = (cdims[0] / 2.0) / k;
		fheight = cdims[1] / k;
		hheight = fheight / 2.0;
		
		/*console.log(['814 -- ', k, cdims[0], hwidth, p_cx]);
		console.log(['815 -- ', k, cdims[1], hheight, p_cy]); */
		
		ox = p_cx - hwidth;
		oy = p_cy - hheight;

		ctrans.setTranslating(-ox, -(oy + fheight));

		if (b_do_store) {
			this.transformsQueue.store();
		}

		// BASIC_CONFIG_DEFAULTS_OVERRRIDE
		if (this.mapctx_config_var['set_mapenv_cookies'] === undefined || this.mapctx_config_var['set_mapenv_cookies']) {
			setCookie("risco_terrain_center", `${p_cx}_${p_cy}`);
		}
	}	

	getCenter(out_ret) {

		out_ret.length = 2;

		let k, trpt = [], cdims = [], hwidth, hheight, fheight, ox, oy;

		this.mapctx.renderingsmgr.getCanvasDims(cdims);

		const ctrans = this.transformsQueue.currentTransform;	
		k = ctrans.getScalingFactor();	

		hwidth = (cdims[0] / 2.0) / k;
		fheight = cdims[1] / k;
		hheight = fheight / 2.0;

		ctrans.getTranslating(trpt);
		ox = -trpt[0];
		oy = -trpt[1] - fheight;

		out_ret[0] = ox + hwidth;
		out_ret[1] = oy + hheight;


	}

	getPixSize() {
		const ctrans = this.transformsQueue.currentTransform;		
		return ctrans.getPixSize();
	}	

	setScaleCenteredAtPoint(p_scaleval, p_terrain_pt, do_store) {

		this.setScaleFromReadableCartoScale(p_scaleval, false);
		this.setCenter(p_terrain_pt[0], p_terrain_pt[1], do_store);		
	}

	setScaleCenteredAtScrPoint(p_scaleval, p_screen_pt, do_store) {

		const cen= [], terr_pt_from = [], terr_pt_to = [], newpt = [];

		this.getTerrainPt(p_screen_pt, terr_pt_from);

		this.setScaleFromReadableCartoScale(p_scaleval, false);

		this.getTerrainPt(p_screen_pt, terr_pt_to);
		this.getCenter(cen);

		newpt.length = 2;
		newpt[0] = cen[0] + terr_pt_from[0] - terr_pt_to[0];
		newpt[1] = cen[1] + terr_pt_from[1] - terr_pt_to[1];	

		this.setCenter(newpt[0], newpt[1], do_store);		
	}

	setScaleCenteredAtScreenCenter(p_scaleval, do_store) {

		const cdims = [], cen= [], terr_pt_from = [], terr_pt_to = [], newpt = [];
		let maxscl = Number.MAX_SAFE_INTEGER;

		if (this.mapctx.cfgvar.basic["maxscaleview"] !== undefined && this.mapctx.cfgvar.basic["maxscaleview"]["scale"] !== undefined && this.mapctx.cfgvar.basic["maxscaleview"]["terrain_center"] !== undefined) {
			maxscl = this.mapctx.cfgvar.basic["maxscaleview"]["scale"];
		}

		if (p_scaleval >= maxscl) {
			return this.setScaleCenteredAtPoint(p_scaleval, this.mapctx.cfgvar.basic["maxscaleview"]["terrain_center"], do_store);
		}

		this.mapctx.renderingsmgr.getCanvasDims(cdims);
		this.getTerrainPt([cdims[0] / 2, cdims[1] / 2], terr_pt_from);

		this.setScaleFromReadableCartoScale(p_scaleval, false);

		this.getTerrainPt([cdims[0] / 2, cdims[1] / 2], terr_pt_to);
		this.getCenter(cen);

		newpt.length = 2;
		newpt[0] = cen[0] + terr_pt_from[0] - terr_pt_to[0];
		newpt[1] = cen[1] + terr_pt_from[1] - terr_pt_to[1];	

		this.setCenter(newpt[0], newpt[1], do_store);		
	}

	zoomOut(p_maxscale, p_step, do_store) {

		const auxscale = this.getReadableCartoScale();

		const scl = Math.min(auxscale + this.constructor._step(auxscale, p_step), p_maxscale);
		this.setScaleCenteredAtScreenCenter(scl, do_store);
	}



	zoomIn(p_minscale, p_step, do_store) {

		const auxscale = this.getReadableCartoScale();

		const scl = Math.max(auxscale - this.constructor._step(auxscale, p_step), p_minscale);
		this.setScaleCenteredAtScreenCenter(scl, do_store);
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

	getScrPt(p_terrain_pt, out_pt) {
		
		if (p_terrain_pt === null || typeof p_terrain_pt != 'object' || p_terrain_pt.length != 2) {
			throw new Error(`Class Transform2DMgr, getScrPt, invalid terrain point: ${p_terrain_pt}`);
		}
		
		let v1=[], v2=[], mx1=[];
		let ctrans = this.transformsQueue.currentTransform;

		out_pt.length = 2;
		v1 = [parseFloat(p_terrain_pt[0]), parseFloat(p_terrain_pt[1]), 1];
		// get terrain coords from the current transformation
		ctrans.getMatrix(mx1);
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

		let ctrans, diff_pt = [], cen_pt=[];
		this.getTerrainTranslation(p_scrpt_a, p_scrpt_b, diff_pt);

		ctrans = this.transformsQueue.currentTransform;
		ctrans.translate(diff_pt[0], diff_pt[1]);

		if (opt_do_store) {
			this.transformsQueue.store();
		}

		this.getCenter(cen_pt);

		// BASIC_CONFIG_DEFAULTS_OVERRRIDE
		if (this.mapctx_config_var['set_mapenv_cookies'] === undefined || this.mapctx_config_var['set_mapenv_cookies']) {
			setCookie("risco_terrain_center", `${cen_pt[0]}_${cen_pt[1]}`);
		}		
	}

	/**
	 * Method getRenderingCoordsPt
	 * @param {object} p_terrpt - Array of coordinates for a terrain point 
	 * @param {float} out_pt - Out parameter: array of coordinates for a canvas point 
	 */

	getRenderingCoordsPt(p_terrpt, out_pt) {
		if (p_terrpt === null || typeof p_terrpt != 'object' || p_terrpt.length != 2) {
			throw new Error(`Class Transform2DMgr, getTerrainPt, invalid terrain point: ${p_terrpt}, type:${typeof p_terrpt}, len:${p_terrpt.length}`);
		}
		
		let v1=[], v2=[], mx1=[];
		let trans = this.transformsQueue.currentTransform;

		out_pt.length = 2;
		v1 = [parseFloat(p_terrpt[0]), parseFloat(p_terrpt[1]), 1];
		// get canvas coords from current transformation
		trans.getMatrix(mx1);
		vectorMultiply(v1, mx1, v2);
		
		out_pt[0] = Math.round(v2[0]);
		out_pt[1] = Math.round(v2[1]);
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
		
		// minx, miny, maxx, maxy, ready for rotation
		out_env[0] = Math.min(terrainPtUL[0], terrainPtLR[0]);
		out_env[1] = Math.min(terrainPtLR[1], terrainPtUL[1]);		
		out_env[2] = Math.max(terrainPtUL[0], terrainPtLR[0]);
		out_env[3] = Math.max(terrainPtLR[1], terrainPtUL[1]);		
	}	

	zoomToRect(p_min_terrain_x, p_min_terrain_y, p_max_terrain_x, p_max_terrain_y) {
		
		const cdims = [];
		const dw = p_max_terrain_x - p_min_terrain_x, dh = p_max_terrain_y - p_min_terrain_y;
		const cx = p_min_terrain_x + (dw / 2.0), cy = p_min_terrain_y + (dh / 2.0);
		let readableScale;

		this.mapctx.renderingsmgr.getCanvasDims(cdims);

		if (dw > dh) {
			readableScale = Math.round(1000.0 / (cdims[0] * GlobalConst.ZOOM2RECT_PERC / dw * GlobalConst.MMPD));
		} else {
			readableScale = Math.round(1000.0 / (cdims[1] * GlobalConst.ZOOM2RECT_PERC / dh * GlobalConst.MMPD));
		}

		this.setScaleCenteredAtPoint(readableScale, [cx, cy], true);
	}
}