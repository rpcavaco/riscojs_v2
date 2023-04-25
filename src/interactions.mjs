
import {GlobalConst} from './constants.js';
import {AreaGridLayer} from './vectorlayers.mjs';
import {EditManager} from './edit_manager.mjs';
import {dist2D} from './geom.mjs';

export class BaseTool {

	enabled = true;
	start_time = null;
	editmanager = null;
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
	}

	setEditManager(p_edit_manager) {
		this.editmanager = p_edit_manager;
	}

}


class DefaultTool extends BaseTool {

	constructor() {
		super(false);
	}

	onEvent(p_mapctx, p_evt) {

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] DEFTOOL, evt.type:", p_evt.type);
		}

		if (p_evt.type == 'mousemove') {
			p_mapctx.printMouseCoords(p_evt.clientX, p_evt.clientY);
		}
		if (p_evt.type == 'mouseout' || p_evt.type == "mouseleave") {
			p_mapctx.removePrint("mousecoordsprint");
		}
		
	}	
}

function interactWithSpindexLayer(p_mapctx, p_scrx, p_scry, p_maxdist, opt_actonselfeat, opt_clearafterselfeat) {
	
	let foundly = null, ref_x, ref_y, max_y, col, row, maxrow, sqrid;

	let ret_dir_interact = false;

	const terrain_bounds = [], terr_pt = [];
	p_mapctx.getMapBounds(terrain_bounds);

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

		p_mapctx.renderingsmgr.clearAll(['temporary']);
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
						let symb;
						if (foundly.geomtype == "point") {
							symb = {
								'path': GlobalConst.DEBUG_FEATMOUSESEL_SPINDEXMASK_SYMB[foundly.geomtype]
							}
						} else {
							symb = {
								'point': null
							}
						}
						p_mapctx.featureCollection.draw(p_mapctx, foundly.key, sqrid, {'normal': 'temporary', 'labels': 'temporary' }, symb);
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
							let symb;
							if (foundly.geomtype == "point") {
								symb = {
									'path': GlobalConst.DEBUG_FEATMOUSESEL_SELUNDERMASK_SYMB[foundly.geomtype]
								}
							} else {
								symb = {
									'point': null
								}
							}	
							p_mapctx.featureCollection.draw(p_mapctx, to_lyrk, r, {'normal': 'temporary', 'labels': 'temporary' }, symb);
						}
					}
				}
			}
		}

		// console.log("nearestid:", nearestid);

		if (nearestid >= 0) {

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

			if (p_maxdist == null || p_maxdist >=  dist) {
				let symb;
				if (foundly.geomtype == "point") {
					symb = {
						'path': GlobalConst.FEATMOUSESEL_HIGHLIGHT[foundly.geomtype]
					}
				} else {
					symb = {
						'point': null
					}
				}				
				p_mapctx.featureCollection.draw(p_mapctx, nearestlyk, nearestid, {'normal': 'temporary', 'labels': 'temporary' }, symb);
				ret_dir_interact = true;
				if (opt_actonselfeat) {
					opt_actonselfeat(p_mapctx, nearestlyk, nearestid, p_mapctx.featureCollection.get(nearestlyk, nearestid), p_scrx, p_scry);
				}
			} else {
				if (opt_clearafterselfeat) {
					opt_clearafterselfeat(p_mapctx, nearestlyk, nearestid, p_scrx, p_scry);
				}
			}
		}

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

	onEvent(p_mapctx, p_evt) {
		let orig;

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] MULTITOOL evt.type:", p_evt.type);
		}

		try {
			orig = null;
			switch(p_evt.type) {

				case 'touchpinch':
					this.pending_pinch = p_evt;
					break;

				case 'touchstart':
				case 'mousedown':
					//console.log("mdown multitool");
					//console.trace();
					// console.log(p_evt, "start:", this.start_screen, (p_evt.buttons & 1) == 1);
					if (this.start_screen == null) {
						if (p_evt.buttons === undefined || (p_evt.buttons & 1) == 1) {						
							this.start_screen = [p_evt.clientX, p_evt.clientY];		
							p_mapctx.renderingsmgr.getRenderedBitmaps(this.imgs_dict);
						}
					}
					this.wheelevtctrlr.clear();
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

					if (this.pending_pinch) {

						this.finishZoomTo(p_mapctx.transformmgr, this.pending_pinch.centerx, this.pending_pinch.centery, this.pending_pinch.scale)
						this.pending_pinch = null;

					} else if (this.start_screen != null) {
						this.finishPan(p_mapctx.transformmgr, p_evt.clientX, p_evt.clientY, orig);	
						this.imgs_dict={};
						this.start_screen = null;
					}
					this.wheelevtctrlr.clear();
					break;

				case 'touchmove':
				case 'mousemove':
					if (this.start_screen != null) {
						if (p_evt.buttons === undefined || (p_evt.buttons & 1) == 1) {
							p_mapctx.renderingsmgr.putImages(this.imgs_dict, [p_evt.clientX-this.start_screen[0], p_evt.clientY-this.start_screen[1]]);
						}
					}
					//this.wheelevtctrlr.clear();
					break;

				case 'wheel':

					this.wheelevtctrlr.onWheelEvent(p_mapctx, this.imgs_dict, p_evt);
					break;


			}
		} catch(e) {
			this.start_screen = null;
			this.imgs_dict={};
			this.pending_pinch = null;
			console.error(e);
		}  
		
	}	
}

