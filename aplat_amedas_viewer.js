var map = null;
var view = null;
var legend = null;
var current_field = null;
var left_layer = null;
var graphicsLayer = null;
var chart = null;

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
      id: "53a5ca8680c044c5838507e2264bc983"
    }
  });

  view = new MapView({
    container: "viewDiv",
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
        id: '0a489e5adeab43e1be2d570ea3149af3'
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

  view.popup.on("trigger-action", function(event){
    var observatory = view.popup.selectedFeature.attributes['観測地点名'];
    draw_charts(observatory);
  });


  view.extent = default_extend;


  //イベント処理
  $('#kanshoselector').change(function() {
    setForm(false);
    setObservatoryselector();
    setFilter(true);
    draw_charts();
  })
  
  $('#bunruiselector').change(function() {
    setForm(true);
    setFilter(true);
    draw_charts();
  })

  $('#shihyoselector').change(function() {
    setForm(false);
    setFilter(true);
    draw_charts();
  })

  $('#monthshihyoselector').change(function() {
    setFilter(true);
  })
  
  $('#prefectureselector').change(function() {
    setObservatoryselector();
    setForm(false);
    setFilter(true);
    draw_charts();
  })

  $('#observatoryselector').change(function() {
    setForm(false);
    setFilter(true);
    draw_charts();
  })

  yearSlider.on("thumb-change", function(event) {
    setFilter(false);
  });
  yearSlider.on("thumb-drag", function(event) {
    setFilter(false);
  });

  $('#monthselector').change(function() {
    setForm(false);
    setFilter(false);
    draw_charts();
  })

  $('#csv_observatory').click(function() {
    download_csv(0);
  })

  $('#csv_maparea').click(function() {
    download_csv(1);
  })


  function setForm(init_flg){
    var bunrui = $('#bunruiselector').val();
    var shihyo = $('#shihyoselector').val();
    var month =  $('#monthselector').val();

    if (bunrui == "年間値") {
      $('#monthselectorDiv').addClass('hidden');
    } else {
      $('#monthselectorDiv').removeClass('hidden');
    }
    
    var kansho = $('#kanshoselector').val();

    if (init_flg) {
      $('#shihyoselector > option').remove();
      
      //プルダウン（指標を非表示させたいときはここを変更）
      if (bunrui == "年間値") {
        $('#shihyoselector').append($('<option>').html("年平均気温(℃)").val("年平均気温"));
        $('#shihyoselector').append($('<option>').html("日最高気温の年平均(℃)").val("日最高気温の年平均"));
        $('#shihyoselector').append($('<option>').html("日最低気温の年平均(℃)").val("日最低気温の年平均"));
        $('#shihyoselector').append($('<option>').html("猛暑日（日最高気温35℃以上）の年間日数(日)").val("猛暑日の年間日数"));
        $('#shihyoselector').append($('<option>').html("真夏日（日最高気温30℃以上）の年間日数(日)").val("真夏日の年間日数"));
        $('#shihyoselector').append($('<option>').html("夏日（日最高気温25℃以上）の年間日数(日)").val("夏日の年間日数"));
        $('#shihyoselector').append($('<option>').html("熱帯夜（日最低気温25℃以上）の年間日数(日)").val("熱帯夜の年間日数"));
        $('#shihyoselector').append($('<option>').html("冬日（日最低気温0℃以下）の年間日数(日)").val("冬日の年間日数"));
        $('#shihyoselector').append($('<option>').html("真冬日（日最高気温0℃以下）の年間日数(日)").val("真冬日の年間日数"));
        $('#shihyoselector').append($('<option>').html("年降水量(mm)").val("年降水量"));
        $('#shihyoselector').append($('<option>').html("日降水量の年最大値(mm)").val("日降水量の年最大値"));
        $('#shihyoselector').append($('<option>').html("日降水量100mm以上の年間日数(日)").val("日降水量100mm以上の年間日数"));
        $('#shihyoselector').append($('<option>').html("日降水量200mm以上の年間日数(日)").val("日降水量200mm以上の年間日数"));
        $('#shihyoselector').append($('<option>').html("1時間降水量30mm以上の年間発生回数(回)").val("1時間降水量30mm以上の年間発生回数"));
        $('#shihyoselector').append($('<option>').html("1時間降水量50mm以上の年間発生回数(回)").val("1時間降水量50mm以上の年間発生回数"));
        $('#shihyoselector').append($('<option>').html("無降水日年間日数(日)").val("無降水日年間日数"));
        $('#shihyoselector').append($('<option>').html("年最大積雪深(cm)").val("年最大積雪深"));
        $('#shihyoselector').append($('<option>').html("日降雪量の年最大値(cm)").val("日降雪量の年最大値"));


      } else {
        $('#shihyoselector').append($('<option>').html("月平均気温(℃)").val("月平均気温"));
        $('#shihyoselector').append($('<option>').html("日最高気温の月平均(℃)").val("日最高気温の月平均"));
        $('#shihyoselector').append($('<option>').html("日最低気温の月平均(℃)").val("日最低気温の月平均"));
        $('#shihyoselector').append($('<option>').html("月降水量(mm)").val("月降水量"));
        $('#shihyoselector').append($('<option>').html("月最大積雪深(cm)").val("月最大積雪深"));
      }

      if (init_flg) {
        $('#shihyoselector').prop("selectedIndex", 0);
        shihyo = $('#shihyoselector').val();
      }
    }

    //レイヤーの初期化
    var layers = map.allLayers.items;
    for(let i = 0; i < layers.length; i++) {
      if (layers[i].type != "feature") {
        continue;
      }

      if (layers[i].title == (shihyo)) {
        shihyoLayer = layers[i];

        shihyoLayer.popupTemplate.actions = [{
          title: "ｸﾞﾗﾌ表示",
          id: "change-chart",
          image: "https://illustration-free.net/thumb/svg/ifn0397.svg"
        }];

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
      $('#prefectureselector > option').remove();
      $('#prefectureselector').append($('<option>').html("全国").val("全国"));

      for(var i = 0; i< features.length; i++) {
        var area = features[i].attributes["都道府県リスト"];
        $('#prefectureselector').append($('<option>').html(area).val(area));

      }
      $('#prefectureselector').prop("selectedIndex", 0);
      setObservatoryselector(init_flg);

    });
  }

  function setObservatoryselector(init_flg) {

    var prefecture = $('#prefectureselector').val();
    var bunrui = $('#bunruiselector').val();
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

    $('#observatoryselector > option').remove();
    $('#observatoryselector').append($('<option>').html("全て").val("全て"));
    if (init_flg) {
      $('#observatoryselector').prop("selectedIndex", 0);
    }
    shihyoLayer.queryFeatures(query)
      .then(function(response){
      var features = response.features;
      var recordes = [];


      for(var i = 0; i< features.length; i++) {
        var area = features[i].attributes["観測地点名リスト"];
        $('#observatoryselector').append($('<option>').html(area).val(area));

      }
    });
  }

  function setFilter(zoom_flg) {

    var bunrui = $('#bunruiselector').val();
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

    var bunrui = $('#bunruiselector').val();
    var shihyo = $('#shihyoselector').val();
    var shihyotxt = $('#shihyoselector option:selected').text();
    var prefecture = $('#prefectureselector').val();

    if (observatory == undefined) {
      observatory =  $('#observatoryselector').val();
    }

    var month =  $('#monthselector').val();
    var monthtxt = $('#monthselector option:selected').text();
    
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

    var sType = "avg";
    var sLabel = "平均";
    
    if (shihyo == "1時間降水量30mm以上の年間発生回数" || shihyo == "1時間降水量50mm以上の年間発生回数") {
      sType = "sum";
      sLabel = "合計";
    }
    
    query.outStatistics = [
      {
        statisticType: sType,
        onStatisticField: field,
        outStatisticFieldName: "value"
      }  
    ];
    query.returnGeometry = false;

    var chat_title = shihyotxt + " ";

    var expression = "官署 = '" + kansho + "' AND " + field + " <> " + String(32767);
    if (bunrui == "月別値") { 
      chat_title = chat_title + monthtxt + " ";
      expression = expression + " AND 月 = " + month;
    }
    
    if (observatory != "全て"){
      query.where = expression + " AND 観測地点名 = '" + observatory + "'";
      chat_title = chat_title + observatory + "観測所";
    } else if (prefecture != "全国") {
      query.where = expression + " AND 都道府県 = '" + prefecture + "'";
      chat_title = chat_title + prefecture + sLabel;
    } else {
      query.where = expression;
      chat_title = chat_title + "全国" + sLabel;
    }

    shihyoLayer.queryFeatures(query)
      .then(function(response){ 
      var features = response.features;
      var labels = [];
      var datas = [];
      for(var i = 0; i< features.length; i++) {
        var year = features[i].attributes["年"];
        var value = features[i].attributes["value"];

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

    var ctx = document.getElementById("chartCanvas").getContext('2d');

    if (chart != null) {
      chart.destroy();
    }

    var bunrui = $('#bunruiselector').val();
    var shihyo = $('#shihyoselector').val();
    var prefecture = $('#prefectureselector').val();
    var observatory =  $('#observatoryselector').val();
    var month =  $('#monthselector').val();

    var datasets = [];

    datasets.push({
      data: datas,
      borderColor: "rgba(0,169,255,1)",
      lineTension: 0,
      pointStyle: 'circle',
      radius: 2,
      fill: false
    });

    var yLabel = "";

    if (shihyo == "年平均気温") { 
      yLabel = "年平均気温(℃)";
    } else if (shihyo == "日最高気温の年平均  ") { 
      yLabel = "日最高気温の年平均(℃)";
    } else if (shihyo == "日最低気温の年平均") { 
      yLabel = "日最低気温の年平均(℃)";
    } else if (shihyo == "猛暑日の年間日数") { 
      yLabel = "猛暑日（日最高気温35℃以上）の年間日数(日)";
    } else if (shihyo == "真夏日の年間日数") { 
      yLabel = "真夏日（日最高気温30℃以上）の年間日数(日)";
    } else if (shihyo == "夏日の年間日数") {
      yLabel = "夏日（日最高気温25℃以上）の年間日数(日)";
    } else if (shihyo == "熱帯夜の年間日数") {
      yLabel = "熱帯夜（日最低気温25℃以上）の年間日数(日)";
    } else if (shihyo == "冬日の年間日数") {
      yLabel = "冬日（日最低気温0℃以下）の年間日数(日)";
    } else if (shihyo == "真冬日の年間日数") {
      yLabel = "真冬日（日最高気温0℃以下）の年間日数(日)";
    } else if (shihyo == "年降水量") {
      yLabel = "年降水量(mm)";
    } else if (shihyo == "日降水量の年最大値") {
      yLabel = "日降水量の年最大値(mm)";
    } else if (shihyo == "日降水量100mm以上の年間日数") {
      yLabel = "日降水量100mm以上の年間日数(日)";
    } else if (shihyo == "日降水量200mm以上の年間日数") {
      yLabel = "日降水量200mm以上の年間日数(日)";
    } else if (shihyo == "1時間降水量30mm以上の年間発生回数") {
      yLabel = "1時間降水量30mm以上の年間発生回数(回)";
    } else if (shihyo == "1時間降水量50mm以上の年間発生回数") {
      yLabel = "1時間降水量50mm以上の年間発生回数(回)";
    } else if (shihyo == "無降水日年間日数") {
      yLabel = "無降水日年間日数(日)";
    } else if (shihyo == "年最大積雪深") {
      yLabel = "年最大積雪深(cm)";
    } else if (shihyo == "日降雪量の年最大値") {
      yLabel = "日降雪量の年最大値(cm)";
    } else if (shihyo == "月平均気温") {
      yLabel = "月平均気温(℃)";
    } else if (shihyo == "日最高気温の月平均") {
      yLabel = "日最高気温の月平均(℃)";
    } else if (shihyo == "日最低気温の月平均") {
      yLabel = "日最低気温の月平均(℃) ";
    } else if (shihyo == "月降水量") {
      yLabel = "月降水量(mm)";
    } else if (shihyo == "月最大積雪深") {
      yLabel = "月最大積雪深(cm) ";
    }

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
        responsive: true,
        maintainAspectRatio: false

      }
    });
  }


  function download_csv(flg) {

    var bunrui = $('#bunruiselector').val();
    var shihyo = $('#shihyoselector').val();
    var shihyotxt = $('#shihyoselector option:selected').text();

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

    /*
    var expression = "年 = " + year;
    if (bunrui == "月別値") {
      expression = "年 = " + year + " AND 月 = " + month;
    }
    */
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

      startDownload(shihyotxt, fields, records);
    });


    function startDownload(shihyo, fields, records) {
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
});
