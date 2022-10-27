import {GlobalConst} from './constants.js';
import {uuidv4} from './utils.mjs';
import { RemoteVectorLayer } from './layers.mjs';

function validateGeometry(p_geom_type, p_content_obj) {

	let ret_path_levels;

	if (p_content_obj.crds !== undefined && p_content_obj.crds != null) {
	
		if (p_content_obj.crds.length == undefined && p_content_obj.crds.length < 1) {
			return -1;
		}

		// validar geometria
		switch (p_geom_type) 
		{
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

export class RiscoFeatsLayer extends RemoteVectorLayer {

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
			console.log(`[DBG:RISCOFEATS] -- getFeaturesURL: '${ret}'`);
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
			.then(response => response.json())
			.then(
				function(responsejson) {

					console.log(responsejson);		
					
					that.refresh(p_mapctx, {
						"reqid": responsejson.reqid,
						"nchunks": responsejson.stats[that.key]['nchunks'],
						"nvert": responsejson.stats[that.key]['nvert']
					})

				}
			);	
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

	layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_item_chunk_params) {

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

					console.log(responsejson);

					// chunk has become obsolete and was deleted from featchunksloading
					// by new drawing action
					if (that.featchunksloading[chunk_id] === undefined) {
						return;
					}

					// verificar campos ATTRS

					let feat, path_levels;
					for (let id in responsejson.cont) {

						feat = responsejson.cont[id];
						path_levels = validateGeometry(feat.typ, feat);

						that.currFeatures.add(that.key, feat.crds, feat.a, path_levels, id);
						that.currFeatures.draw(p_mapctxt, p_terrain_env, p_scr_env, p_dims, that.key, id);
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

