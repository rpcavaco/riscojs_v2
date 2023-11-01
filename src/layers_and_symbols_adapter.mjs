

import { CanvasGraticuleLayer, CanvasAGSQryLayer, CanvasRiscoFeatsLayer} from './canvas_vector.mjs';
import {CanvasWMSLayer, CanvasAGSMapLayer} from  './canvas_raster.mjs';
import {CanvasLineSymbol, CanvasPolygonSymbol, CanvasVertCross, CanvasCircle, CanvasDiamond, CanvasIcon, CanvasSquare} from './canvas_symbols.mjs';
import { AreaGridLayer, PointGridLayer } from './vectorlayers.mjs'


export const layerClassAdapter = {
	"canvas": {
		"graticule": CanvasGraticuleLayer,
		// "ptgrid": CanvasPointGridLayer,	
		// "areagrid": CanvasAreaGridLayer,	
		"ptgrid": PointGridLayer,	
		"areagrid": AreaGridLayer,		
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
		"diamond": CanvasDiamond,						
		"square": CanvasSquare,						
		"icon": CanvasIcon					
	}
};