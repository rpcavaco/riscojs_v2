
import {GlobalConst} from './constants.js';
import {AreaGridLayer} from './vectorlayers.mjs';
import {EditManager} from './edit_manager.mjs';
import {dist2D} from './geom.mjs';

export class BaseTool {

	enabled = true;
	start_time = null;
	editmanager = null;
	name = 'BaseTool';
	constructor(p_joinstogglegroup, opt_defaultintoggle) {
		this.joinstogglegroup = p_joinstogglegroup;
		if (this.joinstogglegroup) {
			if (opt_defaultintoggle == null) {
				this.defaultintoggle = false;
			} else {
				this.defaultintoggle = opt_defaultintoggle;
			}
		} else {
			this.defaultintoggle = false;
		}
	}

	onEvent(p_mapctx, p_evt) {
		// Abstract

		// event had no interaction with this tool
		return false;
	}

	setEditManager(p_edit_manager) {
		this.editmanager = p_edit_manager;
	}

	concludePendingAction(p_mapctx, p_evt) {
		return false
	}

}


class DefaultTool extends BaseTool {

	name = 'DefaultTool';
	constructor() {
		super(false);
	}

	onEvent(p_mapctx, p_evt) {

		let ret = false;

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] DEFTOOL, evt.type:", p_evt.type);
		}

		if (p_evt.type == 'mousemove') {
			p_mapctx.printMouseCoords(p_evt.clientX, p_evt.clientY);
			ret = true;
		}
		if (p_evt.type == 'mouseout' || p_evt.type == "mouseleave") {
			p_mapctx.removePrint("mousecoordsprint");
			p_mapctx.clearInteractions('DEFTOOL');
			ret = true;
		}

		// event interacted with this tool ?
		return ret;	
	}	
}

