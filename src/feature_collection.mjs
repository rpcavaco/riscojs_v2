import {GlobalConst} from './constants.js';
import {distanceToPoly, distanceToLine, dist2D, bbTouch} from './geom.mjs'
import {Layer} from './layers.mjs'

export class FeatureCollection {

	constructor(p_mapctx) {
		this.mapctx = p_mapctx;
		this.featList = {};
		this.layers = {};
		//this.labelfield = null;
	}

	setLayer(p_layerkey, p_layerobj) {

		if (!(p_layerobj instanceof Layer)) {
			throw new Error(`layer '${p_layerkey}' is not instance of Layer`);
		}

		/*if (p_layerkey == "EV") {
			console.log("+++", p_layerobj);
		}*/

		if (this.featList[p_layerkey] === undefined) {
			this.featList[p_layerkey] = {};
			this.layers[p_layerkey] = p_layerobj;
		} else {
			throw new Error(`layer '${p_layerkey}' already set`);
		}	

		/* if (p_layerobj['labelfield'] !== undefined && p_layerobj['labelfield'] != "none") {
			this.labelfield = p_layerobj['labelfield'];
		} */
	}

	add(p_layerkey, p_geom, p_attrs, p_geom_type, p_path_levels, opt_id, opt_id_fieldname) {

		function innerCycle(pp_this, pp_bbox, pp_root, pp_call_level, pp_path_level, pp_feat_id) {
	
			let ptini=null, ret = false;

			for (let pti=0; pti<pp_root.length; pti++) {

				if (typeof pp_root[pti][0] != 'number' && ptini == null) {

					ret = innerCycle(pp_this, pp_bbox, pp_root[pti], pp_call_level+1, pp_path_level-1, pp_feat_id);

				} else {

					if (ptini==null) {

						if (pp_path_level != 1) {
							console.error(`[WARN] non-zero bottom path level on layer '${pp_this.key}', feat.id:${pp_feat_id}`);
						}

						ptini = pp_root[pti].slice(0);

					}

					for (let p in p_geom) {
						if (pp_root[pti][0] < pp_bbox[0]) {
							pp_bbox[0] = pp_root[pti][0];
						}
						if (pp_root[pti][0] > pp_bbox[2]) {
							pp_bbox[2] = pp_root[pti][0];
						}
						if (pp_root[pti][1] < pp_bbox[1]) {
							pp_bbox[1] = pp_root[pti][1];
						}
						if (pp_root[pti][1] > pp_bbox[3]) {
							pp_bbox[3] = pp_root[pti][1];
						}
					}

				}
			}

			if (ptini != null) {

				ret = true;

			}

			return ret;
		}

		if (opt_id != null && opt_id_fieldname != null) {
			throw new Error(`layer '${p_layerkey}' opt_id, opt_id_fieldname are mutually exclusive, both were given, opt_id:${opt_id}, opt_id_fieldname:${opt_id_fieldname}`);
		}

		if (this.featList[p_layerkey] === undefined) {
			throw new Error(`layer '${p_layerkey}' was not set through 'setLayer' method`);
		}

		let id;

		if (opt_id) {
			id = opt_id;
		} else {
			id = p_attrs[opt_id_fieldname];
		}

		if (this.featList[p_layerkey][id] !== undefined) {

			//delete this.featList[p_layerkey][id];
			// probably wasn't properly garbage collected yet, returning id null prevents subsequent drawing
			id = null;

		} else {

			if (p_geom.length > 0) {

				const bbox = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER]

				innerCycle(this, bbox, p_geom, 0, p_path_levels, id);

				//console.log(p_layerkey, bbox, p_geom)

				this.featList[p_layerkey][id] = {
					gt: p_geom_type,
					l: p_path_levels,
					g: p_geom.slice(0),
					a: {...p_attrs},
					bb: bbox.slice(0)
				};				
			}	
		}

