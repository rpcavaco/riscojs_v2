
import {GlobalConst} from './constants.js';
import {AreaGridLayer} from './vectorlayers.mjs';


export class BaseTool {

	enabled = true;
	start_time = null;
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

}


class DefaultTool extends BaseTool {

	constructor() {
		super(false);
	}

	onEvent(p_mapctx, p_evt) {
		if (p_evt.type == 'mousemove') {
			p_mapctx.printMouseCoords(p_evt.clientX, p_evt.clientY);
		}
		if (p_evt.type == 'mouseout' || p_evt.type == "mouseleave") {
			p_mapctx.removePrint("mousecoordsprint");
		}
		
	}	
}

function interactWithSpindexLayer(p_mapctx, p_scrx, p_scry, opt_maxdist) {
	
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

				feat = p_mapctx.currFeatures.get(foundly.key, sqrid);
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
						const symb = GlobalConst.DEBUG_FEATMOUSESEL_SPINDEXMASK_SYMB[foundly.geomtype];
						p_mapctx.currFeatures.draw(p_mapctx, null, null, null, foundly.key, sqrid, 'temporary', symb);
					} catch (e) {
						console.log(`[DBG:FEATMOUSESEL] feature error '${e}'`);
					}
				}

			}
		}

		

		let tmpd, nearestid=-1, nearestlyk=null, dist = Number.MAX_SAFE_INTEGER;
		for (let from_lyrk in related_ids) {
			for (let to_lyrk in related_ids[from_lyrk]) {
				if (related_ids[from_lyrk][to_lyrk].size > 0) {
					for (let r of related_ids[from_lyrk][to_lyrk]) {

						tmpd = p_mapctx.currFeatures.distanceTo(terr_pt, to_lyrk, r, minarea);
						if (tmpd < dist) {
							nearestlyk = to_lyrk;
							nearestid = r;
							dist = tmpd;
						}
						if (GlobalConst.getDebug("FEATMOUSESEL")) {
							console.log(`[DBG:FEATMOUSESEL] interact with lyr:${to_lyrk}, dist:${tmpd} (max: ${opt_maxdist}) to id:${r}`);
							const symb = GlobalConst.DEBUG_FEATMOUSESEL_SELUNDERMASK_SYMB[foundly.geomtype];
							p_mapctx.currFeatures.draw(p_mapctx, null, null, null, to_lyrk, r, 'temporary', symb);
						}
					}
				}
			}
		}

		if (nearestid >= 0) {

			if (GlobalConst.getDebug("FEATMOUSESEL")) {
				console.log(`[DBG:FEATMOUSESEL] interact with NEAREST: ${nearestlyk}, dist:${dist} (max: ${opt_maxdist}) to id:${nearestid}`);
			}

			if (opt_maxdist == null || opt_maxdist >=  dist) {
				const symb = GlobalConst.FEATMOUSESEL_HIGHLIGHT[foundly.geomtype];
				p_mapctx.currFeatures.draw(p_mapctx, null, null, null, nearestlyk, nearestid, 'temporary', symb);
			}
		}

	}

	return ret_dir_interact;
}

// pan, zoom wheel, info
class MultiTool extends BaseTool {

	constructor() {
		super(true, true); // part of general toggle group, default in toogle
		this.start_screen = null;
		this.imgs_dict={};
		
		this.wheelscale = null;
		this._wheelevtTmoutID = null; // for deffered setScaleCenteredAtPoint after wheel event

		this._wheelevtTmoutMethod = (
			function(p_mapctx, p_evt, p_scaleval, b_dodebugonly) {
				if (b_dodebugonly) {
					console.log("[DBG:DISENG_WHEEL] would be firing at scale:", p_scaleval);
				} else {
					p_mapctx.transformmgr.setScaleCenteredAtPoint(p_scaleval, [p_evt.clientX, p_evt.clientY], true);
				}
			}
		).bind(this);

	}

	static mouseselMaxdist(p_mapctx) {
		const mscale = p_mapctx.getScale();
		return GlobalConst.FEATMOUSESEL_MAXDIST_1K * mscale / 1000.0;
	}

	fireChangeAfterWheelEvt(p_mapctx, p_evt, p_scaleval, p_delay) {
		if (this._wheelevtTmoutID != null) {
			clearTimeout(this._wheelevtTmoutID);
		}
		this._wheelevtTmoutID = setTimeout(this._wheelevtTmoutMethod, p_delay, p_mapctx, p_evt, p_scaleval, GlobalConst.getDebug("DISENG_WHEEL"));
	}

