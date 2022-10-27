

import {CanvasGraticuleLayer, CanvasGraticulePtsLayer, CanvasAGSQryLayer, CanvasRiscoFeatsLayer} from './canvas_vector.mjs';
import {CanvasWMSLayer, CanvasAGSMapLayer} from  './canvas_raster.mjs';
import {CanvasLineSymbol, CanvasPolygonSymbol} from './canvas_symbols.mjs';


export const layerClassAdapter = {
	"canvas": {
		"graticule": CanvasGraticuleLayer,
		"graticulept": CanvasGraticulePtsLayer,	
		"wms": CanvasWMSLayer,
		"ags_map": CanvasAGSMapLayer,
		"ags_qry": CanvasAGSQryLayer,
		"riscofeats": CanvasRiscoFeatsLayer
	}
};


export const symbClassAdapter = {
	"canvas": {
		"line": CanvasLineSymbol,
		"poly": CanvasPolygonSymbol	
	}
};