		return id;
	}

	remove(p_layerkey, p_id) {
		if (this.featList[p_layerkey] !== undefined) {
			if (this.featList[p_layerkey][p_id] !== undefined) {
				delete this.featList[p_layerkey][p_id];
			}
		}
	}

	emptyLayer(p_layerkey) {
		if (this.featList[p_layerkey] !== undefined) {
			this.featList[p_layerkey] = {};
		}
	}

	emptyAll() {
		for (let layerkey in this.featList) {
			this.emptyLayer(layerkey);
		}
	}	

	invalidate() {
		this.emptyAll();
		//this.spIndex.invalidate();
	}
	
	draw(p_mapctxt, p_layerkey, opt_featid, opt_alt_canvaskey, opt_symbs, opt_terrain_env) {

		let feat;

		if (this.featList[p_layerkey] === undefined) {
			throw new Error(`layer '${p_layerkey}' was not set through 'setLayer' method`);
		}

		if (opt_featid) {

			feat = this.featList[p_layerkey][opt_featid];
			if (feat == null) {
				throw new Error(`layer '${p_layerkey}' no feature for id ${opt_featid}`);
			}
			this.layers[p_layerkey].refreshitem(p_mapctxt, feat.g, feat.a, feat.l, opt_featid, opt_alt_canvaskey, opt_symbs, opt_terrain_env);

		} else {

			for (let id in this.featList[p_layerkey]) {
				if (this.featList[p_layerkey].hasOwnProperty(id)) {
					feat = this.featList[p_layerkey][id];
					this.layers[p_layerkey].refreshitem(p_mapctxt, feat.g, feat.a, feat.l, id, opt_alt_canvaskey, opt_symbs, opt_terrain_env);
				}
			}
		}
	}

	get(p_layerkey, p_id) {
		let ret = null;
		if (this.featList[p_layerkey][p_id] !== undefined) {
			ret = this.featList[p_layerkey][p_id];
		}
		return ret;
	}

	distanceTo(p_from_pt, p_layerkey, p_featid, p_minarea) {

		let ret = -1, feat = this.featList[p_layerkey][p_featid];
		if (feat == null) {
			throw new Error(`layer '${p_layerkey}' no feature for id ${p_featid}`);
		}

		let dodebug = false;
		if (GlobalConst.DEBUG_FEATURE_DISTANCETO && GlobalConst.DEBUG_FEATURE_DISTANCETO_FEATID == p_featid) {
			dodebug = true;
		}

		switch(feat.gt) {

			case "poly":
				ret = distanceToPoly(feat.g, feat.l, p_from_pt, p_minarea, dodebug, p_featid);
				break;

			case "line":
				ret = distanceToLine(feat.g, feat.l, p_from_pt, p_minarea, dodebug); 
				break;
				
			case "point":
				ret = dist2D(feat.g, p_from_pt);
				if (dodebug) {
					console.log("[DBG:DISTANCETO] point layer:", p_layerkey, "feat.id:", p_featid, "dist:", ret);
				}
				break;		
				
			default:
				throw new Error(`unknown feature geom type: ${feat.gt}`)
		}

		/*if (GlobalConst.getDebug("FEATMOUSESEL")) {
			console.log(`[DBG:FEATMOUSESEL] layer '${p_layerkey}', feature id ${p_featid}, dist:${ret}`);
		}*/

		return ret;
	}

	relateall() {
		
		let relcfgvar, fr_lyk, to_lyk;

		const t0 = new Date().getTime();
			
			
		if (this.mapctx.cfgvar["layers"]["relations"] === undefined) {
			console.info("[INFO] no feature layer relations configured.");
			return;
		} else {
			console.info("[INFO] collecting relations between feature layers ...")
			relcfgvar = this.mapctx.cfgvar["layers"]["relations"];
		}

		if (relcfgvar.length > 0) {

			for (const rel of relcfgvar) {

				fr_lyk = rel["from"];
				to_lyk = rel["to"];

				if (this.featList[fr_lyk] === undefined) {
					throw new Error(`relations, no 'from' layer '${fr_lyk}' loaded in current feature collection`);
				}

				if (this.featList[to_lyk] === undefined) {
					console.info(`[INFO] relations, no 'to' layer '${to_lyk}' loaded in current feature collection`);
				}	
				
				let ff, tf;
				//let cnt = 20;
				for (let idfrom in this.featList[fr_lyk]) {

					ff = this.featList[fr_lyk][idfrom];
					for (let idto in this.featList[to_lyk]) {

						tf = this.featList[to_lyk][idto];
						switch(rel["op"]) {

							case "bbtouch":
								if (bbTouch(ff.bb, tf.bb)) {
									if (ff["r"] === undefined) {
										ff["r"] = {};
									} 
									if (ff["r"][to_lyk] === undefined) {
										ff["r"][to_lyk] = [];
									} 						
									ff.r[to_lyk].push(idto);
								}
								break;
			
						}
						//console.log("bb:", ff.bb, tf.bb);
					}
				}
			}

			const t1 = new Date().getTime();

			console.info("[INFO] all relations collected in", (t1-t0), "ms")

		} else {

			console.info("[INFO] no relations to collect");

		}

	}

}