

import {CanvasGraticuleLayer, CanvasPointGridLayer, CanvasAreaGridLayer, CanvasAGSQryLayer, CanvasRiscoFeatsLayer} from './canvas_vector.mjs';
import {CanvasWMSLayer, CanvasAGSMapLayer} from  './canvas_raster.mjs';
import {CanvasLineSymbol, CanvasPolygonSymbol, CanvasVertCross, CanvasCircle, CanvasDiamond} from './canvas_symbols.mjs';


export const layerClassAdapter = {
	"canvas": {
		"graticule": CanvasGraticuleLayer,
		"ptgrid": CanvasPointGridLayer,	
		"areagrid": CanvasAreaGridLayer,			
		"wms": CanvasWMSLayer,
		"ags_map": CanvasAGSMapLayer,
		"ags_qry": CanvasAGSQryLayer,
		"riscofeats": CanvasRiscoFeatsLayer
	}
};


export const symbClassAdapter = {
	"canvas": {
		"line": CanvasLineSymbol,
		"poly": CanvasPolygonSymbol,
		"vertcross": CanvasVertCross,
		"circle": CanvasCircle,
		"diamond": CanvasDiamond						
	}
};