class InfoTool extends BaseTool {

	pickpanel_active;
	constructor() {
		super(true, true); // part of general toggle group, default in toogle
		this.pickpanel_active = false;
	}

	static mouseselMaxdist(p_mapctx) {
		const mscale = p_mapctx.getScale();
		return GlobalConst.FEATMOUSESEL_MAXDIST_1K * mscale / 1000.0;
	}

	onEvent(p_mapctx, p_evt) {

		let mxdist, ret = true; // let other tool events be processed
		const ci = p_mapctx.getCustomizationObject();
		if (ci == null) {
			throw new Error("InfoTool, customization instance is missing")
		}

		const ic = ci.instances["infoclass"];

		try {

			let insideactivepanel = false;

			if (ic.pick !== undefined) {
				if (this.pickpanel_active) {
					if (p_evt.clientX >= ic.ibox.box[0] && p_evt.clientX <= ic.ibox.box[0] + ic.ibox.box[2] && 
						p_evt.clientY >= ic.ibox.box[1] && p_evt.clientY <= ic.ibox.box[1] + ic.ibox.box[3]) {
							insideactivepanel = true;
					}
				}
			}
	
			if (GlobalConst.getDebug("INTERACTION")) {
				console.log("[DBG:INTERACTION] INFOTOOL evt.type:", p_evt.type);
			}
		
			switch(p_evt.type) {

				case 'touchstart':
				case 'mousedown':
					if (insideactivepanel) {
						ret = false; 
					}
						// Prevent mousedown being processed in subsequent onevent methods in remaining tools
						// This prevents unwanted map interaction (e.g.: panning) through infobox background
					
					break;

				case 'touchend':
				case 'mouseup':
					if (ic.pick !== undefined) {
						if (this.pickpanel_active) {
							if (insideactivepanel) {
								ic.interact(p_mapctx, p_evt);
							} else {
								this.pickpanel_active = false;
							}
						}
						if (!this.pickpanel_active) {
							mxdist = this.constructor.mouseselMaxdist(p_mapctx);
							this.pickpanel_active = interactWithSpindexLayer(p_mapctx, p_evt.clientX, p_evt.clientY, mxdist, ic.pick.bind(ic));
						}
					} else {
						console.warn(`infoclass customization unavailable, cannot pick feature`);			
					}						
					break;

				case 'mousemove':
					if (!this.pickpanel_active) {
						if (ic.hover !== undefined) {
							mxdist = this.constructor.mouseselMaxdist(p_mapctx);
							interactWithSpindexLayer(p_mapctx, p_evt.clientX, p_evt.clientY, mxdist, ic.hover.bind(ic), ic.clear.bind(ic));
						} else {
							console.warn(`infoclass customization unavailable, cannot hover / maptip feature`);			
						}	
					}
					break;

			}
		} catch(e) {
			console.error(e);
		}  

		return ret;
		
	}	
}

class MeasureTool extends BaseTool {

	accumdist;
	prevpt;
	constructor() {
		// TODO - remove default in toogle
		super(true, true); // part of general toggle group, default in toogle
		this.accumdist = 0;
		this.prevpt = null;
	}

	onEvent(p_mapctx, p_evt) {

		let d, pt;
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
					break;

			}
		} catch(e) {
			console.error(e);
		}  
		
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
		this.maptools = [new DefaultTool(), new MultiTool()];
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

	_findTool(p_classname) {
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

		let foundtool = this._findTool(p_classname);

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

	tmOnEvent(p_mapctx, p_evt) {

		let _ret;

		for (let mapctrl_key in this.mapcontrolmgrs) {
			_ret = this.mapcontrolmgrs[mapctrl_key].interact(p_mapctx, p_evt);
			if (_ret) {
				break;
			}
		}

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] ToolManager, interacted with map controls:", _ret);
		}

		// if event interacted with any map controls (_ret is true) 
		//  we prevent its dispatchment to the active tools

		if (!_ret) {
			for (let i=this.maptools.length-1; i>=0; i--) {
				if (this.maptools[i].enabled) {
					_ret = this.maptools[i].onEvent(p_mapctx, p_evt);
					if (!_ret && this.maptools[i].joinstogglegroup) {
						break;
					}
				}
			}	
		}



	}

	addControlsMgr(p_key, p_mapctrlmgr) {
		this.mapcontrolmgrs[p_key] = p_mapctrlmgr;
		this.mapcontrolmgrs[p_key].setToolmgr(this);
	}

	setCurrentUser(p_username) {
		this.editmgr.setCurrentUser(p_username)
	}
	

	


}