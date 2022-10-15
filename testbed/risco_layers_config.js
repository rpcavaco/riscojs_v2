var RISCOJS_LAYERS_CFG = {
	"lorder": ["carta_itineraria", "grat"],
	"layers": {
		"grat": {
			"type": "graticule",
			"separation": 100,
			"strokeStyle": "white",
			"lineWidth": 1
		},
		"orto2021": {
			"type": "wms",
			"reuseurl": true, 
			"url": "https://sigcrsprxy.cm-porto.pt/dgtwms/ortos2021",
			"layernames": "Ortos2021-RGB" 
		},
		"carta_itineraria": {
			"type": "wms",
			"reuseurl": true, 
			"url": "https://webservices.igeoe.pt/geoserver/cigeoe/carta_itineraria",

		}		

	}

}
