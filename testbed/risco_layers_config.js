var RISCOJS_LAYERS_CFG = {
	"lorder": ["enq_bw_porto", "grat"],
	"layers": {
		"grat": {
			"type": "graticulept",
			"separation": 100,
			"strokeStyle": "grey",
			"lineWidth": 1
		},
		"orto2021": {
			"type": "wms",
			"reuseurl": true, 
			"url": "http://localhost:9200/wms/ortos2021",
			"layernames": "Ortos2021-RGB"
			//"filter": "grayscale"
		},
		"enq_bw_porto": {
			"type": "ags_map",
			"url": "https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer",
			"layers": "show:11,16,17"
			//"filter": "grayscale"
		}		
		
		

	}

}
