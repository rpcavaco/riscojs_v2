import {GlobalConst} from './constants.js';
import {uuidv4} from './utils.mjs';
import { RemoteVectorLayer } from './layers.mjs';

function calcPathLevels(p_coords_obj) {

	let curr_node = p_coords_obj[0], plevel = -1, cnt = 0;

	while (cnt < 10 && plevel < 0) {
		
		cnt++;
		
		if (typeof curr_node == 'number') {
			plevel = cnt;
		} else {
			if (curr_node[0] !== undefined) {
				curr_node = curr_node[0];
			} else {
				break;
			}
		}
	}

	return plevel;

}

/*
function validateGeometry(p_geom_type, p_content_obj) {

	let ret_path_levels;

	if (p_content_obj.crds !== undefined && p_content_obj.crds != null) {
	
		if (p_content_obj.crds.length == undefined && p_content_obj.crds.length < 1) {
			return -1;
		}

		// validar geometria
		switch (p_geom_type) {
			case 'point':
				if (p_content_obj.crds.length < 1 || typeof p_content_obj.crds[0] != 'number') {
					throw new Error(`Geometry error, structure. Type: ${p_geom_type}`);
				}
				if (p_content_obj.crds.length < 2) {
					throw new Error(`Geometry error, length. Type: ${p_geom_type}`);
				}
				ret_path_levels = 1;
				break;
				
			case 'line':
				if (p_content_obj.crds.length < 1 || typeof p_content_obj.crds[0] != 'number') {
					throw new Error(`Geometry error, structure. Type: ${p_geom_type}`);
				}
				if (p_content_obj.crds.length < 4) {
					throw new Error(`Geometry error, length. Type: ${p_geom_type}`);
				}
				ret_path_levels = 1;
				break;
				
			case 'mline':
			case 'poly':
				if (p_content_obj.crds.length < 1 || p_content_obj.crds[0].length < 1 || typeof p_content_obj.crds[0][0] != 'number') {
					throw new Error(`Geometry error, structure. Type: ${p_geom_type}`);
				}
				for (var pcoi=0; pcoi<p_content_obj.crds.length; pcoi++) {
					if (p_content_obj.crds[pcoi].length < 4) {
						throw new Error(`Geometry error, length. Type: ${p_geom_type}`);
					}
				}
				ret_path_levels = 2;
				break;
				
			case 'mpoly':
				if (p_content_obj.crds.length < 1 || p_content_obj.crds[0].length < 1 || p_content_obj.crds[0][0].length < 1 || typeof p_content_obj.crds[0][0][0] != 'number') {
					throw new Error(`Geometry error, structure. Type: ${p_geom_type}`);
				}
				let tmp_pcol;
				for (var pcoib=0; pcoib<p_content_obj.crds.length; pcoib++) {
					tmp_pcol = p_content_obj.crds[pcoib];
					for (var pcoia=0; pcoia<tmp_pcol.length; pcoia++) {
						if (tmp_pcol[pcoia].length < 4) {
							throw new Error(`Geometry error, length. Type: ${p_geom_type}`);
						}
					}
				}
				ret_path_levels = 3;
				break;	
								
			case 'mpoint':
				if (p_content_obj.crds.length < 1) {
					throw new Error(`Geometry error, structure. Type: ${p_geom_type}`);
				} 
				if ( typeof p_content_obj.crds[0] != 'number' && p_content_obj.crds[0].length < 1) {
					throw new Error(`Geometry error, structure. Type: ${p_geom_type}`);
				} 
				if (p_content_obj.crds[0] == 'number') {
					ret_path_levels = 1;
				} else {
					ret_path_levels = 2;
				}
				break;	
								
			default:
				throw new Error(`unsupported geometry, type given: ${p_geom_type}`);
				
		}			
		
		return ret_path_levels;		

	} else {
		console.log(p_content_obj);
		console.error("Missing geometry");
		return -1;
	}	
}
*/