function interactWithSpindexLayer(p_mapctx, p_scrx, p_scry, p_maxdist, p_is_end_event, opt_actonselfeat, opt_clearafterselfeat) {
	
	let foundly = null, ref_x, ref_y, max_y, col, row, maxrow, sqrid;

	let ret_dir_interact = false;

	const terrain_bounds = [], terr_pt = [];
	p_mapctx.getMapBounds(terrain_bounds);

	// console.log("interactWithSpindexLayer");

	for (let ly of p_mapctx.tocmgr.layers) {
		if (ly.spindex !== undefined && ly.spindex && (ly instanceof AreaGridLayer)) {
			foundly = ly;
			break;
		}
	}

	if (foundly) {

		let sclval = p_mapctx.getScale();
		let minarea = sclval / 100.0;
		let sep = foundly.separation(sclval);

		p_mapctx.transformmgr.getTerrainPt([p_scrx, p_scry], terr_pt);

		ref_x = sep * Math.floor(terrain_bounds[0] / sep);
		col = Math.floor((terr_pt[0] - ref_x) / sep) + 1;

		ref_y = sep * Math.floor(terrain_bounds[1] / sep);
		row = Math.floor((terr_pt[1] - ref_y) / sep);

		max_y = sep * Math.ceil(terrain_bounds[3] / sep);
		maxrow = Math.floor((max_y - ref_y) / sep);

		let cmin = (col < 2 ? 1 : col-1);
		let cmax = (col > foundly._columns ? foundly._columns : col+1);

		let rmin = (row < 1 ? 0 : row-1);
		let rmax = (row > maxrow ? maxrow : row+1);

		let rows, cols, feat;

		if (cmin == col) {
			cols = [col, cmax];
		} else if (cmax == col || cmax > foundly._columns) {
			cols = [cmin, col];
		} else {
			cols = [cmin, col, cmax];
		}

		if (rmin == row) {
			rows = [row, rmax];
		} else if (rmax == row) {
			rows = [rmin, row];
		} else {
			rows = [rmin, row, rmax];
		}

		// p_mapctx.renderingsmgr.clearAll(['temporary']);
		const related_ids = {};

		for (let c of cols) {

			for (let r of rows) {

				sqrid = r * foundly._columns + c;

				if (related_ids[foundly.key] === undefined) {
					related_ids[foundly.key] = {}
				}

				feat = p_mapctx.featureCollection.get(foundly.key, sqrid);
				if (feat) {
					if (feat.r !== undefined) {
						for (let lyk in feat.r) {
							if (related_ids[foundly.key][lyk] === undefined) {
								related_ids[foundly.key][lyk] = new Set();
							}
							for (let r of feat.r[lyk]) {
								related_ids[foundly.key][lyk].add(r);
							}
						}
					}
				}

				if (GlobalConst.getDebug("FEATMOUSESEL")) {

					try {
						let canvas_layers;
						if (p_is_end_event) {
							p_mapctx.renderingsmgr.clearAll(['transientmap']);
							canvas_layers = {'normal': 'temporary', 'label': 'temporary' };
						} else {
							canvas_layers = {'normal': 'transientmap', 'label': 'transientmap' };
						}
						p_mapctx.drawSingleFeature(foundly.key, sqrid, GlobalConst.DEBUG_FEATMOUSESEL_SPINDEXMASK_SYMB, canvas_layers);
					} catch (e) {
						console.log(`[DBG:FEATMOUSESEL] feature error '${e}'`);
					}
				}

			}
		}

		let tmpd, nearestid=-1, nearestlyk=null, dist = Number.MAX_SAFE_INTEGER;
		for (let from_lyrk in related_ids) {

			for (let to_lyrk in related_ids[from_lyrk]) {

				foundly = null;
				for (let ly of p_mapctx.tocmgr.layers) {
					if (ly.key == to_lyrk) {
						foundly = ly;
						break;
					}
				}

				if (foundly == null) {
					throw new Error(`to layer '${to_lyrk}' not found`);
				}

				if (related_ids[from_lyrk][to_lyrk].size > 0) {

					for (let r of related_ids[from_lyrk][to_lyrk]) {

						tmpd = p_mapctx.featureCollection.distanceTo(terr_pt, to_lyrk, r, minarea);
						if (tmpd < dist) {
							nearestlyk = to_lyrk;
							nearestid = r;
							dist = tmpd;
						}
						if (GlobalConst.getDebug("FEATMOUSESEL")) {
							console.log(`[DBG:FEATMOUSESEL] interact with lyr:${to_lyrk}, dist:${tmpd} (max: ${p_maxdist}) to id:${r}`);

							let canvas_layers;
							if (p_is_end_event) {
								p_mapctx.renderingsmgr.clearAll(['transientmap']);
								canvas_layers = {'normal': 'temporary', 'label': 'temporary' };
							} else {
								canvas_layers = {'normal': 'transientmap', 'label': 'transientmap' };
							}

							p_mapctx.drawSingleFeature(to_lyrk, r, GlobalConst.DEBUG_FEATMOUSESEL_SELUNDERMASK_SYMB, canvas_layers);
						}
					}
				}
			}
		}

		feat = null;
		if (nearestid >= 0) {

			p_mapctx.renderingsmgr.clearAll(['temporary']);

			if (GlobalConst.getDebug("FEATMOUSESEL")) {
				console.log(`[DBG:FEATMOUSESEL] interact with NEAREST: ${nearestlyk}, dist:${dist} (max: ${p_maxdist}) to id:${nearestid}`);
			}

			foundly = null;
			for (let ly of p_mapctx.tocmgr.layers) {
				if (ly.key == nearestlyk) {
					foundly = ly;
					break;
				}
			}

			if (foundly == null) {
				throw new Error(`to layer '${nearestlyk}' not found`);
			}

			if (foundly.layervisible && (p_maxdist == null || p_maxdist >=  dist)) {

				p_mapctx.renderingsmgr.clearAll(['temporary','transientmap']);

				let canvas_layers;
				if (p_is_end_event) {
					canvas_layers = {'normal': 'temporary', 'label': 'temporary' };
				} else {
					canvas_layers = {'normal': 'transientmap', 'label': 'transientmap' };
				}
							
				feat = p_mapctx.drawFeatureAsMouseSelected(nearestlyk, nearestid, canvas_layers);
				if (feat!=null) {
					if (opt_actonselfeat) {
						ret_dir_interact = opt_actonselfeat(nearestlyk, feat, p_scrx, p_scry);
						if (ret_dir_interact === undefined) {
							console.log("interactions 257:", opt_actonselfeat);
						}
					}
				}
			}
		}

		if (feat==null || (!ret_dir_interact && p_is_end_event)) {
			if (opt_clearafterselfeat) {
				opt_clearafterselfeat('INTERACTSRVLYR');
			}			
		} 

	}

	if (GlobalConst.getDebug("INTERACTION")) {
		console.log("[DBG:INTERACTION] interactWithSpindexLayer:", ret_dir_interact);
	}
	if (GlobalConst.getDebug("INTERACTIONCLICKEND") && p_is_end_event) {
		console.log("[DBG:INTERACTIONCLICKEND] interactWithSpindexLayer:", ret_dir_interact);
	}

	return ret_dir_interact;
}

