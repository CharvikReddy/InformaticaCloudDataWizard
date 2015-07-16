/*
 *  Informatica Datawizard Widgets
 *  version: "1.0.1"
 */
var InfaWidgetGlobalization = InfaWidgetGlobalization || {};

InfaWidgetGlobalization.supportedLocales = ["en", "ja", "fr"];

InfaWidgetGlobalization.globalizeSupplemental = {
		"supplemental" : {
			"version" : {
				"_cldrVersion" : "25",
				"_number" : "$Revision: #3 $"
			},
			"numberingSystems": {
				"latn": {
			        "_digits": "0123456789",
			        "_type": "numeric"
			     }, 
			     "jpan": {
			        "_type": "algorithmic",
			        "_rules": "ja/SpelloutRules/spellout-cardinal"
			     },
			     "jpanfin": {
			        "_type": "algorithmic",
			        "_rules": "ja/SpelloutRules/spellout-cardinal-financial"
			     },
			},
			"likelySubtags" : {
				"en" : "en-Latn-US",
				"ja" : "ja-Jpan-JP",
				"fr" :"fr_Latn_FR"
			}
		}
}


InfaWidgetGlobalization.loadGlobalize = function() {
	Globalize.load(InfaWidgetGlobalization.globalizeSupplemental);
}

InfaWidgetGlobalization.loadGlobalizeWithFormats = function(formats) {
	var loadGlobalize = {};
	
	loadGlobalize["main"] = formats["main"];
	loadGlobalize["supplemental"] = InfaWidgetGlobalization.globalizeSupplemental["supplemental"];
	
	Globalize.load(loadGlobalize);
	
}

InfaWidgetGlobalization.normalizeLocale = function(locale) {

	var localeFound = false;

	if (locale) {
		if ($.inArray(locale, InfaWidgetGlobalization.supportedLocales) == -1) {
			if((locale.indexOf("-") != -1) || (locale.indexOf("_") != -1)) {
				var lArr = [];
				if ((locale.indexOf("-") != -1)) {
					lArr = locale.split("-");
				}
				if ((locale.indexOf("_") != -1)) {
					lArr = locale.split("_");
				}
				if (lArr.length > 0) {
					var pattern = new RegExp("^" + lArr[0], "i");
					for(var i=0;i<InfaWidgetGlobalization.supportedLocales.length;i++) {
						var l = InfaWidgetGlobalization.supportedLocales[i];
						if(pattern.test(l)) {
							localeFound = true;
							locale = l;
						}
					}
				}
			}
		} else {
			localeFound = true; 
		}

		if (! localeFound) {
			locale = "en";
		}
	}

	return locale;
}
