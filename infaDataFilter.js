/*
 *  Informatica Datawizard Widgets
 *  version: "1.0.1"
 */
(function ($) {

	$.widget("infa.dataFilter", {

		filterCount: 0,

		fldId: "infaDFFld_",

		operId: "infaDFOper_",

		valId: "infaDFVal_",

		fldTypeId: "infaDFFldType_",

		dFilterDivId: "infaDFDivId",

		dFilterAddId: "infaDFAddId",

		dFilterDiv: null,

		filterDLM: " AND ",

		fieldTypes: null,
		
		langData: null,

		operators: null,

		typeOperations: {
			"STRING": ["equals", "notEquals", "lessThan", "lessOrEquals", "greaterThan", "greaterOrEquals", "startsWith", "endsWith", "contains", "isNull", "isNotNull"],
			"BOOLEAN": ["equals", "notEquals", "isNull", "isNotNull"],
			"DATE": ["equals", "notEquals", "lessThan", "lessOrEquals", "greaterThan", "greaterOrEquals", "isNull", "isNotNull"],
			"DATETIME": ["equals", "notEquals", "lessThan", "lessOrEquals", "greaterThan", "greaterOrEquals", "isNull", "isNotNull"],
			"OTHER": ["equals", "notEquals", "lessThan", "lessOrEquals", "greaterThan", "greaterOrEquals", "isNull", "isNotNull"]
		},
		
		options: {
			fields: [],
			filters: "",
			locale: "en",
			i18nPath: "i18n"
		},

		sfTypes: ["string", "anytype", "textarea", "picklist", "reference", "url", "phone", "multipicklist", "encryptedstring", "email", "junctionidlist", "combobox"],
		
		_create: function() {
			var self = this;
			var options = self.options || {};
			
			InfaWidgetGlobalization.loadGlobalize();
			
			var locale = options.locale;
			
			var normalizedLocale = InfaWidgetGlobalization.normalizeLocale(options.locale);
			
			var localeData = InfaDataFilterLocale;
			
			if ( locale !== "en" && locale !== "en-US") {
				$.ajax({
					"async": false,
		            "url": options.i18nPath + "/bundle_dataFilter_" + locale + ".json",
		            "contentType": "application/json; charset=utf-8",
		            "dataType": "json"		            
				}).done(function(data){
					localeData = data;
				}).fail(function(){
					//we failed to load localedata fallback
					$.ajax({
						"async": false,
			            "url": options.i18nPath + "/bundle_dataFilter_" + normalizedLocale + ".json",
			            "contentType": "application/json; charset=utf-8",
			            "dataType": "json"		            
					}).done(function(data){
						localeData = data;
					}).fail(function(){
						//we failed to load localedata. fallback on the default english
						normalizedLocale = "en";
					});
					
				});
			} else {
				normalizedLocale = "en";
			}
			
			
			if (normalizedLocale !== "en") {
				var messages = {};
				messages[normalizedLocale] = localeData;
				Globalize.loadMessages(messages);
			} else {
				Globalize.loadMessages(localeData);
			}
			
			self.langData = Globalize(normalizedLocale);
			
			var templateOpts = {
					"dFilterDivId": self.dFilterDivId, 
					"dFilterAddId": self.dFilterAddId,
					"field": self.langData.formatMessage("field"),
					"operator": self.langData.formatMessage("operator"),
					"value": self.langData.formatMessage("value")
			}

			var outerDiv = InfaWidgets.Templates.dFilter(templateOpts);

			$(this.element).append(outerDiv);

			self.dFilterDiv = $("#" + self.dFilterDivId);

			if (self.dFilterDiv) {
				$(self.dFilterDiv).on("click", "[data-filter-del]", function(){
					self._removeFilter($(this));
				});

				$(self.dFilterDiv).on("change", "[data-filter-fld]", function(){
					self._handleFieldChange($(this));
				});

				$(self.dFilterDiv).on("change", "[data-filter-oper]", function(){
					self._handleOperChange($(this));
				});

				$(self.dFilterDiv).on("click", "[data-filter-add]", function(){
					self._addFilter();
				});

			}
			
			self.operators = {
				"equals": {"label": self.langData.formatMessage("equals"), "oper": "="},
				"notEquals": {"label": self.langData.formatMessage("notEquals"), "oper": "!="},
				"lessThan": {"label": self.langData.formatMessage("lessThan"), "oper": "<"},
				"lessOrEquals": {"label": self.langData.formatMessage("lessOrEquals"), "oper": "<="},
				"greaterThan": {"label": self.langData.formatMessage("greaterThan"), "oper": ">"},
				"greaterOrEquals": {"label": self.langData.formatMessage("greaterOrEquals"), "oper": ">="},
				"startsWith": {"label": self.langData.formatMessage("startsWith"), "oper": "REG_MATCH"},
				"endsWith": {"label": self.langData.formatMessage("endsWith"), "oper": "REG_MATCH"},
				"contains": {"label": self.langData.formatMessage("contains"), "oper": "REG_MATCH"},
				"isNull": {"label": self.langData.formatMessage("isNull"), "oper": "ISNULL"},
				"isNotNull": {"label": self.langData.formatMessage("isNotNull"), "oper": "IIF"}
			};

			self._buildFilterUI();

		},

		_buildFilterUI: function() {
			var self = this;
			var options = self.options || {};
			
			if (! self.fieldTypes) {
				self.fieldTypes = {};
			}

			//compute the fieldtypes array
			if (options.fields && options.fields.length > 0) {
				for (var i=0;i<options.fields.length;i++) {
					var data = options.fields[i];
					self.fieldTypes[data.name] = data.type;
				}


				if (options.filters && options.filters !== "" && options.filters !== "true") {
					//parse the widget filter input to build the UI
					self._parseBuildFilters(options.filters);

				} 
				
				//we could not build any filter row. show a default row 
				if (self.filterCount === 0) {
					var filterDiv = self._buildFilterDiv(self.filterCount, true);
					$(self.dFilterDiv).append(filterDiv);
				}
			}
		},
		
		/**
		 * Returns the fields value from the options
		 */
		fields: function() {
			var self = this;
			var options = self.options || {};
			
			return options.fields;
		},
		
		/**
		 * parse the input filters to build the UI
		 */
		_parseBuildFilters: function(filters) {
			var self = this;
			var fArr = filters.split(self.filterDLM);

			if (fArr && fArr.length > 0) {
				for (var i=0;i<fArr.length;i++) {
					var filter = fArr[i];
					var selFld;
					var selOper;
					var selVal;
					if (!(filter.match(/^ISNULL/) || filter.match(/^IIF/) || filter.match(/^REG_MATCH/))) {
						var arr = filter.split(" ");
						if (arr && arr.length > 2) {
							selFld = arr[0]; //field
							var operator = arr[1]; //operator
							selVal = arr[2]; //value

							if (arr.length > 2) {
								for (var j=3;j<arr.length;j++) {
									selVal = selVal + " " + arr[j];
								}
							}
							selOper = self._findNameForOper(operator, selVal);
							selVal = self._fixValueForDisplay(selFld, selOper, selVal);							

						}
					} else {
						if (filter.match(/^ISNULL/)) {
							selOper = "isNull";
							var regExp = /^ISNULL\((.*)\)/;
							var matches = regExp.exec(filter);
							if (matches && matches.length > 1) {
								selFld = matches[1];
							}
							selVal = '';
						} else if (filter.match(/^IIF/)) {
							var selOper = "isNotNull";
							var fieldPart = filter.split(",");
							if (fieldPart && fieldPart.length > 1) {
								var regExp = /ISNULL\((.*)\)/;
								var matches = regExp.exec(fieldPart[0]);
								if (matches && matches.length > 1) {
									selFld = matches[1];
								}
							}
							selVal = '';
						} else if (filter.match(/^REG_MATCH/)) {
							var arr = filter.split("(");
							if (arr && arr.length > 1) {
								var operator = 'REG_MATCH';
								var fieldValuePart = arr[1];
								var fieldValue = fieldValuePart.split(",");
								if (fieldValue && fieldValue.length > 1) {
									selFld = fieldValue[0];
									var val = fieldValue[1];
									selVal = $.trim(val.substring(0, val.length - 1));
								}								
								selOper = self._findNameForOper(operator, selVal);
								selVal = self._fixValueForDisplay(selFld, selOper, selVal);	
							}
						}
					}

					if (selFld && selOper) {
						//check to see if the condition field exists in field list
						var data = self.fieldTypes[selFld];
						
						if (data) {
							self.filterCount++;
							var renderAdd = false;
							if (i + 1 === fArr.length) renderAdd = true;
							var filterDiv = self._buildFilterDiv(self.filterCount, renderAdd, selFld, selOper, selVal);
							$(self.dFilterDiv).append(filterDiv);
						}
					}
				}
			}
		},
		
		fetchOperatorName: function(oper, value) {
			var self = this;
			
			return self._findNameForOper(oper, value);
		},

		/**
		 * Find the operator name to use in the filter UI 
		 */
		_findNameForOper: function(oper, value) {
			var self = this;
			for (var key in self.operators) {
				var data = self.operators[key];

				if (data) {
					if (oper === "<=" || oper === ">=") {
						if (oper === data.oper) {
							oper = key;
							break;
						}
					}
					else {
						if (self._startsWith(oper, data.oper)) {
							if (oper.match(/^REG_MATCH/)) {
								var found = false;
								if (value.match(/^'/)) {
									value = value.substring(1, value.length);
								}
								if (value.match(/'$/)) {
									value = value.substring(0, value.length-1);
								}

								if (key === "contains") {
									if ((self._startsWith(value, ".*")) && (self._endsWith(value, ".*"))) {
										found = true;
									}
									value.substring(0,1);
								} else if (key === "startsWith") {
									if ((self._startsWith(value, "^")) && (self._endsWith(value, ".*"))) {
										found = true;
									}
								} else if (key === "endsWith") {
									if ((self._startsWith(value, ".*")) && (self._endsWith(value, "$"))) {
										found = true;
									}
								}
								if (found) {
									oper = key;
									break;
								}
							} else {
								oper = key;
								break;
							}
						}
					}
				}
			}

			return oper;
		},

		_startsWith: function(str, prefix) {
			return str.lastIndexOf(prefix, 0) === 0;
		},

		_endsWith: function(str, suffix) {
			return str.indexOf(suffix, str.length - suffix.length) !== -1;
		},

		/**
		 * fix the input value for display
		 */
		_fixValueForDisplay: function(selFld, selOper, selVal) {
			var self = this;

			var type = self.fieldTypes[selFld];

			if (type) {

				//if string, can be quoted
				if ($.inArray(type.toLowerCase(), self.sfTypes) >= 0) {
					if (selVal.match(/^'/)) {
						selVal = selVal.substring(1, selVal.length);
					}
					if (selVal.match(/'$/)) {
						selVal = selVal.substring(0, selVal.length-1);
					}
					selVal = selVal.replace(/''/g, "'");
				}
			}
			
			if (selOper === "contains") {
				selVal = selVal.substring(2, selVal.length);
				selVal = selVal.substring(0, selVal.length-2);
			} else if (selOper === "startsWith") {
				selVal = selVal.substring(1, selVal.length);
				selVal = selVal.substring(0, selVal.length-2);
			} else if (selOper === "endsWith") {
				selVal = selVal.substring(2, selVal.length-1);
				selVal = selVal.substring(0, selVal.length);
			}

			return selVal;
		},
		
		listTypeOperations: function() {
			var self = this;
			
			return self.typeOperations;
		},
		
		fetchOperatorsList: function(dataType) {
			var self = this;
			
			return self._getOperatorsList(dataType);
		},

		/**
		 * Get the operations list for a data type
		 */
		_getOperatorsList: function(dataType) {

			var self = this;
			var result = [];

			if (dataType) {

				var opList;
				if (dataType.match(/^STRING$/i)) {
					opList = self.typeOperations["STRING"];
				} else if (dataType.match(/^BOOLEAN$/i)) {
					opList = self.typeOperations["BOOLEAN"];
				} else if (dataType.match(/^DATE$/i)) {
					opList = self.typeOperations["DATE"];
				} else if (dataType.match(/^DATETIME$/i)) {
					opList = self.typeOperations["DATETIME"];
				} else {
					opList = self.typeOperations["OTHER"];
				}

				if (opList) {           
					var opers = self.operators;
					for (var i=0;i<opList.length;i++) {
						var op = opList[i];
						var operator = opers[op];
						result.push({"value": op, "label": operator.label});
					}
				}

			}

			return result;
		},

		/**
		 * build a filter row with data
		 */
		_buildFilterDiv: function(fInd, renderAdd, selFld, selOper, selVal) {
			var self = this;
			var options = self.options || {};

			var fldId = self.fldId + fInd;
			var operId = self.operId + fInd;
			var valId = self.valId + fInd;
			var fldTypeId = self.fldTypeId + fInd;

			var firstField = options.fields[0];
			var fldType = firstField.type;
			if (selFld) {
				var type = self.fieldTypes[selFld];
				if (type) {
					fldType = type;
				}
			}

			var templateOpts = {};
			templateOpts["fieldId"] = fldId;
			templateOpts["operatorId"] = operId;
			templateOpts["valueId"] = valId;
			templateOpts["fldTypeId"] = fldTypeId;
			templateOpts["operators"] = self._getOperatorsList(fldType);
			templateOpts["fields"] = options.fields;
			templateOpts["fInd"] = fInd;
			templateOpts["selFldType"] = fldType.toLowerCase();
			templateOpts["selFld"] = selFld;
			templateOpts["selOper"] = selOper;
			if (selOper === "isNull" || selOper === "isNotNull") {
				templateOpts["selVal"] = self.langData.formatMessage("notApplicable");
				templateOpts["valDisabled"] = true;
			} else {
				templateOpts["selVal"] = selVal;
				templateOpts["valDisabled"] = false;
			}
			templateOpts["renderAdd"] = renderAdd;
			templateOpts["addLabel"] = self.langData.formatMessage("add");
			templateOpts["removeLabel"] = self.langData.formatMessage("remove");
			templateOpts["placeholder"] = self.langData.formatMessage("placeholder");
			templateOpts["selectField"] = self.langData.formatMessage("selectField");
			templateOpts["selectOperator"] = self.langData.formatMessage("selectOperator");
			return InfaWidgets.Templates.dFilterRow(templateOpts);
		},
		
		addFilter: function() {
			var self = this;
			self._addFilter();
			
		},

		/**
		 * handler for the add action
		 */
		_addFilter: function() {
			var self = this;
			if (self.dFilterDiv) {
				var addB = $(self.dFilterDiv).find("[data-filter-add]");
				if (addB) addB.remove();
				self.filterCount++;
				var filterDiv = self._buildFilterDiv(self.filterCount, true);
				$(self.dFilterDiv).append(filterDiv);
			}


		},

		/**
		 * handler for the remove action
		 */
		_removeFilter: function(filter) {
			var self = this;
			if (filter) {
				var fInd = $(filter).attr("data-filter-del");

				if (fInd) {
					var fl = "[data-filter=\"" + fInd + "\"]";
					if (self.dFilterDiv) {
						var $remDiv = $(self.dFilterDiv).find(fl);
						var $filters = $(self.dFilterDiv).find("[data-filter]");
						if ($remDiv) {
							if ($filters && $filters.length === 1) {

								//if removing the last filter, only perfrom resets 
								var $fieldVal = $("#" + self.fldId + fInd);
								var $operVal = $("#" + self.operId + fInd);
								var $inVal = $("#" + self.valId + fInd);
								if ($fieldVal && $operVal && $inVal) {
									$fieldVal.prop('selectedIndex',0);
									$operVal.prop('selectedIndex',0);
									$inVal.val("");
								}
							}
							else {
								var $addB = $remDiv.find("[data-filter-add]");
								$remDiv.remove();
								//removing a div having add button
								if ($addB) {
									var $remaining = $(self.dFilterDiv).find("[data-filter]");
									if ($remaining) {
										var last = $remaining[$remaining.length-1];
										if (last) {
											var $delB = $(last).find("[data-filter-del]");
											if ($delB) {
												var $newAdd = $addB.clone();
												$newAdd.insertAfter($delB);
											}
										}
									}

								}

							}							
						}
					}
				}
			}
		},

		/**
		 * return the data filters
		 */
		filters: function() {
			var self = this;
			var result = "";
			if (self.dFilterDiv) {
				var $filters = $(self.dFilterDiv).find("[data-filter]");

				if ($filters) {

					for(var i=0;i<$filters.length;i++) {
						var filter = $filters[i];
						var fInd = $(filter).data("filter");
						var $fieldVal = $("#" + self.fldId + fInd);
						var $operVal = $("#" + self.operId + fInd);
						var $inVal = $("#" + self.valId + fInd);

						if ($fieldVal && $operVal && $inVal) {
							var operVal = $operVal.val();
							var inVal = $inVal.val();
							var operator = self.operators[operVal];
							var fldVal = $fieldVal.val();
							if (fldVal && fldVal !== "-1" && operVal && operVal !== "-1") {
								if (operVal === "isNull" || operVal === "isNotNull") {
									if (result !== "") {
										result = result + self.filterDLM;
									}
									if (operVal === "isNull") {
										result = result + "ISNULL(" + fldVal + ")";
									} else if (operVal === "isNotNull") {
										result = result + "IIF(ISNULL(" + fldVal + "),FALSE,TRUE)";
									}
								} 
								else if (operVal === "startsWith" || operVal === "endsWith" || operVal === "contains") {
									if (inVal !== "") {
										if (result !== "") {
											result = result + self.filterDLM;
										}
										if (operVal === "startsWith") {
											inVal = "^" + inVal + ".*";
										} else if (operVal === "endsWith") {
											inVal = ".*" + inVal + "$";
										} else if (operVal === "contains") {
											inVal = ".*" + inVal + ".*";
										}

										inVal = self._quoteVal(inVal);
										result = result + "REG_MATCH(" + fldVal + ", " + inVal + ")";
									}
								} 
								else {
									if (inVal !== "") {
										if (result !== "") {
											result = result + self.filterDLM;
										}

										var type = self.fieldTypes[fldVal];

										if (type) {
											if ($.inArray(type.toLowerCase(), self.sfTypes) >= 0) {
												inVal = self._quoteVal(inVal);
											}
											if ((type.match(/^DATE$/i)) || (type.match(/^DATETIME$/i))) {
												//inVal = self._dateTimeFormat(type, inVal);
											}
										}

										result = result + fldVal + " " + operator.oper + " " + inVal;
									}

								}
							}

						}
					}
				}
			}

			if (result === "") {
				result = "true";
			}

			return result;
		},

		_quoteVal: function(value) {
			return "'" + value.replace(/'/g, "''") + "'";
		},


		_computeVal: function(type, value) {
			if (type.match(/^DATE$/i)) {
				return "to_date('" + value + "','YYYY-MM-DD')";
			} else if (type.match(/^DATETIME$/i)) {
				return "to_date('" + value + "','YYYY-MM-DD HH24:MI:SS')";
			}
		},
		
		/**
		 * handle field change to trigger operation list change
		 */
		_handleFieldChange: function(filter) {
			var self = this;

			if (filter) {
				var fInd = $(filter).attr("data-filter-fld");
				var fieldVal = $(filter).val();
				var type = $(filter).find(':selected').data("type");
				if (fInd && fieldVal && type) {
					var $operVal = $("#" + self.operId + fInd);
					var $inVal = $("#" + self.valId + fInd);
					//var $fldTypeVal = $("#" + self.fldTypeId + fInd);

					if ($operVal && $inVal) {

						/*$fldTypeVal.empty();
						$fldTypeVal.append("Type: " + type);*/
						$operVal.empty();
						var opsList = self._getOperatorsList(type);
						for (var i=0;i<opsList.length;i++) {
							var oper = opsList[i];
							var $opt = $("<option>", {"value": oper.value, "title": oper.label});
							$opt.append(oper.label);
							$operVal.append($opt);
						}
						$inVal.val("");
						$inVal.prop("disabled", false);
						$inVal.removeClass("infaPlaceHolder");
					}
				}
			}
		},

		/**
		 * handle operation change to update input display
		 */
		_handleOperChange: function(filter) {
			var self = this;

			if (filter) {
				var fInd = $(filter).attr("data-filter-oper");
				var operVal = $(filter).val();
				if (fInd && operVal) {
					var $inVal = $("#" + self.valId + fInd);

					if ($inVal) {
						$inVal.val("");
						if (operVal === "isNull" || operVal === "isNotNull") {
							$inVal.val(self.langData.formatMessage("notApplicable"));
							$inVal.addClass("infaPlaceHolder");
							$inVal.prop("disabled", true);
						}
						else {
							$inVal.prop("disabled", false);
							$inVal.removeClass("infaPlaceHolder");
						}
					} 
				}
			}
		},

		/**
		 * Refresh the filter with new data
		 */
		refresh: function(data) {
			var self = this;
			if (data) {
				var fields = data.fields;
				var filters = data.filters;

				if (fields && fields.length > 0) {
					self.options.fields = fields;
				}
				self.options.filters = filters;

				if (self.dFilterDiv) {
					var $existing = $(self.dFilterDiv).find("[data-filter]");

					if ($existing) {
						$existing.remove();
					}					

				}

				self._buildFilterUI();
			}
		},

		/**
		 * destroy method of the widget
		 */
		_destroy: function() {
			var self = this;

			$(this.element).off();

			self.filterCount = 0;

			self.fieldTypes = null;

			self.dFilterDiv = null;
			
			self.langData = null;
		}


	});

})(jQuery);;this["InfaWidgets"] = this["InfaWidgets"] || {};
this["InfaWidgets"]["Templates"] = this["InfaWidgets"]["Templates"] || {};

this["InfaWidgets"]["Templates"]["dFilter"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<div class=\"infaFilterDiv\">\r\n<div id=\""
    + escapeExpression(((helper = (helper = helpers.dFilterDivId || (depth0 != null ? depth0.dFilterDivId : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"dFilterDivId","hash":{},"data":data}) : helper)))
    + "\">\r\n<div class=\"infaFilterHdrCol infaFilterHeader\">\r\n	"
    + escapeExpression(((helper = (helper = helpers.field || (depth0 != null ? depth0.field : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"field","hash":{},"data":data}) : helper)))
    + "\r\n</div>\r\n<div class=\"infaFilterHdrCol infaFilterHeader\">\r\n	"
    + escapeExpression(((helper = (helper = helpers.operator || (depth0 != null ? depth0.operator : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"operator","hash":{},"data":data}) : helper)))
    + "\r\n</div>\r\n<div class=\"infaFilterHdrCol infaFilterHeader\">\r\n	"
    + escapeExpression(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"value","hash":{},"data":data}) : helper)))
    + "\r\n</div>\r\n</div>\r\n</div>";
},"useData":true});