class wheelEventCtrller {

	constructor(p_sclval) {
		this.wheelevtTmoutID = null; // for deffered setScaleCenteredAtScrPoint after wheel event
		this.wheelevtTmoutFunc = null;
		this.wheelscale = -1;
		this.imgscale = 1.0;
	}
	clear() {
		//console.log(" ---- clear METHOD, id:", this.wheelevtTmoutID);
		if (this.wheelevtTmoutID) {
			clearTimeout(this.wheelevtTmoutID);
			this.wheelevtTmoutID = null;
			if (this.wheelevtTmoutFunc) {
				this.wheelevtTmoutFunc();
			}
		}
		this.wheelscale = -1;
	}
	onWheelEvent(p_mapctx, p_mapimgs_dict, p_evt) {

		let scale, auxscale; 

		p_mapctx.renderingsmgr.getRenderedBitmaps(p_mapimgs_dict);

		if (this.wheelscale < 0) {
			auxscale = p_mapctx.transformmgr.getReadableCartoScale();
		} else {
			auxscale = this.wheelscale;
		}

		if (auxscale < 600) {
			scale = auxscale + (p_evt.deltaY * 1.1);
		} else if (auxscale < 1500) {
			scale = auxscale + (p_evt.deltaY * 1.2);
		} else if (auxscale < 2000) {
			scale = auxscale + (p_evt.deltaY * 2.4);
		} else if (auxscale < 3000) {
			scale = auxscale + (p_evt.deltaY * 3);
		} else if (auxscale < 5000) {
			scale = auxscale + (p_evt.deltaY * 4);
		} else {
			scale = auxscale + (p_evt.deltaY * 10);
		}

		if (GlobalConst.MINSCALE !== undefined) {
			scale = Math.max(GlobalConst.MINSCALE, scale);
		}
		if (GlobalConst.MAXSCALE !== undefined) {
			scale = Math.min(scale, GlobalConst.MAXSCALE);
		}

		if (auxscale != scale) {
			this.wheelscale = scale;

			this.imgscale = auxscale / scale;

			// disparar alteração parcial
			this.immediateAfterWheelEvt(p_mapctx, p_mapimgs_dict, p_evt);
			// agendar alteração definitiva
			this.timedAfterWheelEvt(p_mapctx, p_evt);
		}

	}
	get scale() {
		return this.wheelscale;
	}
	timedAfterWheelEvt(p_mapctx, p_evt) {
		//console.log(" ---- timed:", this.wheelevtTmoutID)

		if (this.wheelevtTmoutID != null) {
			//console.log(" ---- clear id", this.wheelevtTmoutID)
			clearTimeout(this.wheelevtTmoutID);
			this.wheelevtTmoutID = null;
			this.wheelevtTmoutFunc = null;
		}

		this.wheelevtTmoutFunc = (function(p_this, pp_mapctx, pp_evt) {
			return function() {
				//console.log(" ---- timed out", p_this.wheelevtTmoutID)
				if (p_this.wheelscale < 0) {
					return;
				}			
				if (GlobalConst.getDebug("DISENG_WHEEL")) {
					console.log("[DBG:DISENG_WHEEL] would be firing at scale:", p_this.wheelscale);
				} else {
					pp_mapctx.transformmgr.setScaleCenteredAtScrPoint(p_this.wheelscale, [pp_evt.clientX, pp_evt.clientY], true);
				}
				p_this.wheelscale = -1;		
				this.wheelevtTmoutID = null;
			}
		})(this, p_mapctx, p_evt, p_evt);

		this.wheelevtTmoutID = setTimeout(this.wheelevtTmoutFunc, GlobalConst.MOUSEWHEEL_THROTTLE);
		//console.log(" ---- launched:", this.wheelevtTmoutID)
	}
	immediateAfterWheelEvt(p_mapctx, p_mapimgs_dict, p_evt) {
		// console.log(" ----  immed:", this.wheelevtTmoutID)
		p_mapctx.renderingsmgr.putTransientImages(p_mapimgs_dict, this.imgscale, p_evt);
	}	
}


