

import { CanvasPointGridLayer, CanvasAreaGridLayer, CanvasGraticuleLayer, CanvasAGSQryLayer, CanvasRiscoFeatsLayer} from './canvas_vector.mjs';
import { CanvasWMSLayer, CanvasAGSMapLayer} from  './canvas_raster.mjs';
import { CanvasLineSymbol, CanvasPolygonSymbol, CanvasVertCross, CanvasConcentricCircles, CanvasCircle, CanvasDiamond, CanvasIcon, CanvasSquare, CanvasStar } from './canvas_symbols.mjs';

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
		"circle": CanvasCircle,
		"conc_circles": CanvasConcentricCircles,
		"diamond": CanvasDiamond,						
		"icon": CanvasIcon,				
		"line": CanvasLineSymbol,
		"poly": CanvasPolygonSymbol,
		"square": CanvasSquare,						
		"star": CanvasStar,
		"vertcross": CanvasVertCross
	}
};