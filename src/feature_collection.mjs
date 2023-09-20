import {GlobalConst} from './constants.js';
import {distanceToPoly, distanceToLine, dist2D, bbTouch} from './geom.mjs'
import {Layer} from './layers.mjs'
import {isSuperset, setEquality} from './utils.mjs'

export class FeatureCollection {

	mapctx;
	featList;
	layers;
	indexes;
	lyrkeys_exclude_from_redraw;
	current_featuresdraw_status;

	constructor(p_mapctx) {

		this.mapctx = p_mapctx;
		this.featList = {};
		this.layers = {};
		this.indexes = {};
		this.lyrkeys_exclude_from_redraw = [];
		//this.labelfield = null;

		this.relationscfg = p_mapctx.cfgvar["layers"]["relations"];	
		this.current_featuresdraw_status = null;
		
	}


	setLayer(p_layerkey, p_layerobj, opt_exclude_from_redraw) {

		if (!(p_layerobj instanceof Layer)) {
			throw new Error(`layer '${p_layerkey}' is not instance of Layer`);
		}

		if (opt_exclude_from_redraw) {
			if (this.lyrkeys_exclude_from_redraw.indexOf(p_layerkey) < 0) {
				this.lyrkeys_exclude_from_redraw.push(p_layerkey);
			}
		}

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

				this.featList[p_layerkey][id] = {
					gt: p_geom_type,
					l: p_path_levels,
					g: p_geom.slice(0),
					a: {...p_attrs},
					bb: bbox.slice(0)
				};		
				
				for (const relentry of this.relationscfg) {
					
					let ptr, thisindex=null, ixlen, fldlist;
					if (relentry.op == "attrjoin" && relentry.from == p_layerkey) {

						if (relentry['using'] !== undefined) {
							fldlist = [...relentry['using']];
						} else if (relentry['fromfields'] !== undefined) {
							fldlist = [...relentry['fromfields']];
						}
						
						if (this.indexes[p_layerkey] === undefined) {
							this.indexes[p_layerkey] = [];
						}

						for (const idx of this.indexes[p_layerkey]) {
							if (setEquality(new Set(idx.fields), new Set(fldlist))) {
								thisindex = idx;
								break;
							}
						}

						if (thisindex == null) {
							ixlen = this.indexes[p_layerkey].push({"fields": [...fldlist], "content": {}});
							thisindex = this.indexes[p_layerkey][ixlen-1];
						}

						ptr = thisindex["content"];
						for (let fld, fldix=0; fldix<thisindex["fields"].length; fldix++) {

							fld = thisindex["fields"][fldix];
							if (ptr[p_attrs[fld]] === undefined) {
								if (fldix == (thisindex["fields"].length-1)) {
									ptr[p_attrs[fld]] = [];
								} else {
									ptr[p_attrs[fld]] = {};
								}	
							}
							ptr = ptr[p_attrs[fld]];

						}	

						// testar se ptr evoluiu ou não e ptr é lista
						console.assert(Array.isArray(ptr), `ptr is not array, dict root:${JSON.stringify(thisindex["content"])}, flds:${JSON.stringify(thisindex["fields"])}, rec:${JSON.stringify(p_attrs)}`);

						if (ptr.indexOf(id) < 0) {
							ptr.push(id);				
						}
					}
				}	
			}	
		}

		return id;
	}

	// TODO p_op: 'EQ', 'LT', 'GT', 'LE', 'GE' -- To complete implementation of all ops
	find(p_layerkey, p_op, p_name_value_dict, out_id_list) {
		out_id_list.length = 0;
		let feat, found;
		if (this.featList[p_layerkey] !== undefined) {
			for (let id in this.featList[p_layerkey]) {
				feat = this.featList[p_layerkey][id];
				switch(p_op) {
					case 'EQ':
						found = true;
						for (let fname in p_name_value_dict) {
							if (feat.a[fname] != p_name_value_dict[fname]) {
								found = false;
								break;
							};	
						}
						if (found) {
							out_id_list.push(id);
						};
						break;

					default:
						throw new Error(`FeatureCollection.find: unsupported logical operation '${p_op}'`);
				}
			}
		} else {
			console.warn(`FeatureColllection.find: no '${p_layerkey}' layer exists`);
		}
		return (out_id_list.length > 0);
	}

	remove(p_layerkey, p_id) {
		if (this.featList[p_layerkey] !== undefined) {
			if (this.featList[p_layerkey][p_id] !== undefined) {
				delete this.featList[p_layerkey][p_id];
			}
		}
	}

	featCount(p_layerkey) {
		return Object.keys(this.featList[p_layerkey]).length;
	}

	filteredFeatCount(p_layerkey, opt_filterfunc) {
		
		let ret = null;

		if (opt_filterfunc) {
			ret = 0;
			for (let fk in this.featList[p_layerkey]) {
				if (opt_filterfunc(null, this.featList[p_layerkey][fk].a)) {
					ret++;
				}
			}
		} else {
			ret = Object.keys(this.featList[p_layerkey]).length;
		}

		return ret;
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
	
	clearIndexes() {
		for (let key in this.indexes){
			delete this.indexes[key];
		}
	}

	invalidate() {
		this.emptyAll();
		this.clearIndexes();
		//this.spIndex.invalidate();
	}

	featuredraw(p_layerkey, p_featid, p_alt_canvaskey, opt_symbs, opt_terrain_env, opt_checkfeatattrsfunc) {

		if (this.featList[p_layerkey] === undefined) {
			return Promise.reject(new Error(`featuredraw, layer '${p_layerkey}' was not set through 'setLayer' method`));
		}

		if (p_featid == null || p_featid === undefined) {
			return Promise.reject(new Error(`featuredraw, layer '${p_layerkey}', null or undefined featid`));
		}

		let feat = this.featList[p_layerkey][p_featid];

		if (feat == null) {
			return Promise.reject(new Error(`featuredraw, layer '${p_layerkey}', no feature found for id ${p_featid}`));
		}

		const that = this;

		return new Promise((resolve, reject) => {

			if (opt_checkfeatattrsfunc==null || opt_checkfeatattrsfunc(feat.a)) {
				that.layers[p_layerkey].refreshitem(that.mapctx, feat.g, feat.a, feat.l, p_featid, p_alt_canvaskey, opt_symbs, opt_terrain_env).then(
					() => { resolve(feat); }
				).catch(
					(e) => { reject(e); }
				);

			} else {
				resolve(null);
			}

		});

	}	

	featuresdrawNext(p_layerkey, p_featidlist, opt_alt_canvaskey, opt_symbs, opt_terrain_env) {

		const feat_id = p_featidlist.shift();
		const that = this;

		return new Promise((resolve, reject) => {

			if (feat_id==null || feat_id===undefined) {
				resolve();
			} else {
				try {

					that.featuredraw(p_layerkey, feat_id, opt_alt_canvaskey, opt_symbs, opt_terrain_env, that.layers[p_layerkey].isFeatureInsideFilter.bind(that.layers[p_layerkey])).then(
						() => { 
							that.featuresdrawNext(p_layerkey, p_featidlist, opt_alt_canvaskey, opt_symbs, opt_terrain_env);
						}
					).catch(
						(e) => { reject(e); }
					);

				} catch(e) {
					reject(e);
				}
			}
		});

	}
	
	featuresdraw(p_layerkey, opt_alt_canvaskey, opt_symbs, opt_terrain_env) {

		let featidlist=[];

		console.log(":::: 341 featuresdraw", p_layerkey);


		if (this.featList[p_layerkey] === undefined) {
			throw new Error(`layer '${p_layerkey}' was not set through 'setLayer' method`);
		}

		for (let id in this.featList[p_layerkey]) {
			if (this.featList[p_layerkey].hasOwnProperty(id)) {
				featidlist.push(id);
				// if (this.layers[p_layerkey].isFeatureInsideFilter(feat.a)) {
				//	this.layers[p_layerkey].refreshitem(this.mapctx, feat.g, feat.a, feat.l, id, opt_alt_canvaskey, opt_symbs, opt_terrain_env);
				//}
			}
		}

		const that = this;

		return new Promise((resolve, reject) => {
			if (featidlist.length > 0) {

				console.log(":::: 360 :::::", p_layerkey, "feeatcnt:", featidlist.length);
				const p = that.featuresdrawNext(p_layerkey, featidlist, opt_alt_canvaskey, opt_symbs, opt_terrain_env);

				// console.log(":::: p ::", p);
				p.then(
					() => { 
						console.log("  ::: 366 resolving", p_layerkey)
						resolve(); 
					}
				).catch((e) => {
					console.log("  ::: 370 !! rejecting", p_layerkey)
					reject(e);
				});

			} else {
				console.log("  ::: 374 resolving", p_layerkey)
				resolve();
			}
		});


	}

	redrawAllVectorLayersNext(p_work_layerkeys) {

		const lyrkey = p_work_layerkeys.shift();

		const that = this;

		console.log(":::: 394 :::::", lyrkey, JSON.stringify(p_work_layerkeys));


		if (lyrkey) {

			this.featuresdraw(lyrkey).then(
				(x) => {
					console.log(":::: 401 :::::", x, lyrkey, JSON.stringify(p_work_layerkeys));
					that.redrawAllVectorLayersNext(p_work_layerkeys);
				}
			).catch((e) => {
				console.log(":::: ERR 405 :::::", e);
				console.error(e);
			});

		}

	}

	redrawAllVectorLayers() {

		let lyrkey, canvases_keys = [...this.mapctx.renderingsmgr.featdraw_canvaskeys], work_layerkeys = [];

		this.mapctx.renderingsmgr.clearAll(canvases_keys);

		const featlyrkeys = Object.keys(this.featList);
		for (lyrkey of this.mapctx.cfgvar["layers"].lorder) {
			if (featlyrkeys.indexOf(lyrkey) >= 0) {
				if (this.lyrkeys_exclude_from_redraw.indexOf(lyrkey) >= 0) {
					continue;
				}
				//console.log(":: redraw", lyrkey);
				work_layerkeys.push(lyrkey);
			}
		}

		if (work_layerkeys.length > 0) {
			this.redrawAllVectorLayersNext(work_layerkeys);
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
				ret = dist2D(feat.g[0], p_from_pt);
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
		
		let relcfgvar, fr_lyk, to_lyk, bidir;

		const t0 = new Date().getTime();
			
			
		if (this.mapctx.cfgvar["layers"]["relations"] === undefined) {
			console.info("[INFO] no feature layer relations configured.");
			return;
		} else {
			console.info("[INFO] collecting relations between feature layers ...")
			relcfgvar = this.mapctx.cfgvar["layers"]["relations"];
		}

		if (relcfgvar.length > 0) {

			let count  = 0;
			for (const rel of relcfgvar) {

				count++;

				fr_lyk = rel["from"];
				to_lyk = rel["to"];

				bidir = false;
				if (rel["bidir"] !== undefined && rel["bidir"]) {
					bidir = true;
				}

				if (this.featList[fr_lyk] === undefined) {
					throw new Error(`relations, no 'from' layer '${fr_lyk}' loaded in current feature collection`);
				}

				if (this.featList[to_lyk] === undefined) {
					console.info(`[INFO] relations, no 'to' layer '${to_lyk}' loaded in current feature collection`);
				}	
				
				let ff, tf;
				//let cnt = 20;

				if (rel["op"] ==  "bbtouch") {
					for (let idfrom in this.featList[fr_lyk]) {

						ff = this.featList[fr_lyk][idfrom];
						for (let idto in this.featList[to_lyk]) {
	
							tf = this.featList[to_lyk][idto];

							if (bbTouch(ff.bb, tf.bb)) {
								if (ff["r"] === undefined) {
									ff["r"] = {};
								} 
								if (ff["r"][to_lyk] === undefined) {
									ff["r"][to_lyk] = [];
								} 						
								ff.r[to_lyk].push(idto);
								if (bidir) {
									if (tf["r"] === undefined) {
										tf["r"] = {};
									} 
									if (tf["r"][fr_lyk] === undefined) {
										tf["r"][fr_lyk] = [];
									} 						
									tf.r[fr_lyk].push(idfrom);										
								}
							}
						}
					}	

				} else if (rel["op"] ==  "attrjoin") {

					let ptr, idto, tfattrset, foundidx = null;
					let tokeys = Object.keys(this.featList[to_lyk]);

					if (tokeys.length > 0) {
						idto = tokeys[0];
						tf = this.featList[to_lyk][idto];
						tfattrset = new Set(Object.keys(tf.a));
						if (this.indexes[fr_lyk] !== undefined) {
							for (const idx of  this.indexes[fr_lyk]) {
								if (isSuperset(tfattrset, idx.fields)) {
									foundidx = idx;
									break;
								}
							}							
						}
					}

					let removed_count = 0;
					if (foundidx) {

						for (idto of tokeys) {

							tf = this.featList[to_lyk][idto];
							ptr = foundidx.content;
							for (let fldname of foundidx.fields) {
								if (ptr[tf.a[fldname]] !== undefined) {
									ptr = ptr[tf.a[fldname]];
								} else {
									ptr = null;
									break;
								}
							}


							if (rel["cmd"] ==  "skipunmatched_tolyrfeats") {
								if (ptr == null || !Array.isArray(ptr)) {
									removed_count++;
									this.remove(to_lyk, idto);
								}	
							}

						
						}

					} else {

						if (tokeys.length > 0 && rel["cmd"] ==  "skipunmatched_tolyrfeats") {
							for (idto of tokeys) {
								removed_count++;
								this.remove(to_lyk, idto);
							}
						}
					}

					if (removed_count > 0) {

						console.assert(rel["cmd"] ==  "skipunmatched_tolyrfeats", `FeatureCollection relateall, features removed from layer '${to_lyk}', but active relationship '${rel["cmd"]}' is not of 'remove' type like 'skipunmatched_tolyrfeats'`);

						console.info(`[INFO] relation ${count}, 'attrjoin',  removed ${removed_count} features from layer '${to_lyk}'`);
						// SUSPENSO ou não ...
						console.log("!!!!!!!!!!!!!!! ------ redraw all -------");
						//this.redrawAllVectorLayers();
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