	finishPan(p_transfmgr, p_x, p_y, opt_origin) {
		
		let dx=0, dy=0;
		let deltascrx =  Math.abs(this.start_screen[0] - p_x);
		let deltascry =  Math.abs(this.start_screen[1] - p_y);

		if (opt_origin == 'touch') {
			dx = 6;
			dy = 6;
		}

		if (deltascrx > dx || deltascry > dy) {		
			p_transfmgr.doPan(this.start_screen, [p_x, p_y], true);
		}
	}

	onEvent(p_mapctx, p_evt) {

		let ret = true;
		let scale, mxdist;

		try {
			switch(p_evt.type) {

				case 'mousedown':
					// console.log(p_evt, "start:", this.start_screen, (p_evt.buttons & 1) == 1);
					if (this.start_screen == null) {
						if ((p_evt.buttons & 1) == 1) {						
							this.start_screen = [p_evt.clientX, p_evt.clientY];		
							p_mapctx.renderingsmgr.getRenderedBitmaps(this.imgs_dict);
							ret = false;
						}
					}
					this.wheelscale = null;
					break;

				case 'mouseup':
				case 'mouseout':
				case 'mouseleave':
					if (this.start_screen != null) {
						this.finishPan(p_mapctx.transformmgr, p_evt.clientX, p_evt.clientY, 'mouse');	
						this.start_screen = null;
						ret = false;
					}
					this.wheelscale = null;
					break;

				case 'mousemove':
					if (this.start_screen != null) {
						if ((p_evt.buttons & 1) == 1) {
							p_mapctx.renderingsmgr.putImages(this.imgs_dict, [p_evt.clientX-this.start_screen[0], p_evt.clientY-this.start_screen[1]]);
							ret = false;
						}
					} else {
						mxdist = this.constructor.mouseselMaxdist(p_mapctx);
						interactWithSpindexLayer(p_mapctx, p_evt.clientX, p_evt.clientY, mxdist);
					}
					this.wheelscale = null;
					break;

				case 'wheel':

					/* if (this.start_time == null) {
						this.start_time = new Date().getTime();
					} */

					if (this.wheelscale == null) {
						this.wheelscale = p_mapctx.transformmgr.getReadableCartoScale();
					}

					if (this.wheelscale < 1500) {
						scale = this.wheelscale + (p_evt.deltaY * 1.2);
					} else if (this.wheelscale < 2000) {
						scale = this.wheelscale + (p_evt.deltaY * 2.4);
					} else if (this.wheelscale < 3000) {
						scale = this.wheelscale + (p_evt.deltaY * 3);
					} else if (this.wheelscale < 3000) {
						scale = this.wheelscale + (p_evt.deltaY * 4);
					} else {
						scale = this.wheelscale + (p_evt.deltaY * 10);
					}

					if (GlobalConst.MINSCALE !== undefined) {
						scale = Math.max(GlobalConst.MINSCALE, scale);
					}
					if (GlobalConst.MAXSCALE !== undefined) {
						scale = Math.min(scale, GlobalConst.MAXSCALE);
					}

					if (this.wheelscale != scale) {
						this.wheelscale = scale;
						//console.log(this.wheelscale);
						// const lap = new Date().getTime();
						if (GlobalConst.getDebug("DISENG_WHEEL")) {
							console.log("[DBG:DISENG_WHEEL] scale:", this.wheelscale);
						}

						this.fireChangeAfterWheelEvt(p_mapctx, p_evt, scale, GlobalConst.MOUSEWHEEL_THROTTLE);

						// } else {
						// 	if ((lap - this.start_time) > GlobalConst.MOUSEWHEEL_THROTTLE) {
						// 		p_mapctx.transformmgr.setScaleCenteredAtPoint(this.wheelscale, [p_evt.clientX, p_evt.clientY], true);
						// 	}
						// }
						// this.start_time = null;
					}
					break;

			}
		} catch(e) {
			this.start_screen = null;
			console.error(e);
		}  
		
		return ret;
	}	
}

export class ToolManager {

	constructor(p_mapctx_config_var) {

		if (p_mapctx_config_var == null) {
			throw new Error("Class ToolManager, null mapctx_config_var");
		}

		this.maptools = [new DefaultTool()];
		
		if (p_mapctx_config_var["togglable_tools"] !== undefined) {
			for (let i=0; i<p_mapctx_config_var["togglable_tools"].length; i++) {
				switch (p_mapctx_config_var["togglable_tools"][i]) {
					case "MultiTool":
						this.addTool(new MultiTool());
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

	onEvent(p_mapctx, p_evt) {

		let _ret, ret = true;

		for (let i=0; i<this.maptools.length; i++) {
			if (this.maptools[i].enabled) {
				_ret = this.maptools[i].onEvent(p_mapctx, p_evt);
				if (this.maptools[i].joinstogglegroup) {
					ret = _ret;
				}
			}
		}

		// stopPropagation - only tools from toggle group is checked for return value 
		return ret;
	}
	

	


}