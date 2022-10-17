

import { VectorLayer } from './layers.mjs';
import { CanvasStrokeSymbol } from './canvas_symbols.mjs';

class CanvasVectorLayer extends VectorLayer {

	canvasKey = 'normal';
	// constructor(p_mapctxt) {
	//super(p_mapctxt);
	constructor() {
		super();
		this.default_stroke_symbol = new CanvasStrokeSymbol();
		// this.default_fill_symbol = null;
	}
}

export class CanvasGraticuleLayer extends CanvasVectorLayer {

	separation;

	constructor() {
		super();
	}

	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims) {

		let x, endlimit, crdlist = [], out_pt = [], crdlist_t;
		for (const mode of ['horiz', 'vert']) {

			if (mode == 'vert') {
				x = this.separation * Math.floor(p_terrain_env[0] / this.separation);
				endlimit = p_terrain_env[2];
			} else {
				x = this.separation * Math.floor(p_terrain_env[1] / this.separation);
				endlimit = p_terrain_env[3];
			}

			while (x <= endlimit) {

				x = x + this.separation;
				if (mode == 'vert') {
					crdlist.length = 0;
					crdlist.push(...[x, p_terrain_env[1], x, p_terrain_env[3]]);
				} else {
					crdlist.length = 0;
					crdlist.push(...[p_terrain_env[0], x, p_terrain_env[2], x]);
				}
				crdlist_t = []
				crdlist_t.length = crdlist.length;
				for (let i = 0; i < 2; i++) {
					p_mapctxt.transformmgr.getCanvasPt([crdlist[2 * i], crdlist[2 * i + 1]], out_pt)
					crdlist_t[2 * i] = out_pt[0];
					crdlist_t[2 * i + 1] = out_pt[1];
				}

				yield [crdlist_t, null];
			}

		}

	}

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_envkey, p_canvas_coords, p_attrs, p_lyrorder) {

		p_gfctx.beginPath();
		p_gfctx.moveTo(p_canvas_coords[0], p_canvas_coords[1]);
		p_gfctx.lineTo(p_canvas_coords[2], p_canvas_coords[3]);
		p_gfctx.stroke();

		return true;

	}
}

export class CanvasGraticulePtsLayer extends CanvasVectorLayer {

	separation;
	ptdim = 2;

	constructor() {
		super();
	}

	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims) {

		let out_pt = [];
		let x, xorig = this.separation * Math.floor(p_terrain_env[0] / this.separation);
		let x_lim = p_terrain_env[2];

		let y = this.separation * Math.floor(p_terrain_env[1] / this.separation);
		let y_lim = p_terrain_env[3];

		while (y <= y_lim) {

			y = y + this.separation;
			x = xorig;

			while (x <= x_lim) {

				x = x + this.separation;
				p_mapctxt.transformmgr.getCanvasPt([x, y], out_pt)
				yield [out_pt.slice(0), null];
			}
		}
	}

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_envkey, p_canvas_coords, p_attrs, p_lyrorder) {

		const sclval = p_mapctxt.getScale();
		const dim = this.ptdim * (10.0 / Math.log10(sclval));

		p_gfctx.beginPath();

		// horiz
		p_gfctx.moveTo(p_canvas_coords[0] - dim, p_canvas_coords[1]);
		p_gfctx.lineTo(p_canvas_coords[0] + dim, p_canvas_coords[1]);
		p_gfctx.stroke();

		p_gfctx.beginPath();

		// vert
		p_gfctx.moveTo(p_canvas_coords[0], p_canvas_coords[1] - dim);
		p_gfctx.lineTo(p_canvas_coords[0], p_canvas_coords[1] + dim);
		p_gfctx.stroke();

		return true;

	}
}


/*
https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer/



https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer/9/query?where=1%3D1&text=&objectIds=&time=&timeRelation=esriTimeRelationOverlaps&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&havingClause=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&returnExtentOnly=false&sqlFormat=none&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=html
*/

export class CanvasAGSFeatQueryLayer extends CanvasVectorLayer {

	url;     // https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer
	layerid; // 9
	fields = "objectid";
	precision = 3; 
	f = "json";
	
	constructor() { 
		super();
	}

	buildQueryURL(p_mapctxt, p_terrain_bounds, p_mode) {

		const teststr = `MapServer/${this.layerid}/query`;

		if (this.url.indexOf(teststr) < 0) {
			this.url = this.url.replace("/MapServer", teststr);
		}

		const url = new URL(this.url);		
		const sp = url.searchParams;
		const crs = p_mapctxt.cfgvar["basic"]["crs"];
		const bndstr = p_terrain_bounds.join(',');

		sp.set('geometry', bndstr);
		sp.set('geometryType', "esriGeometryEnvelope");
		sp.set('inSR', crs);
		sp.set('spatialRel', 'esriSpatialRelIntersects');
		sp.set('outFields', this.fields);

		switch(p_mode) {

			case "INITCOUNT":
				sp.set('returnGeometry', 'true');
				sp.set('returnIdsOnly', 'false');
				sp.set('returnCountOnly', 'false');
				sp.set('returnExtentOnly', 'false');
				break;
		
		}

		/*
		sp.set('returnGeometry', 'true');
		sp.set('returnIdsOnly', 'false');
		sp.set('returnCountOnly', 'false');
		sp.set('returnExtentOnly', 'false');
		sp.set('geometryPrecision', precision.toString());
		sp.set('outSR', crs);
		*/

		sp.set('f', 'json');

		const ret = url.toString();		
		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] buildGetMapURL: '${ret}'`);
		}	
		
		return ret; 
	}

	isInited() {
		// to be extended, if needed
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	initLayer(p_mapctx, p_lyr_order) {
		// to be extended, if needed
	}	
	
}

