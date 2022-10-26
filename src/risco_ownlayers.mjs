import {GlobalConst} from './constants.js';
import { RemoteVectorLayer } from './layers.mjs';
import { canvasLayerMixin } from './vectorlayers.mjs';


export class CanvasRiscoFeatsLayer extends canvasLayerMixin(RemoteVectorLayer) {

	url;     // https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer

	constructor() { 
		super();
		this.pendingChunks = [];
		this._servmetadata_docollect = false;
	}

	getStatsURL(p_mapctx) { //, opt_filter) {

		let sep, formatstr, center=[], dims=[];
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
		sp.set('wid', dims[0]);
		sp.set('hei', dims[1]);
		sp.set('pixsz', p_mapctx.getPixSize());
		sp.set('vizlrs',this.key);

		const ret = url.toString();		
		if (GlobalConst.getDebug("RISCOFEATS")) {
			console.log(`[DBG:RISCOFEATS] -- getStatsURL: '${ret}'`);
		}	

		return ret;
	}

	getFeaturesURL(p_mapctx, p_reqid, p_lname) { //, opt_filter) {

		let sep, ret = "";
		if (this.url.endsWith("/")) {
			sep = "";
		} else {
			sep = "/";
		}
		// TODO: verificar número de casas decimais
		
		const mapname = p_mapctx.cfgvar["basic"]["mapname"];
		const baseurl = `${this.url}${sep}feats`;

		const url = new URL(baseurl);		
		const sp = url.searchParams;

		sp.set('map', mapname);
		sp.set('reqid', p_reqid.toString());
		sp.set('lname',this.key);

		const [numchunks, numverts, pendingchunkidx] = this.pendingChunks.pop();

		/*
		if (this.pendingChunks.length > 0) {


			sp.set('chunks', numchunks.toString());
			sp.set('vertxcnt', numverts.toString());
			sp.set('chunk', pendingchunkidx.toString());
			
			formatstr = "{0}{1}feats?map={2}&reqid={3}&lname={4}&chunks={5}&vertxcnt={6}&chunk={7}";
			ret = String.format(formatstr, this.baseurl, sep, this.mapname, p_reqid, p_lname, chunknumbs[0], chunknumbs[1], chunknumbs[2]);
		} else {
			formatstr = "{0}{1}feats?map={2}&reqid={3}&lname={4}&chunks={5}&vertxcnt={6}";
			ret = String.format(formatstr, this.baseurl, sep, this.mapname, p_reqid, p_lname, chunknumbs[0], chunknumbs[1]);
		}		

		const ret = url.toString();		
		if (GlobalConst.getDebug("RISCOFEATS")) {
			console.log(`[DBG:RISCOFEATS] -- getFeaturesURL: '${ret}'`);
		}	
		*/

		return ret;
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	getStats(p_mapctx, p_terrain_env, p_lyr_order) {

		const url = this.buildQueryURL(p_mapctx, p_terrain_env, "INITCOUNT");
		// console.log("## GETSTATS buildQueryURL:", url);
		const that = this;

		fetch(url)
			.then(response => response.json())
			.then(
				function(responsejson) {
					that.draw2D(p_mapctx, responsejson.count, p_lyr_order);					
				}
			);	
	}

	* itemchunks(p_mapctxt, p_feat_count, p_terrain_env) {

		if (p_feat_count == 0) {
			console.log(`[WARN:AGSQRY] Empty feat set in layer '${this.key}', nothing to draw`);
			return;
		}

		if (p_feat_count == 1) {
			console.log(`[WARN:AGSQRY] QUASI Empty feat set in layer '${this.key}', 1 elem to draw`);
			return;
		}		

		let numchunks, remainder, calc_chunksize;

		if (p_feat_count > GlobalConst.MAXFEATCHUNKSIZE) {

			numchunks = Math.floor(p_feat_count / GlobalConst.MAXFEATCHUNKSIZE);
			calc_chunksize = p_feat_count / numchunks;
			remainder = p_feat_count % numchunks;

			while (calc_chunksize + remainder > GlobalConst.MAXFEATCHUNKSIZE) {
				numchunks++;
				calc_chunksize = Math.floor(p_feat_count / numchunks);
				remainder = p_feat_count % numchunks;
			}
		} else {
			numchunks = 1;
			calc_chunksize = p_feat_count;
			remainder = 0;
		}

		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] Vector layer '${this.key}' , chunks:${numchunks}, size:${calc_chunksize}, rem:${remainder}`);
		}

		for (let i=0; i<numchunks; i++) {

			if (i < numchunks-1) {
				yield [i*calc_chunksize, calc_chunksize];
			} else {
				// last chunk will fetch additional 'remainder' records, if remainder > 0
				yield [i*calc_chunksize, calc_chunksize + remainder];
			}
		}

	}		

	layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, firstrecid, reccount) {

		const urlstr = this.buildQueryURL(p_mapctxt, p_terrain_env, "GETCHUNK", firstrecid, reccount);
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

					// chunk has become obsolete and was deleted from featchunksloading
					// by new drawing action
					if (that.featchunksloading[chunk_id] === undefined) {
						return;
					}

					const esriGeomtype = responsejson.geometryType;
					const svcReference = responsejson.spatialReference.wkid;
					const crs = p_mapctxt.cfgvar["basic"]["crs"];

					const gfctx = p_mapctxt.renderingsmgr.getDrwCtx(that.canvasKey, '2d');
					gfctx.save();

					try {

						if (WKID_List[svcReference] != crs) {
							throw new Error(`'${that.key}', incoerence in crs - config:${crs}, ret.from service:${WKID_List[svcReference]} (WKID: ${svcReference})`);
						}

						switch (that.geomtype) {

							case "poly":

								gfctx.fillStyle = that.default_symbol.fillStyle;
								gfctx.strokeStyle = that.default_symbol.strokeStyle;
								gfctx.lineWidth = that.default_symbol.lineWidth;
			
								if (esriGeomtype != "esriGeometryPolygon") {
									throw new Error(`'${that.key}', incoerence in feat.types - config:${that.geomtype}, ret.from service:${esriGeomtype}`);
								}
								break;

							case "line":

								gfctx.strokeStyle = that.default_symbol.strokeStyle;
								gfctx.lineWidth = that.default_symbol.lineWidth;
			
								if (esriGeomtype != "esriGeometryPolyline") {
									throw new Error(`'${that.key}', incoerence in feat.types - config:${that.geomtype}, ret.from service:${esriGeomtype}`);
								}
								break;								

						}

						// verificar campos ATTRS

						for (const feat of responsejson.features) {
							that.refreshitem(p_mapctxt, gfctx, p_terrain_env, p_scr_env, p_dims, feat.geometry, feat.attributes, esriGeomtype);
						}

					} catch(e) {
						console.error(e);
					} finally {
						gfctx.restore();

						if (that.featchunksloading[chunk_id] !== undefined) {

							if (GlobalConst.getDebug("VECTLOAD")) {
								console.log(`[DBG:VECTLOAD] '${that.key}', timing for '${chunk_id}': ${new Date().getTime() - that.featchunksloading[chunk_id]["ts"]}, reloaded: ${that.featchunksloading[chunk_id]["reloaded"]}`);
							}
			
							delete that.featchunksloading[chunk_id];

							if (Object.keys(that.featchunksloading).length == 0) {
								if (GlobalConst.getDebug("VECTLOAD")) {
									console.log(`[DBG:VECTLOAD] Finished loading'${that.key}'`);
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


	};

	refreshitem(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_recvd_geomtype) {

		const pt=[];
		if (p_recvd_geomtype == "esriGeometryPolygon") {

			if (p_coords.rings.length > 0) {

				this.currFeatures.add(this.key, this.oidfldname, p_coords.rings, p_attrs);

				p_gfctx.beginPath();

				for (const ring of p_coords.rings) {
					for (let pti=0; pti<ring.length; pti++) {

						p_mapctxt.transformmgr.getRenderingCoordsPt(ring[pti], pt)

						if (pti == 0){
							p_gfctx.moveTo(...pt);
						} else {
							p_gfctx.lineTo(...pt);
						}
					}
					p_gfctx.closePath();
				}

				// p_gfctx.fillStyle = this.fillStyle;
				// p_gfctx.strokeStyle = this.strokeStyle;
				// p_gfctx.lineWidth = this.lineWidth;
				p_gfctx.fill();
				p_gfctx.stroke();	
				
//				console.log("<<<< fim >>>>>");


			}

		}

	}	

}