// pan, zoom wheel
class MultiTool extends BaseTool {

	name = 'MultiTool';
	constructor() {
		super(false, false); // not part of general toggle group, surely not default in toogle
		this.start_screen = null;
		this.pending_pinch = null;
		this.imgs_dict={};		
		this.wheelevtctrlr = new wheelEventCtrller();
		//this.touchevtctrlr = new TouchController();
		this._isworking_timeout = null;
	}

	finishPan(p_transfmgr, p_x, p_y, opt_origin) {

		if (this._isworking_timeout) {
			
			clearTimeout(this._isworking_timeout);

			(function(p_this, pp_transfmgr, pp_x, pp_y, oopt_origin, p_delay_msecs) {
				p_this._isworking_timeout = setTimeout(function() {
					p_this.finishPan(pp_transfmgr, pp_x, pp_y, oopt_origin);
				}, p_delay_msecs);
			})(this, p_transfmgr, p_transfmgr, p_x, p_y, opt_origin, 700);

		} else {

			let dx=1, dy=1;
			let deltascrx =  Math.abs(this.start_screen[0] - p_x);
			let deltascry =  Math.abs(this.start_screen[1] - p_y);

			this.imgs_dict={};

			if (opt_origin == 'touch') {
				dx = 6;
				dy = 6;
			}

			if (GlobalConst.getDebug("INTERACTIONCLICKEND")) {
				console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL finishPan, deltascr:", deltascrx, deltascry, "dx_dy:", dx, dy);
			}

			if (deltascrx > dx || deltascry > dy) {		
				p_transfmgr.doPan(this.start_screen, [p_x, p_y], true);
			}

		}
	}

	finishZoomTo(p_transfmgr, p_x, p_y, p_scalingf) {

		if (this._isworking_timeout) {
			
			clearTimeout(this._isworking_timeout);

			(function(p_this, pp_transfmgr, pp_x, pp_y, pp_scalingf, p_delay_msecs) {
				p_this._isworking_timeout = setTimeout(function() {
					p_this.finishZoomTo(pp_transfmgr, pp_x, pp_y, pp_scalingf);
				}, p_delay_msecs);
			})(this, p_transfmgr, p_x, p_y, p_scalingf, 700);

		} else {

			const cs = p_transfmgr.getReadableCartoScale();
			const newscale = p_scalingf * cs;

			this.imgs_dict={};
			
			if (GlobalConst.getDebug("INTERACTION")) {
				console.log("[DBG:INTERACTION] finishZoomTo, scale, x, y:", newscale, [p_x, p_y]);
			}
		
			p_transfmgr.setScaleCenteredAtScrPoint(newscale, [p_x, p_y], true);
	
		}

	}

