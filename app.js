var map = null;
var view = null;
var legend = null;
var current_field = null;
var left_layer = null;
var graphicsLayer = null;
var chart = null;

var base_webmap_id = "ce2dd3b7d9064d3f81eaa38621fe8e9d";  //NIES

var basemap_group_id = "0a489e5adeab43e1be2d570ea3149af3";  //NIES

var default_extend = {
  xmin: 126.2331,
  ymin: 31.367,
  xmax: 151.5675,
  ymax: 44.3821
}

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
  
  var portalUrl =  "https://nies.maps.arcgis.com";

  var info = new OAuthInfo({
    appId: "QUUUOLXshMCe9OSp",
    popup: false
  });

  identityManager.registerOAuthInfos([info]);
  identityManager.getCredential(portalUrl);
  
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
    values: [ 2019 ],
    visibleElements: {
      labels: true,
      rangeLabels: true
    }
  });

  view.when(function() {
    setForm(true);
    setFilter(false);
    draw_charts();
  });
  
  view.extent = default_extend;


  //イベント処理
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


  function setForm(init_flg){
    var display = $('#displayselector').val();
    var bunrui = $('#shihyoselector')[0].selectedOption.parentElement.label;
    var shihyo = $('#shihyoselector').val();
    var month =  $('#monthselector').val();

    if (display == "graphview") {
      $('#yearselectorDiv').addClass('hidden');
    } else {
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

    shihyoLayer.queryFeatures(query)
      .then(function(response){

      var features = response.features;
      var min_year = features[0].attributes["最小年"];
      var max_year = features[0].attributes["最大年"];

      yearSlider.min = min_year;
      yearSlider.max = max_year;

    });

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

    shihyoLayer.queryFeatures(query)
      .then(function(response){
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

    });
  }

  async function setObservatoryselector(init_flg) {

    var prefecture = $('#prefectureselector').val();
    var observatory = $('#observatoryselector').val();
    var bunrui = $('#shihyoselector')[0].selectedOption.parentElement.label;
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
    var bunrui = $('#shihyoselector')[0].selectedOption.parentElement.label;
    var prefecture = $('#prefectureselector').val();
    var observatory =  $('#observatoryselector').val();
    var year = yearSlider.values[0];
    var month =  $('#monthselector').val();
    var kansho =  $('#kanshoselector').val();

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
      return shihyoLayer.queryExtent().then(function(response) {
        view.goTo(response.extent.clone().expand(1.2))
          .catch(function(error){
          if (error.name != "AbortError"){
            console.error(error);
          }
        });
      });
    }
  }

  function draw_charts(observatory) {

    var bunrui = $('#shihyoselector')[0].selectedOption.parentElement.label;
    var shihyo = $('#shihyoselector').val();
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
    //var monthtxt = $('#monthselector option:selected').text();
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
        //var value = features[i].attributes["value"];
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

    var bunrui = $('#shihyoselector')[0].selectedOption.parentElement.label;
    var shihyo = $('#shihyoselector').val();
    var shihyotxt = $('#shihyoselector calcite-option:selected').text();
    var prefecture = $('#prefectureselector').val();
    var observatory =  $('#observatoryselector').val();
    var month =  $('#monthselector').val();

    var datasets = [];
    datasets.push({
      data: datas,
      borderColor: "rgba(0,169,255,1)",
      backgroundColor: "rgba(0,169,255,1)",
      lineTension: 0,
      pointStyle: 'circle',
      radius: 2,
      fill: false
    });

    var yLabel = shihyotxt;
    
    // 配列linechartに折れ線グラフの指標を格納する： "年平均気温", "日最高気温の年平均  ", "日最低気温の年平均", "月平均気温",  "日最高気温の月平均", "日最低気温の月平均"
    const linecharts = [
      "年平均気温",
      "日最高気温の年平均  ",
      "日最低気温の年平均",
      "月平均気温",
      "日最高気温の月平均",
      "日最低気温の月平均"
    ]
    // 配列linechartsに指標が含まれる場合はラインチャート
    if (linecharts.includes(shihyo) == true) {
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          title: {
            display: true,
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
                fontSize: 12
              },
              ticks: {
                beginAtZero: true,
                stepSize: 1,
                callback: function(value, index, values){
                  return  value
                }
              }
            }],
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: yLabel,
                fontSize: 12
              },
              ticks: {
                beginAtZero: true,
                userCallback: function(label, index, labels) {
                  if (Math.floor(label) === label) {
                    return label;
                  }
                }
              }
            }]
          },
          chartArea: {
            backgroundColor: 'rgba(230, 238, 255, 1)'
          },
          responsive: true,
          maintainAspectRatio: false
         }
      });
 // それ以外ではバーチャート
    } else {
      chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          title: {
            display: true,
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
                fontSize: 12
              },
              ticks: {
                beginAtZero: true,
                stepSize: 1,
                callback: function(value, index, values){
                  return  value
                }
              }
            }],
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: yLabel,
                fontSize: 12
              },
              ticks: {
                beginAtZero: true,
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
  }


  function download_csv(flg) {
    var bunrui = $('#shihyoselector')[0].selectedOption.parentElement.label;
    var shihyo = $('#shihyoselector').val();
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

      //BOMを付与する（Excelでの文字化け対策）
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      //Blobでデータを作成する
      const blob = new Blob([bom, csv_text], { type: 'text/csv'});

      //IE10/11用
      if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, filename);
        //その他ブラウザ
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
  
  function startMapDownload() {
    var shihyotxt = $('#shihyoselector calcite-option:selected').text();
    
    view.takeScreenshot().then(function(screenshot) {
      var a = document.createElement('a');
      a.href = screenshot.dataUrl;
      a.download = shihyotxt + '.png';
      a.click();
    });
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