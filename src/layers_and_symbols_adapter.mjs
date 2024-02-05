

import { CanvasPointGridLayer, CanvasAreaGridLayer, CanvasGraticuleLayer, CanvasAGSQryLayer, CanvasRiscoFeatsLayer} from './canvas_vector.mjs';
import { CanvasWMSLayer, CanvasAGSMapLayer, CanvasAGSImgSrvLayer } from  './canvas_raster.mjs';
import { CanvasLineSymbol, CanvasPolygonSymbol, CanvasVertCross, CanvasConcentricCircles, CanvasCircle, CanvasDiamond, CanvasIcon, CanvasSquare, CanvasStar, CanvasRegPolygon } from './canvas_symbols.mjs';

export const layerClassAdapter = {
	"canvas": {
		"graticule": CanvasGraticuleLayer,
		"ptgrid": CanvasPointGridLayer,	
		"areagrid": CanvasAreaGridLayer,	
		"wms": CanvasWMSLayer,
		"ags_map": CanvasAGSMapLayer,
		"ags_qry": CanvasAGSQryLayer,
		"ags_img": CanvasAGSImgSrvLayer,
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
		"vertcross": CanvasVertCross,
		"polysymb": CanvasRegPolygon,		
	}
};