	concludePendingAction(p_mapctx, p_evt, p_orig) {
		
		let orig, ret =false;

		if (this.pending_pinch) {

			this.finishZoomTo(p_mapctx.transformmgr, this.pending_pinch.centerx, this.pending_pinch.centery, this.pending_pinch.scale)
			this.pending_pinch = null;

			this.wheelevtctrlr.clear();
			ret = true;

		} else if (this.start_screen != null) {

			// never do pan on mouseout or mouseleave events
			//if (["mouseleave", "mouseout"].indexOf(p_evt.type) < 0) {
				if (p_orig) {
					orig = p_orig;
				} else {
					orig = "mouse";
				}
				this.finishPan(p_mapctx.transformmgr, p_evt.clientX, p_evt.clientY, orig);	
			//}
			this.imgs_dict={};
			this.start_screen = null;

			this.wheelevtctrlr.clear();
			ret = true;
		}

		return ret;
	}	

	onEvent(p_mapctx, p_evt) {
		let orig, ret = false;

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] MULTITOOL evt.type:", p_evt.type);
		}
		if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
			console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL onEvent evt.type:", p_evt.type);
		}

		try {
			orig = null;
			switch(p_evt.type) {

				case 'touchpinch':
					this.pending_pinch = p_evt;
					ret = true;
					break;

				case 'touchstart':
				case 'mousedown':
					//console.log("mdown multitool");
					//console.trace();
					// console.log(p_evt, "start:", this.start_screen, (p_evt.buttons & 1) == 1);

					if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
						console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL mdown:", p_evt, "startscrpt:", this.start_screen, "orig:", orig, "pinch:", this.pending_pinch);
					}

					if (this.start_screen == null) {
						if (p_evt.buttons === undefined || (p_evt.buttons & 1) == 1) {						
							this.start_screen = [p_evt.clientX, p_evt.clientY];		
							if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
								console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL mdown start point marked at:", this.start_screen);
							}		
							p_mapctx.renderingsmgr.getRenderedBitmaps(this.imgs_dict);
						}
					} else {
						this.start_screen = null;
					}
					this.wheelevtctrlr.clear();
					ret = true;
					break;

				case 'touchend':
					orig = "touch";
				case 'mouseup':
					// console.log("mup multitool");
					// console.trace();
				case 'mouseout':
				case 'mouseleave':
					if (orig == null) {
						orig = "mouse";
					}

					if (GlobalConst.getDebug("INTERACTION")) {
						console.log("[DBG:INTERACTION] MULTITOOL up/end/out/leave:", this.start_screen, orig, p_evt, this.pending_pinch);
					}
					if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
						console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL up/end/out/leave", p_evt, "startscrpt:", this.start_screen, "orig:", orig, "pinch:", this.pending_pinch);
					}
			
					/*if (this.pending_pinch) {

						this.finishZoomTo(p_mapctx.transformmgr, this.pending_pinch.centerx, this.pending_pinch.centery, this.pending_pinch.scale)
						this.pending_pinch = null;

					} else if (this.start_screen != null) {

						// never do pan on mouseout or mouseleave events
						//if (["mouseleave", "mouseout"].indexOf(p_evt.type) < 0) {
							this.finishPan(p_mapctx.transformmgr, p_evt.clientX, p_evt.clientY, orig);	
						//}
						this.imgs_dict={};
						this.start_screen = null;
					} */

					if (!this.concludePendingAction(p_mapctx, p_evt, orig)) {
						this.wheelevtctrlr.clear();
					}

					ret = true;
					break;

				case 'touchmove':
				case 'mousemove':
					if (this.start_screen != null) {
						if (p_evt.buttons === undefined || (p_evt.buttons & 1) == 1) {
							p_mapctx.renderingsmgr.putImages(this.imgs_dict, [p_evt.clientX-this.start_screen[0], p_evt.clientY-this.start_screen[1]]);
						}
					}
					//this.wheelevtctrlr.clear();
					ret = true;
					break;

				case 'wheel':

					this.wheelevtctrlr.onWheelEvent(p_mapctx, this.imgs_dict, p_evt);
					ret = true;
					break;


			}
		} catch(e) {
			this.start_screen = null;
			this.imgs_dict={};
			this.pending_pinch = null;
			console.error(e);
		}  

		// interacted with this tool ?
		return ret;

		
	}	
}

