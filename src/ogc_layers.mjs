import { GlobalConst } from './constants.js';
import { RemoteVectorLayer } from './layers.mjs';
import { uuidv4 } from './utils.mjs';

export class JSON_FG_Layer extends RemoteVectorLayer {

	url;
	layername;
	maxchunksize;

	constructor() { 
		super();
	}

	getBaseURL(p_mapctx) { //, opt_filter) {

		if (this.url == null || this.url.length < 1) {
			throw new Error("Class JSON_FG_Layer, null or empty p_metadata_or_root_url");
		}

		if (this.url.endsWith('/items') || this.url.indexOf('/collections') >= 0) {
			throw new Error("Class JSON_FG_Layer, 'url' config parameter must not terminate with '/items' and either should not contain 'collections'");
		}		

		if (this.url.indexOf('?f=') >= 0) {
			throw new Error("Class JSON_FG_Layer, 'url' config parameter must not contain 'f' parameter");
		}			

		let sep, center=[], dims=[];
		if (this.url.endsWith("/")) {
			sep = "";
		} else {
			sep = "/";
		}
		
		// p_mapctx.transformmgr.getCenter(center);
		// p_mapctx.getCanvasDims(dims);
		
		const baseurl = `${this.url}${sep}collections/${this.layername}`;

		const url = new URL(baseurl);		
		// const sp = url.searchParams;

		// sp.set('map', mapname);
		// sp.set('cenx', center[0]);
		// sp.set('ceny', center[1]);
		// sp.set('wid', dims[0] *  p_mapctx.getPixSize());
		// sp.set('hei', dims[1] *  p_mapctx.getPixSize());
		// sp.set('pixsz', p_mapctx.getPixSize());
		// sp.set('vizlrs',this.key);

		const ret = url.toString();		
		if (GlobalConst.getDebug("JSONFG")) {
			console.log(`[DBG:JSONFG] -- getStatsURL: '${ret}'`);
		}	

		return ret;
	}

	buildQueryURL(p_mapctxt, p_terrain_bounds, p_mode, p_firstrecid, p_reccount) {

		const teststr = `/items`;

		let url_str = this.getBaseURL(p_mapctxt);

		if (url_str.indexOf(teststr) < 0) {
			if (url_str.endsWith("/")) {
				url_str = url_str + "items";
			} else {
				url_str = url_str + teststr;
			}
		}

		const url = new URL(url_str);		
		const sp = url.searchParams;
		const crs = p_mapctxt.cfgvar["basic"]["crs"];
		const bndstr = p_terrain_bounds.join(',');

		sp.set('bbox', bndstr);
		sp.set('bbox-crs', 'http://www.opengis.net/def/crs/EPSG/0/' + crs);
		sp.set('crs', 'http://www.opengis.net/def/crs/EPSG/0/' + crs);

		switch(p_mode) {

			// case "INITCOUNT":

				// nothing to add
				
				// break;

			case "GETCHUNK":

				sp.set('offset',  p_firstrecid.toString());
				sp.set('limit', p_reccount.toString());
				 
				break;
					
		}

		sp.set('f', 'jsonfg');

		const ret = url.toString();		
		if (GlobalConst.getDebug("JSONFG")) {
			console.log(`[DBG:JSONFG] -- '${p_mode}' -- buildGetMapURL: '${ret}'`);
		}	
		
		return ret; 
	}

	initLayer(p_mapctx) {

		if (GlobalConst.getDebug("JSONFG")) {
			console.log(`[DBG:JSONFG] Layer '${this.key}' is in INIT`);
		}
		
		//this._servmetadata = {};
		this._metadata_or_root_url = this.getBaseURL(p_mapctx);
		const crs = p_mapctx.cfgvar["basic"]["crs"];
		const crsURL = `http://www.opengis.net/def/crs/EPSG/0/${crs}`

		// const bounds = [], dims=[];
		// p_mapctx.getMapBounds(bounds);
		// const cfg = p_mapctx.cfgvar["basic"]; 
		// p_mapctx.getCanvasDims(dims);

		
		const that = this;

		fetch(this._metadata_or_root_url.toString())
			.then(response => {
				if (response.ok) {
					return response.json();
				} else {
					console.error(`Impossible to fetch '${that.key}', response error`);
					p_mapctx.tocmgr.signalVectorLoadFinished(that.key);
				}
			}).then(
				function(responsejson) {

					if (GlobalConst.getDebug("JSONFG")) {
						console.log(`[DBG:JSONFG] Layer '${that.key}' metadata arrived, viability check starting`);
					}

					if (responsejson.id != that.layername) {
						throw new Error(`JSON-FG layer '${that.key}': internal layer id '${responsejson.id}' != layername cfg parameter '${that.layername}'`);
					}

					let crs_found = false;
					for (let crsEntry of responsejson.crs) {
						if (crsEntry == crsURL) {
							crs_found = true;
							break;
						}
					}

					if (!crs_found) {
						throw new Error(`JSON-FG layer '${that.key}', id '${responsejson.id}' has no output in map CRS`);
					}

					if (responsejson.itemType != 'feature') {
						throw new Error(`JSON-FG layer '${that.key}', id '${responsejson.id}' itemType is not 'feature`);
					}	
					
					// this._servmetadata["itemCount"] = responsejson.itemCount;

					// TODO - no metadata reporting, this is just hardcoded
					// that._servmetadata_report_completed = true;

					if (responsejson.itemCount > 0) {

						that.refresh(p_mapctx, {
							"itemCount": responsejson.itemCount
						});

					} else {

						p_mapctx.tocmgr.signalVectorLoadFinished(that.key);

					}	

			
				}
			).catch((error) => {
				console.error(`Impossible to fetch '${that.key}'`, error);
				p_mapctx.tocmgr.signalVectorLoadFinished(that.key);
				//this.doCancel();

			});	

	}	

