
import {GlobalConst} from './constants.js';
import {AreaGridLayer} from './vectorlayers.mjs';


export class BaseTool {

	#enabled_flag = false;
	start_time = null;
	name = 'BaseTool';
	constructor(p_mapctx, p_joinstogglegroup, opt_defaultintoggle) {
		this.joinstogglegroup = p_joinstogglegroup;
		if (this.joinstogglegroup) {
			if (opt_defaultintoggle == null) {
				this.defaultintoggle = false;
			} else {
				this.defaultintoggle = opt_defaultintoggle;
				if (opt_defaultintoggle) {
					this.setEnabled(p_mapctx, true);
				}
			}
		} else {
			this.defaultintoggle = false;
			this.setEnabled(p_mapctx, true);
		}
	}

	onEvent(p_mapctx, p_evt) {
		// Abstract

		// event had no interaction with this tool
		return false;
	}


	setEnabled(p_mapctx, p_flag_value) {
		
		if (GlobalConst.getDebug("TOOLENABLE")) {
			console.trace("[DBG:TOOLENABLE] enabled:", p_flag_value);
		}

		// if disabling and not already disabled ... 
		if (!p_flag_value && this.#enabled_flag != p_flag_value && this['cleanUp'] !== undefined) {
			this.cleanUp(p_mapctx);
		}		

		this.#enabled_flag = p_flag_value;
	}

	get enabled() {
		return this.#enabled_flag;
	}

	concludePendingAction(p_mapctx, p_evt) {
		return false
	}

}