class InfoTool extends BaseTool {

	name = 'InfoTool';
	pickpanel_active;
	toc_collapsed;
	constructor() {
		super(true, true); // part of general toggle group, default in toogle
		this.pickpanel_active = false;
		this.toc_collapsed = false;
	}

	static mouseselMaxdist(p_mapctx) {
		const mscale = p_mapctx.getScale();
		return GlobalConst.FEATMOUSESEL_MAXDIST_1K * mscale / 1000.0;
	}

	setTocCollapsed(p_is_collapsed) {
		this.toc_collapsed = p_is_collapsed;
	}

	onEvent(p_mapctx, p_evt) {

		let mxdist, ret = false; 
		const ci = p_mapctx.getCustomizationObject();
		if (ci == null) {
			throw new Error("InfoTool, customization instance is missing")
		}

		const ic = ci.instances["infoclass"];

		try {

			let insideactivepanel = false;

			if (ic.ibox != null && ic.pick !== undefined && ic.ibox['box'] !== undefined) {
				if (this.getPanelActive()) {
					if (p_evt.clientX >= ic.ibox.box[0] && p_evt.clientX <= ic.ibox.box[0] + ic.ibox.box[2] && 
						p_evt.clientY >= ic.ibox.box[1] && p_evt.clientY <= ic.ibox.box[1] + ic.ibox.box[3]) {
							insideactivepanel = true;
					}
				}
			}
	
			if (GlobalConst.getDebug("INTERACTION")) {
				console.log("[DBG:INTERACTION] INFOTOOL onEvent evt.type:", p_evt.type, "insideactivepanel:", insideactivepanel);
			}
			if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
				console.log("[DBG:INTERACTIONCLICKEND] INFOTOOL onEvent evt.type:", p_evt.type, "insideactivepanel:", insideactivepanel);
			}

			switch(p_evt.type) {

				case 'touchstart':
				case 'mousedown':
					if (insideactivepanel) {
						ret = true; 
					}
					break;

				case 'touchend':
				case 'mouseup':
					// console.log("mup INFOtool");
					if (ic.pick !== undefined) {

						if (insideactivepanel) {
							ic.interact(p_evt);
							ret = true; 
						} else {
							this.setPanelActive(false);
						}

						if (!this.getPanelActive()) {
							mxdist = this.constructor.mouseselMaxdist(p_mapctx);
							ret = interactWithSpindexLayer(p_mapctx, p_evt.clientX, p_evt.clientY, mxdist, true, ic.pick.bind(ic), ic.clear.bind(ic));
						}
					} else {
						console.warn(`infoclass customization unavailable, cannot pick feature`);			
					}						
					break;

				case 'mousemove':
					if (!this.getPanelActive()) {
						if (ic.hover !== undefined) {
							mxdist = this.constructor.mouseselMaxdist(p_mapctx);
							ret = interactWithSpindexLayer(p_mapctx, p_evt.clientX, p_evt.clientY, mxdist, false, ic.hover.bind(ic), ic.clear.bind(ic));
						} else {
							console.warn(`infoclass customization unavailable, cannot hover / maptip feature`);			
						}	
					} else {
						if (insideactivepanel) {
							ic.interact(p_evt);
							ret = true; 
						}						
					}
					break;

			}
		} catch(e) {
			console.error(e);
		}  

		// has this tool interacted with event ?
		return ret;
		
	}	

	setPanelActive(b_panel_is_active) {
		this.pickpanel_active = b_panel_is_active;
	}

	getPanelActive() {
		return this.pickpanel_active;
	}

}

class MeasureTool extends BaseTool {

