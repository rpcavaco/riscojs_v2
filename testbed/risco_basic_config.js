var RISCOJS_BASIC_CFG = {
	
	"mapname": "dev_test",	
	"crs": 3763,
	"scale": 5000.0 , 
	"terrain_center": [-40094.0,164608.0],
	"togglable_tools": ["InfoTool"],
	"maxscaleview": {
		"scale": 30000,
		"terrain_center": [-41200.0,166000.0]
	},
	"querybox": {
		"show": true,
		"size": 320,
		"clrbtn_size": 80
	},
	"locquery": {
		"url": "https://loc.cm-porto.net/loc/c/lq",
		"zoomto": 500,
		"centerlinefeats": {
			"layerkey": "EV",
			"fieldname_topo": "cod_topo",
			"symb": { 
				"strokeStyle": "#d2133f7f",
				"lineWidth": 10
			}
		},
		"npolfeats": {
			"layerkey": "NPOLPROJ",
			"fieldname_topo": "cod_topo",
			"fieldname_npol": "n_policia",
			"symb": { 
				"strokeStyle": "#fc164c",
				"lineWidth": 4
			}
		}		
	},
	"geometry_service": {
		"type": "ARCGIS",
		"url": "https://servergeo.cm-porto.pt/arcgis/rest/services/Utilities/Geometry/GeometryServer/project?inSR=4326&outSR=3763&transformation=&transformForward=true&vertical=false&f=pjson"
	},

	"gpsposcontrol": {
		"symbwid": 24,
		"symb": "data:image/svg+xml;charset=utf-8,%3Csvg width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 xmlns=%22http://www.w3.org/2000/svg%22%3E %3Ccircle  fill=%22none%22 stroke=%22black%22 stroke-width=%221%22 cx=%2212%22 cy=%2216%22 r=%228%22/%3E %3Ccircle fill=%22black%22 stroke=%22black%22 stroke-width=%221%22 cx=%2212%22 cy=%2216%22 r=%222%22/%3E %3C/svg%3E"
	},

	"gpstrackcontrol": {
		"symbwid": 24,
		"symb": "data:image/svg+xml;charset=utf-8,%3Csvg width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 xmlns=%22http://www.w3.org/2000/svg%22%3E %3Ccircle  fill=%22none%22 stroke=%22black%22 stroke-width=%221%22 cx=%2212%22 cy=%2216%22 r=%228%22/%3E %3Ccircle fill=%22black%22 stroke=%22black%22 stroke-width=%221%22 cx=%2212%22 cy=%2216%22 r=%222%22/%3E %3C/svg%3E"
	}	

}