	* itemchunks(p_mapctxt, p_prep_data) {

		if (p_prep_data == null) {
			throw new Error("null prep_data in itemchunks");
		}

		const feat_count = p_prep_data["itemCount"]

		if (feat_count == 0) {
			console.log(`[WARN:JSONFG] Empty feat set in layer '${this.key}', nothing to draw`);
			return;
		}

		if (feat_count == 1) {
			console.log(`[WARN:JSONFG] QUASI Empty feat set in layer '${this.key}', 1 elem to draw`);
			return;
		}		

		let numchunks, remainder, calc_chunksize;

		let val_maxchunksize;
		if (this.maxchunksize > 2) {
			val_maxchunksize = Math.min(this.maxchunksize, GlobalConst.MAXFEATCHUNKSIZE);
		} else {
			val_maxchunksize = GlobalConst.MAXFEATCHUNKSIZE;
		}

		if (feat_count > val_maxchunksize) {

			numchunks = Math.floor(feat_count / val_maxchunksize);
			calc_chunksize = feat_count / numchunks;
			remainder = feat_count % numchunks;

			while (calc_chunksize + remainder > val_maxchunksize) {
				numchunks++;
				calc_chunksize = Math.floor(feat_count / numchunks);
				remainder = feat_count % numchunks;
			}
		} else {
			numchunks = 1;
			calc_chunksize = feat_count;
			remainder = 0;
		}

		if (GlobalConst.getDebug("JSONFG")) {
			console.log(`[DBG:JSONFG] Vector layer '${this.key}' , chunks:${numchunks}, size:${calc_chunksize}, rem:${remainder}`);
		}

		for (let i=0; i<numchunks; i++) {

			if (i < numchunks-1) {
				yield {
					"offset": i*calc_chunksize, 
					"limit": calc_chunksize
				};
			} else {
				// last chunk will fetch additional 'remainder' records, if remainder > 0
				yield {
					"offset": i*calc_chunksize, 
					"limit": calc_chunksize + remainder
				};

			}
		}

	}		

	looplayeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_item_chunks_params) {

		const firstrecid = p_item_chunks_params["offset"] 
		const reccount = p_item_chunks_params["limit"] 
		
		const urlstr = this.buildQueryURL(p_mapctxt, p_terrain_env, "GETCHUNK", firstrecid, reccount);
		const that = this;

		const chunk_id = uuidv4();
		const crs = p_mapctxt.cfgvar["basic"]["crs"];		

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

					const geometryDimension = responsejson.geometryDimension;
					const coordRefSys = responsejson.coordRefSys;
					const path_levels = geometryDimension + 1;

					try {

						if (coordRefSys != `[EPSG:${crs}]`) {
							throw new Error(`'${that.key}', incoerence in crs - config:${crs}, ret.from service:${coordRefSys}`);
						}						
						// verificar campos ATTRS

						let id, cnt = 0, skipped=0;
						for (const feat of responsejson.features) {


							if (!that.isFeatureInsideFilter(feat.attributes)) {
								continue;
							}

							if (!that.isFeatureInsideFilter(feat.a)) {
								if (GlobalConst.getDebug("JSONFG")) {
									console.log(`[DBG:JSONFG] feat removed by filter func, id:${id} layer:${that.key}, skipping ...`);
								}
								skipped++;
								continue;
							}	
							
							id = that._currFeatures.addfeature(that.key, [feat.place.coordinates], feat.properties, that.geomtype, path_levels, feat.id);
							// If feature still exists  between cleanups that's because it might not have been properly garbage collected
							// If exists, let's not try to draw it, id is null
							/*if (id) {
								that._currFeatures.featuredraw(that.key, id, null, null, null, p_terrain_env);
							}*/
							cnt++;
						}

						if (responsejson.numberReturned != cnt+skipped) {
							console.error(`JSON-FG feat.count mismatch, expected:${responsejson.numberReturned}, got: ${cnt} + ${skipped} (skipped) on '${that.key}' layer`);
						}							
						

					} catch(e) {

						console.error(e);
						
					} finally {

						if (that.featchunksloading[chunk_id] !== undefined) {

							if (GlobalConst.getDebug("JSONFG")) {
								console.log(`[DBG:JSONFG] '${that.key}', timing for '${chunk_id}': ${new Date().getTime() - that.featchunksloading[chunk_id]["ts"]}, reloaded: ${that.featchunksloading[chunk_id]["reloaded"]}`);
							}
			
							delete that.featchunksloading[chunk_id];

							if (Object.keys(that.featchunksloading).length == 0) {
								if (GlobalConst.getDebug("JSONFG")) {
									console.log(`[DBG:JSONFG] Finished loading'${that.key}'`);
								}

								p_mapctxt.tocmgr.signalVectorLoadFinished(that.key);
							}
			
						}						
					}
								
				}
			).catch((e) => {
				console.error(e);
			});	

		this.featchunksloading[chunk_id] = {
			"chunk_id": chunk_id,
			"ts": new Date().getTime(),
			"url": urlstr,
			"reloaded": false
		}

	}	
	
}