	name = 'MeasureTool';
	accumdist;
	prevpt;
	constructor() {
		// TODO - remove default in toogle
		super(true, true); // part of general toggle group, default in toogle
		this.accumdist = 0;
		this.prevpt = null;
	}

	onEvent(p_mapctx, p_evt) {

		let d, pt, ret = false;
		// const ci = p_mapctx.getCustomizationObject();
		// if (ci == null) {
		// 	throw new Error("InfoTool, customization instance is missing")
		// }

		// const ic = ci.instances["infoclass"];

		try {
			switch(p_evt.type) {

				case 'dblclick':
					this.accumdist = 0;
					this.prevpt = null;
					ret = true;
					break;

				case 'mouseup':
					if (this.prevpt == null) {
						this.prevpt = [p_evt.clientX, p_evt.clientY];
						console.log("dist start");
					} else {
						pt = [p_evt.clientX, p_evt.clientY];
						d = dist2D(this.prevpt, pt);
						if (d < 2) {
							this.accumdist = 0;
							this.prevpt = null;	
							console.log("dist reset");	
						} else {
							this.accumdist += d;
							this.prevpt = [p_evt.clientX, p_evt.clientY];
							console.log("dist:", this.accumdist);
						}
					}	
					ret = true;					
					break;

			}
		} catch(e) {
			console.error(e);
		}  

		return ret;
		
	}	
}

export class ToolManager {

	editmgr;
	maptools;
	mapcontrolmgrs;

	constructor(p_mapctx_config_var) {

		if (p_mapctx_config_var == null) {
			throw new Error("Class ToolManager, null mapctx_config_var");
		}

		this.basic_config = p_mapctx_config_var;

		this.editmgr = new EditManager(this);
		// this.maptools = [new DefaultTool(), new MultiTool()];
		this.maptools = [new MultiTool()];
		this.mapcontrolmgrs = [];
		
		if (p_mapctx_config_var["togglable_tools"] !== undefined) {
			for (let i=0; i<p_mapctx_config_var["togglable_tools"].length; i++) {
				switch (p_mapctx_config_var["togglable_tools"][i]) {
					case "InfoTool":
						this.addTool(new InfoTool());
						break;
					case "MeasureTool":
						this.addTool(new MeasureTool());
						break;
					}
			}
		}	

		const tnames = [];
		for (let mt of this.maptools) {
			tnames.push(mt.name);
		}
		console.info("[init RISCO] tools in ToolManager:", tnames);

		
	}

	addTool(p_toolinstance) {
		if (p_toolinstance == null) {
			throw new Error("Class ToolManager, addTool, null tool instance passed");
		}	

		const existing_classnames = [], classname = p_toolinstance.constructor.name;
		if (!(p_toolinstance instanceof BaseTool)) {
			throw new Error(`Class ToolManager, addTool, tool is not a BaseTool instance: ${classname}`);
		}	
		
		p_toolinstance.setEditManager(this.editmgr);

		for (let i=0; i<this.maptools.length; i++) {
			if (existing_classnames.indexOf(this.maptools[i].constructor.name) >= 0) {
				throw new Error(`Class ToolManager, addTool, found duplicate tool instance of: ${this.maptools[i].constructor.name}`);
			}
			existing_classnames.push(this.maptools[i].constructor.name); 
		}	
		
		if (existing_classnames.indexOf(p_toolinstance.constructor.name) < 0) { 
			this.maptools.push(p_toolinstance);
		} else {
			console.error(`Class ToolManager, addTool, foiled attempt to add duplicate instance of: ${p_toolinstance.constructor.name}`);
		}	
	}

	findTool(p_classname) {
		let foundtool = null;
		for (let i=0; i<this.maptools.length; i++) {
			if (this.maptools[i].constructor.name == p_classname) {
				foundtool = this.maptools[i];
			}
		}	
		if (foundtool == null) {
			throw new Error(`Class ToolManager, no instance of '${p_classname}' was found.`);
		}
		return foundtool;	
	}