this["InfaWidgets"]["Templates"]["dFilterRow"] = Handlebars.template({"1":function(depth0,helpers,partials,data,depths) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			<option value=\""
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + escapeExpression(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"label","hash":{},"data":data}) : helper)))
    + "\" data-type=\""
    + escapeExpression(((helper = (helper = helpers.type || (depth0 != null ? depth0.type : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"type","hash":{},"data":data}) : helper)))
    + "\" "
    + escapeExpression(((helpers.selected || (depth0 && depth0.selected) || helperMissing).call(depth0, (depth0 != null ? depth0.name : depth0), (depths[1] != null ? depths[1].selFld : depths[1]), {"name":"selected","hash":{},"data":data})))
    + ">"
    + escapeExpression(((helpers.selectLabel || (depth0 && depth0.selectLabel) || helperMissing).call(depth0, (depth0 != null ? depth0.label : depth0), 25, (depth0 != null ? depth0.type : depth0), {"name":"selectLabel","hash":{},"data":data})))
    + "</option>\r\n";
},"3":function(depth0,helpers,partials,data,depths) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "			<option value=\""
    + escapeExpression(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"value","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + escapeExpression(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"label","hash":{},"data":data}) : helper)))
    + "\" "
    + escapeExpression(((helpers.selected || (depth0 && depth0.selected) || helperMissing).call(depth0, (depth0 != null ? depth0.value : depth0), (depths[1] != null ? depths[1].selOper : depths[1]), {"name":"selected","hash":{},"data":data})))
    + ">"
    + escapeExpression(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"label","hash":{},"data":data}) : helper)))
    + "</option>\r\n";
},"5":function(depth0,helpers,partials,data) {
  return "infaFilterInputValDis";
  },"7":function(depth0,helpers,partials,data) {
  return "infaFilterInputVal";
  },"9":function(depth0,helpers,partials,data) {
  return "infaPlaceHolder";
  },"11":function(depth0,helpers,partials,data) {
  return "disabled";
  },"13":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "		<button type=\"button\" data-filter-add=\""
    + escapeExpression(((helper = (helper = helpers.fInd || (depth0 != null ? depth0.fInd : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fInd","hash":{},"data":data}) : helper)))
    + "\" title=\"Add Filter\" class=\"infaFilterBtn\">"
    + escapeExpression(((helper = (helper = helpers.addLabel || (depth0 != null ? depth0.addLabel : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"addLabel","hash":{},"data":data}) : helper)))
    + "</button>\r\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data,depths) {
  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "<div data-filter=\""
    + escapeExpression(((helper = (helper = helpers.fInd || (depth0 != null ? depth0.fInd : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fInd","hash":{},"data":data}) : helper)))
    + "\">\r\n<div class=\"infaFilterDivCol\">\r\n	<select id=\""
    + escapeExpression(((helper = (helper = helpers.fieldId || (depth0 != null ? depth0.fieldId : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fieldId","hash":{},"data":data}) : helper)))
    + "\" class=\"infaFilterInput\" data-filter-fld=\""
    + escapeExpression(((helper = (helper = helpers.fInd || (depth0 != null ? depth0.fInd : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fInd","hash":{},"data":data}) : helper)))
    + "\">\r\n		<option value=\"-1\" disabled selected class=\"infaPlaceHolder\">"
    + escapeExpression(((helper = (helper = helpers.selectField || (depth0 != null ? depth0.selectField : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"selectField","hash":{},"data":data}) : helper)))
    + "</option>\r\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.fields : depth0), {"name":"each","hash":{},"fn":this.program(1, data, depths),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "	</select>\r\n	<!--span id=\""
    + escapeExpression(((helper = (helper = helpers.fldTypeId || (depth0 != null ? depth0.fldTypeId : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fldTypeId","hash":{},"data":data}) : helper)))
    + "\" class=\"infaFilterType\">Type: "
    + escapeExpression(((helper = (helper = helpers.selFldType || (depth0 != null ? depth0.selFldType : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"selFldType","hash":{},"data":data}) : helper)))
    + "</span-->\r\n</div>\r\n<div class=\"infaFilterDivCol\">\r\n	<select id=\""
    + escapeExpression(((helper = (helper = helpers.operatorId || (depth0 != null ? depth0.operatorId : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"operatorId","hash":{},"data":data}) : helper)))
    + "\" class=\"infaFilterInput\" data-filter-oper=\""
    + escapeExpression(((helper = (helper = helpers.fInd || (depth0 != null ? depth0.fInd : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fInd","hash":{},"data":data}) : helper)))
    + "\">\r\n		<option value=\"-1\" selected class=\"infaPlaceHolder\">"
    + escapeExpression(((helper = (helper = helpers.selectOperator || (depth0 != null ? depth0.selectOperator : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"selectOperator","hash":{},"data":data}) : helper)))
    + "</option>\r\n";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.operators : depth0), {"name":"each","hash":{},"fn":this.program(3, data, depths),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "	</select>\r\n</div>\r\n<div class=\"infaFilterDivCol\">\r\n	<input type=\"text\" id=\""
    + escapeExpression(((helper = (helper = helpers.valueId || (depth0 != null ? depth0.valueId : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"valueId","hash":{},"data":data}) : helper)))
    + "\" class=\"infaFilterInput ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.valDisabled : depth0), {"name":"if","hash":{},"fn":this.program(5, data, depths),"inverse":this.program(7, data, depths),"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += " ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.valDisabled : depth0), {"name":"if","hash":{},"fn":this.program(9, data, depths),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += "\" value=\""
    + escapeExpression(((helper = (helper = helpers.selVal || (depth0 != null ? depth0.selVal : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"selVal","hash":{},"data":data}) : helper)))
    + "\" ";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.valDisabled : depth0), {"name":"if","hash":{},"fn":this.program(11, data, depths),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  buffer += " placeholder=\""
    + escapeExpression(((helper = (helper = helpers.placeholder || (depth0 != null ? depth0.placeholder : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"placeholder","hash":{},"data":data}) : helper)))
    + "\"/>\r\n</div>\r\n<div class=\"infaFilterAction\">\r\n	<button type=\"button\" data-filter-del=\""
    + escapeExpression(((helper = (helper = helpers.fInd || (depth0 != null ? depth0.fInd : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"fInd","hash":{},"data":data}) : helper)))
    + "\" title=\"Remove Filter\" class=\"infaFilterRemove infaFilterBtn\">"
    + escapeExpression(((helper = (helper = helpers.removeLabel || (depth0 != null ? depth0.removeLabel : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"removeLabel","hash":{},"data":data}) : helper)))
    + "</button>\r\n";
  stack1 = helpers['if'].call(depth0, (depth0 != null ? depth0.renderAdd : depth0), {"name":"if","hash":{},"fn":this.program(13, data, depths),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\r\n</div>";
},"useData":true,"useDepths":true});