function adaptCoords(p_path_levels, p_in_coords, p_center_pt, p_pixsz, out_coords) {

	let crd_idx, crd_cnt, partcollection, part, outpartc, outpart, partc_cnt, part_cnt, partc_idx, part_idx, vx, vy;

	out_coords.length = 0;

	switch (p_path_levels) {

		case 3:
			partc_idx = 0;
			partc_cnt = p_in_coords.length;
			while (partc_idx < partc_cnt) {
				partcollection = p_in_coords[partc_idx];
				outpartc = [];
				part_idx = 0;
				part_cnt = partcollection.length;
				while (part_idx < part_cnt) {
					part = partcollection[part_idx];
					crd_idx = 0;
					outpart = [];
					crd_cnt = part.length;
					if (crd_cnt % 2 != 0) {
						throw new Error("Odd number of coords, crd_cnt:"+crd_cnt+" p_path_levels:"+p_path_levels);
					}
					while (crd_idx < crd_cnt) {

						vx = p_center_pt[0] + p_pixsz * part[crd_idx];
						vy = p_center_pt[1] + p_pixsz * part[crd_idx+1];
	
						outpart.push([vx, vy]);
						crd_idx+=2;
					}
					outpartc.push(outpart)
					part_idx++;
				}
				out_coords.push(outpartc);
				partc_idx++;
			}
			break;

		case 2:
			part_idx = 0;
			part_cnt = p_in_coords.length;
			while (part_idx < part_cnt) {

				part = p_in_coords[part_idx];
				crd_idx = 0;
				outpart = [];
				crd_cnt = part.length;
				if (crd_cnt % 2 != 0) {
					throw new Error("Odd number of coords, crd_cnt:"+crd_cnt+" p_path_levels:"+p_path_levels);
				}
				while (crd_idx < crd_cnt) {

					vx = p_center_pt[0] + p_pixsz * part[crd_idx];
					vy = p_center_pt[1] + p_pixsz * part[crd_idx+1];
	
					outpart.push([vx, vy]);
					crd_idx+=2;
				}
				out_coords.push(outpart)
				part_idx++;

			}
			break;

		default:
			crd_idx = 0;
			crd_cnt = p_in_coords.length;
			if (crd_cnt % 2 != 0) {
				console.log(p_in_coords);
				throw new Error("Odd number of coords, crd_cnt:"+crd_cnt+" p_path_levels:"+p_path_levels);
			}
			while (crd_idx < crd_cnt) {

				vx = p_center_pt[0] + p_pixsz * p_in_coords[crd_idx];
				vy = p_center_pt[1] + p_pixsz * p_in_coords[crd_idx+1];

				// console.log(vx, " = ", p_center_pt[0], " + ", p_pixsz, " * ", p_in_coords[crd_idx], crd_idx);
		
				out_coords.push([vx, vy]);
				crd_idx+=2;
			}				
	}	
}

export class RiscoFeatsLayer extends RemoteVectorLayer {

	url;     // https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer
	_name = "RiscoFeatsLayer";
	_gisid_field;
	_accept_deletion;

	constructor() { 
		super();
		this.pendingChunks = [];
		this._servmetadata_docollect = false;
	}

	getStatsURL(p_mapctx) { //, opt_filter) {

		let sep, center=[], dims=[];
		if (this.url.endsWith("/")) {
			sep = "";
		} else {
			sep = "/";
		}
		// TODO: verificar número de casas decimais
		
		p_mapctx.transformmgr.getCenter(center);
		p_mapctx.getCanvasDims(dims);
		
		const mapname = p_mapctx.cfgvar["basic"]["mapname"];
		const baseurl = `${this.url}${sep}stats`;

		const url = new URL(baseurl);		
		const sp = url.searchParams;

		sp.set('map', mapname);
		sp.set('cenx', center[0]);
		sp.set('ceny', center[1]);
		sp.set('wid', dims[0] *  p_mapctx.getPixSize());
		sp.set('hei', dims[1] *  p_mapctx.getPixSize());
		sp.set('pixsz', p_mapctx.getPixSize());
		sp.set('vizlrs',this.key);

		const ret = url.toString();		
		if (GlobalConst.getDebug("RISCOFEATS")) {
			console.log(`[DBG:RISCOFEATS] -- getStatsURL: '${ret}'`);
		}	

		return ret;
	}