	enableTool(p_classname, p_do_enable) {

		let foundtool = this.findTool(p_classname);

		if (foundtool == null) {
			return;
		}

		if (!foundtool.joinstogglegroup) {
			foundtool.enabled = p_do_enable;
		} else {
			if (p_do_enable) {

				// disable all in toggle group ...
				for (let j=0; j<this.maptools.length; j++) {
					if (!this.maptools[j].joinstogglegroup) {
						continue;
					}
					this.maptools[j].enabled = false;
				}	

				// enable chosen tool
				foundtool.enabled = true;	

			} else {
				let do_continue = true;

				// Check if tool to disable is default in toggle group, in that case, stop
				for (let j=0; j<this.maptools.length; j++) {
					if (this.maptools[j].defaultintoggle) {
						if (this.maptools[j].constructor.name == p_classname) {
							do_continue = false;
							break;
						}
					}
				}

				// Dsiable all in toggle group and enable default tools
				if (do_continue) {
					for (let j=0; j<this.maptools.length; j++) {
						if (!this.maptools[j].joinstogglegroup) {
							continue;
						}
						if (this.maptools[j].defaultintoggle) {
							this.maptools[j].enabled = true;
						} else {
							this.maptools[j].enabled = false;
						}
					}
				}
			}
		}
	}

	// event procedes from mxOnEvent
	toolmgrOnEvent(p_mapctx, p_evt) {

		const clickendevents = ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"];

		let _ret;

		for (let mapctrl_key in this.mapcontrolmgrs) {


			_ret = this.mapcontrolmgrs[mapctrl_key].interact(p_mapctx, p_evt);
			if (_ret) {

				// Conclude the first pending action found on an active maptool, searching from last in maptools list
				for (let i=this.maptools.length-1; i>=0; i--) {
					if (this.maptools[i].enabled) {
						if (this.maptools[i].concludePendingAction(p_mapctx, p_evt)) {
							break;
						}
					}
				}
				break;
			}
		}

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] ToolManager toolmgrOnEvent evt.type:", p_evt.type, "interacted with map controls:", _ret);
		}
		if (GlobalConst.getDebug("INTERACTIONCLICKEND") && clickendevents.indexOf(p_evt.type) >= 0) {
			console.log("[DBG:INTERACTIONCLICKEND] ToolManager toolmgrOnEvent evt.type:", p_evt.type, "interacted with map controls:", _ret);
		}

		// if event interacted with any map controls (_ret is true) 
		//  we prevent its dispatchment to the active tools

		if (!_ret) {
			for (let i=this.maptools.length-1; i>=0; i--) {

				// toggletool_already_interacted - signals if a tool joining a toggle group already interacted with this event.
				// In that case, other tools joining toggle groups should not interact

				// Other tools, including always-available ones like 'base' tool, should not be prevented
				// from interacting

				let toggletool_already_interacted = false; 
				if (this.maptools[i].enabled) {

					if (this.maptools[i].joinstogglegroup && toggletool_already_interacted) {
						continue;
					}

					_ret = this.maptools[i].onEvent(p_mapctx, p_evt);

					if (GlobalConst.getDebug("INTERACTIONCLICKEND") && clickendevents.indexOf(p_evt.type) >= 0) {
						console.log("[DBG:INTERACTIONCLICKEND] ToolManager tool", this.maptools[i].name, "onEvent, returned:", _ret, "togglegrp:", this.maptools[i].joinstogglegroup);
					}

					if (_ret && this.maptools[i].joinstogglegroup) {
						toggletool_already_interacted = true;
					}
				}
			}	
		}



	}

	addControlsMgr(p_key, p_mapctrlmgr) {
		this.mapcontrolmgrs[p_key] = p_mapctrlmgr;
		// this.mapcontrolmgrs[p_key].setToolmgr(this);
	}

	setCurrentUser(p_username) {
		this.editmgr.setCurrentUser(p_username)
	}
	

	


}