export async function interactWithSpindexLayer(p_mapctx, p_scrx, p_scry, p_maxdist, p_is_end_event, opt_actonselfeat_dict, opt_clickonemptyspace, opt_hoveronemptyspace) {
	
	let foundly = null, ref_x, ref_y, max_y, col, row, maxrow, sqrid;

	let ret_dir_interact = false, opt_actonselfeat_keys = null, opt_actonselfeat_ok = false;

	const terrain_bounds = [], terr_pt = [];
	p_mapctx.getMapBounds(terrain_bounds);

	// console.log("interactWithSpindexLayer");

	if (opt_actonselfeat_dict != null) {

		opt_actonselfeat_keys = Object.keys(opt_actonselfeat_dict);
		if (opt_actonselfeat_keys.length > 0) {
			opt_actonselfeat_ok = true;
		}

	}

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
						p_mapctx.drawSingleFeature(foundly.key, sqrid, false, GlobalConst.DEBUG_FEATMOUSESEL_SPINDEXMASK_SYMB, canvas_layers);
					} catch (e) {
						console.error(`[DBG:FEATMOUSESEL] feature error '${e}'`);
					}
				}

			}
		}

		let tmpd, findings={}; //= Number.MAX_SAFE_INTEGER;
		const eps = GlobalConst.MOUSEINTERACTION_NEARESTFEATURES_COINCIDENCE_TOLERANCE;
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

					if (findings[to_lyrk] === undefined) {
						findings[to_lyrk] = { "dist": Number.MAX_VALUE, "ids": [] };
					}

					for (let r of related_ids[from_lyrk][to_lyrk]) {

						tmpd = p_mapctx.featureCollection.distanceTo(terr_pt, to_lyrk, r, minarea);

						if (tmpd < findings[to_lyrk].dist) {
							findings[to_lyrk].ids = [r];
							findings[to_lyrk].dist = tmpd;
						} else if (tmpd < findings[to_lyrk].dist + eps) {
							if (findings[to_lyrk].ids.indexOf(r) < 0) {
								findings[to_lyrk].ids.push(r);
							}
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

							p_mapctx.drawSingleFeature(to_lyrk, r, false, GlobalConst.DEBUG_FEATMOUSESEL_SELUNDERMASK_SYMB, canvas_layers);
						}
					}
				}
			}
		}

		if (Object.keys(findings).length > 0) {

			for (let lyrk in findings) {

				foundly = null;
				for (let ly of p_mapctx.tocmgr.layers) {
					if (ly.key == lyrk) {
						foundly = ly;
						break;
					}
				}

				if (foundly == null) {
					throw new Error(`interactWithSpindexLayer: to layer '${lyrk}' not found`);
				}

				if (foundly.layervisible && (p_maxdist == null || p_maxdist >=  findings[lyrk].dist)) {
					p_mapctx.renderingsmgr.clearAll(['temporary','transientmap']);
					break;
				}
			}
		}

		let feats = {};
		if (Object.keys(findings).length > 0) {

			for (let lyrk in findings) {

				foundly = null;
				for (let ly of p_mapctx.tocmgr.layers) {
					if (ly.key == lyrk) {
						foundly = ly;
						break;
					}
				}

				/* if (foundly == null) {
					throw new Error(`interactWithSpindexLayer: to layer '${lyrk}' not found`);
				} */

				if (GlobalConst.getDebug("FEATMOUSESEL")) {
					console.log(`[DBG:FEATMOUSESEL] interact with NEAREST: ${lyrk}, dist:${findings[lyrk].dist} (max: ${p_maxdist}) to ids:${findings[lyrk].ids}`);
				}
	
				if (foundly.layervisible && (p_maxdist == null || p_maxdist >=  findings[lyrk].dist)) {

					//p_mapctx.renderingsmgr.clearAll(['temporary','transientmap']);

					/*
					let canvas_layers;
					if (p_is_end_event) {
						canvas_layers = {'normal': 'temporary', 'label': 'temporary' };
					} else {
						canvas_layers = {'normal': 'transientmap', 'label': 'transientmap' };
					}
					*/

					// console.log(">> found k:", lyrk, "ids:", findings[lyrk].ids, "dist:", findings[lyrk].dist);

					for (let id of findings[lyrk].ids) {
						feat = p_mapctx.featureCollection.get(lyrk, id);
						// feat = await p_mapctx.drawFeatureAsMouseSelected(lyrk, id, "NORMAL", canvas_layers);
						if (feat!=null && (opt_actonselfeat_ok || opt_hoveronemptyspace!=null)) {
							if (feats[lyrk] === undefined) {
								feats[lyrk] = [];
							}
							feats[lyrk].push({"feat": feat, "id": id });
						}
					}	

				}
			}
		}

		let usesel = null, coincidence_found;

		if (opt_actonselfeat_ok) {

			// at this point, opt_actonselfeat_dict contains methods to execute just on 'hover' or on 'hover' and on 'pick'

			let mode = "hover";
			if (opt_actonselfeat_keys.length > 1) {

				// at this point, opt_actonselfeat_dict has methods for both 'hover' and 'pick' ...

				// tablet mode SIMPLE only
				if (p_mapctx.tabletFeatPreSelection.isActive) {

					// if pre-selection object exists and is active ...

					if (!p_mapctx.tabletFeatPreSelection.isSet) {

						// if pre-selection object is empty, lets 'hover' with current features

						p_mapctx.tabletFeatPreSelection.set(feats);
						usesel = feats;

					} else {

						// pre-selection object is not empty, lets retrieve pre-selected features.

						usesel = p_mapctx.tabletFeatPreSelection.get();

						// Now, must check coincidence exists between preselected and current features
						//  (by at least one feature).

						coincidence_found = false;
						for (let lyrk in feats) {

							for (const from_feat of feats[lyrk]) {

								if (!feats.hasOwnProperty(lyrk)) {
									continue;
								}	

								if (usesel[lyrk] !== undefined) {
									if (!usesel.hasOwnProperty(lyrk)) {
										continue;
									}		
									for (const to_feat of usesel[lyrk]) {
										if (from_feat.id == to_feat.id) {
											coincidence_found = true;
											break;
										}
									}	
								}
								if (coincidence_found) {
									break;
								}
							}
						}

						// In case current and pre-sel features share at least one feat, ...

						if (coincidence_found) {

							//  ... pre-selection is cleared, and retrieved pre-selected features are used to 'pick',
							p_mapctx.tabletFeatPreSelection.reset();						
							mode = "pick";

						} else {

							// Otherwise, current features are put in pre-sel and used to 'hover'
							p_mapctx.tabletFeatPreSelection.set(feats);
							usesel = feats;						
							mode = "hover";

						}
					}
				} else {
					// no pre-selection, no decision to make, just 'pick'
					mode = "pick";
				}
			}
			if (usesel == null) {
				usesel = feats;
			}

			ret_dir_interact = false;
			if (usesel != null && Object.keys(usesel).length > 0) {
				ret_dir_interact = opt_actonselfeat_dict[mode](p_mapctx, usesel, p_scrx, p_scry);
			} 

			// console.log("ret_dir_interact:", ret_dir_interact);

			if (!ret_dir_interact) {
				if (p_is_end_event) {
					if (opt_clickonemptyspace) {
						opt_clickonemptyspace(p_mapctx, 'INTERACTSPIDXLYR', p_scrx, p_scry);
					}
				} else {
					if (opt_hoveronemptyspace) {

						if (feats == null || Object.keys(feats).length < 1) {
							ret_dir_interact =  opt_hoveronemptyspace(p_mapctx, 'INTERACTSPIDXLYR', p_scrx, p_scry);
						}
			
					}
				}			
			} 
		} else if (opt_hoveronemptyspace!=null) {

			if (feats == null || Object.keys(feats).length < 1) {
				ret_dir_interact =  opt_hoveronemptyspace(p_mapctx, 'INTERACTSPIDXLYR', p_scrx, p_scry);
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

export class wheelEventCtrller {

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
					if (pp_evt.offsetX == 0) {
						pp_mapctx.transformmgr.setScaleCenteredAtScrPoint(p_this.wheelscale, [pp_evt.clientX, pp_evt.clientY], true);
					} else {
						pp_mapctx.transformmgr.setScaleCenteredAtScrPoint(p_this.wheelscale, [pp_evt.offsetX, pp_evt.offsetY], true);
					}
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

