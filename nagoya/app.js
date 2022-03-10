var breakpoint_width = 600;
var map = null;
var view = null;
var legend = null;
var current_field = null;
var left_layer = null;
var graphicsLayer = null;
var chart = null;

//configの読み込み
var json_url = "https://taka-github1.github.io/nies/nagoya/aplat_setting.json";
$.ajaxSetup({async: false});
$.getJSON(json_url, function(json) {
  config = json;
});
$.ajaxSetup({async: true});

var base_webmap_id = config.base_webmap_id;
//var base_webmap_id = "ce2dd3b7d9064d3f81eaa38621fe8e9d";  //NIES

var basemap_group_id = config.basemap_group_id;  //AGOL
//var basemap_group_id = "0a489e5adeab43e1be2d570ea3149af3";  //NIES

var default_extend = config.default_extend;

require([
  "esri/portal/Portal",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/Map",
  "esri/WebMap",
  "esri/Basemap",
  "esri/views/MapView",
  "esri/layers/TileLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Home",
  "esri/widgets/Swipe",
  "esri/widgets/Legend",
  "esri/widgets/Expand",
  "esri/widgets/BasemapGallery",
  "esri/widgets/Slider",
  "esri/geometry/Extent",
  "esri/renderers/Renderer",
  "esri/widgets/BasemapGallery/support/LocalBasemapsSource"
], function (Portal, OAuthInfo, identityManager, Map, WebMap, Basemap, MapView, TileLayer, FeatureLayer, GraphicsLayer, 
              Home, Swipe, Legend, Expand, BasemapGallery, Slider, Extent, Renderer, LocalBasemapsSource) {
  
  /*  開発中は認証なし
  var portalUrl =  "https://nies.maps.arcgis.com";

  var info = new OAuthInfo({
    appId: config.appId,
    popup: false
  });

  identityManager.registerOAuthInfos([info]);
  identityManager.getCredential(portalUrl);
  */
  
  initForm();
  
  map = new WebMap({
    portalItem: {
      id: base_webmap_id
    }
  });

  view = new MapView({
    container: "mapviewCanvas",
    map: map,
    zoom: 14,
    constraints: {
      minScale : 50000000,
      maxScale : 5000
    }
  });

  var shihyoLayer = null;

  var homeBtn = new Home({
    view: view
  });
  view.ui.add(homeBtn, "top-left");

  var basemapGallery = new BasemapGallery({
    view: view,
    source: {
      query: {
        id: basemap_group_id
      }
    },
    container: document.createElement("div")
  });

  var bgExpand = new Expand({
    view: view,
    content: basemapGallery
  });

  basemapGallery.watch("activeBasemap", function () {
    var mobileSize =
        view.heightBreakpoint === "xsmall" ||
        view.widthBreakpoint === "xsmall";

    if (mobileSize) {
      bgExpand.collapse();
    }
  });
  view.ui.add(bgExpand, "top-right");

  var legend = new Legend({
    view: view
  });

  var lgExpand = new Expand({
    view: view,
    content: legend,
    expanded: true,
    mode : "floating"
  });

  view.ui.add(lgExpand, "bottom-right");

  var yearSlider = new Slider({
    container: "yearselector",
    steps: 1,
    labelInputsEnabled: true,
    labelFormatFunction: function(value, type){
      return value + "年";
    },
    values: [ config.defalt_year ],
    visibleElements: {
      labels: true,
      rangeLabels: true
    }
  });

  map.when(function() {
    setForm(true);
    setFilter(false);
    draw_charts();
  });
  
  view.extent = default_extend;
  

  //イベント処理
  $('#helpbutton').click(function () {
    $('#helpDialog').fadeIn();
  });
  
  $('#agreebutton').click(function () {
    $(this).parents('#helpDialog').fadeOut();
  });
  
  $('#displayselector').on("calciteRadioGroupChange", function(event) { 
    if (event.target.value == "mapview") {
      $("#mapviewDiv").show();
      $("#graphviewDiv").hide();
      $("#map_observatory").show();
      $("#graph_observatory").hide();
    } else {
      $("#mapviewDiv").hide();
      $("#graphviewDiv").show();
      $("#map_observatory").hide();
      $("#graph_observatory").show();
    }
    setForm(false);
  });
  
  $('#shihyoselector').on("calciteSelectChange", function(event) {
    setForm(false);
    setFilter(true);
    draw_charts();
  });
  
  $('#kanshoselector').on("calciteRadioGroupChange", function(event) {
    setForm(false);
    setObservatoryselector();
    setFilter(true);
    draw_charts();
  });
  
  $('#prefectureselector').on("calciteSelectChange", function(event) {
    setObservatoryselector();
    setForm(false);
    setFilter(true);
    draw_charts();
  });

  $('#observatoryselector').on("calciteSelectChange", function(event) {
    setForm(false);
    setFilter(true);
    draw_charts(); 
  });

  yearSlider.on("thumb-change", function(event) {
    setFilter(false);
  });
  yearSlider.on("thumb-drag", function(event) {
    setFilter(false);
  });

  $('#monthselector').on("calciteSelectChange", function(event) {
    setForm(false);
    setFilter(false);
    draw_charts();
  });

  $('#csv_observatory').click(function() {
    download_csv(0);
  });

  $('#csv_maparea').click(function() {
    download_csv(1);
  });
  
  $('#map_observatory').click(function() {
    startMapDownload();
  });

  $('#graph_observatory').click(function() {
    startGraphDownload();
  });
  
  //サイドパネルの展開・折りたたみ処理
  $("#sideExpand").on("click", function(event) {
    var dispShowVW = "90vw";
    var dispHideVW = "50vw";
    if (window.innerWidth < breakpoint_width) {
      dispShowVW = "90vw";
      dispHideVW = "0vw";
    }
    
    if (event.target.icon == "chevrons-left") { //展開
      $("#sideExpand").attr("icon", "chevrons-right");
      $("#sideDiv").css('display','none'); 
      $("#displayDiv").css('width', dispShowVW);
    } else {  //折りたたみ
      $("#sideExpand").attr("icon", "chevrons-left");
      $("#sideDiv").css('display','block'); 
      $("#displayDiv").css('width', dispHideVW);
    } 
    draw_charts();
  });
  
  
  function initForm(){
    var selector = document.getElementById("shihyoselector");

    var shihyo = config.shihyo;
    var group = null;
    var group_title = "";
    for (var i=0;i<shihyo.length;i++) {
      var title = shihyo[i]["title"];
      var label = shihyo[i]["label"];
      var bunrui = shihyo[i]["bunrui"];
      
      if (bunrui != group_title) {
        var group = document.createElement("calcite-option-group");
        group.setAttribute('label', bunrui);
        group.innerHTML = bunrui;
        selector.appendChild(group);
        group_title = bunrui;
      }
      
      var option = document.createElement("calcite-option");
      option.setAttribute('value', title);
      option.innerHTML = label;
      
      if (i==0) {
        option.setAttribute('selected', true);
      }
      group.appendChild(option);
    }
    
    $("#shihyoselector").val(config.shihyo[0].title);
  }
  
  async function setForm(init_flg){
    var display = $('#displayselector').val();
    var month =  $('#monthselector').val();
    var shihyo = $('#shihyoselector').val();
    var bunrui = config.shihyo.find(v => v.title === shihyo).bunrui;
    
    if (display == "graphview") {
      $('#yearselector-label').addClass('hidden');
      $('#yearselectorDiv').addClass('hidden');
    } else {
      $('#yearselector-label').removeClass('hidden');
      $('#yearselectorDiv').removeClass('hidden');
    }
    
    if (bunrui == "年間値") {
      $('#monthselectorDiv').addClass('hidden');
    } else {
      $('#monthselectorDiv').removeClass('hidden');
    }
    
    var kansho = $('#kanshoselector').val();

    //レイヤーの初期化
    var layers = map.allLayers.items;
    for(let i = 0; i < layers.length; i++) {
      if (layers[i].type != "feature") {
        continue;
      }

      if (layers[i].title == (shihyo)) {
        shihyoLayer = layers[i];
        legend.layerInfos.layer = shihyoLayer;
        layers[i].visible = true;
      } else {
        layers[i].visible = false;
      }
    }


    var prefecture = $('#prefectureselector').val();
    var observatory =  $('#observatoryselector').val();
    var kansho =  $('#kanshoselector').val();

    let query = shihyoLayer.createQuery();

    var expression = "官署 = '" + kansho + "'";
    if (bunrui == "月別値") { 
      expression = expression + " AND 月 = " + month;
    }

    if (observatory != "全て"){
      query.where = expression +" AND 観測地点名 = '" + observatory + "'";
    } else if (prefecture != "全国") {
      query.where = expression +" AND 都道府県 = '" + prefecture + "'";
    } else {
      query.where = expression;
    }

    query.outFields = [
      "年"
    ];

    query.outStatistics = [
      {
        statisticType: "min",
        onStatisticField: "年",
        outStatisticFieldName: "最小年"
      },
      {
        statisticType: "max",
        onStatisticField: "年",
        outStatisticFieldName: "最大年"
      }  
    ];
    query.returnGeometry = false;

    var response = await shihyoLayer.queryFeatures(query);
    var features = response.features;
    var min_year = features[0].attributes["最小年"];
    var max_year = features[0].attributes["最大年"];

    yearSlider.min = min_year;
    yearSlider.max = max_year;

    if (!init_flg) {
      return;
    }

    query = shihyoLayer.createQuery();

    var expression = "官署 = '" + kansho + "'";
    if (bunrui == "月別値") { 
      expression = expression + " AND 月 = " + month;
    }

    query.where = expression;
    query.outFields = [
      "都道府県"
    ];
    query.orderByFields = "地点番号";
    query.groupByFieldsForStatistics = "都道府県";

    query.outStatistics = [
      {
        statisticType: "min",
        onStatisticField: "都道府県",
        outStatisticFieldName: "都道府県リスト"
      },
      {
        statisticType: "min",
        onStatisticField: "地点番号",
        outStatisticFieldName: "地点番号"
      }  
    ];
    query.returnGeometry = false;

    response = await shihyoLayer.queryFeatures(query);
    var features = response.features;
    var recordes = [];
    $('#prefectureselector > calcite-option').remove();
    const item = document.createElement("calcite-option");
    item.setAttribute("label", "全国");
    item.setAttribute("value", "全国");
    $('#prefectureselector').append(item);

    for(var i = 0; i< features.length; i++) {
      var area = features[i].attributes["都道府県リスト"];
      const item = document.createElement("calcite-option");
      item.setAttribute("label", area);
      item.setAttribute("value", area);
      $('#prefectureselector').append(item);
    }
    $('#prefectureselector').prop("selectedIndex", 0);
    setObservatoryselector(init_flg);
  }

  async function setObservatoryselector(init_flg) {

    var prefecture = $('#prefectureselector').val();
    var observatory = $('#observatoryselector').val();
    var shihyo = $('#shihyoselector').val();
    var bunrui = config.shihyo.find(v => v.title === shihyo).bunrui;
    var month =  $('#monthselector').val();
    
    var kansho =  $('#kanshoselector').val();

    let query = shihyoLayer.createQuery();

    var expression = "官署 = '" + kansho + "'";
    if (bunrui == "月別値") { 
      expression = expression + " AND 月 = " + month;
    }

    if (prefecture == "全国") {
      query.where = expression;
    } else {
      query.where = expression + " AND 都道府県= '" + prefecture + "'";
    }

    query.outFields = [
      "都道府県", "地点番号", "観測地点名"
    ];
    query.orderByFields = "地点番号";
    query.groupByFieldsForStatistics = ["地点番号", "観測地点名"];

    query.outStatistics = [
      {
        statisticType: "min",
        onStatisticField: "都道府県",
        outStatisticFieldName: "都道府県リスト"
      },
      {
        statisticType: "min",
        onStatisticField: "観測地点名",
        outStatisticFieldName: "観測地点名リスト"
      }  
    ];
    query.returnGeometry = false;

    $('#observatoryselector > calcite-option').remove();
    const item = document.createElement("calcite-option");
    item.setAttribute("label", "全て");
    item.setAttribute("value", "全て");
    item.setAttribute("selected", true);
    $('#observatoryselector').append(item);
    $('#observatoryselector').val("全て");
    
    var response = await shihyoLayer.queryFeatures(query);
    var features = response.features;
    var recordes = [];

    for(var i = 0; i< features.length; i++) {
      var area = features[i].attributes["観測地点名リスト"];
      const item = document.createElement("calcite-option");
      item.setAttribute("label", area);
      item.setAttribute("value", area);

      if (observatory == area) {
        item.setAttribute("selected", true);
      }
      $('#observatoryselector').append(item);
    }
  }

  function setFilter(zoom_flg) {
    var prefecture = $('#prefectureselector').val();
    var observatory =  $('#observatoryselector').val();
    var year = yearSlider.values[0];
    var month =  $('#monthselector').val();
    var kansho =  $('#kanshoselector').val();
    var shihyo = $('#shihyoselector').val();
    var bunrui = config.shihyo.find(v => v.title === shihyo).bunrui;
    
    shihyoLayer.definitionExpression = "";

    var expression = "官署 = '" + kansho + "'";
    expression = expression + " AND 年 = " + String(year);

    if (bunrui == "月別値") { 
      expression = expression + " AND 月 = " + month;
    }
    
    if (prefecture != "全国" && observatory != "全て"){
      shihyoLayer.definitionExpression = expression + " AND 都道府県 = '" + prefecture + "' AND 観測地点名 = '" + observatory + "'";

      if (zoom_flg){
        zoomToLayer();
      }
    } else if (observatory != "全て"){
      shihyoLayer.definitionExpression = expression + " AND 観測地点名 = '" + observatory + "'";

      if (zoom_flg){
        zoomToLayer();
      }
    } else if (prefecture != "全国") {
      shihyoLayer.definitionExpression = expression + " AND 都道府県 = '" + prefecture + "'";
      if (zoom_flg){
        zoomToLayer();
      }
    } else {
      shihyoLayer.definitionExpression = expression;
      if (zoom_flg){
        view.extent = default_extend;
      }
    }
    

    function zoomToLayer() {
      let opts = {
        duration: 2000
      };
      return shihyoLayer.queryExtent().then(function(response) {
        view.goTo(response.extent.clone().expand(1.2), opts)
          .catch(function(error){
          if (error.name != "AbortError"){
            console.error(error);
          }
        });
      });
    }
  }

  function draw_charts(observatory) {
    
    if (shihyoLayer == null) {
      return;
    }

    var shihyo = $('#shihyoselector').val();
    var bunrui = config.shihyo.find(v => v.title === shihyo).bunrui;
    var shihyotxt = $('#shihyoselector calcite-option:selected').text();
    var prefecture = $('#prefectureselector').val();

    if (observatory == undefined) {
      observatory =  $('#observatoryselector').val();
    }
    
    if (observatory == "全て") {
      $("#graphviewDisableDiv").show();
      $("#graphviewCanvas").hide();
      return;
    } else {
      $("#graphviewDisableDiv").hide();
      $("#graphviewCanvas").show();
    }

    var month =  $('#monthselector').val();
    var monthtxt = $('#monthselector calcite-option:selected').text();
    
    var kansho =  $('#kanshoselector').val();
    
    //1時間で始まる指標には先頭にFをつける
    var field = shihyo;
    var regex = new RegExp(/^1.*$/);
    if (regex.test(shihyo)) {
      field = "F" + shihyo;
    }

    //グラフ作成
    let query = shihyoLayer.createQuery();
    query.outFields = [
      "年", field
    ];
    query.orderByFields = "年";
    query.groupByFieldsForStatistics = "年";
    
    var chat_title = observatory + "観測所";
    chat_title = chat_title + "　" + shihyotxt;
    
    var expression = "官署 = '" + kansho + "' AND " + field + " <> " + String(32767);
    if (bunrui == "月別値") { 
      chat_title = chat_title + "　" + monthtxt;
      expression = expression + " AND 月 = " + month;
    }
    
    query.where = expression + " AND 観測地点名 = '" + observatory + "'";
    query.returnGeometry = false;

    shihyoLayer.queryFeatures(query)
      .then(function(response){ 
      var features = response.features;
      var labels = [];
      var datas = [];
      for(var i = 0; i< features.length; i++) {
        var year = features[i].attributes["年"];
        var value = features[i].attributes[field];

        labels.push(year);
        datas.push(Math.round(value * 100) / 100);
      }

      update_chart(chat_title, labels, datas);
      
      if (observatory != "全て"){
        $('#chartDiv').removeClass('hidden');
      } else {
        $('#chartDiv').addClass('hidden');
      }
    });
  }

  function update_chart(chat_title, labels, datas){

    var ctx = document.getElementById("graphviewCanvas").getContext('2d');
    
    if (chart != null) {
      chart.destroy();
    }

    var shihyo = $('#shihyoselector').val();
    var bunrui = config.shihyo.find(v => v.title === shihyo).bunrui;
    var shihyotxt = $('#shihyoselector calcite-option:selected').text();
    var prefecture = $('#prefectureselector').val();
    var observatory =  $('#observatoryselector').val();
    var month =  $('#monthselector').val();

    var chart_type = config["shihyo"].find(value => value.title == shihyo).chart;
    var borderColor = config["shihyo"].find(value => value.title == shihyo).borderColor;
    var backgroundColor = config["shihyo"].find(value => value.title == shihyo).backgroundColor;
    /*
    var borderColor = config["linechart_borderColor"];
    var backgroundColor = config["linechart_backgroundColor"];

    if (chart_type == "bar") {
      borderColor = config["barchart_borderColor"];
      backgroundColor = config["barchart_backgroundColor"];
    }
    */
    
    var title_fontSize = 24;
    var scales_fontSize = 16;
    
    if (window.innerWidth < breakpoint_width) {
      title_fontSize = 12;
      scales_fontSize = 9;
    }
    
    var datasets = [];
    datasets.push({
      data: datas,
      borderColor: borderColor,
      backgroundColor: backgroundColor,
      lineTension: 0,
      pointStyle: 'circle',
      borderWidth: 1,
      radius: 3,
      fill: false
    });

    var yLabel = shihyotxt;

    var xAxesMin = Math.floor(Math.min.apply(null, labels) / 10 * 10);
    var xAxesMax = Math.ceil(Math.max.apply(null, labels) / 10 * 10); 
    var yAxesMin = Math.floor(Math.min.apply(null, datas) - 1);
    if (chart_type == "bar") {
      yAxesMin = 0;
    }
    var yAxesMax = Math.ceil(Math.max.apply(null, datas) + 1);
    
    chart = new Chart(ctx, {
      type: chart_type,
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        title: {
          display: true,
          fontSize: title_fontSize,
          text: chat_title
        },         
        layout: {
          padding: {
            left: 0,
            right: 0,
            top: 0
          }
        },
        legend: {
          display: false,
          position: 'right',
          labels: {
            boxWidth: 20,
            usePointStyle: true,
            padding: 10
          }
        },
        scales: {
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: '観測年',
              fontSize: scales_fontSize
            },
            ticks: {
              autoSkip: false,
              min: xAxesMin,
              max: xAxesMax,
              //stepSize: 5,
              callback: function(value, index, values){
                if (value%5==0){
                  return  value + "年";  
                } else {
                  return "";
                }
              }
            }
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: yLabel,
              fontSize: scales_fontSize
            },
            ticks: {
              min: yAxesMin,
              max: yAxesMax,
              userCallback: function(label, index, labels) {
                if (Math.floor(label) === label) {
                  return label;
                }
              }
            }
          }]
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }


  function download_csv(flg) {
    var shihyo = $('#shihyoselector').val();
    var bunrui = config.shihyo.find(v => v.title === shihyo).bunrui;
    var shihyotxt = $('#shihyoselector calcite-option:selected').text();
    var prefecture = $('#prefectureselector').val();
    var observatory =  $('#observatoryselector').val();
    var year = yearSlider.values[0];
    var month =  $('#monthselector').val();
    var kansho =  $('#kanshoselector').val(); 

    //1時間で始まる指標には先頭にFをつける
    var regex = new RegExp(/^1.*$/);
    if (regex.test(shihyo)) {
      shihyo = "F" + shihyo;
    }

    var fields = ["地点番号", "都道府県", "観測地点名", "緯度", "経度", "年", shihyo];
    if (bunrui == "月別値") {
      fields = ["地点番号", "都道府県", "観測地点名", "緯度", "経度", "年", "月", shihyo];
    }

    var query = shihyoLayer.createQuery();

    var expression = "官署 = '" + kansho + "'";
    
    if (flg == 0) {
      if (prefecture != "全国" && observatory != "全て"){
        query.where = expression + " AND 都道府県 = '" + prefecture + "' AND 観測地点名 = '" + observatory + "'";
        shihyotxt = shihyotxt + "_" + observatory;
      } else if (observatory != "全て"){
        query.where = expression + " AND 観測地点名 = '" + observatory + "'";
        shihyotxt = shihyotxt + "_" + observatory;
      } else if (prefecture != "全国") {
        query.where = expression + " AND 都道府県 = '" + prefecture + "'";
        shihyotxt = shihyotxt + "_" + prefecture;
      } else {
        query.where = expression;
        shihyotxt = shihyotxt + "_全国";
      }
    } else {
      query.geometry = view.extent;
      shihyotxt = shihyotxt + "_マップ範囲のみ";
    }

    query.outFields = fields;

    query.orderByFields = "地点番号,年";
    if (bunrui == "月別値") {
      query.orderByFields = "地点番号,年,月";
    }

    query.returnGeometry = false;
    query.maxRecordCountFactor = 10;

    var records = [];

    shihyoLayer.queryFeatures(query)
      .then(function(response){
      var features = response.features;

      for (let i = 0; i < features.length; ++i) {
        var att = features[i].attributes;

        var record = [];
        for (let j = 0; j < fields.length; ++j) {
          record.push(att[fields[j]]);
        }
        records.push(record);
      }

      startCsvDownload(shihyotxt, fields, records);
    });


    function startCsvDownload(shihyo, fields, records) {
      const filename = kansho + "_" + shihyo + '.csv';

      var csv_text = fields.join(',') + "\r\n";

      for (let i = 0; i < records.length; ++i) {
        for (let j = 0; j < records[i].length; ++j) {
          csv_text = csv_text + records[i][j] + ",";
        }
        csv_text = csv_text + "\r\n";
      }
      
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const blob = new Blob([bom, csv_text], { type: 'text/csv'});
      
      if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, filename);
      } else {
        const url = (window.URL || window.webkitURL).createObjectURL(blob);
        const download = document.createElement('a');
        download.href = url;
        download.download = filename;
        download.click();
        (window.URL || window.webkitURL).revokeObjectURL(url);
      }
    }
  }

  async function startMapDownload() {
    var prefecture = $('#prefectureselector').val();
    var observatory =  $('#observatoryselector').val();
    var year = yearSlider.values[0];
    var month =  $('#monthselector').val();
    var kansho =  $('#kanshoselector').val();
    var shihyo = $('#shihyoselector').val();
    var bunrui = config.shihyo.find(v => v.title === shihyo).bunrui;
    var shihyotxt = $('#shihyoselector calcite-option:selected').text();
    
    var titleHeight = 60;
    
    var mapScreenshot = await view.takeScreenshot();
    var mapImg = new Image();
    mapImg.src = mapScreenshot.dataUrl;
    await mapImg.onload;
    var legendImgUrl = await domtoimage.toPng($(".esri-legend")[0]);
    const legendImg = new Image();
    legendImg.src = legendImgUrl;
    await legendImg.onload;

    var export_canvas = document.getElementById('export_canvas');
    export_canvas.width = mapImg.width;
    export_canvas.height = mapImg.height + 60;
    const ctx = export_canvas.getContext("2d");
    

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, export_canvas.width, export_canvas.height);
    
    var legendDw = 150;
    var legendDh = 200;
    var legendDx = export_canvas.width - legendDw - 2;
    var legendDy = export_canvas.height - legendDh - 2;
    
    ctx.drawImage(mapImg, 0, 0, mapImg.width, mapImg.height, 0,  titleHeight, mapImg.width, mapImg.height);
    ctx.drawImage(legendImg, 0, 0, legendImg.width, legendImg.height, legendDx, legendDy, legendDw, legendDh);

    var export_text = shihyotxt + " ";
    if (bunrui == "年間値") {
      export_text += year + "年観測";
    } else {
      export_text += year + "年" + month + "月観測";
    }
    
    ctx.fillStyle = "black";
    ctx.font = "24px serif";
    
    if (window.innerWidth < breakpoint_width) {
    ctx.font = "12px serif";
    }
    
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(export_text, 10, 10);

    var a = document.createElement('a');
    a.href = export_canvas.toDataURL();
    a.download = shihyotxt + '.png';
    a.click();
  }

  function startGraphDownload() {
    var shihyotxt = $('#shihyoselector calcite-option:selected').text();
    var observatory =  $('#observatoryselector').val();
    
    if (observatory == "全て") {
      alert("観測所が選択されていません");
      return;
    }

    var ctx = document.getElementById("graphviewCanvas");
    var a = document.createElement('a');
    a.href = ctx.toDataURL();
    a.download = shihyotxt + '.png';
    a.click();
  }
});