	// https://loc.cm-porto.net/riscosrv/feats?map=loc&reqid=13d5e2fe-5569-11ed-b265-005056a2682e&lname=EDIFICADO&chunks=2&vertxcnt=9298&chunk=1&_ts=1666814531077
		

	// [reqid, numchunks, nvert, i]

	getFeaturesURL(p_mapctx, p_item_chunk_params) { //, opt_filter) {

		let sep, ret = "";
		if (this.url.endsWith("/")) {
			sep = "";
		} else {
			sep = "/";
		}
		// TODO: verificar número de casas decimais

		const reqid = p_item_chunk_params[0];
		const numchunks = p_item_chunk_params[1];
		const nvert = p_item_chunk_params[2];
		const chunkidx = p_item_chunk_params[3];
		
		const mapname = p_mapctx.cfgvar["basic"]["mapname"];
		const baseurl = `${this.url}${sep}feats`;

		const url = new URL(baseurl);		
		const sp = url.searchParams;

		sp.set('map', mapname);
		sp.set('reqid', reqid.toString());
		sp.set('lname',this.key);
		sp.set('chunks', numchunks);
		sp.set('vertxcnt', nvert);
		sp.set('chunk', chunkidx);

		ret = url.toString();		
		if (GlobalConst.getDebug("RISCOFEATS")) {
			console.log(`[DBG:RISCOFEATS] getFeaturesURL: '${ret}'`);
		}

		return ret;
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	getStats(p_mapctx, p_terrain_env) {

		const url = this.getStatsURL(p_mapctx);
		//console.log("## GETSTATS:", url);
		const that = this;

		fetch(url)
			.then(response => {
				if (response.ok) {
					return response.json();
				} else {
					// PARTIAL MissingFeat 0001
					console.error(`Impossible to fetch '${that.key}', response error`);
					p_mapctx.tocmgr.signalVectorLoadFinished(that.key);
				}
			}).then(
				function(responsejson) {
					if (responsejson) {
						if (responsejson.stats == null) {
							console.warn(`[WARN] null stats on '${that.key}' get stats request`);
							p_mapctx.tocmgr.signalVectorLoadFinished(that.key);
						} else {
							that.refresh(p_mapctx, {
								"reqid": responsejson.reqid,
								"nchunks": responsejson.stats[that.key]['nchunks'],
								"nvert": responsejson.stats[that.key]['nvert']
							});

							if (responsejson.stats[that.key]['gisid_field']) {
								that._gisid_field = responsejson.stats[that.key]['gisid_field'];
							}
							if (responsejson.stats[that.key]['accept_deletion']) {
								that._accept_deletion = responsejson.stats[that.key]['accept_deletion'];
							}							
						}
					}
				}
			).catch((error) => {
				// PARTIAL MissingFeat 0001
				console.error(`Impossible to fetch '${that.key}'`, error);
				p_mapctx.tocmgr.signalVectorLoadFinished(that.key);
				//this.doCancel();

			});	
	}

	* itemchunks(p_mapctxt, p_prep_data) {

		const reqid = p_prep_data["reqid"];
		const numchunks = p_prep_data["nchunks"];
		const nvert = p_prep_data["nvert"];

		/*
		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] Vector layer '${this.key}' , chunks:${numchunks}, size:${calc_chunksize}, rem:${remainder}`);
		}*/

		for (let i=1; i<=numchunks; i++) {

			yield [reqid, numchunks, nvert, i];

		}

	}	
	
	nextlayeritem() {

	}

	looplayeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_item_chunk_params) {

		const urlstr = this.getFeaturesURL(p_mapctxt, p_item_chunk_params);
		const that = this;

		const chunk_id = uuidv4();

		fetch(urlstr)
			.then((response) => {
				if (response.ok) {
					return response.json();
				}
				throw new Error(`Error fetching features chunk for layer '${that.key}'`);
			})
			.then(
				function(responsejson) {

					let tmpchkid;
					if (that.isCanceled()) {

						console.log(`${that.key} was canceled , stop loading ... `);

						if (that.featchunksloading[chunk_id] !== undefined) {
							delete that.featchunksloading[chunk_id];
						}
						for (tmpchkid in that.featchunksloading[chunk_id]) {
							if (this.featchunksloading.hasOwnProperty(tmpchkid)) {
								delete that.featchunksloading[tmpchkid];
							}
						}
						that.resetCanceled();
						return;
					}

					// chunk has become obsolete and was deleted from featchunksloading
					// by new drawing action
					if (that.featchunksloading[chunk_id] === undefined) {
						return;
					}

					// verificar campos ATTRS
					console.info(`[INFO] fetched ${responsejson.fcnt} risco feats on '${that.key}' layer from server`);
					
					try {
					
						let feat, path_levels, cnt = 0, skipped=0;
						for (let id in responsejson.cont) {

							feat = responsejson.cont[id];
							// path_levels = validateGeometry(feat.typ, feat);
							if (feat.crds === undefined || feat.crds == null) {
								if (GlobalConst.getDebug("RISCOFEATS")) {
									console.log(`[DBG:RISCOFEATS] null geom feat, id:${id} layer:${that.key}, beyond current graphic detail level, skipping ...`);
								}
								skipped++;
								continue;
							}

							path_levels = calcPathLevels(feat.crds); 

							// console.log("path_levels:", path_levels, "key:", that.key, feat.crds);

							// to terrain coords
							const terrain_coords = [];
							adaptCoords(path_levels, feat.crds, [responsejson.cenx, responsejson.ceny], responsejson.pxsz, terrain_coords)

							// console.log("terrain_coords:", terrain_coords, "key:", that.key);

							if (!that.isFeatureInsideFilter(feat.a)) {
								if (GlobalConst.getDebug("RISCOFEATS")) {
									console.log(`[DBG:RISCOFEATS] feat removed by filter func, id:${id} layer:${that.key}, skipping ...`);
								}
								skipped++;
								continue;
							}

							that._currFeatures.addfeature(that.key, terrain_coords, feat.a, that.geomtype, path_levels, id);

							cnt++;
						}

						if (responsejson.fcnt != cnt+skipped) {
							console.error(`risco feat.count mismatch, expected:${responsejson.fcnt}, got: ${cnt} + ${skipped} (skipped) on '${that.key}' layer`);
						}

					} catch(e) {
						console.error(e);
					} finally {

						if (that.featchunksloading[chunk_id] !== undefined) {

							if (GlobalConst.getDebug("VECTLOAD")) {
								console.log(`[DBG:VECTLOAD] '${that.key}', timing for '${chunk_id}': ${new Date().getTime() - that.featchunksloading[chunk_id]["ts"]}, reloaded: ${that.featchunksloading[chunk_id]["reloaded"]}`);
							}
			
							delete that.featchunksloading[chunk_id];

							if (Object.keys(that.featchunksloading).length == 0) {
								if (GlobalConst.getDebug("VECTLOAD")) {
									console.log(`[DBG:VECTLOAD] Finished loading'${that.key}'`);
								}
								that.resetCanceled(); 
								p_mapctxt.tocmgr.signalVectorLoadFinished(that.key);
							}
			
						}						
					}					
					
				}
			);		

		this.featchunksloading[chunk_id] = {
			"chunk_id": chunk_id,
			"ts": new Date().getTime(),
			"url": urlstr,
			"reloaded": false
		}

	};


}

