import {GlobalConst} from './constants.js';
import { RemoteVectorLayer } from './layers.mjs';


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

		https://loc.cm-porto.net/riscosrv/feats?map=loc&reqid=13d5e2fe-5569-11ed-b265-005056a2682e&lname=EDIFICADO&chunks=2&vertxcnt=9298&chunk=1&_ts=1666814531077
		
		/*
		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] Vector layer '${this.key}' , chunks:${numchunks}, size:${calc_chunksize}, rem:${remainder}`);
		}*/

		for (let i=0; i<numchunks; i++) {

			yield [reqid, numchunks, nvert, i];

		}

	}		

	layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_item_chunk_params) {

	



	};

	refreshitem(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_recvd_geomtype) {


	}	

}

